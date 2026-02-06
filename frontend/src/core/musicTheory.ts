import {
  SEMITONES_PER_OCTAVE,
  CENTS_PER_OCTAVE,
  A4_FREQUENCY,
} from '@/constants'
import { CHROMATIC, CHROMATIC_FLATS } from '@/keywords'
import {
  canonicalNote,
  type NotationPreference,
  displayNote,
} from '@/core/enharmonic'
import type { Note } from '@/schemas'

/**
 * Convert semitones to frequency (Hz)
 * Formula: f = f₀ × 2^(n/12)
 * From notebook: semitones_to_hz
 */
export function semitonesToHz(
  semitones: number,
  baseFreq = A4_FREQUENCY,
): number {
  return baseFreq * Math.pow(2, semitones / SEMITONES_PER_OCTAVE)
}

/**
 * Calculate cents deviation between two frequencies
 * Cents are the TRUE measure of musical tuning
 * Formula: cents = 1200 × log₂(f₂/f₁)
 * From notebook: hz_to_cents
 */
export function hzToCents(freq1: number, freq2: number): number {
  return CENTS_PER_OCTAVE * Math.log2(freq2 / freq1)
}

/**
 * Get the chromatic index of a note (0-11)
 * Accepts both sharp and flat notation (Bb -> same index as A#)
 * From notebook: note_to_index
 */
export function noteToIndex(note: Note): number {
  // First try direct lookup in the sharp array
  const idx = CHROMATIC.indexOf(note as (typeof CHROMATIC)[number])
  if (idx !== -1) return idx
  // Normalize flats to sharps for lookup
  const canonical = canonicalNote(note)
  return CHROMATIC.indexOf(canonical as (typeof CHROMATIC)[number])
}

/**
 * Get the note from a chromatic index (returns sharp form)
 * From notebook: index_to_note
 */
export function indexToNote(idx: number): Note {
  const normalized =
    ((idx % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE
  return CHROMATIC[normalized] as Note
}

/**
 * Get the note from a chromatic index with display preference.
 * Returns the note in the preferred notation (sharp, flat, or auto).
 */
export function indexToDisplayNote(
  idx: number,
  preference: NotationPreference,
  key?: Note,
  scaleType?: string,
): Note {
  const normalized =
    ((idx % SEMITONES_PER_OCTAVE) + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE

  if (preference === 'flat') {
    return CHROMATIC_FLATS[normalized] as Note
  }
  if (preference === 'sharp') {
    return CHROMATIC[normalized] as Note
  }
  // Auto: use key to determine
  const sharpNote = CHROMATIC[normalized] as Note
  return displayNote(sharpNote, 'auto', key, scaleType)
}

/**
 * Get the octave number for a given frequency
 * A4 = 440 Hz is octave 4 (reference)
 * From notebook: get_octave
 */
export function getOctave(frequency: number): number {
  // A4 = 440 Hz is our reference (octave 4)
  // Each octave doubles frequency
  return Math.floor(4 + Math.log2(frequency / A4_FREQUENCY))
}

/**
 * Extract just the pitch class (note name without octave)
 * From notebook: get_pitch_class
 */
export function getPitchClass(note: string): Note {
  // Remove any octave number
  return note.replace(/\d+$/, '') as Note
}

/**
 * Calculate frequency ratio between two frequencies
 * From notebook: calculate_frequency_ratio
 */
export function calculateFrequencyRatio(freq1: number, freq2: number): number {
  const ratio = Math.max(freq1, freq2) / Math.min(freq1, freq2)
  return ratio
}

/**
 * Get interval name from semitone count
 * From notebook: interval_name
 */
export function getIntervalName(semitones: number): string {
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
 * Transpose a note by a number of semitones
 */
export function transposeNote(note: Note, semitones: number): Note {
  const idx = noteToIndex(note)
  return indexToNote(idx + semitones)
}

/**
 * Calculate the distance in semitones between two notes
 */
export function notesDistance(note1: Note, note2: Note): number {
  const idx1 = noteToIndex(note1)
  const idx2 = noteToIndex(note2)
  return Math.abs(idx2 - idx1)
}
