import { Component } from "../core/ECS";
export class Velocity implements Component {
  readonly _type = "Velocity";
  constructor(public vx: number, public vy: number) {}
}