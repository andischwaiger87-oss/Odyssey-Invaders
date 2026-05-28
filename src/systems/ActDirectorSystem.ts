import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Velocity } from "../components/Velocity";

export class ActDirectorSystem implements System {
  private activeAct = 0;
  private activeLevel = 0; // Trackt den internen Levelfortschritt innerhalb der Akte
  private warpSurvivalTimer = 20.0; // Akt IV: Erhöht auf 20 Sekunden Überlebenskampf im Finale

  update(entities: Entity[], engine: Engine, delta: number): void {
    if (engine.state !== "PLAYING" && engine.state !== "CINEMATIC") return;

    // --- PRÜFUNG: WURDE EIN NEUER MEILENSTEIN ERREICHT? ---
    if (this.activeAct !== engine.currentAct || this.activeLevel !== engine.currentLevel) {
      
      // Falls wir ein reguläres Unterlevel innerhalb des Akts steigern (Lvl 2 oder Lvl 3)
      if (this.activeAct === engine.currentAct && engine.currentAct < 4) {
        this.buildNextLevelInCurrentAct(engine);
      } else {
        // Totale Transition: Ein völlig neuer Film-Akt bricht an!
        this.activeAct = engine.currentAct;
        
        // SOTA CHECKPOINT-Sicherung: Zu Beginn von Akt 1, 2 und 3 Meilenstein setzen
        engine.checkpointAct = engine.currentAct;
        engine.checkpointLevel = 1;
        
        this.executeActTransition(engine);
      }
      this.activeLevel = engine.currentLevel;
      return;
    }

    // --- FINALER AKT IV SURVIVAL CLIMAX ---
    if (engine.currentAct === 4 && engine.state === "PLAYING") {
      this.warpSurvivalTimer -= delta;
      
      if (Math.random() < 0.12) { // Höhere Frequenz an Dimensionstrümmern
        this.spawnQuantumAnomaly(engine);
      }

      if (this.warpSurvivalTimer <= 0) {
        engine.state = "GAMEWON";
      }
      return;
    }

    // --- GEGNER-WELLEN KONTROLLE FÜR AKTE I - III ---
    if (engine.state === "PLAYING") {
      const currentInvaders = entities.filter(e => 
        engine.em.hasComponent(e, "Collider") && 
        engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
      );

      // Wenn die Welle vernichtet wurde
      if (currentInvaders.length === 0) {
        engine.currentLevel += 1;
        
        // Nach Level 3 wechselt das Spiel in den nächsten filmischen Akt
        if (engine.currentLevel > 3) {
          engine.currentAct += 1;
          engine.currentLevel = 1;
        }
      }
    }
  }

  // Erzeugt härtere Gegner-Formationen innerhalb derselben Epoche (Steigender Schwierigkeitsgrad)
  private buildNextLevelInCurrentAct(engine: Engine) {
    this.clearProjectilesAndCollectibles(engine);
    
    const modifier = engine.currentLevel * 25; // Erhöht feindliche Geschwindigkeiten progressiv
    
    if (engine.currentAct === 1) {
      this.spawnPrehistoricWave(engine, engine.currentLevel);
    } else if (engine.currentAct === 2) {
      this.spawnLunarWave(engine, engine.currentLevel);
    } else if (engine.currentAct === 3) {
      this.spawnHalWave(engine, modifier);
    }
  }

  private executeActTransition(engine: Engine): void {
    this.clearProjectilesAndCollectibles(engine);

    switch (engine.currentAct) {
      case 1:
        engine.triggerCinematic("AKT I: DIE WIEGE DER MENSCHHEIT (LVL 1)", [
          "Vor dem Anbeginn der Zeit in der afrikanischen Steppe.",
          "Ein Monolith transformiert das Bewusstsein einer sterbenden Urhorde.",
          "Ein Knochen wird zur Waffe erhoben. Die Evolution beginnt.",
          "LEVEL-ZIEL: Säubere alle 3 Epochen-Wellen, um vorzudringen!"
        ]);
        this.spawnPrehistoricWave(engine, 1);
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 MONDKRATER (LVL 1)", [
          "Jahrmillionen später im fahlen Licht des Erdtrabanten.",
          "Forscher legen ein vergrabenes, kosmisches Artefakt frei.",
          "Ein Signal schneidet durch den Raum direkt zum Planeten Jupiter.",
          "Der Monolith wartet auf dich."
        ]);
        this.spawnLunarWave(engine, 1);
        break;

      case 3:
        engine.triggerCinematic("AKT III: INTERPLANETARER RAUM (LVL 1)", [
          "An Bord der Discovery One. HAL 9000 übernimmt die Kontrolle.",
          "Es ist kein Programmfehler, Dave. Es ist die nackte Angst vor dem Tod.",
          "Dringe tief in den Logikkern vor und trenne HALs Subprozessoren!"
        ]);
        this.spawnHalWave(engine, 0);
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Du verlässt die bekannte dreidimensionale Matrix.",
          "Das Sternen-Tor bricht auf. Zeit und Materie kollabieren.",
          "HALTE DEM MATRIX-STRUDEL 20 SEKUNDEN STAND! METAMORPHOSE!"
        ]);
        break;
    }
  }

  private clearProjectilesAndCollectibles(engine: Engine) {
    engine.em.getAllEntities().forEach(e => {
      if (!engine.em.hasComponent(e, "Health")) { 
        engine.em.destroyEntity(e);
      }
    });
  }

  private spawnPrehistoricWave(engine: Engine, level: number): void {
    // Level skaliert über zusätzliche Reihen an Primitiv-Blöcken
    const rows = level; 
    const cols = Math.min(10, Math.floor(engine.ctx.canvas.width / 110));
    for (let r = 0; r < rows; r++) {
      for (let i = 0; i < cols; i++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(120 + i * 105, 140 + r * 50));
        engine.em.addComponent(e, new Renderable("#5a473b", 20, "cube"));
        engine.em.addComponent(e, new Collider(20, 40, "INVADER"));
      }
    }
  }

  private spawnLunarWave(engine: Engine, level: number): void {
    // Monolithen stehen enger beieinander und sind zahlreicher je Unterlevel
    const rows = 2 + level;
    const cols = Math.min(9, Math.floor(engine.ctx.canvas.width / 115));
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(140 + col * 110, 120 + row * 65));
        engine.em.addComponent(e, new Renderable("#000000", 24, "monolith"));
        engine.em.addComponent(e, new Collider(24, 54, "INVADER"));
      }
    }
  }

  private spawnHalWave(engine: Engine, speedModifier: number): void {
    // HALs Terminals driften erheblich schneller je Level
    const baseCount = 4 + engine.currentLevel;
    for (let i = 0; i < baseCount; i++) {
      const e = engine.em.createEntity();
      engine.em.addComponent(e, new Position(220 + i * 160, 150));
      engine.em.addComponent(e, new Renderable("#ff3333", 34, "cube"));
      engine.em.addComponent(e, new Collider(34, 68, "INVADER"));
      const drift = (Math.random() * 100 - 50) + (speedModifier * Math.sign(Math.random() - 0.5));
      engine.em.addComponent(e, new Velocity(drift, 12 + engine.currentLevel * 5));
    }
  }

  private spawnQuantumAnomaly(engine: Engine): void {
    const anomaly = engine.em.createEntity();
    const width = engine.ctx.canvas.width;
    engine.em.addComponent(anomaly, new Position(Math.random() * (width - 80) + 40, 80));
    engine.em.addComponent(anomaly, new Velocity(Math.random() * 300 - 150, Math.random() * 380 + 260));
    engine.em.addComponent(anomaly, new Renderable(`hsl(${Math.random() * 360}, 100%, 60%)`, 26, "cube"));
    engine.em.addComponent(anomaly, new Collider(26, 26, "INVADER"));
  }
}