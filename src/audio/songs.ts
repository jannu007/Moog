import type { NoteEvent, Song } from './Sequencer';
import { arpeggio, chord, makeClock, note, shift } from './composeUtils';

// ---------------------------------------------------------------------------
// 1. 安曇野の雪 (Snow in Azumino) — slow, spacious A-minor pad with a falling,
//    bell-like melody evoking quiet snowfall over the Azumino plain.
// ---------------------------------------------------------------------------
function snowInAzumino(): Song {
  const bpm = 64;
  const toSec = makeClock(bpm);
  const loopBeats = 16;
  const loopSec = toSec(loopBeats);

  const chords: string[][] = [
    ['A3', 'C4', 'E4', 'G4'], // Am7
    ['F3', 'A3', 'C4', 'E4'], // Fmaj7
    ['C4', 'E4', 'G4', 'B4'], // Cmaj7
    ['G3', 'B3', 'D4', 'G4'], // G
  ];
  const melody: Array<[string, number, number]> = [
    ['E5', 0, 1.25],
    ['D5', 1.75, 0.75],
    ['C5', 3, 1],
    ['C5', 4, 1.25],
    ['A4', 5.75, 0.75],
    ['F4', 7, 1],
    ['E5', 8, 1.25],
    ['G5', 9.75, 1],
    ['E5', 11, 1],
    ['D5', 12, 1.25],
    ['B4', 13.75, 0.75],
    ['G4', 15, 1],
  ];

  let events: NoteEvent[] = [];
  chords.forEach((c, i) => {
    events = events.concat(chord(c, i * 4, 4, toSec, 1.05));
  });
  melody.forEach(([n, b, l]) => {
    events.push(note(n, b, l, toSec));
  });

  const loop2 = shift(events, loopSec);
  const all = events.concat(loop2);

  return {
    title: '安曇野の雪',
    subtitle: 'Snow in Azumino',
    bpm,
    totalSec: loopSec * 2 + 4,
    patch: {
      osc1Waveform: 'triangle',
      osc1Level: 0.75,
      osc2Waveform: 'sine',
      osc2Fine: -6,
      osc2Level: 0.5,
      subLevel: 0.18,
      noiseLevel: 0.015,
      filterMode: 'lowpass',
      cutoff: 1400,
      resonance: 0.6,
      filterEnvAmount: 0.25,
      keyTracking: 0.3,
      drive: 0.05,
      ampAttack: 0.9,
      ampDecay: 1.1,
      ampSustain: 0.7,
      ampRelease: 1.8,
      filtAttack: 1.2,
      filtDecay: 1.5,
      filtSustain: 0.4,
      filtRelease: 1.5,
      lfoWaveform: 'sine',
      lfoRateHz: 0.18,
      lfoToFilter: 0.12,
      lfoToAmp: 0.05,
      glideSec: 0.15,
      delayMix: 0.28,
      delayTimeSec: 0.55,
      delayFeedback: 0.4,
      masterVolume: 0.75,
    },
    events: all,
  };
}

// ---------------------------------------------------------------------------
// 2. 犀川のほとり (Riverside of the Saigawa) — brighter, continuously flowing
//    16th-note arpeggio evoking moving water, C - G - Am - F.
// ---------------------------------------------------------------------------
function saigawaRiverside(): Song {
  const bpm = 104;
  const toSec = makeClock(bpm);
  const loopBeats = 16;
  const loopSec = toSec(loopBeats);

  const chords: string[][] = [
    ['C4', 'E4', 'G4', 'C5', 'G4', 'E4'], // C
    ['G3', 'B3', 'D4', 'G4', 'D4', 'B3'], // G
    ['A3', 'C4', 'E4', 'A4', 'E4', 'C4'], // Am
    ['F3', 'A3', 'C4', 'F4', 'C4', 'A3'], // F
  ];

  let events: NoteEvent[] = [];
  chords.forEach((c, i) => {
    events = events.concat(arpeggio(c, i * 4, 0.5, 8, toSec));
  });
  // a slower counter-melody riding on top, once per loop
  const topline: Array<[string, number, number]> = [
    ['E5', 0, 1.5],
    ['D5', 4, 1.5],
    ['C5', 8, 1.5],
    ['A4', 12, 1.5],
  ];
  topline.forEach(([n, b, l]) => events.push(note(n, b, l, toSec, 0.85)));

  const loop2 = shift(events, loopSec);
  const loop3 = shift(events, loopSec * 2);
  const all = events.concat(loop2, loop3);

  return {
    title: '犀川のほとり',
    subtitle: 'Riverside of the Saigawa',
    bpm,
    totalSec: loopSec * 3 + 2.5,
    patch: {
      osc1Waveform: 'triangle',
      osc1Level: 0.7,
      osc2Waveform: 'square',
      osc2Octave: 1,
      osc2Fine: 4,
      osc2Level: 0.28,
      subLevel: 0.15,
      noiseLevel: 0.02,
      filterMode: 'lowpass',
      cutoff: 3200,
      resonance: 0.35,
      filterEnvAmount: 0.5,
      keyTracking: 0.6,
      drive: 0.1,
      ampAttack: 0.004,
      ampDecay: 0.18,
      ampSustain: 0.15,
      ampRelease: 0.12,
      filtAttack: 0.005,
      filtDecay: 0.2,
      filtSustain: 0.1,
      filtRelease: 0.15,
      lfoWaveform: 'sine',
      lfoRateHz: 5.5,
      lfoToFilter: 0.08,
      lfoToAmp: 0,
      glideSec: 0,
      delayMix: 0.32,
      delayTimeSec: 0.19,
      delayFeedback: 0.45,
      masterVolume: 0.7,
    },
    events: all,
  };
}

// ---------------------------------------------------------------------------
// 3. 上高地の夜明け (Dawn in Kamikochi) — slow-swelling, rising pad with a
//    melody that climbs higher through each chord, evoking sunrise over the
//    mountains. D - Bm - G - A.
// ---------------------------------------------------------------------------
function kamikochiDawn(): Song {
  const bpm = 58;
  const toSec = makeClock(bpm);

  const chords: string[][] = [
    ['D3', 'A3', 'D4', 'F#4'], // D
    ['B3', 'D4', 'F#4', 'A4'], // Bm
    ['G3', 'D4', 'G4', 'B4'], // G
    ['A3', 'C#4', 'E4', 'A4'], // A
  ];
  const melody: Array<[string, number, number]> = [
    ['D4', 2, 3],
    ['F#4', 6, 3.5],
    ['A4', 12, 3],
    ['D5', 16, 3.5],
    ['E5', 20, 3],
    ['C#5', 23, 3.5],
    ['A5', 21.5, 2],
  ];

  let events: NoteEvent[] = [];
  chords.forEach((c, i) => {
    events = events.concat(chord(c, i * 6, 6, toSec, 1.08));
  });
  melody.forEach(([n, b, l]) => events.push(note(n, b, l, toSec, 0.96)));
  // one long final tonic swell to close
  events = events.concat(chord(['D3', 'A3', 'D4', 'F#4', 'A4'], 24, 8, toSec, 1.0));

  const totalBeats = 32;
  return {
    title: '上高地の夜明け',
    subtitle: 'Dawn in Kamikochi',
    bpm,
    totalSec: toSec(totalBeats) + 6,
    patch: {
      osc1Waveform: 'sawtooth',
      osc1Level: 0.55,
      osc2Waveform: 'triangle',
      osc2Fine: 8,
      osc2Level: 0.6,
      subLevel: 0.22,
      noiseLevel: 0.01,
      filterMode: 'lowpass',
      cutoff: 900,
      resonance: 0.5,
      filterEnvAmount: 0.35,
      keyTracking: 0.4,
      drive: 0.08,
      ampAttack: 2.2,
      ampDecay: 1.4,
      ampSustain: 0.85,
      ampRelease: 2.6,
      filtAttack: 2.6,
      filtDecay: 2,
      filtSustain: 0.5,
      filtRelease: 2.4,
      lfoWaveform: 'triangle',
      lfoRateHz: 0.09,
      lfoToFilter: 0.2,
      lfoToAmp: 0.06,
      glideSec: 0.3,
      delayMix: 0.35,
      delayTimeSec: 0.7,
      delayFeedback: 0.42,
      masterVolume: 0.72,
    },
    events,
  };
}

export function demoSongs(): Song[] {
  return [snowInAzumino(), saigawaRiverside(), kamikochiDawn()];
}
