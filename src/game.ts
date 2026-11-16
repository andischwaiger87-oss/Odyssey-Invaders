// Spiellogik: Zustände, Wellen, Gegnerverhalten, Kollisionen, Darstellung.

import { ACTS, DIFF, DiffDef, EnemyKind, PickupKind, PICKUP_INFO, ENEMY_COLOR, OUTRO_LINES, COLORS } from "./config";
import { view, fitCanvas, clamp, rand } from "./view";
import { S, bakeSprites, drawSprite, glow, GUARDIAN_SIZE, Sprite } from "./sprites";
import { Particles } from "./particles";
import { Background } from "./background";
import { audio } from "./audio";
import { Input } from "./input";
import { UI, pad6 } from "./ui";
import { loadSave, storeSave, SaveData } from "./save";

type State = "TITLE" | "STORY" | "PLAYING" | "PAUSED" | "DYING" | "GAMEOVER" | "OUTRO" | "WON";
type Phase = "intro" | "fight" | "clear" | "bossdeath";

interface Enemy {
  kind: EnemyKind;
  x: number; y: number; w: number; h: number;
  hx: number; hy: number; sx: number; sy: number; enter: number;
  hp: number; maxHp: number; vx: number; vy: number;
  phase: number; t: number; flash: number; cd: number; cd2: number;
  score: number; stage: number; dead: boolean;
}

interface Shot {
  x: number; y: number; vx: number; vy: number;
  color: string; friendly: boolean; pierce: boolean; dead: boolean;
  hits: Enemy[] | null;
}

interface Pickup { x: number; y: number; kind: PickupKind; t: number; dead: boolean; }

const ES = 1.28; // Darstellungsgröße der Standardgegner
const DIMS: Record<EnemyKind, [number, number]> = {
  drifter: [38, 38], beast: [41, 36], satellite: [50, 34], pod: [36, 36], hunter: [41, 38],
  plasma: [36, 38], monolith: [28, 66], echo: [14, 20], guardian: [100, 90], boss: [220, 92],
};

const STORY_TIME = 6;
const OUTRO_TIME = 17;

export class Game {
  private ctx: CanvasRenderingContext2D;
  private save: SaveData = loadSave();
  private ui: UI;
  private input: Input;
  private bg = new Background();
  private fx = new Particles();

  private state: State = "TITLE";
  private phase: Phase = "intro";
  private phaseT = 0;
  private act = 1;
  private sector = 1;
  private checkpointAct = 1;
  private checkpointScore = 0;
  private score = 0;
  private lives = 3;
  private maxLives = 3;
  private diff: DiffDef = DIFF.NOMINAL;

  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private pickups: Pickup[] = [];
  private player = { x: 800, y: 780, inv: 0, fireCd: 0, tri: 0, pierce: 0, shield: 0, tilt: 0, breach: 0 };

  private chain = 0;
  private mult = 1;
  private comboT = 0;
  private sinceDrop = 0;
  private stats = { shots: 0, hits: 0, kills: 0, time: 0, maxChain: 0 };

  private waveT = 0;
  private marchDir = 1;
  private globalCd = 0;
  private bossX = 0;
  private bossY = 0;

  private storyT = 0;
  private outroT = 0;
  private dyingT = 0;
  private shakeT = 0;
  private shakeI = 0;
  private last = 0;
  private fps = 0;
  private frames = 0;
  private fpsT = 0;
  private debugOn = false;
  private lastRetryWon = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.input = new Input(canvas);
    this.input.onKey = (code) => this.onKey(code);
    this.ui = new UI(this.save, {
      start: (act) => this.startRun(act, 1),
      resume: () => this.setPaused(false),
      quit: () => this.toTitle(),
      retry: () => this.retry(),
      skipStory: () => { if (this.state === "STORY" && this.storyT < STORY_TIME - 0.5) this.endStory(); },
      pause: () => this.setPaused(true),
      settingsChanged: () => this.applySettings(),
      warp: (a, s) => this.startRun(a, s),
      runActive: () => this.state !== "TITLE" && this.state !== "GAMEOVER" && this.state !== "WON",
    });
    this.applySettings();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (this.state === "PLAYING") this.setPaused(true); audio.suspend(); }
      else audio.resume();
    });
    window.addEventListener("blur", () => { if (this.state === "PLAYING") this.setPaused(true); });
    window.addEventListener("pointerdown", () => { audio.unlock(); audio.setTrack(this.trackFor()); }, { once: true });
    if (document.fonts?.ready) void document.fonts.ready.then(() => bakeSprites());
  }

  start(): void {
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  // ---------- Rahmen ----------

  private resize(): void {
    fitCanvas(this.canvas);
    bakeSprites();
    this.bg.rebuild();
    this.player.y = view.h - 112;
    this.player.x = clamp(this.player.x, 30, view.w - 30);
  }

  private applySettings(): void {
    this.input.mode = this.save.controls;
    audio.setVolumes(this.save.sfx, this.save.music);
    this.bg.reduced = this.save.reduced;
    this.fx.reduced = this.save.reduced;
  }

  private trackFor(): number {
    return this.state === "TITLE" || this.state === "GAMEOVER" || this.state === "WON" ? 0 : this.act;
  }

  private topY(): number {
    const hudBottom = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--bar")) || 40) + (window.innerWidth <= 640 ? 124 : 96);
    return Math.max(150, hudBottom / view.scale + 26);
  }

  private get lineY(): number { return view.h - 172; }

  private onKey(code: string): void {
    if (code === "KeyI") { this.debugOn = !this.debugOn; if (!this.debugOn) this.ui.debug(null); return; }
    if (code === "KeyM") { audio.setMuted(!audio.muted); return; }
    if (code === "KeyF") {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.().catch(() => undefined);
      return;
    }
    if (code === "Escape" || code === "KeyP") {
      if (this.ui.settingsOpen) { this.ui.closeSettings(); return; }
      if (this.state === "PLAYING") this.setPaused(true);
      else if (this.state === "PAUSED") this.setPaused(false);
      return;
    }
    if ((code === "Space" || code === "Enter") && this.state === "STORY" && this.storyT < STORY_TIME - 0.5) this.endStory();
  }

  private setPaused(on: boolean): void {
    if (on && this.state === "PLAYING") {
      this.state = "PAUSED"; this.ui.screen("pause"); audio.duck(true);
    } else if (!on && this.state === "PAUSED") {
      this.ui.closeSettings();
      this.state = "PLAYING"; this.ui.screen(null); audio.duck(false);
      this.input.targetX = null;
    }
  }

  // ---------- Ablauf ----------

  private startRun(act: number, sector: number): void {
    audio.unlock();
    this.diff = DIFF[this.save.difficulty];
    this.maxLives = this.diff.lives;
    this.lives = this.maxLives;
    this.score = 0;
    this.checkpointAct = act; this.checkpointScore = 0;
    this.stats = { shots: 0, hits: 0, kills: 0, time: 0, maxChain: 0 };
    this.act = act; this.sector = sector;
    this.resetField();
    this.player.x = view.w / 2;
    if (sector === 1) this.startAct();
    else {
      this.state = "PLAYING"; this.ui.screen(null); this.ui.setPlaying(true);
      audio.setTrack(this.act); audio.duck(false);
      this.startSector();
    }
  }

  private retry(): void {
    if (this.lastRetryWon) { this.startRun(1, 1); return; }
    this.lives = this.maxLives;
    this.score = this.checkpointScore;
    this.act = this.checkpointAct; this.sector = 1;
    this.resetField();
    this.startAct();
  }

  private resetField(): void {
    this.enemies.length = 0; this.shots.length = 0; this.pickups.length = 0;
    this.fx.clear();
    const p = this.player;
    p.inv = 2; p.fireCd = 0.4; p.tri = 0; p.pierce = 0; p.shield = 0; p.tilt = 0; p.breach = 0;
    this.chain = 0; this.mult = 1; this.comboT = 0; this.globalCd = 1;
    this.shakeT = 0;
    this.ui.boss(null);
    this.ui.hideBanner();
  }

  private startAct(): void {
    const def = ACTS[this.act - 1];
    this.checkpointAct = this.act; this.checkpointScore = this.score;
    if (this.act > this.save.unlocked) { this.save.unlocked = this.act; storeSave(this.save); }
    this.enemies.length = 0; this.shots.length = 0;
    this.state = "STORY"; this.storyT = STORY_TIME;
    this.ui.setPlaying(false);
    this.ui.story(this.act, def.title, def.story);
    this.ui.status(def.status, this.act >= 3);
    audio.setTrack(this.act); audio.setIntensity(0); audio.duck(false);
  }

  private endStory(): void {
    this.state = "PLAYING";
    this.ui.screen(null); this.ui.setPlaying(true);
    this.player.inv = 1.5;
    this.input.targetX = null;
    this.startSector();
  }

  private startSector(): void {
    const actDef = ACTS[this.act - 1];
    const def = actDef.sectors[this.sector - 1];
    this.enemies.length = 0; this.shots.length = 0;
    this.waveT = 0; this.marchDir = 1; this.globalCd = 1.2;
    this.phase = "intro"; this.phaseT = 1.3;
    const W = view.w;
    const narrow = W < 780;
    let y = this.topY() + (def.guardian ? 118 : 0);
    let row = 0;

    if (def.boss) {
      const e = this.addEnemy("boss", W / 2, this.topY() + 46, 0, 0);
      e.hp = e.maxHp = this.diff.bossHp; e.score = 25000; e.sy = -120; e.sx = W / 2; e.enter = 1.6;
      this.ui.status("POLYPHEM // KERN AKTIV", true);
      audio.bossWarn(); audio.setIntensity(0.6);
      this.ui.banner("POLYPHEM", "Letzter Sektor · Zerstöre den Kern", 2400);
      this.phaseT = 2;
      return;
    }

    for (const [type, rows, kind] of def.groups) {
      const sp = type === "matrix" ? (narrow ? 76 : 112) : (narrow ? 86 : 120);
      const cols = clamp(Math.floor((W - 140) / sp), 4, type === "matrix" ? 12 : 8);
      const x0 = W / 2 - ((cols - 1) * sp) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) this.addEnemy(kind, x0 + c * sp, y, row, c);
        y += kind === "monolith" ? 84 : 62;
        row++;
      }
    }
    if (def.guardian) {
      const [gw, gh] = GUARDIAN_SIZE[this.act - 1];
      const g = this.addEnemy("guardian", W / 2, this.topY() + 40, 0, 0);
      g.w = gw; g.h = gh; g.sy = -140; g.sx = W / 2; g.enter = 1.5;
      g.hp = g.maxHp = Math.round((28 + this.act * 8) * this.diff.guardianHp);
      g.score = 2500; g.cd = 2.4;
      this.ui.banner(`SEKTOR ${this.sector} · ${def.name.toUpperCase()}`, `Wächter: ${actDef.guardianName}`, 2200);
    } else {
      this.ui.banner(`SEKTOR ${this.sector} · ${def.name.toUpperCase()}`, `Akt ${actDef.roman} · ${actDef.title}`, 1700);
    }
    audio.setIntensity(def.guardian ? 0.5 : (this.sector - 1) * 0.12);
  }

  private addEnemy(kind: EnemyKind, hx: number, hy: number, row: number, col: number): Enemy {
    const [w, h] = DIMS[kind];
    const moving = kind === "hunter" || kind === "pod";
    const e: Enemy = {
      kind, x: hx, y: -80, w, h, hx, hy,
      sx: hx + rand(-120, 120), sy: -50 - row * 46, enter: 1 + col * 0.035 + row * 0.1,
      hp: 1, maxHp: 1, vx: moving ? rand(30, 60) * (Math.random() < 0.5 ? -1 : 1) : 0, vy: 0,
      phase: row * 0.9 + col * 0.35, t: 0, flash: 0, cd: rand(0.4, 1.4), cd2: 3,
      score: 100, stage: 0, dead: false,
    };
    this.enemies.push(e);
    return e;
  }

  private advance(): void {
    this.sector += 1;
    if (this.sector > 4) {
      this.act += 1; this.sector = 1;
      this.pickups.length = 0;
      this.startAct();
    } else this.startSector();
  }

  private toTitle(): void {
    this.ui.closeSettings();
    this.resetField();
    this.state = "TITLE";
    this.act = 1; this.sector = 1;
    this.ui.setPlaying(false); this.ui.screen("title"); this.ui.refreshTitle();
    this.ui.status(ACTS[0].status);
    audio.setTrack(0); audio.setIntensity(0); audio.duck(false);
  }

  private finish(won: boolean): void {
    const d = this.save.difficulty;
    const newBest = this.score > this.save.best[d];
    if (newBest) { this.save.best[d] = this.score; storeSave(this.save); }
    this.lastRetryWon = won;
    this.state = won ? "WON" : "GAMEOVER";
    this.ui.setPlaying(false); this.ui.boss(null); this.ui.hideBanner();
    const acc = this.stats.shots > 0 ? Math.round((this.stats.hits / this.stats.shots) * 100) : 0;
    const m = Math.floor(this.stats.time / 60), s = Math.floor(this.stats.time % 60);
    const stats: Array<[string, string, boolean?]> = [
      ["Punkte", pad6(this.score), newBest],
      ["Bestwert", pad6(this.save.best[d]), newBest],
      ["Abschüsse", String(this.stats.kills)],
      ["Trefferquote", `${acc} %`],
      ["Längste Kette", String(this.stats.maxChain)],
      ["Flugzeit", `${m}:${String(s).padStart(2, "0")}`],
    ];
    if (won) {
      this.ui.end(true, "Heimkehr", `Die Metamorphose ist abgeschlossen. Schwierigkeit: ${this.diff.label}.`, stats, "Neue Mission");
      audio.victory();
    } else {
      const roman = ACTS[this.checkpointAct - 1].roman;
      this.ui.end(false, "Hüllenbruch", `POLYPHEM: „Diese Reise endet hier." Wiederaufnahme ab Akt ${roman}, die Punkte seit dem letzten Akt verfallen.`, stats, `Neustart ab Akt ${roman}`);
      audio.gameOver();
    }
    this.ui.status(won ? "POLYPHEM // OFFLINE" : "POLYPHEM // MISSION BEENDET", !won);
    audio.setTrack(0); audio.setIntensity(0);
  }

  // ---------- Hauptschleife ----------

  private frame = (now: number): void => {
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    this.frames++; this.fpsT += dt;
    if (this.fpsT >= 1) { this.fps = this.frames; this.frames = 0; this.fpsT = 0; }
    audio.update();
    this.update(dt);
    this.render();
    if (this.debugOn) this.ui.debug(
      `FPS      ${this.fps}\nZUSTAND  ${this.state} / ${this.phase}\nAKT      ${this.act}.${this.sector}  (Checkpoint ${this.checkpointAct})\n` +
      `GEGNER   ${this.enemies.length}\nSCHÜSSE  ${this.shots.length}\nPARTIKEL ${this.fx.count}\nFELD     ${Math.round(view.w)} × ${Math.round(view.h)} @ ${view.res.toFixed(2)}`);
    requestAnimationFrame(this.frame);
  };

  private update(dt: number): void {
    const st = this.state;
    if (st === "PAUSED") return;
    const bgAct = st === "TITLE" || st === "GAMEOVER" || st === "WON" ? 0 : this.act;
    this.bg.update(dt, bgAct, st === "OUTRO" ? 3 : 1);
    if (this.shakeT > 0) this.shakeT -= dt;

    if (st === "STORY") {
      this.storyT -= dt;
      this.ui.storyProgress(this.storyT / STORY_TIME);
      if (this.storyT <= 0) this.endStory();
      return;
    }
    if (st === "OUTRO") {
      this.outroT += dt; this.fx.update(dt);
      if (this.outroT >= OUTRO_TIME) this.finish(true);
      return;
    }
    if (st !== "PLAYING" && st !== "DYING") { this.fx.update(dt); return; }

    if (st === "DYING") {
      this.dyingT -= dt;
      dt *= 0.35;
      if (this.dyingT <= 0) { this.finish(false); return; }
    } else this.stats.time += dt;

    this.waveT += dt;
    if (this.globalCd > 0) this.globalCd -= dt;
    if (st === "PLAYING") this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateShots(dt);
    this.updatePickups(dt);
    this.fx.update(dt);
    if (st === "PLAYING") this.updateFlow(dt);

    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.chain = 0; this.mult = 1; } }
    const p = this.player;
    this.ui.hud(this.score, this.mult, this.act, this.sector, this.lives, this.maxLives, this.save.best[this.save.difficulty]);
    this.ui.power(p.tri / 6, p.pierce / 8, p.shield / 12);
  }

  // ---------- Spieler ----------

  private updatePlayer(dt: number): void {
    const p = this.player;
    const before = p.x;
    const ax = this.input.axis;
    if (ax !== 0) p.x += ax * 620 * dt;
    else if (this.input.targetX !== null) p.x += (this.input.targetX - p.x) * Math.min(1, 16 * dt);
    p.x = clamp(p.x, 30, view.w - 30);
    const v = dt > 0 ? (p.x - before) / dt : 0;
    p.tilt += (clamp(v / 500, -1, 1) - p.tilt) * Math.min(1, dt * 10);

    if (p.inv > 0) p.inv -= dt;
    if (p.breach > 0) p.breach -= dt;
    if (p.tri > 0) p.tri -= dt;
    if (p.pierce > 0) p.pierce -= dt;
    if (p.shield > 0) p.shield -= dt;
    p.fireCd -= dt;

    if (p.fireCd <= 0 && this.phase !== "bossdeath") {
      const tri = p.tri > 0;
      this.fire(p.x, p.y - 32, 0);
      if (tri) { this.fire(p.x - 16, p.y - 20, -120); this.fire(p.x + 16, p.y - 20, 120); }
      this.stats.shots += tri ? 3 : 1;
      p.fireCd = tri ? 0.08 : 0.25;
      audio.shoot(tri);
    }
    this.fx.thrust(p.x - 9, p.y + 28);
    this.fx.thrust(p.x + 9, p.y + 28);
  }

  private fire(x: number, y: number, vx: number): void {
    const pierce = this.player.pierce > 0;
    this.shots.push({ x, y, vx, vy: -740, color: pierce ? "#ffd166" : COLORS.playerShot, friendly: true, pierce, dead: false, hits: pierce ? [] : null });
  }

  private hurtPlayer(breach: boolean): void {
    const p = this.player;
    if (this.state !== "PLAYING" || this.phase === "bossdeath") return;
    if (!breach) {
      if (p.shield > 0) {
        p.shield = 0; p.inv = Math.max(p.inv, 0.5);
        this.fx.ring(p.x, p.y, "#5ab8ff", 60); this.fx.explosion(p.x, p.y, "#5ab8ff", 0.7);
        audio.shieldBreak(); this.shake(0.2, 6);
        return;
      }
      if (p.inv > 0) return;
    } else {
      if (p.breach > 0) return;
      p.breach = 1.4;
    }
    this.lives -= 1;
    p.inv = 1.4;
    this.chain = 0; this.mult = 1; this.comboT = 0;
    this.shake(0.45, 14);
    this.ui.flash();
    audio.hull();
    this.fx.explosion(p.x, p.y, "#ffffff", 1.3);
    if (this.lives <= 0) {
      this.state = "DYING"; this.dyingT = 1.6;
      this.fx.explosion(p.x, p.y, COLORS.player, 2.4);
      this.fx.explosion(p.x, p.y, COLORS.amber, 1.8);
      audio.explode(2);
      this.ui.hideBanner();
    }
  }

  private shake(t: number, i: number): void {
    if (!this.save.shake) return;
    this.shakeT = Math.max(this.shakeT, t);
    this.shakeI = this.save.reduced ? i * 0.4 : i;
  }

  // ---------- Gegner ----------

  private enemyShot(x: number, y: number, vx: number, color: string, vyOverride = 0): void {
    let speed = 360 + this.sector * 8 + this.diff.bulletBonus * 0.85;
    if (this.act === 3) speed += 50;
    this.shots.push({ x, y, vx, vy: vyOverride || speed, color, friendly: false, pierce: false, dead: false, hits: null });
    audio.enemyShoot();
  }

  private updateEnemies(dt: number): void {
    const W = view.w;
    const d = this.diff;
    const p = this.player;
    const hard = d === DIFF.HARDCORE;
    const canShoot = this.phase === "fight" && this.state === "PLAYING";
    const lvl = this.sector;
    const marchSpeed = (40 + lvl * 25) * d.speed * 0.85;
    let edge = false;
    let monoliths = 0;

    for (const e of this.enemies) {
      e.t += dt;
      if (e.flash > 0) e.flash -= dt * 6;
      if (e.enter > 0) {
        e.enter -= dt / 0.75;
        const k = clamp(e.enter, 0, 1);
        const ease = k * k * (3 - 2 * k);
        e.x = e.hx + (e.sx - e.hx) * ease;
        e.y = e.hy + (e.sy - e.hy) * ease;
        continue;
      }
      const fireOk = canShoot && this.globalCd <= 0;
      switch (e.kind) {
        case "drifter":
          e.x += Math.sin(this.waveT * 2.5 + e.phase) * 45 * dt;
          e.y += (15 + lvl * 2) * 0.8 * dt;
          if (fireOk && Math.random() < 1.2 * d.shoot * dt) {
            if (this.act === 3) this.enemyShot(e.x, e.y + 14, (p.x - e.x) * 0.5, COLORS.amber);
            else this.enemyShot(e.x, e.y + 14, 0, "#ff7ab8");
            this.globalCd = 0.45 * d.fireCd;
          }
          break;
        case "beast":
          e.x += Math.cos(this.waveT * 5 + e.phase * 0.15) * 110 * dt;
          e.y += (35 + lvl * 3) * 0.8 * dt;
          if (fireOk && Math.random() < 1.8 * d.shoot * dt) {
            this.enemyShot(e.x, e.y + 14, 0, "#ff8a3c");
            this.globalCd = 0.4 * d.fireCd;
          }
          break;
        case "hunter":
          e.x += e.vx * (hard ? 1.4 : 1) * dt;
          e.y += Math.sin(this.waveT * 4 + e.phase * 2) * 45 * dt;
          if (e.x < 28) { e.x = 28; e.vx = Math.abs(e.vx); } else if (e.x > W - 28) { e.x = W - 28; e.vx = -Math.abs(e.vx); }
          if (fireOk && Math.random() < 4.2 * d.shoot * dt) {
            this.enemyShot(e.x, e.y + 16, (p.x - e.x) * 0.65, COLORS.danger);
            this.globalCd = 0.25 * d.fireCd;
          }
          break;
        case "plasma":
          e.x += Math.sin(this.waveT * 2 + e.phase) * 70 * dt;
          if (Math.random() < (hard ? 1.2 : 0.42) * dt) {
            this.fx.ring(e.x, e.y, ENEMY_COLOR.plasma, 22, 0.3);
            e.x += (Math.random() - 0.5) * 90;
          }
          if (fireOk && Math.random() < 2.4 * d.shoot * dt) {
            this.enemyShot(e.x, e.y + 14, (p.x - e.x) * 0.75, "#c88cff");
            this.globalCd = 0.32 * d.fireCd;
          }
          break;
        case "monolith":
          monoliths++;
          if ((this.marchDir === 1 && e.x > W - 34) || (this.marchDir === -1 && e.x < 34)) edge = true;
          break;
        case "satellite":
          e.x += Math.sin(this.waveT * 1.5 + e.phase) * 140 * dt;
          break;
        case "pod":
          e.x += e.vx * (hard ? 1.5 : 1) * dt;
          e.y += Math.sin(this.waveT * 4 + e.phase) * 20 * dt;
          if (e.x < 26) { e.x = 26; e.vx = Math.abs(e.vx); } else if (e.x > W - 26) { e.x = W - 26; e.vx = -Math.abs(e.vx); }
          if (fireOk && Math.random() < 2.4 * d.shoot * dt) {
            for (const vx of [0, -90, 90]) this.enemyShot(e.x, e.y + 16, vx, "#f2c744");
            this.globalCd = 0.38 * d.fireCd;
          }
          break;
        case "echo":
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.x < 14 || e.x > W - 14) e.vx *= -1;
          if (e.y > view.h + 30) e.dead = true;
          if (!e.dead && Math.abs(e.x - p.x) < 20 && Math.abs(e.y - p.y) < 30) {
            e.dead = true; this.fx.explosion(e.x, e.y, ENEMY_COLOR.echo, 0.7); this.hurtPlayer(false);
          }
          break;
        case "guardian":
          this.updateGuardian(e, dt, canShoot);
          break;
        case "boss":
          this.updateBoss(e, dt, canShoot);
          break;
      }
      if (e.kind !== "monolith" && e.kind !== "echo") e.x = clamp(e.x, 18, W - 18);

      // Durchbruch der Verteidigungslinie
      if (e.kind !== "echo" && e.kind !== "boss" && e.kind !== "guardian" && e.y + e.h / 2 > this.lineY && this.state === "PLAYING") {
        e.dead = true;
        this.fx.explosion(e.x, e.y, ENEMY_COLOR[e.kind], 1);
        audio.explode(1);
        this.hurtPlayer(true);
      }
    }

    if (monoliths > 0) {
      for (const e of this.enemies) {
        if (e.kind !== "monolith" || e.enter > 0) continue;
        if (edge) e.y += 30; else e.x += this.marchDir * marchSpeed * dt;
      }
      if (edge) this.marchDir *= -1;
      if (canShoot && this.globalCd <= 0 && Math.random() < 3 * d.shoot * dt) {
        const ready = this.enemies.filter((e) => e.kind === "monolith" && e.enter <= 0 && !e.dead);
        if (ready.length) {
          const m = ready[Math.floor(Math.random() * ready.length)];
          this.enemyShot(m.x, m.y + 34, 0, "#8fb4ff");
          this.globalCd = 0.35 * d.fireCd;
        }
      }
    }
    this.sweep(this.enemies);
  }

  private updateGuardian(e: Enemy, dt: number, canShoot: boolean): void {
    const W = view.w, p = this.player;
    e.x = W / 2 + Math.sin(e.t * 0.6) * Math.min(W * 0.34, 420);
    e.y = e.hy + Math.sin(e.t * 1.3) * 16;
    e.cd -= dt;
    if (!canShoot || e.cd > 0) return;
    const by = e.y + e.h / 2 - 6;
    switch (this.act) {
      case 1: for (let i = -2; i <= 2; i++) this.enemyShot(e.x + i * 8, by, i * 95, "#ff8a3c"); break;
      case 2:
        for (const dx of [-18, -6, 6, 18]) this.enemyShot(e.x + dx, by, 0, "#8fb4ff");
        this.enemyShot(e.x, by, (p.x - e.x) * 0.7, "#ffffff");
        break;
      case 3: for (const o of [-70, 0, 70]) this.enemyShot(e.x, by, (p.x - e.x) * 0.7 + o, "#f2c744"); break;
      default:
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.14 + (i / 8) * 0.72);
          this.enemyShot(e.x, by, Math.cos(a) * 300, COLORS.danger, Math.sin(a) * 300);
        }
    }
    e.cd = 1.6 * (0.6 + 0.4 * this.diff.fireCd) * (e.hp < e.maxHp * 0.4 ? 0.75 : 1);
  }

  private updateBoss(e: Enemy, dt: number, canShoot: boolean): void {
    const W = view.w, p = this.player, d = this.diff;
    const hard = d === DIFF.HARDCORE;
    e.x += this.marchDir * (hard ? 200 : 130) * dt;
    if (e.x > W - 130) this.marchDir = -1;
    if (e.x < 130) this.marchDir = 1;
    if (W < 300) e.x = W / 2;
    e.y = e.hy + Math.sin(e.t * 0.9) * 8;
    this.bossX = e.x; this.bossY = e.y;
    const ratio = e.hp / e.maxHp;
    const stage = ratio < 0.25 ? 2 : ratio < 0.5 ? 1 : 0;
    if (stage > e.stage) {
      e.stage = stage;
      this.clearEnemyShots();
      this.globalCd = 1.3;
      this.fx.ring(e.x, e.y, COLORS.danger, 260, 0.9);
      this.fx.explosion(e.x, e.y, COLORS.amber, 1.6);
      this.shake(0.6, 12);
      audio.bossWarn(); audio.explode(2); audio.setIntensity(stage === 2 ? 1 : 0.8);
      this.ui.status(stage === 2 ? "POLYPHEM // ICH KANN DAS NICHT ZULASSEN" : "POLYPHEM // SCHUTZPROTOKOLL AUFGEHOBEN", true);
      this.ui.banner(stage === 2 ? "KERN INSTABIL" : "PHASE 2", stage === 2 ? "Splitter und Ringfeuer" : "Flankenfeuer aktiv", 1500);
    }
    this.ui.boss(ratio, `POLYPHEM · KERNINTEGRITÄT ${Math.max(0, Math.round(ratio * 100))} %`, stage > 0);
    if (!canShoot) return;
    const ey = e.y + 34;
    if (this.globalCd <= 0) {
      for (const vx of [0, -120, 120]) this.enemyShot(e.x, ey, vx, COLORS.danger);
      this.enemyShot(e.x, ey, (p.x - e.x) * 0.85, "#ffe08a");
      if (stage > 0 || hard) { this.enemyShot(e.x, ey, -250, "#c88cff"); this.enemyShot(e.x, ey, 250, "#c88cff"); }
      this.globalCd = Math.max(0.085, (0.24 * ratio + 0.1) * d.fireCd);
    }
    if (stage === 2) {
      e.cd -= dt; e.cd2 -= dt;
      if (e.cd <= 0) {
        e.cd = hard ? 2.6 : 3.4;
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * (0.06 + (i / 13) * 0.88);
          this.enemyShot(e.x, ey, Math.cos(a) * 230, "#ffb020", Math.sin(a) * 230);
        }
        this.fx.ring(e.x, e.y, COLORS.amber, 90, 0.4);
      }
      if (e.cd2 <= 0) {
        e.cd2 = hard ? 3.8 : 5;
        for (const s of [-1, 0, 1]) {
          const n = this.addEnemy("echo", e.x + s * 70, e.y + 40, 0, 0);
          n.enter = 0; n.x = n.hx; n.y = n.hy; n.vx = s * 70 + rand(-30, 30); n.vy = 150 + rand(0, 50); n.score = 50;
        }
      }
    }
  }

  private clearEnemyShots(): void {
    for (const s of this.shots) {
      if (!s.friendly) { s.dead = true; this.fx.hit(s.x, s.y, s.color); }
    }
  }

  private sweep<T extends { dead: boolean }>(list: T[]): void {
    let n = 0;
    for (let i = 0; i < list.length; i++) if (!list[i].dead) list[n++] = list[i];
    list.length = n;
  }

  // ---------- Schüsse, Treffer, Extras ----------

  private updateShots(dt: number): void {
    const W = view.w, H = view.h, p = this.player;
    for (const s of this.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -30 || s.y > H + 30 || s.x < -30 || s.x > W + 30) { s.dead = true; continue; }
      if (s.friendly) {
        for (const e of this.enemies) {
          if (e.dead || Math.abs(s.x - e.x) > e.w / 2 + 3 || Math.abs(s.y - e.y) > e.h / 2 + 9) continue;
          if (s.hits) { if (s.hits.includes(e)) continue; s.hits.push(e); }
          else s.dead = true;
          this.stats.hits++;
          this.damage(e, 1, s.x, s.y);
          if (s.dead) break;
        }
      } else if (this.state === "PLAYING") {
        if (p.shield > 0 ? Math.hypot(s.x - p.x, s.y - p.y) < 38 : (Math.abs(s.x - p.x) < 14 && Math.abs(s.y - p.y) < 24)) {
          s.dead = true;
          this.hurtPlayer(false);
        }
      }
    }
    this.sweep(this.shots);
  }

  private damage(e: Enemy, amount: number, x: number, y: number): void {
    if (e.dead) return;
    e.hp -= amount;
    e.flash = 1;
    if (e.hp > 0) {
      this.fx.hit(x, y, ENEMY_COLOR[e.kind]);
      audio.hitMetal();
      if (e.kind === "boss") this.shake(0.12, 3);
      return;
    }
    e.dead = true;
    this.stats.kills++;
    const color = ENEMY_COLOR[e.kind];
    if (e.kind === "boss") { this.killBoss(e); return; }
    if (e.kind === "guardian") {
      this.fx.explosion(e.x, e.y, color, 2.6); this.fx.explosion(e.x - 30, e.y + 10, "#ffffff", 1.4); this.fx.explosion(e.x + 30, e.y - 10, color, 1.6);
      audio.explode(2); this.shake(0.6, 14);
      this.drop(e.x - 24, e.y, true); this.drop(e.x + 24, e.y, true);
      audio.setIntensity(0.3);
    } else {
      this.fx.explosion(e.x, e.y, color, 1);
      audio.explode(e.kind === "monolith" ? 1 : 0);
      this.shake(0.12, 4);
      this.drop(e.x, e.y, false);
    }
    this.chain++;
    if (this.chain > this.stats.maxChain) this.stats.maxChain = this.chain;
    this.comboT = 2.6;
    const m = Math.min(8, 1 + Math.floor(this.chain / 6));
    if (m > this.mult) { this.mult = m; audio.combo(m); this.fx.text(this.player.x, this.player.y - 54, `KETTE ×${m}`, COLORS.amber); }
    this.addScore(e.score, e.x, e.y);
  }

  private addScore(base: number, x: number, y: number): void {
    const pts = Math.round((base * this.mult * this.diff.scoreMul) / 10) * 10;
    this.score += pts;
    if (this.mult > 1 || base >= 500) this.fx.text(x, y - 18, `+${pts}`, base >= 500 ? COLORS.amber : "#ffffff");
  }

  private drop(x: number, y: number, force: boolean): void {
    this.sinceDrop++;
    if (!force && Math.random() > 0.065 && this.sinceDrop < 24) return;
    this.sinceDrop = 0;
    const r = Math.random();
    let kind: PickupKind = r < 0.32 ? "TRI" : r < 0.56 ? "SHIELD" : r < 0.72 ? "PIERCE" : r < 0.86 ? "LIFE" : "EMP";
    if (kind === "LIFE" && this.lives >= this.maxLives) kind = "SHIELD";
    this.pickups.push({ x, y, kind, t: 0, dead: false });
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    for (const k of this.pickups) {
      k.t += dt; k.y += 120 * dt;
      if (k.y > view.h + 30) { k.dead = true; continue; }
      if (this.state === "PLAYING" && Math.abs(k.x - p.x) < 34 && Math.abs(k.y - p.y) < 40) {
        k.dead = true;
        this.collect(k.kind);
      }
    }
    this.sweep(this.pickups);
  }

  private collect(kind: PickupKind): void {
    const p = this.player;
    const info = PICKUP_INFO[kind];
    if (kind === "TRI") p.tri = 6;
    else if (kind === "PIERCE") p.pierce = 8;
    else if (kind === "SHIELD") p.shield = 12;
    else if (kind === "LIFE") { if (this.lives < this.maxLives) this.lives++; else this.score += 500; }
    else if (kind === "EMP") {
      this.clearEnemyShots();
      this.globalCd = 2.5;
      for (const e of this.enemies) {
        if (e.kind === "echo") this.damage(e, 1, e.x, e.y);
        else if (e.kind === "boss" || e.kind === "guardian") this.damage(e, 10, e.x, e.y);
        else e.flash = 1;
      }
      this.fx.ring(p.x, p.y, info.color, 520, 0.8); this.fx.ring(p.x, p.y, "#ffffff", 300, 0.6);
      audio.emp(); this.shake(0.3, 6);
    }
    if (kind !== "EMP") audio.pickup();
    this.score += 250;
    this.fx.ring(p.x, p.y, info.color, 44, 0.4);
    this.fx.text(p.x, p.y - 54, info.label, info.color);
  }

  private killBoss(e: Enemy): void {
    this.addScore(e.score, e.x, e.y);
    this.bossX = e.x; this.bossY = e.y;
    this.clearEnemyShots();
    for (const o of this.enemies) if (o !== e) { o.dead = true; this.fx.explosion(o.x, o.y, ENEMY_COLOR[o.kind], 0.7); }
    this.phase = "bossdeath"; this.phaseT = 2.8;
    this.ui.boss(null); this.ui.hideBanner();
    this.ui.status("POLYPHEM // SIGNAL VERLOREN", false);
    audio.explode(2); audio.setIntensity(0);
    this.shake(1.2, 16);
  }

  private updateFlow(dt: number): void {
    this.phaseT -= dt;
    if (this.phase === "intro") {
      if (this.phaseT <= 0) this.phase = "fight";
    } else if (this.phase === "fight") {
      if (this.enemies.length === 0) {
        this.phase = "clear"; this.phaseT = 1.25;
        this.clearEnemyShots();
        audio.waveClear();
        const bonus = Math.round((200 * this.sector * this.diff.scoreMul) / 10) * 10;
        this.score += bonus;
        this.ui.banner("SEKTOR GESICHERT", `Bonus +${bonus}`, 1100);
      }
    } else if (this.phase === "clear") {
      if (this.phaseT <= 0) this.advance();
    } else if (this.phase === "bossdeath") {
      if (Math.random() < dt * 14) {
        this.fx.explosion(this.bossX + rand(-110, 110), this.bossY + rand(-45, 45), Math.random() < 0.5 ? COLORS.amber : "#ffffff", rand(0.8, 1.8));
        audio.explode(Math.random() < 0.3 ? 1 : 0);
      }
      if (this.phaseT <= 0) {
        this.fx.explosion(this.bossX, this.bossY, "#ffffff", 3.2);
        this.fx.ring(this.bossX, this.bossY, COLORS.amber, 700, 1.4);
        audio.explode(2);
        this.state = "OUTRO"; this.outroT = 0;
        this.ui.setPlaying(false);
        this.shots.length = 0; this.pickups.length = 0; this.enemies.length = 0;
      }
    }
  }

  // ---------- Darstellung ----------

  private render(): void {
    const ctx = this.ctx;
    const st = this.state;
    ctx.setTransform(view.res, 0, 0, view.res, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const bgAct = st === "TITLE" || st === "GAMEOVER" || st === "WON" ? 0 : this.act;
    this.bg.draw(ctx, bgAct, this.sector, st === "OUTRO" || this.phase === "bossdeath");

    const world = st === "PLAYING" || st === "PAUSED" || st === "DYING";
    ctx.save();
    if (this.shakeT > 0 && st !== "PAUSED") ctx.translate((Math.random() - 0.5) * this.shakeI, (Math.random() - 0.5) * this.shakeI);
    if (world) {
      this.drawLine(ctx);
      for (const k of this.pickups) this.drawPickup(ctx, k);
      for (const e of this.enemies) this.drawEnemy(ctx, e);
      if (this.phase === "bossdeath" && st !== "DYING") this.drawBoss(ctx, this.bossX + rand(-4, 4), this.bossY + rand(-4, 4), 0, 2, 1);
      this.drawShots(ctx);
      if (st !== "DYING") this.drawPlayer(ctx);
    }
    this.fx.draw(ctx);
    ctx.restore();
    if (st === "OUTRO") this.drawOutro(ctx);
  }

  private drawLine(ctx: CanvasRenderingContext2D): void {
    const y = this.lineY;
    let near = 0;
    for (const e of this.enemies) {
      if (e.kind === "boss" || e.kind === "guardian" || e.kind === "echo") continue;
      const dist = y - (e.y + e.h / 2);
      if (dist < 160) near = Math.max(near, 1 - dist / 160);
    }
    ctx.save();
    ctx.globalAlpha = 0.14 + near * 0.6 * (0.6 + 0.4 * Math.sin(this.waveT * 10));
    ctx.strokeStyle = near > 0 ? COLORS.danger : COLORS.amber;
    ctx.lineWidth = 1; ctx.setLineDash([10, 14]);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(view.w, y); ctx.stroke();
    ctx.restore();
  }

  private spriteFor(e: Enemy): Sprite {
    switch (e.kind) {
      case "drifter": return this.act === 3 ? S.core : S.drifter;
      case "beast": return S.beast;
      case "satellite": return S.satellite;
      case "pod": return S.pod;
      case "hunter": return S.hunter;
      case "plasma": return S.plasma;
      case "monolith": return S.monolith;
      case "echo": return S.echo;
      case "guardian": return S.guardians[clamp(this.act - 1, 0, 3)];
      default: return S.boss;
    }
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
    if (e.kind === "boss") {
      this.drawBoss(ctx, e.x, e.y, e.flash, e.stage, e.hp / e.maxHp);
      return;
    }
    const s = this.spriteFor(e);
    let scale = e.kind === "guardian" || e.kind === "echo" ? 1 : ES, rot = 0;
    if (e.kind === "plasma") scale *= 1 + Math.sin(e.t * 5 + e.phase) * 0.08;
    else if (e.kind === "hunter") rot = clamp(-e.vx / 300, -0.25, 0.25);
    else if (e.kind === "satellite") rot = Math.sin(e.t * 0.8 + e.phase) * 0.18;
    else if (e.kind === "echo") rot = e.t * 3;
    else if (e.kind === "beast") scale *= 1 + Math.sin(e.t * 8 + e.phase) * 0.05;
    drawSprite(ctx, s, e.x, e.y, scale, rot);
    if (e.flash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(e.flash, 0, 1);
      drawSprite(ctx, s, e.x, e.y, scale, rot);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    if (e.kind === "guardian") {
      const r = Math.max(e.w, e.h) / 2 + 16;
      ctx.save();
      ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const a = e.t * 0.9 + (i * Math.PI * 2) / 3;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, a, a + 1.1); ctx.stroke();
      }
      const bw = 110, k = clamp(e.hp / e.maxHp, 0, 1);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,176,32,0.18)"; ctx.fillRect(e.x - bw / 2, e.y - r - 16, bw, 4);
      ctx.fillStyle = k < 0.4 ? COLORS.danger : COLORS.amber; ctx.fillRect(e.x - bw / 2, e.y - r - 16, bw * k, 4);
      ctx.restore();
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, flash: number, stage: number, ratio: number): void {
    drawSprite(ctx, S.boss, x, y);
    if (flash > 0) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = clamp(flash, 0, 1) * 0.7;
      drawSprite(ctx, S.boss, x, y);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    const t = performance.now() / 1000;
    const look = clamp((this.player.x - x) / 400, -1, 1) * 10;
    const cx = x + look, cy = y - 2;
    const col = stage >= 2 ? "#ff3b3b" : stage === 1 ? "#ff7a2a" : COLORS.amber;
    const pulse = 1 + Math.sin(t * (4 + stage * 3)) * 0.12;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.9;
    drawSprite(ctx, glow(col), cx, cy, 1.25 * pulse);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    const blink = Math.sin(t * 0.7) > 0.985 ? 0.15 : 1;
    const hw = (5 + (1 - ratio) * 4) * blink, hh = 21;
    ctx.fillStyle = "#fff4d6";
    ctx.beginPath(); ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1a0500";
    ctx.beginPath(); ctx.moveTo(cx, cy - hh * 0.55); ctx.lineTo(cx + hw * 0.35, cy); ctx.lineTo(cx, cy + hh * 0.55); ctx.lineTo(cx - hw * 0.35, cy); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  private drawPickup(ctx: CanvasRenderingContext2D, k: Pickup): void {
    const info = PICKUP_INFO[k.kind];
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.45 + Math.sin(k.t * 6) * 0.15;
    drawSprite(ctx, glow(info.color), k.x, k.y, 0.9);
    ctx.restore();
    drawSprite(ctx, S.pickups[k.kind], k.x, k.y, 1 + Math.sin(k.t * 6) * 0.06);
  }

  private drawShots(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const s of this.shots) {
      ctx.globalAlpha = 0.8;
      drawSprite(ctx, glow(s.color), s.x, s.y, s.friendly ? 0.34 : 0.42);
    }
    ctx.globalAlpha = 1;
    for (const s of this.shots) {
      const sp = Math.hypot(s.vx, s.vy) || 1;
      const len = s.friendly ? 13 : 8;
      const dx = (s.vx / sp) * len, dy = (s.vy / sp) * len;
      ctx.strokeStyle = s.friendly ? "#ffffff" : s.color;
      ctx.lineWidth = s.friendly ? (s.pierce ? 3.4 : 2.6) : 4;
      ctx.beginPath(); ctx.moveTo(s.x - dx, s.y - dy); ctx.lineTo(s.x + dx, s.y + dy); ctx.stroke();
      if (!s.friendly) {
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(s.x - dx * 0.5, s.y - dy * 0.5); ctx.lineTo(s.x + dx * 0.5, s.y + dy * 0.5); ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D): void {
    const p = this.player;
    const t = performance.now() / 1000;
    ctx.save();
    if (p.inv > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = "lighter";
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * 0.75;
    drawSprite(ctx, glow(COLORS.player), p.x - 9, p.y + 30, 0.42 + Math.random() * 0.1);
    drawSprite(ctx, glow(COLORS.player), p.x + 9, p.y + 30, 0.42 + Math.random() * 0.1);
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a;
    drawSprite(ctx, S.ship, p.x, p.y, 1, p.tilt * 0.14);
    if (p.shield > 0) {
      const fade = p.shield < 3 ? 0.5 + 0.5 * Math.sin(t * 16) : 1;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5 * fade;
      drawSprite(ctx, glow("#5ab8ff"), p.x, p.y, 1.9);
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = "#9fd8ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 40 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  private drawOutro(ctx: CanvasRenderingContext2D): void {
    const cx = view.w / 2;
    const gap = 40;
    const y0 = view.h / 2 - ((OUTRO_LINES.length - 1) * gap) / 2;
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const size = view.w < 780 ? 13 : 16;
    for (let i = 0; i < OUTRO_LINES.length; i++) {
      let a = clamp(this.outroT - 1.2 - i * 1.5, 0, 1);
      if (this.outroT > OUTRO_TIME - 1.5) a *= clamp(OUTRO_TIME - this.outroT, 0, 1);
      if (a <= 0) continue;
      const last = i === OUTRO_LINES.length - 1;
      ctx.globalAlpha = a;
      ctx.font = last ? `400 ${size + 3}px 'Michroma', sans-serif` : `500 ${size}px 'Chakra Petch', sans-serif`;
      ctx.fillStyle = last ? COLORS.amber : i === OUTRO_LINES.length - 2 ? COLORS.player : "#dfe3ea";
      ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 8 * view.res;
      ctx.fillText(OUTRO_LINES[i], cx, y0 + i * gap, view.w - 40);
    }
    ctx.restore();
  }
}
