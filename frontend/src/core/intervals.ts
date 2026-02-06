import { CONSONANCE_SCORES, PERFECT_INTERVALS } from '@/constants'
import { hzToCents, noteToIndex } from './musicTheory'
import { findPositionsForNote } from './fretboard'
import type { Interval, Note, UkuleleString } from '@/schemas'

/**
 * Calculate interval in semitones between two notes
 * From notebook: calculate_interval_semitones
 */
export function calculateIntervalSemitones(
  note1Idx: number,
  note2Idx: number,
): number {
  return Math.abs(note2Idx - note1Idx)
}

/**
 * Calculate interval in cents between two frequencies
 * From notebook: calculate_interval_cents
 */
export function calculateIntervalCents(freq1: number, freq2: number): number {
  const result = Math.abs(hzToCents(freq1, freq2))
  return Math.round(result * 100) / 100 // Round to 2 decimals
}

/**
 * Calculate consonance score for an interval (0-1)
 * Higher score = more consonant
 * From notebook: consonance scoring logic
 */
export function calculateConsonance(semitones: number): number {
  return CONSONANCE_SCORES[semitones % 12] || 0
}

/**
 * Check if an interval is consonant (score >= 0.6)
 */
export function isConsonant(semitones: number): boolean {
  return calculateConsonance(semitones) >= 0.6
}

/**
 * Check if an interval is a perfect interval
 */
export function isPerfectInterval(semitones: number): boolean {
  const perfectSemitones: number[] = Object.values(PERFECT_INTERVALS).map(
    (i) => i.semitones,
  )
  return perfectSemitones.includes(semitones % 12)
}

/**
 * Get the ideal frequency ratio for an interval
 */
export function getIdealRatio(semitones: number): number | null {
  const interval = Object.values(PERFECT_INTERVALS).find(
    (i) => i.semitones === semitones % 12,
  )
  return interval?.ratio || null
}

/**
 * Analyze an interval between two notes
 */
export function analyzeInterval(
  note1: Note,
  note2: Note,
  freq1: number,
  freq2: number,
): Interval {
  const idx1 = noteToIndex(note1)
  const idx2 = noteToIndex(note2)
  const semitones = calculateIntervalSemitones(idx1, idx2)
  const cents = calculateIntervalCents(freq1, freq2)
  const ratio = freq2 / freq1
  const consonance = calculateConsonance(semitones)

  return {
    semitones,
    name: getIntervalName(semitones),
    ratio,
    cents,
    consonance,
  }
}

/**
 * Get interval name from semitones
 */
function getIntervalName(semitones: number): string {
  const names: Record<number, string> = {
    0: 'Unison',
    1: 'Minor 2nd',
    2: 'Major 2nd',
    3: 'Minor 3rd',
    4: 'Major 3rd',
    5: 'Perfect 4th',
    6: 'Tritone',
    7: 'Perfect 5th',
    8: 'Minor 6th',
    9: 'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th',
    12: 'Octave',
  }
  return names[semitones % 12] || 'Unknown'
}

/**
 * Find all positions on fretboard where a specific interval appears
 * Returns pairs of positions (note1, note2) that form the interval
 * This reveals the geometric pattern of intervals across the fretboard
 */
export function findIntervalPositions(
  note1: Note,
  note2: Note,
  maxFret: number = 12,
): Array<{
  position1: { string: UkuleleString; fret: number }
  position2: { string: UkuleleString; fret: number }
}> {
  const strings: UkuleleString[] = ['A', 'E', 'C', 'G']

  // Find all positions for both notes
  const note1Positions = findPositionsForNote(note1, strings, maxFret)
  const note2Positions = findPositionsForNote(note2, strings, maxFret)

  // Create all pairs - this shows the pattern across the fretboard
  const pairs: Array<{
    position1: { string: UkuleleString; fret: number }
    position2: { string: UkuleleString; fret: number }
  }> = []

  for (const pos1 of note1Positions) {
    for (const pos2 of note2Positions) {
      pairs.push({
        position1: pos1,
        position2: pos2,
      })
    }
  }

  return pairs
}
