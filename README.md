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

Once GitHub Pages is enabled for this repository (Settings → Pages → Source:
**GitHub Actions** — one-time setup, see below), the app is served at:

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
- Installable PWA: manifest, service worker (offline after first load),
  maskable/adaptive icons.

## Project layout

```
index.html, src/main.ts        entry point
src/audio/
  types.ts                     Patch shape + default patch
  presets.ts                   factory presets
  Envelope.ts                  control-rate ADSR
  Voice.ts                     one polyphonic voice's Web Audio node graph
  SynthEngine.ts                AudioContext, voice pool, LFO, delay, master chain
src/ui/
  Knob.ts, Keyboard.ts         reusable pointer-driven controls
  App.ts                       builds and wires the whole UI
src/styles/main.css
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
[jannu007/DTM](https://github.com/jannu007/dtm) uses. One-time setup:

1. Push this project to the `main` branch (merge this PR / branch).
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. The workflow runs automatically and publishes to
   `https://jannu007.github.io/Moog/`.

This step (2) has to be done once by a repo admin in the GitHub UI; it is
not something that can be automated from a commit.
