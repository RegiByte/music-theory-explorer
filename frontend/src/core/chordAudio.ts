import { SEMITONES_PER_OCTAVE } from '@/constants'
import { generateChord } from './chordGeneration'
import type { Note, ChordQuality } from '@/schemas'

// ─── Chord Symbol → Frequencies (for audio playback) ──────────────────────────

/** Octave-4 frequencies for every chromatic pitch class */
const NOTE_FREQ_4: Record<string, number> = {
  C: 261.63, 'C#': 277.18, Db: 277.18,
  D: 293.66, 'D#': 311.13, Eb: 311.13,
  E: 329.63, F: 349.23,
  'F#': 369.99, Gb: 369.99,
  G: 392.0, 'G#': 415.3, Ab: 415.3,
  A: 440.0, 'A#': 466.16, Bb: 466.16,
  B: 493.88,
}

/**
 * Convert a chord symbol (e.g. "Am", "G", "C7", "F#m") to an array of
 * frequencies voiced in the octave-4/5 range — ready for `audio.playChord()`.
 *
 * Returns `null` if the symbol can't be parsed.
 */
export function chordSymbolToFrequencies(symbol: string): number[] | null {
  // ── Extract root note ──────────────────────────────────────────────
  let root: Note | null = null
  let remaining = symbol

  if (symbol.length >= 2) {
    const two = symbol.substring(0, 2)
    if (
      ['A#', 'C#', 'D#', 'F#', 'G#', 'Bb', 'Db', 'Eb', 'Gb', 'Ab'].includes(two)
    ) {
      root = two as Note
      remaining = symbol.substring(2)
    }
  }
  if (!root && symbol.length >= 1 && 'ABCDEFG'.includes(symbol[0])) {
    root = symbol[0] as Note
    remaining = symbol.substring(1)
  }
  if (!root) return null

  // ── Parse quality ──────────────────────────────────────────────────
  let quality: ChordQuality = 'major'
  if (remaining === '' || remaining === 'maj') quality = 'major'
  else if (remaining === 'm' || remaining === 'min') quality = 'minor'
  else if (remaining === 'dim') quality = 'diminished'
  else if (remaining === 'aug') quality = 'augmented'
  else if (remaining === 'maj7' || remaining === 'M7') quality = 'major7'
  else if (remaining === 'm7') quality = 'minor7'
  else if (remaining === '7') quality = 'dominant7'
  else if (remaining === 'dim7') quality = 'diminished7'
  else if (remaining === 'm7♭5' || remaining === 'm7b5') quality = 'half_diminished7'
  else if (remaining === 'sus2') quality = 'sus2'
  else if (remaining === 'sus4') quality = 'sus4'
  // Unknown extensions (add9, 13, …) → fall back to plain triad

  const chord = generateChord(root, quality)
  const rootFreq = NOTE_FREQ_4[root]
  if (!rootFreq) return null

  // Each interval stacked above the root in octave 4
  return chord.intervals.map(
    (interval) => rootFreq * Math.pow(2, interval / SEMITONES_PER_OCTAVE),
  )
}
