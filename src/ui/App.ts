import { SynthEngine } from '../audio/SynthEngine';
import { factoryPresets } from '../audio/presets';
import { demoSongs } from '../audio/songs';
import { SequencerPlayer, type Song } from '../audio/Sequencer';
import { composePromptSong } from '../audio/aiCompose';
import { defaultPatch, type FilterMode, type Patch, type Waveform } from '../audio/types';
import { createKnob } from './Knob';
import { createKeyboard } from './Keyboard';
import { createVuMeter } from './VuMeter';
import { createRecorder } from './Recorder';

const WAVEFORMS: Waveform[] = ['sine', 'triangle', 'sawtooth', 'square'];
const FILTER_MODES: FilterMode[] = ['lowpass', 'bandpass', 'highpass'];
const WAVE_LABEL: Record<Waveform, string> = { sine: 'SIN', triangle: 'TRI', sawtooth: 'SAW', square: 'SQR' };
const FILTER_LABEL: Record<FilterMode, string> = { lowpass: 'LP', bandpass: 'BP', highpass: 'HP' };

export function mountApp(root: HTMLElement): void {
  const patch: Patch = defaultPatch('Drift Lead');
  Object.assign(patch, factoryPresets()[0]);
  const engine = new SynthEngine(patch);
  const sequencer = new SequencerPlayer(engine);

  let lowestNote = 48;

  root.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'start-overlay';
  const startBtn = document.createElement('button');
  startBtn.textContent = '▶ NovaWave Synth を起動';
  overlay.appendChild(startBtn);
  startBtn.addEventListener('click', async () => {
    await engine.start();
    overlay.remove();
    vu.start(() => engine.getAnalyser());
  });

  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `<h1>NovaWave <span>synth</span></h1>`;
  const patchNameEl = document.createElement('div');
  patchNameEl.className = 'patch-name';
  header.appendChild(patchNameEl);

  const installBtn = document.createElement('button');
  installBtn.className = 'chip';
  installBtn.textContent = '📲 インストール';
  installBtn.style.display = 'none';
  header.appendChild(installBtn);
  setupInstallPrompt(installBtn);

  const vu = createVuMeter();
  header.appendChild(vu.el);

  const presetRow = document.createElement('div');
  presetRow.className = 'preset-row';
  function renderPresets() {
    presetRow.innerHTML = '';
    for (const p of factoryPresets()) {
      const chip = document.createElement('button');
      chip.className = 'chip' + (p.name === patch.name ? ' selected' : '');
      chip.textContent = p.name;
      chip.addEventListener('click', () => {
        sequencer.stop();
        Object.assign(patch, p);
        patchNameEl.textContent = `Patch: ${patch.name}`;
        refreshAllKnobs();
        renderPresets();
      });
      presetRow.appendChild(chip);
    }
  }

  const panels = document.createElement('div');
  panels.className = 'panels';

  const knobSetters: Array<() => void> = [];

  function panel(title: string, build: (body: HTMLElement) => void): HTMLElement {
    const p = document.createElement('div');
    p.className = 'panel';
    const t = document.createElement('div');
    t.className = 'panel-title';
    t.textContent = title;
    p.appendChild(t);
    build(p);
    return p;
  }

  function choiceRow<T extends string>(options: T[], get: () => T, set: (v: T) => void, labels: Record<T, string>): HTMLElement {
    const row = document.createElement('div');
    row.className = 'choice-row';
    function render() {
      row.innerHTML = '';
      for (const opt of options) {
        const btn = document.createElement('button');
        btn.className = 'chip' + (opt === get() ? ' selected' : '');
        btn.textContent = labels[opt];
        btn.addEventListener('click', () => {
          set(opt);
          render();
        });
        row.appendChild(btn);
      }
    }
    render();
    return row;
  }

  function knobRow(defs: Array<{ label: string; min: number; max: number; get: () => number; set: (v: number) => void; format?: (v: number) => string }>): HTMLElement {
    const row = document.createElement('div');
    row.className = 'knob-row';
    for (const d of defs) {
      const handle = createKnob({
        label: d.label,
        min: d.min,
        max: d.max,
        value: d.get(),
        format: d.format,
        onChange: (v) => d.set(v),
      });
      knobSetters.push(() => handle.setValue(d.get()));
      row.appendChild(handle.el);
    }
    return row;
  }

  function refreshAllKnobs() {
    for (const fn of knobSetters) fn();
  }

  panels.appendChild(
    panel('OSC 1', (p) => {
      p.appendChild(choiceRow(WAVEFORMS, () => patch.osc1Waveform, (v) => (patch.osc1Waveform = v), WAVE_LABEL));
      p.appendChild(
        knobRow([
          { label: 'OCT', min: -2, max: 2, get: () => patch.osc1Octave, set: (v) => (patch.osc1Octave = Math.round(v)), format: (v) => `${Math.round(v)}` },
          { label: 'SEMI', min: -12, max: 12, get: () => patch.osc1Semi, set: (v) => (patch.osc1Semi = Math.round(v)), format: (v) => `${Math.round(v)}` },
          { label: 'FINE', min: -50, max: 50, get: () => patch.osc1Fine, set: (v) => (patch.osc1Fine = v), format: (v) => `${v.toFixed(0)}c` },
          { label: 'LVL', min: 0, max: 1, get: () => patch.osc1Level, set: (v) => (patch.osc1Level = v) },
        ])
      );
    })
  );

  panels.appendChild(
    panel('OSC 2', (p) => {
      p.appendChild(choiceRow(WAVEFORMS, () => patch.osc2Waveform, (v) => (patch.osc2Waveform = v), WAVE_LABEL));
      p.appendChild(
        knobRow([
          { label: 'OCT', min: -2, max: 2, get: () => patch.osc2Octave, set: (v) => (patch.osc2Octave = Math.round(v)), format: (v) => `${Math.round(v)}` },
          { label: 'SEMI', min: -12, max: 12, get: () => patch.osc2Semi, set: (v) => (patch.osc2Semi = Math.round(v)), format: (v) => `${Math.round(v)}` },
          { label: 'FINE', min: -50, max: 50, get: () => patch.osc2Fine, set: (v) => (patch.osc2Fine = v), format: (v) => `${v.toFixed(0)}c` },
          { label: 'LVL', min: 0, max: 1, get: () => patch.osc2Level, set: (v) => (patch.osc2Level = v) },
        ])
      );
    })
  );

  panels.appendChild(
    panel('MIX', (p) => {
      p.appendChild(
        knobRow([
          { label: 'SUB', min: 0, max: 1, get: () => patch.subLevel, set: (v) => (patch.subLevel = v) },
          { label: 'NOISE', min: 0, max: 1, get: () => patch.noiseLevel, set: (v) => (patch.noiseLevel = v) },
          { label: 'GLIDE', min: 0, max: 1.5, get: () => patch.glideSec, set: (v) => (patch.glideSec = v), format: (v) => `${v.toFixed(2)}s` },
        ])
      );
    })
  );

  panels.appendChild(
    panel('FILTER', (p) => {
      p.appendChild(choiceRow(FILTER_MODES, () => patch.filterMode, (v) => (patch.filterMode = v), FILTER_LABEL));
      p.appendChild(
        knobRow([
          { label: 'CUTOFF', min: 20, max: 8000, get: () => patch.cutoff, set: (v) => (patch.cutoff = v), format: (v) => `${v.toFixed(0)}Hz` },
          { label: 'RES', min: 0.1, max: 20, get: () => patch.resonance, set: (v) => (patch.resonance = v) },
          { label: 'ENV', min: -1, max: 1, get: () => patch.filterEnvAmount, set: (v) => (patch.filterEnvAmount = v) },
          { label: 'KEY', min: 0, max: 1, get: () => patch.keyTracking, set: (v) => (patch.keyTracking = v) },
          { label: 'DRIVE', min: 0, max: 1, get: () => patch.drive, set: (v) => (patch.drive = v) },
        ])
      );
    })
  );

  panels.appendChild(
    panel('AMP ENV', (p) => {
      p.appendChild(
        knobRow([
          { label: 'A', min: 0, max: 3, get: () => patch.ampAttack, set: (v) => (patch.ampAttack = v), format: (v) => `${v.toFixed(2)}s` },
          { label: 'D', min: 0, max: 3, get: () => patch.ampDecay, set: (v) => (patch.ampDecay = v), format: (v) => `${v.toFixed(2)}s` },
          { label: 'S', min: 0, max: 1, get: () => patch.ampSustain, set: (v) => (patch.ampSustain = v) },
          { label: 'R', min: 0, max: 4, get: () => patch.ampRelease, set: (v) => (patch.ampRelease = v), format: (v) => `${v.toFixed(2)}s` },
        ])
      );
    })
  );

  panels.appendChild(
    panel('FILTER ENV', (p) => {
      p.appendChild(
        knobRow([
          { label: 'A', min: 0, max: 3, get: () => patch.filtAttack, set: (v) => (patch.filtAttack = v), format: (v) => `${v.toFixed(2)}s` },
          { label: 'D', min: 0, max: 3, get: () => patch.filtDecay, set: (v) => (patch.filtDecay = v), format: (v) => `${v.toFixed(2)}s` },
          { label: 'S', min: 0, max: 1, get: () => patch.filtSustain, set: (v) => (patch.filtSustain = v) },
          { label: 'R', min: 0, max: 4, get: () => patch.filtRelease, set: (v) => (patch.filtRelease = v), format: (v) => `${v.toFixed(2)}s` },
        ])
      );
    })
  );

  panels.appendChild(
    panel('LFO', (p) => {
      p.appendChild(choiceRow(WAVEFORMS, () => patch.lfoWaveform, (v) => (patch.lfoWaveform = v), WAVE_LABEL));
      p.appendChild(
        knobRow([
          { label: 'RATE', min: 0.05, max: 20, get: () => patch.lfoRateHz, set: (v) => (patch.lfoRateHz = v), format: (v) => `${v.toFixed(2)}Hz` },
          { label: 'PITCH', min: 0, max: 1, get: () => patch.lfoToPitch, set: (v) => (patch.lfoToPitch = v) },
          { label: 'FILT', min: 0, max: 1, get: () => patch.lfoToFilter, set: (v) => (patch.lfoToFilter = v) },
          { label: 'AMP', min: 0, max: 1, get: () => patch.lfoToAmp, set: (v) => (patch.lfoToAmp = v) },
        ])
      );
    })
  );

  panels.appendChild(
    panel('DELAY', (p) => {
      p.appendChild(
        knobRow([
          { label: 'MIX', min: 0, max: 1, get: () => patch.delayMix, set: (v) => (patch.delayMix = v) },
          { label: 'TIME', min: 0.02, max: 1.5, get: () => patch.delayTimeSec, set: (v) => (patch.delayTimeSec = v), format: (v) => `${v.toFixed(2)}s` },
          { label: 'FDBK', min: 0, max: 0.9, get: () => patch.delayFeedback, set: (v) => (patch.delayFeedback = v) },
        ])
      );
    })
  );

  panels.appendChild(
    panel('MASTER', (p) => {
      p.appendChild(knobRow([{ label: 'VOL', min: 0, max: 1, get: () => patch.masterVolume, set: (v) => (patch.masterVolume = v) }]));
    })
  );

  function playSong(song: Song, statusEl: HTMLElement, idleText: string, label: string) {
    Object.assign(patch, song.patch);
    patchNameEl.textContent = `Patch: ${label}`;
    refreshAllKnobs();
    renderPresets();
    statusEl.textContent = `再生中: ${song.title} — ${song.subtitle}`;
    sequencer.play(song, () => {
      statusEl.textContent = idleText;
    });
  }

  const songRow = document.createElement('div');
  songRow.className = 'song-row';
  const songStatus = document.createElement('div');
  songStatus.className = 'song-status';
  const SONG_IDLE_TEXT = 'デモ曲: 停止中';
  songStatus.textContent = SONG_IDLE_TEXT;

  function renderSongs() {
    songRow.innerHTML = '';
    for (const song of demoSongs()) {
      const btn = document.createElement('button');
      btn.className = 'chip chip-song';
      btn.textContent = `▶ ${song.title}`;
      btn.addEventListener('click', () => {
        playSong(song, songStatus, SONG_IDLE_TEXT, `${song.title} (demo)`);
      });
      songRow.appendChild(btn);
    }
    const stopBtn = document.createElement('button');
    stopBtn.className = 'chip chip-stop';
    stopBtn.textContent = '■ 停止';
    stopBtn.addEventListener('click', () => {
      sequencer.stop();
      songStatus.textContent = SONG_IDLE_TEXT;
      aiStatus.textContent = AI_IDLE_TEXT;
    });
    songRow.appendChild(stopBtn);
  }
  renderSongs();

  // --- AI composer: turns a free-text prompt into a procedurally generated song ---
  const aiPanel = document.createElement('div');
  aiPanel.className = 'ai-composer panel';
  const aiTitle = document.createElement('div');
  aiTitle.className = 'panel-title';
  aiTitle.textContent = 'AI COMPOSER';
  const aiHint = document.createElement('div');
  aiHint.className = 'ai-hint';
  aiHint.textContent = '例: 「悲しい冬の夜」「楽しく踊れる曲」「静かな朝の海辺」— キーワードから曲想・テンポ・音色を自動生成します。';
  const aiRow = document.createElement('div');
  aiRow.className = 'ai-row';
  const aiInput = document.createElement('input');
  aiInput.type = 'text';
  aiInput.className = 'ai-prompt-input';
  aiInput.placeholder = '曲のイメージを入力…';
  aiInput.maxLength = 80;
  const aiGenerateBtn = document.createElement('button');
  aiGenerateBtn.className = 'chip chip-song';
  aiGenerateBtn.textContent = '🎼 作曲して再生';
  const aiRerollBtn = document.createElement('button');
  aiRerollBtn.className = 'chip';
  aiRerollBtn.textContent = '🎲 別バージョン';
  const aiStopBtn = document.createElement('button');
  aiStopBtn.className = 'chip chip-stop';
  aiStopBtn.textContent = '■ 停止';
  aiRow.appendChild(aiInput);
  aiRow.appendChild(aiGenerateBtn);
  aiRow.appendChild(aiRerollBtn);
  aiRow.appendChild(aiStopBtn);
  const aiStatus = document.createElement('div');
  aiStatus.className = 'song-status';
  const AI_IDLE_TEXT = 'AI作曲: 未生成';
  aiStatus.textContent = AI_IDLE_TEXT;

  let variationSeed = 0;
  function generateAndPlay() {
    const promptText = aiInput.value;
    const seeded = variationSeed > 0 ? `${promptText}#${variationSeed}` : promptText;
    const song = composePromptSong(seeded);
    playSong(song, aiStatus, AI_IDLE_TEXT, `AI: ${song.title}`);
  }
  aiGenerateBtn.addEventListener('click', () => {
    variationSeed = 0;
    generateAndPlay();
  });
  aiRerollBtn.addEventListener('click', () => {
    variationSeed += 1;
    generateAndPlay();
  });
  aiStopBtn.addEventListener('click', () => {
    sequencer.stop();
    aiStatus.textContent = AI_IDLE_TEXT;
    songStatus.textContent = SONG_IDLE_TEXT;
  });
  aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      variationSeed = 0;
      generateAndPlay();
    }
  });

  aiPanel.appendChild(aiTitle);
  aiPanel.appendChild(aiHint);
  aiPanel.appendChild(aiRow);
  aiPanel.appendChild(aiStatus);

  const recorder = createRecorder(
    () => engine.getRecordingStream(),
    () => sequencer.playingSong?.bpm ?? null
  );

  const octRow = document.createElement('div');
  octRow.className = 'oct-row';
  const octDown = document.createElement('button');
  octDown.className = 'chip';
  octDown.textContent = 'OCT −';
  const octUp = document.createElement('button');
  octUp.className = 'chip';
  octUp.textContent = 'OCT +';
  const noteReadout = document.createElement('div');
  noteReadout.className = 'note-readout';
  octRow.appendChild(octDown);
  octRow.appendChild(octUp);
  octRow.appendChild(noteReadout);

  const keyboardHandle = createKeyboard({
    lowestNote,
    octaveSpan: 3,
    onNoteOn: (n) => engine.noteOn(n),
    onNoteOff: (n) => engine.noteOff(n),
  });

  function updateNoteReadout() {
    noteReadout.textContent = `Base note: ${lowestNote}`;
  }
  octDown.addEventListener('click', () => {
    lowestNote = Math.max(12, lowestNote - 12);
    keyboardHandle.setLowestNote(lowestNote);
    updateNoteReadout();
  });
  octUp.addEventListener('click', () => {
    lowestNote = Math.min(96, lowestNote + 12);
    keyboardHandle.setLowestNote(lowestNote);
    updateNoteReadout();
  });

  const hint = document.createElement('div');
  hint.className = 'install-hint';
  hint.textContent = 'ヒント: ブラウザメニューの「アプリをインストール」/「ホーム画面に追加」でネイティブアプリのように使えます。';

  patchNameEl.textContent = `Patch: ${patch.name}`;
  updateNoteReadout();
  renderPresets();

  root.appendChild(header);
  root.appendChild(presetRow);
  root.appendChild(panels);
  root.appendChild(songRow);
  root.appendChild(songStatus);
  root.appendChild(aiPanel);
  root.appendChild(recorder.el);
  root.appendChild(octRow);
  root.appendChild(keyboardHandle.el);
  root.appendChild(hint);
  root.appendChild(overlay);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sequencer.stop();
      engine.allNotesOff();
    }
  });
}

function setupInstallPrompt(button: HTMLButtonElement): void {
  let deferredEvent: any = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredEvent = e;
    button.style.display = 'inline-block';
  });
  button.addEventListener('click', async () => {
    if (!deferredEvent) return;
    deferredEvent.prompt();
    await deferredEvent.userChoice;
    deferredEvent = null;
    button.style.display = 'none';
  });
  window.addEventListener('appinstalled', () => {
    button.style.display = 'none';
  });
}
