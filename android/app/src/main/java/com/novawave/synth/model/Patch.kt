package com.novawave.synth.model

import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import com.novawave.synth.audio.FilterMode
import com.novawave.synth.audio.Waveform

/**
 * Live, UI-bound parameter set for the synth engine. Compose state objects
 * are safe to read from the audio thread (they simply return the last
 * committed value), so no extra locking is needed for these simple scalars.
 */
class Patch(name: String = "Init") {

    var name = mutableStateOf(name)

    // Oscillator 1
    var osc1Waveform = mutableStateOf(Waveform.SAW)
    var osc1Octave = mutableStateOf(0)          // -2..+2
    var osc1Semi = mutableStateOf(0)             // -12..+12
    var osc1Fine = mutableFloatStateOf(0f)       // cents -50..50
    var osc1Level = mutableFloatStateOf(0.8f)

    // Oscillator 2
    var osc2Waveform = mutableStateOf(Waveform.SQUARE)
    var osc2Octave = mutableStateOf(-1)
    var osc2Semi = mutableStateOf(0)
    var osc2Fine = mutableFloatStateOf(7f)
    var osc2Level = mutableFloatStateOf(0.55f)

    // Sub + noise
    var subLevel = mutableFloatStateOf(0.35f)
    var noiseLevel = mutableFloatStateOf(0f)

    // Filter
    var filterMode = mutableStateOf(FilterMode.LOWPASS)
    var cutoff = mutableFloatStateOf(1800f)      // Hz
    var resonance = mutableFloatStateOf(0.2f)    // 0..1
    var filterEnvAmount = mutableFloatStateOf(0.55f) // -1..1
    var keyTracking = mutableFloatStateOf(0.5f)  // 0..1
    var drive = mutableFloatStateOf(0.15f)

    // Amp envelope
    var ampAttack = mutableFloatStateOf(0.008f)
    var ampDecay = mutableFloatStateOf(0.25f)
    var ampSustain = mutableFloatStateOf(0.75f)
    var ampRelease = mutableFloatStateOf(0.25f)

    // Filter envelope
    var filtAttack = mutableFloatStateOf(0.01f)
    var filtDecay = mutableFloatStateOf(0.35f)
    var filtSustain = mutableFloatStateOf(0.3f)
    var filtRelease = mutableFloatStateOf(0.3f)

    // LFO
    var lfoWaveform = mutableStateOf(Waveform.TRIANGLE)
    var lfoRateHz = mutableFloatStateOf(3.5f)
    var lfoToPitch = mutableFloatStateOf(0f)     // 0..1 -> semitones
    var lfoToFilter = mutableFloatStateOf(0f)    // 0..1 -> Hz range
    var lfoToAmp = mutableFloatStateOf(0f)       // 0..1 tremolo

    // Glide / voicing
    var glideSec = mutableFloatStateOf(0.0f)
    var unisonDetune = mutableFloatStateOf(0.06f)

    // Delay FX
    var delayMix = mutableFloatStateOf(0.0f)
    var delayTimeSec = mutableFloatStateOf(0.32f)
    var delayFeedback = mutableFloatStateOf(0.35f)

    var masterVolume = mutableFloatStateOf(0.8f)

    fun loadFrom(other: Patch) {
        name.value = other.name.value
        osc1Waveform.value = other.osc1Waveform.value
        osc1Octave.value = other.osc1Octave.value
        osc1Semi.value = other.osc1Semi.value
        osc1Fine.floatValue = other.osc1Fine.floatValue
        osc1Level.floatValue = other.osc1Level.floatValue
        osc2Waveform.value = other.osc2Waveform.value
        osc2Octave.value = other.osc2Octave.value
        osc2Semi.value = other.osc2Semi.value
        osc2Fine.floatValue = other.osc2Fine.floatValue
        osc2Level.floatValue = other.osc2Level.floatValue
        subLevel.floatValue = other.subLevel.floatValue
        noiseLevel.floatValue = other.noiseLevel.floatValue
        filterMode.value = other.filterMode.value
        cutoff.floatValue = other.cutoff.floatValue
        resonance.floatValue = other.resonance.floatValue
        filterEnvAmount.floatValue = other.filterEnvAmount.floatValue
        keyTracking.floatValue = other.keyTracking.floatValue
        drive.floatValue = other.drive.floatValue
        ampAttack.floatValue = other.ampAttack.floatValue
        ampDecay.floatValue = other.ampDecay.floatValue
        ampSustain.floatValue = other.ampSustain.floatValue
        ampRelease.floatValue = other.ampRelease.floatValue
        filtAttack.floatValue = other.filtAttack.floatValue
        filtDecay.floatValue = other.filtDecay.floatValue
        filtSustain.floatValue = other.filtSustain.floatValue
        filtRelease.floatValue = other.filtRelease.floatValue
        lfoWaveform.value = other.lfoWaveform.value
        lfoRateHz.floatValue = other.lfoRateHz.floatValue
        lfoToPitch.floatValue = other.lfoToPitch.floatValue
        lfoToFilter.floatValue = other.lfoToFilter.floatValue
        lfoToAmp.floatValue = other.lfoToAmp.floatValue
        glideSec.floatValue = other.glideSec.floatValue
        unisonDetune.floatValue = other.unisonDetune.floatValue
        delayMix.floatValue = other.delayMix.floatValue
        delayTimeSec.floatValue = other.delayTimeSec.floatValue
        delayFeedback.floatValue = other.delayFeedback.floatValue
        masterVolume.floatValue = other.masterVolume.floatValue
    }

    companion object {
        fun factoryPresets(): List<Patch> = listOf(
            Patch("Drift Lead").apply {
                osc1Waveform.value = Waveform.SAW
                osc2Waveform.value = Waveform.SAW
                osc2Fine.floatValue = 9f
                cutoff.floatValue = 2200f
                resonance.floatValue = 0.28f
                filterEnvAmount.floatValue = 0.6f
                ampAttack.floatValue = 0.004f
                ampRelease.floatValue = 0.18f
            },
            Patch("Warm Pad").apply {
                osc1Waveform.value = Waveform.TRIANGLE
                osc2Waveform.value = Waveform.SAW
                osc2Fine.floatValue = 5f
                subLevel.floatValue = 0.2f
                cutoff.floatValue = 1200f
                resonance.floatValue = 0.12f
                ampAttack.floatValue = 0.6f
                ampDecay.floatValue = 0.8f
                ampSustain.floatValue = 0.8f
                ampRelease.floatValue = 1.2f
                lfoToFilter.floatValue = 0.15f
                lfoRateHz.floatValue = 0.6f
            },
            Patch("Sub Bass").apply {
                osc1Waveform.value = Waveform.SAW
                osc2Waveform.value = Waveform.SQUARE
                osc2Octave.value = -1
                osc2Fine.floatValue = 0f
                subLevel.floatValue = 0.6f
                cutoff.floatValue = 700f
                resonance.floatValue = 0.35f
                filterEnvAmount.floatValue = 0.4f
                ampAttack.floatValue = 0.002f
                ampDecay.floatValue = 0.2f
                ampSustain.floatValue = 0.9f
                ampRelease.floatValue = 0.12f
            },
            Patch("Metal Pluck").apply {
                osc1Waveform.value = Waveform.SQUARE
                osc2Waveform.value = Waveform.SQUARE
                osc2Semi.value = 7
                noiseLevel.floatValue = 0.08f
                cutoff.floatValue = 2600f
                resonance.floatValue = 0.5f
                filterEnvAmount.floatValue = 0.8f
                filtDecay.floatValue = 0.15f
                filtSustain.floatValue = 0.05f
                ampDecay.floatValue = 0.3f
                ampSustain.floatValue = 0.0f
                ampRelease.floatValue = 0.15f
            },
        )
    }
}
