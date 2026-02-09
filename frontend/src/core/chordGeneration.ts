import { CHORD_PATTERNS, SEMITONES_PER_OCTAVE } from '@/constants'
import { noteToIndex, indexToNote, semitonesToHz } from './musicTheory'
import { detectVoicingQuality } from './chordVoicings'
import type {
  Note,
  Chord,
  ChordQuality,
  FretPosition,
  UkuleleString,
} from '@/schemas'

/**
 * Generate a chord from a root note and quality
 * From notebook: chord generation logic
 */
export function generateChord(root: Note, quality: ChordQuality): Chord {
  const pattern = CHORD_PATTERNS[quality]
  if (!pattern) {
    throw new Error(`Unknown chord quality: ${quality}`)
  }

  const rootIdx = noteToIndex(root)
  const intervals = [...pattern] // Convert readonly to mutable
  const notes = intervals.map((interval) =>
    indexToNote(rootIdx + interval),
  ) as Note[]

  return {
    root,
    quality,
    notes,
    intervals,
  }
}

/**
 * Check if a note is a chord tone
 */
export function isChordTone(note: Note, chord: Chord): boolean {
  return chord.notes.includes(note)
}

/**
 * Get chord symbol (e.g., "Cmaj7", "Am", "G7")
 */
export function getChordSymbol(chord: Chord): string {
  const qualitySymbols: Record<ChordQuality, string> = {
    major: '',
    minor: 'm',
    diminished: 'dim',
    augmented: 'aug',
    major7: 'maj7',
    minor7: 'm7',
    dominant7: '7',
    diminished7: 'dim7',
    half_diminished7: 'm7♭5',
    sus2: 'sus2',
    sus4: 'sus4',
  }

  return `${chord.root}${qualitySymbols[chord.quality]}`
}

/**
 * Get chord degree label for a note in a chord
 * Returns labels like "R" (root), "3", "♭3", "5", "7", etc.
 */
export function getChordDegree(note: Note, chord: Chord): string | undefined {
  const noteIdx = noteToIndex(note)
  const rootIdx = noteToIndex(chord.root)
  const interval = (noteIdx - rootIdx + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE

  const degreeMap: Record<number, string> = {
    0: 'R',
    2: '2',
    3: '♭3',
    4: '3',
    5: '4',
    6: '♭5',
    7: '5',
    8: '♯5',
    9: '6',
    10: '♭7',
    11: '7',
  }

  return degreeMap[interval]
}

/**
 * Build chord from selected intervals
 * Allows constructing chords from arbitrary interval combinations
 */
export function buildChordFromIntervals(
  root: Note,
  intervals: number[],
): Chord {
  const rootIdx = noteToIndex(root)

  // Always include root (0) and sort intervals
  const uniqueIntervals = [...new Set([0, ...intervals])].sort((a, b) => a - b)

  const notes = uniqueIntervals.map((interval) =>
    indexToNote(rootIdx + interval),
  ) as Note[]

  // Try to detect quality from intervals
  let quality: ChordQuality = 'major' // Default fallback

  // Create a temporary chord to use detectVoicingQuality
  const tempPositions: FretPosition[] = notes.map((note, i) => ({
    string: 'C' as UkuleleString,
    fret: uniqueIntervals[i],
    note,
    frequency: semitonesToHz(uniqueIntervals[i], 261.63),
  }))

  const detectedQuality = detectVoicingQuality(tempPositions, root)
  if (detectedQuality) {
    quality = detectedQuality
  }

  return {
    root,
    quality,
    notes,
    intervals: uniqueIntervals,
  }
}
