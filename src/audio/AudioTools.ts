/** Offline helpers for post-processing recorded clips: tempo sync and mixing. */

const DECODE_SAMPLE_RATE = 44100;

export async function decodeClip(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new OfflineAudioContext(2, 1, DECODE_SAMPLE_RATE);
  return decodeCtx.decodeAudioData(arrayBuffer);
}

/** Sums multiple clips starting at t=0 (a simple overlay mix) and returns a WAV blob. */
export async function mixBuffers(buffers: AudioBuffer[]): Promise<Blob> {
  const maxLen = Math.max(...buffers.map((b) => b.length));
  const offline = new OfflineAudioContext(2, maxLen, DECODE_SAMPLE_RATE);
  const headroom = 1 / Math.max(1, buffers.length * 0.7);

  for (const buffer of buffers) {
    const src = offline.createBufferSource();
    src.buffer = buffer;
    const gain = offline.createGain();
    gain.gain.value = headroom;
    src.connect(gain).connect(offline.destination);
    src.start(0);
  }

  const rendered = await offline.startRendering();
  return audioBufferToWav(rendered);
}

/**
 * Re-records a clip at a new tempo using the browser's own pitch-preserving
 * time-stretch (HTMLMediaElement.preservesPitch + playbackRate), captured
 * back to a file via MediaRecorder. Real-time: takes as long as the
 * resulting (stretched) clip's duration.
 */
export async function syncClipTempo(blob: Blob, sourceBpm: number, targetBpm: number): Promise<Blob> {
  const AnyWindow = window as unknown as { MediaRecorder?: typeof MediaRecorder };
  if (!AnyWindow.MediaRecorder) throw new Error('MediaRecorder unsupported');

  const rate = clamp(targetBpm / sourceBpm, 0.4, 2.5);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preservesPitch = true;
  const legacy = audio as unknown as { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
  legacy.mozPreservesPitch = true;
  legacy.webkitPreservesPitch = true;
  audio.playbackRate = rate;

  await new Promise<void>((resolve, reject) => {
    audio.addEventListener('loadedmetadata', () => resolve(), { once: true });
    audio.addEventListener('error', () => reject(new Error('failed to load clip for tempo sync')), { once: true });
    audio.load();
  });

  const captureFn = (
    audio as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }
  ).captureStream ?? (audio as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream;
  if (!captureFn) {
    URL.revokeObjectURL(url);
    throw new Error('captureStream unsupported in this browser');
  }
  const stream = captureFn.call(audio);

  const mimeType = pickRecorderMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
  });

  recorder.start();
  await audio.play();
  audio.addEventListener(
    'ended',
    () => {
      recorder.stop();
      URL.revokeObjectURL(url);
    },
    { once: true }
  );

  return done;
}

export function pickRecorderMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/** Minimal PCM16 WAV encoder — no external dependencies. */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
