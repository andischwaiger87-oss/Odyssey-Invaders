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
    let baseSpeed = 50 + engine.currentLevel * 20;

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "cube":
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 40 * delta;
          pos.y += (10 + engine.currentLevel * 2) * delta;
          break;

        case "predator":
          pos.x += Math.cos(this.waveTimer * 5) * 100 * delta;
          pos.y += (28 + engine.currentLevel * 3) * delta;
          break;

        case "xfighter": // SOTA FEATURE: Der X-Fighter gleitet im Sinus-Sturzflug auf dich zu
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 45 * delta;
            if (pos.x < 25 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          // Gezieltes Helix-Feuer der Sternenjäger
          if (this.globalShootCooldown <= 0 && Math.random() < 0.04) {
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 20, "#e11d48", 0);
            this.globalShootCooldown = 0.3;
          }
          break;

        case "alien": // SOTA FEATURE: Das Alien-Monster mutiert unberechenbar in Sprüngen
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 60 * delta;
          if (Math.random() < 0.005) { // Teleportations-Zucken
            pos.x += (Math.random() - 0.5) * 60;
          }
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.03) {
            // Zielgerichteter Plasmaball auf das Cockpit der Discovery
            const targetVector = (playerPos.x - pos.x) * 0.5;
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 25, "#a855f7", targetVector);
            this.globalShootCooldown = 0.35;
          }
          break;

        case "monolith":
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
          break;

        case "satellite":
          pos.x += Math.sin(this.waveTimer * 1.5 + pos.y) * 130 * delta;
          break;

        case "evapod":
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 20 * delta;
            if (pos.x < 20 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          break;

        case "echo":
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += vel.vy * delta;
          }
          break;
      }

      // SOTA BOUNDARY-CHECK: Erreichen Invasoren den Y-Boden der Discovery One, ist die Basis infiltriert!
      if (pos.y > engine.ctx.canvas.height - 150 && render.type !== "echo") {
        engine.state = "GAMEOVER";
        engine.logDebug(`INVASION FAILURE: ${render.type.toUpperCase()} COLLIDED WITH LUNAR ORBITAL NET`);
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
    engine.em.addComponent(laser, new Velocity(vx, 380 + engine.currentLevel * 10));
    engine.em.addComponent(laser, new Renderable(color, 5, "cube"));
    engine.em.addComponent(laser, new Collider(5, 16, "INVADER_LASER"));
  }
}