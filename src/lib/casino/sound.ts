// Web Audio API Sound Synthesizer for Casino Games

class SoundFX {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Generic beep / tone generator
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    startGain: number = 0.2,
    endGain: number = 0.001,
  ) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endGain, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback error", e);
    }
  }

  // Click sound
  public playClick() {
    this.playTone(800, "sine", 0.05, 0.15);
  }

  // Slot reel tick (repetitive sound during 5-7s spin)
  public playReelTick() {
    this.playTone(320 + Math.random() * 120, "square", 0.04, 0.08);
  }

  // Slot stop sound
  public playReelStop() {
    this.playTone(180, "triangle", 0.12, 0.3);
  }

  // Dice roll tick
  public playDiceRoll() {
    this.playTone(500 + Math.random() * 400, "triangle", 0.05, 0.1);
  }

  // Plinko peg bounce
  public playPlinkoBounce() {
    this.playTone(600 + Math.random() * 300, "sine", 0.06, 0.15);
  }

  // Crystal dig uncover sound
  public playCrystalUncover() {
    this.playTone(900, "sine", 0.1, 0.2);
  }

  // Explosion / bomb hit
  public playBombExplosion() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // Win fanfare chime
  public playWinFanfare() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, "sine", 0.3, 0.25);
        }, idx * 90);
      });
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // Big Jackpot fanfare
  public playJackpotFanfare() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playTone(freq, "triangle", 0.4, 0.3);
        }, idx * 100);
      });
    } catch (e) {
      console.warn("Audio error", e);
    }
  }
}

export const sound = new SoundFX();
