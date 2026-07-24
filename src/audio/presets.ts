import { defaultPatch, type Patch } from './types';

function preset(name: string, overrides: Partial<Patch>): Patch {
  return { ...defaultPatch(name), ...overrides, name };
}

export function factoryPresets(): Patch[] {
  return [
    preset('Drift Lead', {
      osc1Waveform: 'sawtooth',
      osc2Waveform: 'sawtooth',
      osc2Fine: 9,
      cutoff: 2200,
      resonance: 2,
      filterEnvAmount: 0.6,
      ampAttack: 0.004,
      ampRelease: 0.18,
    }),
    preset('Warm Pad', {
      osc1Waveform: 'triangle',
      osc2Waveform: 'sawtooth',
      osc2Fine: 5,
      subLevel: 0.2,
      cutoff: 1200,
      resonance: 0.5,
      ampAttack: 0.6,
      ampDecay: 0.8,
      ampSustain: 0.8,
      ampRelease: 1.2,
      lfoToFilter: 0.15,
      lfoRateHz: 0.6,
    }),
    preset('Sub Bass', {
      osc1Waveform: 'sawtooth',
      osc2Waveform: 'square',
      osc2Octave: -1,
      osc2Fine: 0,
      subLevel: 0.6,
      cutoff: 700,
      resonance: 1.5,
      filterEnvAmount: 0.4,
      ampAttack: 0.002,
      ampDecay: 0.2,
      ampSustain: 0.9,
      ampRelease: 0.12,
    }),
    preset('Metal Pluck', {
      osc1Waveform: 'square',
      osc2Waveform: 'square',
      osc2Semi: 7,
      noiseLevel: 0.08,
      cutoff: 2600,
      resonance: 3,
      filterEnvAmount: 0.8,
      filtDecay: 0.15,
      filtSustain: 0.05,
      ampDecay: 0.3,
      ampSustain: 0,
      ampRelease: 0.15,
    }),
  ];
}
