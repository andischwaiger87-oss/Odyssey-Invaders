export type Entity = string;

export interface Component {
  _type: string;
}

export interface System {
  update(entities: Entity[], engine: any, delta: number): void;
}

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

  // SOTA FIX: Ermöglicht das gezielte Entfernen einzelner Komponenten (z.B. Power-Ups)
  removeComponent(entity: Entity, type: string): void {
    if (this.components.has(type)) {
      this.components.get(type)!.delete(entity);
    }
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