import { Voice } from './Voice';
import type { Patch } from './types';

const MAX_VOICES = 8;
const CHORUS_BASE_DELAY_SEC = 0.02;

/**
 * Owns the AudioContext and the persistent voice pool / effects chain.
 * Must be started from a user gesture (`start()`) because mobile browsers
 * suspend AudioContext until one occurs.
 *
 * Signal path: voices -> distortion -> chorus -> delay -> tremolo -> master
 * -> limiter -> destination (+ analyser / recording tap).
 */
export class SynthEngine {
  private ctx: AudioContext | null = null;
  private voices: Voice[] = [];
  private lfo: OscillatorNode | null = null;

  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private recordDestination: MediaStreamAudioDestinationNode | null = null;

  // Distortion
  private distPreGain: GainNode | null = null;
  private distDryGain: GainNode | null = null;
  private distWetGain: GainNode | null = null;

  // Chorus
  private chorusLfo: OscillatorNode | null = null;
  private chorusDepthGain: GainNode | null = null;
  private chorusDryGain: GainNode | null = null;
  private chorusWetGain: GainNode | null = null;

  // Delay
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;

  // Tremolo
  private tremoloLfo: OscillatorNode | null = null;
  private tremoloDepthGain: GainNode | null = null;

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

    const voicesBus = ctx.createGain();

    // --- Distortion: parallel dry/wet around a fixed saturating curve ---
    const distPreGain = ctx.createGain();
    const distShaper = ctx.createWaveShaper();
    distShaper.curve = distortionCurve();
    distShaper.oversample = '4x';
    const distDryGain = ctx.createGain();
    const distWetGain = ctx.createGain();
    const distOut = ctx.createGain();

    voicesBus.connect(distDryGain);
    voicesBus.connect(distPreGain);
    distPreGain.connect(distShaper);
    distShaper.connect(distWetGain);
    distDryGain.connect(distOut);
    distWetGain.connect(distOut);

    // --- Chorus: short modulated delay mixed with dry signal ---
    const chorusDelay = ctx.createDelay(0.05);
    chorusDelay.delayTime.value = CHORUS_BASE_DELAY_SEC;
    const chorusLfo = ctx.createOscillator();
    chorusLfo.type = 'sine';
    chorusLfo.frequency.value = this.patch.chorusRateHz;
    const chorusDepthGain = ctx.createGain();
    chorusLfo.connect(chorusDepthGain);
    chorusDepthGain.connect(chorusDelay.delayTime);
    chorusLfo.start();

    const chorusDryGain = ctx.createGain();
    const chorusWetGain = ctx.createGain();
    const chorusOut = ctx.createGain();

    distOut.connect(chorusDryGain);
    distOut.connect(chorusDelay);
    chorusDelay.connect(chorusWetGain);
    chorusDryGain.connect(chorusOut);
    chorusWetGain.connect(chorusOut);

    // --- Delay (feedback echo) ---
    const delayDryGain = ctx.createGain();
    const delayWetGain = ctx.createGain();
    const delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = this.patch.delayTimeSec;
    const feedbackGain = ctx.createGain();
    feedbackGain.gain.value = this.patch.delayFeedback;
    const delayOut = ctx.createGain();

    chorusOut.connect(delayDryGain);
    chorusOut.connect(delayNode);
    delayNode.connect(feedbackGain);
    feedbackGain.connect(delayNode);
    delayNode.connect(delayWetGain);
    delayDryGain.connect(delayOut);
    delayWetGain.connect(delayOut);

    // --- Tremolo: amplitude modulation ---
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 1;
    const tremoloLfo = ctx.createOscillator();
    tremoloLfo.type = 'sine';
    tremoloLfo.frequency.value = this.patch.tremoloRateHz;
    const tremoloDepthGain = ctx.createGain();
    tremoloLfo.connect(tremoloDepthGain);
    tremoloDepthGain.connect(tremoloGain.gain);
    tremoloLfo.start();

    delayOut.connect(tremoloGain);

    // --- Master / limiter / taps ---
    const masterGain = ctx.createGain();
    masterGain.gain.value = this.patch.masterVolume;
    tremoloGain.connect(masterGain);

    const limiter = ctx.createWaveShaper();
    limiter.curve = softLimitCurve();
    limiter.oversample = '2x';
    masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    limiter.connect(analyser);

    const recordDestination = ctx.createMediaStreamDestination();
    limiter.connect(recordDestination);

    this.masterGain = masterGain;
    this.analyser = analyser;
    this.recordDestination = recordDestination;

    this.distPreGain = distPreGain;
    this.distDryGain = distDryGain;
    this.distWetGain = distWetGain;

    this.chorusLfo = chorusLfo;
    this.chorusDepthGain = chorusDepthGain;
    this.chorusDryGain = chorusDryGain;
    this.chorusWetGain = chorusWetGain;

    this.delayDryGain = delayDryGain;
    this.delayWetGain = delayWetGain;
    this.delayNode = delayNode;
    this.feedbackGain = feedbackGain;

    this.tremoloLfo = tremoloLfo;
    this.tremoloDepthGain = tremoloDepthGain;

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

    // Distortion
    const distAmount = this.patch.distortionAmount;
    this.distPreGain!.gain.value = 1 + distAmount * 24;
    this.distWetGain!.gain.value = this.patch.distortionMix;
    this.distDryGain!.gain.value = 1 - this.patch.distortionMix;

    // Chorus
    this.chorusLfo!.frequency.value = this.patch.chorusRateHz;
    this.chorusDepthGain!.gain.value = this.patch.chorusDepthMs / 1000;
    this.chorusWetGain!.gain.value = this.patch.chorusMix;
    this.chorusDryGain!.gain.value = 1 - this.patch.chorusMix;

    // Delay
    this.delayNode!.delayTime.value = this.patch.delayTimeSec;
    this.feedbackGain!.gain.value = Math.min(this.patch.delayFeedback, 0.95);
    this.delayWetGain!.gain.value = this.patch.delayMix;
    this.delayDryGain!.gain.value = 1 - this.patch.delayMix;

    // Tremolo
    this.tremoloLfo!.frequency.value = this.patch.tremoloRateHz;
    this.tremoloDepthGain!.gain.value = this.patch.tremoloDepth * 0.5;

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

  /** For a VU meter / level display; null until start() has run. */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /** Live MediaStream of the final (post-limiter) output, for MediaRecorder. */
  getRecordingStream(): MediaStream | null {
    return this.recordDestination?.stream ?? null;
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

/** A harder-edged saturation curve than the master limiter's, for the DISTORTION effect. */
function distortionCurve(): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.8) * 0.9;
  }
  return curve;
}
