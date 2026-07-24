export type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square';
export type FilterMode = 'lowpass' | 'bandpass' | 'highpass';

export interface Patch {
  name: string;

  osc1Waveform: Waveform;
  osc1Octave: number; // -2..2
  osc1Semi: number; // -12..12
  osc1Fine: number; // cents -50..50
  osc1Level: number; // 0..1

  osc2Waveform: Waveform;
  osc2Octave: number;
  osc2Semi: number;
  osc2Fine: number;
  osc2Level: number;

  subLevel: number;
  noiseLevel: number;

  filterMode: FilterMode;
  cutoff: number; // Hz
  resonance: number; // Q, 0.1..20
  filterEnvAmount: number; // -1..1
  keyTracking: number; // 0..1
  drive: number; // 0..1

  ampAttack: number;
  ampDecay: number;
  ampSustain: number;
  ampRelease: number;

  filtAttack: number;
  filtDecay: number;
  filtSustain: number;
  filtRelease: number;

  lfoWaveform: Waveform;
  lfoRateHz: number;
  lfoToPitch: number; // 0..1 -> semitones of detune depth
  lfoToFilter: number; // 0..1 -> Hz depth
  lfoToAmp: number; // 0..1 tremolo depth

  glideSec: number;

  delayMix: number;
  delayTimeSec: number;
  delayFeedback: number;

  masterVolume: number;
}

export function defaultPatch(name = 'Init'): Patch {
  return {
    name,
    osc1Waveform: 'sawtooth',
    osc1Octave: 0,
    osc1Semi: 0,
    osc1Fine: 0,
    osc1Level: 0.8,
    osc2Waveform: 'square',
    osc2Octave: -1,
    osc2Semi: 0,
    osc2Fine: 7,
    osc2Level: 0.55,
    subLevel: 0.35,
    noiseLevel: 0,
    filterMode: 'lowpass',
    cutoff: 1800,
    resonance: 0.7,
    filterEnvAmount: 0.55,
    keyTracking: 0.5,
    drive: 0.15,
    ampAttack: 0.008,
    ampDecay: 0.25,
    ampSustain: 0.75,
    ampRelease: 0.25,
    filtAttack: 0.01,
    filtDecay: 0.35,
    filtSustain: 0.3,
    filtRelease: 0.3,
    lfoWaveform: 'triangle',
    lfoRateHz: 3.5,
    lfoToPitch: 0,
    lfoToFilter: 0,
    lfoToAmp: 0,
    glideSec: 0,
    delayMix: 0,
    delayTimeSec: 0.32,
    delayFeedback: 0.35,
    masterVolume: 0.8,
  };
}
