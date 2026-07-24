package com.novawave.synth.ui

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun PianoKeyboard(
    lowestNote: Int,
    octaveSpan: Int,
    onNoteOn: (Int) -> Unit,
    onNoteOff: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    AndroidView(
        modifier = modifier
            .fillMaxWidth()
            .height(150.dp),
        factory = { ctx ->
            PianoKeyboardView(ctx).apply {
                this.lowestNote = lowestNote
                this.octaveSpan = octaveSpan
                this.onNoteOn = onNoteOn
                this.onNoteOff = onNoteOff
            }
        },
        update = { view ->
            view.lowestNote = lowestNote
            view.octaveSpan = octaveSpan
            view.onNoteOn = onNoteOn
            view.onNoteOff = onNoteOff
            view.requestLayout()
            view.invalidate()
        }
    )
}
