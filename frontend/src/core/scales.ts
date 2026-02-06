import { SCALE_PATTERNS } from '@/constants'
import { noteToIndex, indexToNote } from './musicTheory'
import { calculateConsonance } from './intervals'
import type { Note, Scale, ScaleType } from '@/schemas'

/**
 * Generate a scale from a root note and scale type
 * From notebook: generate_scale
 */
export function generateScale(root: Note, scaleType: ScaleType): Scale {
  const pattern = SCALE_PATTERNS[scaleType]
  if (!pattern) {
    throw new Error(`Unknown scale type: ${scaleType}`)
  }

  const rootIdx = noteToIndex(root)
  const intervals = [...pattern] // Convert readonly to mutable
  const notes = intervals.map((interval) =>
    indexToNote(rootIdx + interval),
  ) as Note[]

  return {
    root,
    type: scaleType,
    notes,
    intervals,
  }
}

/**
 * Calculate average consonance of all intervals in a scale
 * From notebook: calculate_scale_consonance
 */
export function calculateScaleConsonance(pattern: number[]): number {
  let totalConsonance = 0
  let count = 0

  // Check all intervals between scale degrees
  for (let i = 0; i < pattern.length; i++) {
    for (let j = i + 1; j < pattern.length; j++) {
      const interval = pattern[j] - pattern[i]
      totalConsonance += calculateConsonance(interval)
      count++
    }
  }

  return count > 0 ? totalConsonance / count : 0
}

/**
 * Check if a note is in a scale
 */
export function isNoteInScale(note: Note, scale: Scale): boolean {
  return scale.notes.includes(note)
}

/**
 * Get the degree of a note in a scale (1-based)
 * Returns null if note is not in scale
 */
export function getScaleDegree(note: Note, scale: Scale): number | null {
  const index = scale.notes.indexOf(note)
  return index >= 0 ? index + 1 : null
}

/**
 * Get all notes in a scale within a frequency range
 */
export function getScaleNotesInRange(
  scale: Scale,
  _minFreq: number,
  _maxFreq: number,
): Note[] {
  // This is a simplified version - in practice you'd need to consider octaves
  return scale.notes
}

/**
 * Find positions where a scale can be played on a single string
 * From notebook: find_scale_positions
 */
export function findScalePositions(
  root: Note,
  scaleType: ScaleType,
  stringNote: Note,
  startFret = 0,
): number[] {
  const scale = generateScale(root, scaleType)
  const positions: number[] = []

  // Check each fret position (0-12)
  for (let fret = startFret; fret <= 12; fret++) {
    const noteIdx = (noteToIndex(stringNote) + fret) % 12
    const note = indexToNote(noteIdx)

    if (scale.notes.includes(note)) {
      positions.push(fret)
    }
  }

  return positions
}

/**
 * Get the relative minor of a major scale
 */
export function getRelativeMinor(majorRoot: Note): Note {
  // Relative minor is 3 semitones (minor 3rd) below major
  return indexToNote(noteToIndex(majorRoot) - 3)
}

/**
 * Get the relative major of a minor scale
 */
export function getRelativeMajor(minorRoot: Note): Note {
  // Relative major is 3 semitones (minor 3rd) above minor
  return indexToNote(noteToIndex(minorRoot) + 3)
}

/**
 * Compare two scales and find common notes
 */
export function compareScales(scale1: Scale, scale2: Scale): Note[] {
  return scale1.notes.filter((note) => scale2.notes.includes(note))
}
