package com.novawave.synth.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.view.MotionEvent
import android.view.View

/**
 * Custom multi-touch piano keyboard. Handled as a raw View (rather than
 * Compose gestures) so each finger is tracked independently by pointer id,
 * giving reliable chords and glissando on real hardware.
 */
class PianoKeyboardView(context: Context) : View(context) {

    var lowestNote: Int = 48 // C3
    var octaveSpan: Int = 3
    var onNoteOn: (Int) -> Unit = {}
    var onNoteOff: (Int) -> Unit = {}

    private val whiteKeyPaint = Paint().apply { color = Color.parseColor("#F2F0EA") }
    private val whiteKeyActivePaint = Paint().apply { color = Color.parseColor("#FF8A3D") }
    private val blackKeyPaint = Paint().apply { color = Color.parseColor("#1A1C20") }
    private val blackKeyActivePaint = Paint().apply { color = Color.parseColor("#FFAB70") }
    private val strokePaint = Paint().apply {
        color = Color.parseColor("#33000000")
        style = Paint.Style.STROKE
        strokeWidth = 2f
    }

    private val whiteKeyIntervals = intArrayOf(0, 2, 4, 5, 7, 9, 11)
    private val blackKeyIntervals = intArrayOf(1, 3, -1, 6, 8, 10, -1)

    private data class KeyRect(val note: Int, val rect: RectF, val isBlack: Boolean)

    private var keyRects: List<KeyRect> = emptyList()
    private val activePointers = HashMap<Int, Int>() // pointerId -> note

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        layoutKeys(w.toFloat(), h.toFloat())
    }

    private fun layoutKeys(w: Float, h: Float) {
        val whiteCount = octaveSpan * 7
        val whiteWidth = w / whiteCount
        val blackWidth = whiteWidth * 0.6f
        val blackHeight = h * 0.6f

        val whites = ArrayList<KeyRect>()
        val blacks = ArrayList<KeyRect>()

        for (i in 0 until whiteCount) {
            val octave = i / 7
            val idx = i % 7
            val note = lowestNote + octave * 12 + whiteKeyIntervals[idx]
            val left = i * whiteWidth
            whites.add(KeyRect(note, RectF(left, 0f, left + whiteWidth, h), false))

            val blackInterval = blackKeyIntervals[idx]
            if (blackInterval >= 0) {
                val blackNote = lowestNote + octave * 12 + blackInterval
                val centerX = left + whiteWidth
                val bLeft = centerX - blackWidth / 2f
                blacks.add(KeyRect(blackNote, RectF(bLeft, 0f, bLeft + blackWidth, blackHeight), true))
            }
        }
        // Black keys are hit-tested first (drawn on top).
        keyRects = blacks + whites
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val activeNotes = activePointers.values.toHashSet()

        // White keys first
        for (k in keyRects.filter { !it.isBlack }) {
            canvas.drawRect(k.rect, if (activeNotes.contains(k.note)) whiteKeyActivePaint else whiteKeyPaint)
            canvas.drawRect(k.rect, strokePaint)
        }
        // Then black keys on top
        for (k in keyRects.filter { it.isBlack }) {
            canvas.drawRect(k.rect, if (activeNotes.contains(k.note)) blackKeyActivePaint else blackKeyPaint)
        }
    }

    private fun noteAt(x: Float, y: Float): Int? {
        for (k in keyRects) {
            if (k.isBlack && k.rect.contains(x, y)) return k.note
        }
        for (k in keyRects) {
            if (!k.isBlack && k.rect.contains(x, y)) return k.note
        }
        return null
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                val idx = event.actionIndex
                val pid = event.getPointerId(idx)
                noteAt(event.getX(idx), event.getY(idx))?.let { note ->
                    activePointers[pid] = note
                    onNoteOn(note)
                    invalidate()
                }
            }
            MotionEvent.ACTION_MOVE -> {
                for (i in 0 until event.pointerCount) {
                    val pid = event.getPointerId(i)
                    val newNote = noteAt(event.getX(i), event.getY(i))
                    val oldNote = activePointers[pid]
                    if (newNote != null && newNote != oldNote) {
                        oldNote?.let { onNoteOff(it) }
                        activePointers[pid] = newNote
                        onNoteOn(newNote)
                        invalidate()
                    }
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                val idx = event.actionIndex
                val pid = event.getPointerId(idx)
                activePointers.remove(pid)?.let { note ->
                    onNoteOff(note)
                    invalidate()
                }
            }
            MotionEvent.ACTION_CANCEL -> {
                activePointers.values.forEach { onNoteOff(it) }
                activePointers.clear()
                invalidate()
            }
        }
        return true
    }
}
