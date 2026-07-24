import type { NoteEvent } from './Sequencer';

const PITCH_CLASS: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** e.g. nn('A3') -> 57, nn('C4') -> 60 (MIDI, C4 = middle C = 60). */
export function nn(name: string): number {
  const m = name.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) throw new Error(`bad note name: ${name}`);
  const [, letter, octStr] = m;
  return PITCH_CLASS[letter] + (parseInt(octStr, 10) + 1) * 12;
}

export interface Clock {
  (beat: number): number;
}

export function makeClock(bpm: number): Clock {
  const secPerBeat = 60 / bpm;
  return (beat: number) => beat * secPerBeat;
}

export function chord(notes: string[], startBeat: number, lenBeats: number, toSec: Clock, gapRatio = 1): NoteEvent[] {
  const dur = toSec(lenBeats) * gapRatio;
  return notes.map((n) => ({ note: nn(n), startSec: toSec(startBeat), durSec: dur }));
}

export function note(n: string, startBeat: number, lenBeats: number, toSec: Clock, gapRatio = 0.92): NoteEvent {
  return { note: nn(n), startSec: toSec(startBeat), durSec: toSec(lenBeats) * gapRatio };
}

/** Same as `chord`/`note` but takes a raw MIDI number instead of a note name. */
export function chordMidi(notes: number[], startBeat: number, lenBeats: number, toSec: Clock, gapRatio = 1): NoteEvent[] {
  const dur = toSec(lenBeats) * gapRatio;
  return notes.map((n) => ({ note: n, startSec: toSec(startBeat), durSec: dur }));
}

export function noteMidi(n: number, startBeat: number, lenBeats: number, toSec: Clock, gapRatio = 0.92): NoteEvent {
  return { note: n, startSec: toSec(startBeat), durSec: toSec(lenBeats) * gapRatio };
}

export function arpeggio(notes: string[], startBeat: number, stepBeats: number, steps: number, toSec: Clock): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (let i = 0; i < steps; i++) {
    const n = notes[i % notes.length];
    events.push(note(n, startBeat + i * stepBeats, stepBeats, toSec, 0.75));
  }
  return events;
}

export function shift(events: NoteEvent[], byBeatsInSec: number): NoteEvent[] {
  return events.map((e) => ({ ...e, startSec: e.startSec + byBeatsInSec }));
}
