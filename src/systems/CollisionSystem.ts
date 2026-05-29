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
  update(entities: Entity[], engine: Engine, delta: number): void {
    // I-Frame Timer für alle Entitäten mit Lebenskomponente runtertackern
    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Health")) {
        const health = engine.em.getComponent<Health>(entity, "Health")!;
        if (health.invulnerableTimer > 0) {
          health.invulnerableTimer -= delta;
        }
      }
    }

    const collidables = entities.filter(e => 
      engine.em.hasComponent(e, "Position") && engine.em.hasComponent(e, "Collider")
    );

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const e1 = collidables[i];
        const e2 = collidables[j];

        if (!engine.em.hasComponent(e1, "Collider") || !engine.em.hasComponent(e2, "Collider")) {
          continue;
        }

        const pos1 = engine.em.getComponent<Position>(e1, "Position")!;
        const col1 = engine.em.getComponent<Collider>(e1, "Collider")!;
        
        const pos2 = engine.em.getComponent<Position>(e2, "Position")!;
        const col2 = engine.em.getComponent<Collider>(e2, "Collider")!;

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
    
    // Spieler-Laser trifft Invasor
    if ((f1 === "PLAYER_LASER" && f2 === "INVADER") || (f2 === "PLAYER_LASER" && f1 === "INVADER")) {
      const invaderEntity = f1 === "INVADER" ? e1 : e2;
      const laserEntity = f1 === "PLAYER_LASER" ? e1 : e2;
      
      const pos = engine.em.getComponent<Position>(invaderEntity, "Position")!;
      const render = engine.em.getComponent<Renderable>(invaderEntity, "Renderable")!;
      
      engine.triggerScreenShake(0.15, 10);
      ParticleSystem.spawnExplosion(engine, pos.x + 12, pos.y + 15, render.color, 20);
      sfx.playExplosion(true);

      engine.logDebug(`COLLISION: PLAYER_LASER DESTROYED ${render.type.toUpperCase()}`);

      if (Math.random() < 0.12) this.dropPowerUp(engine, pos.x, pos.y);

      engine.em.destroyEntity(e1);
      engine.em.destroyEntity(e2);
      engine.score += 100;
      return;
    }

    // Feindliches Geschoss trifft Spieler (Discovery One)
    if ((f1 === "INVADER_LASER" && f2 === "PLAYER") || (f2 === "INVADER_LASER" && f1 === "PLAYER")) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const laserEntity = f1 === "PLAYER" ? e2 : e1;
      
      const health = engine.em.getComponent<Health>(playerEntity, "Health")!;
      
      // SOTA REPARATUR: Wenn I-Frames aktiv sind, verpufft der Treffer wirkungslos!
      if (health.invulnerableTimer > 0) {
        engine.em.destroyEntity(laserEntity);
        return;
      }

      const pos = engine.em.getComponent<Position>(playerEntity, "Position")!;
      engine.triggerScreenShake(0.4, 22);

      const flashEl = document.getElementById("damage-flash");
      if (flashEl) {
        flashEl.classList.remove("flash-active");
        void flashEl.offsetWidth;
        flashEl.classList.add("flash-active");
      }

      ParticleSystem.spawnExplosion(engine, pos.x + 20, pos.y + 20, "#ffffff", 35);
      sfx.playExplosion(false);
      engine.em.destroyEntity(laserEntity);
      
      health.current -= 1;
      engine.lives = health.current;
      health.invulnerableTimer = 1.2; // 1,2 Sekunden absolute Unverwundbarkeit

      engine.logDebug(`IMPACT DETECTED // REMAINING LIVES: ${health.current}`);

      if (health.current <= 0) {
        engine.state = "GAMEOVER";
      }
      return;
    }

    // Spieler sammelt Buff ein
    if ((f1 === "PLAYER" && f2 === "POWERUP") || (f2 === "PLAYER" && f1 === "POWERUP")) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const powerUpEntity = f1 === "PLAYER" ? e2 : e1;

      engine.triggerScreenShake(0.1, 5);
      engine.em.addComponent(playerEntity, new Modifier("TRI_BEAM", 5.0));
      engine.em.destroyEntity(powerUpEntity);
      engine.score += 500;
      engine.logDebug("BUFF ACQUIRED // WEAPON MODE: TRI_BEAM ACTUATED");
      return;
    }
  }

  private dropPowerUp(engine: Engine, x: number, y: number) {
    const powerUp = engine.em.createEntity();
    engine.em.addComponent(powerUp, new Position(x, y));
    engine.em.addComponent(powerUp, new Velocity(0, 140));
    engine.em.addComponent(powerUp, new Renderable("#00ffcc", 12, "cube"));
    engine.em.addComponent(powerUp, new Collider(12, 12, "POWERUP"));
  }
}