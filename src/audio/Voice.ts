import { Envelope } from './Envelope';
import type { Patch } from './types';

function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * One polyphonic voice. All audio nodes are created once and left running
 * for the app's lifetime (OscillatorNode can only be started once) — notes
 * are realized purely by moving frequency/gain targets, which is the
 * standard persistent-oscillator pattern for Web Audio synths.
 */
export class Voice {
  note = -1;
  private gate = false;

  private osc1: OscillatorNode;
  private osc2: OscillatorNode;
  private subOsc: OscillatorNode;
  private noiseSrc: AudioBufferSourceNode;

  private gain1: GainNode;
  private gain2: GainNode;
  private gainSub: GainNode;
  private gainNoise: GainNode;

  private driveGain: GainNode;
  private shaper: WaveShaperNode;
  readonly filter: BiquadFilterNode;
  private ampGain: GainNode;
  readonly tremoloGain: GainNode;

  readonly pitchDepthGain: GainNode;
  readonly filterDepthGain: GainNode;
  readonly ampDepthGain: GainNode;

  private ampEnv = new Envelope();
  private filtEnv = new Envelope();

  private currentFreq = 220;
  private targetFreq = 220;
  private ageMs = 0;

  constructor(ctx: AudioContext, destination: AudioNode, lfo: OscillatorNode, noiseBuffer: AudioBuffer) {
    this.osc1 = ctx.createOscillator();
    this.osc2 = ctx.createOscillator();
    this.subOsc = ctx.createOscillator();
    this.noiseSrc = ctx.createBufferSource();
    this.noiseSrc.buffer = noiseBuffer;
    this.noiseSrc.loop = true;

    this.gain1 = ctx.createGain();
    this.gain2 = ctx.createGain();
    this.gainSub = ctx.createGain();
    this.gainNoise = ctx.createGain();

    this.driveGain = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = Voice.makeSoftClipCurve();
    this.shaper.oversample = '2x';

    this.filter = ctx.createBiquadFilter();
    this.ampGain = ctx.createGain();
    this.ampGain.gain.value = 0;
    this.tremoloGain = ctx.createGain();
    this.tremoloGain.gain.value = 1;

    this.pitchDepthGain = ctx.createGain();
    this.pitchDepthGain.gain.value = 0;
    this.filterDepthGain = ctx.createGain();
    this.filterDepthGain.gain.value = 0;
    this.ampDepthGain = ctx.createGain();
    this.ampDepthGain.gain.value = 0;

    this.osc1.connect(this.gain1).connect(this.driveGain);
    this.osc2.connect(this.gain2).connect(this.driveGain);
    this.subOsc.connect(this.gainSub).connect(this.driveGain);
    this.noiseSrc.connect(this.gainNoise).connect(this.driveGain);
    this.driveGain.connect(this.shaper);
    this.shaper.connect(this.filter);
    this.filter.connect(this.ampGain);
    this.ampGain.connect(this.tremoloGain);
    this.tremoloGain.connect(destination);

    lfo.connect(this.pitchDepthGain);
    this.pitchDepthGain.connect(this.osc1.detune);
    this.pitchDepthGain.connect(this.osc2.detune);
    lfo.connect(this.filterDepthGain);
    this.filterDepthGain.connect(this.filter.frequency);
    lfo.connect(this.ampDepthGain);
    this.ampDepthGain.connect(this.tremoloGain.gain);

    const now = ctx.currentTime;
    this.osc1.start(now);
    this.osc2.start(now);
    this.subOsc.start(now);
    this.noiseSrc.start(now);
  }

  private static makeSoftClipCurve(): Float32Array<ArrayBuffer> {
    const n = 1024;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.5);
    }
    return curve;
  }

  get isFree(): boolean {
    return !this.gate && !this.ampEnv.isActive;
  }

  get isReleasing(): boolean {
    return this.ampEnv.stage === 'release';
  }

  get age(): number {
    return this.ageMs;
  }

  noteOn(midiNote: number, patch: Patch, retrigger: boolean): void {
    this.note = midiNote;
    this.gate = true;
    this.ageMs = 0;
    this.targetFreq = midiToFreq(midiNote);
    if (retrigger) this.currentFreq = this.targetFreq;

    this.ampEnv.attackSec = patch.ampAttack;
    this.ampEnv.decaySec = patch.ampDecay;
    this.ampEnv.sustainLevel = patch.ampSustain;
    this.ampEnv.releaseSec = patch.ampRelease;

    this.filtEnv.attackSec = patch.filtAttack;
    this.filtEnv.decaySec = patch.filtDecay;
    this.filtEnv.sustainLevel = patch.filtSustain;
    this.filtEnv.releaseSec = patch.filtRelease;

    this.ampEnv.noteOn();
    this.filtEnv.noteOn();
  }

  noteOff(): void {
    this.gate = false;
    this.ampEnv.noteOff();
    this.filtEnv.noteOff();
  }

  /** Advances envelopes/oscillators by dt seconds; called every animation frame. */
  tick(dt: number, patch: Patch, nyquist: number): void {
    this.ageMs += dt * 1000;

    if (patch.glideSec <= 0.0005) {
      this.currentFreq = this.targetFreq;
    } else {
      const coeff = 1 - Math.exp(-dt / patch.glideSec);
      this.currentFreq += (this.targetFreq - this.currentFreq) * coeff;
    }

    const f1 = this.currentFreq * Math.pow(2, patch.osc1Octave + patch.osc1Semi / 12 + patch.osc1Fine / 1200);
    const f2 = this.currentFreq * Math.pow(2, patch.osc2Octave + patch.osc2Semi / 12 + patch.osc2Fine / 1200);
    const fSub = this.currentFreq * 0.5;

    this.osc1.type = patch.osc1Waveform;
    this.osc2.type = patch.osc2Waveform;
    this.subOsc.type = 'square';
    this.osc1.frequency.value = clampFreq(f1, nyquist);
    this.osc2.frequency.value = clampFreq(f2, nyquist);
    this.subOsc.frequency.value = clampFreq(fSub, nyquist);

    this.gain1.gain.value = patch.osc1Level;
    this.gain2.gain.value = patch.osc2Level;
    this.gainSub.gain.value = patch.subLevel;
    this.gainNoise.gain.value = patch.noiseLevel;
    this.driveGain.gain.value = 1 + patch.drive * 4;

    this.pitchDepthGain.gain.value = patch.lfoToPitch * 1200;
    this.filterDepthGain.gain.value = patch.lfoToFilter * 4000;
    this.ampDepthGain.gain.value = patch.lfoToAmp * 0.5;

    const ampLevel = this.ampEnv.tick(dt);
    const filtLevel = this.filtEnv.tick(dt);

    this.ampGain.gain.value = ampLevel;

    this.filter.type = patch.filterMode;
    const keyTrackHz = (this.currentFreq - 261.63) * patch.keyTracking;
    const envMod = filtLevel * patch.filterEnvAmount * 8000;
    const cutoff = patch.cutoff + envMod + keyTrackHz;
    this.filter.frequency.value = Math.min(Math.max(cutoff, 20), nyquist);
    this.filter.Q.value = Math.max(patch.resonance, 0.0001);
  }

  hardStopAllNotes(): void {
    this.gate = false;
    this.ampEnv.noteOff();
    this.filtEnv.noteOff();
  }
}

function clampFreq(f: number, nyquist: number): number {
  return Math.min(Math.max(f, 1), nyquist - 1);
}
