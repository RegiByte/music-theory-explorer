import { defineResource } from 'braided'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Genre, Note, ScaleType } from '@/schemas'

// ---------------------------------------------------------------------------
// Domain-specific saved item payloads
// ---------------------------------------------------------------------------

export interface SavedProgression {
  key: Note
  scaleType: ScaleType
  genre: Genre
  chords: string[] // chord IDs in order, e.g. ["Dm", "Bb", "F", "C"]
}

export interface SavedScale {
  root: Note
  scaleType: ScaleType
}

// ---------------------------------------------------------------------------
// Generic saved item wrapper
// ---------------------------------------------------------------------------

export interface SavedItem<T = unknown> {
  id: string
  name: string
  savedAt: number // epoch ms
  data: T
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface FavoritesState {
  progressions: SavedItem<SavedProgression>[]
  scales: SavedItem<SavedScale>[]
}

interface FavoritesActions {
  // Progressions
  saveProgression: (name: string, data: SavedProgression) => string
  removeProgression: (id: string) => void
  renameProgression: (id: string, name: string) => void

  // Scales
  saveScale: (data: SavedScale) => string
  removeScale: (id: string) => void
  isScaleFavorited: (root: Note, scaleType: ScaleType) => boolean
  toggleScale: (root: Note, scaleType: ScaleType) => void
}

type FavoritesStore = FavoritesState & FavoritesActions

export type FavoritesStoreApi = StoreApi<FavoritesStore>

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'music-theory-explorer-favorites'

function loadFromStorage(): FavoritesState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { progressions: [], scales: [] }
    const parsed = JSON.parse(raw)
    return {
      progressions: Array.isArray(parsed.progressions)
        ? parsed.progressions
        : [],
      scales: Array.isArray(parsed.scales) ? parsed.scales : [],
    }
  } catch {
    return { progressions: [], scales: [] }
  }
}

function persistToStorage(state: FavoritesState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        progressions: state.progressions,
        scales: state.scales,
      }),
    )
  } catch (e) {
    console.warn('Failed to persist favorites:', e)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function scaleLabel(root: Note, scaleType: ScaleType): string {
  const typeLabel = scaleType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return `${root} ${typeLabel}`
}

// ---------------------------------------------------------------------------
// Resource
// ---------------------------------------------------------------------------

export const favoritesResource = defineResource({
  start: () => {
    const initial = loadFromStorage()

    const store = createStore<FavoritesStore>((set, get) => ({
      ...initial,

      // --- Progressions ---

      saveProgression: (name, data) => {
        const id = generateId()
        const item: SavedItem<SavedProgression> = {
          id,
          name,
          savedAt: Date.now(),
          data,
        }
        set((s) => {
          const next = { progressions: [item, ...s.progressions] }
          persistToStorage({ ...s, ...next })
          return next
        })
        return id
      },

      removeProgression: (id) => {
        set((s) => {
          const next = {
            progressions: s.progressions.filter((p) => p.id !== id),
          }
          persistToStorage({ ...s, ...next })
          return next
        })
      },

      renameProgression: (id, name) => {
        set((s) => {
          const next = {
            progressions: s.progressions.map((p) =>
              p.id === id ? { ...p, name } : p,
            ),
          }
          persistToStorage({ ...s, ...next })
          return next
        })
      },

      // --- Scales ---

      saveScale: (data) => {
        const id = generateId()
        const item: SavedItem<SavedScale> = {
          id,
          name: scaleLabel(data.root, data.scaleType),
          savedAt: Date.now(),
          data,
        }
        set((s) => {
          const next = { scales: [item, ...s.scales] }
          persistToStorage({ ...s, ...next })
          return next
        })
        return id
      },

      removeScale: (id) => {
        set((s) => {
          const next = { scales: s.scales.filter((sc) => sc.id !== id) }
          persistToStorage({ ...s, ...next })
          return next
        })
      },

      isScaleFavorited: (root, scaleType) => {
        return get().scales.some(
          (s) => s.data.root === root && s.data.scaleType === scaleType,
        )
      },

      toggleScale: (root, scaleType) => {
        const state = get()
        const existing = state.scales.find(
          (s) => s.data.root === root && s.data.scaleType === scaleType,
        )
        if (existing) {
          state.removeScale(existing.id)
        } else {
          state.saveScale({ root, scaleType })
        }
      },
    }))

    return store
  },

  halt: async () => {},
})
