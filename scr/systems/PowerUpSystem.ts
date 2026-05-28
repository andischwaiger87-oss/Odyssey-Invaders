import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Modifier } from "../components/Modifier";
import { Gun } from "../components/Gun";

export class PowerUpSystem implements System {
  update(entities: Entity[], engine: Engine, delta: number): void {
    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Modifier") && engine.em.hasComponent(entity, "Gun")) {
        const mod = engine.em.getComponent<Modifier>(entity, "Modifier")!;
        const gun = engine.em.getComponent<Gun>(entity, "Gun")!;

        mod.duration -= delta;

        // Erhöhe Schussrate dramatisch während des Buffs
        if (mod.type === "TRI_BEAM") {
          gun.fireRate = 0.08; 
        }

        if (mod.duration <= 0) {
          engine.em.removeComponent(entity, "Modifier");
          gun.fireRate = 0.25; // Reset auf Standard-SOTA-Wert
        }
      }
    }
  }
}