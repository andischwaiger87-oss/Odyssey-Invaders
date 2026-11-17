// DOM-Oberfläche: HUD, Menüs, Einstellungen. Die Spiellogik kennt nur diese Klasse.

import { ACTS, DIFF, Difficulty, WARP_HASH } from "./config";
import { SaveData, storeSave, ControlMode } from "./save";
import { audio } from "./audio";

export interface UIHandlers {
  start(act: number): void;
  resume(): void;
  quit(): void;
  retry(): void;
  skipStory(): void;
  pause(): void;
  settingsChanged(): void;
  warp(act: number, sector: number): void;
  runActive(): boolean;
  eye(clicks: number): void;
}

export type ScreenName = "title" | "story" | "pause" | "end";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const pad6 = (n: number): string => Math.max(0, Math.floor(n)).toString().padStart(6, "0");

export class UI {
  private cache: Record<string, string> = {};
  private bannerTimer = 0;
  private startAct = 1;
  public settingsOpen = false;

  constructor(private save: SaveData, private h: UIHandlers) {
    const click = (id: string, fn: () => void): void => {
      $(id).addEventListener("click", () => { audio.unlock(); audio.ui(); fn(); });
    };
    click("btn-start", () => h.start(this.startAct));
    click("btn-settings", () => this.openSettings());
    click("btn-pause-settings", () => this.openSettings());
    click("btn-resume", () => h.resume());
    click("btn-quit", () => h.quit());
    click("btn-retry", () => h.retry());
    click("btn-end-title", () => h.quit());
    click("btn-pause", () => h.pause());
    click("btn-settings-close", () => this.closeSettings());
    $("story").addEventListener("click", () => h.skipStory());

    const actBox = $("act-select");
    ACTS.forEach((a, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.act = String(i + 1); b.textContent = a.roman;
      actBox.appendChild(b);
    });
    let pokes = 0;
    document.querySelector(".emblem")?.addEventListener("click", () => { audio.unlock(); h.eye(++pokes); });
    document.querySelectorAll<HTMLButtonElement>("#act-select button").forEach((b) => {
      b.addEventListener("click", () => { audio.unlock(); audio.ui(); this.startAct = Number(b.dataset.act); this.refreshTitle(); });
    });

    // Einstellungen
    const diff = $<HTMLSelectElement>("cfg-difficulty");
    const ctrl = $<HTMLSelectElement>("cfg-controls");
    const sfx = $<HTMLInputElement>("cfg-sfx");
    const music = $<HTMLInputElement>("cfg-music");
    const crt = $<HTMLInputElement>("cfg-crt");
    const shake = $<HTMLInputElement>("cfg-shake");
    const reduced = $<HTMLInputElement>("cfg-reduced");
    diff.value = save.difficulty; ctrl.value = save.controls;
    sfx.value = String(Math.round(save.sfx * 100)); music.value = String(Math.round(save.music * 100));
    crt.checked = save.crt; shake.checked = save.shake; reduced.checked = save.reduced;

    const apply = (): void => {
      if (!h.runActive()) save.difficulty = diff.value as Difficulty;
      save.controls = ctrl.value as ControlMode;
      save.sfx = Number(sfx.value) / 100; save.music = Number(music.value) / 100;
      save.crt = crt.checked; save.shake = shake.checked; save.reduced = reduced.checked;
      $("cfg-sfx-val").textContent = `${sfx.value} %`;
      $("cfg-music-val").textContent = `${music.value} %`;
      this.applyBody();
      storeSave(save);
      h.settingsChanged();
      this.refreshTitle();
    };
    [diff, ctrl, crt, shake, reduced].forEach((el) => el.addEventListener("change", apply));
    [sfx, music].forEach((el) => el.addEventListener("input", apply));
    $("cfg-sfx-val").textContent = `${sfx.value} %`;
    $("cfg-music-val").textContent = `${music.value} %`;

    // Sektor-Warp
    const sel = $<HTMLSelectElement>("cfg-warp-select");
    ACTS.forEach((a, ai) => a.sectors.forEach((s, si) => {
      const o = document.createElement("option");
      o.value = `${ai + 1}_${si + 1}`;
      o.textContent = `Akt ${a.roman} · Sektor ${si + 1} · ${s.name}`;
      sel.appendChild(o);
    }));
    $("btn-warp-unlock").addEventListener("click", () => { void this.tryUnlock(); });
    $("cfg-warp-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") void this.tryUnlock(); });
    $("btn-warp").addEventListener("click", () => {
      const [a, s] = sel.value.split("_").map(Number);
      this.closeSettings();
      h.warp(a, s);
    });
    if (save.warp) this.showWarp();

    this.applyBody();
    this.refreshTitle();
  }

  private async tryUnlock(): Promise<void> {
    const pw = $<HTMLInputElement>("cfg-warp-pw");
    const status = $("warp-status");
    let ok = false;
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw.value));
      const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      ok = hex === WARP_HASH;
    } catch { ok = false; }
    pw.value = "";
    if (ok) {
      this.save.warp = true; storeSave(this.save);
      this.showWarp(); audio.pickup();
    } else {
      status.textContent = "Zugriff verweigert."; status.className = "note bad"; audio.deny();
    }
  }

  private showWarp(): void {
    const status = $("warp-status");
    status.textContent = "Freigeschaltet. Ziel wählen und springen."; status.className = "note ok";
    $("warp-go").hidden = false;
    $<HTMLInputElement>("cfg-warp-pw").disabled = true;
    $<HTMLButtonElement>("btn-warp-unlock").disabled = true;
  }

  private applyBody(): void {
    document.body.classList.toggle("crt", this.save.crt);
    document.body.classList.toggle("reduced", this.save.reduced);
    const hint = this.save.controls === "KEYS" ? "Steuerung: A / D oder Pfeiltasten"
      : this.save.controls === "POINTER" ? "Steuerung: Maus oder Touch" : "Steuerung: Maus, Touch oder Tasten";
    this.text("hint", hint);
  }

  openSettings(): void {
    const active = this.h.runActive();
    $<HTMLSelectElement>("cfg-difficulty").disabled = active;
    $("cfg-difficulty-note").hidden = !active;
    $("settings").classList.add("is-open");
    this.settingsOpen = true;
  }

  closeSettings(): void {
    $("settings").classList.remove("is-open");
    this.settingsOpen = false;
  }

  refreshTitle(): void {
    if (this.startAct > this.save.unlocked) this.startAct = 1;
    document.querySelectorAll<HTMLButtonElement>("#act-select button").forEach((b) => {
      const a = Number(b.dataset.act);
      b.disabled = a > this.save.unlocked;
      b.setAttribute("aria-pressed", String(a === this.startAct));
      b.title = a > this.save.unlocked ? "Noch nicht erreicht" : `Akt ${ACTS[a - 1].roman}: ${ACTS[a - 1].title}`;
    });
    $("btn-start").textContent = this.startAct > 1 ? `Start ab Akt ${ACTS[this.startAct - 1].roman}` : "Mission starten";
    const best = this.save.best[this.save.difficulty];
    $("title-best").textContent = best > 0 ? `Bestwert ${DIFF[this.save.difficulty].label}: ${pad6(best)}` : "";
  }

  private text(id: string, value: string): void {
    if (this.cache[id] === value) return;
    this.cache[id] = value;
    $(id).textContent = value;
  }

  screen(name: ScreenName | null): void {
    (["title", "story", "pause", "end"] as ScreenName[]).forEach((n) => $(n).classList.toggle("is-open", n === name));
  }

  setPlaying(on: boolean): void { document.body.classList.toggle("playing", on); }

  hud(score: number, mult: number, act: number, sector: number, lives: number, maxLives: number, best: number): void {
    this.text("hud-score", pad6(score));
    this.text("hud-mult", `KETTE ×${mult}`);
    const hot = mult > 1 ? "1" : "0";
    if (this.cache.hot !== hot) { this.cache.hot = hot; $("hud-mult").classList.toggle("hot", mult > 1); }
    this.text("hud-sector", `AKT ${ACTS[act - 1]?.roman ?? "I"} · SEKTOR ${sector}`);
    this.text("hud-best", `BEST ${pad6(Math.max(best, score))}`);
    const key = `${lives}/${maxLives}`;
    if (this.cache.lives !== key) {
      this.cache.lives = key;
      let html = "";
      for (let i = 0; i < maxLives; i++) html += i < lives ? "<i></i>" : '<i class="lost"></i>';
      $("hud-lives").innerHTML = html;
    }
  }

  power(tri: number, pierce: number, shield: number): void {
    const set = (k: string, v: number): void => {
      const q = Math.round(v * 50);
      if (this.cache["pw" + k] === String(q)) return;
      this.cache["pw" + k] = String(q);
      const el = document.querySelector<HTMLElement>(`.pw[data-k="${k}"]`)!;
      el.classList.toggle("on", v > 0);
      (el.lastElementChild as HTMLElement).style.transform = `scaleX(${Math.max(0, Math.min(1, v))})`;
    };
    set("TRI", tri); set("PIERCE", pierce); set("SHIELD", shield);
  }

  boss(ratio: number | null, label = "", rage = false): void {
    const key = ratio === null ? "off" : `${Math.round(ratio * 200)}${rage ? "r" : ""}${label}`;
    if (this.cache.boss === key) return;
    this.cache.boss = key;
    const bar = $("boss-bar");
    bar.classList.toggle("on", ratio !== null);
    bar.classList.toggle("rage", rage);
    if (ratio !== null) {
      $("boss-fill").style.transform = `scaleX(${Math.max(0, ratio)})`;
      $("boss-label").textContent = label;
    }
  }

  banner(title: string, sub: string, ms = 1500): void {
    $("banner-title").textContent = title;
    $("banner-sub").textContent = sub;
    const el = $("banner");
    el.classList.add("on");
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => el.classList.remove("on"), ms);
  }

  hideBanner(): void { window.clearTimeout(this.bannerTimer); $("banner").classList.remove("on"); }

  story(act: number, title: string, lines: string[]): void {
    $("story-act").textContent = `AKT ${ACTS[act - 1].roman}`;
    $("story-title").textContent = title;
    const box = $("story-text");
    box.textContent = "";
    lines.forEach((l) => { const p = document.createElement("p"); p.textContent = l; box.appendChild(p); });
    this.screen("story");
  }

  storyProgress(p: number): void { $("story-progress").style.transform = `scaleX(${Math.max(0, Math.min(1, p))})`; }

  end(won: boolean, title: string, text: string, stats: Array<[string, string, boolean?]>, retryLabel: string): void {
    const t = $("end-title");
    t.textContent = title; t.className = won ? "won" : "lost";
    $("end-text").textContent = text;
    const dl = $("end-stats");
    dl.textContent = "";
    stats.forEach(([k, v, hi]) => {
      const d = document.createElement("div"); if (hi) d.className = "new";
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v;
      d.append(dt, dd); dl.appendChild(d);
    });
    $("btn-retry").textContent = retryLabel;
    this.screen("end");
  }

  status(text: string, alert = false): void {
    if (this.cache.status === text + alert) return;
    this.cache.status = text + alert;
    const el = $("ai-status");
    el.textContent = text; el.classList.toggle("alert", alert);
  }

  flash(): void {
    const el = $("fx-flash");
    el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  }

  debug(text: string | null): void {
    const el = $("debug");
    el.hidden = text === null;
    if (text !== null) el.textContent = text;
  }
}

export { pad6 };
