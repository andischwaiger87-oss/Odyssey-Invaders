import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";

export class CleanupSystem implements System {
  update(entities: Entity[], engine: Engine): void {
    const height = engine.ctx.canvas.height;
    
    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Position") && !engine.em.hasComponent(entity, "Gun") && !engine.em.hasComponent(entity, "Health")) {
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        
        // Wenn es kein Spieler/Gegner ist und außerhalb liegt -> Löschen
        if (pos.y < -50 || pos.y > height + 50) {
          engine.em.destroyEntity(entity);
        }
      }
    }
  }
}