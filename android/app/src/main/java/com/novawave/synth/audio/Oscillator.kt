package com.novawave.synth.audio

import kotlin.math.PI
import kotlin.math.sin

enum class Waveform { SINE, TRIANGLE, SAW, SQUARE }

/**
 * Band-limited oscillator using PolyBLEP correction on saw/square edges
 * to keep aliasing down without a wavetable bank.
 */
class Oscillator(private val sampleRate: Float) {

    var phase: Float = 0f
        private set

    fun reset(startPhase: Float = 0f) {
        phase = startPhase.mod(1f)
    }

    /** Advances the oscillator by one sample and returns [-1, 1]. */
    fun nextSample(frequencyHz: Float, waveform: Waveform, pulseWidth: Float = 0.5f): Float {
        val freq = frequencyHz.coerceIn(0.01f, sampleRate / 2f)
        val delta = freq / sampleRate

        val value = when (waveform) {
            Waveform.SINE -> sin(2.0 * PI * phase).toFloat()
            Waveform.TRIANGLE -> {
                val t = phase
                (if (t < 0.5f) 4f * t - 1f else 3f - 4f * t)
            }
            Waveform.SAW -> {
                var s = 2f * phase - 1f
                s -= polyBlep(phase, delta)
                s
            }
            Waveform.SQUARE -> {
                var s = if (phase < pulseWidth) 1f else -1f
                s += polyBlep(phase, delta)
                s -= polyBlep((phase - pulseWidth).mod(1f), delta)
                s
            }
        }

        phase += delta
        if (phase >= 1f) phase -= 1f
        return value
    }

    private fun polyBlep(t: Float, dt: Float): Float {
        return when {
            t < dt -> {
                val x = t / dt
                x + x - x * x - 1f
            }
            t > 1f - dt -> {
                val x = (t - 1f) / dt
                x * x + x + x + 1f
            }
            else -> 0f
        }
    }
}
