// Einstellungen, Bestwerte und Fortschritt im lokalen Speicher des Browsers.

import { Difficulty } from "./config";

export type ControlMode = "AUTO" | "POINTER" | "KEYS";

export interface SaveData {
  difficulty: Difficulty;
  controls: ControlMode;
  sfx: number;
  music: number;
  crt: boolean;
  shake: boolean;
  reduced: boolean;
  best: Record<Difficulty, number>;
  unlocked: number;   // höchster erreichter Akt
  warp: boolean;
  mosaic: boolean;    // verstecktes Extra
  rainbow: boolean;   // verstecktes Extra
}

const KEY = "odyssey-invaders.v2";

function defaults(): SaveData {
  let reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* ohne matchMedia */ }
  return {
    difficulty: "NOMINAL", controls: "AUTO", sfx: 0.7, music: 0.5,
    crt: true, shake: true, reduced,
    best: { EASY: 0, NOMINAL: 0, HARDCORE: 0 }, unlocked: 1, warp: false, mosaic: false, rainbow: false,
  };
}

export function loadSave(): SaveData {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SaveData>;
      Object.assign(d, p);
      d.best = Object.assign({ EASY: 0, NOMINAL: 0, HARDCORE: 0 }, p.best);
    }
  } catch { /* Speicher nicht verfügbar: Standardwerte */ }
  if (!["EASY", "NOMINAL", "HARDCORE"].includes(d.difficulty)) d.difficulty = "NOMINAL";
  d.unlocked = Math.min(7, Math.max(1, Math.floor(d.unlocked) || 1));
  return d;
}

export function storeSave(d: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignorieren */ }
}
