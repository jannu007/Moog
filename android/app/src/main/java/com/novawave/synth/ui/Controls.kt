package com.novawave.synth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun Panel(title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(
        modifier = modifier
            .background(Color(0xFF1E2126), RoundedCornerShape(10.dp))
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Text(
            text = title,
            color = Color(0xFFFF8A3D),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
        content()
    }
}

@Composable
fun <T> ChoiceRow(
    options: List<T>,
    selected: T,
    onSelect: (T) -> Unit,
    labelFor: (T) -> String,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { opt ->
            val isSelected = opt == selected
            val interactionSource = androidx.compose.runtime.remember { androidx.compose.foundation.interaction.MutableInteractionSource() }
            Text(
                text = labelFor(opt),
                color = if (isSelected) Color.Black else Color(0xFFB8BEC7),
                fontSize = 10.sp,
                modifier = Modifier
                    .background(
                        if (isSelected) Color(0xFFFF8A3D) else Color(0xFF2A2E35),
                        RoundedCornerShape(6.dp)
                    )
                    .padding(horizontal = 8.dp, vertical = 4.dp)
                    .then(
                        androidx.compose.foundation.clickable(
                            interactionSource = interactionSource,
                            indication = null,
                            onClick = { onSelect(opt) }
                        )
                    )
            )
        }
    }
}
