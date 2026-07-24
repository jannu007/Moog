export interface RecorderHandle {
  el: HTMLDivElement;
}

/** Records the synth's live output (via MediaRecorder) into a downloadable list of clips. */
export function createRecorder(getStream: () => MediaStream | null): RecorderHandle {
  const el = document.createElement('div');
  el.className = 'recorder panel';

  const title = document.createElement('div');
  title.className = 'panel-title';
  title.textContent = 'RECORDER';
  el.appendChild(title);

  const controls = document.createElement('div');
  controls.className = 'recorder-controls';
  const recBtn = document.createElement('button');
  recBtn.className = 'chip chip-record';
  recBtn.textContent = '⏺ 録音開始';
  const timeEl = document.createElement('div');
  timeEl.className = 'recorder-time';
  timeEl.textContent = '00:00';
  controls.appendChild(recBtn);
  controls.appendChild(timeEl);
  el.appendChild(controls);

  const list = document.createElement('div');
  list.className = 'recorder-list';
  el.appendChild(list);

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let startTime = 0;
  let timerId = 0;
  let clipCount = 0;

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function pickMimeType(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const c of candidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
    }
    return '';
  }

  function addClip(blob: Blob) {
    clipCount += 1;
    const url = URL.createObjectURL(blob);
    const row = document.createElement('div');
    row.className = 'recorder-clip';

    const label = document.createElement('div');
    label.className = 'recorder-clip-label';
    label.textContent = `録音 ${clipCount}`;

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;

    const dl = document.createElement('a');
    dl.className = 'chip';
    dl.textContent = '⬇ 保存';
    dl.href = url;
    const ext = blob.type.includes('ogg') ? 'ogg' : 'webm';
    dl.download = `novawave-synth-${Date.now()}.${ext}`;

    row.appendChild(label);
    row.appendChild(audio);
    row.appendChild(dl);
    list.prepend(row);
  }

  recBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    const stream = getStream();
    if (!stream) return;

    const mimeType = pickMimeType();
    chunks = [];
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || 'audio/webm' });
      addClip(blob);
      recBtn.textContent = '⏺ 録音開始';
      recBtn.classList.remove('recording');
      window.clearInterval(timerId);
      timeEl.textContent = '00:00';
    };
    mediaRecorder.start();
    startTime = performance.now();
    recBtn.textContent = '⏹ 録音停止';
    recBtn.classList.add('recording');
    timerId = window.setInterval(() => {
      timeEl.textContent = formatTime((performance.now() - startTime) / 1000);
    }, 250);
  });

  return { el };
}
