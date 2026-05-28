import { Component } from "../core/ECS";

export type FactionType = "PLAYER" | "INVADER" | "PLAYER_LASER" | "INVADER_LASER";

export class Collider implements Component {
  readonly _type = "Collider";
  constructor(
    public width: number,
    public height: number,
    public faction: FactionType
  ) {}
}