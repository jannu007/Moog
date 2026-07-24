export interface KeyboardOptions {
  lowestNote: number;
  octaveSpan: number;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
}

const WHITE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_INTERVALS: Array<number | null> = [1, 3, null, 6, 8, 10, null];

export interface KeyboardHandle {
  el: HTMLDivElement;
  setLowestNote: (note: number) => void;
}

export function createKeyboard(opts: KeyboardOptions): KeyboardHandle {
  let lowestNote = opts.lowestNote;
  const activePointers = new Map<number, number>(); // pointerId -> note

  const el = document.createElement('div');
  el.className = 'keyboard';

  function build() {
    el.innerHTML = '';
    const whiteCount = opts.octaveSpan * 7;

    const whiteRow = document.createElement('div');
    whiteRow.className = 'keyboard-white-row';

    for (let i = 0; i < whiteCount; i++) {
      const octave = Math.floor(i / 7);
      const idx = i % 7;
      const note = lowestNote + octave * 12 + WHITE_INTERVALS[idx];
      const key = document.createElement('div');
      key.className = 'key key-white';
      key.dataset.note = String(note);
      whiteRow.appendChild(key);
    }
    el.appendChild(whiteRow);

    for (let i = 0; i < whiteCount; i++) {
      const octave = Math.floor(i / 7);
      const idx = i % 7;
      const blackInterval = BLACK_INTERVALS[idx];
      if (blackInterval === null) continue;
      const note = lowestNote + octave * 12 + blackInterval;
      const key = document.createElement('div');
      key.className = 'key key-black';
      key.dataset.note = String(note);
      key.style.left = `calc(${((i + 1) / whiteCount) * 100}% - var(--black-key-width) / 2)`;
      el.appendChild(key);
    }
  }

  function keyAt(clientX: number, clientY: number): HTMLElement | null {
    const target = document.elementFromPoint(clientX, clientY);
    if (target instanceof HTMLElement && target.dataset.note) return target;
    return null;
  }

  function noteOnVisual(key: HTMLElement) {
    key.classList.add('active');
    opts.onNoteOn(Number(key.dataset.note));
  }
  function noteOffVisual(note: number) {
    const key = el.querySelector(`[data-note="${note}"]`);
    key?.classList.remove('active');
    opts.onNoteOff(note);
  }

  el.addEventListener('pointerdown', (e) => {
    const key = keyAt(e.clientX, e.clientY);
    if (!key) return;
    const note = Number(key.dataset.note);
    activePointers.set(e.pointerId, note);
    noteOnVisual(key);
    e.preventDefault();
  });

  el.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    const key = keyAt(e.clientX, e.clientY);
    const newNote = key ? Number(key.dataset.note) : null;
    const oldNote = activePointers.get(e.pointerId)!;
    if (newNote !== null && newNote !== oldNote) {
      noteOffVisual(oldNote);
      activePointers.set(e.pointerId, newNote);
      const newKey = el.querySelector(`[data-note="${newNote}"]`) as HTMLElement;
      noteOnVisual(newKey);
    }
  });

  function release(e: PointerEvent) {
    const note = activePointers.get(e.pointerId);
    if (note === undefined) return;
    activePointers.delete(e.pointerId);
    noteOffVisual(note);
  }
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);

  build();

  return {
    el,
    setLowestNote(note: number) {
      for (const [pid, n] of activePointers) {
        noteOffVisual(n);
        activePointers.delete(pid);
      }
      lowestNote = note;
      build();
    },
  };
}
