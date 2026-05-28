import { EntityManager, System } from "./ECS";
import { sfx } from "./AudioEngine";

export type GameState = "START" | "PLAYING" | "CINEMATIC" | "GAMEOVER" | "GAMEWON";

export class Engine {
  public em: EntityManager;
  public ctx: CanvasRenderingContext2D;
  private systems: System[] = [];
  private lastTime = 0;

  // Spieldaten & Level-Progression
  public score = 0;
  public lives = 3;
  public currentAct = 0;
  public currentLevel = 1; // Jedes Kapitel hat nun Unter-Levels
  public state: GameState = "START";

  // SOTA CHECKPOINT SPEICHER-ZELLE
  public checkpointAct = 1;
  public checkpointLevel = 1;

  private cinematicTimer = 0;
  private maxCinematicDuration = 5.0;

  private shakeDuration = 0;
  private shakeIntensity = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.em = new EntityManager();
    this.ctx = canvas.getContext("2d")!;
    this.resizeCanvas(canvas);
    window.addEventListener("resize", () => this.resizeCanvas(canvas));
    this.bindDOMEvents();
  }

  private resizeCanvas(canvas: HTMLCanvasElement) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private bindDOMEvents() {
    document.getElementById("start-btn")?.addEventListener("click", () => {
      sfx.playSpaceAmbient(); // Zündet das Audio-System im User-Gesture Scope
      
      const overlay = document.getElementById("screen-overlay");
      const hud = document.getElementById("hud");
      
      if (overlay) overlay.style.display = "none";
      if (hud) hud.classList.remove("opacity-0");
      
      // Falls wir von einem Checkpoint wiederkehren
      if (this.state === "GAMEOVER") {
        this.currentAct = this.checkpointAct;
        this.currentLevel = this.checkpointLevel;
        this.lives = 3;
        this.state = "PLAYING";
        // Zwinge den ActDirector zum sofortigen Neuaufbau der Formation
        this.em.getAllEntities().forEach(e => {
          if (!this.em.hasComponent(e, "Health")) this.em.destroyEntity(e);
        });
      } else {
        this.currentAct = 1;
        this.currentLevel = 1;
        this.state = "PLAYING";
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
      if (this.currentAct === 4) {
        this.renderStargateWarp(currentTime / 1000);
      }

      for (const system of this.systems) {
        system.update(entities, this, delta);
      }

      if (this.state === "CINEMATIC") {
        this.cinematicTimer -= delta;
        
        const progressEl = document.getElementById("story-progress");
        if (progressEl) {
          const percentage = (this.cinematicTimer / this.maxCinematicDuration) * 100;
          progressEl.style.width = `${percentage}%`;
        }

        if (this.cinematicTimer <= 0) {
          document.getElementById("story-card")!.classList.add("pointer-events-none", "opacity-0");
          this.state = "PLAYING";
        }
      }
    }

    this.ctx.restore();

    if (this.state === "PLAYING") {
      this.syncDOMHUD();
    }

    if (this.lives <= 0 && this.state !== "GAMEOVER") {
      this.state = "GAMEOVER";
      this.handleEndState(false);
    }

    if (this.state === "GAMEWON") {
      this.handleEndState(true);
    }

    requestAnimationFrame(this.loop.bind(this));
  }

  private syncDOMHUD() {
    const scoreEl = document.getElementById("ui-score");
    const actEl = document.getElementById("ui-act");
    const livesEl = document.getElementById("ui-lives");

    if (scoreEl) scoreEl.textContent = `SCORE // ${this.score.toString().padStart(6, '0')}`;
    if (actEl) actEl.textContent = `AKT 0${this.currentAct} - LVL ${this.currentLevel}`;
    
    if (livesEl) {
      livesEl.innerHTML = "■ ".repeat(Math.max(0, this.lives))
        .split(" ")
        .filter(Boolean)
        .map(() => `<span class="w-3 h-5 bg-[#ff3333] inline-block shadow-[0_0_8px_rgba(255,51,51,0.6)]"></span>`)
        .join("");
    }
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
    
    if (btn) {
      // SOTA CHECKPOINT FEEDBACK IM UTILITY BUTTON
      btn.textContent = won ? "TRANZENDIEREN" : `ZURÜCK ZU AKT ${this.checkpointAct}`;
    }
    
    if (title && desc) {
      if (!won) {
        title.textContent = "SYSTEM ERROR // DAVE";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#ff3333] animate-pulse";
        desc.textContent = `HAL 9000: "Ich kann das nicht zulassen, Dave." Deine Discovery wurde zerstört. Reboote am Checkpunkt (Akt ${this.checkpointAct}).`;
      } else {
        title.textContent = "EVOLUTION COMPLETED";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#00ffcc] drop-shadow-[0_0_15px_rgba(0,255,204,0.6)]";
        desc.textContent = "Das Sternenkind ist geboren. Du hast die Grenzen von Materie, Zeit und Verstand durchbrochen.";
      }
    }
  }
}