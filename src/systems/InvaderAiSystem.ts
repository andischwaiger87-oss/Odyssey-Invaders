import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Collider } from "../components/Collider";
import { Renderable } from "../components/Renderable";
import { Health } from "../components/Health";

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
    
    // --- ADJUST BASE SPEED & DIFFICULTY MATRIX ---
    let baseSpeed = 40 + engine.currentLevel * 25;
    let shootChanceMultiplier = 1.0;
    let fireRateMultiplier = 1.0;

    if (engine.difficultyMode === "HARDCORE") {
      baseSpeed *= 1.5;
      shootChanceMultiplier = 2.5;
      fireRateMultiplier = 0.4;
    } else if (engine.difficultyMode === "EASY") {
      baseSpeed *= 0.8;
      shootChanceMultiplier = 0.5;
      fireRateMultiplier = 1.6;
    }

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "hal9000_boss":
          pos.x += this.direction * (engine.difficultyMode === "HARDCORE" ? 220 : 140) * delta;
          if (pos.x > engine.ctx.canvas.width - 240) this.direction = -1;
          if (pos.x < 40) this.direction = 1;

          const h = engine.em.getComponent<Health>(invader, "Health")!;
          const ratio = h.current / h.max;

          if (this.globalShootCooldown <= 0) {
            const cx = pos.x + 100;
            
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#ff0055", 0);
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#ff0055", -120);
            this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#ff0055", 120);
            
            if (playerPos) {
              this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#fef08a", (playerPos.x - cx) * 0.85);
            }

            if (ratio < 0.5 || engine.difficultyMode === "HARDCORE") {
              this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#a855f7", -250);
              this.fireEnemyCapsuleLaser(engine, cx, pos.y + 60, "#a855f7", 250);
            }

            this.globalShootCooldown = (0.24 * ratio + 0.10) * fireRateMultiplier;
          }
          break;

        case "cube": // Primitiv-Horde (Akt I) ODER HAL-Logikkerne (Akt III)
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 45 * delta;
          pos.y += (15 + engine.currentLevel * 2) * delta;
          
          if (this.globalShootCooldown <= 0 && Math.random() < 0.02 * shootChanceMultiplier) {
            // ANPASSUNG: Wenn Cubes in Akt 3 als HAL-Kerne agieren, zielen sie aktiv auf dein Schiff!
            if (engine.currentAct === 3 && playerPos) {
              const trackX = (playerPos.x - pos.x) * 0.5;
              this.fireEnemyCapsuleLaser(engine, pos.x + 10, pos.y + 20, "#ff3333", trackX);
            } else {
              this.fireEnemyCapsuleLaser(engine, pos.x + 10, pos.y + 20, "#ff3399", 0);
            }
            this.globalShootCooldown = 0.45 * fireRateMultiplier;
          }
          break;

        case "predator":
          pos.x += Math.cos(this.waveTimer * 5) * 110 * delta;
          pos.y += (35 + engine.currentLevel * 3) * delta;
          
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03 * shootChanceMultiplier) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 12, pos.y + 20, "#ff6600", 0);
            this.globalShootCooldown = 0.4 * fireRateMultiplier;
          }
          break;

        case "xfighter": // Abfangjäger (Akt III & V)
          if (vel) {
            pos.x += vel.vx * (engine.difficultyMode === "HARDCORE" ? 1.4 : 1.0) * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 45 * delta;
            if (pos.x < 25 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          // ANPASSUNG: X-Fighter nutzen nun präzises Spieler-Tracking statt starrem Vertikalfeuer!
          if (this.globalShootCooldown <= 0 && Math.random() < 0.07 * shootChanceMultiplier) {
            const trackX = playerPos ? (playerPos.x - pos.x) * 0.65 : 0;
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#ff0033", trackX);
            this.globalShootCooldown = 0.25 * fireRateMultiplier;
          }
          break;

        case "alien":
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 70 * delta;
          if (Math.random() < (engine.difficultyMode === "HARDCORE" ? 0.02 : 0.007)) {
            pos.x += (Math.random() - 0.5) * 90;
          }
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.04 * shootChanceMultiplier) {
            const trackVector = (playerPos.x - pos.x) * 0.75;
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#d000ff", trackVector);
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

        case "evapod": // EVA-Kapseln (Akt III)
          if (vel) {
            pos.x += vel.vx * (engine.difficultyMode === "HARDCORE" ? 1.5 : 1.0) * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 20 * delta;
            if (pos.x < 20 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          // ANPASSUNG: EVA-Kapseln feuern jetzt unerbittliche 3-Wege-Fächer-Projektile ab!
          if (this.globalShootCooldown <= 0 && Math.random() < 0.04 * shootChanceMultiplier) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 0);      // Mitte
            this.fireEnemyCapsuleLaser(engine, pos.x + 16, pos.y + 35, "#eab308", -90);    // Links abgewinkelt
            this.fireEnemyCapsuleLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 90);     // Rechts abgewinkelt
            this.globalShootCooldown = 0.38 * fireRateMultiplier;
          }
          break;

        case "echo":
          if (vel) {
            pos.x += vel.vx * (engine.difficultyMode === "HARDCORE" ? 1.6 : 1.0) * delta;
            pos.y += vel.vy * (engine.difficultyMode === "HARDCORE" ? 1.6 : 1.0) * delta;
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

    if (this.globalShootCooldown <= 0 && Math.random() < 0.05 * shootChanceMultiplier) {
      const monos = invaders.filter(e => engine.em.getComponent<Renderable>(e, "Renderable")!.type === "monolith");
      if (monos.length > 0) {
        const target = monos[Math.floor(Math.random() * monos.length)];
        const p = engine.em.getComponent<Position>(target, "Position")!;
        this.fireEnemyCapsuleLaser(engine, p.x + 10, p.y + 45, "#ff3333", 0);
        this.globalShootCooldown = 0.35 * fireRateMultiplier;
      }
    }

    this.moveDownPending = false;
  }

  private fireEnemyCapsuleLaser(engine: Engine, x: number, y: number, color: string, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    
    let speed = 420 + engine.currentLevel * 10;
    // Erhöhe Kinetik in Akt 3 (+60px/s) und im Hardcore-Modus allgemein (+150px/s)
    if (engine.currentAct === 3) speed += 60;
    if (engine.difficultyMode === "HARDCORE") speed += 150;

    engine.em.addComponent(laser, new Velocity(vx, speed));
    engine.em.addComponent(laser, new Renderable(color, 16, "laser"));
    engine.em.addComponent(laser, new Collider(5, 16, "INVADER_LASER"));
  }
}