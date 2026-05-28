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
    let baseSpeed = 60 + engine.currentLevel * 15; // Skaliert unerbittlich mit jedem Level

    // --- BEWEGUNGS- UND KAMPFVERHALTEN NACH GEGNER-TYPEN ---
    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "cube": // Primitiv-Horde (Akt I)
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 35 * delta;
          pos.y += (8 + engine.currentLevel * 2) * delta;
          break;

        case "predator": // Urzeit-Säbelzahntiger (Akt I, Lvl 2-3)
          // Aggressives Zick-Zack Sturzverhalten direkt nach unten
          pos.x += Math.cos(this.waveTimer * 5) * 90 * delta;
          pos.y += (25 + engine.currentLevel * 4) * delta;
          break;

        case "monolith": // Mond- und Jupitermonolithen (Akt II)
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
          break;

        case "satellite": // Lunar-Verteidigungssysteme (Akt II, Lvl 5-6)
          // Schweben autark, brechen aus dem Block aus und decken den Raum ab
          pos.x += Math.sin(this.waveTimer * 1.5 + pos.y) * 120 * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.02) {
            this.fireEnemyLaser(engine, pos.x + 12, pos.y + 20, "#cbd5e1", 0);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "evapod": // Korrumpierte EVA-Kapseln (Akt III, Lvl 8-9)
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 20 * delta;
            if (pos.x < 20 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          // Spreading Shot: EVA-Kapseln schießen gefährliche Fächer-Salven
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03) {
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 0);
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", -80);
            this.fireEnemyLaser(engine, pos.x + 16, pos.y + 35, "#eab308", 80);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "echo": // Astrale Echos (Akt IV Quantum Survival)
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += vel.vy * delta;
          }
          break;
      }
    }

    // Raster-Verarbeitung für klassischen Monolithen-Block-Verlauf
    if (edgeHit) {
      this.direction *= -1;
      this.moveDownPending = true;
    }

    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      
      if (render.type === "monolith") {
        if (this.moveDownPending) {
          pos.y += 30;
        } else {
          pos.x += this.direction * baseSpeed * delta;
        }
      }
    }

    // Standard-Zufallsfeuer für klassische Monolithen
    if (this.globalShootCooldown <= 0 && Math.random() < 0.05) {
      const monos = invaders.filter(e => engine.em.getComponent<Renderable>(e, "Renderable")!.type === "monolith");
      if (monos.length > 0) {
        const target = monos[Math.floor(Math.random() * monos.length)];
        const p = engine.em.getComponent<Position>(target, "Position")!;
        this.fireEnemyLaser(engine, p.x + 10, p.y + 40, "#ff3333", 0);
        this.globalShootCooldown = 0.3;
      }
    }

    this.moveDownPending = false;
  }

  private fireEnemyLaser(engine: Engine, x: number, y: number, color: string, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(vx, 360 + engine.currentLevel * 10));
    engine.em.addComponent(laser, new Renderable(color, 4, "cube"));
    engine.em.addComponent(laser, new Collider(4, 15, "INVADER_LASER"));
  }
}