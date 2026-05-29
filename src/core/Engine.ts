import { EntityManager, System } from "./ECS";
import { sfx } from "./AudioEngine";

export type GameState = "START" | "PLAYING" | "CINEMATIC" | "GAMEOVER" | "GAMEWON";

export class Engine {
  public em: EntityManager;
  public ctx: CanvasRenderingContext2D;
  private systems: System[] = [];
  private lastTime = 0;

  // Globale States
  public score = 0;
  public lives = 3;
  public currentAct = 0;
  public currentLevel = 1;
  public state: GameState = "START";

  // Checkpoint-Zelle
  public checkpointAct = 1;
  public checkpointLevel = 1;

  // SOTA DEBUG SYSTEM MODUS
  public debugActive = false;
  private fps = 0;
  private frameCount = 0;
  private fpsTimer = 0;
  public lastDebugLog = "SYSTEM INITIALIZED // NO ERRORS DETECTED";

  // Screen Shake
  private shakeDuration = 0;
  private shakeIntensity = 0;
  private cinematicTimer = 0;
  private maxCinematicDuration = 5.0;

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
      if (e.code === "KeyI") { // 'I' blendet das SOTA-Diagnosefenster ein/aus
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
    document.getElementById("start-btn")?.addEventListener("click", () => {
      sfx.playSpaceAmbient();
      
      const overlay = document.getElementById("screen-overlay");
      const hud = document.getElementById("hud");
      
      if (overlay) overlay.style.display = "none";
      if (hud) hud.classList.remove("opacity-0");
      
      if (this.state === "GAMEOVER") {
        this.currentAct = this.checkpointAct;
        this.currentLevel = this.checkpointLevel;
        this.lives = 3;
        this.state = "PLAYING";
        this.logDebug(`SYSTEM RESUMED FROM CHECKPOINT: ACT ${this.checkpointAct}`);
        this.em.getAllEntities().forEach(e => {
          if (!this.em.hasComponent(e, "Health")) this.em.destroyEntity(e);
        });
      } else {
        this.currentAct = 1;
        this.currentLevel = 1;
        this.state = "PLAYING";
        this.logDebug("NEW SIMULATION CONTEXT STARTED");
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

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (delta > 0.1) delta = 0.1;

    // FPS Berechnung
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 1.0) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.ctx.fillStyle = "#020205";
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

    if (this.state === "PLAYING" || this.state === "CINEMATIC") {
      if (this.currentAct === 5) {
        this.renderStargateWarp(currentTime / 1000);
      }

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

    this.syncDOMHUD();
    if (this.debugActive) this.renderDebugUI(entities.length);

    if (this.lives <= 0 && this.state !== "GAMEOVER") {
      this.state = "GAMEOVER";
      this.logDebug("FATAL ENGINE FAILURE: LIVES DROPPED TO 0");
      this.handleEndState(false);
    }

    if (this.state === "GAMEWON") {
      this.handleEndState(true);
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  private syncDOMHUD() {
    if (this.state !== "PLAYING") return;
    const scoreEl = document.getElementById("ui-score");
    const actEl = document.getElementById("ui-act");
    const livesEl = document.getElementById("ui-lives");

    if (scoreEl) scoreEl.textContent = `SCORE // ${this.score.toString().padStart(6, '0')}`;
    if (actEl) actEl.textContent = `AKT 0${this.currentAct} - SEKTOR ${this.currentLevel}`;
    
    if (livesEl) {
      livesEl.innerHTML = "■ ".repeat(Math.max(0, this.lives))
        .split(" ")
        .filter(Boolean)
        .map(() => `<span class="w-3 h-5 bg-[#ff3333] inline-block shadow-[0_0_8px_rgba(255,51,51,0.6)]"></span>`)
        .join("");
    }
  }

  private renderDebugUI(entityCount: number) {
    let panel = document.getElementById("debug-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "debug-panel";
      panel.className = "absolute bottom-16 left-6 bg-black/90 border border-emerald-500/40 p-4 font-mono text-[10px] text-emerald-400 space-y-1 z-50 rounded shadow-2xl";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <div class="text-emerald-300 font-bold border-b border-emerald-500/20 pb-1 mb-1">HAL 9000 TELEMETRIE-CONSOLE</div>
      <div>FPS ENGINE:        <span class="text-white">${this.fps}</span></div>
      <div>STATE MACHINE:     <span class="text-white">${this.state}</span></div>
      <div>ACTIVE ENTITIES:   <span class="text-white">${entityCount}</span></div>
      <div>CURRENT ACT/LVL:   <span class="text-white">A0${this.currentAct} // L0${this.currentLevel}</span></div>
      <div>CHECKPOINT LOCK:   <span class="text-white">A0${this.checkpointAct} // L0${this.checkpointLevel}</span></div>
      <div class="text-amber-400 border-t border-emerald-500/20 mt-1 pt-1">STREAM: ${this.lastDebugLog}</div>
    `;
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

  private handleEndState(won: boolean) {
    const hud = document.getElementById("hud");
    const overlay = document.getElementById("screen-overlay");
    const title = document.getElementById("overlay-title");
    const desc = document.getElementById("overlay-desc");
    const btn = document.getElementById("start-btn");

    if (hud) hud.classList.add("opacity-0");
    if (overlay) overlay.style.display = "flex";
    if (btn) btn.textContent = won ? "TRANZENDIEREN" : `REBOOT ZU AKT ${this.checkpointAct}`;
    
    if (title && desc) {
      if (!won) {
        title.textContent = "SYSTEM ERROR // DAVE";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#ff3333]";
        desc.textContent = `Kritischer Strukturverlust im All. Reboote Simulation aus Speicherzelle Akt ${this.checkpointAct}.`;
      } else {
        title.textContent = "EVOLUTION COMPLETED";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#00ffcc] drop-shadow-[0_0_15px_rgba(0,255,204,0.6)]";
        desc.textContent = "Das Sternenkind ist geboren. Du hast alle Dimensionen durchbrochen.";
      }
    }
  }
}