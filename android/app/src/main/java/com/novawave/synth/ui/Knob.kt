package com.novawave.synth.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

private val TRACK_COLOR = Color(0xFF33383F)
private val ACTIVE_COLOR = Color(0xFFFF8A3D)
private val KNOB_FACE = Color(0xFF2A2E35)

/**
 * A compact rotary control driven by vertical drag, matching the layout
 * language of hardware synth panels without imitating any specific product.
 */
@Composable
fun Knob(
    label: String,
    value: Float,
    onValueChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
    valueRange: ClosedFloatingPointRange<Float> = 0f..1f,
    size: androidx.compose.ui.unit.Dp = 52.dp,
    valueLabel: String? = null,
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        val normalized = ((value - valueRange.start) / (valueRange.endInclusive - valueRange.start))
            .coerceIn(0f, 1f)

        Canvas(
            modifier = Modifier
                .size(size)
                .pointerInput(valueRange) {
                    detectDragGestures { change, dragAmount ->
                        change.consume()
                        val span = valueRange.endInclusive - valueRange.start
                        val delta = -dragAmount.y / 180f * span
                        val newVal = (value + delta).coerceIn(valueRange.start, valueRange.endInclusive)
                        onValueChange(newVal)
                    }
                }
        ) {
            val strokeWidth = 5.dp.toPx()
            val radius = (this.size.minDimension - strokeWidth) / 2f
            val center = Offset(this.size.width / 2f, this.size.height / 2f)
            val startAngle = 135f
            val sweep = 270f

            drawArc(
                color = TRACK_COLOR,
                startAngle = startAngle,
                sweepAngle = sweep,
                useCenter = false,
                topLeft = Offset(center.x - radius, center.y - radius),
                size = androidx.compose.ui.geometry.Size(radius * 2, radius * 2),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )
            drawArc(
                color = ACTIVE_COLOR,
                startAngle = startAngle,
                sweepAngle = sweep * normalized,
                useCenter = false,
                topLeft = Offset(center.x - radius, center.y - radius),
                size = androidx.compose.ui.geometry.Size(radius * 2, radius * 2),
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
            )

            drawCircle(color = KNOB_FACE, radius = radius - strokeWidth, center = center)

            val angleDeg = startAngle + sweep * normalized
            val angleRad = angleDeg * PI / 180f
            val indicatorLen = radius - strokeWidth
            val ix = center.x + indicatorLen * cos(angleRad).toFloat()
            val iy = center.y + indicatorLen * sin(angleRad).toFloat()
            drawLine(
                color = Color.White,
                start = center,
                end = Offset(ix, iy),
                strokeWidth = 3.dp.toPx(),
                cap = StrokeCap.Round
            )
        }

        Text(
            text = label,
            color = Color(0xFFB8BEC7),
            fontSize = 10.sp,
            textAlign = TextAlign.Center,
            maxLines = 1
        )
        if (valueLabel != null) {
            Text(
                text = valueLabel,
                color = Color(0xFF6F7581),
                fontSize = 9.sp,
                textAlign = TextAlign.Center
            )
        }
    }
}
