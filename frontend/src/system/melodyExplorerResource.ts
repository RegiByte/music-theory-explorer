import { defineResource } from 'braided'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  generateAllPaths,
  generateSinglePath,
  rebuildPathAnalysis,
  type MelodyPath,
  type MelodyNote,
} from '@/core/melodyGenerator'
import { suggestNextNotes, type NoteSuggestion } from '@/core/melody'
import { generateScale } from '@/core/scales'
import { generateChord } from '@/core/chords'
import { semitonesToHz, noteToIndex } from '@/core/musicTheory'
import { C4_FREQUENCY } from '@/constants'
import type { Note, ScaleType, ChordQuality } from '@/schemas'
import type { AudioResource } from '@/system'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface MelodyExplorerState {
  key: Note
  scaleType: ScaleType
  chordRoot: Note | null
  chordQuality: ChordQuality | null
  targetLength: number
  paths: MelodyPath[]
  selectedPathId: string | null
  // Note editing
  editingNoteIndex: number | null
  suggestions: NoteSuggestion[]
  // Practice
  practiceMode: boolean
  practiceStep: number
  practiceTempo: number // BPM
  practicePlaying: boolean
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface MelodyExplorerActions {
  // Configuration
  initialize: (key: Note, scaleType: ScaleType) => void
  setKey: (key: Note) => void
  setScaleType: (scaleType: ScaleType) => void
  setChordContext: (root: Note | null, quality: ChordQuality | null) => void
  setTargetLength: (length: number) => void

  // Generation
  generate: () => void
  regeneratePath: (pathId: string) => void

  // Selection & Editing
  selectPath: (pathId: string | null) => void
  deselectPath: () => void
  editNote: (pathId: string, noteIndex: number, newNote: Note) => void
  deleteNote: (pathId: string, noteIndex: number) => void
  insertNote: (pathId: string, noteIndex: number, note: Note) => void
  setEditingNoteIndex: (index: number | null) => void
  getSuggestions: (pathId: string, noteIndex: number) => void

  // Practice
  enterPracticeMode: (pathId: string) => void
  exitPracticeMode: () => void
  setPracticeTempo: (bpm: number) => void
  advancePracticeStep: () => void
  previousPracticeStep: () => void
  resetPracticeStep: () => void
  startPracticePlayback: () => void
  stopPracticePlayback: () => void

  // Audio
  playPath: (pathId: string) => void
  playNote: (note: Note) => void
  stopAudio: () => void
}

type MelodyExplorerStore = MelodyExplorerState & MelodyExplorerActions

export type MelodyExplorerStoreApi = StoreApi<MelodyExplorerStore>

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_KEY: Note = 'C'
const DEFAULT_SCALE: ScaleType = 'major'
const DEFAULT_LENGTH = 8
const DEFAULT_TEMPO = 100

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScaleNotes(key: Note, scaleType: ScaleType): Note[] {
  return generateScale(key, scaleType).notes
}

function getChordNotes(
  root: Note | null,
  quality: ChordQuality | null,
): Note[] {
  if (!root || !quality) return []
  try {
    return generateChord(root, quality).notes
  } catch {
    return []
  }
}

function noteToFrequency(note: Note): number {
  const semitones = noteToIndex(note) - noteToIndex('C')
  return semitonesToHz(semitones, C4_FREQUENCY)
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export const melodyExplorerResource = defineResource({
  dependencies: ['audio'],
  start: ({ audio }: { audio: AudioResource }) => {
    let practiceTimerId: ReturnType<typeof setTimeout> | null = null

    const store = createStore<MelodyExplorerStore>((set, get) => ({
      // State
      key: DEFAULT_KEY,
      scaleType: DEFAULT_SCALE,
      chordRoot: null,
      chordQuality: null,
      targetLength: DEFAULT_LENGTH,
      paths: [],
      selectedPathId: null,
      editingNoteIndex: null,
      suggestions: [],
      practiceMode: false,
      practiceStep: 0,
      practiceTempo: DEFAULT_TEMPO,
      practicePlaying: false,

      // -----------------------------------------------------------------------
      // Configuration
      // -----------------------------------------------------------------------

      initialize: (key, scaleType) => {
        set({
          key,
          scaleType,
          paths: [],
          selectedPathId: null,
          editingNoteIndex: null,
          suggestions: [],
          practiceMode: false,
          practiceStep: 0,
          practicePlaying: false,
        })
      },

      setKey: (key) => {
        set({
          key,
          paths: [],
          selectedPathId: null,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      setScaleType: (scaleType) => {
        set({
          scaleType,
          paths: [],
          selectedPathId: null,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      setChordContext: (root, quality) => {
        set({ chordRoot: root, chordQuality: quality })
      },

      setTargetLength: (length) => {
        set({
          targetLength: length,
          paths: [],
          selectedPathId: null,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      // -----------------------------------------------------------------------
      // Generation
      // -----------------------------------------------------------------------

      generate: () => {
        const { key, scaleType, chordRoot, chordQuality, targetLength } = get()
        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        // If no chord context, default to the tonic triad (1st, 3rd, 5th of scale)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        const paths = generateAllPaths(
          scaleNotes,
          effectiveChordNotes,
          targetLength,
        )
        set({
          paths,
          selectedPathId: null,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      regeneratePath: (pathId) => {
        const { key, scaleType, chordRoot, chordQuality, targetLength, paths } =
          get()
        const existingPath = paths.find((p) => p.id === pathId)
        if (!existingPath) return

        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        const newPath = generateSinglePath(
          existingPath.style,
          scaleNotes,
          effectiveChordNotes,
          targetLength,
        )
        set({
          paths: paths.map((p) => (p.id === pathId ? newPath : p)),
          // If this was the selected path, update the selection to the new path
          selectedPathId:
            get().selectedPathId === pathId ? newPath.id : get().selectedPathId,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      // -----------------------------------------------------------------------
      // Selection & Editing
      // -----------------------------------------------------------------------

      selectPath: (pathId) => {
        set({ selectedPathId: pathId, editingNoteIndex: null, suggestions: [] })
      },

      deselectPath: () => {
        set({ selectedPathId: null, editingNoteIndex: null, suggestions: [] })
      },

      editNote: (pathId, noteIndex, newNote) => {
        const { paths, key, scaleType, chordRoot, chordQuality } = get()
        const path = paths.find((p) => p.id === pathId)
        if (!path || noteIndex < 0 || noteIndex >= path.notes.length) return

        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        const updatedNotes = [...path.notes]
        updatedNotes[noteIndex] = {
          ...updatedNotes[noteIndex],
          note: newNote,
        }

        const updatedPath = rebuildPathAnalysis(
          { ...path, notes: updatedNotes },
          effectiveChordNotes,
          scaleNotes,
        )

        set({
          paths: paths.map((p) => (p.id === pathId ? updatedPath : p)),
        })
      },

      deleteNote: (pathId, noteIndex) => {
        const { paths, key, scaleType, chordRoot, chordQuality } = get()
        const path = paths.find((p) => p.id === pathId)
        if (!path || noteIndex < 0 || noteIndex >= path.notes.length) return
        if (path.notes.length <= 2) return // Don't allow deletion below 2 notes

        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        const updatedNotes = path.notes.filter((_, i) => i !== noteIndex)
        const updatedPath = rebuildPathAnalysis(
          { ...path, notes: updatedNotes },
          effectiveChordNotes,
          scaleNotes,
        )

        // Adjust editing index if needed
        const { editingNoteIndex } = get()
        let newEditingIndex = editingNoteIndex
        if (editingNoteIndex !== null) {
          if (editingNoteIndex >= updatedNotes.length) {
            newEditingIndex = updatedNotes.length - 1
          } else if (editingNoteIndex > noteIndex) {
            newEditingIndex = editingNoteIndex - 1
          }
        }

        set({
          paths: paths.map((p) => (p.id === pathId ? updatedPath : p)),
          editingNoteIndex: newEditingIndex,
        })
      },

      insertNote: (pathId, noteIndex, note) => {
        const { paths, key, scaleType, chordRoot, chordQuality } = get()
        const path = paths.find((p) => p.id === pathId)
        if (!path) return

        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        const newMelodyNote: MelodyNote = {
          id: `note-insert-${Date.now()}`,
          note,
          isChordTone: effectiveChordNotes.includes(note),
          isStrongBeat: false,
          scaleDegree: null,
        }

        const updatedNotes = [
          ...path.notes.slice(0, noteIndex),
          newMelodyNote,
          ...path.notes.slice(noteIndex),
        ]

        const updatedPath = rebuildPathAnalysis(
          { ...path, notes: updatedNotes },
          effectiveChordNotes,
          scaleNotes,
        )

        set({
          paths: paths.map((p) => (p.id === pathId ? updatedPath : p)),
          editingNoteIndex: noteIndex,
        })
      },

      setEditingNoteIndex: (index) => {
        const { selectedPathId } = get()
        if (!selectedPathId) {
          set({ editingNoteIndex: null, suggestions: [] })
          return
        }

        set({ editingNoteIndex: index })

        // Auto-compute suggestions for this position
        if (index !== null) {
          get().getSuggestions(selectedPathId, index)
        } else {
          set({ suggestions: [] })
        }
      },

      getSuggestions: (pathId, noteIndex) => {
        const { paths, key, scaleType, chordRoot, chordQuality } = get()
        const path = paths.find((p) => p.id === pathId)
        if (!path) return

        const scaleNotes = getScaleNotes(key, scaleType)
        const chordNotes = getChordNotes(chordRoot, chordQuality)
        const effectiveChordNotes =
          chordNotes.length > 0
            ? chordNotes
            : scaleNotes.length >= 5
              ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
              : [scaleNotes[0]]

        // Build the melody up to the editing position
        const melodyBefore = path.notes.slice(0, noteIndex).map((n) => n.note)

        const suggestions = suggestNextNotes(
          melodyBefore,
          scaleNotes,
          effectiveChordNotes,
          noteIndex,
          path.notes.length,
        )

        set({ suggestions })
      },

      // -----------------------------------------------------------------------
      // Practice
      // -----------------------------------------------------------------------

      enterPracticeMode: (pathId) => {
        set({
          practiceMode: true,
          selectedPathId: pathId,
          practiceStep: 0,
          practicePlaying: false,
          editingNoteIndex: null,
          suggestions: [],
        })
      },

      exitPracticeMode: () => {
        if (practiceTimerId) {
          clearTimeout(practiceTimerId)
          practiceTimerId = null
        }
        audio.stop()
        set({
          practiceMode: false,
          practiceStep: 0,
          practicePlaying: false,
        })
      },

      setPracticeTempo: (bpm) => {
        set({ practiceTempo: Math.max(40, Math.min(240, bpm)) })
      },

      advancePracticeStep: () => {
        const { selectedPathId, paths, practiceStep } = get()
        const path = paths.find((p) => p.id === selectedPathId)
        if (!path) return

        if (practiceStep < path.notes.length - 1) {
          const nextStep = practiceStep + 1
          set({ practiceStep: nextStep })
          // Play the note at the new step
          const note = path.notes[nextStep]
          if (note) {
            audio.playNote(noteToFrequency(note.note), 0.5)
          }
        } else {
          // Reached the end — stop playback
          if (practiceTimerId) {
            clearTimeout(practiceTimerId)
            practiceTimerId = null
          }
          set({ practicePlaying: false })
        }
      },

      previousPracticeStep: () => {
        const { practiceStep } = get()
        if (practiceStep > 0) {
          const prevStep = practiceStep - 1
          set({ practiceStep: prevStep })

          const { selectedPathId, paths } = get()
          const path = paths.find((p) => p.id === selectedPathId)
          if (path && path.notes[prevStep]) {
            audio.playNote(noteToFrequency(path.notes[prevStep].note), 0.5)
          }
        }
      },

      resetPracticeStep: () => {
        if (practiceTimerId) {
          clearTimeout(practiceTimerId)
          practiceTimerId = null
        }
        set({ practiceStep: 0, practicePlaying: false })
      },

      startPracticePlayback: () => {
        const { selectedPathId, paths, practiceTempo } = get()
        const path = paths.find((p) => p.id === selectedPathId)
        if (!path) return

        set({ practicePlaying: true, practiceStep: 0 })

        // Play first note immediately
        const firstNote = path.notes[0]
        if (firstNote) {
          audio.playNote(noteToFrequency(firstNote.note), 0.5)
        }

        // Schedule subsequent notes
        const intervalMs = (60 / practiceTempo) * 1000

        const scheduleNext = (step: number) => {
          practiceTimerId = setTimeout(() => {
            const currentState = get()
            if (!currentState.practicePlaying) return

            if (step < path.notes.length) {
              set({ practiceStep: step })
              const note = path.notes[step]
              if (note) {
                audio.playNote(noteToFrequency(note.note), 0.5)
              }
              scheduleNext(step + 1)
            } else {
              set({ practicePlaying: false })
              practiceTimerId = null
            }
          }, intervalMs)
        }

        scheduleNext(1)
      },

      stopPracticePlayback: () => {
        if (practiceTimerId) {
          clearTimeout(practiceTimerId)
          practiceTimerId = null
        }
        audio.stop()
        set({ practicePlaying: false })
      },

      // -----------------------------------------------------------------------
      // Audio
      // -----------------------------------------------------------------------

      playPath: (pathId) => {
        const { paths } = get()
        const path = paths.find((p) => p.id === pathId)
        if (!path || path.notes.length === 0) return

        // Play notes in sequence with setTimeout
        path.notes.forEach((melodyNote, index) => {
          setTimeout(() => {
            audio.playNote(noteToFrequency(melodyNote.note), 0.5)
          }, index * 400) // 400ms between notes (~150 BPM)
        })
      },

      playNote: (note) => {
        audio.playNote(noteToFrequency(note), 0.5)
      },

      stopAudio: () => {
        audio.stop()
      },
    }))

    return store
  },

  halt: async () => {},
})
