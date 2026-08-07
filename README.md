# NovaWave Synth

An original, fully free, MIT-licensed semi-modular analog-style synthesizer.
It is inspired by the general design language of hardware semi-modular
synths (dual oscillators, resonant filter, dual envelopes, LFO) but is an
independent implementation: no Moog (or any other manufacturer's)
trademarks, product names, artwork, firmware, or circuit designs are used.
Everything — DSP code, UI, and branding — was written from scratch for this
project.

**This repo's primary app is a browser-installable PWA** (same pattern as
[jannu007/DTM](https://github.com/jannu007/dtm)): open the GitHub Pages URL
on an Android phone (or desktop), and the browser offers "Install app" /
"Add to Home screen" — no APK, no Play Store listing, no build step for the
end user. A from-scratch native Android (Kotlin/Compose) build also lives in
`android/` for anyone who wants that instead — see `android/README.md` (that
project was never build-verified — see its README for details).

For actually publishing to Google Play, use the **Capacitor-based** Android
project in `android-capacitor/` instead (wraps the same Vite web app that's
already built and tested) — see the "Google Play への公開" section below.

## Try it

The app is live at:

```
https://jannu007.github.io/Moog/
```

On Android Chrome: open that URL → menu (⋮) → **"アプリをインストール" /
"Install app"**, or use the in-page "📲 インストール" button once your
browser fires its install prompt. It then behaves like a normal installed
app (own icon, standalone window, works offline after first load).

## License / commercial use

MIT licensed (see `LICENSE`). You may use, modify, and ship this app
(including commercially) at no cost and with no royalties, as long as the
license notice is retained. Because it avoids any third-party trademarks or
proprietary assets, there is nothing to clear before shipping it.

## Features

- Two oscillators (sine / triangle / saw / square), each with octave,
  semitone, fine-tune, and level.
- Sub-oscillator and white-noise generator.
- Resonant filter (low-pass / band-pass / high-pass) with drive/saturation,
  key tracking, and a dedicated filter envelope.
- Amplitude ADSR + filter ADSR (control-rate, recomputed every animation
  frame so knob tweaks are heard immediately, even on a sustained note).
- LFO (sine/triangle/saw/square) routable to pitch, filter cutoff, and
  amplitude — via native Web Audio `AudioParam` connections.
- Glide/portamento, soft-clip output limiter.
- **Effects chain** (voices → distortion → chorus → delay → tremolo →
  master): **Distortion** (drive amount + dry/wet mix through a fixed
  saturating `WaveShaperNode` curve), **Chorus** (short modulated delay —
  rate/depth/mix — via an LFO driving `DelayNode.delayTime`), feedback
  **Delay**, and **Tremolo** (rate/depth amplitude modulation).
- 8-voice polyphony with voice stealing, built on persistent always-running
  oscillators (the standard low-latency Web Audio synth-voice pattern).
- Multi-touch on-screen keyboard (chords + glissando via Pointer Events).
- Four factory presets (Drift Lead, Warm Pad, Sub Bass, Metal Pluck).
- **Analog-hardware styled UI**: wood-grain chassis, brushed-metal panels,
  chrome knobs, an LED power indicator, and a live segmented VU meter driven
  by an `AnalyserNode`.
- **Built-in recorder**: captures the live (post-limiter, post-effects)
  output via `MediaRecorder`, with an in-page player and a "⋮" menu per take
  (save / delete). Each take remembers the BPM it was recorded at (defaults
  to the "共通テンポ" field; editable by hand).
- **Tempo sync**: re-renders any recorded take to a common "共通テンポ"
  target BPM using the browser's own pitch-preserving time-stretch
  (`HTMLMediaElement.preservesPitch` + `playbackRate`, captured back to a
  file), so takes recorded at different tempos end up at the same speed.
- **Mixing**: select two or more recorded takes and mix them down to a
  single WAV file (decoded and summed offline via `OfflineAudioContext` —
  fast, no real-time wait). Typical flow: tempo-sync each take to the same
  BPM first, then mix them together.
- Installable PWA: manifest, service worker (offline after first load),
  maskable/adaptive icons.

## Project layout

```
index.html, src/main.ts        entry point
src/audio/
  types.ts                     Patch shape + default patch
  presets.ts                   factory presets
  AudioTools.ts                 offline tempo-sync (playbackRate + preservesPitch,
                                captured via MediaRecorder) and clip mixing
                                (OfflineAudioContext + WAV encoder)
  Envelope.ts                  control-rate ADSR
  Voice.ts                     one polyphonic voice's Web Audio node graph
  SynthEngine.ts                AudioContext, voice pool, LFO, effects chain
                                (distortion/chorus/delay/tremolo), master
                                chain, analyser + MediaStream tap for recording
src/ui/
  Knob.ts, Keyboard.ts         reusable pointer-driven controls
  VuMeter.ts                   segmented LED level meter
  Recorder.ts                  record/stop/list/download + per-clip tempo sync + mixing
  App.ts                       builds and wires the whole UI
src/styles/main.css            analog-hardware look (wood/metal/chrome)
public/                        manifest.webmanifest, sw.js, icons
android/                       optional native Kotlin/Compose build (see android/README.md)
android-capacitor/             Capacitor-generated Android project used for Google Play builds
```

## Development

```
npm install
npm run dev       # local dev server
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
```

Requires a user gesture to start audio (browsers block autoplay) — the app
shows a "▶ NovaWave Synth を起動" overlay on load; tapping it creates/resumes
the `AudioContext`.

## Google Play への公開（Android AAB ビルド）

`android-capacitor/` は [Capacitor](https://capacitorjs.com/) で生成した
Android ネイティブプロジェクトです（`android/` の手書き Kotlin 実装とは別物）。
`.github/workflows/android-release.yml`（GitHub Actions、手動実行
`workflow_dispatch`）が Web アセットのビルドから署名済み `.aab`
（Android App Bundle）の生成までを行います。ローカルに Android SDK がなくても
CI 上でビルドできます。

事前に GitHub リポジトリの **Settings → Secrets and variables → Actions** に
以下の Secrets を登録してください（署名鍵の作り方は
[jannu007/GooglePlay](https://github.com/jannu007/GooglePlay) の公開ガイド参照）。

- `ANDROID_KEYSTORE_BASE64` … リリース用 keystore ファイルを base64 化したもの
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

ワークフローを実行すると `novawave-synth-release-aab` という Artifact に
`app-release.aab` が生成されます。これを Google Play Console の
「製品版」トラックにアップロードして審査に出せます。

ローカルで動作確認したい場合:

```bash
npm install
npm run build
npx cap sync android
npx cap open android   # Android Studio が必要
```

## Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds the Vite project and deploys
`dist/` on every push to `main`, using GitHub's official Pages Actions
(`upload-pages-artifact` / `deploy-pages`) — the same mechanism
[jannu007/DTM](https://github.com/jannu007/dtm) uses. Already set up and
live for this repo; every merge to `main` redeploys automatically.
