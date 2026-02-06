import { UKULELE_TUNING } from '@/constants'
import { noteToIndex, indexToNote } from './musicTheory'
import type { Note, UkuleleString } from '@/schemas'

/**
 * Get note at a specific fretboard position
 * Extracted from Fretboard component for reusability
 */
export function getNoteAtPosition(string: UkuleleString, fret: number): Note {
  const stringBaseSemitone = UKULELE_TUNING[string]
  const semitones = stringBaseSemitone + fret
  const noteIdx = (noteToIndex('C') + semitones) % 12
  return indexToNote(noteIdx) as Note
}

/**
 * Get frequency at a specific fretboard position
 */
export function getFrequencyAtPosition(
  string: UkuleleString,
  fret: number,
  baseFreq: number = 261.63, // C4
): number {
  const stringBaseSemitone = UKULELE_TUNING[string]
  const semitones = stringBaseSemitone + fret
  // Using the formula: f = f₀ × 2^(n/12)
  return baseFreq * Math.pow(2, semitones / 12)
}

/**
 * Find all fretboard positions for a set of notes
 * Useful for highlighting scales, chords, or custom note sets
 */
export function findNotePositions(
  notes: Note[],
  strings: UkuleleString[] = ['A', 'E', 'C', 'G'],
  maxFret: number = 12,
): Array<{ string: UkuleleString; fret: number; note: Note }> {
  const positions: Array<{ string: UkuleleString; fret: number; note: Note }> =
    []

  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAtPosition(string, fret)
      if (notes.includes(note)) {
        positions.push({ string, fret, note })
      }
    }
  }

  return positions
}

/**
 * Find all positions where a specific note appears on the fretboard
 */
export function findPositionsForNote(
  note: Note,
  strings: UkuleleString[] = ['A', 'E', 'C', 'G'],
  maxFret: number = 12,
): Array<{ string: UkuleleString; fret: number }> {
  const positions: Array<{ string: UkuleleString; fret: number }> = []

  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const positionNote = getNoteAtPosition(string, fret)
      if (positionNote === note) {
        positions.push({ string, fret })
      }
    }
  }

  return positions
}

/**
 * Get all notes available on the fretboard
 * Useful for understanding the range of the instrument
 */
export function getAllFretboardNotes(
  strings: UkuleleString[] = ['A', 'E', 'C', 'G'],
  maxFret: number = 12,
): Note[] {
  const noteSet = new Set<Note>()

  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAtPosition(string, fret)
      noteSet.add(note)
    }
  }

  return Array.from(noteSet)
}
