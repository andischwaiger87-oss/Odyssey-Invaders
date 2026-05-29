import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Renderable } from "../components/Renderable";
import { Modifier } from "../components/Modifier";

export class RenderSystem implements System {
  update(entities: Entity[], engine: Engine): void {
    const ctx = engine.ctx;

    for (const entity of entities) {
      if (engine.em.hasComponent(entity, "Position") && engine.em.hasComponent(entity, "Renderable")) {
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        const render = engine.em.getComponent<Renderable>(entity, "Renderable")!;

        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = render.color;
        ctx.fillStyle = render.color;

        switch (render.type) {
          case "ship":
            this.drawDiscoveryOne(ctx, pos.x, pos.y);
            const hasShield = engine.em.hasComponent(entity, "Modifier") && 
                              engine.em.getComponent<Modifier>(entity, "Modifier")!.type === "SHIELD";
            if (hasShield) {
              ctx.strokeStyle = "#38bdf8";
              ctx.lineWidth = 3;
              ctx.shadowColor = "#38bdf8";
              ctx.beginPath();
              ctx.arc(pos.x + 20, pos.y + 25, 38, 0, Math.PI * 2);
              ctx.stroke();
            }
            break;

          case "monolith":
            ctx.shadowBlur = 25;
            ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
            ctx.fillStyle = "#000000";
            ctx.fillRect(pos.x, pos.y, render.size, render.size * 2.25);
            ctx.strokeStyle = engine.currentAct === 3 ? "#ff3333" : "#444446";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(pos.x, pos.y, render.size, render.size * 2.25);
            break;

          case "cube":
            // AKT I FEIND-SCHIFF: Zeichnet ein knochenförmiges, urzeitliches Stammes-Kriegsschiff (Kein flaches Kästchen mehr)
            this.drawPrimitiveBoneSkiff(ctx, pos.x, pos.y, render.size);
            break;

          case "predator":
            this.drawPredatorBeast(ctx, pos.x, pos.y, render.size);
            break;

          case "satellite":
            this.drawLunarSatellite(ctx, pos.x, pos.y, render.size);
            break;

          case "evapod":
            this.drawEVAPod(ctx, pos.x, pos.y, render.size);
            break;

          case "xfighter":
            // SOTA UPGRADE: Präzise Liniengeometrie eines hochentwickelten Abfangjägers
            this.drawXFighter(ctx, pos.x, pos.y, render.size);
            break;

          case "alien":
            // SOTA UPGRADE: Pulsierende Vektor-Tentakel einer interdimensionalen Lebensform
            this.drawAlienOrganism(ctx, pos.x, pos.y, render.size);
            break;

          case "laser":
            // EINDEUTIGE TRETNUNG: Feindliches Feuer wird als ultra-schmale, intensive Neon-Plasmakapsel gezeichnet
            ctx.fillStyle = render.color;
            ctx.fillRect(pos.x + 1, pos.y, 2, render.size);
            break;

          case "powerup_item":
            // EINDEUTIGE TRENNUNG: Items sind rotierende Rauten-Kristalle mit weißem Energiekern
            this.drawPowerUpItem(ctx, pos.x, pos.y, render.size, render.color);
            break;

          case "echo":
            this.drawAstralEcho(ctx, pos.x, pos.y, render.size);
            break;
        }

        ctx.restore();
      }
    }
  }

  private drawDiscoveryOne(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 20, y + 10, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ff3333";
    ctx.beginPath();
    ctx.arc(x + 20, y + 8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + 20, y + 22);
    ctx.lineTo(x + 20, y + 45);
    ctx.stroke();

    ctx.fillStyle = "#0d0d11";
    ctx.fillRect(x + 5, y + 45, 30, 12);
    ctx.strokeRect(x + 5, y + 45, 30, 12);

    if (Math.random() > 0.3) {
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 20;
      ctx.fillRect(x + 9, y + 57, 5, 7);
      ctx.fillRect(x + 25, y + 57, 5, 7);
    }
  }

  private drawPrimitiveBoneSkiff(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#5e4a3f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x + size / 2, y + size * 0.7);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#3e2d23";
    ctx.fill();
  }

  private drawPredatorBeast(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI, true);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "#ff3333";
    ctx.fillRect(x + size / 4 - 1, y + size / 3, 2, 2);
    ctx.fillRect(x + (size * 3) / 4 - 1, y + size / 3, 2, 2);
  }

  private drawLunarSatellite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.beginPath();
    ctx.moveTo(x, y + size / 2); ctx.lineTo(x + size, y + size / 2);
    ctx.moveTo(x + size / 2, y); ctx.lineTo(x + size / 2, y + size);
    ctx.stroke();
  }

  private drawEVAPod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(14, 116, 144, 0.4)";
    ctx.fill();
  }

  private drawXFighter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Scherengeometrie des Sternenjägers
    ctx.moveTo(x, y); ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y); ctx.lineTo(x, y + size);
    ctx.moveTo(x + size / 2, y - 4); ctx.lineTo(x + size / 2, y + size + 4);
    ctx.stroke();
  }

  private drawAlienOrganism(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    const pulse = size / 2 + Math.sin(performance.now() * 0.01) * 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
  }

  private drawPowerUpItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size, y + size / 2);
    ctx.lineTo(x + size / 2, y + size);
    ctx.lineTo(x, y + size / 2);
    ctx.closePath();
    ctx.stroke();
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
  }

  private drawAstralEcho(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + size, y + size);
    ctx.stroke();
  }
}