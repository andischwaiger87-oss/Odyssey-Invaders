import { EntityManager, System } from "./ECS";
import { sfx } from "./AudioEngine";

export type GameState = "START" | "PLAYING" | "CINEMATIC" | "GAMEOVER" | "GAMEWON";

export class Engine {
  public em: EntityManager;
  public ctx: CanvasRenderingContext2D;
  private systems: System[] = [];
  private lastTime = 0;

  // Globale Spielzustände
  public score = 0;
  public lives = 3;
  public currentAct = 0;
  public state: GameState = "START";

  // Delta-basierter Cinematic-Timer (Ersetzt unpräzise setTimeout-Uhr)
  private cinematicTimer = 0;
  private maxCinematicDuration = 5.0; // Sekunden pro Storycard

  // SOTA Screen Shake Effekt-Variablen
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
      const overlay = document.getElementById("screen-overlay");
      const hud = document.getElementById("hud");
      
      if (overlay) overlay.style.display = "none";
      if (hud) hud.classList.remove("opacity-0");
      
      this.currentAct = 1;
      this.state = "PLAYING";
    });
  }

  public triggerScreenShake(duration: number, intensity: number) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  public triggerCinematic(title: string, textLines: string[]) {
    this.state = "CINEMATIC";
    this.cinematicTimer = this.maxCinematicDuration; // Timer auf 5 Sekunden setzen
    
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
    // Delta-Zeit berechnen
    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // SOTA-Schutzschicht: Verhindert extreme Sprünge (z.B. Tab-Wechsel / extreme Lags)
    if (delta > 0.1) delta = 0.1;

    // Hintergrund leeren (Tiefer, unheimlicher Weltraum)
    this.ctx.fillStyle = "#020205";
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    // Synchronisation der prozeduralen Audio-Dramaturgie
    sfx.updateAmbientTheme(this.currentAct);

    // --- SCREEN SHAKE MATRIX INJEKTION ---
    this.ctx.save();
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(dx, dy);
    }

    const entities = this.em.getAllEntities();

    // --- ZUSTANDSSTEUERUNG INNERHALB DES LOOPS ---
    if (this.state === "PLAYING" || this.state === "CINEMATIC") {
      
      // Akt IV psychedelischer Tunnel-Warp direkt auf den Canvas rendern
      if (this.currentAct === 4) {
        this.renderStargateWarp(currentTime / 1000);
      }

      // Taktung aller registrierten ECS-Systeme
      for (const system of this.systems) {
        system.update(entities, this, delta);
      }

      // Delta-Verrechnung für Titelkarten im Cinematic-Zustand
      if (this.state === "CINEMATIC") {
        this.cinematicTimer -= delta;
        
        // Dynamischer Fortschrittsbalken im UI aktualisieren
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

    this.ctx.restore(); // Matrix-Transformation (Shake) nach dem Rendern aufheben

    // DOM HUD Updates synchronisieren
    if (this.state === "PLAYING") {
      this.syncDOMHUD();
    }

    // Lebensprüfungen für Game Over Zustand
    if (this.lives <= 0 && this.state !== "GAMEOVER") {
      this.state = "GAMEOVER";
      this.handleEndState(false);
    }

    // Prüfung für den transzendenten Siegzustand
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
    if (actEl) actEl.textContent = `AKT 0${this.currentAct} // MISSION INF`;
    
    if (livesEl) {
      livesEl.innerHTML = "■ ".repeat(Math.max(0, this.lives))
        .split(" ")
        .filter(Boolean)
        .map(() => `<span class="w-3 h-5 bg-[#ff3333] inline-block shadow-[0_0_8px_rgba(255,51,51,0.6)]"></span>`)
        .join("");
    }
  }

  // Akt IV: Der psychedelische "Beyond the Infinite"-Tunnel-Effekt
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
    if (btn) btn.textContent = won ? "TRANZENDIEREN" : "REBOOT SYSTEM";
    
    if (title && desc) {
      if (!won) {
        title.textContent = "SYSTEM ERROR // DAVE";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#ff3333] animate-pulse";
        desc.textContent = "I'm sorry, Dave. I'm afraid I can't do that. Die Discovery-One-Mission ist fatal gescheitert.";
      } else {
        title.textContent = "EVOLUTION COMPLETED";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#00ffcc] drop-shadow-[0_0_15px_rgba(0,255,204,0.6)]";
        desc.textContent = "Das Sternenkind ist geboren. Du hast die Grenzen von Materie, Zeit und menschlichem Verstand durchbrochen.";
      }
    }

    if (btn) {
      btn.onclick = () => {
        window.location.reload();
      };
    }
  }
}