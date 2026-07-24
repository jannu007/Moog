package com.novawave.synth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.novawave.synth.audio.FilterMode
import com.novawave.synth.audio.SynthEngine
import com.novawave.synth.audio.Waveform
import com.novawave.synth.model.Patch
import kotlin.math.roundToInt

@Composable
fun SynthScreen(engine: SynthEngine, patch: Patch) {
    var lowestNote by remember { mutableIntStateOf(48) }
    val presets = remember { Patch.factoryPresets() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF14161A))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(
                "NovaWave",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                "  synth",
                color = Color(0xFFFF8A3D),
                fontSize = 18.sp,
                fontWeight = FontWeight.Light
            )
            Spacer(Modifier.width(16.dp))
            Text(
                "Patch: ${patch.name.value}",
                color = Color(0xFF9AA0AA),
                fontSize = 12.sp
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            presets.forEach { p ->
                Text(
                    text = p.name.value,
                    color = Color(0xFFB8BEC7),
                    fontSize = 11.sp,
                    modifier = Modifier
                        .background(Color(0xFF2A2E35), androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                        .then(
                            androidx.compose.ui.Modifier.clickable { patch.loadFrom(p) }
                        )
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Panel("OSC 1") {
                ChoiceRow(Waveform.entries, patch.osc1Waveform.value, { patch.osc1Waveform.value = it }) { it.name.take(3) }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("OCT", patch.osc1Octave.value.toFloat(), { patch.osc1Octave.value = it.roundToInt() }, valueRange = -2f..2f, valueLabel = "${patch.osc1Octave.value}")
                    Knob("SEMI", patch.osc1Semi.value.toFloat(), { patch.osc1Semi.value = it.roundToInt() }, valueRange = -12f..12f, valueLabel = "${patch.osc1Semi.value}")
                    Knob("FINE", patch.osc1Fine.floatValue, { patch.osc1Fine.floatValue = it }, valueRange = -50f..50f)
                    Knob("LVL", patch.osc1Level.floatValue, { patch.osc1Level.floatValue = it })
                }
            }

            Panel("OSC 2") {
                ChoiceRow(Waveform.entries, patch.osc2Waveform.value, { patch.osc2Waveform.value = it }) { it.name.take(3) }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("OCT", patch.osc2Octave.value.toFloat(), { patch.osc2Octave.value = it.roundToInt() }, valueRange = -2f..2f, valueLabel = "${patch.osc2Octave.value}")
                    Knob("SEMI", patch.osc2Semi.value.toFloat(), { patch.osc2Semi.value = it.roundToInt() }, valueRange = -12f..12f, valueLabel = "${patch.osc2Semi.value}")
                    Knob("FINE", patch.osc2Fine.floatValue, { patch.osc2Fine.floatValue = it }, valueRange = -50f..50f)
                    Knob("LVL", patch.osc2Level.floatValue, { patch.osc2Level.floatValue = it })
                }
            }

            Panel("MIX") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("SUB", patch.subLevel.floatValue, { patch.subLevel.floatValue = it })
                    Knob("NOISE", patch.noiseLevel.floatValue, { patch.noiseLevel.floatValue = it })
                    Knob("GLIDE", patch.glideSec.floatValue, { patch.glideSec.floatValue = it }, valueRange = 0f..1.5f)
                }
            }

            Panel("FILTER") {
                ChoiceRow(FilterMode.entries, patch.filterMode.value, { patch.filterMode.value = it }) { it.name.take(2) }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("CUTOFF", patch.cutoff.floatValue, { patch.cutoff.floatValue = it }, valueRange = 20f..8000f)
                    Knob("RES", patch.resonance.floatValue, { patch.resonance.floatValue = it })
                    Knob("ENV", patch.filterEnvAmount.floatValue, { patch.filterEnvAmount.floatValue = it }, valueRange = -1f..1f)
                    Knob("KEY", patch.keyTracking.floatValue, { patch.keyTracking.floatValue = it })
                    Knob("DRIVE", patch.drive.floatValue, { patch.drive.floatValue = it })
                }
            }

            Panel("AMP ENV") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("A", patch.ampAttack.floatValue, { patch.ampAttack.floatValue = it }, valueRange = 0f..3f)
                    Knob("D", patch.ampDecay.floatValue, { patch.ampDecay.floatValue = it }, valueRange = 0f..3f)
                    Knob("S", patch.ampSustain.floatValue, { patch.ampSustain.floatValue = it })
                    Knob("R", patch.ampRelease.floatValue, { patch.ampRelease.floatValue = it }, valueRange = 0f..4f)
                }
            }

            Panel("FILTER ENV") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("A", patch.filtAttack.floatValue, { patch.filtAttack.floatValue = it }, valueRange = 0f..3f)
                    Knob("D", patch.filtDecay.floatValue, { patch.filtDecay.floatValue = it }, valueRange = 0f..3f)
                    Knob("S", patch.filtSustain.floatValue, { patch.filtSustain.floatValue = it })
                    Knob("R", patch.filtRelease.floatValue, { patch.filtRelease.floatValue = it }, valueRange = 0f..4f)
                }
            }

            Panel("LFO") {
                ChoiceRow(Waveform.entries, patch.lfoWaveform.value, { patch.lfoWaveform.value = it }) { it.name.take(3) }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("RATE", patch.lfoRateHz.floatValue, { patch.lfoRateHz.floatValue = it }, valueRange = 0.05f..20f)
                    Knob("PITCH", patch.lfoToPitch.floatValue, { patch.lfoToPitch.floatValue = it })
                    Knob("FILT", patch.lfoToFilter.floatValue, { patch.lfoToFilter.floatValue = it })
                    Knob("AMP", patch.lfoToAmp.floatValue, { patch.lfoToAmp.floatValue = it })
                }
            }

            Panel("DELAY") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("MIX", patch.delayMix.floatValue, { patch.delayMix.floatValue = it })
                    Knob("TIME", patch.delayTimeSec.floatValue, { patch.delayTimeSec.floatValue = it }, valueRange = 0.02f..1.5f)
                    Knob("FDBK", patch.delayFeedback.floatValue, { patch.delayFeedback.floatValue = it }, valueRange = 0f..0.9f)
                }
            }

            Panel("MASTER") {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Knob("VOL", patch.masterVolume.floatValue, { patch.masterVolume.floatValue = it })
                }
            }
        }

        Spacer(Modifier.width(4.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Text(
                "OCT −",
                color = Color(0xFFB8BEC7),
                fontSize = 12.sp,
                modifier = Modifier
                    .background(Color(0xFF2A2E35), androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
                    .then(androidx.compose.ui.Modifier.clickable { lowestNote = (lowestNote - 12).coerceAtLeast(12) })
            )
            Text(
                "OCT +",
                color = Color(0xFFB8BEC7),
                fontSize = 12.sp,
                modifier = Modifier
                    .background(Color(0xFF2A2E35), androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
                    .then(androidx.compose.ui.Modifier.clickable { lowestNote = (lowestNote + 12).coerceAtMost(96) })
            )
            Text(
                "Base note: $lowestNote",
                color = Color(0xFF6F7581),
                fontSize = 11.sp
            )
        }

        PianoKeyboard(
            lowestNote = lowestNote,
            octaveSpan = 3,
            onNoteOn = { engine.noteOn(it) },
            onNoteOff = { engine.noteOff(it) },
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun androidx.compose.ui.Modifier.clickable(onClick: () -> Unit): androidx.compose.ui.Modifier =
    this.then(
        androidx.compose.foundation.clickable(onClick = onClick)
    )
