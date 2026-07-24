import { Voice } from './Voice';
import type { Patch } from './types';

const MAX_VOICES = 8;

/**
 * Owns the AudioContext and the persistent voice pool / effects chain.
 * Must be started from a user gesture (`start()`) because mobile browsers
 * suspend AudioContext until one occurs.
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private voices: Voice[] = [];
  private lfo: OscillatorNode | null = null;

  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;

  private rafId = 0;
  private lastTime = 0;

  constructor(public patch: Patch) {}

  get isRunning(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  async start(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return;
    }

    const ctx = new AudioContext();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = this.patch.masterVolume;

    const limiter = ctx.createWaveShaper();
    limiter.curve = softLimitCurve();
    limiter.oversample = '2x';

    const voicesBus = ctx.createGain();
    const dryGain = ctx.createGain();
    const wetGain = ctx.createGain();
    const delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = this.patch.delayTimeSec;
    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = this.patch.delayFeedback;

    voicesBus.connect(dryGain);
    voicesBus.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(wetGain);
    dryGain.connect(masterGain);
    wetGain.connect(masterGain);
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    this.masterGain = masterGain;
    this.dryGain = dryGain;
    this.wetGain = wetGain;
    this.delayNode = delayNode;
    this.feedbackGain = feedbackGain;

    const lfo = ctx.createOscillator();
    lfo.type = this.patch.lfoWaveform;
    lfo.frequency.value = this.patch.lfoRateHz;
    lfo.start();
    this.lfo = lfo;

    const noiseBuffer = createNoiseBuffer(ctx);
    this.voices = Array.from({ length: MAX_VOICES }, () => new Voice(ctx, voicesBus, lfo, noiseBuffer));

    this.lastTime = ctx.currentTime;
    const loop = () => {
      const now = this.ctx!.currentTime;
      const dt = Math.min(now - this.lastTime, 0.05);
      this.lastTime = now;
      this.tick(dt);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.allNotesOff();
  }

  private tick(dt: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.lfo || !this.masterGain) return;

    this.lfo.frequency.value = this.patch.lfoRateHz;
    if (this.lfo.type !== this.patch.lfoWaveform) this.lfo.type = this.patch.lfoWaveform;

    this.masterGain.gain.value = this.patch.masterVolume;
    this.delayNode!.delayTime.value = this.patch.delayTimeSec;
    this.feedbackGain!.gain.value = Math.min(this.patch.delayFeedback, 0.95);
    this.wetGain!.gain.value = this.patch.delayMix;
    this.dryGain!.gain.value = 1 - this.patch.delayMix;

    const nyquist = ctx.sampleRate / 2;
    for (const v of this.voices) v.tick(dt, this.patch, nyquist);
  }

  noteOn(midiNote: number): void {
    if (!this.ctx) return;
    const existing = this.voices.find((v) => !v.isFree && v.note === midiNote);
    const free = this.voices.find((v) => v.isFree);
    const releasing = this.voices.filter((v) => v.isReleasing).sort((a, b) => b.age - a.age)[0];
    const oldest = [...this.voices].sort((a, b) => b.age - a.age)[0];
    const voice = existing ?? free ?? releasing ?? oldest;
    voice.noteOn(midiNote, this.patch, existing === undefined);
  }

  noteOff(midiNote: number): void {
    for (const v of this.voices) {
      if (!v.isFree && v.note === midiNote) v.noteOff();
    }
  }

  allNotesOff(): void {
    for (const v of this.voices) v.hardStopAllNotes();
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function softLimitCurve(): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x);
  }
  return curve;
}
