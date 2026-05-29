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
    if (engine.state !== "PLAYING" && engine.state !== "CINEMATIC") return;

    // AKT- ODER LEVELPROGRESSION DETEKTIEREN
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

    // AKT IV: SURVIVAL MULTIDIMENSIONALER WARP (LVL 10)
    if (engine.currentAct === 4 && engine.state === "PLAYING") {
      this.warpSurvivalTimer -= delta;
      if (Math.random() < 0.12) this.spawnHordeFormation(engine, 1, "cube");
      if (Math.random() < 0.06) this.spawnHordeFormation(engine, 1, "echo");

      if (this.warpSurvivalTimer <= 0) {
        engine.currentAct = 5; // Weiterleitung zum finalen transzendenten Akt!
        engine.currentLevel = 1;
      }
      return;
    }

    // ÜBERPRÜFUNG DER ZERSTÖRTEN PHALANX
    if (engine.state === "PLAYING" && engine.currentAct !== 4) {
      const currentInvaders = entities.filter(e => 
        engine.em.hasComponent(e, "Collider") && 
        engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
      );

      if (currentInvaders.length === 0) {
        engine.currentLevel += 1;
        
        // Jeder reguläre Angriffsakt hat exakt 3 Unter-Levels
        if (engine.currentLevel > 3 && engine.currentAct !== 5) {
          engine.currentAct += 1;
          engine.currentLevel = 1;
        }
      }
    }
  }

  private buildProgressiveWaveLayout(engine: Engine) {
    this.clearSimulationSpace(engine);
    engine.logDebug(`LOADING SIMULATION SECTOR: ACT ${engine.currentAct} // LEVEL ${engine.currentLevel}`);

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
          // INTERVALL: Einschleusen der feindlichen Alien-Monster im Mondkrater!
          this.spawnHordeFormation(engine, 2, "alien");
        }
        break;
      case 3:
        if (engine.currentLevel === 2) {
          this.spawnHordeFormation(engine, 1, "xfighter"); // Injektion der Raumfahrt-Sternenjäger
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
          this.spawnHordeFormation(engine, 2, "xfighter");
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
          "Morgendämmerung Ostafrikas. Intelligenz erwacht im Leerraum.",
          "Säubere die prähistorischen Horden und wilden Raubtiere.",
          "SEKTOR-STRUKTUR: LEVEL 01 BIS 03"
        ]);
        this.spawnHordeFormation(engine, 1, "cube");
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER", [
          "Das Tycho-Monument sendet einen hochenergetischen Impuls aus.",
          "Durchbrich die monolithischen Verbände und Mond-Satelliten.",
          "SEKTOR-STRUKTUR: LEVEL 04 BIS 06"
        ]);
        this.spawnMatrixFormation(engine, 3, "monolith");
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "An Bord der Discovery One. HAL 9000 wehrt sich gegen den Zugriff.",
          "Weiche den Sternenjägern (X-Fighter) und Wartungskapseln aus!",
          "SEKTOR-STRUKTUR: LEVEL 07 BIS 09"
        ]);
        this.spawnMatrixFormation(engine, 1, "cube");
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Licht bricht. Zeit mutiert. Die unendliche Singularität öffnet sich.",
          "REINER AUSWEICH-Runner // ÜBERLEBE DAS STERNENTOR IN LEVEL 10!"
        ]);
        break;

      case 5:
        engine.triggerCinematic("AKT V: DIE METAMORPHOSE (FINALE)", [
          "Das Ende aller biologischen und digitalen Existenz.",
          "Vernichte das interdimensionale Alien-Netzwerk im Kosmos.",
          "SEKTOR-STRUKTUR: LEVEL 11 BIS 13 — DAS FINALE"
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
    if (type === "xfighter") color = "#e11d48"; // Ikonisches Imperium-Rot
    if (type === "alien") color = "#a855f7";    // Kosmisches Plasma-Lila

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