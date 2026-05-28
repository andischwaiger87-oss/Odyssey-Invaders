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

    // Filtere alle aktiven Invader-Entitäten
    const invaders = entities.filter(e => {
      const col = engine.em.getComponent<Collider>(e, "Collider");
      return col && col.faction === "INVADER";
    });

    // Wenn das Feld geräumt ist, übernimmt das ActDirectorSystem den Übergang
    if (invaders.length === 0) return;

    // Finde die Position des Spielers für vorausschauende Zielberechnungen (Akt III)
    const playerEntity = entities.find(e => engine.em.getComponent<Collider>(e, "Collider")?.faction === "PLAYER");
    const playerPos = playerEntity ? engine.em.getComponent<Position>(playerEntity, "Position") : null;

    let edgeHit = false;

    // --- STRATEGISCHE KI-BERECHNUNG NACH FILMAKTEN ---
    switch (engine.currentAct) {
      case 1: // Die Urzeit: Chaotisches Hin- und Herwabern der Horde
        for (const invader of invaders) {
          const pos = engine.em.getComponent<Position>(invader, "Position")!;
          pos.x += Math.sin(this.waveTimer * 2 + pos.y) * 40 * delta;
          pos.y += 5 * delta; // Drängt langsam nach unten
        }
        break;

      case 2: // TMA-1 Mond: Das klassische, unerbittliche Space-Invaders-Muster
        for (const invader of invaders) {
          const pos = engine.em.getComponent<Position>(invader, "Position")!;
          if (this.direction === 1 && pos.x > engine.ctx.canvas.width - 45) edgeHit = true;
          if (this.direction === -1 && pos.x < 15) edgeHit = true;
        }

        if (edgeHit) {
          this.direction *= -1;
          this.moveDownPending = true;
        }

        for (const invader of invaders) {
          const pos = engine.em.getComponent<Position>(invader, "Position")!;
          if (this.moveDownPending) {
            pos.y += 25;
          } else {
            pos.x += this.direction * 90 * delta;
          }
        }
        this.moveDownPending = false;

        // Klassischer Zufallsschuss
        if (this.globalShootCooldown <= 0 && Math.random() < 0.04) {
          const luckyShot = invaders[Math.floor(Math.random() * invaders.length)];
          const p = engine.em.getComponent<Position>(luckyShot, "Position")!;
          this.fireEnemyLaser(engine, p.x + 10, p.y + 40);
          this.globalShootCooldown = 0.35;
        }
        break;

      case 3: // HAL 9000: Aggressive, vorausschauende Kern-Logik
        for (const invader of invaders) {
          const pos = engine.em.getComponent<Position>(invader, "Position")!;
          const vel = engine.em.getComponent<Velocity>(invader, "Velocity")!;

          // Sinusförmiges Ausschlagen der HAL-Subprozessoren
          pos.x += vel.vx * delta;
          pos.y += Math.sin(this.waveTimer * 3 + pos.x) * 15 * delta;

          // Abprallen an den Wänden
          if (pos.x < 20 || pos.x > engine.ctx.canvas.width - 50) {
            vel.vx *= -1;
          }

          // Gezieltes Abfangen: HAL berechnet den Vektor des Spielers
          if (this.globalShootCooldown <= 0 && playerPos && Math.random() < 0.05) {
            // Berechne horizontalen Versatz für gezielte Schüsse
            const dx = playerPos.x - pos.x;
            this.firePredictiveHalLaser(engine, pos.x + 16, pos.y + 35, dx * 0.4);
            this.globalShootCooldown = 0.25; // Erhöhte Schussfrequenz von HAL
          }
        }
        break;
    }
  }

  private fireEnemyLaser(engine: Engine, x: number, y: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(0, 350));
    engine.em.addComponent(laser, new Renderable("#ff3333", 4, "cube"));
    engine.em.addComponent(laser, new Collider(4, 15, "INVADER_LASER"));
  }

  private firePredictiveHalLaser(engine: Engine, x: number, y: number, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    // HAL schießt nicht stur geradeaus, sondern winkelt Projektile mathematisch ab!
    engine.em.addComponent(laser, new Velocity(Math.max(-150, Math.min(150, vx)), 380));
    engine.em.addComponent(laser, new Renderable("#ff0000", 5, "cube"));
    engine.em.addComponent(laser, new Collider(5, 18, "INVADER_LASER"));
  }
}