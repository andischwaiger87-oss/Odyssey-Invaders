export class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private currentDroneOsc: OscillatorNode | null = null;
  private activeActTrack = 0;

  private init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.ctx.destination);
      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    }
  }

  public playLaserSound(isPlayer: boolean): void {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (isPlayer) {
      // High-Pitch Sinus-Impuls für den Quanten-Laser der Discovery One
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    } else {
      // Sägezahn-Schuss für HAL 9000 (Aggressiver, bösartiger Klangcharakter)
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
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generiere echtes, physikalisches weißes Rauschen
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

  // SYSTEM-UPGRADE: Schaltet die prozedurale Hintergrundmusik je nach Film-Akt um
  public updateAmbientTheme(act: number): void {
    this.init();
    if (!this.ctx || !this.ambientGain || this.activeActTrack === act) return;

    this.activeActTrack = act;

    // Beende vorherigen Frequenz-Oszillator sanft
    if (this.currentDroneOsc) {
      try {
        this.currentDroneOsc.stop();
      } catch (e) {}
    }

    const osc = this.ctx.createOscillator();
    this.currentDroneOsc = osc;
    osc.connect(this.ambientGain);

    switch (act) {
      case 1: // Die Urzeit: Primitiver, extrem tiefer und bedrohlicher Ur-Rumble
        osc.type = "sine";
        osc.frequency.setValueAtTime(45, this.ctx.currentTime); // Sub-Bass G#0
        break;

      case 2: // TMA-1 Mond: Schwebende, unheimliche Dreiecks-Frequenz (Mond-Anomalie)
        osc.type = "triangle";
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);
        break;

      case 3: // HAL 9000: Dissonante, pulsierende Rechteckwelle (Digitaler Kontrollverlust)
        osc.type = "square";
        osc.frequency.setValueAtTime(65, this.ctx.currentTime);
        // Erzeuge ein rhythmisches, digitales Pulsieren (Computer-Metronom)
        this.ambientGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        break;

      case 4: // Stargate: Maximal psychedelischer Frequenz-Glitch (Moduliertes Clusteraudio)
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        // Frequenz wandert ununterbrochen wellenartig auf und ab
        osc.frequency.linearRampToValueAtTime(350, this.ctx.currentTime + 5);
        break;
    }

    osc.start();
  }
}

export const sfx = new AudioEngine();