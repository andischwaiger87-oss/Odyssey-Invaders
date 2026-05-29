import { EntityManager, System } from "./ECS";
import { sfx } from "./AudioEngine";
import { Health } from "../components/Health";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Position } from "../components/Position";

export type GameState = "START" | "PLAYING" | "CINEMATIC" | "GAMEOVER" | "OUTRO" | "GAMEWON";

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
  public lastDebugLog = "DIAGNOSTIC SYSTEM ONLINE // LOCKING ALL INSTANCE SCOPES";

  // Countdown- & Outro-Timer
  public warpTimerDisplay = 15.0;
  public outroTimer = 0;

  private shakeDuration = 0;
  private shakeIntensity = 0;
  private cinematicTimer = 0;
  private maxCinematicDuration = 5.0;
  private endStateTriggered = false;

  private outroLines = [
    "HAL 9000 // LOGIKKERNE ERFOLGREICH GETRENNT",
    "SPEICHERPOOL-SABOTAGE NEUTRALISIERT...",
    "DISCOVERY ONE TRITT IN DEN ORBIT VOM JUPITER EIN.",
    "DIE GRENZEN DER EUKLIDISCHEN MATRIX ZERFALLEN.",
    "MATERIE... ZEIT... MENSCHLICHER VERSTAND...",
    "ALLES FLIESST INEINANDER.",
    "DIE METAMORPHOSE BEGINNT.",
    "DU BIST DAS STERNENKIND.",
    "ODYSSEE 2026 // SOTA ECS ENGINE V2"
  ];

  constructor(canvas: HTMLCanvasElement) {
    this.em = new EntityManager();
    this.ctx = canvas.getContext("2d")!;
    this.resizeCanvas(canvas);
    window.addEventListener("resize", () => this.resizeCanvas(canvas));
    this.bindDOMEvents();
    this.setupDebugToggle();
  }

  private resizeCanvas = (canvas: HTMLCanvasElement): void => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private setupDebugToggle = (): void => {
    window.addEventListener("keydown", (e) => {
      if (e.code === "KeyI") {
        this.debugActive = !this.debugActive;
        const panel = document.getElementById("debug-panel");
        if (panel) panel.classList.toggle("hidden", !this.debugActive);
      }
    });
  }

  public logDebug = (message: string): void => {
    this.lastDebugLog = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.log(`HAL_9000_LOG: ${message}`);
  }

  private bindDOMEvents = (): void => {
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

    const openSettingsBtn = document.getElementById("open-settings-btn");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const settingsModal = document.getElementById("settings-modal");

    openSettingsBtn?.addEventListener("click", () => {
      settingsModal?.classList.remove("hidden");
    });

    closeSettingsBtn?.addEventListener("click", () => {
      settingsModal?.classList.add("hidden");
      
      const diffSelect = document.getElementById("cfg-difficulty") as HTMLSelectElement;
      const ctrlSelect = document.getElementById("cfg-controls") as HTMLSelectElement;
      
      if (diffSelect) this.difficultyMode = diffSelect.value;
      if (ctrlSelect) {
        this.controlInterface = ctrlSelect.value;
        const hint = document.getElementById("ui-controls-hint");
        if (hint) hint.textContent = this.controlInterface === "MOUSE" ? "STEUERUNG: MAUS / TOUCH INTERFACE" : "STEUERUNG: VAKTOR-TASTEN (A / D)";
      }

      const warpContainer = document.getElementById("warp-level-container");
      const warpSelect = document.getElementById("cfg-warp-select") as HTMLSelectElement;
      if (warpContainer && !warpContainer.classList.contains("hidden") && warpSelect) {
        const [act, lvl] = warpSelect.value.split("_").map(Number);
        
        this.currentAct = act;
        this.currentLevel = lvl;
        this.checkpointAct = act;
        this.checkpointLevel = 1;

        this.em.getAllEntities().forEach(e => {
          if (!this.em.hasComponent(e, "Health")) this.em.destroyEntity(e);
        });

        if (this.state === "START" || this.state === "GAMEOVER") {
          const overlay = document.getElementById("screen-overlay");
          const hud = document.getElementById("hud");
          if (overlay) overlay.style.display = "none";
          if (hud) hud.classList.remove("opacity-0");
          this.state = "PLAYING";
        }

        this.enforcePlayerBaseline();
        this.logDebug(`WARP PROTOCOL EXECUTED // DESTINATION INTERCEPTED: ACT ${act} LEVEL ${lvl}`);
      }
    });

    const unlockWarpBtn = document.getElementById("unlock-warp-btn");
    unlockWarpBtn?.addEventListener("click", async () => {
      const pwInput = document.getElementById("cfg-warp-pw") as HTMLInputElement;
      if (!pwInput) return;

      const encoder = new TextEncoder();
      const data = encoder.encode(pwInput.value);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const targetHash = "0364c0e99a363153542157dddb22ebbbc63d22c6633c6b001a7bf6c98e82f2e9";
      const statusText = document.getElementById("warp-status-text");
      const container = document.getElementById("warp-level-container");

      if (hashHex === targetHash) {
        if (statusText) {
          statusText.textContent = "ZUGRIFF GEWÄHRT // LEVEL-WARP FREIGESCHALTET";
          statusText.className = "text-emerald-400 font-bold mt-1 text-[10px]";
        }
        if (container) container.classList.remove("hidden");
        pwInput.disabled = true;
        if (unlockWarpBtn instanceof HTMLButtonElement) unlockWarpBtn.disabled = true;
      } else {
        if (statusText) {
          statusText.textContent = "ZUGRIFF VERWEIGERT // SEC_FAIL: MALICIOUS CODE";
          statusText.className = "text-[#ff3333] font-bold mt-1 text-[10px] animate-pulse";
        }
        pwInput.value = "";
        this.triggerScreenShake(0.3, 15);
      }
    });

    document.getElementById("start-btn")?.addEventListener("click", () => {
      sfx.playSpaceAmbient();

      const overlay = document.getElementById("screen-overlay");
      const hud = document.getElementById("hud");
      
      if (overlay) overlay.style.display = "none";
      if (hud) hud.classList.remove("opacity-0");
      
      this.endStateTriggered = false;

      if (this.state === "GAMEOVER" || this.state === "GAMEWON") {
        if (this.state === "GAMEWON") {
          this.checkpointAct = 1;
          this.checkpointLevel = 1;
          this.score = 0;
        }
        
        this.currentAct = this.checkpointAct;
        this.currentLevel = 1;
        this.lives = this.difficultyMode === "EASY" ? 5 : this.difficultyMode === "HARDCORE" ? 2 : 3;
        this.state = "PLAYING";
        
        this.logDebug(`REBOOT SYSTEM // ACT ${this.checkpointAct} SECTOR 1 // DIFFICULTY PRESERVED: ${this.difficultyMode}`);
        
        this.em.getAllEntities().forEach(e => {
          const isPlayer = this.em.hasComponent(e, "Collider") && this.em.getComponent<Collider>(e, "Collider")!.faction === "PLAYER";
          if (!isPlayer) {
            this.em.destroyEntity(e);
          } else {
            const comp = this.em.getComponent<Health>(e, "Health")!;
            comp.max = this.lives;
            comp.current = this.lives;
            comp.invulnerableTimer = 2.0;
          }
        });
      } else {
        const diffSelect = document.getElementById("cfg-difficulty") as HTMLSelectElement;
        if (diffSelect) this.difficultyMode = diffSelect.value;
        
        this.lives = this.difficultyMode === "EASY" ? 5 : this.difficultyMode === "HARDCORE" ? 2 : 3;
        this.currentAct = 1;
        this.currentLevel = 1;
        this.state = "PLAYING";
      }

      this.enforcePlayerBaseline();
    });
  }

  private enforcePlayerBaseline = (): void => {
    const entities = this.em.getAllEntities();
    for (const entity of entities) {
      if (this.em.getComponent<Collider>(entity, "Collider")?.faction === "PLAYER") {
        const pos = this.em.getComponent<Position>(entity, "Position")!;
        pos.y = this.ctx.canvas.height - 120;
        break;
      }
    }
  }

  public triggerScreenShake = (duration: number, intensity: number): void => {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  public triggerCinematic = (title: string, textLines: string[]): void => {
    this.state = "CINEMATIC";
    this.cinematicTimer = this.maxCinematicDuration;
    
    const card = document.getElementById("story-card")!;
    const titleEl = document.getElementById("story-title")!;
    const textEl = document.getElementById("story-text")!;
    
    titleEl.textContent = title;
    textEl.innerHTML = textLines.map(line => `<p>${line}</p>`).join("");
    card.classList.remove("pointer-events-none", "opacity-0");
  }

  public addSystem = (system: System): void => {
    this.systems.push(system);
  }

  public start = (): void => {
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

    if ((this.state === "PLAYING" || this.state === "CINEMATIC" || this.state === "OUTRO") && 
        (this.currentAct === 5 && (this.currentLevel >= 3 || this.state === "OUTRO"))) {
      this.renderStargateWarp(currentTime / 1000);
    }

    if (this.state === "PLAYING" || this.state === "CINEMATIC" || this.state === "OUTRO") {
      if (this.state !== "OUTRO") {
        for (const system of this.systems) {
          system.update(entities, this, delta);
        }
      } else {
        this.renderCinematicOutro(delta);
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

    if (this.currentAct === 5 && this.currentLevel === 4 && this.state === "PLAYING") {
      const boss = entities.find(e => this.em.getComponent<Renderable>(e, "Renderable")?.type === "hal9000_boss");
      if (boss) {
        const h = this.em.getComponent<Health>(boss, "Health")!;
        this.drawBossHealthBar(h.current, h.max);
      }
    }

    this.syncDOMHUD();

    if (this.debugActive) this.renderDebugUI(entities.length);

    if (this.lives <= 0 && this.state === "PLAYING" && !this.endStateTriggered) {
      this.state = "GAMEOVER";
      this.endStateTriggered = true;
      this.handleEndState(false);
    }

    requestAnimationFrame(this.loop);
  }

  private renderCinematicOutro = (delta: number): void => {
    this.outroTimer += delta;
    const cx = this.ctx.canvas.width / 2;
    const startY = this.ctx.canvas.height / 2 - (this.outroLines.length * 20) / 2;

    this.ctx.save();
    this.ctx.textAlign = "center";
    this.ctx.font = "bold 13px monospace";

    for (let i = 0; i < this.outroLines.length; i++) {
      const lineDelay = i * 1.4;
      let opacity = Math.min(1, Math.max(0, this.outroTimer - lineDelay));
      
      if (this.outroTimer > 14) {
        opacity = Math.max(0, 1 - (this.outroTimer - 14));
      }

      this.ctx.fillStyle = `rgba(0, 240, 255, ${opacity * 0.95})`;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = "rgba(0, 240, 255, 0.5)";
      
      if (this.outroLines[i].includes("STERNENKIND")) {
        this.ctx.font = "bold 20px monospace";
        this.ctx.fillStyle = `rgba(0, 255, 204, ${opacity})`;
        this.ctx.shadowColor = "#00ffcc";
      } else {
        this.ctx.font = "bold 13px monospace";
      }

      this.ctx.fillText(this.outroLines[i], cx, startY + i * 32);
    }
    this.ctx.restore();

    if (this.outroTimer >= 16.0) {
      this.state = "GAMEWON";
      this.handleEndState(true);
    }
  }

  private drawBossHealthBar = (curr: number, max: number): void => {
    const w = 400; const h = 6;
    const x = this.ctx.canvas.width / 2 - w / 2; const y = 100;
    const ratio = Math.max(0, curr / max);
    this.ctx.save();
    this.ctx.fillStyle = "rgba(255,51,51,0.15)"; this.ctx.fillRect(x, y, w, h);
    this.ctx.fillStyle = "#ff3333"; this.ctx.shadowBlur = 15; this.ctx.shadowColor = "#ff3333"; this.ctx.fillRect(x, y, w * ratio, h);
    this.ctx.font = "bold 9px monospace"; this.ctx.fillStyle = "#ff3333"; this.ctx.textAlign = "center";
    this.ctx.fillText(`LOGIKKERN-INTEGRITÄT von HAL 9000: ${(ratio * 100).toFixed(0)}%`, this.ctx.canvas.width / 2, y - 6);
    this.ctx.restore();
  }

  private syncDOMHUD = (): void => {
    const scoreEl = document.getElementById("ui-score");
    const actEl = document.getElementById("ui-act");
    const livesEl = document.getElementById("ui-lives");

    if (scoreEl) scoreEl.textContent = `SCORE // ${this.score.toString().padStart(6, '0')}`;
    if (actEl) {
      actEl.textContent = `AKT 0${this.currentAct} - SEKTOR ${this.currentLevel}`;
    }
    
    if (livesEl) {
      livesEl.innerHTML = "■ ".repeat(Math.max(0, this.lives))
        .split(" ")
        .filter(Boolean)
        .map(() => `<span class="w-3 h-5 bg-[#ff3333] inline-block shadow-[0_0_8px_rgba(255,51,51,0.6)]"></span>`)
        .join("");
    }
  }

  private renderDebugUI = (entityCount: number): void => {
    let panel = document.getElementById("debug-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "debug-panel";
      panel.className = "absolute bottom-16 left-6 bg-black/95 border border-emerald-500/40 p-4 font-mono text-[10px] text-emerald-400 space-y-1 z-50 rounded shadow-2xl pointer-events-none";
      document.body.appendChild(panel);
    }
    panel.innerHTML = `
      <div class="text-emerald-300 font-bold border-b border-emerald-500/20 pb-1 mb-1">HAL 9000 CONTEXT MONITOR</div>
      <div>FREQUENCY PROCESS:  <span class="text-white">${this.fps} FPS</span></div>
      <div>CORE STATE MACHINE: <span class="text-white">${this.state}</span></div>
      <div>ECS ENTITY RANGE:   <span class="text-white">${entityCount}</span></div>
      <div>CHAPTER POSITION:   <span class="text-white">ACT 0${this.currentAct} // SECTOR 0${this.currentLevel}</span></div>
      <div>LAST MEILENSTEIN:   <span class="text-white">ACT 0${this.checkpointAct} // LEVEL 0${this.checkpointLevel}</span></div>
      <div class="text-amber-400 border-t border-emerald-500/20 mt-1 pt-1">TRACE OUT: ${this.lastDebugLog}</div>
    `;
  }

  private renderStargateWarp = (time: number): void => {
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

  // SOTA CORE LOCK: Auch handleEndState schützt sich jetzt rigide als lexikalische Arrow Property!
  private handleEndState = (won: boolean): void => {
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
        desc.textContent = `Vollständiger Hüllenbruch. HAL 9000: "Diese Mission ist zu wichtig für mich, Dave." Wiederaufnahme ab Akt ${this.checkpointAct}.`;
      } else {
        title.textContent = "THE STAR CHILD";
        title.className = "text-3xl md:text-5xl font-black tracking-tighter mb-4 text-[#00ffcc] drop-shadow-[0_0_15px_rgba(0,255,204,0.6)] animate-pulse";
        desc.textContent = "Die Metamorphose ist abgeschlossen. Du hast das Ende der menschlichen Evolution erreicht.";
      }
    }
  }
}