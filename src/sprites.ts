// Alle Grafiken entstehen prozedural und werden einmal in Offscreen-Canvases
// gebacken (inklusive Leuchten). Im Spiel wird nur noch drawImage aufgerufen.

import { view } from "./view";
import { ENEMY_COLOR, PICKUP_INFO, PickupKind, COLORS } from "./config";

export interface Sprite { c: HTMLCanvasElement; w: number; h: number; }
type Ctx = CanvasRenderingContext2D;

function bake(w: number, h: number, pad: number, draw: (g: Ctx, res: number) => void, boost = 1): Sprite {
  const res = Math.min(view.res * boost, 4);
  const c = document.createElement("canvas");
  c.width = Math.ceil((w + pad * 2) * res);
  c.height = Math.ceil((h + pad * 2) * res);
  const g = c.getContext("2d")!;
  g.scale(res, res);
  g.translate(w / 2 + pad, h / 2 + pad);
  g.lineJoin = "round"; g.lineCap = "round";
  draw(g, res);
  return { c, w: w + pad * 2, h: h + pad * 2 };
}

const glowOn = (g: Ctx, color: string, blur: number, res: number): void => { g.shadowColor = color; g.shadowBlur = blur * res; };
const glowOff = (g: Ctx): void => { g.shadowBlur = 0; g.shadowColor = "transparent"; };

// ---------- Einzelne Formen (Ursprung in der Mitte) ----------

function drawDrifter(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.drifter;
  g.beginPath();
  g.moveTo(0, 17); g.lineTo(16, -15); g.lineTo(5, -9); g.lineTo(0, -4); g.lineTo(-5, -9); g.lineTo(-16, -15);
  g.closePath();
  const grad = g.createLinearGradient(0, -15, 0, 17);
  grad.addColorStop(0, "#3a3a44"); grad.addColorStop(1, "#15151b");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 7, res); g.strokeStyle = col; g.lineWidth = 1.7; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 11); g.moveTo(-9, -9); g.lineTo(-3, 3); g.moveTo(9, -9); g.lineTo(3, 3); g.stroke();
  g.fillStyle = "#ff7ab8"; glowOn(g, "#ff7ab8", 6, res);
  g.beginPath(); g.arc(0, 12, 1.6, 0, 7); g.fill(); glowOff(g);
}

function drawCore(g: Ctx, res: number): void {
  const col = COLORS.amber;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); }
  g.closePath();
  g.fillStyle = "#14110a"; g.fill();
  glowOn(g, col, 8, res); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(255,176,32,0.35)"; g.lineWidth = 1;
  g.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); }
  g.stroke();
  glowOn(g, "#ff5a2a", 10, res); g.fillStyle = "#ffcf7a";
  g.beginPath(); g.moveTo(0, -8); g.lineTo(3, 0); g.lineTo(0, 8); g.lineTo(-3, 0); g.closePath(); g.fill(); glowOff(g);
}

function drawBeast(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.beast;
  g.beginPath();
  g.moveTo(-17, 2);
  g.bezierCurveTo(-18, -18, 18, -18, 17, 2);
  g.lineTo(12, 13); g.lineTo(8, 3); g.lineTo(4, 14); g.lineTo(0, 4); g.lineTo(-4, 14); g.lineTo(-8, 3); g.lineTo(-12, 13);
  g.closePath();
  const grad = g.createLinearGradient(0, -14, 0, 14);
  grad.addColorStop(0, "#5a2606"); grad.addColorStop(1, "#1d0d03");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 8, res); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke(); glowOff(g);
  g.beginPath(); g.moveTo(-13, -9); g.lineTo(-19, -18); g.lineTo(-8, -13); g.moveTo(13, -9); g.lineTo(19, -18); g.lineTo(8, -13);
  g.strokeStyle = col; g.lineWidth = 1.5; g.stroke();
  glowOn(g, "#ff3b1f", 8, res); g.fillStyle = "#ffe08a";
  g.beginPath(); g.ellipse(-6.5, -5, 3, 1.8, 0.35, 0, 7); g.ellipse(6.5, -5, 3, 1.8, -0.35, 0, 7); g.fill(); glowOff(g);
}

function drawSatellite(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.satellite;
  for (const s of [-1, 1]) {
    g.fillStyle = "#12305c"; g.strokeStyle = "#7fb2ff"; g.lineWidth = 1.2;
    g.beginPath(); g.rect(s * 8, -6, s * 13, 12); g.fill(); g.stroke();
    g.strokeStyle = "rgba(127,178,255,0.5)"; g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(s * 12.3, -6); g.lineTo(s * 12.3, 6); g.moveTo(s * 16.6, -6); g.lineTo(s * 16.6, 6); g.moveTo(s * 8, 0); g.lineTo(s * 21, 0);
    g.stroke();
  }
  g.fillStyle = "#262d3a";
  g.beginPath(); g.roundRect(-7, -9, 14, 18, 3); g.fill();
  glowOn(g, col, 6, res); g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); glowOff(g);
  g.beginPath(); g.arc(0, -13, 5, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.beginPath(); g.moveTo(0, -9); g.lineTo(0, -13); g.moveTo(0, 9); g.lineTo(0, 15); g.stroke();
  glowOn(g, "#ff4d6d", 6, res); g.fillStyle = "#ff8fa3";
  g.beginPath(); g.arc(0, 16, 1.5, 0, 7); g.fill(); glowOff(g);
  g.fillStyle = "#7fe9ff"; g.fillRect(-3, -4, 6, 2);
}

function drawPod(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.pod;
  g.strokeStyle = col; g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-12, 6); g.lineTo(-17, 15); g.lineTo(-13, 18); g.moveTo(12, 6); g.lineTo(17, 15); g.lineTo(13, 18);
  g.stroke();
  const grad = g.createRadialGradient(-4, -5, 2, 0, 0, 15);
  grad.addColorStop(0, "#77641a"); grad.addColorStop(1, "#1d1806");
  g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, 14, 0, 7); g.fill();
  glowOn(g, col, 8, res); g.lineWidth = 1.8; g.stroke(); glowOff(g);
  g.fillStyle = "#06222b"; g.strokeStyle = "#7fe9ff"; g.lineWidth = 1.1;
  g.beginPath(); g.ellipse(0, -1, 8, 5.5, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "rgba(127,233,255,0.6)";
  g.beginPath(); g.ellipse(-3, -2.5, 2.6, 1.3, -0.3, 0, 7); g.fill();
  g.fillStyle = "#fff1b8";
  g.beginPath(); g.arc(-9, 8, 1.3, 0, 7); g.arc(9, 8, 1.3, 0, 7); g.fill();
}

function drawHunter(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.hunter;
  g.beginPath();
  g.moveTo(0, 18); g.lineTo(5, 2); g.lineTo(18, -10); g.lineTo(15, -16); g.lineTo(5, -9); g.lineTo(0, -13);
  g.lineTo(-5, -9); g.lineTo(-15, -16); g.lineTo(-18, -10); g.lineTo(-5, 2);
  g.closePath();
  const grad = g.createLinearGradient(0, -16, 0, 18);
  grad.addColorStop(0, "#4a0d1c"); grad.addColorStop(1, "#17040a");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 8, res); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, 12); g.lineTo(0, -6); g.stroke();
  glowOn(g, "#ffb020", 6, res); g.fillStyle = "#ffe2a8";
  g.beginPath(); g.arc(-10, -13, 1.6, 0, 7); g.arc(10, -13, 1.6, 0, 7); g.fill(); glowOff(g);
}

function drawPlasma(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.plasma;
  g.strokeStyle = "rgba(176,114,255,0.75)"; g.lineWidth = 1.4;
  for (const x of [-9, -3, 3, 9]) {
    g.beginPath(); g.moveTo(x, 2);
    g.bezierCurveTo(x - 4, 8, x + 4, 11, x, 17); g.stroke();
  }
  const grad = g.createRadialGradient(0, -4, 1, 0, -2, 15);
  grad.addColorStop(0, "#f1dcff"); grad.addColorStop(0.35, "#8f4fe8"); grad.addColorStop(1, "rgba(60,20,120,0.55)");
  g.fillStyle = grad;
  g.beginPath(); g.moveTo(-14, 3); g.bezierCurveTo(-15, -17, 15, -17, 14, 3);
  g.quadraticCurveTo(7, 7, 0, 3); g.quadraticCurveTo(-7, 7, -14, 3); g.closePath(); g.fill();
  glowOn(g, col, 10, res); g.strokeStyle = "#d3b0ff"; g.lineWidth = 1.5; g.stroke(); glowOff(g);
}

function drawMonolith(g: Ctx, res: number): void {
  const w = 22, h = 52;
  glowOn(g, "#5f7bb8", 10, res);
  const grad = g.createLinearGradient(-w / 2, 0, w / 2, 0);
  grad.addColorStop(0, "#161b27"); grad.addColorStop(0.2, "#05060a"); grad.addColorStop(1, "#020204");
  g.fillStyle = grad; g.fillRect(-w / 2, -h / 2, w, h); glowOff(g);
  const sheen = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  sheen.addColorStop(0, "rgba(150,175,230,0.30)"); sheen.addColorStop(0.35, "rgba(150,175,230,0.03)"); sheen.addColorStop(1, "rgba(150,175,230,0)");
  g.fillStyle = sheen; g.fillRect(-w / 2, -h / 2, w, h);
  g.strokeStyle = "rgba(120,140,185,0.55)"; g.lineWidth = 0.8; g.strokeRect(-w / 2, -h / 2, w, h);
  g.strokeStyle = "rgba(215,230,255,0.8)"; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.stroke();
}

function drawEcho(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.echo;
  g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 0); g.lineTo(0, 11); g.lineTo(-7, 0); g.closePath();
  g.fillStyle = "rgba(20,40,60,0.8)"; g.fill();
  glowOn(g, col, 8, res); g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); glowOff(g);
  g.fillStyle = "#fff"; g.fillRect(-1, -1, 2, 2);
}

function rockPath(g: Ctx, r: number, seed: number): void {
  let s = seed;
  const rnd = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = r * (0.72 + rnd() * 0.32);
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.9);
  }
  g.closePath();
}

function drawAsteroid(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.asteroid;
  rockPath(g, 18, 7);
  const grad = g.createRadialGradient(-6, -7, 2, 0, 0, 20);
  grad.addColorStop(0, "#6b5a48"); grad.addColorStop(1, "#1c1611");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 6, res); g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); glowOff(g);
  g.fillStyle = "rgba(0,0,0,0.35)"; g.strokeStyle = "rgba(216,189,156,0.35)"; g.lineWidth = 0.8;
  for (const [x, y, r] of [[-5, -3, 4], [6, 4, 3], [2, -9, 2.2], [-8, 7, 2.4]]) {
    g.beginPath(); g.ellipse(x, y, r, r * 0.75, 0.3, 0, 7); g.fill(); g.stroke();
  }
}

function drawShard(g: Ctx, res: number): void {
  rockPath(g, 8, 19);
  g.fillStyle = "#3a2f25"; g.fill();
  glowOn(g, ENEMY_COLOR.shard, 6, res); g.strokeStyle = ENEMY_COLOR.shard; g.lineWidth = 1.3; g.stroke(); glowOff(g);
}

function drawMine(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.mine;
  g.strokeStyle = "#8a8f9e"; g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); g.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); }
  g.stroke();
  const grad = g.createRadialGradient(-3, -4, 1, 0, 0, 11);
  grad.addColorStop(0, "#5a5f6e"); grad.addColorStop(1, "#14161c");
  g.fillStyle = grad; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill();
  g.strokeStyle = "#aeb4c4"; g.lineWidth = 1.4; g.stroke();
  glowOn(g, col, 12, res); g.fillStyle = "#ffd0d0";
  g.beginPath(); g.arc(0, 0, 3.4, 0, 7); g.fill(); glowOff(g);
  g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, 6.5, 0, 7); g.stroke();
}

function drawLancer(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.lancer;
  g.beginPath();
  g.moveTo(0, 20); g.lineTo(4, 4); g.lineTo(11, -6); g.lineTo(6, -18); g.lineTo(0, -12); g.lineTo(-6, -18); g.lineTo(-11, -6); g.lineTo(-4, 4);
  g.closePath();
  const grad = g.createLinearGradient(0, -18, 0, 20);
  grad.addColorStop(0, "#0d3b36"); grad.addColorStop(1, "#04110f");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 8, res); g.strokeStyle = col; g.lineWidth = 1.7; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 16); g.stroke();
  glowOn(g, "#ff4d6d", 8, res); g.fillStyle = "#ffc2cc";
  g.beginPath(); g.arc(0, 17, 1.8, 0, 7); g.fill(); glowOff(g);
}

function drawPrism(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.prism;
  const pts: Array<[number, number]> = [[0, -17], [15, -4], [9, 15], [-9, 15], [-15, -4]];
  g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.closePath();
  const grad = g.createLinearGradient(-15, -17, 15, 15);
  grad.addColorStop(0, "rgba(220,250,255,0.75)"); grad.addColorStop(0.5, "rgba(70,150,200,0.45)"); grad.addColorStop(1, "rgba(20,40,90,0.6)");
  g.fillStyle = grad; g.fill();
  glowOn(g, col, 9, res); g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 0.9;
  g.beginPath(); pts.forEach(([x, y]) => { g.moveTo(0, 1); g.lineTo(x, y); }); g.stroke();
}

function drawWisp(g: Ctx, res: number): void {
  const col = ENEMY_COLOR.wisp;
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 10);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.4, col); grad.addColorStop(1, "rgba(120,200,40,0)");
  glowOn(g, col, 10, res); g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, 10, 0, 7); g.fill(); glowOff(g);
  g.strokeStyle = "rgba(200,255,106,0.8)"; g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, 0, 7, 0.4, 2.4); g.stroke();
  g.beginPath(); g.arc(0, 0, 7, 3.6, 5.4); g.stroke();
}

function drawShip(g: Ctx, res: number): void {
  // NOSTOS: schlanker Rumpf mit Habitatring (eigener Entwurf)
  g.strokeStyle = "rgba(160,200,230,0.55)"; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 2, 21, 7.5, 0, Math.PI, Math.PI * 2); g.stroke();
  for (const s of [-1, 1]) {
    g.fillStyle = "#2a3140"; g.strokeStyle = "#9fb4cc"; g.lineWidth = 1.2;
    g.beginPath(); g.roundRect(s * 9 - 3.5, 12, 7, 14, 2); g.fill(); g.stroke();
  }
  g.beginPath();
  g.moveTo(0, -30); g.bezierCurveTo(5, -24, 6, -14, 6, -6);
  g.lineTo(6, 14); g.lineTo(10, 22); g.lineTo(-10, 22); g.lineTo(-6, 14); g.lineTo(-6, -6);
  g.bezierCurveTo(-6, -14, -5, -24, 0, -30); g.closePath();
  const grad = g.createLinearGradient(-8, 0, 8, 0);
  grad.addColorStop(0, "#7c8799"); grad.addColorStop(0.45, "#f3f6fa"); grad.addColorStop(1, "#5f6a7c");
  g.fillStyle = grad; g.fill();
  glowOn(g, COLORS.player, 8, res); g.strokeStyle = "#ffffff"; g.lineWidth = 1.4; g.stroke(); glowOff(g);
  g.strokeStyle = "rgba(40,50,70,0.6)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(-6, -4); g.lineTo(6, -4); g.moveTo(-6, 9); g.lineTo(6, 9); g.stroke();
  glowOn(g, COLORS.player, 6, res); g.fillStyle = "#0b3d4d"; g.strokeStyle = COLORS.player; g.lineWidth = 1;
  g.beginPath(); g.ellipse(0, -17, 2.8, 5, 0, 0, 7); g.fill(); g.stroke(); glowOff(g);
  glowOn(g, COLORS.player, 6, res); g.strokeStyle = "#e6f6ff"; g.lineWidth = 2.4;
  g.beginPath(); g.ellipse(0, 2, 21, 7.5, 0, 0, Math.PI); g.stroke(); glowOff(g);
  g.fillStyle = "#ffb020";
  g.beginPath(); g.arc(-21, 2, 1.5, 0, 7); g.arc(21, 2, 1.5, 0, 7); g.fill();
}

function drawBossHull(g: Ctx, res: number): void {
  const w = 230, h = 100;
  g.beginPath();
  g.moveTo(-w / 2 + 22, -h / 2); g.lineTo(w / 2 - 22, -h / 2); g.lineTo(w / 2, -h / 2 + 22); g.lineTo(w / 2, h / 2 - 26);
  g.lineTo(w / 2 - 34, h / 2); g.lineTo(34, h / 2); g.lineTo(22, h / 2 - 12); g.lineTo(-22, h / 2 - 12); g.lineTo(-34, h / 2);
  g.lineTo(-w / 2 + 34, h / 2); g.lineTo(-w / 2, h / 2 - 26); g.lineTo(-w / 2, -h / 2 + 22);
  g.closePath();
  const grad = g.createLinearGradient(0, -h / 2, 0, h / 2);
  grad.addColorStop(0, "#1b1d24"); grad.addColorStop(0.5, "#0b0c10"); grad.addColorStop(1, "#16171c");
  glowOn(g, "rgba(255,120,20,0.6)", 22, res); g.fillStyle = grad; g.fill(); glowOff(g);
  g.strokeStyle = "#474a56"; g.lineWidth = 2.5; g.stroke();
  g.strokeStyle = "rgba(255,176,32,0.55)"; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-w / 2 + 10, -h / 2 + 26); g.lineTo(-56, -h / 2 + 26); g.moveTo(w / 2 - 10, -h / 2 + 26); g.lineTo(56, -h / 2 + 26); g.stroke();
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? "rgba(255,176,32,0.20)" : "rgba(255,255,255,0.06)";
      g.fillRect(s * (62 + i * 9) - 3, -8, 6, 34);
    }
    g.fillStyle = "#08090c"; g.strokeStyle = "#5c6070"; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(s * 84 - 12, h / 2 - 22, 24, 16, 3); g.fill(); g.stroke();
  }
  g.fillStyle = "#050507";
  g.beginPath(); g.arc(0, -2, 37, 0, 7); g.fill();
  g.strokeStyle = "#8a8f9e"; g.lineWidth = 4; g.stroke();
  g.strokeStyle = "rgba(255,176,32,0.7)"; g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, -2, 31, 0, 7); g.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    g.beginPath(); g.moveTo(Math.cos(a) * 31, -2 + Math.sin(a) * 31); g.lineTo(Math.cos(a) * 37, -2 + Math.sin(a) * 37); g.stroke();
  }
}

function drawPickup(kind: PickupKind) {
  return (g: Ctx, res: number): void => {
    const info = PICKUP_INFO[kind];
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); }
    g.closePath();
    g.fillStyle = "rgba(6,10,16,0.92)"; g.fill();
    glowOn(g, info.color, 10, res); g.strokeStyle = info.color; g.lineWidth = 2; g.stroke(); glowOff(g);
    g.fillStyle = "#ffffff"; g.font = "700 13px 'Chakra Petch', system-ui, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(info.glyph, 0, 1);
  };
}

function makeGlow(color: string): Sprite {
  return bake(64, 64, 0, (g) => {
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 32);
    grad.addColorStop(0, color); grad.addColorStop(0.25, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.9; g.fillStyle = grad; g.fillRect(-32, -32, 64, 64);
    const core = g.createRadialGradient(0, 0, 0, 0, 0, 10);
    core.addColorStop(0, "rgba(255,255,255,0.9)"); core.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = core; g.fillRect(-12, -12, 24, 24);
  }, 0.6);
}

function scaled(fn: (g: Ctx, res: number) => void, k: number) {
  return (g: Ctx, res: number): void => { g.scale(k, k); g.lineWidth = 1; fn(g, res / 1); };
}

// ---------- Öffentliche Sammlung ----------

export const S = {
  ship: null as unknown as Sprite,
  drifter: null as unknown as Sprite,
  core: null as unknown as Sprite,
  beast: null as unknown as Sprite,
  satellite: null as unknown as Sprite,
  pod: null as unknown as Sprite,
  hunter: null as unknown as Sprite,
  plasma: null as unknown as Sprite,
  monolith: null as unknown as Sprite,
  echo: null as unknown as Sprite,
  asteroid: null as unknown as Sprite,
  shard: null as unknown as Sprite,
  mine: null as unknown as Sprite,
  lancer: null as unknown as Sprite,
  prism: null as unknown as Sprite,
  wisp: null as unknown as Sprite,
  boss: null as unknown as Sprite,
  guardians: [] as Sprite[],
  pickups: {} as Record<PickupKind, Sprite>,
};

const glowCache = new Map<string, Sprite>();
export function glow(color: string): Sprite {
  let s = glowCache.get(color);
  if (!s) { s = makeGlow(color); glowCache.set(color, s); }
  return s;
}

export function bakeSprites(): void {
  glowCache.clear();
  S.ship = bake(48, 62, 12, drawShip);
  const B = 1.3; // Reserve für die vergrößerte Darstellung im Spiel
  S.drifter = bake(36, 36, 10, drawDrifter, B);
  S.core = bake(36, 36, 10, drawCore, B);
  S.beast = bake(40, 36, 10, drawBeast, B);
  S.satellite = bake(46, 36, 10, drawSatellite, B);
  S.pod = bake(38, 38, 10, drawPod, B);
  S.hunter = bake(40, 38, 10, drawHunter, B);
  S.plasma = bake(34, 38, 12, drawPlasma, B);
  S.monolith = bake(24, 54, 12, drawMonolith, B);
  S.echo = bake(18, 24, 10, drawEcho);
  S.asteroid = bake(40, 38, 10, drawAsteroid, B);
  S.shard = bake(18, 18, 8, drawShard);
  S.mine = bake(36, 36, 12, drawMine, B);
  S.lancer = bake(26, 42, 10, drawLancer, B);
  S.prism = bake(34, 36, 10, drawPrism, B);
  S.wisp = bake(22, 22, 12, drawWisp, B);
  S.boss = bake(232, 102, 30, drawBossHull);
  S.guardians = [
    bake(130, 116, 26, scaled(drawBeast, 3.1)),
    bake(60, 130, 26, scaled(drawMonolith, 2.3)),
    bake(124, 124, 26, scaled(drawPod, 3.1)),
    bake(126, 124, 26, scaled(drawHunter, 3.2)),
    bake(126, 116, 26, scaled(drawAsteroid, 3.1)),
    bake(110, 116, 26, scaled(drawPrism, 3.3)),
  ];
  (Object.keys(PICKUP_INFO) as PickupKind[]).forEach((k) => { S.pickups[k] = bake(28, 28, 10, drawPickup(k)); });
}

export function drawSprite(ctx: Ctx, s: Sprite, x: number, y: number, scale = 1, rot = 0): void {
  if (rot !== 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.drawImage(s.c, (-s.w / 2) * scale, (-s.h / 2) * scale, s.w * scale, s.h * scale);
    ctx.restore();
  } else {
    ctx.drawImage(s.c, x - (s.w / 2) * scale, y - (s.h / 2) * scale, s.w * scale, s.h * scale);
  }
}
