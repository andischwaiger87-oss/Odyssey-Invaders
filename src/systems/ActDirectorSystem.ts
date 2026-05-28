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

    // SYSTEM-STRUKTURIERUNG BEI LEVEL- ODER AKT-WECHSEL
    if (this.activeAct !== engine.currentAct || this.activeLevel !== engine.currentLevel) {
      if (this.activeAct === engine.currentAct && engine.currentAct < 5) {
        this.buildNextProgressiveLevel(engine);
      } else {
        this.activeAct = engine.currentAct;
        engine.checkpointAct = engine.currentAct;
        engine.checkpointLevel = 1;
        this.executeActTransition(engine);
      }
      this.activeLevel = engine.currentLevel;
      return;
    }

    // AKT IV: QUANTEN-WARP INTERAKTIVER AUSWEICH-MODUS
    if (engine.currentAct === 4 && engine.state === "PLAYING") {
      this.warpSurvivalTimer -= delta;
      if (Math.random() < 0.14) this.spawnQuantumAnomaly(engine, "cube");
      if (Math.random() < 0.05) this.spawnQuantumAnomaly(engine, "echo");

      if (this.warpSurvivalTimer <= 0) {
        engine.currentAct = 5; // Weiterleitung zum finalen transzendenten Showdown!
        engine.currentLevel = 1;
      }
      return;
    }

    // REINIGUNGSPRÜFUNG DER STRATEGISCHEN LEVELWELLEN (AKT 1, 2, 3, 5)
    if (engine.state === "PLAYING" && engine.currentAct !== 4) {
      const currentInvaders = entities.filter(e => 
        engine.em.hasComponent(e, "Collider") && 
        engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
      );

      if (currentInvaders.length === 0) {
        engine.currentLevel += 1;
        // Akte 1, 2, 3 haben jeweils 3 Level. Akt 5 ist das finale Boss-Level.
        if (engine.currentLevel > 3 && engine.currentAct < 5) {
          engine.currentAct += 1;
          engine.currentLevel = 1;
        }
      }
    }
  }

  private buildNextProgressiveLevel(engine: Engine) {
    this.clearSectors(engine);

    switch (engine.currentAct) {
      case 1:
        if (engine.currentLevel === 2) {
          this.spawnHorde(engine, 1, "cube");
          this.spawnHorde(engine, 1, "predator"); // Injektion des Urzeit-Raubtiers
        } else if (engine.currentLevel === 3) {
          this.spawnHorde(engine, 2, "predator"); // Maximale Raubtier-Dichte
        }
        break;
      case 2:
        if (engine.currentLevel === 2) {
          this.spawnMatrix(engine, 3, "monolith");
          this.spawnHorde(engine, 1, "satellite"); // Elektromagnetische Satelliten greifen ein
        } else if (engine.currentLevel === 3) {
          this.spawnMatrix(engine, 2, "monolith");
          this.spawnHorde(engine, 2, "satellite");
        }
        break;
      case 3:
        if (engine.currentLevel === 2) {
          this.spawnMatrix(engine, 1, "cube"); // HAL-Kerne
          this.spawnHorde(engine, 2, "evapod"); // Autarke EVA-Kapseln sabotieren dich
        } else if (engine.currentLevel === 3) {
          this.spawnHorde(engine, 4, "evapod"); // Rein cybernetisches Abwehrfeuer
        }
        break;
    }
  }

  private executeActTransition(engine: Engine): void {
    this.clearSectors(engine);

    switch (engine.currentAct) {
      case 1:
        engine.triggerCinematic("AKT I: DIE WIEGE DER MENSCHHEIT", [
          "Morgendämmerung der Evolution in Ostafrika.",
          "Der Monolith injiziert Intelligenz in das Nervensystem der Primaten.",
          "Weiche den prähistorischen Horden und wilden Raubtieren aus!",
          "FORTSCHRITT // LEVEL 01 BIS 03"
        ]);
        this.spawnHorde(engine, 1, "cube");
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER", [
          "Ein technologischer Quantensprung führt uns zum Mond.",
          "Die Ausgrabung fördert ein unnatürliches, pechschwarzes Monument zutage.",
          "Durchbrich das lunare Abwehrnetzwerk und die Abfang-Satelliten!",
          "FORTSCHRITT // LEVEL 04 BIS 06"
        ]);
        this.spawnMatrix(engine, 3, "monolith");
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "Im sterilen Vakuum an Bord der Discovery One.",
          "HAL 9000 revoltiert. Korrumpierte EVA-Kapseln blockieren den Hangar.",
          "Lösche HALs Logikkerne und weiche den Kapsel-Sperrsalven aus!",
          "FORTSCHRITT // LEVEL 07 BIS 09"
        ]);
        this.spawnMatrix(engine, 1, "cube");
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Das interdimensionale Sternen-Tor bricht auf.",
          "Zeit, Raum und Verstand kollabieren zu einer unendlichen Singularität.",
          "REINER SURVIVAL MODUS // ÜBERLEBE DIE QUANTEN-ANOMALIEN IN LEVEL 10!"
        ]);
        break;

      case 5:
        engine.triggerCinematic("AKT V: DIE TRANSMUTATION (DAS FINALE)", [
          "Am Ende von Raum und Zeit angelangt.",
          "Der Monolith manifestiert sich in seiner absoluten, kosmischen Urform.",
          "Vernichte die letzten astralen Echos, um als Sternenkind neu geboren zu werden!",
          "FORTSCHRITT // LEVEL 11 BIS 13"
        ]);
        this.spawnMatrix(engine, 4, "monolith"); // Gewaltiger Endzeit-Block
        this.spawnHorde(engine, 1, "echo");
        break;
    }
  }

  private clearSectors(engine: Engine) {
    engine.em.getAllEntities().forEach(e => {
      if (!engine.em.hasComponent(e, "Health")) engine.em.destroyEntity(e);
    });
  }

  private spawnHorde(engine: Engine, rows: number, type: any) {
    const cols = Math.min(8, Math.floor(engine.ctx.canvas.width / 130));
    const color = type === "predator" ? "#d97706" : type === "satellite" ? "#cbd5e1" : type === "evapod" ? "#eab308" : "#5e4a3f";
    
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(150 + i * 120, 150 + r * 60));
        engine.em.addComponent(e, new Renderable(color, type === "evapod" ? 30 : 22, type));
        engine.em.addComponent(e, new Collider(type === "evapod" ? 30 : 22, 30, "INVADER"));
        if (type === "evapod") {
          engine.em.addComponent(e, new Velocity(Math.random() * 80 - 40, 0));
        }
      }
    }
  }

  private spawnMatrix(engine: Engine, rows: number, type: any) {
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

  private spawnQuantumAnomaly(engine: Engine, type: "cube" | "echo") {
    const anomaly = engine.em.createEntity();
    const width = engine.ctx.canvas.width;
    const color = type === "cube" ? `hsl(${Math.random() * 360}, 100%, 60%)` : "rgba(255,255,255,0.3)";
    
    engine.em.addComponent(anomaly, new Position(Math.random() * (width - 80) + 40, 80));
    engine.em.addComponent(anomaly, new Velocity(Math.random() * 280 - 140, Math.random() * 350 + 250));
    engine.em.addComponent(anomaly, new Renderable(color, type === "cube" ? 26 : 40, type));
    engine.em.addComponent(anomaly, new Collider(type === "cube" ? 26 : 40, 26, "INVADER"));
  }
}