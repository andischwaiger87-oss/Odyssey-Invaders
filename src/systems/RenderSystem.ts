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

          case "hal9000_boss":
            // HIGH-END BOSS ZEICHNUNG: Ein gewaltiger, bedrohlicher Serverturm mit rot pulsierendem Auge
            this.drawHalBossMainframe(ctx, pos.x, pos.y, render.size);
            break;

          case "cube":
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
            this.drawXFighter(ctx, pos.x, pos.y, render.size);
            break;

          case "alien":
            this.drawAlienOrganism(ctx, pos.x, pos.y, render.size);
            break;

          case "laser":
            ctx.strokeStyle = render.color;
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 12;
            ctx.shadowColor = render.color;
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x, pos.y + render.size);
            ctx.stroke();
            break;

          case "powerup_item":
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
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(x + 20, y + 10, 12, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff3333"; ctx.beginPath(); ctx.arc(x + 20, y + 8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 20, y + 22); ctx.lineTo(x + 20, y + 45); ctx.stroke();
    ctx.fillStyle = "#0d0d11"; ctx.fillRect(x + 5, y + 45, 30, 12); ctx.strokeRect(x + 5, y + 45, 30, 12);
    if (Math.random() > 0.3) {
      ctx.fillStyle = "#00ffff"; ctx.shadowColor = "#00ffff"; ctx.shadowBlur = 20;
      ctx.fillRect(x + 9, y + 57, 5, 7); ctx.fillRect(x + 25, y + 57, 5, 7);
    }
  }

  private drawHalBossMainframe(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    // Schwarze, glänzende Aluminium-Rahmenblende
    ctx.fillStyle = "#09090b";
    ctx.shadowBlur = 40;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.fillRect(x, y, size * 2.5, size);
    ctx.strokeStyle = "#27272a";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, size * 2.5, size);

    // Symmetrische Logikgatter-Linienzüge (Kubrick Scope)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for(let i = 1; i < 6; i++) {
      ctx.strokeRect(x + (size * i) * 0.4, y + 10, 15, size - 20);
    }

    // Gigantische Kameralinse von HAL 9000 im Zentrum
    const cx = x + (size * 2.5) / 2;
    const cy = y + size / 2;
    
    ctx.fillStyle = "#18181b";
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#71717a";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Glühendes mörderisches Auge
    const pulse = 10 + Math.sin(performance.now() * 0.012) * 2;
    ctx.fillStyle = "#ff1e1e";
    ctx.shadowColor = "#ff0000";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();

    // Pupillenkern
    ctx.fillStyle = "#fef08a";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPrimitiveBoneSkiff(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#a1a1aa"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(x + size / 2, y + size); ctx.lineTo(x + size, y); ctx.lineTo(x + size / 2, y + size * 0.3); ctx.lineTo(x, y);
    ctx.closePath(); ctx.stroke(); ctx.fillStyle = "#27272a"; ctx.fill();
  }

  private drawPredatorBeast(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, Math.PI, 0, true);
    ctx.lineTo(x + size, y); ctx.lineTo(x, y); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#ff3333"; ctx.fillRect(x + size / 4 - 1, y + size * 0.6, 2, 2); ctx.fillRect(x + (size * 3) / 4 - 1, y + size * 0.6, 2, 2);
  }

  private drawLunarSatellite(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, size - 8, size - 8);
    ctx.beginPath(); ctx.moveTo(x, y + size / 2); ctx.lineTo(x + size, y + size / 2); ctx.moveTo(x + size / 2, y); ctx.lineTo(x + size / 2, y + size); ctx.stroke();
  }

  private drawEVAPod(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#eab308"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.stroke();
  }

  private drawXFighter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "#e11d48"; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + size, y + size); ctx.moveTo(x + size, y); ctx.lineTo(x, y + size);
    ctx.moveTo(x + size / 2, y); ctx.lineTo(x + size / 2, y + size + 6); ctx.stroke();
  }

  private drawAlienOrganism(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, size, size);
  }

  private drawPowerUpItem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath();
    ctx.moveTo(x + size / 2, y); ctx.lineTo(x + size, y + size / 2); ctx.lineTo(x + size / 2, y + size); ctx.lineTo(x, y + size / 2);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
  }

  private drawAstralEcho(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + size, y + size); ctx.stroke();
  }
}