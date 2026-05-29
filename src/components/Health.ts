import { Component } from "../core/ECS";

export class Health implements Component {
  readonly _type = "Health";
  
  // SOTA Schutz gegen Instant-Frame-Tode
  public invulnerableTimer = 0;

  constructor(
    public current: number, 
    public max: number
  ) {}
}