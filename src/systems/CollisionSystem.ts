import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Collider } from "../components/Collider";
import { Health } from "../components/Health";
import { Velocity } from "../components/Velocity";
import { Renderable } from "../components/Renderable";
import { Modifier } from "../components/Modifier";
import { ParticleSystem } from "./ParticleSystem";
import { sfx } from "../core/AudioEngine";

export class CollisionSystem implements System {
  update(entities: Entity[], engine: Engine, delta: number): void {
    // Unverwundbarkeits-Timer runtertackern
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

  private handleCollision(engine: Engine, e1: Entity, f1: string, e2: Entity, f2: string) {
    
    // Spieler-Laser eliminiert Invasor
    if ((f1 === "PLAYER_LASER" && f2 === "INVADER") || (f2 === "PLAYER_LASER" && f1 === "INVADER")) {
      const invaderEntity = f1 === "INVADER" ? e1 : e2;
      const pos = engine.em.getComponent<Position>(invaderEntity, "Position")!;
      const render = engine.em.getComponent<Renderable>(invaderEntity, "Renderable")!;
      
      engine.triggerScreenShake(0.15, 10);
      ParticleSystem.spawnExplosion(engine, pos.x + 12, pos.y + 15, render.color, 20);
      sfx.playExplosion(true);

      engine.logDebug(`COLLISION: DISCOVERY LASER VAPORIZED ${render.type.toUpperCase()}`);

      // Ausbalancierte Drop-Garantie (15% Chance)
      if (Math.random() < 0.15) this.dropBalancedPowerUp(engine, pos.x, pos.y);

      engine.em.destroyEntity(e1);
      engine.em.destroyEntity(e2);
      engine.score += 100;
      return;
    }

    // Feindlicher Sabotage-Strahl trifft Spieler (Discovery One)
    if ((f1 === "INVADER_LASER" && f2 === "PLAYER") || (f2 === "INVADER_LASER" && f1 === "PLAYER")) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const laserEntity = f1 === "PLAYER" ? e2 : e1;
      
      const health = engine.em.getComponent<Health>(playerEntity, "Health")!;
      const pos = engine.em.getComponent<Position>(playerEntity, "Position")!;

      // 1. SCHILD-MODIFIER PRÜFUNG: Absorbiert den Treffer komplett
      const hasShield = engine.em.hasComponent(playerEntity, "Modifier") && 
                        engine.em.getComponent<Modifier>(playerEntity, "Modifier")!.type === "SHIELD";

      if (hasShield) {
        engine.triggerScreenShake(0.2, 12);
        ParticleSystem.spawnExplosion(engine, pos.x + 20, pos.y + 20, "#38bdf8", 30); // Blaue Schildfunken
        engine.em.removeComponent(playerEntity, "Modifier"); // Schild bricht auf
        engine.em.destroyEntity(laserEntity);
        engine.logDebug("SHIELD DEFLECTED DEFECT // DEFLECTOR SHIELD DEPLETED");
        return;
      }

      // 2. I-FRAME PRÜFUNG: Schützt vor Doppel-Frame-Toden
      if (health.invulnerableTimer > 0) {
        engine.em.destroyEntity(laserEntity);
        return;
      }

      engine.triggerScreenShake(0.4, 25);
      const flashEl = document.getElementById("damage-flash");
      if (flashEl) {
        flashEl.classList.remove("flash-active");
        void flashEl.offsetWidth;
        flashEl.classList.add("flash-active");
      }

      ParticleSystem.spawnExplosion(engine, pos.x + 20, pos.y + 20, "#ffffff", 40);
      sfx.playExplosion(false);
      engine.em.destroyEntity(laserEntity);
      
      health.current -= 1;
      engine.lives = health.current;
      health.invulnerableTimer = 1.2; // 1,2 Sekunden absolute Unverwundbarkeit

      engine.logDebug(`INTEGRITY DAMAGE // REMAINING HULL CAPACITY: ${health.current}`);
      return;
    }

    // Spieler sammelt ein Power-Up ein
    if ((f1 === "PLAYER" && f2.startsWith("POWERUP_")) || (f2 === "PLAYER" && f1.startsWith("POWERUP_"))) {
      const playerEntity = f1 === "PLAYER" ? e1 : e2;
      const powerUpEntity = f1 === "PLAYER" ? e2 : e1;
      const faction = f1 === "PLAYER" ? f2 : f1;

      engine.triggerScreenShake(0.1, 5);

      if (faction === "POWERUP_TRI") {
        engine.em.addComponent(playerEntity, new Modifier("TRI_BEAM", 6.0));
        engine.logDebug("MATRIX CORE MODIFIED // WEAPON ENGAGED: TRI_BEAM");
      } else if (faction === "POWERUP_SHIELD") {
        engine.em.addComponent(playerEntity, new Modifier("SHIELD", 10.0));
        engine.logDebug("DEFLECTOR FIELD SYNCED // SHIELD LAYER INITIALIZED");
      } else if (faction === "POWERUP_LIFE") {
        const health = engine.em.getComponent<Health>(playerEntity, "Health")!;
        if (health.current < health.max) {
          health.current += 1;
          engine.lives = health.current;
          engine.logDebug("REPAIR KIT APPLIED // STRUCTURAL INTEGRITY RESTORED");
        } else {
          engine.score += 1000; // Punkte-Bonus bei vollem Leben
          engine.logDebug("INTEGRITY MAXED // OVERFLOW REWARD GRANTED");
        }
      }

      engine.em.destroyEntity(powerUpEntity);
      engine.score += 250;
      return;
    }
  }

  private dropBalancedPowerUp(engine: Engine, x: number, y: number) {
    const powerUp = engine.em.createEntity();
    const rand = Math.random();
    
    let faction = "POWERUP_TRI";
    let color = "#00ffcc"; // Mint: Tri-Beam

    if (rand < 0.35) {
      faction = "POWERUP_SHIELD";
      color = "#38bdf8"; // Hellblau: Schild
    } else if (rand < 0.55) {
      faction = "POWERUP_LIFE";
      color = "#f43f5e"; // Rose: Reparatur-Kit
    }

    engine.em.addComponent(powerUp, new Position(x, y));
    engine.em.addComponent(powerUp, new Velocity(0, 130));
    engine.em.addComponent(powerUp, new Renderable(color, 14, "cube"));
    engine.em.addComponent(powerUp, new Collider(14, 14, faction));
  }
}