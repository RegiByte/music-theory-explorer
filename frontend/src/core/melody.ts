import { noteToIndex, indexToNote } from './musicTheory'
import type { Note } from '@/schemas'

/**
 * Melody note with metadata for UI
 */
export interface MelodyNoteWithMute {
  id: string
  note: Note
  isChordTone: boolean
  isStrongBeat: boolean
  muted: boolean
}

/**
 * Generate a simple melody following melodic principles
 * Translated from notebook: generate_simple_melody
 *
 * Algorithm:
 * - Start on a chord tone
 * - On strong beats (even positions): 70% chance of chord tone
 * - Stepwise motion (70% probability): move 1-2 semitones
 * - Leap motion (30% probability): jump to random scale note
 * - Ensure all notes are in the scale
 * - End on the root note (tonic)
 */
export function generateSimpleMelody(
  scaleNotes: Note[],
  chordNotes: Note[],
  length: number = 8,
  stepProbability: number = 0.7,
): MelodyNoteWithMute[] {
  const melody: MelodyNoteWithMute[] = []

  // Start on a chord tone
  let currentNote = chordNotes[Math.floor(Math.random() * chordNotes.length)]
  melody.push({
    id: `note-0`,
    note: currentNote,
    isChordTone: true,
    isStrongBeat: true, // First beat is strong
    muted: false,
  })

  for (let i = 1; i < length; i++) {
    const currentIdx = noteToIndex(currentNote)
    const isStrongBeat = i % 2 === 0

    // On strong beats, prefer chord tones (70% chance)
    if (isStrongBeat && Math.random() < 0.7) {
      currentNote = chordNotes[Math.floor(Math.random() * chordNotes.length)]
      melody.push({
        id: `note-${i}`,
        note: currentNote,
        isChordTone: true,
        isStrongBeat: true,
        muted: false,
      })
      continue
    }

    // Decide: step or leap?
    if (Math.random() < stepProbability) {
      // Stepwise motion (1-2 semitones)
      const stepSize = [1, 2, -1, -2][Math.floor(Math.random() * 4)]
      const nextIdx = (currentIdx + stepSize + 12) % 12
      const nextNote = indexToNote(nextIdx)

      // Make sure it's in the scale
      if (scaleNotes.includes(nextNote)) {
        currentNote = nextNote
      } else {
        // If not in scale, pick a nearby scale note
        currentNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)]
      }
    } else {
      // Leap (jump to random scale note)
      currentNote = scaleNotes[Math.floor(Math.random() * scaleNotes.length)]
    }

    melody.push({
      id: `note-${i}`,
      note: currentNote,
      isChordTone: chordNotes.includes(currentNote),
      isStrongBeat,
      muted: false,
    })
  }

  // End on the root (tonic) for closure
  if (melody.length > 0) {
    melody[melody.length - 1].note = chordNotes[0]
    melody[melody.length - 1].isChordTone = true
  }

  return melody
}

/**
 * Analyze melody characteristics
 */
export function analyzeMelody(melody: MelodyNoteWithMute[]): {
  stepPercentage: number
  chordTonePercentage: number
  totalNotes: number
  activeNotes: number
} {
  const totalNotes = melody.length
  const activeNotes = melody.filter((n) => !n.muted).length

  if (activeNotes === 0) {
    return {
      stepPercentage: 0,
      chordTonePercentage: 0,
      totalNotes,
      activeNotes: 0,
    }
  }

  // Calculate chord tone percentage (only for active notes)
  const activeChordTones = melody.filter(
    (n) => !n.muted && n.isChordTone,
  ).length
  const chordTonePercentage = (activeChordTones / activeNotes) * 100

  // Calculate stepwise motion percentage
  let stepwiseCount = 0
  const activeMelody = melody.filter((n) => !n.muted)

  for (let i = 1; i < activeMelody.length; i++) {
    const prevIdx = noteToIndex(activeMelody[i - 1].note)
    const currIdx = noteToIndex(activeMelody[i].note)
    const interval = Math.abs(currIdx - prevIdx)

    // Stepwise = 1 or 2 semitones (accounting for wrap-around)
    if (interval <= 2 || interval >= 10) {
      stepwiseCount++
    }
  }

  const stepPercentage =
    activeMelody.length > 1
      ? (stepwiseCount / (activeMelody.length - 1)) * 100
      : 0

  return {
    stepPercentage: Math.round(stepPercentage),
    chordTonePercentage: Math.round(chordTonePercentage),
    totalNotes,
    activeNotes,
  }
}

/**
 * Note suggestion with scoring for Melody Suggester
 */
export interface NoteSuggestion {
  note: Note
  score: number // 0-100
  reasons: string[]
  category: 'strong' | 'good' | 'interesting' | 'risky'
}

/**
 * Suggest next notes for melody composition with scoring
 *
 * Scoring heuristics:
 * - Stepwise motion (+30): Intervals of 1-2 semitones from last note
 * - Chord tone on strong beat (+25): If position is even and note is in chord
 * - Large leap penalty (-20): Intervals > 5 semitones
 * - Approach tonic (+15): When near target length, favor notes close to root
 * - Repeated note (-10): Same note as previous
 *
 * Categories:
 * - Strong (80-100): Best choices following theory
 * - Good (60-79): Solid options
 * - Interesting (40-59): Creative choices with tension
 * - Risky (0-39): Unconventional, but allowed
 */
export function suggestNextNotes(
  currentMelody: Note[],
  scaleNotes: Note[],
  chordNotes: Note[],
  position: number,
  targetLength: number = 8,
): NoteSuggestion[] {
  if (currentMelody.length === 0) {
    // For first note, suggest chord tones with high scores
    return chordNotes.map((note) => ({
      note,
      score: 90,
      reasons: ['Strong starting note', 'Chord tone (stable)'],
      category: 'strong' as const,
    }))
  }

  const lastNote = currentMelody[currentMelody.length - 1]
  const lastIdx = noteToIndex(lastNote)
  const isStrongBeat = position % 2 === 0
  const isNearEnd = position >= targetLength - 2
  const rootNote = chordNotes[0]

  const suggestions: NoteSuggestion[] = scaleNotes.map((note) => {
    let score = 50 // baseline
    const reasons: string[] = []
    const noteIdx = noteToIndex(note)

    // Calculate interval from last note
    let interval = Math.abs(noteIdx - lastIdx)
    // Account for wrap-around (e.g., B to C is 1 semitone, not 11)
    if (interval > 6) {
      interval = 12 - interval
    }

    // Factor 1: Stepwise motion (+30 points)
    if (interval <= 2 && interval > 0) {
      score += 30
      reasons.push('Stepwise motion')
    }

    // Factor 2: Chord tone on strong beat (+25 points)
    if (isStrongBeat && chordNotes.includes(note)) {
      score += 25
      reasons.push('Chord tone on strong beat')
    } else if (chordNotes.includes(note)) {
      score += 10
      reasons.push('Chord tone')
    }

    // Factor 3: Large leap penalty (-20 points)
    if (interval > 5) {
      score -= 20
      reasons.push('Large leap (use sparingly)')
    }

    // Factor 4: Approach tonic at end (+15 points)
    if (isNearEnd) {
      const tonicIdx = noteToIndex(rootNote)
      let tonicDistance = Math.abs(noteIdx - tonicIdx)
      if (tonicDistance > 6) {
        tonicDistance = 12 - tonicDistance
      }

      if (tonicDistance <= 2) {
        score += 15
        reasons.push('Approaches tonic (closure)')
      }

      // Boost tonic itself at the very end
      if (position === targetLength - 1 && note === rootNote) {
        score += 20
        reasons.push('Ends on tonic (strong closure)')
      }
    }

    // Factor 5: Repeated note (-10 points)
    if (note === lastNote) {
      score -= 10
      reasons.push('Repeated note')
    }

    // Ensure score stays in 0-100 range
    score = Math.max(0, Math.min(100, score))

    // Categorize based on final score
    let category: 'strong' | 'good' | 'interesting' | 'risky'
    if (score >= 80) {
      category = 'strong'
    } else if (score >= 60) {
      category = 'good'
    } else if (score >= 40) {
      category = 'interesting'
    } else {
      category = 'risky'
    }

    return { note, score, reasons, category }
  })

  // Sort by score (highest first) and return top 5
  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5)
}
