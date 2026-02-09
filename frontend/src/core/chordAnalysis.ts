import { SEMITONES_PER_OCTAVE } from '@/constants'
import { noteToIndex, semitonesToHz } from './musicTheory'
import { calculateConsonance } from './intervals'
import { calculateVoicingConsonance } from './chordVoicings'
import type {
  Note,
  Chord,
  ChordQuality,
  UkuleleString,
} from '@/schemas'

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
    })),
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
      const interval = Math.abs(note2Idx - note1Idx) % SEMITONES_PER_OCTAVE
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
