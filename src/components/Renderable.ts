import { Component } from "../core/ECS";

export type RenderType = "cube" | "monolith" | "ship" | "predator" | "satellite" | "evapod" | "echo" | "xfighter" | "alien" | "laser" | "powerup_item";

export class Renderable implements Component {
  readonly _type = "Renderable";
  constructor(
    public color: string, 
    public size: number, 
    public type: RenderType
  ) {}
}