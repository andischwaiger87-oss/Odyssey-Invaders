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
    // SOTA ARCHITEKTUR-FIX: Wenn eine Titelkarte läuft, friert die feindliche Logik komplett ein!
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

    // --- TRANSLATION DER ELEMENTAREN ANGRIPPER-LOGIK ---
    for (const invader of invaders) {
      const pos = engine.em.getComponent<Position>(invader, "Position")!;
      const render = engine.em.getComponent<Renderable>(invader, "Renderable")!;
      const vel = engine.em.getComponent<Velocity>(invader, "Velocity");

      switch (render.type) {
        case "cube": // Primitiv-Horde (Akt I)
          pos.x += Math.sin(this.waveTimer * 2.5 + pos.y) * 45 * delta;
          pos.y += (15 + engine.currentLevel * 2) * delta;
          
          // TUNING: Erste Sektoren wehren sich ab jetzt sofort aktiv!
          if (this.globalShootCooldown <= 0 && Math.random() < 0.02) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 10, pos.y + 20, "#5e4a3f", 0);
            this.globalShootCooldown = 0.45;
          }
          break;

        case "predator": // Wilde Raubtiere (Akt I)
          pos.x += Math.cos(this.waveTimer * 5) * 110 * delta;
          pos.y += (35 + engine.currentLevel * 3) * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 12, pos.y + 20, "#d97706", 0);
            this.globalShootCooldown = 0.4;
          }
          break;

        case "xfighter": // Imperiale Sternenjäger (Akt III & V)
          if (vel) {
            pos.x += vel.vx * delta;
            pos.y += Math.sin(this.waveTimer * 4 + pos.x) * 45 * delta;
            if (pos.x < 25 || pos.x > engine.ctx.canvas.width - 50) vel.vx *= -1;
          }
          if (this.globalShootCooldown <= 0 && Math.random() < 0.06) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#e11d48", 0);
            this.globalShootCooldown = 0.28;
          }
          break;

        case "alien": // Plasma-Biomasse (Akt II & V)
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 70 * delta;
          if (Math.random() < 0.007) pos.x += (Math.random() - 0.5) * 90; // Warp-Zucken
          
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.04) {
            const trackVector = (playerPos.x - pos.x) * 0.7; // Berechnet Flugkurve zum Spieler
            this.fireEnemyCapsuleLaser(engine, pos.x + 14, pos.y + 24, "#a855f7", trackVector);
            this.globalShootCooldown = 0.32;
          }
          break;

        case "monolith": // Klassische Block-Invasoren
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
          break;

        case "satellite":
          pos.x += Math.sin(this.waveTimer * 1.5 + pos.y) * 140 * delta;
          if (this.globalShootCooldown <= 0 && Math.random() < 0.03) {
            this.fireEnemyCapsuleLaser(engine, pos.x + 12, pos.y + 20, "#cbd5e1", 0);
            this.globalShootCooldown = 0.4;
          }
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

      // Raumschiff-Infiltrationsgrenze prüfen (Ausgeschlossen kosmisches Echo in Akt 4)
      if (pos.y > engine.ctx.canvas.height - 140 && render.type !== "echo" && engine.state === "PLAYING") {
        engine.lives = 0; // Wiped alle Leben im zentralen Engine-Loop fehlerfrei
        engine.logDebug(`ORBIT DEFEAT // ${render.type.toUpperCase()} COLLIDED WITH SECTOR BASELINE`);
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

    // Standardfeuer für monolithische Blockgitter
    if (this.globalShootCooldown <= 0 && Math.random() < 0.05) {
      const monos = invaders.filter(e => engine.em.getComponent<Renderable>(e, "Renderable")!.type === "monolith");
      if (monos.length > 0) {
        const target = monos[Math.floor(Math.random() * monos.length)];
        const p = engine.em.getComponent<Position>(target, "Position")!;
        this.fireEnemyCapsuleLaser(engine, p.x + 10, p.y + 45, "#ff3333", 0);
        this.globalShootCooldown = 0.35;
      }
    }

    this.moveDownPending = false;
  }

  private fireEnemyCapsuleLaser(engine: Engine, x: number, y: number, color: string, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(vx, 400 + engine.currentLevel * 10));
    // ÄNDERUNG: Nutzt den dedizierten Typ "laser" zur verfeinerten visuellen Darstellung
    engine.em.addComponent(laser, new Renderable(color, 16, "laser"));
    engine.em.addComponent(laser, new Collider(5, 16, "INVADER_LASER"));
  }
}