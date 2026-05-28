import { Component } from "../core/ECS";

export class Gun implements Component {
  readonly _type = "Gun";
  public cooldownTimer = 0;
  
  constructor(
    public fireRate: number, // Sekunden zwischen Schüssen
    public projectileSpeed: number
  ) {}
}