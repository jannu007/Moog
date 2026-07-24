import type { SynthEngine } from './SynthEngine';
import type { Patch } from './types';

export interface NoteEvent {
  note: number;
  startSec: number;
  durSec: number;
}

export interface Song {
  title: string;
  subtitle: string;
  bpm: number;
  totalSec: number;
  patch: Partial<Patch>;
  events: NoteEvent[];
}

/** Schedules a Song's notes onto a SynthEngine using timers (control-rate, matching the engine's own tick model). */
export class SequencerPlayer {
  private timers: number[] = [];
  private playing = false;
  private currentSong: Song | null = null;

  constructor(private engine: SynthEngine) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  get playingSong(): Song | null {
    return this.currentSong;
  }

  play(song: Song, onEnd?: () => void): void {
    this.stop();
    this.playing = true;
    this.currentSong = song;

    for (const ev of song.events) {
      const onId = window.setTimeout(() => this.engine.noteOn(ev.note), Math.max(0, ev.startSec * 1000));
      const offId = window.setTimeout(
        () => this.engine.noteOff(ev.note),
        Math.max(0, (ev.startSec + ev.durSec) * 1000)
      );
      this.timers.push(onId, offId);
    }

    const endId = window.setTimeout(() => {
      this.playing = false;
      this.currentSong = null;
      onEnd?.();
    }, song.totalSec * 1000);
    this.timers.push(endId);
  }

  stop(): void {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers = [];
    if (this.playing) this.engine.allNotesOff();
    this.playing = false;
    this.currentSong = null;
  }
}
