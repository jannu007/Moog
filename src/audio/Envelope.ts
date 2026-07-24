export type EnvStage = 'idle' | 'attack' | 'decay' | 'sustain' | 'release';

/** ADSR envelope advanced by real elapsed time (control-rate, ticked from rAF). */
export class Envelope {
  stage: EnvStage = 'idle';
  private level = 0;

  attackSec = 0.005;
  decaySec = 0.15;
  sustainLevel = 0.7;
  releaseSec = 0.2;

  get value(): number {
    return this.level;
  }

  get isActive(): boolean {
    return this.stage !== 'idle';
  }

  noteOn(): void {
    this.stage = 'attack';
  }

  noteOff(): void {
    if (this.stage !== 'idle') this.stage = 'release';
  }

  tick(dt: number): number {
    switch (this.stage) {
      case 'idle':
        this.level = 0;
        break;
      case 'attack': {
        const step = dt / Math.max(this.attackSec, 0.0005);
        this.level += step;
        if (this.level >= 1) {
          this.level = 1;
          this.stage = 'decay';
        }
        break;
      }
      case 'decay': {
        const step = ((1 - this.sustainLevel) * dt) / Math.max(this.decaySec, 0.0005);
        this.level -= step;
        if (this.level <= this.sustainLevel) {
          this.level = this.sustainLevel;
          this.stage = 'sustain';
        }
        break;
      }
      case 'sustain':
        this.level = this.sustainLevel;
        break;
      case 'release': {
        const step = (this.level * dt) / Math.max(this.releaseSec, 0.0005);
        this.level -= step;
        if (this.level <= 0.0005) {
          this.level = 0;
          this.stage = 'idle';
        }
        break;
      }
    }
    return this.level;
  }
}
