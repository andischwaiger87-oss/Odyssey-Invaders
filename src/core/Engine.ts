import { EntityManager, System } from "./ECS";
import { sfx } from "./AudioEngine";
import { Health } from "../components/Health";

export type GameState = "START" | "PLAYING" | "CINEMATIC" | "GAMEOVER" | "GAMEWON";

export class Engine {
  public em: EntityManager;
  public ctx: CanvasRenderingContext2D;
  private systems: System[] = [];
  private lastTime = 0;

  // Globale Konfigurationen (4 Sektoren pro Akt)
  public score = 0;
  public lives = 3;
  public currentAct = 0;
  public currentLevel = 1;
  public state: GameState = "START";

  // Checkpoint-Archivierung
  public checkpointAct = 1;
  public checkpointLevel = 1;

  // Ausgelesene DOM-Einstellungen
  public difficultyMode = "NOMINAL";
  public controlInterface = "MOUSE";

  // SOTA Live-Telemetrie & Diagnose
  public debugActive = false;
  private fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  public lastDebugLog = "DIAGNOSTIC SYSTEM ONLINE // ENTRANT ENVELOPE STABLE";

  // Countdown Spiegel-Timer für Akt IV
  public warpTimerDisplay = 15.0;

  private shakeDuration = 0;
  private shakeIntensity = 0;
  private cinematicTimer = 0;
  private maxCinematicDuration = 5.0;

  // State-Lock-Sperre: Verhindert, dass handleEndState in jedem Frame feuert und den DOM einfriert
  private endStateTriggered = false;

  constructor(canvas: HTMLCanvasElement) {
    this.em = new EntityManager();
    this.ctx = canvas.getContext("2d")!;
    this.resizeCanvas(canvas);
    window.addEventListener("resize", () => this.resizeCanvas(canvas));
    this.bindDOMEvents();
    this.setupDebugToggle();
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private setupDebugToggle() {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyI") {
        this.debugActive = !this.debugActive;
        const panel = document.getElementById("debug-panel");
        if (panel) panel.classList.toggle("hidden", !this.debugActive);
      }
    });
  }

  public logDebug(message: string) {
    this.lastDebugLog = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.log(`HAL_9000_LOG: ${message}`);
  }

  private bindDOMEvents() {
    // Dynamische Koppelung der Options-Werte im UI-Balken
    const volInput = document.getElementById("cfg-volume") as HTMLInputElement;
    const volVal = document.getElementById("cfg-volume-val");
    if (volInput && volVal) {
      volInput.addEventListener("input", () => {
        volVal.textContent = `${volInput.value}%`;
      });
    }

    const crtCheck = document.getElementById("cfg-crt") as HTMLInputElement;
    if (crtCheck) {
      crtCheck.addEventListener("change", () => {
        document.body.classList.toggle("crt-overlay", crtCheck.checked);
      });
    }

    document.getElementById("start-btn")?.addEventListener("click", () => {
      // 1. Auslesen aller SOTA Einstellungs-Parameter vom DOM
      const diffSelect = document.getElementById("cfg-difficulty") as HTMLSelectElement;
      const ctrlSelect = document.getElementById("cfg-controls") as HTMLSelectElement;
      
      if (diffSelect) this.difficultyMode = diffSelect.value;
      if (ctrlSelect) {
        this.controlInterface = ctrlSelect.value;
        const hint = document.getElementById("ui-controls-hint");
        if (hint) hint.textContent = this.controlInterface === "MOUSE" ? "STEUERUNG: MAUS / TOUCH INTERFACE" : "STEUERUNG: VAKTOR-TASTEN (A / D)";
      }

      // Initialisierung des Web-Audio Kontextes über User-Geste
      sfx.playSpaceAmbient();

      const overlay = document.getElementById("screen-overlay");
      const hud = document.getElementById("hud");
      
      if (overlay) overlay.style.display = "none";
      if (hud) hud.classList.remove("opacity-0");
      
      this.endStateTriggered = false; // Zurücksetzen der Endscreen-Sperre

      if (this.state === "GAMEOVER" || this.state === "GAMEWON") {
        if (this.state === "GAMEWON") {
          // Komplett-Reset bei erfolgreicher Transzendenz
          this.checkpointAct = 1;
          this.checkpointLevel = 1;
          this.score = 0;
        }
        
        this.currentAct = this.checkpointAct;
        this.currentLevel = this.checkpointLevel;
        this.lives = this.difficultyMode === "EASY" ? 5 : this.difficultyMode === "HARDCORE" ? 2 : 3;
        this.state = "PLAYING";
        
        this.logDebug(`REBOOT SYSTEM // CONTEXT RESTORED FOR ACT ${this.checkpointAct} [DIFFICULTY: ${this.difficultyMode}]`);
        
        this.em.getAllEntities().forEach(e => {
          if (!this.em.hasComponent(e, "Health")) {
            this.em.destroyEntity(e);
          } else {
            const comp = this.em.getComponent<Health>(e, "Health")!;
            comp.max = this.lives;
            comp.current = this.lives;
            comp.invulnerableTimer = 2.0; // Spawnschutz
          }
        });
      } else {
        // Regulärer Erststart
        this.lives = this.difficultyMode === "EASY" ? 5 : this.difficultyMode === "HARDCORE" ? 2 : 3;
        this.currentAct = 1;
        this.currentLevel = 1;
        this.state = "PLAYING";
        this.logDebug(`NEW CHRONICLE RUNNER BOOTED // SETTING HEALTH COMPONENT AT MAX: ${this.lives}`);
      }
    });
  }

  public triggerScreenShake(duration: number, intensity: number) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  public triggerCinematic(title: string, textLines: string[]) {
    this.state = "CINEMATIC";
    this.cinematicTimer = this.maxCinematicDuration;
    
    const card = document.getElementById("story-card")!;
    const titleEl = document.getElementById("story-title")!;
    const textEl = document.getElementById("story-text")!;
    
    titleEl.textContent = title;
    textEl.innerHTML = textLines.map(line => `<p>${line}</p>`).join("");
    card.classList.remove("pointer-events-none", "opacity-0");
  }

  public addSystem(system: System): void {
    this.systems.push(system);
  }

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private loop = (currentTime: number): void => {
    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (delta > 0.1) delta = 0.1;

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.ctx.fillStyle = "#010104";
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    sfx.updateAmbientTheme(this.currentAct);

    this.ctx.save();
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    const entities = this.em.getAllEntities();

    // SOTA INTERVALL: Warp-Spiralen rendern in Akt IV und der heißen Phase in Akt V!
    if ((this.state === "PLAYING" || this.state === "CINEMATIC") && this.currentAct >= 4) {
      this.renderStargateWarp(currentTime / 1000);
    }

    if (this.state === "PLAYING" || this.state === "CINEMATIC") {
      for (const system of this.systems) {
        system.update(entities, this, delta);
      }

      if (this.state === "CINEMATIC") {
        this.cinematicTimer -= delta;
        const progressEl = document.getElementById("story-progress");
        if (progressEl) {
          progressEl.style.width = `${(this.cinematicTimer / this.maxCinematicDuration) * 100}%`;
        }
        if (this.cinematicTimer <= 0) {
          document.getElementById("story-card")!.classList.add("pointer-events-none", "opacity-0");
          this.state = "PLAYING";
        }
      }
    }

    this.ctx.restore();

    // Rendern des Akt-4 Countdown Textes direkt auf den Canvas
    if (this.currentAct === 4 && this.state === "PLAYING") {
      this.ctx.save();
      this.ctx.font = "bold 15px monospace";
      this.ctx.fillStyle = "#ff3333";
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = "#ff3333";
      this.ctx.textAlign = "center";
      this.ctx.fillText(`STARGATE STRUDEL // RESISTENZ-ZEIT SEKTOR: ${Math.max(0, this.warpTimerDisplay).toFixed(1)}s`, this.ctx.canvas.width / 2, 110);
      this.ctx.restore();
    }

    // Rendern des Boss-Lebensbalkens bei HAL 9000
    if (this.currentAct === 5 && this.currentLevel === 4 && this.state === "PLAYING") {
      const boss = entities.find(e => this.em.getComponent<Renderable>(e, "Renderable")?.type === "hal9000_boss");
      if (boss) {
        const h = this.em.getComponent<Health>(boss, "Health")!;
        this.drawBossHealthBar(h.current, h.max);
      }
    }

    this.syncDOMHUD();

    if (this.debugActive) this.renderDebugUI(entities.length);

    // CENTRALIZED STATE ENGINE RESOLUTION: Verhindert asynchrone Schleifenüberlagerung im DOM
    if (this.lives <= 0 && this.state === "PLAYING" && !this.endStateTriggered) {
      this.state = "GAMEOVER";
      this.endStateTriggered = true;
      this.logDebug("FATAL SYSTEM INTEGRITY DAMAGE // OPENING ENDREBOOT CARD");
      this.handleEndState(false);
    }

    requestAnimationFrame(this.loop);
  }

  private drawBossHealthBar(curr: number, max: number) {
    const w = 400;
    const h = 6;
    const x = this.ctx.canvas.width / 2 - w / 2;
    const y = 100;
    const ratio = Math.max(0, curr / max);

    this.ctx.save();
    this.ctx.fillStyle = "rgba(255,51,51,0.15)";
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = "#ff3333";
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = "#ff3333";
    this.ctx.fillRect(x, y, w * ratio, h);
    
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillStyle = "#ff3333";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`LOGIKKERN-INTEGRITÄT von HAL 9000: ${(ratio * 100).toFixed(0)}%`, this.ctx.canvas.width / 2, y - 6);
    this.ctx.restore();
  }

  private renderStargateWarp(time: number) {
    const cx = this.ctx.canvas.width / 2;
    const cy = this.ctx.canvas.height / 2;
    const maxRadius = Math.max(cx, cy);
    for (let i = 0; i < 40; i++) {
      const r = ((i * 22 + time * 140) % maxRadius);
      this.ctx.strokeStyle = `hsla(${(i * 12 + time * 60) % 360}, 100%, 50%, ${1 - r / maxRadius})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
}