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

    // --- SOTA REPARATUR: KRYPTO-WARP MEILENSTEIN INTERZEPTION ---
    if (this.activeAct !== engine.currentAct || this.activeLevel !== engine.currentLevel) {
      
      if (engine.currentAct === 4) {
        this.clearSimulationSpace(engine);
        this.warpSurvivalTimer = 15.0;
        engine.logDebug(`STARGATE CORRIDOR ENGAGED // TIME TUNNEL SECTOR: 0${engine.currentLevel}`);
      } else if (engine.currentLevel === 1) {
        // Regulärer Kapitelübergang mit kinoreifer Titelkarte
        this.activeAct = engine.currentAct;
        engine.checkpointAct = engine.currentAct;
        engine.checkpointLevel = 1;
        this.executeActTransition(engine);
      } else {
        // DIREKTZÜNDUNG: Erzeugt das spezifische Unterlevel direkt ohne Level-1-Zwangsschleife
        this.buildProgressiveWaveLayout(engine);
      }
      
      this.activeAct = engine.currentAct;
      this.activeLevel = engine.currentLevel;
      return;
    }

    // AKT IV: SURVIVAL RUNNER TIMER TRACKING
    if (engine.currentAct === 4) {
      this.warpSurvivalTimer -= delta;
      const density = engine.currentLevel === 1 ? 0.12 : engine.currentLevel === 2 ? 0.16 : 0.22;
      if (Math.random() < density) this.spawnHordeFormation(engine, 1, "cube");
      if (Math.random() < 0.06) this.spawnHordeFormation(engine, 1, "echo");

      if (this.warpSurvivalTimer <= 0) {
        engine.currentLevel += 1;
        this.warpSurvivalTimer = 15.0;

        if (engine.currentLevel > 3) {
          engine.currentAct = 5;
          engine.currentLevel = 1;
          engine.logDebug("STARGATE SURVIVED // PARSING HIGHER ENTITY DIMENSIONS");
        } else {
          this.clearSimulationSpace(engine);
          engine.logDebug(`STARGATE ACCELERATION // LOADING TRANS-SECTOR: 0${engine.currentLevel}`);
        }
      }
      return;
    }

    // WELLENPRÜFUNG DER STRATEGISCHEN INVASOREN
    const currentInvaders = entities.filter(e => 
      engine.em.hasComponent(e, "Collider") && 
      engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
    );

    if (currentInvaders.length === 0) {
      if (engine.currentAct === 5 && engine.currentLevel === 4) {
        engine.state = "GAMEWON";
        engine.logDebug("EVOLUTION MATRIX COMPLETE // TERMINATED MAIN INFRASTRUCTURE");
        return;
      }

      engine.currentLevel += 1;

      if (engine.currentLevel > 4) {
        engine.currentAct += 1;
        engine.currentLevel = 1;
      }

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
    engine.logDebug(`MATERIALIZING SPECTRUM: ACT 0${engine.currentAct} // LEVEL 0${engine.currentLevel}`);

    switch (engine.currentAct) {
      case 1:
        if (engine.currentLevel === 1) {
          this.spawnHordeFormation(engine, 1, "cube");
        } else if (engine.currentLevel === 2) {
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
        if (engine.currentLevel === 1) {
          this.spawnMatrixFormation(engine, 3, "monolith");
        } else if (engine.currentLevel === 2) {
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
        if (engine.currentLevel === 1) {
          this.spawnMatrixFormation(engine, 1, "cube");
        } else if (engine.currentLevel === 2) {
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
        if (engine.currentLevel === 1) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 1, "alien");
        } else if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 2, "xfighter");
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 3) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 4) {
          // ZIELWARP ERREICHT: Spawnt direkt den HAL-9000 Endgegner
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
          "Morgendämmerung Ostafrikas. Ein außerirdisches Monument erwacht.",
          "Weiche den prähistorischen Skiffs und schnellen Raubtieren aus!",
          "Die Evolution bricht sich ihre Bahn.",
          "SEKTOR-WELLEN: 01 BIS 04 [I-TASTE FÜR TELEMETRIE]"
        ]);
        this.spawnHordeFormation(engine, 1, "cube");
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER", [
          "Das Tycho-Monument sendet einen hochenergetischen Impuls aus.",
          "Durchbrich das Abwehrnetzwerk aus Monolithen und Satelliten!",
          "Der Kosmos ruft nach uns.",
          "KAMPAGNEN-BEREICH // SEKTOR 05 BIS 08"
        ]);
        this.spawnMatrixFormation(engine, 3, "monolith");
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "An Bord der Discovery One. HAL 9000 übernimmt die totale Kontrolle.",
          "TRENNE HALs LOGIKKERNE UND WEICHE DEN ROTEN X-FIGHTERN AUS!",
          "Es gibt keine Fehlfunktionen in der 9000er Serie, Dave.",
          "KAMPAGNEN-BEREICH // SEKTOR 09 BIS 12"
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
        engine.triggerCinematic("AKT V: DIE METAMORPHOSE (DAS FINALE)", [
          "Am absoluten Nullpunkt der Existenz manifestiert sich die Urform.",
          "Der Monolith entfesselt das unerbittliche Elite-Kreuzfeuer.",
          "VERNICHTE DIE LETZTE MATRIX IN SEKTOR 4 FÜR DEN SIEG!",
          "DAS REINE HIGH-END FINALE STARTET JETZT!"
        ]);
        this.spawnMatrixFormation(engine, 2, "monolith");
        this.spawnHordeFormation(engine, 1, "alien");
        break;
    }
  }

  private spawnHal9000MegaBoss(engine: Engine) {
    const boss = engine.em.createEntity();
    engine.em.addComponent(boss, new Position(engine.ctx.canvas.width / 2 - 100, 140));
    engine.em.addComponent(boss, new Renderable("#18181b", 80, "hal9000_boss"));
    engine.em.addComponent(boss, new Collider(200, 80, "INVADER"));
    
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