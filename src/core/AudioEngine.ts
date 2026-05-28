export class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private currentDroneOsc: OscillatorNode | null = null;
  private activeActTrack = 0;
  private userInteracted = false; // Verhindert verfrühte Autoplay-Warnungen im Frame-Loop

  private init(): void {
    if (!this.userInteracted) return;
    
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.ctx.destination);
      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playSpaceAmbient(): void {
    this.userInteracted = true;
    this.init();
    if (this.activeActTrack === 0) {
      this.updateAmbientTheme(1);
    }
  }

  public playLaserSound(isPlayer: boolean): void {
    if (!this.userInteracted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (isPlayer) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
    }

    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  public playExplosion(isMonolith: boolean): void {
    if (!this.userInteracted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isMonolith ? "lowpass" : "bandpass";
    filter.frequency.setValueAtTime(isMonolith ? 250 : 700, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public updateAmbientTheme(act: number): void {
    if (!this.userInteracted) return;
    this.init();
    if (!this.ctx || !this.ambientGain || this.activeActTrack === act || act === 0) return;

    this.activeActTrack = act;

    if (this.currentDroneOsc) {
      try {
        this.currentDroneOsc.stop();
      } catch (e) {}
    }

    const osc = this.ctx.createOscillator();
    this.currentDroneOsc = osc;
    osc.connect(this.ambientGain);

    switch (act) {
      case 1:
        osc.type = "sine";
        osc.frequency.setValueAtTime(45, this.ctx.currentTime);
        break;
      case 2:
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        break;
      case 3:
        osc.type = "square";
        osc.frequency.setValueAtTime(65, this.ctx.currentTime);
        this.ambientGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        break;
      case 4:
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + 5);
        break;
    }

    osc.start();
  }
}

export const sfx = new AudioEngine();