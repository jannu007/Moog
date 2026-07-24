package com.novawave.synth.audio

import com.novawave.synth.model.Patch
import kotlin.math.pow
import kotlin.random.Random

/** A single monophonic voice: two main oscillators, sub osc, noise, filter, two envelopes. */
class Voice(private val sampleRate: Float) {

    var note: Int = -1
        private set
    var isFree: Boolean = true
        private set
    private var noteAgeFrames: Long = 0

    private val osc1 = Oscillator(sampleRate)
    private val osc2 = Oscillator(sampleRate)
    private val subOsc = Oscillator(sampleRate)

    private val ampEnv = Envelope(sampleRate)
    private val filtEnv = Envelope(sampleRate)
    private val filter = StateVariableFilter(sampleRate)

    private var currentFreq = 220f
    private var targetFreq = 220f

    fun noteOn(midiNote: Int, patch: Patch, retrigger: Boolean) {
        note = midiNote
        isFree = false
        noteAgeFrames = 0
        targetFreq = midiToFreq(midiNote)
        if (retrigger || currentFreq <= 0f) currentFreq = targetFreq

        ampEnv.attackSec = patch.ampAttack.floatValue
        ampEnv.decaySec = patch.ampDecay.floatValue
        ampEnv.sustainLevel = patch.ampSustain.floatValue
        ampEnv.releaseSec = patch.ampRelease.floatValue

        filtEnv.attackSec = patch.filtAttack.floatValue
        filtEnv.decaySec = patch.filtDecay.floatValue
        filtEnv.sustainLevel = patch.filtSustain.floatValue
        filtEnv.releaseSec = patch.filtRelease.floatValue

        ampEnv.noteOn()
        filtEnv.noteOn()
    }

    fun noteOff() {
        ampEnv.noteOff()
        filtEnv.noteOff()
    }

    val isReleasing: Boolean get() = ampEnv.stage == EnvStage.RELEASE
    val isActive: Boolean get() = !isFree && ampEnv.isActive
    val age: Long get() = noteAgeFrames

    fun render(patch: Patch, lfoValue: Float): Float {
        noteAgeFrames++

        // Glide
        val glide = patch.glideSec.floatValue
        if (glide <= 0.0005f) {
            currentFreq = targetFreq
        } else {
            val coeff = 1f - kotlin.math.exp(-1f / (glide * sampleRate))
            currentFreq += (targetFreq - currentFreq) * coeff
        }

        val pitchLfoSemis = lfoValue * patch.lfoToPitch.floatValue * 12f
        val basePitchMul = 2f.pow(pitchLfoSemis / 12f)

        val f1 = currentFreq * basePitchMul *
            2f.pow(patch.osc1Octave.value + patch.osc1Semi.value / 12f + patch.osc1Fine.floatValue / 1200f)
        val f2 = currentFreq * basePitchMul *
            2f.pow(patch.osc2Octave.value + patch.osc2Semi.value / 12f + patch.osc2Fine.floatValue / 1200f)
        val fSub = currentFreq * basePitchMul * 0.5f

        val s1 = osc1.nextSample(f1, patch.osc1Waveform.value) * patch.osc1Level.floatValue
        val s2 = osc2.nextSample(f2, patch.osc2Waveform.value) * patch.osc2Level.floatValue
        val sSub = subOsc.nextSample(fSub, Waveform.SQUARE) * patch.subLevel.floatValue
        val sNoise = (Random.nextFloat() * 2f - 1f) * patch.noiseLevel.floatValue

        var mixed = (s1 + s2 + sSub + sNoise) * 0.5f

        val ampLevel = ampEnv.nextSample()
        val filtLevel = filtEnv.nextSample()

        if (ampEnv.stage == EnvStage.IDLE) {
            isFree = true
            note = -1
            return 0f
        }

        val keyTrackHz = (currentFreq - 261.63f) * patch.keyTracking.floatValue
        val envMod = filtLevel * patch.filterEnvAmount.floatValue * 8000f
        val lfoMod = lfoValue * patch.lfoToFilter.floatValue * 4000f
        val cutoff = (patch.cutoff.floatValue + envMod + keyTrackHz + lfoMod)

        filter.drive = patch.drive.floatValue
        mixed = filter.process(mixed, cutoff, patch.resonance.floatValue, patch.filterMode.value)

        val tremolo = 1f - patch.lfoToAmp.floatValue * 0.5f * (1f - lfoValue)
        return mixed * ampLevel * tremolo
    }

    fun hardReset() {
        isFree = true
        note = -1
        filter.reset()
    }

    companion object {
        fun midiToFreq(note: Int): Float = 440f * 2f.pow((note - 69) / 12f)
    }
}
