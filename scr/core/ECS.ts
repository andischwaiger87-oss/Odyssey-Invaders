export type Entity = string;

export interface Component {
  _type: string;
}

export interface System {
  update(entities: Entity[], engine: Engine, delta: number): void;
}

import { Engine } from "./Engine";

export class EntityManager {
  private entities: Set<Entity> = new Set();
  private components: Map<string, Map<Entity, any>> = new Map();

  createEntity(): Entity {
    const id = crypto.randomUUID();
    this.entities.add(id);
    return id;
  }

  destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    for (const store of this.components.values()) {
      store.delete(entity);
    }
  }

  addComponent<T extends Component>(entity: Entity, component: T): void {
    if (!this.components.has(component._type)) {
      this.components.set(component._type, new Map());
    }
    this.components.get(component._type)!.set(entity, component);
  }

  getComponent<T extends Component>(entity: Entity, type: string): T | undefined {
    return this.components.get(type)?.get(entity) as T;
  }

  hasComponent(entity: Entity, type: string): boolean {
    return this.components.get(type)?.has(entity) || false;
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities);
  }
}