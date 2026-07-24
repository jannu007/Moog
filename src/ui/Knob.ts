export interface KnobOptions {
  label: string;
  min: number;
  max: number;
  value: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

const START_ANGLE = -135;
const SWEEP = 270;

export interface KnobHandle {
  el: HTMLDivElement;
  setValue: (v: number) => void;
}

export function createKnob(opts: KnobOptions): KnobHandle {
  const { min, max } = opts;
  let value = opts.value;

  const el = document.createElement('div');
  el.className = 'knob';

  const dial = document.createElement('div');
  dial.className = 'knob-dial';

  const indicator = document.createElement('div');
  indicator.className = 'knob-indicator';
  dial.appendChild(indicator);

  const label = document.createElement('div');
  label.className = 'knob-label';
  label.textContent = opts.label;

  const valueEl = document.createElement('div');
  valueEl.className = 'knob-value';

  el.appendChild(dial);
  el.appendChild(label);
  el.appendChild(valueEl);

  function render() {
    const norm = clamp01((value - min) / (max - min));
    const angle = START_ANGLE + SWEEP * norm;
    dial.style.setProperty('--angle', `${angle}deg`);
    dial.style.setProperty('--norm', `${norm}`);
    indicator.style.transform = `rotate(${angle}deg)`;
    valueEl.textContent = opts.format ? opts.format(value) : value.toFixed(2);
  }

  function setValue(v: number) {
    value = clamp(v, min, max);
    render();
  }

  let dragging = false;
  let startY = 0;
  let startValue = 0;

  dial.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    startValue = value;
    dial.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  dial.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const deltaY = startY - e.clientY;
    const span = max - min;
    const newVal = clamp(startValue + (deltaY / 160) * span, min, max);
    value = newVal;
    render();
    opts.onChange(value);
  });

  function endDrag(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    try {
      dial.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', endDrag);

  dial.addEventListener(
    'dblclick',
    () => {
      value = opts.value;
      render();
      opts.onChange(value);
    },
    { passive: true }
  );

  render();
  return { el, setValue };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}
