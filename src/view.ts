// Logisches Spielfeld: feste Höhe, Breite folgt dem Seitenverhältnis.
// Alle Spielkoordinaten sind logische Einheiten, unabhängig von der Auflösung.

export const view = { w: 1600, h: 900, scale: 1, dpr: 1, res: 1 };

const BASE_H = 900;
const MIN_W = 520;

export function fitCanvas(canvas: HTMLCanvasElement): void {
  const cssW = Math.max(200, window.innerWidth);
  const cssH = Math.max(200, window.innerHeight);
  const scale = Math.min(cssH / BASE_H, cssW / MIN_W);
  view.scale = scale;
  view.w = cssW / scale;
  view.h = cssH / scale;
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  view.res = scale * view.dpr;
  canvas.width = Math.round(cssW * view.dpr);
  canvas.height = Math.round(cssH * view.dpr);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
}

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
