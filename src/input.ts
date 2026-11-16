// Eingabe: Maus, Touch und Tastatur. Der Zeiger liefert eine Zielposition,
// die Tasten eine Richtung. Im Automatik-Modus gewinnt die zuletzt benutzte Quelle.

import { view } from "./view";
import { ControlMode } from "./save";

export class Input {
  public targetX: number | null = null;   // logische Koordinate
  public mode: ControlMode = "AUTO";
  private left = false;
  private right = false;
  public onKey: (code: string) => void = () => {};

  constructor(canvas: HTMLElement) {
    const move = (e: PointerEvent): void => {
      if (this.mode === "KEYS") return;
      this.targetX = e.clientX / view.scale;
    };
    window.addEventListener("pointermove", move, { passive: true });
    canvas.addEventListener("pointerdown", move, { passive: true });

    window.addEventListener("keydown", (e) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT") return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") { this.left = true; this.keysTook(); }
      else if (e.code === "ArrowRight" || e.code === "KeyD") { this.right = true; this.keysTook(); }
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (!e.repeat) this.onKey(e.code);
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.left = false;
      else if (e.code === "ArrowRight" || e.code === "KeyD") this.right = false;
    });
    window.addEventListener("blur", () => { this.left = this.right = false; });
  }

  private keysTook(): void { if (this.mode !== "POINTER") this.targetX = null; }

  /** -1, 0 oder 1 */
  get axis(): number {
    if (this.mode === "POINTER") return 0;
    return (this.right ? 1 : 0) - (this.left ? 1 : 0);
  }
}
