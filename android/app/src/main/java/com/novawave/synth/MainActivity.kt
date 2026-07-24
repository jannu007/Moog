package com.novawave.synth

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.novawave.synth.audio.SynthEngine
import com.novawave.synth.model.Patch
import com.novawave.synth.ui.SynthScreen

class MainActivity : ComponentActivity() {

    private lateinit var engine: SynthEngine
    private val patch = Patch("Drift Lead")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Patch.factoryPresets().firstOrNull()?.let { patch.loadFrom(it) }
        engine = SynthEngine(patch)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    SynthScreen(engine = engine, patch = patch)
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        engine.start()
    }

    override fun onStop() {
        super.onStop()
        engine.allNotesOff()
        engine.stop()
    }
}
