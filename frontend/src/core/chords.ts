import { CHORD_PATTERNS, UKULELE_TUNING, MAX_FRET_SPAN } from '@/constants'
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
    indexToNote(rootIdx + interval)
  ) as Note[]

  return {
    root,
    quality,
    notes,
    intervals,
  }
}

/**
 * Detect the actual chord quality of a voicing by analyzing its interval structure
 * Returns the detected quality or null if no match found
 */
export function detectVoicingQuality(
  positions: FretPosition[],
  root: Note
): ChordQuality | null {
  // Extract unique pitch classes from the voicing
  const notes = positions.map((p) => p.note)
  const uniqueNotes = [...new Set(notes)]

  // Calculate intervals from root (normalized to 0-11 semitones)
  const rootIdx = noteToIndex(root)
  const intervals = uniqueNotes
    .map((note) => {
      const noteIdx = noteToIndex(note)
      return (noteIdx - rootIdx + 12) % 12
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
      const isSubset = intervals.every((interval) => (pattern as readonly number[]).includes(interval))
      
      if (isSubset) {
        const requiredIntervals = characteristicIntervals[quality] || []
        
        // Check if all characteristic intervals are present in the voicing
        const hasAllCharacteristics = requiredIntervals.every((reqInterval) =>
          intervals.includes(reqInterval)
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
  maxFretSpan = MAX_FRET_SPAN
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

    for (let fret = 0; fret <= 12; fret++) {
      const semitones = stringBaseSemitone + fret
      const noteIdx = (noteToIndex('C') + semitones) % 12
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
 * Generate all combinations of positions (one per string)
 */
function generateCombinations(
  stringPositions: Record<UkuleleString, FretPosition[]>,
  strings: UkuleleString[]
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
  fretSpan: number
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
function calculateVoicingConsonance(positions: FretPosition[]): number {
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
  const interval = (noteIdx - rootIdx + 12) % 12

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

/**
 * Build chord from selected intervals
 * Allows constructing chords from arbitrary interval combinations
 */
export function buildChordFromIntervals(
  root: Note,
  intervals: number[]
): Chord {
  const rootIdx = noteToIndex(root)
  
  // Always include root (0) and sort intervals
  const uniqueIntervals = [...new Set([0, ...intervals])].sort((a, b) => a - b)
  
  const notes = uniqueIntervals.map((interval) =>
    indexToNote(rootIdx + interval)
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

/**
 * Analyze what makes a chord its quality
 * Returns the defining intervals and their roles
 */
export function analyzeChordQuality(chord: Chord): {
  definingIntervals: Array<{
    interval: number
    name: string
    role: 'quality' | 'stability' | 'color'
    importance: number
  }>
  quality: ChordQuality | null
  consonance: number
} {
  const intervalNames: Record<number, string> = {
    0: 'Root',
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
  }

  const definingIntervals = chord.intervals.map((interval) => {
    let role: 'quality' | 'stability' | 'color' = 'color'
    let importance = 0.5

    // Determine role and importance
    if (interval === 0) {
      role = 'stability'
      importance = 1.0
    } else if (interval === 3 || interval === 4) {
      // Minor or major 3rd defines quality
      role = 'quality'
      importance = 1.0
    } else if (interval === 7) {
      // Perfect 5th provides stability
      role = 'stability'
      importance = 0.9
    } else if (interval === 6 || interval === 8) {
      // Diminished 5th or augmented 5th affects quality
      role = 'quality'
      importance = 0.8
    } else if (interval === 10 || interval === 11) {
      // 7ths add color
      role = 'color'
      importance = 0.7
    } else if (interval === 2 || interval === 5) {
      // Sus chords - these define quality when 3rd is absent
      role = 'quality'
      importance = 0.8
    }

    return {
      interval,
      name: intervalNames[interval] || 'Unknown',
      role,
      importance,
    }
  })

  // Calculate overall consonance
  const consonance = calculateVoicingConsonance(
    chord.notes.map((note, i) => ({
      string: 'C' as UkuleleString,
      fret: chord.intervals[i],
      note,
      frequency: semitonesToHz(chord.intervals[i], 261.63),
    }))
  )

  return {
    definingIntervals,
    quality: chord.quality,
    consonance,
  }
}

/**
 * Get all pairwise interval relationships in a chord
 * Shows how each note relates to every other note
 */
export function getChordIntervalBreakdown(chord: Chord): Array<{
  note1: Note
  note2: Note
  interval: number
  intervalName: string
  consonance: number
}> {
  const intervalNames: Record<number, string> = {
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

  const breakdown: Array<{
    note1: Note
    note2: Note
    interval: number
    intervalName: string
    consonance: number
  }> = []

  // Check all pairs of notes
  for (let i = 0; i < chord.notes.length; i++) {
    for (let j = i + 1; j < chord.notes.length; j++) {
      const note1 = chord.notes[i]
      const note2 = chord.notes[j]
      const note1Idx = noteToIndex(note1)
      const note2Idx = noteToIndex(note2)
      const interval = Math.abs(note2Idx - note1Idx) % 12
      const consonance = calculateConsonance(interval)

      breakdown.push({
        note1,
        note2,
        interval,
        intervalName: intervalNames[interval] || 'Unknown',
        consonance,
      })
    }
  }

  return breakdown
}
