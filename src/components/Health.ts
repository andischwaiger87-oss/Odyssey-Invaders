import { Component } from "../core/ECS";

export class Health implements Component {
  readonly _type = "Health";
  
  // Schützt den Spieler vor Multi-Treffern im exakt selben Frame
  public invulnerableTimer = 0;

  constructor(
    public current: number, 
    public max: number
  ) {}
}