import { noteToIndex } from './musicTheory'
import { getScalePattern, SEMITONES_PER_OCTAVE } from '@/constants'
import type { Chord, Note, ScaleType } from '@/schemas'

/**
 * Calculate harmonic distance from key center
 * Returns 0 for diatonic chords, higher values for more chromatic chords
 *
 * Components:
 * - Root distance: 1.0 if chromatic root
 * - Chord tone distance: 0.5 per chromatic note
 * - Tritone presence: 0.5 bonus for maximum tension
 */
export function calculateHarmonicDistance(
  chord: Chord,
  key: Note,
  scaleType: ScaleType,
): number {
  const scale = getScalePattern(scaleType)
  const keyIndex = noteToIndex(key)
  let distance = 0

  // 1. Root distance
  const rootInterval = (noteToIndex(chord.root) - keyIndex + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE
  if (!scale.includes(rootInterval)) {
    distance += 1.0
  }

  // 2. Chord tone distance
  for (const note of chord.notes) {
    const interval = (noteToIndex(note) - keyIndex + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE
    if (!scale.includes(interval)) {
      distance += 0.5
    }
  }

  // 3. Tritone presence
  if (hasTritone(chord)) {
    distance += 0.5
  }

  return distance
}

/**
 * Check if a chord contains a tritone (augmented 4th / diminished 5th)
 */
export function hasTritone(chord: Chord): boolean {
  const noteIndices = chord.notes.map(noteToIndex)

  for (let i = 0; i < noteIndices.length; i++) {
    for (let j = i + 1; j < noteIndices.length; j++) {
      const interval = Math.abs(noteIndices[i] - noteIndices[j]) % SEMITONES_PER_OCTAVE
      // Tritone is 6 semitones
      if (interval === 6) {
        return true
      }
    }
  }

  return false
}

/**
 * Calculate distance score for UI display (0-1, inverted)
 * Closer chords get higher scores
 */
export function getDistanceScore(harmonicDistance: number): number {
  return 1 / (1 + harmonicDistance)
}
