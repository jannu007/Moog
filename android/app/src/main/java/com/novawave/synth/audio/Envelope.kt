package com.novawave.synth.audio

enum class EnvStage { IDLE, ATTACK, DECAY, SUSTAIN, RELEASE }

/** Classic ADSR envelope generator, linear attack/release with exponential-feel decay. */
class Envelope(private val sampleRate: Float) {

    var stage: EnvStage = EnvStage.IDLE
        private set
    private var level: Float = 0f

    var attackSec: Float = 0.005f
    var decaySec: Float = 0.15f
    var sustainLevel: Float = 0.7f
    var releaseSec: Float = 0.2f

    fun noteOn() {
        stage = EnvStage.ATTACK
    }

    fun noteOff() {
        if (stage != EnvStage.IDLE) stage = EnvStage.RELEASE
    }

    val isActive: Boolean get() = stage != EnvStage.IDLE

    fun nextSample(): Float {
        when (stage) {
            EnvStage.IDLE -> level = 0f
            EnvStage.ATTACK -> {
                val step = 1f / (attackSec.coerceAtLeast(0.0005f) * sampleRate)
                level += step
                if (level >= 1f) {
                    level = 1f
                    stage = EnvStage.DECAY
                }
            }
            EnvStage.DECAY -> {
                val step = (1f - sustainLevel) / (decaySec.coerceAtLeast(0.0005f) * sampleRate)
                level -= step
                if (level <= sustainLevel) {
                    level = sustainLevel
                    stage = EnvStage.SUSTAIN
                }
            }
            EnvStage.SUSTAIN -> level = sustainLevel
            EnvStage.RELEASE -> {
                val step = level / (releaseSec.coerceAtLeast(0.0005f) * sampleRate)
                level -= step
                if (level <= 0.0005f) {
                    level = 0f
                    stage = EnvStage.IDLE
                }
            }
        }
        return level
    }
}
