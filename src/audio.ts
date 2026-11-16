// Prozedurale Klangerzeugung: Effekte und generative Musik, ohne Audiodateien.

interface ActMusic {
  root: number;        // MIDI-Grundton
  scale: number[];
  bpm: number;
  chords: number[];    // Stufen der Akkordfolge
  arp: OscillatorType;
  pulse: boolean;      // tiefer Puls auf den Zählzeiten
  seed: number;
}

const MUSIC: ActMusic[] = [
  { root: 45, scale: [0, 2, 3, 7, 10], bpm: 72, chords: [0, 3, 0, 4], arp: "sine", pulse: false, seed: 11 },      // Titel
  { root: 43, scale: [0, 2, 4, 7, 9], bpm: 84, chords: [0, 3, 4, 0], arp: "triangle", pulse: false, seed: 3 },   // I
  { root: 45, scale: [0, 2, 3, 7, 8], bpm: 92, chords: [0, 2, 0, 4], arp: "triangle", pulse: false, seed: 7 },   // II
  { root: 41, scale: [0, 1, 3, 6, 7], bpm: 104, chords: [0, 1, 0, 3], arp: "square", pulse: true, seed: 19 },    // III
  { root: 47, scale: [0, 2, 4, 6, 9], bpm: 124, chords: [0, 2, 3, 4], arp: "sawtooth", pulse: true, seed: 29 },  // IV
  { root: 40, scale: [0, 1, 4, 5, 7], bpm: 132, chords: [0, 1, 3, 1], arp: "square", pulse: true, seed: 41 },    // V
];

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private echo!: GainNode;
  private noise!: AudioBuffer;
  private sfxVol = 0.7;
  private musicVol = 0.5;
  private track = -1;
  private pattern: number[] = [];
  private step = 0;
  private nextStep = 0;
  private intensity = 0;
  private lastShot = 0;
  private lastEnemyShot = 0;
  private lastBoom = 0;
  public muted = false;

  /** Muss aus einer Nutzeraktion heraus aufgerufen werden. */
  unlock(): void {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master = ctx.createGain();
      this.master.connect(comp); comp.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
      // Einfacher Raumhall über eine rückgekoppelte Verzögerung
      const delay = ctx.createDelay(1); delay.delayTime.value = 0.31;
      const fb = ctx.createGain(); fb.gain.value = 0.38;
      const damp = ctx.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 2200;
      this.echo = ctx.createGain(); this.echo.gain.value = 0.5;
      this.echo.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay);
      damp.connect(this.musicBus);
      const len = ctx.sampleRate;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setVolumes(sfx: number, music: number): void {
    this.sfxVol = sfx; this.musicVol = music;
    this.applyVolumes();
  }

  setMuted(m: boolean): void { this.muted = m; this.applyVolumes(); }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.9, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.55, t, 0.05);
  }

  /** Spiel pausiert: Musik leiser, Effekte bleiben für Menütöne. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(this.musicVol * (on ? 0.18 : 0.55), this.ctx.currentTime, 0.2);
  }

  suspend(): void { if (this.ctx && this.ctx.state === "running") void this.ctx.suspend(); }
  resume(): void { if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume(); }

  // ---------- Bausteine ----------

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, delay = 0, bus?: AudioNode, attack = 0.004): void {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus ?? this.sfxBus);
    o.start(t); o.stop(t + dur + 0.03);
  }

  private burst(dur: number, f0: number, f1: number, gain: number, type: BiquadFilterType = "lowpass", q = 0.8, delay = 0): void {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    src.loop = true; src.loopStart = Math.random() * 0.5;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t, Math.random() * 0.4); src.stop(t + dur + 0.03);
  }

  // ---------- Effekte ----------

  shoot(tri: boolean): void {
    const ctx = this.ctx; if (!ctx) return;
    if (ctx.currentTime - this.lastShot < 0.06) return;
    this.lastShot = ctx.currentTime;
    const f = tri ? 1250 : 980;
    this.tone("triangle", f + Math.random() * 60, 240, 0.09, 0.07);
  }

  enemyShoot(): void {
    const ctx = this.ctx; if (!ctx) return;
    if (ctx.currentTime - this.lastEnemyShot < 0.09) return;
    this.lastEnemyShot = ctx.currentTime;
    this.tone("sawtooth", 210, 60, 0.16, 0.035);
  }

  /** size: 0 klein, 1 mittel, 2 groß */
  explode(size: number): void {
    const ctx = this.ctx; if (!ctx) return;
    if (size < 1 && ctx.currentTime - this.lastBoom < 0.035) return;
    this.lastBoom = ctx.currentTime;
    const d = 0.28 + size * 0.35;
    this.burst(d, 1800 - size * 500, 90, 0.26 + size * 0.14);
    this.tone("sine", 150 - size * 30, 38, d * 0.9, 0.3 + size * 0.15);
    if (size >= 2) this.burst(1.4, 600, 40, 0.3, "lowpass", 0.5, 0.08);
  }

  hull(): void {
    this.burst(0.5, 900, 60, 0.5);
    this.tone("sawtooth", 180, 40, 0.45, 0.3);
    this.tone("square", 620, 310, 0.25, 0.08, 0.05);
  }

  shieldBreak(): void {
    this.tone("sine", 1400, 420, 0.4, 0.16);
    this.tone("triangle", 2100, 700, 0.3, 0.07, 0.02);
    this.burst(0.2, 5000, 1500, 0.08, "highpass");
  }

  pickup(): void {
    [0, 4, 7, 12].forEach((s, i) => this.tone("triangle", mtof(72 + s), mtof(72 + s), 0.16, 0.1, i * 0.055));
  }

  emp(): void {
    this.tone("sine", 90, 1800, 0.55, 0.22);
    this.burst(0.7, 300, 6000, 0.16, "bandpass", 2);
  }

  ui(): void { this.tone("square", 660, 880, 0.05, 0.035); }
  deny(): void { this.tone("sawtooth", 190, 90, 0.25, 0.09); }

  hitMetal(): void {
    const ctx = this.ctx; if (!ctx) return;
    if (ctx.currentTime - this.lastBoom < 0.04) return;
    this.lastBoom = ctx.currentTime;
    this.tone("square", 320 + Math.random() * 80, 140, 0.07, 0.06);
    this.burst(0.08, 3000, 800, 0.08, "bandpass", 1.5);
  }

  waveClear(): void {
    [0, 7, 12].forEach((s, i) => this.tone("sine", mtof(64 + s), mtof(64 + s), 0.5, 0.09, i * 0.09, this.echo, 0.02));
  }

  combo(level: number): void {
    this.tone("triangle", mtof(76 + level * 2), mtof(76 + level * 2), 0.14, 0.07, 0, this.echo);
  }

  bossWarn(): void {
    for (let i = 0; i < 3; i++) this.tone("sawtooth", 196, 185, 0.45, 0.14, i * 0.6);
  }

  gameOver(): void {
    [0, -3, -7, -12].forEach((s, i) => this.tone("sawtooth", mtof(57 + s), mtof(57 + s) * 0.97, 0.7, 0.1, i * 0.32));
  }

  victory(): void {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone("triangle", mtof(60 + s), mtof(60 + s), 1.8, 0.09, i * 0.22, this.echo, 0.05));
  }

  // ---------- Musik ----------

  setTrack(track: number): void {
    if (track === this.track) return;
    this.track = track;
    const m = MUSIC[track] ?? MUSIC[0];
    let s = m.seed;
    const rnd = (): number => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    this.pattern = [];
    for (let i = 0; i < 16; i++) {
      const on = i % 4 === 0 ? rnd() < 0.85 : rnd() < 0.5;
      this.pattern.push(on ? Math.floor(rnd() * 7) : -1);
    }
    this.step = 0;
    if (this.ctx) this.nextStep = this.ctx.currentTime + 0.1;
  }

  setIntensity(v: number): void { this.intensity = v; }

  /** Aus der Spielschleife aufrufen: plant die nächsten Noten vor. */
  update(): void {
    const ctx = this.ctx; if (!ctx || this.track < 0 || ctx.state !== "running") return;
    const m = MUSIC[this.track] ?? MUSIC[0];
    const stepDur = 60 / (m.bpm * (1 + this.intensity * 0.12)) / 4;
    if (this.nextStep < ctx.currentTime - 0.3) this.nextStep = ctx.currentTime + 0.05;
    let guard = 0;
    while (this.nextStep < ctx.currentTime + 0.2 && guard++ < 8) {
      this.playStep(m, this.step, this.nextStep, stepDur);
      this.step++;
      this.nextStep += stepDur;
    }
  }

  private note(deg: number, m: ActMusic, octave: number): number {
    const n = m.scale.length;
    const idx = ((deg % n) + n) % n;
    return mtof(m.root + m.scale[idx] + 12 * (octave + Math.floor(deg / n)));
  }

  private voice(type: OscillatorType, freq: number, t: number, dur: number, gain: number, attack: number, cutoff: number, send: boolean): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 14;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.musicBus);
    if (send) g.connect(this.echo);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private playStep(m: ActMusic, i: number, t: number, sd: number): void {
    const bar = Math.floor(i / 16);
    const chord = m.chords[bar % m.chords.length];
    const s = i % 16;
    if (s === 0) {
      // Fläche: Grundton, Terz/Quarte, Quinte der Skala
      const dur = sd * 16 * 1.15;
      for (const d of [0, 2, 4]) {
        this.voice("sawtooth", this.note(chord + d, m, 0), t, dur, 0.05, dur * 0.35, 520 + this.intensity * 500, false);
      }
      this.voice("sine", this.note(chord, m, -1), t, dur, 0.16, 0.3, 300, false);
    }
    if (m.pulse && s % 4 === 0) {
      const ctx = this.ctx!;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
      g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + 0.22);
    }
    if (m.pulse && s % 2 === 1 && this.intensity > 0.3) {
      const ctx = this.ctx!;
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      src.connect(f); f.connect(g); g.connect(this.musicBus);
      src.start(t, Math.random() * 0.5, 0.06);
    }
    const p = this.pattern[s];
    if (p >= 0) {
      const alt = bar % 2 === 1 && s >= 8 ? 1 : 0;
      this.voice(m.arp, this.note(chord + p + alt, m, 1), t, sd * 2.6, m.arp === "sine" || m.arp === "triangle" ? 0.07 : 0.028, 0.008, 1800 + this.intensity * 1600, true);
    }
  }
}

export const audio = new AudioEngine();
