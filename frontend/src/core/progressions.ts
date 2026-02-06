import { getDiatonicChords, getDiatonicChordsMinor } from './harmony'
import { noteToIndex } from './musicTheory'
import type { Note, ScaleType, ProgressionChord } from '@/schemas'

/**
 * Build progression from degrees and key
 */
export function buildProgression(
  key: Note,
  scaleType: ScaleType,
  degrees: readonly number[]
): ProgressionChord[] {
  const diatonicChords =
    scaleType === 'major'
      ? getDiatonicChords(key)
      : getDiatonicChordsMinor(key)

  return degrees.map((degree, index) => {
    const diatonicChord = diatonicChords[degree - 1]
    return {
      ...diatonicChord,
      id: `${degree}-${index}`, // Unique ID for React keys
    }
  })
}

/**
 * Analyze root movement between chords
 */
export function analyzeRootMovement(chords: ProgressionChord[]): number[] {
  const movements: number[] = []

  for (let i = 1; i < chords.length; i++) {
    const prevRoot = noteToIndex(chords[i - 1].root)
    const currRoot = noteToIndex(chords[i].root)
    const movement = (currRoot - prevRoot + 12) % 12
    movements.push(movement)
  }

  return movements
}

/**
 * Get harmonic function label
 */
export function getHarmonicFunction(degree: number): string {
  const functions: Record<number, string> = {
    1: 'Tonic',
    2: 'Supertonic',
    3: 'Mediant',
    4: 'Subdominant',
    5: 'Dominant',
    6: 'Submediant',
    7: 'Leading Tone',
  }
  return functions[degree] || 'Unknown'
}

/**
 * Calculate resolution strength (0-1)
 */
export function calculateResolutionStrength(
  fromDegree: number,
  toDegree: number
): number {
  // V -> I is strongest (1.0)
  if (fromDegree === 5 && toDegree === 1) return 1.0
  // IV -> I is strong (0.8)
  if (fromDegree === 4 && toDegree === 1) return 0.8
  // vii -> I is strong (0.8)
  if (fromDegree === 7 && toDegree === 1) return 0.8
  // V -> vi (deceptive) is moderate (0.5)
  if (fromDegree === 5 && toDegree === 6) return 0.5
  // Default weak
  return 0.3
}
