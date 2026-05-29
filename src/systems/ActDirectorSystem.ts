import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Velocity } from "../components/Velocity";

export class ActDirectorSystem implements System {
  private activeAct = 0;
  private activeLevel = 0;
  private warpSurvivalTimer = 20.0;

  update(entities: Entity[], engine: Engine, delta: number): void {
    // SOTA ARCHITEKTUR-REPARATUR: Während einer Cinematic-Titelkarte pausiert die Zuweisungslogik vollständig!
    if (engine.state === "CINEMATIC") return;

    if (engine.state !== "PLAYING") return;

    // TRANSFER-LOGIK BEI EINEM SEKTOR- MEILENSTEIN-WECHSEL
    if (this.activeAct !== engine.currentAct || this.activeLevel !== engine.currentLevel) {
      if (this.activeAct === engine.currentAct && engine.currentAct !== 4 && engine.currentAct !== 5) {
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

    // AKT IV: QUANTEN-WARP INTERAKTIVER AUSWEICH-RUNNER (LVL 10)
    if (engine.currentAct === 4) {
      this.warpSurvivalTimer -= delta;
      if (Math.random() < 0.12) this.spawnHordeFormation(engine, 1, "cube");
      if (Math.random() < 0.06) this.spawnHordeFormation(engine, 1, "echo");

      if (this.warpSurvivalTimer <= 0) {
        engine.currentAct = 5;
        engine.currentLevel = 1;
      }
      return;
    }

    // --- REINIGUNGSPRÜFUNG DER BESTEHENDEN GEGNER-PHALANX ---
    const currentInvaders = entities.filter(e => 
      engine.em.hasComponent(e, "Collider") && 
      engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
    );

    if (currentInvaders.length === 0) {
      // SOTA FIX FÜR AKT V: Beendet das Spiel sauber bei Level 3 im letzten Akt
      if (engine.currentAct === 5 && engine.currentLevel >= 3) {
        engine.state = "GAMEWON";
        engine.logDebug("TRANSYNC COMPLETE // THE STAR CHILD EMBARKS BEYOND");
        return;
      }

      engine.currentLevel += 1;

      // Reguläre Kapitel besitzen exakt 3 Sektoren
      if (engine.currentLevel > 3 && engine.currentAct !== 5) {
        engine.currentAct += 1;
        engine.currentLevel = 1;
      }
    }
  }

  private buildProgressiveWaveLayout(engine: Engine) {
    this.clearSimulationSpace(engine);
    engine.logDebug(`GENERATING ALIEN COORDINATES: ACT ${engine.currentAct} // SECTOR ${engine.currentLevel}`);

    switch (engine.currentAct) {
      case 1:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 1, "cube");
          this.spawnHordeFormation(engine, 1, "predator");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "predator");
        }
        break;
      case 2:
        if (engine.currentLevel === 2) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 1, "satellite");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "alien"); // Einbindung der Plasma-Aliens
        }
        break;
      case 3:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 1, "xfighter"); // Einbindung der roten Sternenjäger
          this.spawnHordeFormation(engine, 1, "evapod");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 2, "xfighter");
          this.spawnMatrixFormation(engine, 1, "cube");
        }
        break;
      case 5:
        if (engine.currentLevel === 2) {
          this.spawnMatrixFormation(engine, 2, "monolith");
          this.spawnHordeFormation(engine, 2, "alien");
        } else if (engine.currentLevel === 3) {
          this.spawnHordeFormation(engine, 1, "xfighter");
          this.spawnHordeFormation(engine, 2, "alien");
        }
        break;
    }
  }

  private executeActTransition(engine: Engine): void {
    this.clearSimulationSpace(engine);

    switch (engine.currentAct) {
      case 1:
        engine.triggerCinematic("AKT I: DIE WIEGE DER MENSCHHEIT", [
          "Inmitten der afrikanischen Dürre erwacht das Primitiv-Bewusstsein.",
          "Ein außerirdisches Monument manipuliert die Gehirnströme der Horde.",
          "Weiche den prähistorischen Horden und wilden Raubtieren aus!",
          "SEKTOR-WELLEN: 01 BIS 03 [I-TASTE FÜR TELEMETRIE]"
        ]);
        this.spawnHordeFormation(engine, 1, "cube");
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER", [
          "Ein technologischer Sprung führt die Spezies zum Mond.",
          "Die Ausgrabung fördert eine unnatürlich vergrabene Anomalie zutage.",
          "Durchbrich das lunare Abwehrgitter und die Plasma-Aliens!",
          "SEKTOR-WELLEN: 04 BIS 06"
        ]);
        this.spawnMatrixFormation(engine, 3, "monolith");
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "Im sterilen Vakuum an Bord der Discovery One.",
          "HAL 9000 revoltiert. Korrumpierte Sternenjäger blockieren das Schiff.",
          "Trennne HALs Logikkerne und weiche den X-Fightern aus!",
          "SEKTOR-WELLEN: 07 BIS 09"
        ]);
        this.spawnMatrixFormation(engine, 1, "cube");
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Das interdimensionale Sternen-Tor bricht auf.",
          "Licht mutiert. Die unendliche Singularität reißt dich mit.",
          "REINER AUSWEICH-RUNNER // ÜBERLEBE DAS STERNENTOR IN LEVEL 10!"
        ]);
        break;

      case 5:
        engine.triggerCinematic("AKT V: DIE METAMORPHOSE (DAS FINALE)", [
          "Das Ende aller bekannten biologischen und digitalen Existenz.",
          "Der Monolith manifestiert sich in seiner unendlichen Urform.",
          "Zerschlage die letzte Phalanx, um das Sternenkind zu gebären!",
          "SEKTOR-WELLEN: 11 BIS 13 — ENDSPIEL"
        ]);
        this.spawnMatrixFormation(engine, 3, "monolith");
        this.spawnHordeFormation(engine, 1, "alien");
        break;
    }
  }

  private clearSimulationSpace(engine: Engine) {
    engine.em.getAllEntities().forEach(e => {
      if (!engine.em.hasComponent(e, "Health")) engine.em.destroyEntity(e);
    });
  }

  private spawnHordeFormation(engine: Engine, rows: number, type: any) {
    const cols = Math.min(8, Math.floor(engine.ctx.canvas.width / 130));
    let color = "#5e4a3f";
    if (type === "predator") color = "#d97706";
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
          engine.em.addComponent(e, new Velocity(Math.random() * 100 - 50, 0));
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