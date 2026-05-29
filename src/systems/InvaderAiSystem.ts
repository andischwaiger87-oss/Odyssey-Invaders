import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Collider } from "../components/Collider";
import { Renderable } from "../components/Renderable";

export class InvaderAiSystem implements System {
  private direction = 1;
  private moveDownPending = false;
  private globalShootCooldown = 0;
  private waveTimer = 0;

  update(entities: Entity[], engine: Engine, delta: number): void {
    this.waveTimer += delta;
    if (this.globalShootCooldown > 0) this.globalShootCooldown -= delta;

    const invaders = entities.filter(e => 
      engine.em.hasComponent(e, "Collider") && 
      engine.em.getComponent<Collider>(e, "Collider")!.faction === "INVADER"
    );

    if (invaders.length === 0) return;

    const playerEntity = entities.find(e => engine.em.getComponent<Collider>(e, "Collider")?.faction === "PLAYER");
    const playerPos = playerEntity ? engine.em.getComponent<Position>(playerEntity, "Position") : null;

    let edgeHit = false;
    let baseSpeed = 45 + engine.currentLevel * 22;

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "cube": // Primitiv-Horde (Akt I)
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 40 * delta;
          pos.y += (12 + engine.currentLevel * 2) * delta;
          
          // TUNING-INJEKTION: Erste Level kämpfen ab jetzt aktiv zurück
          if (this.globalShootCooldown <= 0 && Math.random() < 0.015) {
            this.fireEnemyLaser(engine, pos.x + 10, pos.y + 20, "#5e4a3f", 0);
            this.globalShootCooldown = 0.5;
          }
          break;

        case "predator": // Urzeit-Säbelzahntiger (Akt I)
          pos.x += Math.cos(this.waveTimer * 5) * 110 * delta;
          pos.y += (32 + engine.currentLevel * 3) * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.02) {
            this.fireEnemyLaser(engine, pos.x + 10, pos.y + 20, "#d97706", 0);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "xfighter": // Sternenjäger (Akt III)
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 45 * delta;
            if (pos.x < 25 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          if (this.globalShootCooldown <= 0 && Math.random() < 0.05) {
            this.fireEnemyLaser(engine, pos.x + 12, pos.y + 24, "#e11d48", 0);
            this.globalShootCooldown = 0.3;
          }
          break;

        case "alien": // Pulsierende Mutation (Akt II & V)
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 65 * delta;
          if (Math.random() < 0.006) {
            pos.x += (Math.random() - 0.5) * 80; // Teleport-Glitch
          }
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.04) {
            const targetVector = (playerPos.x - pos.x) * 0.6;
            this.fireEnemyLaser(engine, pos.x + 12, pos.y + 24, "#a855f7", targetVector);
            this.globalShootCooldown = 0.35;
          }
          break;

        case "monolith":
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
          break;

        case "satellite":
          pos.x += Math.sin(this.waveTimer * 1.5 + pos.y) * 140 * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03) {
            this.fireEnemyLaser(engine, pos.x + 12, pos.y + 20, "#cbd5e1", 0);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "evapod":
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 20 * delta;
            if (pos.x < 20 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          if (this.globalShootCooldown <= 0 && Math.random() < 0.04) {
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 0);
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", -90);
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 90);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "echo":
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += vel.vy * delta;
          }
          break;
      }

      // Invasions-Grenze überwachen
      if (pos.y > engine.ctx.canvas.height - 140 && render.type !== "echo") {
        engine.lives = 0; // Triggert die sofortige Eliminierung im zentralen Loop
        engine.logDebug(`CRITICAL BREAKTHROUGH: ${render.type.toUpperCase()} breached orbit bounds`);
      }
    }

    if (edgeHit) {
      this.direction *= -1;
      this.moveDownPending = true;
    }

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      
      if (render.type === "monolith") {
        if (this.moveDownPending) {
          pos.y += 35;
        } else {
          pos.x += this.direction * baseSpeed * delta;
        }
      }
    }

    this.moveDownPending = false;
  }

  private fireEnemyLaser(engine: Engine, x: number, y: number, color: string, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(vx, 390 + engine.currentLevel * 10));
    engine.em.addComponent(laser, new Renderable(color, 5, "cube"));
    engine.em.addComponent(laser, new Collider(5, 16, "INVADER_LASER"));
  }
}