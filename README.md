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
`android/` for anyone who wants that instead — see `android/README.md`.

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
- Glide/portamento, feedback delay effect, soft-clip output limiter.
- 8-voice polyphony with voice stealing, built on persistent always-running
  oscillators (the standard low-latency Web Audio synth-voice pattern).
- Multi-touch on-screen keyboard (chords + glissando via Pointer Events).
- Four factory presets (Drift Lead, Warm Pad, Sub Bass, Metal Pluck).
- **Analog-hardware styled UI**: wood-grain chassis, brushed-metal panels,
  chrome knobs, an LED power indicator, and a live segmented VU meter driven
  by an `AnalyserNode`.
- **Built-in recorder**: captures the live (post-limiter) output via
  `MediaRecorder`, with an in-page player and a download link per take —
  works for both live playing and demo-song playback.
- **3 original demo songs**, composed and sequenced entirely with this
  synth's own engine (see "Demo songs" below): 安曇野の雪 (Snow in Azumino),
  犀川のほとり (Riverside of the Saigawa), 上高地の夜明け (Dawn in
  Kamikochi). Press ▶ on any of them, then use the recorder to save a take.
- Installable PWA: manifest, service worker (offline after first load),
  maskable/adaptive icons.

## Demo songs

`src/audio/songs.ts` defines three original, short instrumental pieces as
plain note-event data (no audio files) — each sets its own patch (via
`Object.assign` onto the live `Patch`) and a list of `{note, startSec,
durSec}` events, then `SequencerPlayer` (`src/audio/Sequencer.ts`) schedules
them onto the running `SynthEngine` with `setTimeout`, matching the engine's
existing control-rate philosophy:

- **安曇野の雪 (Snow in Azumino)** — slow, spacious A-minor pad with a
  falling bell-like melody.
- **犀川のほとり (Riverside of the Saigawa)** — brighter, continuously
  flowing 16th-note arpeggio over C–G–Am–F.
- **上高地の夜明け (Dawn in Kamikochi)** — slow-swelling pad with a melody
  that climbs higher through each chord, D–Bm–G–A.

They're original compositions written for this project — no third-party
melodies, samples, or scores are used.

## Project layout

```
index.html, src/main.ts        entry point
src/audio/
  types.ts                     Patch shape + default patch
  presets.ts                   factory presets
  songs.ts                     3 original demo songs (note-event data + patch per song)
  Sequencer.ts                 schedules a Song's notes onto a SynthEngine
  Envelope.ts                  control-rate ADSR
  Voice.ts                     one polyphonic voice's Web Audio node graph
  SynthEngine.ts                AudioContext, voice pool, LFO, delay, master chain,
                                analyser + MediaStream tap for recording
src/ui/
  Knob.ts, Keyboard.ts         reusable pointer-driven controls
  VuMeter.ts                   segmented LED level meter
  Recorder.ts                  MediaRecorder UI (record/stop/list/download)
  App.ts                       builds and wires the whole UI
src/styles/main.css            analog-hardware look (wood/metal/chrome)
public/                        manifest.webmanifest, sw.js, icons
android/                       optional native Kotlin/Compose build (see android/README.md)
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

## Deploying to GitHub Pages

`.github/workflows/deploy-pages.yml` builds the Vite project and deploys
`dist/` on every push to `main`, using GitHub's official Pages Actions
(`upload-pages-artifact` / `deploy-pages`) — the same mechanism
[jannu007/DTM](https://github.com/jannu007/dtm) uses. Already set up and
live for this repo; every merge to `main` redeploys automatically.
