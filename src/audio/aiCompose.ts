import type { Song } from './Sequencer';
import { chordMidi, makeClock, noteMidi, shift } from './composeUtils';
import type { Patch } from './types';

/**
 * A small on-device, rule-based "composer": it reads mood/keyword signals out
 * of free text and procedurally builds a chord progression, melody, and
 * patch from them. It is deterministic per prompt (same text -> same song)
 * via a string hash seeding a PRNG, so results are reproducible but still
 * vary between prompts. This is NOT a call to a hosted generative-AI model —
 * there is no backend for this static site to call one from without
 * exposing an API key — but it behaves like a lightweight composition
 * assistant driven entirely by the text you type.
 */

interface Mood {
  energy: number; // -1 (calm) .. 1 (energetic/fast)
  valence: number; // -1 (dark/minor) .. 1 (bright/major)
  space: number; // -1 (dry/tight) .. 1 (open/ambient)
  complexity: number; // -1 (simple) .. 1 (busy)
}

const KEYWORDS: Array<{ pattern: RegExp; delta: Partial<Mood> }> = [
  // energetic / fast
  { pattern: /(速い|はやい|激しい|情熱|エネルギッシュ|踊|アップテンポ|fast|energetic|upbeat|dance|driving|intense)/i, delta: { energy: 0.6 } },
  { pattern: /(遅い|ゆっくり|ゆったり|穏やか|静か|落ち着|癒し|眠|slow|calm|peaceful|relax|gentle|quiet|soft)/i, delta: { energy: -0.6 } },
  // valence
  { pattern: /(悲し|切な|哀|寂し|涙|別れ|喪失|sad|melanchol|sorrow|grief|dark|minor)/i, delta: { valence: -0.7 } },
  { pattern: /(楽し|明る|嬉し|幸せ|希望|祝|happy|bright|joy|cheerful|hopeful|major|sunny)/i, delta: { valence: 0.7 } },
  // space / ambience
  { pattern: /(広い|宇宙|海|空|夜空|残響|エコー|幻想|夢|open|space|ambient|dreamy|echo|reverb|cosmic|ocean)/i, delta: { space: 0.6 } },
  { pattern: /(狭い|タイト|ドライ|パンチ|dry|tight|punchy|close)/i, delta: { space: -0.5 } },
  // complexity
  { pattern: /(複雑|賑やか|忙し|複数|レイヤー|complex|busy|dense|layered|intricate)/i, delta: { complexity: 0.6 } },
  { pattern: /(シンプル|ミニマル|単純|静寂|simple|minimal|sparse|bare)/i, delta: { complexity: -0.6 } },
  // nature/time flavor (nudge multiple axes to fit common imagery)
  { pattern: /(雪|snow|冬|winter)/i, delta: { energy: -0.3, valence: -0.1, space: 0.3 } },
  { pattern: /(朝|夜明け|日の出|morning|dawn|sunrise)/i, delta: { valence: 0.4, energy: -0.1, space: 0.2 } },
  { pattern: /(夜|night|真夜中|midnight)/i, delta: { valence: -0.3, space: 0.3 } },
  { pattern: /(雨|rain)/i, delta: { valence: -0.2, space: 0.4, energy: -0.2 } },
  { pattern: /(川|海|water|river|ocean|波|wave)/i, delta: { space: 0.3, complexity: 0.2 } },
  { pattern: /(山|mountain)/i, delta: { space: 0.3, valence: 0.1 } },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function analyzeMood(prompt: string, rand: () => number): Mood {
  const mood: Mood = { energy: 0, valence: 0, space: 0, complexity: 0 };
  let matched = false;
  for (const { pattern, delta } of KEYWORDS) {
    if (pattern.test(prompt)) {
      matched = true;
      mood.energy += delta.energy ?? 0;
      mood.valence += delta.valence ?? 0;
      mood.space += delta.space ?? 0;
      mood.complexity += delta.complexity ?? 0;
    }
  }
  if (!matched) {
    // No recognizable keywords: fall back to a gentle random mood so every
    // prompt still produces a distinct, reasonable-sounding song.
    mood.energy = (rand() - 0.5) * 1.2;
    mood.valence = (rand() - 0.5) * 1.4;
    mood.space = (rand() - 0.5) * 1.2;
    mood.complexity = (rand() - 0.5) * 1.0;
  }
  mood.energy = clamp(mood.energy, -1, 1);
  mood.valence = clamp(mood.valence, -1, 1);
  mood.space = clamp(mood.space, -1, 1);
  mood.complexity = clamp(mood.complexity, -1, 1);
  return mood;
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ROOTS = [48, 50, 52, 53, 55, 57]; // C3..A3

// scale-degree triads (1-indexed) for a few common progressions
const MAJOR_PROGRESSIONS = [
  [1, 5, 6, 4],
  [1, 6, 4, 5],
  [6, 4, 1, 5],
  [1, 4, 5, 4],
];
const MINOR_PROGRESSIONS = [
  [1, 6, 3, 7],
  [1, 4, 5, 4],
  [6, 7, 1, 1],
  [1, 5, 6, 4],
];

function triad(root: number, scale: number[], degree: number): number[] {
  const idx = (degree - 1) % 7;
  const octaveShift = Math.floor((degree - 1) / 7) * 12;
  const deg = (i: number) => scale[(idx + i) % 7] + (idx + i >= 7 ? 12 : 0);
  return [root + deg(0) + octaveShift, root + deg(2) + octaveShift, root + deg(4) + octaveShift];
}

export function composePromptSong(prompt: string): Song {
  const trimmed = prompt.trim();
  const seed = hashString(trimmed || 'novawave');
  const rand = mulberry32(seed);
  const mood = analyzeMood(trimmed, rand);

  const isMajor = mood.valence >= 0;
  const scale = isMajor ? MAJOR_SCALE : MINOR_SCALE;
  const root = ROOTS[Math.floor(rand() * ROOTS.length)];
  const progressionPool = isMajor ? MAJOR_PROGRESSIONS : MINOR_PROGRESSIONS;
  const progression = progressionPool[Math.floor(rand() * progressionPool.length)];

  const bpm = Math.round(clamp(92 + mood.energy * 46, 52, 170));
  const toSec = makeClock(bpm);
  const beatsPerChord = 4;
  const loopBeats = beatsPerChord * progression.length;
  const loopSec = toSec(loopBeats);
  const loops = mood.energy > 0.3 ? 3 : 2;

  // Chord pads
  let events = progression.flatMap((degree, i) => {
    const notes = triad(root, scale, degree).map((n) => n + 12); // mid register
    if (mood.complexity > 0.3) notes.push(root + scale[(degree - 1 + 6) % 7] + 12 + 12); // add a 7th-ish color tone
    return chordMidi(notes, i * beatsPerChord, beatsPerChord, toSec, 1.02);
  });

  // Melody: a biased random walk across the scale, landing on chord tones
  const stepsPerLoop = mood.energy > 0.2 ? loopBeats * 2 : loopBeats;
  const stepBeats = loopBeats / stepsPerLoop;
  let degreeIdx = 4; // start around the 5th scale degree
  const melodyOctave = root + 24;
  for (let i = 0; i < stepsPerLoop; i++) {
    if (rand() < 0.28) continue; // rest
    const step = rand() < 0.65 ? (rand() < 0.5 ? 1 : -1) : Math.floor(rand() * 5) - 2;
    degreeIdx = clamp(degreeIdx + step, 0, 13);
    const octaveShift = Math.floor(degreeIdx / 7) * 12;
    const pitchClass = scale[((degreeIdx % 7) + 7) % 7];
    const midiNote = melodyOctave + pitchClass + octaveShift;
    const lenBeats = stepBeats * (rand() < 0.25 ? 2 : 1);
    events.push(noteMidi(midiNote, i * stepBeats, lenBeats, toSec, mood.energy > 0.2 ? 0.7 : 0.9));
  }

  let all = events;
  for (let i = 1; i < loops; i++) all = all.concat(shift(events, loopSec * i));

  const totalSec = loopSec * loops + (mood.energy > 0.2 ? 1.5 : 4);

  const brightness01 = (mood.valence + 1) / 2;
  const energy01 = (mood.energy + 1) / 2;
  const space01 = (mood.space + 1) / 2;

  const waveform: Patch['osc1Waveform'] = brightness01 > 0.6 || energy01 > 0.75 ? 'sawtooth' : brightness01 < 0.35 ? 'sine' : 'triangle';
  const osc2Waveform: Patch['osc2Waveform'] = mood.complexity > 0.2 ? 'square' : waveform;

  const patch: Partial<Patch> = {
    osc1Waveform: waveform,
    osc1Level: 0.7,
    osc2Waveform,
    osc2Fine: 5 + Math.round(rand() * 6),
    osc2Level: 0.35 + mood.complexity * 0.15,
    subLevel: 0.2 + (1 - energy01) * 0.15,
    noiseLevel: mood.complexity > 0.4 ? 0.03 : 0.005,
    filterMode: 'lowpass',
    cutoff: Math.round(clamp(500 + brightness01 * 3600 + energy01 * 1000, 300, 6000)),
    resonance: clamp(0.3 + energy01 * 1.8, 0.1, 3.5),
    filterEnvAmount: clamp(0.2 + energy01 * 0.5, 0, 1),
    keyTracking: 0.4,
    drive: energy01 > 0.6 ? 0.2 : 0.05,
    ampAttack: energy01 > 0.5 ? 0.004 + (1 - energy01) * 0.05 : 0.3 + (1 - energy01) * 1.5,
    ampDecay: 0.3,
    ampSustain: energy01 > 0.5 ? 0.6 : 0.8,
    ampRelease: 0.2 + (1 - energy01) * 1.8,
    filtAttack: 0.05 + (1 - energy01) * 1.5,
    filtDecay: 0.4,
    filtSustain: 0.3,
    filtRelease: 0.3 + (1 - energy01) * 1.5,
    lfoWaveform: 'sine',
    lfoRateHz: 0.15 + energy01 * 4,
    lfoToFilter: space01 * 0.2,
    lfoToAmp: 0,
    glideSec: energy01 < 0.3 ? 0.12 : 0,
    delayMix: clamp(0.15 + space01 * 0.35, 0, 0.6),
    delayTimeSec: 0.2 + space01 * 0.5,
    delayFeedback: clamp(0.25 + space01 * 0.35, 0, 0.85),
    masterVolume: 0.75,
  };

  return {
    title: trimmed || 'AIによる即興曲',
    subtitle: `AI作曲 · ${isMajor ? 'メジャー' : 'マイナー'} · ${bpm} BPM`,
    bpm,
    totalSec,
    patch,
    events: all,
  };
}
