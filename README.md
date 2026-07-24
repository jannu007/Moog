# NovaWave Synth

An original, fully free, MIT-licensed semi-modular analog-style synthesizer
for Android. It is inspired by the general design language of hardware
semi-modular synths (dual oscillators, resonant filter, dual envelopes, LFO)
but is an independent implementation: no Moog (or any other manufacturer's)
trademarks, product names, artwork, firmware, or circuit designs are used.
Everything — DSP code, UI, and branding — was written from scratch for this
project.

## License / commercial use

MIT licensed (see `LICENSE`). You may use, modify, and ship this app
(including commercially) at no cost and with no royalties, as long as the
license notice is retained. Because it avoids any third-party trademarks or
proprietary assets, there is nothing to clear before shipping it.

## Features

- Two band-limited (PolyBLEP) oscillators: sine / triangle / saw / square,
  each with octave, semitone, fine-tune, and level.
- Sub-oscillator and white-noise generator.
- State-variable filter (low-pass / band-pass / high-pass) with resonance,
  drive/saturation, key tracking, and dedicated filter envelope.
- Amplitude ADSR + filter ADSR.
- LFO (sine/triangle/saw/square) routable to pitch, filter cutoff, and amplitude.
- Glide/portamento.
- Built-in feedback delay effect.
- 8-voice polyphony with voice stealing.
- Multi-touch on-screen keyboard (chords + glissando via real Android
  `MotionEvent` pointer tracking, not just single-touch gestures).
- Four factory presets (Drift Lead, Warm Pad, Sub Bass, Metal Pluck).
- Knob-based UI built with Jetpack Compose.

## Project layout

```
app/src/main/java/com/novawave/synth/
  audio/     DSP engine: Oscillator, Envelope, StateVariableFilter, Voice, SynthEngine
  model/     Patch (the live, UI-bound parameter set)
  ui/        Compose UI: Knob, Controls, PianoKeyboard(View), SynthScreen
  MainActivity.kt
```

The audio engine renders directly to an `AudioTrack` in streaming mode from a
dedicated high-priority thread — no third-party audio libraries or native
code required.

## Building

This is a standard Gradle/Android Studio project:

1. Open the repository root in Android Studio (Koala+ recommended).
2. Let Gradle sync (requires network access to `google()` and
   `mavenCentral()` to download the Android Gradle Plugin, Kotlin, and
   AndroidX/Compose dependencies).
3. Run the `app` configuration on a device or emulator (min SDK 26 / Android 8.0).

> Note: this sandboxed development environment does not have network access
> to Google's Maven repository or a local Android SDK installed, so the build
> could not be executed here. The source follows standard AGP 8.5 / Kotlin
> 1.9 / Compose conventions and should build cleanly in a normal Android
> Studio setup.

## Playing it

- Drag any knob vertically to change its value.
- Tap waveform/filter-mode chips to switch options.
- Tap preset names along the top to load a factory patch.
- Play the on-screen keyboard with one or more fingers; "OCT −" / "OCT +"
  shift the visible keyboard range.
