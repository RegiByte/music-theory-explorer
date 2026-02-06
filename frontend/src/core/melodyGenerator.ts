import { noteToIndex } from './musicTheory'
import { analyzeMelody, type MelodyNoteWithMute } from './melody'
import type { Note } from '@/schemas'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MelodyStyle = 'smooth' | 'melodic' | 'angular' | 'arpeggiated'

export interface StyleParams {
  /** Probability of stepwise motion (0-1). Higher = smoother */
  stepProbability: number
  /** Probability of landing on a chord tone when on a strong beat (0-1) */
  chordToneAffinity: number
  /** Maximum allowed leap in semitones */
  maxLeap: number
  /** Human-readable label */
  label: string
  /** Short description */
  description: string
}

export interface MelodyNote {
  id: string
  note: Note
  isChordTone: boolean
  isStrongBeat: boolean
  scaleDegree: number | null
}

export interface MelodyAnalysis {
  stepPercentage: number
  chordTonePercentage: number
  totalNotes: number
  intervalRange: string // e.g. "1-5 semitones"
  maxInterval: number
}

export interface MelodyPath {
  id: string
  style: MelodyStyle
  notes: MelodyNote[]
  analysis: MelodyAnalysis
}

// ---------------------------------------------------------------------------
// Style Presets
// ---------------------------------------------------------------------------

export const MELODY_STYLE_PRESETS: Record<MelodyStyle, StyleParams> = {
  smooth: {
    stepProbability: 0.85,
    chordToneAffinity: 0.8,
    maxLeap: 3,
    label: 'Smooth',
    description: 'Conjunct motion, stays close to chord tones',
  },
  melodic: {
    stepProbability: 0.65,
    chordToneAffinity: 0.6,
    maxLeap: 5,
    label: 'Melodic',
    description: 'Balanced movement, singable and natural',
  },
  angular: {
    stepProbability: 0.4,
    chordToneAffinity: 0.4,
    maxLeap: 7,
    label: 'Angular',
    description: 'Wider intervals, more tension and surprise',
  },
  arpeggiated: {
    stepProbability: 0.3,
    chordToneAffinity: 0.95,
    maxLeap: 7,
    label: 'Arpeggiated',
    description: 'Outlines the chord structure, arpeggio-like',
  },
}

export const MELODY_STYLES: MelodyStyle[] = ['smooth', 'melodic', 'angular', 'arpeggiated']

// ---------------------------------------------------------------------------
// Generation Engine
// ---------------------------------------------------------------------------

/**
 * Generate a melody with parameterized style.
 * 
 * Algorithm:
 * 1. Start on a chord tone
 * 2. For each subsequent position:
 *    - On strong beats: prefer chord tones (based on chordToneAffinity)
 *    - Otherwise: stepwise or leap (based on stepProbability)
 *    - Steps are constrained by maxLeap
 *    - All notes must be in the scale
 * 3. End on the root (tonic) for closure
 */
export function generateStyledMelody(
  scaleNotes: Note[],
  chordNotes: Note[],
  length: number,
  params: StyleParams,
): MelodyNote[] {
  if (scaleNotes.length === 0) return []
  
  const effectiveChordNotes = chordNotes.length > 0 ? chordNotes : [scaleNotes[0]]
  const melody: MelodyNote[] = []

  // Start on a chord tone
  let currentNote = effectiveChordNotes[Math.floor(Math.random() * effectiveChordNotes.length)]
  melody.push(createMelodyNote(0, currentNote, effectiveChordNotes, scaleNotes))

  for (let i = 1; i < length; i++) {
    const isStrongBeat = i % 2 === 0
    const isLastNote = i === length - 1

    // End on root for closure
    if (isLastNote) {
      currentNote = effectiveChordNotes[0] // root
      melody.push(createMelodyNote(i, currentNote, effectiveChordNotes, scaleNotes))
      continue
    }

    // On strong beats, prefer chord tones
    if (isStrongBeat && Math.random() < params.chordToneAffinity) {
      currentNote = effectiveChordNotes[Math.floor(Math.random() * effectiveChordNotes.length)]
      melody.push(createMelodyNote(i, currentNote, effectiveChordNotes, scaleNotes))
      continue
    }

    // Decide: step or leap?
    if (Math.random() < params.stepProbability) {
      currentNote = pickStepwiseNote(currentNote, scaleNotes, params.maxLeap)
    } else {
      currentNote = pickLeapNote(currentNote, scaleNotes, effectiveChordNotes, params)
    }

    melody.push(createMelodyNote(i, currentNote, effectiveChordNotes, scaleNotes))
  }

  return melody
}

/**
 * Pick a note via stepwise motion — move to an adjacent scale degree.
 */
function pickStepwiseNote(
  current: Note,
  scaleNotes: Note[],
  maxStep: number,
): Note {
  const currentIdx = noteToIndex(current)

  // Find scale notes within maxStep semitones (excluding current)
  const candidates = scaleNotes.filter(n => {
    const idx = noteToIndex(n)
    let interval = Math.abs(idx - currentIdx)
    if (interval > 6) interval = 12 - interval
    return interval > 0 && interval <= maxStep
  })

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // Fallback: any scale note
  return scaleNotes[Math.floor(Math.random() * scaleNotes.length)]
}

/**
 * Pick a note via leap — jump to a chord tone or distant scale note.
 */
function pickLeapNote(
  current: Note,
  scaleNotes: Note[],
  chordNotes: Note[],
  params: StyleParams,
): Note {
  const currentIdx = noteToIndex(current)

  // For arpeggiated style, strongly prefer chord tones even on leaps
  if (params.chordToneAffinity > 0.8) {
    const otherChordNotes = chordNotes.filter(n => n !== current)
    if (otherChordNotes.length > 0) {
      return otherChordNotes[Math.floor(Math.random() * otherChordNotes.length)]
    }
  }

  // Otherwise, pick a scale note that's further away (a real leap)
  const leapCandidates = scaleNotes.filter(n => {
    const idx = noteToIndex(n)
    let interval = Math.abs(idx - currentIdx)
    if (interval > 6) interval = 12 - interval
    return interval >= 3 && interval <= params.maxLeap
  })

  if (leapCandidates.length > 0) {
    return leapCandidates[Math.floor(Math.random() * leapCandidates.length)]
  }

  // Fallback: any scale note other than current
  const others = scaleNotes.filter(n => n !== current)
  return others.length > 0
    ? others[Math.floor(Math.random() * others.length)]
    : scaleNotes[Math.floor(Math.random() * scaleNotes.length)]
}

/**
 * Create a MelodyNote with metadata.
 */
function createMelodyNote(
  index: number,
  note: Note,
  chordNotes: Note[],
  scaleNotes: Note[],
): MelodyNote {
  const scaleIdx = scaleNotes.indexOf(note)
  return {
    id: `note-${index}`,
    note,
    isChordTone: chordNotes.includes(note),
    isStrongBeat: index === 0 || index % 2 === 0,
    scaleDegree: scaleIdx >= 0 ? scaleIdx + 1 : null,
  }
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a MelodyNote[] (our new format) using the existing analyzeMelody
 * from melody.ts, plus additional interval range info.
 */
export function analyzeMelodyPath(notes: MelodyNote[]): MelodyAnalysis {
  // Convert to MelodyNoteWithMute format for existing analyzer
  const withMute: MelodyNoteWithMute[] = notes.map(n => ({
    ...n,
    muted: false,
  }))

  const basic = analyzeMelody(withMute)

  // Compute interval range
  let minInterval = Infinity
  let maxInterval = 0
  for (let i = 1; i < notes.length; i++) {
    const prevIdx = noteToIndex(notes[i - 1].note)
    const currIdx = noteToIndex(notes[i].note)
    let interval = Math.abs(currIdx - prevIdx)
    if (interval > 6) interval = 12 - interval
    if (interval > 0) {
      minInterval = Math.min(minInterval, interval)
      maxInterval = Math.max(maxInterval, interval)
    }
  }

  if (minInterval === Infinity) minInterval = 0

  return {
    stepPercentage: basic.stepPercentage,
    chordTonePercentage: basic.chordTonePercentage,
    totalNotes: basic.totalNotes,
    intervalRange: `${minInterval}-${maxInterval} st`,
    maxInterval,
  }
}

// ---------------------------------------------------------------------------
// Path Generation
// ---------------------------------------------------------------------------

let pathCounter = 0

/**
 * Generate all 4 style paths at once.
 */
export function generateAllPaths(
  scaleNotes: Note[],
  chordNotes: Note[],
  length: number,
): MelodyPath[] {
  return MELODY_STYLES.map(style => {
    const params = MELODY_STYLE_PRESETS[style]
    const notes = generateStyledMelody(scaleNotes, chordNotes, length, params)
    const analysis = analyzeMelodyPath(notes)
    pathCounter++

    return {
      id: `path-${style}-${pathCounter}`,
      style,
      notes,
      analysis,
    }
  })
}

/**
 * Generate a single path for a given style.
 */
export function generateSinglePath(
  style: MelodyStyle,
  scaleNotes: Note[],
  chordNotes: Note[],
  length: number,
): MelodyPath {
  const params = MELODY_STYLE_PRESETS[style]
  const notes = generateStyledMelody(scaleNotes, chordNotes, length, params)
  const analysis = analyzeMelodyPath(notes)
  pathCounter++

  return {
    id: `path-${style}-${pathCounter}`,
    style,
    notes,
    analysis,
  }
}

/**
 * Rebuild analysis and metadata for a path after editing.
 */
export function rebuildPathAnalysis(
  path: MelodyPath,
  chordNotes: Note[],
  scaleNotes: Note[],
): MelodyPath {
  // Re-derive metadata for each note
  const updatedNotes = path.notes.map((n, i) => ({
    ...n,
    id: `note-${i}`,
    isChordTone: chordNotes.includes(n.note),
    isStrongBeat: i === 0 || i % 2 === 0,
    scaleDegree: scaleNotes.indexOf(n.note) >= 0 ? scaleNotes.indexOf(n.note) + 1 : null,
  }))

  return {
    ...path,
    notes: updatedNotes,
    analysis: analyzeMelodyPath(updatedNotes),
  }
}
