import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { Particle } from "../components/Particle";
import { Collider } from "../components/Collider";

export class ParticleSystem implements System {
  update(entities: Entity[], engine: Engine, delta: number): void {
    // 1. VERARBEITUNG BESTEHENDER PARTIKEL
    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Particle") && engine.em.hasComponent(entity, "Position")) {
        const particle = engine.em.getComponent<Particle>(entity, "Particle")!;
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        const vel = engine.em.getComponent<Velocity>(entity, "Velocity");

        particle.life -= delta;

        // Speicherbereinigung bei virtuellem Tod des Partikels
        if (particle.life <= 0) {
          engine.em.destroyEntity(entity);
          continue;
        }

        // Physikalische Vektor-Verschiebung anwenden, falls vorhanden
        if (vel) {
          pos.x += vel.vx * delta;
          pos.y += vel.vy * delta;
        }

        // SOTA Alpha-Blending auf dem Canvas rendern
        const alpha = Math.max(0, particle.life / particle.maxLife);
        engine.ctx.save();
        engine.ctx.globalAlpha = alpha;
        
        engine.ctx.shadowBlur = 10;
        engine.ctx.shadowColor = particle.color;
        engine.ctx.fillStyle = particle.color;
        
        if (particle.sizeStyle === "square") {
          engine.ctx.fillRect(pos.x, pos.y, 3, 3);
        } else {
          engine.ctx.beginPath();
          engine.ctx.arc(pos.x, pos.y, 2.5, 0, Math.PI * 2);
          engine.ctx.fill();
        }
        engine.ctx.restore();
      }
    }

    // 2. PROZEDURALER TRIEBWERKS-TRAIL FÜR DIE DISCOVERY ONE
    if (engine.state === "PLAYING") {
      const player = entities.find(e => engine.em.getComponent<Collider>(e, "Collider")?.faction === "PLAYER");
      if (player) {
        const pPos = engine.em.getComponent<Position>(player, "Position")!;
        this.spawnEngineThrust(engine, pPos.x + 14, pPos.y + 55);
        this.spawnEngineThrust(engine, pPos.x + 28, pPos.y + 55);
      }
    }

    // 3. AMBIENTER RAUMSTAUB (Vermittelt Tiefenwirkung und Speed)
    if (Math.random() < 0.25) {
      this.spawnStardust(engine);
    }
  }

  private spawnEngineThrust(engine: Engine, x: number, y: number) {
    const trail = engine.em.createEntity();
    engine.em.addComponent(trail, new Position(x, y));
    // Triebwerkspartikel schießen nach unten weg mit leichtem horizontalen Drift
    engine.em.addComponent(trail, new Velocity((Math.random() - 0.5) * 30, Math.random() * 80 + 120));
    engine.em.addComponent(trail, new Particle(Math.random() * 0.3 + 0.1, 0.4, "#00ffff", true, "circle"));
  }

  private spawnStardust(engine: Engine) {
    const dust = engine.em.createEntity();
    const speedMultiplier = engine.currentAct === 4 ? 4 : 1; // Warp-Geschwindigkeit in Akt IV!
    
    engine.em.addComponent(dust, new Position(Math.random() * engine.ctx.canvas.width, -10));
    engine.em.addComponent(dust, new Velocity(0, (Math.random() * 60 + 40) * speedMultiplier));
    engine.em.addComponent(dust, new Particle(10 / speedMultiplier, 10 / speedMultiplier, "#ffffff", true, "circle"));
  }

  // Statische Utility-Methode zur Explosionstriggerung (Wird vom CollisionSystem genutzt)
  public static spawnExplosion(engine: Engine, x: number, y: number, color: string, count = 25) {
    for (let i = 0; i < count; i++) {
      const p = engine.em.createEntity();
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 60;
      
      engine.em.addComponent(p, new Position(x, y));
      engine.em.addComponent(p, new Velocity(Math.cos(angle) * speed, Math.sin(angle) * speed));
      engine.em.addComponent(p, new Particle(Math.random() * 0.4 + 0.2, 0.6, color, true, "square"));
    }
  }
}