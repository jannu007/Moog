package com.novawave.synth.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.novawave.synth.model.Patch
import kotlin.concurrent.thread
import kotlin.math.tanh

private const val SAMPLE_RATE = 44100
private const val MAX_VOICES = 8

/**
 * Real-time synth engine. Renders audio on a dedicated thread and pushes
 * blocks to an [AudioTrack] in streaming mode. All parameters are read from
 * a [Patch] each render pass, so UI changes are heard within one buffer.
 */
class SynthEngine(val patch: Patch) {

    private val sampleRate = SAMPLE_RATE.toFloat()
    private val voices = Array(MAX_VOICES) { Voice(sampleRate) }
    private val lfo = Oscillator(sampleRate)

    private var audioTrack: AudioTrack? = null
    @Volatile private var running = false
    private var renderThread: Thread? = null

    // Simple stereo-friendly delay (mono feedback line, tapped to both channels)
    private var delayBuffer = FloatArray((sampleRate * 2f).toInt())
    private var delayWriteIdx = 0

    fun start() {
        if (running) return
        val minBuf = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_STEREO,
            AudioFormat.ENCODING_PCM_FLOAT
        ).coerceAtLeast(4096)

        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                    .build()
            )
            .setBufferSizeInBytes(minBuf * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack = track
        running = true
        track.play()

        renderThread = thread(name = "novawave-render", priority = Thread.MAX_PRIORITY) {
            renderLoop(track, minBuf / 4)
        }
    }

    fun stop() {
        running = false
        renderThread?.join(500)
        renderThread = null
        audioTrack?.let {
            it.stop()
            it.release()
        }
        audioTrack = null
    }

    fun noteOn(midiNote: Int, velocity: Float = 1f) {
        synchronized(voices) {
            val existing = voices.firstOrNull { !it.isFree && it.note == midiNote }
            val voice = existing ?: voices.firstOrNull { it.isFree }
                ?: voices.filter { it.isReleasing }.minByOrNull { -it.age }
                ?: voices.maxByOrNull { it.age }!!
            voice.noteOn(midiNote, patch, retrigger = existing == null)
        }
    }

    fun noteOff(midiNote: Int) {
        synchronized(voices) {
            voices.filter { !it.isFree && it.note == midiNote }.forEach { it.noteOff() }
        }
    }

    fun allNotesOff() {
        synchronized(voices) {
            voices.forEach { it.noteOff() }
        }
    }

    private fun renderLoop(track: AudioTrack, framesPerBlock: Int) {
        val block = framesPerBlock.coerceAtLeast(64)
        val stereoBuf = FloatArray(block * 2)

        while (running) {
            for (i in 0 until block) {
                val lfoVal = lfo.nextSample(patch.lfoRateHz.floatValue, patch.lfoWaveform.value)

                var mixed = 0f
                synchronized(voices) {
                    for (v in voices) {
                        if (!v.isFree) mixed += v.render(patch, lfoVal)
                    }
                }
                mixed *= 0.9f / kotlin.math.sqrt(MAX_VOICES.toFloat() / 2f)

                // Delay send/return
                val dMix = patch.delayMix.floatValue
                val delaySamples = (patch.delayTimeSec.floatValue * sampleRate)
                    .toInt().coerceIn(1, delayBuffer.size - 1)
                val readIdx = (delayWriteIdx - delaySamples + delayBuffer.size) % delayBuffer.size
                val delayed = delayBuffer[readIdx]
                val delayIn = mixed + delayed * patch.delayFeedback.floatValue
                delayBuffer[delayWriteIdx] = delayIn
                delayWriteIdx = (delayWriteIdx + 1) % delayBuffer.size

                var out = mixed * (1f - dMix) + delayed * dMix
                out = tanh(out) // soft limiter
                out *= patch.masterVolume.floatValue

                stereoBuf[i * 2] = out
                stereoBuf[i * 2 + 1] = out
            }
            track.write(stereoBuf, 0, stereoBuf.size, AudioTrack.WRITE_BLOCKING)
        }
    }
}
