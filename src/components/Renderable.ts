import { Component } from "../core/ECS";
export class Renderable implements Component {
  readonly _type = "Renderable";
  constructor(public color: string, public size: number, public type: "cube" | "monolith" | "ship") {}
}