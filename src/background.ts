// Hintergründe: Parallax-Sterne und je Akt eine eigene Szene.

import { view } from "./view";

type Ctx = CanvasRenderingContext2D;

interface Star { x: number; y: number; z: number; s: number; tw: number; tint: string; }

const NEBULA: string[][] = [
  ["rgba(255,150,60,0.10)", "rgba(80,120,255,0.07)"],
  ["rgba(255,140,50,0.12)", "rgba(120,60,160,0.06)"],
  ["rgba(110,140,200,0.09)", "rgba(60,90,160,0.07)"],
  ["rgba(255,120,40,0.08)", "rgba(200,60,60,0.06)"],
  ["rgba(120,90,255,0.10)", "rgba(40,200,220,0.07)"],
  ["rgba(200,80,255,0.09)", "rgba(255,120,60,0.08)"],
];

function seeded(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

export class Background {
  private stars: Star[] = [];
  private t = 0;
  private speed = 1;
  private giantSmall: HTMLCanvasElement | null = null;
  private giantBig: HTMLCanvasElement | null = null;
  private earth: HTMLCanvasElement | null = null;
  private moon: HTMLCanvasElement | null = null;
  public reduced = false;

  constructor() {
    const tints = ["#ffffff", "#ffffff", "#cfe4ff", "#ffe9c9", "#ffd0d0"];
    for (let i = 0; i < 190; i++) {
      const z = 0.15 + Math.pow(Math.random(), 2.2) * 0.85;
      this.stars.push({ x: Math.random(), y: Math.random(), z, s: 0.6 + z * 1.6, tw: Math.random() * 6.28, tint: tints[i % tints.length] });
    }
  }

  /** Nach Größenänderung neu backen. */
  rebuild(): void {
    this.giantSmall = this.bakeGiant(74, 5);
    this.giantBig = this.bakeGiant(Math.min(300, view.w * 0.3), 9);
    this.earth = this.bakeEarth(34);
    this.moon = this.bakeMoon();
  }

  private canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
    const res = Math.min(view.res, 2.5);
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
    const g = c.getContext("2d")!;
    g.scale(res, res);
    return [c, g];
  }

  private bakeGiant(r: number, seed: number): HTMLCanvasElement {
    const pad = r * 0.35;
    const [c, g] = this.canvas((r + pad) * 2, (r + pad) * 2);
    const rnd = seeded(seed);
    g.translate(r + pad, r + pad);
    const halo = g.createRadialGradient(0, 0, r * 0.9, 0, 0, r + pad);
    halo.addColorStop(0, "rgba(255,170,90,0.28)"); halo.addColorStop(1, "rgba(255,170,90,0)");
    g.fillStyle = halo; g.fillRect(-r - pad, -r - pad, (r + pad) * 2, (r + pad) * 2);
    g.save();
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.clip();
    g.rotate(-0.22);
    const base = g.createLinearGradient(0, -r, 0, r);
    const cols = ["#3a2416", "#8a4a22", "#c9884a", "#e9c58f", "#b9703a", "#f0d7a8", "#9a5a2e", "#6d3a1e", "#2c1b12"];
    cols.forEach((col, i) => base.addColorStop(i / (cols.length - 1), col));
    g.fillStyle = base; g.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    const bands = Math.round(14 + r / 12);
    for (let i = 0; i < bands; i++) {
      const y = -r + rnd() * 2 * r;
      const h = (0.02 + rnd() * 0.07) * r;
      g.fillStyle = rnd() < 0.5 ? `rgba(40,20,10,${0.08 + rnd() * 0.2})` : `rgba(255,235,200,${0.05 + rnd() * 0.14})`;
      g.beginPath();
      g.moveTo(-r * 1.3, y);
      for (let x = -r * 1.3; x <= r * 1.3; x += r / 6) g.lineTo(x, y + Math.sin(x / (r * 0.3) + i) * h * 0.35);
      for (let x = r * 1.3; x >= -r * 1.3; x -= r / 6) g.lineTo(x, y + h + Math.sin(x / (r * 0.25) + i * 2) * h * 0.35);
      g.closePath(); g.fill();
    }
    g.fillStyle = "rgba(190,70,30,0.85)";
    g.beginPath(); g.ellipse(r * 0.3, r * 0.28, r * 0.2, r * 0.11, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,210,170,0.4)"; g.lineWidth = Math.max(1, r * 0.012);
    g.beginPath(); g.ellipse(r * 0.3, r * 0.28, r * 0.24, r * 0.14, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    const shade = g.createRadialGradient(-r * 0.45, -r * 0.35, r * 0.2, 0, 0, r * 1.02);
    shade.addColorStop(0, "rgba(255,255,255,0.06)"); shade.addColorStop(0.55, "rgba(0,0,0,0.25)"); shade.addColorStop(1, "rgba(2,3,8,0.96)");
    g.fillStyle = shade; g.beginPath(); g.arc(0, 0, r + 0.5, 0, Math.PI * 2); g.fill();
    return c;
  }

  private bakeEarth(r: number): HTMLCanvasElement {
    const pad = 14;
    const [c, g] = this.canvas((r + pad) * 2, (r + pad) * 2);
    g.translate(r + pad, r + pad);
    const halo = g.createRadialGradient(0, 0, r * 0.9, 0, 0, r + pad);
    halo.addColorStop(0, "rgba(110,180,255,0.4)"); halo.addColorStop(1, "rgba(110,180,255,0)");
    g.fillStyle = halo; g.fillRect(-r - pad, -r - pad, (r + pad) * 2, (r + pad) * 2);
    g.save(); g.beginPath(); g.arc(0, 0, r, 0, 7); g.clip();
    g.fillStyle = "#1c4f9c"; g.fillRect(-r, -r, r * 2, r * 2);
    const rnd = seeded(23);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 3 ? "rgba(70,140,90,0.8)" : "rgba(180,150,100,0.7)";
      g.beginPath(); g.ellipse((rnd() - 0.5) * r * 1.6, (rnd() - 0.5) * r * 1.6, r * (0.12 + rnd() * 0.25), r * (0.08 + rnd() * 0.16), rnd() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 12; i++) {
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath(); g.ellipse((rnd() - 0.5) * r * 1.8, (rnd() - 0.5) * r * 1.8, r * (0.15 + rnd() * 0.3), r * 0.05, rnd() - 0.5, 0, 7); g.fill();
    }
    g.restore();
    const shade = g.createRadialGradient(-r * 0.5, -r * 0.4, r * 0.2, 0, 0, r);
    shade.addColorStop(0, "rgba(255,255,255,0.1)"); shade.addColorStop(0.6, "rgba(0,0,0,0.3)"); shade.addColorStop(1, "rgba(0,0,8,0.95)");
    g.fillStyle = shade; g.beginPath(); g.arc(0, 0, r + 0.5, 0, 7); g.fill();
    return c;
  }

  private bakeMoon(): HTMLCanvasElement {
    const w = view.w, h = 170;
    const [c, g] = this.canvas(w, h);
    const R = w * 1.4;
    g.beginPath(); g.arc(w / 2, R + 30, R, 0, 7); g.clip();
    const grad = g.createLinearGradient(0, 20, 0, h);
    grad.addColorStop(0, "#8f9299"); grad.addColorStop(0.25, "#4a4d54"); grad.addColorStop(1, "#0d0e12");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    const rnd = seeded(5);
    for (let i = 0; i < 46; i++) {
      const x = rnd() * w, y = 45 + rnd() * 120, rr = 6 + rnd() * 34, ry = rr * (0.16 + (y / h) * 0.2);
      g.fillStyle = `rgba(0,0,0,${0.18 + rnd() * 0.22})`;
      g.beginPath(); g.ellipse(x, y, rr, ry, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(220,225,235,0.22)"; g.lineWidth = 1;
      g.beginPath(); g.ellipse(x, y + ry * 0.15, rr, ry, 0, 0.1, Math.PI - 0.1); g.stroke();
    }
    return c;
  }

  update(dt: number, act: number, boost: number): void {
    this.t += dt;
    const target = (act === 4 ? 7 : act === 5 ? 2.2 : 1) * boost;
    this.speed += (target - this.speed) * Math.min(1, dt * 1.5);
    const v = dt * 0.035 * this.speed;
    for (const s of this.stars) {
      s.y += v * s.z;
      if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
    }
  }

  private blob(ctx: Ctx, x: number, y: number, r: number, color: string): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  private image(ctx: Ctx, c: HTMLCanvasElement | null, cx: number, cy: number, size: number): void {
    if (c) ctx.drawImage(c, cx - size / 2, cy - size / 2, size, size * (c.height / c.width));
  }

  draw(ctx: Ctx, act: number, sector: number, finale: boolean): void {
    const W = view.w, H = view.h, t = this.t;
    ctx.fillStyle = "#020308";
    ctx.fillRect(0, 0, W, H);

    const neb = NEBULA[act] ?? NEBULA[0];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.blob(ctx, W * (0.22 + Math.sin(t * 0.03) * 0.04), H * 0.3, Math.max(W, H) * 0.55, neb[0]);
    this.blob(ctx, W * (0.8 + Math.cos(t * 0.025) * 0.04), H * 0.72, Math.max(W, H) * 0.5, neb[1]);
    ctx.restore();

    // Sterne
    const streak = this.speed > 2.5 ? (this.speed - 1.5) * 5 : 0;
    for (const s of this.stars) {
      const a = 0.35 + s.z * 0.55 + Math.sin(t * 2 + s.tw) * 0.12;
      ctx.globalAlpha = a < 0 ? 0 : a > 1 ? 1 : a;
      ctx.fillStyle = s.tint;
      if (streak > 0) ctx.fillRect(s.x * W, s.y * H - streak * s.z * 3, s.s * 0.8, s.s + streak * s.z * 3);
      else ctx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    if (act <= 1) this.sceneDawn(ctx, W, H, t);
    else if (act === 2) this.sceneMoon(ctx, W, H, t);
    else if (act === 3) this.sceneApproach(ctx, W, H, t);
    else if (act === 4) this.sceneGate(ctx, W, H, t);
    else if (act === 5) {
      if (sector >= 3 || finale) this.sceneSpiral(ctx, W, H, t);
      else this.image(ctx, this.giantBig, W * 0.76, H * 0.36, Math.min(300, W * 0.3) * 2.7);
    }
  }

  private sceneDawn(ctx: Ctx, W: number, H: number, t: number): void {
    const R = W * 1.25;
    const cy = H + R - 92;
    const sunX = W * 0.3, sunY = H - 96 - Math.min(40, t * 0.5);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.blob(ctx, sunX, sunY, H * 0.55, "rgba(255,150,50,0.42)");
    this.blob(ctx, sunX, sunY, H * 0.16, "rgba(255,235,190,0.85)");
    ctx.restore();
    const atmo = ctx.createRadialGradient(W / 2, cy, R - 4, W / 2, cy, R + 60);
    atmo.addColorStop(0, "rgba(255,170,80,0.55)"); atmo.addColorStop(0.3, "rgba(255,120,60,0.18)"); atmo.addColorStop(1, "rgba(255,120,60,0)");
    ctx.fillStyle = atmo; ctx.fillRect(0, H - 220, W, 220);
    ctx.fillStyle = "#050406";
    ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,200,130,0.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W / 2, cy, R, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
  }

  private sceneMoon(ctx: Ctx, W: number, H: number, t: number): void {
    this.image(ctx, this.earth, W * 0.8 + Math.sin(t * 0.02) * 6, H * 0.2, 96);
    if (this.moon) ctx.drawImage(this.moon, 0, H - 150, W, 170);
  }

  private sceneApproach(ctx: Ctx, W: number, H: number, t: number): void {
    const x = W * 0.82, y = H * 0.27 + Math.sin(t * 0.05) * 5;
    this.image(ctx, this.giantSmall, x, y, 74 * 2.7);
    const moons: Array<[number, number, number, string]> = [[-150, 30, 4, "#d9c7a0"], [-96, -44, 2.6, "#c9d2e0"], [120, 66, 3.2, "#e8b98a"]];
    for (const [dx, dy, r, col] of moons) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x + dx + Math.sin(t * 0.04 + dx) * 6, y + dy, r, 0, 7); ctx.fill();
    }
  }

  private sceneGate(ctx: Ctx, W: number, H: number, t: number): void {
    const cx = W / 2, cy = H * 0.4;
    const n = this.reduced ? 12 : 26;
    const sp = this.reduced ? 0.07 : 0.3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const p = (t * sp + i / n) % 1;
      const k = p * p;
      const side = i % 2 ? 1 : -1;
      const x = cx + side * (20 + k * W * 0.62);
      const hh = 12 + k * H * 0.75;
      const hue = (i * 47 + t * 14) % 360;
      ctx.globalAlpha = Math.sin(p * Math.PI) * (this.reduced ? 0.22 : 0.5);
      const lg = ctx.createLinearGradient(0, cy - hh, 0, cy + hh);
      lg.addColorStop(0, `hsla(${hue}, 90%, 60%, 0)`); lg.addColorStop(0.5, `hsl(${hue}, 90%, 62%)`); lg.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      ctx.fillStyle = lg;
      const lw = 1.5 + k * 22;
      ctx.fillRect(x - lw / 2, cy - hh, lw, hh * 2);
    }
    ctx.globalAlpha = 1;
    this.blob(ctx, cx, cy, H * 0.3, "rgba(255,240,220,0.14)");
    ctx.restore();
  }

  private sceneSpiral(ctx: Ctx, W: number, H: number, t: number): void {
    const cx = W / 2, cy = H * 0.42;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.blob(ctx, cx, cy, H * 0.6, "rgba(160,90,255,0.16)");
    if (!this.reduced) {
      const max = Math.hypot(W, H) * 0.6;
      const n = 16;
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const r = ((i / n) * max + t * 60) % max;
        const k = r / max;
        ctx.globalAlpha = (1 - k) * k * 1.1;
        ctx.strokeStyle = `hsl(${(i * 22 + t * 18) % 360}, 80%, 62%)`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.62, t * 0.08 + i * 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
