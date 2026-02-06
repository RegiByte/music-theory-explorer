import { noteToIndex, indexToNote } from './musicTheory'
import { generateScale } from './scales'
import { generateChord } from './chords'
import type { Note, ChordQuality, Chord } from '@/schemas'

/**
 * Calculate the circle of fifths
 * Moving clockwise = up a perfect 5th (7 semitones)
 * From notebook: calculate_circle_of_fifths
 */
export function calculateCircleOfFifths(): Note[] {
  const circle: Note[] = []
  let currentNote: Note = 'C'

  for (let i = 0; i < 12; i++) {
    circle.push(currentNote)
    // Move up a perfect 5th (7 semitones)
    const currentIdx = noteToIndex(currentNote)
    const nextIdx = (currentIdx + 7) % 12
    currentNote = indexToNote(nextIdx) as Note
  }

  return circle
}

/**
 * Get keys related to a given key
 * Returns relative major/minor, parallel major/minor, dominant, and subdominant
 */
export function getRelatedKeys(key: Note): {
  relativeMajor?: Note
  relativeMinor?: Note
  parallelMajor?: Note
  parallelMinor?: Note
  dominantKey: Note
  subdominantKey: Note
} {
  const circle = calculateCircleOfFifths()
  const keyIdx = circle.indexOf(key)

  // Dominant is one step clockwise (up a 5th)
  const dominantIdx = (keyIdx + 1) % 12
  const dominantKey = circle[dominantIdx]

  // Subdominant is one step counter-clockwise (up a 4th, or down a 5th)
  const subdominantIdx = (keyIdx - 1 + 12) % 12
  const subdominantKey = circle[subdominantIdx]

  // Relative minor is 3 semitones below major
  const relativeMinor = indexToNote(noteToIndex(key) - 3) as Note

  // Relative major is 3 semitones above minor
  const relativeMajor = indexToNote(noteToIndex(key) + 3) as Note

  // Parallel minor is same root, different mode
  const parallelMinor = key // Assuming key is major, parallel minor is same root
  const parallelMajor = key // Assuming key is minor, parallel major is same root

  return {
    relativeMajor: keyIdx >= 0 ? relativeMajor : undefined,
    relativeMinor: keyIdx >= 0 ? relativeMinor : undefined,
    parallelMajor,
    parallelMinor,
    dominantKey,
    subdominantKey,
  }
}

/**
 * Diatonic chord information for a scale degree
 */
export interface DiatonicChord {
  degree: number // 1-7
  romanNumeral: string // I, ii, iii, IV, V, vi, vii°
  root: Note
  quality: ChordQuality
  chord: Chord
}

/**
 * Get the 7 diatonic chords for a major key
 * Built by stacking thirds from each scale degree
 * From notebook: build_diatonic_chords
 */
export function getDiatonicChords(key: Note): DiatonicChord[] {
  const scale = generateScale(key, 'major')
  const chords: DiatonicChord[] = []

  // Roman numeral patterns for major keys
  const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
  const qualities: ChordQuality[] = [
    'major',
    'minor',
    'minor',
    'major',
    'major',
    'minor',
    'diminished',
  ]

  // Build chord on each scale degree
  for (let i = 0; i < scale.notes.length; i++) {
    const root = scale.notes[i]
    const quality = qualities[i]
    const chord = generateChord(root, quality)

    chords.push({
      degree: i + 1,
      romanNumeral: romanNumerals[i],
      root,
      quality,
      chord,
    })
  }

  return chords
}

/**
 * Get the 7 diatonic chords for a minor key
 */
export function getDiatonicChordsMinor(key: Note): DiatonicChord[] {
  const scale = generateScale(key, 'minor')
  const chords: DiatonicChord[] = []

  // Roman numeral patterns for minor keys
  const romanNumerals = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']
  const qualities: ChordQuality[] = [
    'minor',
    'diminished',
    'major',
    'minor',
    'minor',
    'major',
    'major',
  ]

  // Build chord on each scale degree
  for (let i = 0; i < scale.notes.length; i++) {
    const root = scale.notes[i]
    const quality = qualities[i]
    const chord = generateChord(root, quality)

    chords.push({
      degree: i + 1,
      romanNumeral: romanNumerals[i],
      root,
      quality,
      chord,
    })
  }

  return chords
}

/**
 * Get the I-IV-V chords for a key (the most common progression)
 */
export function getPrimaryChords(key: Note): {
  tonic: Chord
  subdominant: Chord
  dominant: Chord
} {
  const diatonicChords = getDiatonicChords(key)

  return {
    tonic: diatonicChords[0].chord, // I
    subdominant: diatonicChords[3].chord, // IV
    dominant: diatonicChords[4].chord, // V
  }
}

/**
 * Get the position of a key in the circle of fifths
 * Returns the index (0-11) where 0 = C
 */
export function getKeyPosition(key: Note): number {
  const circle = calculateCircleOfFifths()
  return circle.indexOf(key)
}

/**
 * Get keys adjacent to a given key in the circle of fifths
 */
export function getAdjacentKeys(key: Note): {
  clockwise: Note // Up a 5th
  counterClockwise: Note // Up a 4th (down a 5th)
} {
  const circle = calculateCircleOfFifths()
  const keyIdx = circle.indexOf(key)

  return {
    clockwise: circle[(keyIdx + 1) % 12],
    counterClockwise: circle[(keyIdx - 1 + 12) % 12],
  }
}
