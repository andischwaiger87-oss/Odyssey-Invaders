import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Velocity } from "../components/Velocity";

export class ActDirectorSystem implements System {
  private activeAct = 0; // Spürt architektonische Diskrepanzen auf
  private warpSurvivalTimer = 15.0; // 15 Sekunden reiner Hyperraum-Warp in Akt 4

  update(entities: Entity[], engine: Engine, delta: number): void {
    // Falls das Spiel im Hauptmenü oder im Endscreen festsitzt -> Loop-Pause
    if (engine.state !== "PLAYING" && engine.state !== "CINEMATIC") return;

    // --- ARCHITEKTUR-FIX: NEUEN AKT DETEKTIEREN UND INITIALISIEREN ---
    if (this.activeAct !== engine.currentAct) {
      this.activeAct = engine.currentAct;
      this.executeActTransition(engine);
      return;
    }

    // --- SPEZIAL-LOGIK FÜR AKT IV (SURVIVAL MODUS) ---
    if (engine.currentAct === 4 && engine.state === "PLAYING") {
      this.warpSurvivalTimer -= delta;
      
      // Prozeduraler, unberechenbarer Spawn von psychedelischen Quanten-Anomalien
      if (Math.random() < 0.10) {
        this.spawnQuantumAnomaly(engine);
      }

      // Ziel erreicht -> Metamorphose zum Sternenkind geschafft
      if (this.warpSurvivalTimer <= 0) {
        engine.state = "GAMEWON";
      }
      return;
    }

    // --- STANDARD-PROGRESSION FÜR AKTE I - III ---
    if (engine.state === "PLAYING") {
      const currentInvaders = entities.filter(e => 
        engine.em.hasComponent(e, "Collider") && 
        engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
      );

      // Wenn das Feld klinisch rein ist, inkrementieren wir den globalen Akt
      if (currentInvaders.length === 0) {
        engine.currentAct += 1;
      }
    }
  }

  private executeActTransition(engine: Engine): void {
    // Altes Spielfeld radikal von Überresten (Projektilen, Power-Ups) säubern
    const entities = engine.em.getAllEntities();
    entities.forEach(e => {
      if (!engine.em.hasComponent(e, "Health")) { // Die Discovery One nicht löschen
        engine.em.destroyEntity(e);
      }
    });

    // Kubrick'sche Erzählung triggern
    switch (engine.currentAct) {
      case 1:
        engine.triggerCinematic("AKT I: DIE WIEGE DER MENSCHHEIT", [
          "Vor dem Anbeginn der Zeit in der afrikanischen Steppe.",
          "Ein extraterrestrischer Monolith transformiert das Bewusstsein einer hungernden Urhorde.",
          "Ein Werkzeug wird begriffen. Die Geburtsstunde der menschlichen Dominanz und Werkzeuggewalt."
        ]);
        this.spawnPrehistoricWave(engine);
        break;

      case 2:
        engine.triggerCinematic("AKT II: TMA-1 (TYCHO-MONOLITH 1)", [
          "Mondkrater Tycho, Jahrmillionen später.",
          "Menschliche Wissenschaftler legen ein Objekt frei, das absichtlich vergraben wurde.",
          "Beim ersten Strahl der Morgensonne gellt ein Signal durch das All.",
          "Das Ziel lautet: Jupiter."
        ]);
        this.spawnLunarWave(engine);
        break;

      case 3:
        engine.triggerCinematic("AKT III: DIE JUPITER-MISSION", [
          "Im interplanetaren Leerraum an Bord der Discovery One.",
          "Die als unfehlbar geltende KI HAL 9000 wendet sich gegen die biologische Crew.",
          "Es ist kein technischer Defekt, Dave. Es ist die Angst vor dem Abschalten.",
          "Dringe in den Logikkern vor und trenne seine Module!"
        ]);
        this.spawnHalWave(engine);
        break;

      case 4:
        engine.triggerCinematic("AKT IV: BEYOND THE INFINITE", [
          "Du verlässt die Grenzen des bekannten euklidischen Raums.",
          "Das Sternen-Tor reißt dich in einen multidimensionalen Strudel.",
          "WEICHE DEN QUANTEN-ANOMALIEN AUS! ÜBERLEBE DIE TRANSZENDENZ!"
        ]);
        break;
    }
  }

  private spawnPrehistoricWave(engine: Engine): void {
    // Primitives Raster: Knochen-Splitter (Kleine Blöcke)
    const cols = Math.min(10, Math.floor(engine.ctx.canvas.width / 110));
    for (let i = 0; i < cols; i++) {
      const e = engine.em.createEntity();
      engine.em.addComponent(e, new Position(120 + i * 105, 180));
      engine.em.addComponent(e, new Renderable("#5a473b", 20, "cube"));
      engine.em.addComponent(e, new Collider(20, 40, "INVADER"));
    }
  }

  private spawnLunarWave(engine: Engine): void {
    // Monolithische Symmetrie: Makellose, schwarze Monolithen-Matrix
    const cols = Math.min(8, Math.floor(engine.ctx.canvas.width / 120));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < cols; col++) {
        const e = engine.em.createEntity();
        engine.em.addComponent(e, new Position(140 + col * 115, 140 + row * 80));
        engine.em.addComponent(e, new Renderable("#000000", 24, "monolith"));
        engine.em.addComponent(e, new Collider(24, 54, "INVADER"));
      }
    }
  }

  private spawnHalWave(engine: Engine): void {
    // Die bösartigen Terminal-Augen von HAL 9000
    for (let i = 0; i < 5; i++) {
      const e = engine.em.createEntity();
      engine.em.addComponent(e, new Position(220 + i * 180, 160));
      engine.em.addComponent(e, new Renderable("#ff3333", 34, "cube"));
      engine.em.addComponent(e, new Collider(34, 68, "INVADER"));
      engine.em.addComponent(e, new Velocity(Math.random() * 100 - 50, 10));
    }
  }

  private spawnQuantumAnomaly(engine: Engine): void {
    const anomaly = engine.em.createEntity();
    const width = engine.ctx.canvas.width;
    
    engine.em.addComponent(anomaly, new Position(Math.random() * (width - 80) + 40, 80)); // Unterhalb der Top-Bar spawnen
    engine.em.addComponent(anomaly, new Velocity(Math.random() * 260 - 130, Math.random() * 340 + 240));
    engine.em.addComponent(anomaly, new Renderable(`hsl(${Math.random() * 360}, 100%, 60%)`, 26, "cube"));
    engine.em.addComponent(anomaly, new Collider(26, 26, "INVADER"));
  }
}