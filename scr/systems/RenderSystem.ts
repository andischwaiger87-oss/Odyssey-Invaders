import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";

export class RenderSystem implements System {
  update(entities: Entity[], engine: Engine): void {
    const ctx = engine.ctx;

    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Position") && engine.em.hasComponent(entity, "Renderable")) {
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        const render = engine.em.getComponent<Renderable>(entity, "Renderable")!;

        ctx.save();

        // SOTA 2026 Neon Bloom-Effekt über native Canvas-Schatten
        ctx.shadowBlur = 15;
        ctx.shadowColor = render.color;
        ctx.fillStyle = render.color;

        switch (render.type) {
          case "ship":
            this.drawDiscoveryOne(ctx, pos.x, pos.y);
            break;

          case "monolith":
            // Die unheimliche monolithische Geometrie aus dem Film (Menschheits-Katalysator)
            ctx.shadowBlur = 25;
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.fillStyle = "#000000";
            ctx.fillRect(pos.x, pos.y, render.size, render.size * 2.25);
            
            // Subtile, glühende Konturlinie (HAL-Sabotage-Indikator in Akt 3)
            ctx.strokeStyle = engine.currentAct === 3 ? "#ff3333" : "#444446";
            ctx.lineWidth = 1;
            ctx.strokeRect(pos.x, pos.y, render.size, render.size * 2.25);
            break;

          case "cube":
            // Universeller Vektor-Stil für Projektile, Laserstrahlen und Power-Ups
            ctx.fillRect(pos.x, pos.y, render.size, render.size * 2.2);
            break;
        }

        ctx.restore();
      }
    }
  }

  // Zeichnet prozedural die präzise Silhouette der Discovery One im Vektor-Stil
  private drawDiscoveryOne(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    // 1. Das kugelförmige Cockpit (Kopf-Sektion)
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();

    // Ikonischer roter Linsenpunkt im Cockpit (Zentrales Auge / HAL-Hommage)
    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Der lange Verbindungssteg (Wirbelsäule des Schiffs)
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 22);
    ctx.lineTo(x + 20, y + 45);
    ctx.stroke();

    // 3. Die Heck-Triebwerkssektion mit dynamischem Plasma-Glühen
    ctx.fillStyle = "#0d0d11";
    ctx.fillRect(x + 5, y + 45, 30, 12);
    ctx.strokeRect(x + 5, y + 45, 30, 12);

    // Flackernder Ionen-Ausstoß (Prozedurales Partikel-Glühen)
    if (Math.random() > 0.3) {
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.fillRect(x + 9, y + 57, 5, 7);
      ctx.fillRect(x + 25, y + 57, 5, 7);
    }
  }
}