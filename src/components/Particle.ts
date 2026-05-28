import { Component } from "../core/ECS";

export class Particle implements Component {
  readonly _type = "Particle";
  constructor(
    public life: number,       // Lebensdauer in Sekunden
    public maxLife: number,
    public color: string,
    public fade: boolean = true,
    public sizeStyle: "circle" | "square" = "square"
  ) {}
}