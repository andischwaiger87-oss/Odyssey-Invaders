import { Component } from "../core/ECS";

export class Health implements Component {
  readonly _type = "Health";
  constructor(public current: number, public max: number) {}
}