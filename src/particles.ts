// Partikel als einfacher Objekt-Pool, getrennt von der Spiellogik.

import { glow, drawSprite } from "./sprites";

const SPARK = 0, DEBRIS = 1, RING = 2, GLOW = 3, TEXT = 4;

interface P {
  kind: number; x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; drag: number; text: string;
}

const MAX = 700;
const MOSAIC = ["#ffb020", "#7fe9ff", "#ff4d6d", "#5ef2c8", "#c79bff", "#ffffff"];

export class Particles {
  private list: P[] = [];
  private pool: P[] = [];
  public reduced = false;
  public mosaic = false;

  private add(kind: number, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, drag = 0, text = ""): void {
    if (this.list.length >= MAX) return;
    const p = this.pool.pop() ?? ({} as P);
    p.kind = kind; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
    p.size = size; p.color = color; p.drag = drag; p.text = text;
    this.list.push(p);
  }

  clear(): void { this.pool.push(...this.list); this.list.length = 0; }
  get count(): number { return this.list.length; }

  explosion(x: number, y: number, color: string, power = 1): void {
    const n = Math.round((this.reduced ? 9 : 18) * power);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (60 + Math.random() * 260) * Math.sqrt(power);
      this.add(SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.25 + Math.random() * 0.45, 1.6, color, 2.4);
    }
    for (let i = 0; i < (this.mosaic ? n : n / 3); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 140;
      const tile = this.mosaic ? MOSAIC[Math.floor(Math.random() * MOSAIC.length)] : color;
      this.add(DEBRIS, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.5 + Math.random() * 0.6, (this.mosaic ? 5 : 2) + Math.random() * 2.5, tile, 1.2);
    }
    this.add(RING, x, y, 0, 0, 0.35 + power * 0.1, 26 * power, color);
    this.add(GLOW, x, y, 0, 0, 0.22, 46 * power, color);
  }

  hit(x: number, y: number, color: string): void {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      this.add(SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.15 + Math.random() * 0.2, 1.3, color, 3);
    }
  }

  ring(x: number, y: number, color: string, size: number, life = 0.5): void { this.add(RING, x, y, 0, 0, life, size, color); }

  thrust(x: number, y: number): void {
    this.add(GLOW, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 24, 130 + Math.random() * 90, 0.16 + Math.random() * 0.14, 9, "#7fe9ff");
  }

  text(x: number, y: number, text: string, color: string): void { this.add(TEXT, x, y, 0, -46, 0.9, 15, color, 0, text); }

  update(dt: number): void {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) { l[i] = l[l.length - 1]; l.pop(); this.pool.push(p); continue; }
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const l = this.list;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      const k = p.life / p.max;
      if (p.kind === SPARK) {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
      } else if (p.kind === DEBRIS) {
        ctx.globalAlpha = k * 0.9;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.kind === RING) {
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color; ctx.lineWidth = 1 + k * 2.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.15 - k) + 4, 0, Math.PI * 2); ctx.stroke();
      } else if (p.kind === GLOW) {
        ctx.globalAlpha = k * 0.85;
        drawSprite(ctx, glow(p.color), p.x, p.y, (p.size / 32) * (0.6 + 0.4 * k));
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "center";
    ctx.font = "700 15px 'Chakra Petch', system-ui, sans-serif";
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      if (p.kind !== TEXT) continue;
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 2);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }
}
