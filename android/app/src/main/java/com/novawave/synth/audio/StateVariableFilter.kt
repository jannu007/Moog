package com.novawave.synth.audio

import kotlin.math.sin
import kotlin.math.tanh

enum class FilterMode { LOWPASS, BANDPASS, HIGHPASS }

/**
 * Chamberlin-topology state variable filter with a soft-clip drive stage,
 * modeled loosely after the character of classic analog low-pass ladders
 * without copying any specific manufacturer's circuit.
 */
class StateVariableFilter(private val sampleRate: Float) {

    private var low = 0f
    private var band = 0f

    var drive: Float = 0f // 0..1 extra saturation

    fun process(input: Float, cutoffHz: Float, resonance: Float, mode: FilterMode): Float {
        val cutoff = cutoffHz.coerceIn(20f, sampleRate * 0.45f)
        val f = 2f * sin(Math.PI.toFloat() * cutoff / sampleRate)
        val q = (1f - resonance.coerceIn(0f, 0.995f))

        val driven = tanh(input * (1f + drive * 3f))

        low += f * band
        val high = q * (driven - band) - low
        band += f * high

        val out = when (mode) {
            FilterMode.LOWPASS -> low
            FilterMode.BANDPASS -> band
            FilterMode.HIGHPASS -> high
        }
        return out.coerceIn(-4f, 4f)
    }

    fun reset() {
        low = 0f
        band = 0f
    }
}
