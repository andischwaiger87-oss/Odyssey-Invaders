import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Velocity } from "../components/Velocity";
import { Health } from "../components/Health";

export class ActDirectorSystem implements System {
  private activeAct = 0;
  private activeLevel = 0;
  private warpSurvivalTimer = 15.0;

  update(entities: Entity[], engine: Engine, delta: number): void {
    if (engine.state === "CINEMATIC") return;
    if (engine.state !== "PLAYING") return;

    if (engine.currentAct === 4) {
      engine.warpTimerDisplay = this.warpSurvivalTimer;
    }

    if (this.activeAct !== engine.currentAct || this.activeLevel !== engine.currentLevel) {
      if (this.activeAct === engine.currentAct && engine.currentAct !== 4) {
        this.buildProgressiveWaveLayout(engine);
      } else {
        this.activeAct = engine.currentAct;
        engine.checkpointAct = engine.currentAct;
        engine.checkpointLevel = 1;
        this.executeActTransition(engine);
      }
      this.activeLevel = engine.currentLevel;
      return;
    }

    // AKT IV: PROGRESSIVE SURVIVAL LEVEL-STRUKTUR (SEKTOR 1 BIS 3)
    if (engine.currentAct === 4) {
      this.warpSurvivalTimer -= delta;
      
      // Anomalien stürzen je nach Sektor rascher herab
      const density = engine.currentLevel === 1 ? 0.12 : engine.currentLevel === 2 ? 0.16 : 0.22;
      if (Math.random() < density) this.spawnHordeFormation(engine, 1, "cube");
      if (Math.random() < 0.06) this.spawnHordeFormation(engine, 1, "echo");

      if (this.warpSurvivalTimer <= 0) {
        engine.currentLevel += 1;
        this.warpSurvivalTimer = 15.0; // Reset für den nächsten Sektor

        if (engine.currentLevel > 3) {
          engine.currentAct = 5;
          engine.currentLevel = 1;
          engine.logDebug("STARGATE SURVIVED // LOADING TRANSCENDENT APEX SHIELD");
        } else {
          this.clearSimulationSpace(engine);
          engine.logDebug(`STARGATE DISTORTION INCREASING // ENTERING SECTOR 0${engine.currentLevel}`);
        }
      }
      return;
    }

    // WELLENKONTROLLE FÜR AKTE I, II, III UND V
    const currentInvaders = entities.filter(e => 
      engine.em.hasComponent(e, "Collider") && 
      engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
    );

    if (currentInvaders.length === 0) {
      engine.currentLevel += 1;

      // Jedes reguläre Kapitel besitzt exakt 4 progressive Levels
      if (engine.currentLevel > 4) {
        engine.currentAct += 1;
        engine.currentLevel = 1;
      }

      // INTEGRATION FIX: Sofortige Wellengenerierung zur Verhinderung von Frame-Vakuum
      if (engine.currentAct !== 4) {
        if (this.activeAct !== engine.currentAct) {
          this.activeAct = engine.currentAct;
          engine.checkpointAct = engine.currentAct;
          engine.checkpointLevel = 1;
          this.executeActTransition(engine);
        } else {
          this.buildProgressiveWaveLayout(engine);
        }
        this.activeLevel = engine.currentLevel;
      }
    }
  }

  private buildProgressiveWaveLayout(engine: Engine) {
    this.clearSimulationSpace(engine);
    engine.logDebug(`MATERIALIZING PHALANX: ACT 0${engine.currentAct} // LEVEL 0${engine.currentLevel}`);

    switch (engine.currentAct) {
      case 1:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 1, "cube");
          this.spawnHordeFormation(engine, 1, "predator");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "predator");
        } else if (engine.currentLevel === 4) {
          this.spawnHordeFormation(engine, 2, "cube");
          this.spawnHordeFormation(engine, 2, "predator");
        }
        break;
      case 2:
        if (engine.currentLevel === 2) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 1, "satellite");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 4) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 2, "alien");
        }
        break;
      case 3:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 1, "xfighter");
          this.spawnHordeFormation(engine, 1, "evapod");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "xfighter");
        } else if (engine.currentLevel === 4) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 2, "xfighter");
        }
        break;
      case 5:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 2, "xfighter");
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 3) {
          // AKT V LEVEL 3 RE-AKTIVIERUNG: Matrix-Blöcke + Aliens + furiose Warp-Spiralen im Background!
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 4) {
          // AKT V LEVEL 4: SOTA BOSS Showdown gegen HAL 9000!
          this.spawnHal9000MegaBoss(engine);
        }
        break;
    }
  }

  private executeActTransition(engine: Engine): void {
    this.clearSimulationSpace(engine);

    switch (engine.currentAct) {
      case 1:
        engine.triggerCinematic("AKT I: DIE WIEGE DER MENSCHHEIT", [
          "Urzeitliche Dürre Afrikas. Ein Pechschwarzer Monolith mutiert Zellen.",
          "Weiche den Stammes-Skiffs und wilden Raubtieren aus!",
          "SEKTOR-WELLEN: 01 BIS 04 [I-TASTE FÜR TELEMETRIE]"
        ]);
        this.spawnHordeFormation(engine, 1, "cube");
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER", [
          "Mondoberfläche Krater Tycho. Ein Funke schießt hochfrequent zum Jupiter.",
          "Durchbrich das lunare Abwehrgitter und interstellare Aliens!",
          "SEKTOR-WELLEN: 05 BIS 08"
        ]);
        this.spawnMatrixFormation(engine, 3, "monolith");
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "An Bord der Discovery One. HAL 9000 trennt die Biologie-Systeme.",
          "Säubere HALs Kerne und entkomme den imperialen X-Fightern!",
          "SEKTOR-WELLEN: 09 BIS 12"
        ]);
        this.spawnMatrixFormation(engine, 1, "cube");
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Das Sternen-Tor bricht auf. Zeit und Raum krümmen sich zur Schleife.",
          "ÜBERLEBE DIE DREI INTENSIVEN SURVIVAL-SEKTOREN IN LEVEL 13!",
          "Weiche den Quantentrümmern aus. Keine Gegenwehr möglich."
        ]);
        break;

      case 5:
        engine.triggerCinematic("AKT V: DIE TRANSMUTATION (DAS FINALE)", [
          "Am Nullpunkt des Kosmos formiert sich die absolute Entität.",
          "Zerschlage die Mutationen und rüste dich für den finalen Showdown!",
          "VERNICHTE HAL 9000 IN SEKTOR 4 FÜR DIE ZUFLUCHT!"
        ]);
        this.spawnMatrixFormation(engine, 2, "monolith");
        this.spawnHordeFormation(engine, 1, "alien");
        break;
    }
  }

  private spawnHal9000MegaBoss(engine: Engine) {
    const boss = engine.em.createEntity();
    // Mittig an der Decke platzieren
    engine.em.addComponent(boss, new Position(engine.ctx.canvas.width / 2 - 100, 140));
    engine.em.addComponent(boss, new Renderable("#18181b", 80, "hal9000_boss"));
    engine.em.addComponent(boss, new Collider(200, 80, "INVADER"));
    
    // Boss-Lebenspunkte je nach gewähltem Schwierigkeitsgrad skalieren
    const hp = engine.difficultyMode === "EASY" ? 20 : engine.difficultyMode === "HARDCORE" ? 45 : 30;
    engine.em.addComponent(boss, new Health(hp, hp));
  }

  private clearSimulationSpace(engine: Engine) {
    engine.em.getAllEntities().forEach(e => {
      if (!engine.em.hasComponent(e, "Health")) engine.em.destroyEntity(e);
    });
  }

  private spawnHordeFormation(engine: Engine, rows: number, type: any) {
    const cols = Math.min(8, Math.floor(engine.ctx.canvas.width / 130));
    let color = "#5e4a3f";
    if (type === "predator") color = "#f97316";
    if (type === "satellite") color = "#cbd5e1";
    if (type === "evapod") color = "#eab308";
    if (type === "xfighter") color = "#e11d48";
    if (type === "alien") color = "#a855f7";

    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(150 + i * 120, 160 + r * 60));
        engine.em.addComponent(e, new Renderable(color, 24, type));
        engine.em.addComponent(e, new Collider(24, 24, "INVADER"));
        if (type === "evapod" || type === "xfighter") {
          engine.em.addComponent(e, new Velocity(Math.random() * 120 - 60, 0));
        }
      }
    }
  }

  private spawnMatrixFormation(engine: Engine, rows: number, type: any) {
    const cols = Math.min(8, Math.floor(engine.ctx.canvas.width / 120));
    const color = type === "monolith" ? "#000000" : "#ff3333";
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(140 + col * 115, 130 + row * 75));
        engine.em.addComponent(e, new Renderable(color, 24, type));
        engine.em.addComponent(e, new Collider(24, type === "monolith" ? 54 : 24, "INVADER"));
      }
    }
  }
}