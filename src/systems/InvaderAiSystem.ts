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
    if (engine.state === "CINEMATIC") return;

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
    let baseSpeed = 40 + engine.currentLevel * 25;
    let fireRateMultiplier = engine.difficultyMode === "EASY" ? 1.5 : engine.difficultyMode === "HARDCORE" ? 0.5 : 1.0;

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "hal9000_boss":
          // BOSS-KI: Träges Gleiten an der Decke mit automatischem Richtungswechsel
          pos.x += this.direction * 140 * delta;
          if (pos.x > engine.ctx.canvas.width - 240) this.direction = -1;
          if (pos.x < 40) this.direction = 1;

          // Multi-Phasen Feuerwelle des Großrechners
          if (this.globalShootCooldown <= 0) {
            const cx = pos.x + 60;
            // 3er Fächerfeuer + Predictive-Strahl kombiniert!
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 40, "#ff0055", 0);
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 40, "#ff0055", -120);
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 40, "#ff0055", 120);
            if (playerPos) {
              this.fireEnemyCapsuleLaser(engine, cx, pos.y + 40, "#fef08a", (playerPos.x - cx) * 0.8);
            }
            this.globalShootCooldown = 0.6 * fireRateMultiplier;
          }
          break;

        case "cube":
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 45 * delta;
          pos.y += (15 + engine.currentLevel * 2) * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.02) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 10, pos.y + 20, "#ff3399", 0);
            this.globalShootCooldown = 0.45 * fireRateMultiplier;
          }
          break;

        case "predator":
          pos.x += Math.cos(this.waveTimer * 5) * 110 * delta;
          pos.y += (35 + engine.currentLevel * 3) * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 12, pos.y + 20, "#ff6600", 0);
            this.globalShootCooldown = 0.4 * fireRateMultiplier;
          }
          break;

        case "xfighter":
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 45 * delta;
            if (pos.x < 25 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          if (this.globalShootCooldown <= 0 && Math.random() < 0.06) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#ff0033", 0);
            this.globalShootCooldown = 0.28 * fireRateMultiplier;
          }
          break;

        case "alien":
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 70 * delta;
          if (Math.random() < 0.007) pos.x += (Math.random() - 0.5) * 90;
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.04) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#d000ff", (playerPos.x - pos.x) * 0.7);
            this.globalShootCooldown = 0.32 * fireRateMultiplier;
          }
          break;

        case "monolith":
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
          break;

        case "satellite":
          pos.x += Math.sin(this.waveTimer * 1.5 + pos.y) * 140 * delta;
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

      if (pos.y > engine.ctx.canvas.height - 140 && render.type !== "echo" && render.type !== "hal9000_boss" && engine.state === "PLAYING") {
        engine.lives = 0;
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
        if (this.moveDownPending) pos.y += 35;
        else pos.x += this.direction * baseSpeed * delta;
      }
    }

    this.moveDownPending = false;
  }

  private fireEnemyCapsuleLaser(engine: Engine, x: number, y: number, color: string, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(vx, 420 + engine.currentLevel * 10));
    engine.em.addComponent(laser, new Renderable(color, 16, "laser"));
    engine.em.addComponent(laser, new Collider(5, 16, "INVADER_LASER"));
  }
}