import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export class MoveSystem implements System {
  update(entities: Entity[], engine: Engine, delta: number): void {
    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Position") && engine.em.hasComponent(entity, "Velocity")) {
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        const vel = engine.em.getComponent<Velocity>(entity, "Velocity")!;
        
        pos.x += vel.vx * delta;
        pos.y += vel.vy * delta;
      }
    }
  }
}