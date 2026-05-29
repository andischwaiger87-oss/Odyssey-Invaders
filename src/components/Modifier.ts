import { Component } from "../core/ECS";

export type ModifierType = "TRI_BEAM" | "SHIELD";

export class Modifier implements Component {
  readonly _type = "Modifier";
  constructor(
    public type: ModifierType,
    public duration: number
  ) {}
}