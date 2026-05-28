import { Component } from "../core/ECS";
export class Position implements Component {
  readonly _type = "Position";
  constructor(public x: number, public y: number) {}
}