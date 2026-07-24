export interface VuMeterHandle {
  el: HTMLDivElement;
  start: (getAnalyser: () => AnalyserNode | null) => void;
}

const SEGMENTS = 12;

/** Segmented LED-style VU meter reading RMS level from an AnalyserNode. */
export function createVuMeter(): VuMeterHandle {
  const el = document.createElement('div');
  el.className = 'vu-meter';

  const led = document.createElement('div');
  led.className = 'power-led';
  el.appendChild(led);

  const bars = document.createElement('div');
  bars.className = 'vu-bars';
  const segments: HTMLDivElement[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const seg = document.createElement('div');
    seg.className = 'vu-seg';
    if (i >= SEGMENTS - 2) seg.classList.add('vu-seg-red');
    else if (i >= SEGMENTS - 5) seg.classList.add('vu-seg-yellow');
    bars.appendChild(seg);
    segments.push(seg);
  }
  el.appendChild(bars);

  let buffer: Uint8Array<ArrayBuffer> | null = null;

  function start(getAnalyser: () => AnalyserNode | null) {
    led.classList.add('on');
    function tick() {
      const analyser = getAnalyser();
      if (analyser) {
        if (!buffer || buffer.length !== analyser.fftSize) {
          buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        }
        analyser.getByteTimeDomainData(buffer);
        let sumSq = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.sqrt(sumSq / buffer.length);
        const lit = Math.round(Math.min(1, rms * 3.2) * SEGMENTS);
        segments.forEach((seg, i) => seg.classList.toggle('lit', i < lit));
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  return { el, start };
}
