import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Collider, FactionType } from "../components/Collider";
import { Health } from "../components/Health";
import { Velocity } from "../components/Velocity";
import { Renderable } from "../components/Renderable";
import { Modifier } from "../components/Modifier";
import { ParticleSystem } from "./ParticleSystem";
import { sfx } from "../core/AudioEngine";

export class CollisionSystem implements System {
  update(entities: Entity[], engine: Engine): void {
    // Filtere alle Entitäten, die sowohl eine Position als auch eine Hitbox besitzen
    const collidables = entities.filter(e => 
      engine.em.hasComponent(e, "Position") && engine.em.hasComponent(e, "Collider")
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const e1 = collidables[i];
        const e2 = collidables[j];

        // SOTA Sicherheits-Check: Falls eine Entität in diesem Frame bereits 
        // durch eine vorherige Kollision zerstört wurde, überspringen.
        if (!engine.em.hasComponent(e1, "Collider") || !engine.em.hasComponent(e2, "Collider")) {
          continue;
        }

        const pos1 = engine.em.getComponent<Position>(e1, "Position")!;
        const col1 = engine.em.getComponent<Collider>(e1, "Collider")!;
        
        const pos2 = engine.em.getComponent<Position>(e2, "Position")!;
        const col2 = engine.em.getComponent<Collider>(e2, "Collider")!;

        // AABB (Axis-Aligned Bounding Box) Überlappungs-Erkennung
        if (
          pos1.x < pos2.x + col2.width &&
          pos1.x + col1.width > pos2.x &&
          pos1.y < pos2.y + col2.height &&
          pos1.y + col1.height > pos2.y
        ) {
          this.handleCollision(engine, e1, col1.faction, e2, col2.faction);
        }
      }
    }
  }

  private handleCollision(engine: Engine, e1: Entity, f1: FactionType, e2: Entity, f2: FactionType) {
    
    // AKT I, II, III: Spieler-Laser trifft einen Monolithen / Invader
    if ((f1 === "PLAYER_LASER" && f2 === "INVADER") || (f2 === "PLAYER_LASER" && f1 === "INVADER")) {
      const invaderEntity = f1 === "INVADER" ? e1 : e2;
      const pos = engine.em.getComponent<Position>(invaderEntity)!;
      
      // JUICE: Bildschirm vibrieren lassen (Kurzer, knackiger Impact)
      engine.triggerScreenShake(0.2, 12);

      // Partikel-Explosion triggern & Audio prozedural berechnen
      ParticleSystem.spawnExplosion(engine, pos.x + 12, pos.y + 25, "#ff3333", 25);
      sfx.playExplosion(true);

      // Zufallschance (15%) für ein technologisches Upgrade-Drop
      if (Math.random() < 0.15) {
        this.dropPowerUp(engine, pos.x, pos.y);
      }

      engine.em.destroyEntity(e1);
      engine.em.destroyEntity(e2);
      engine.score += 100;
      return;
    }

    // AKT III: HAL-9000 Sabotage-Laser trifft die Discovery One (Spieler)
    if ((f1 === "INVADER_LASER" && f2 === "PLAYER") || (f2 === "INVADER_LASER" && f1 === "PLAYER")) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const laserEntity = f1 === "PLAYER" ? e2 : e1;
      const pos = engine.em.getComponent<Position>(playerEntity)!;

      // JUICE: Massiverer Screen-Shake bei erlittenem Schaden für maximales haptisches Feedback
      engine.triggerScreenShake(0.4, 25);

      // SOTA KINEMATOGRAPHY: Roten Schadensblitz über das DOM-Overlay triggern
      const flashEl = document.getElementById("damage-flash");
      if (flashEl) {
        flashEl.classList.remove("flash-active");
        void flashEl.offsetWidth; // Trick: Erzwingt einen synchronen DOM-Reflow, um die CSS-Animation sofort neu zu starten
        flashEl.classList.add("flash-active");
      }

      // Weiße Funken-Explosion am Schild des Spielers
      ParticleSystem.spawnExplosion(engine, pos.x + 20, pos.y + 20, "#ffffff", 40);
      sfx.playExplosion(false);
      
      engine.em.destroyEntity(laserEntity);
      
      const health = engine.em.getComponent<Health>(playerEntity, "Health")!;
      health.current -= 1;
      engine.lives = health.current;

      // Game-Over Zustand einleiten bei 0 Structural Integrity
      if (health.current <= 0) {
        engine.gameOver = true;
      }
      return;
    }

    // EXTRA FEATURE: Spieler kollidiert mit einem herabfallenden Power-Up
    if ((f1 === "PLAYER" && f2 === "POWERUP") || (f2 === "PLAYER" && f1 === "POWERUP")) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const powerUpEntity = f1 === "PLAYER" ? e2 : e1;

      // JUICE: Ein kleiner, feiner Impuls beim Einsammeln eines Upgrades
      engine.triggerScreenShake(0.1, 5);

      // Injiziere dem Spieler den Waffenmodifikator (Tri-Beam Modus für 5 Sekunden)
      engine.em.addComponent(playerEntity, new Modifier("TRI_BEAM", 5.0));
      engine.em.destroyEntity(powerUpEntity);
      engine.score += 500;
      return;
    }
  }

  // Hilfsmethode zur Erzeugung eines fallenden Modifikators im dreidimensionalen Raum
  private dropPowerUp(engine: Engine, x: number, y: number) {
    const powerUp = engine.em.createEntity();
    engine.em.addComponent(powerUp, new Position(x, y));
    engine.em.addComponent(powerUp, new Velocity(0, 150)); // Fällt sanft nach unten
    engine.em.addComponent(powerUp, new Renderable("#00ffcc", 15, "cube"));
    engine.em.addComponent(powerUp, new Collider(15, 15, "POWERUP"));
  }
}