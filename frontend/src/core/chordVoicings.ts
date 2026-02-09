import { CHORD_PATTERNS, UKULELE_TUNING, MAX_FRET_SPAN, SEMITONES_PER_OCTAVE } from '@/constants'
import { noteToIndex, indexToNote, semitonesToHz } from './musicTheory'
import { calculateConsonance } from './intervals'
import type {
  Note,
  Chord,
  ChordQuality,
  ChordVoicing,
  FretPosition,
  UkuleleString,
} from '@/schemas'

/**
 * Detect the actual chord quality of a voicing by analyzing its interval structure
 * Returns the detected quality or null if no match found
 */
export function detectVoicingQuality(
  positions: FretPosition[],
  root: Note,
): ChordQuality | null {
  // Extract unique pitch classes from the voicing
  const notes = positions.map((p) => p.note)
  const uniqueNotes = [...new Set(notes)]

  // Calculate intervals from root (normalized to 0-11 semitones)
  const rootIdx = noteToIndex(root)
  const intervals = uniqueNotes
    .map((note) => {
      const noteIdx = noteToIndex(note)
      return (noteIdx - rootIdx + SEMITONES_PER_OCTAVE) % SEMITONES_PER_OCTAVE
    })
    .sort((a, b) => a - b)

  // Helper to check if two arrays are equal
  const arraysEqual = (a: readonly number[], b: number[]): boolean => {
    if (a.length !== b.length) return false
    return a.every((val, idx) => val === b[idx])
  }

  // Try exact pattern match first
  for (const [quality, pattern] of Object.entries(CHORD_PATTERNS)) {
    if (arraysEqual(pattern, intervals)) {
      return quality as ChordQuality
    }
  }

  // Try subset matching for partial chords (e.g., omitted fifths)
  // A voicing must contain the CHARACTERISTIC intervals that define the quality
  if (intervals.length >= 2) {
    // Define characteristic intervals for each quality
    // These are the intervals that MUST be present to identify the chord
    const characteristicIntervals: Record<string, number[]> = {
      major: [4], // Must have major 3rd
      minor: [3], // Must have minor 3rd
      diminished: [3, 6], // Must have minor 3rd AND diminished 5th
      augmented: [4, 8], // Must have major 3rd AND augmented 5th
      major7: [4, 11], // Must have major 3rd AND major 7th
      minor7: [3, 10], // Must have minor 3rd AND minor 7th
      dominant7: [4, 10], // Must have major 3rd AND minor 7th
      diminished7: [3, 6, 9], // Must have minor 3rd, dim 5th, AND dim 7th
      half_diminished7: [3, 6, 10], // Must have minor 3rd, dim 5th, AND minor 7th
      sus2: [2], // Must have major 2nd (and NOT have a 3rd)
      sus4: [5], // Must have perfect 4th (and NOT have a 3rd)
    }

    for (const [quality, pattern] of Object.entries(CHORD_PATTERNS)) {
      // Check if all voicing intervals are present in the pattern
      const isSubset = intervals.every((interval) =>
        (pattern as readonly number[]).includes(interval),
      )

      if (isSubset) {
        const requiredIntervals = characteristicIntervals[quality] || []

        // Check if all characteristic intervals are present in the voicing
        const hasAllCharacteristics = requiredIntervals.every((reqInterval) =>
          intervals.includes(reqInterval),
        )

        if (hasAllCharacteristics) {
          // For sus chords, also verify NO third is present
          if (quality === 'sus2' || quality === 'sus4') {
            const hasThird = intervals.includes(3) || intervals.includes(4)
            if (hasThird) {
              continue // Skip this match if it has a third
            }
          }

          return quality as ChordQuality
        }
      }
    }
  }

  return null
}

/**
 * Find all possible chord voicings on ukulele
 * This is the KILLER FEATURE from the notebooks!
 * From notebook: find_chord_voicings
 */
export function findChordVoicings(
  chord: Chord,
  maxFretSpan = MAX_FRET_SPAN,
): ChordVoicing[] {
  const voicings: ChordVoicing[] = []
  const strings: UkuleleString[] = ['G', 'C', 'E', 'A']

  // For each string, find all fret positions that contain chord notes
  const stringPositions: Record<UkuleleString, FretPosition[]> = {
    G: [],
    C: [],
    E: [],
    A: [],
  }

  strings.forEach((string) => {
    const stringBaseSemitone = UKULELE_TUNING[string]

    for (let fret = 0; fret <= SEMITONES_PER_OCTAVE; fret++) {
      const semitones = stringBaseSemitone + fret
      const noteIdx = (noteToIndex('C') + semitones) % SEMITONES_PER_OCTAVE
      const note = indexToNote(noteIdx)

      if (chord.notes.includes(note)) {
        stringPositions[string].push({
          string,
          fret,
          note,
          frequency: semitonesToHz(semitones, 261.63), // C4 base
        })
      }
    }
  })

  // Generate all combinations (one position per string)
  const combinations = generateCombinations(stringPositions, strings)

  // Filter and score voicings
  combinations.forEach((positions) => {
    const frets = positions.map((p) => p.fret)
    const minFret = Math.min(...frets.filter((f) => f > 0)) || 0
    const maxFret = Math.max(...frets)
    const fretSpan = maxFret - minFret

    // Filter by fret span
    if (fretSpan <= maxFretSpan) {
      const difficulty = calculateDifficulty(positions, fretSpan)
      const consonance = calculateVoicingConsonance(positions)
      const detectedQuality = detectVoicingQuality(positions, chord.root)

      voicings.push({
        chord,
        positions,
        fretSpan,
        difficulty,
        consonance,
        detectedQuality: detectedQuality || undefined,
        metadata: {
          minFret,
          maxFret,
        },
      })
    }
  })

  // Sort voicings: closer to neck first, then by difficulty
  // 1. Lower fret positions first (closer to headstock)
  // 2. If same min fret, more compact voicings first (lower max fret)
  // 3. If still tied, easier voicings first (lower difficulty score)
  return voicings.sort((a, b) => {
    const aMinFret = a.metadata?.minFret || 0
    const bMinFret = b.metadata?.minFret || 0
    const aMaxFret = a.metadata?.maxFret || 0
    const bMaxFret = b.metadata?.maxFret || 0

    // Primary sort: closer to neck (lower minimum fret)
    if (aMinFret !== bMinFret) {
      return aMinFret - bMinFret
    }

    // Secondary sort: more compact (lower maximum fret)
    if (aMaxFret !== bMaxFret) {
      return aMaxFret - bMaxFret
    }

    // Tertiary sort: easier to play (lower difficulty)
    return a.difficulty - b.difficulty
  })
}

/**
 * Get difficulty label and color for a voicing
 */
export function getDifficultyLabel(difficulty: number): {
  label: string
  variant: 'default' | 'secondary' | 'destructive'
} {
  if (difficulty <= 3) return { label: 'Easy', variant: 'default' }
  if (difficulty <= 6) return { label: 'Medium', variant: 'secondary' }
  return { label: 'Hard', variant: 'destructive' }
}

/**
 * Format voicing as string (e.g., "3-2-0-0" for G-C-E-A)
 */
export function formatVoicingString(voicing: ChordVoicing): string {
  const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
  return strings
    .map((str) => {
      const pos = voicing.positions.find((p) => p.string === str)
      return pos ? pos.fret.toString() : 'x'
    })
    .join('-')
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Generate all combinations of positions (one per string)
 */
function generateCombinations(
  stringPositions: Record<UkuleleString, FretPosition[]>,
  strings: UkuleleString[],
): FretPosition[][] {
  const combinations: FretPosition[][] = []

  function recurse(index: number, current: FretPosition[]) {
    if (index === strings.length) {
      combinations.push([...current])
      return
    }

    const string = strings[index]
    const positions = stringPositions[string]

    positions.forEach((position) => {
      current.push(position)
      recurse(index + 1, current)
      current.pop()
    })
  }

  recurse(0, [])
  return combinations
}

/**
 * Calculate difficulty score for a voicing (0-10)
 */
function calculateDifficulty(
  positions: FretPosition[],
  fretSpan: number,
): number {
  let difficulty = 0

  // Fret span contributes to difficulty
  difficulty += fretSpan * 1.5

  // Number of fingers needed (excluding open strings)
  const fingersNeeded = positions.filter((p) => p.fret > 0).length
  difficulty += fingersNeeded * 0.5

  // Barre chords are harder
  const frets = positions.map((p) => p.fret)
  const uniqueFrets = new Set(frets.filter((f) => f > 0))
  if (uniqueFrets.size < fingersNeeded) {
    difficulty += 1 // Likely a barre
  }

  return Math.min(difficulty, 10)
}

/**
 * Calculate consonance score for a voicing
 */
export function calculateVoicingConsonance(positions: FretPosition[]): number {
  let totalConsonance = 0
  let count = 0

  // Check intervals between all pairs of notes
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const note1Idx = noteToIndex(positions[i].note)
      const note2Idx = noteToIndex(positions[j].note)
      const interval = Math.abs(note2Idx - note1Idx)

      totalConsonance += calculateConsonance(interval)
      count++
    }
  }

  return count > 0 ? totalConsonance / count : 0
}
