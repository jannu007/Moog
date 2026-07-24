import { decodeClip, mixBuffers, pickRecorderMimeType, syncClipTempo } from '../audio/AudioTools';

export interface RecorderHandle {
  el: HTMLDivElement;
}

interface Clip {
  id: number;
  blob: Blob;
  url: string;
  label: string;
  bpm: number;
  row: HTMLDivElement;
  checkbox: HTMLInputElement;
}

const DEFAULT_BPM = 120;

/** Records the synth's live output, and lets the user tempo-sync and mix recorded clips. */
export function createRecorder(getStream: () => MediaStream | null, getCurrentBpm: () => number | null): RecorderHandle {
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

  const bpmLabel = document.createElement('label');
  bpmLabel.className = 'recorder-bpm-label';
  bpmLabel.textContent = '共通テンポ';
  const bpmInput = document.createElement('input');
  bpmInput.type = 'number';
  bpmInput.className = 'recorder-bpm-input';
  bpmInput.min = '40';
  bpmInput.max = '240';
  bpmInput.value = String(DEFAULT_BPM);
  bpmLabel.appendChild(bpmInput);

  controls.appendChild(recBtn);
  controls.appendChild(timeEl);
  controls.appendChild(bpmLabel);
  el.appendChild(controls);

  const mixRow = document.createElement('div');
  mixRow.className = 'recorder-mix-row';
  const mixBtn = document.createElement('button');
  mixBtn.className = 'chip chip-mix';
  mixBtn.textContent = '🎚 選択したクリップをミックス';
  mixBtn.disabled = true;
  const statusEl = document.createElement('div');
  statusEl.className = 'recorder-status';
  mixRow.appendChild(mixBtn);
  mixRow.appendChild(statusEl);
  el.appendChild(mixRow);

  const list = document.createElement('div');
  list.className = 'recorder-list';
  el.appendChild(list);

  // Close any open clip menu when clicking elsewhere on the page. The dropdown
  // itself lives in <body> (see addClip), so it must be excluded explicitly.
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.clip-menu') && !target.closest('.clip-menu-dropdown')) {
      document.querySelectorAll('.clip-menu-dropdown.open').forEach((d) => d.classList.remove('open'));
    }
  });

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: BlobPart[] = [];
  let startTime = 0;
  let timerId = 0;
  let clipCounter = 0;
  const clips: Clip[] = [];

  function formatTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setStatus(text: string) {
    statusEl.textContent = text;
  }

  function updateMixButton() {
    const selected = clips.filter((c) => c.checkbox.checked).length;
    mixBtn.disabled = selected < 2;
    mixBtn.textContent = selected >= 2 ? `🎚 選択した${selected}件をミックス` : '🎚 選択したクリップをミックス';
  }

  function extFor(blob: Blob): string {
    if (blob.type.includes('wav')) return 'wav';
    if (blob.type.includes('ogg')) return 'ogg';
    return 'webm';
  }

  function addClip(blob: Blob, label: string, bpm: number): Clip {
    clipCounter += 1;
    const url = URL.createObjectURL(blob);
    const row = document.createElement('div');
    row.className = 'recorder-clip';

    const top = document.createElement('div');
    top.className = 'recorder-clip-top';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.title = 'ミックスに含める';
    checkbox.addEventListener('change', updateMixButton);

    const labelEl = document.createElement('div');
    labelEl.className = 'recorder-clip-label';
    labelEl.textContent = label;

    const bpmField = document.createElement('label');
    bpmField.className = 'recorder-clip-bpm';
    bpmField.textContent = 'BPM';
    const bpmNumberInput = document.createElement('input');
    bpmNumberInput.type = 'number';
    bpmNumberInput.min = '40';
    bpmNumberInput.max = '240';
    bpmNumberInput.value = String(bpm);
    bpmNumberInput.addEventListener('change', () => {
      clip.bpm = Number(bpmNumberInput.value) || DEFAULT_BPM;
    });
    bpmField.appendChild(bpmNumberInput);

    const syncBtn = document.createElement('button');
    syncBtn.className = 'chip chip-sync';
    syncBtn.textContent = '🔄 同期';
    syncBtn.title = 'このクリップを「共通テンポ」に合わせた新しいクリップを作成します';

    // The dropdown is appended to <body> (position: fixed, positioned via
    // getBoundingClientRect on open) rather than nested inside the scrolling
    // clip list, so it isn't clipped by that list's overflow:auto.
    const menuWrap = document.createElement('div');
    menuWrap.className = 'clip-menu';
    const menuBtn = document.createElement('button');
    menuBtn.className = 'chip clip-menu-btn';
    menuBtn.textContent = '⋮';
    menuBtn.title = 'その他の操作';
    const menuDropdown = document.createElement('div');
    menuDropdown.className = 'clip-menu-dropdown';

    const dl = document.createElement('a');
    dl.className = 'clip-menu-item';
    dl.textContent = '⬇ 保存';
    dl.href = url;
    dl.download = `novawave-synth-${Date.now()}.${extFor(blob)}`;

    const deleteItem = document.createElement('button');
    deleteItem.className = 'clip-menu-item clip-menu-item-danger';
    deleteItem.textContent = '🗑 削除';

    menuDropdown.appendChild(dl);
    menuDropdown.appendChild(deleteItem);
    menuWrap.appendChild(menuBtn);
    document.body.appendChild(menuDropdown);

    function closeMenu() {
      menuDropdown.classList.remove('open');
    }
    function openMenu() {
      document.querySelectorAll('.clip-menu-dropdown.open').forEach((d) => d.classList.remove('open'));
      const rect = menuBtn.getBoundingClientRect();
      menuDropdown.style.top = `${rect.bottom + 4}px`;
      menuDropdown.style.left = `${Math.max(4, rect.right - menuDropdown.offsetWidth || rect.right - 130)}px`;
      menuDropdown.classList.add('open');
      const dropdownRect = menuDropdown.getBoundingClientRect();
      const overflowRight = dropdownRect.right - window.innerWidth + 4;
      if (overflowRight > 0) menuDropdown.style.left = `${parseFloat(menuDropdown.style.left) - overflowRight}px`;
    }
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuDropdown.classList.contains('open')) closeMenu();
      else openMenu();
    });
    dl.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, { passive: true, capture: true });

    top.appendChild(checkbox);
    top.appendChild(labelEl);
    top.appendChild(bpmField);
    top.appendChild(syncBtn);

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = url;

    const bottom = document.createElement('div');
    bottom.className = 'recorder-clip-bottom';
    bottom.appendChild(audio);
    bottom.appendChild(menuWrap);

    row.appendChild(top);
    row.appendChild(bottom);
    list.prepend(row);

    const clip: Clip = { id: clipCounter, blob, url, label, bpm, row, checkbox };
    clips.unshift(clip);

    deleteItem.addEventListener('click', () => {
      closeMenu();
      if (!window.confirm(`「${label}」を削除しますか?`)) return;
      URL.revokeObjectURL(url);
      row.remove();
      menuDropdown.remove();
      const idx = clips.indexOf(clip);
      if (idx !== -1) clips.splice(idx, 1);
      updateMixButton();
      setStatus(`「${label}」を削除しました。`);
    });

    syncBtn.addEventListener('click', async () => {
      const targetBpm = Number(bpmInput.value) || DEFAULT_BPM;
      syncBtn.disabled = true;
      setStatus(`「${label}」を ${clip.bpm} → ${targetBpm} BPM に同期中… (再生時間分お待ちください)`);
      try {
        const synced = await syncClipTempo(clip.blob, clip.bpm, targetBpm);
        addClip(synced, `${label} (→${targetBpm}BPM)`, targetBpm);
        setStatus('テンポ同期が完了しました。');
      } catch (err) {
        setStatus(`テンポ同期に失敗しました: ${(err as Error).message}`);
      } finally {
        syncBtn.disabled = false;
      }
    });

    return clip;
  }

  mixBtn.addEventListener('click', async () => {
    const selected = clips.filter((c) => c.checkbox.checked);
    if (selected.length < 2) return;
    mixBtn.disabled = true;
    setStatus(`${selected.length}件のクリップをミックス中…`);
    try {
      const buffers = await Promise.all(selected.map((c) => decodeClip(c.blob)));
      const mixed = await mixBuffers(buffers);
      const targetBpm = Number(bpmInput.value) || DEFAULT_BPM;
      addClip(mixed, `ミックス (${selected.map((c) => c.label).join(' + ')})`, targetBpm);
      setStatus('ミックスが完了しました。');
    } catch (err) {
      setStatus(`ミックスに失敗しました: ${(err as Error).message}`);
    } finally {
      updateMixButton();
    }
  });

  recBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      return;
    }
    const stream = getStream();
    if (!stream) return;

    const mimeType = pickRecorderMimeType();
    chunks = [];
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || 'audio/webm' });
      const bpm = getCurrentBpm() ?? (Number(bpmInput.value) || DEFAULT_BPM);
      addClip(blob, `録音 ${clipCounter + 1}`, bpm);
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
