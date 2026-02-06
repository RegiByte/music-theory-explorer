/**
 * Enharmonic equivalence utilities.
 * 
 * In music, some notes have two names: A# and Bb are the same pitch.
 * This module provides the canonical mapping between sharp and flat forms,
 * display preference logic, and enharmonic-aware comparison.
 * 
 * Internal convention: CHROMATIC array uses sharps as the canonical form.
 * Display: user can toggle between sharps, flats, or auto (key-based).
 */
import type { Note } from '@/schemas'

// --- Notation preference type ---

export type NotationPreference = 'sharp' | 'flat' | 'auto'

// --- Enharmonic mappings ---

const FLAT_TO_SHARP: Record<string, string> = {
  'Bb': 'A#',
  'Db': 'C#',
  'Eb': 'D#',
  'Gb': 'F#',
  'Ab': 'G#',
}

const SHARP_TO_FLAT: Record<string, string> = {
  'A#': 'Bb',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
}

/**
 * Keys that conventionally use flat notation.
 * These are keys on the "flat side" of the circle of fifths.
 * Includes both major and relative minor keys.
 */
const FLAT_MAJOR_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])
const FLAT_MINOR_KEYS = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb'])
// Note: D minor and G minor use flats (key signature has flats)
// C minor has 3 flats, F minor has 4 flats

// --- Core conversion functions ---

/**
 * Convert a note to its sharp equivalent.
 * Natural notes and already-sharp notes pass through unchanged.
 * 
 * Examples: Bb -> A#, Db -> C#, C -> C, F# -> F#
 */
export function toSharp(note: Note): Note {
  return (FLAT_TO_SHARP[note] ?? note) as Note
}

/**
 * Convert a note to its flat equivalent.
 * Natural notes and already-flat notes pass through unchanged.
 * 
 * Examples: A# -> Bb, C# -> Db, C -> C, Bb -> Bb
 */
export function toFlat(note: Note): Note {
  return (SHARP_TO_FLAT[note] ?? note) as Note
}

/**
 * Get the canonical (sharp) form of a note.
 * This is what we use for internal indexing and comparison.
 * 
 * Examples: Bb -> A#, C -> C, F# -> F#
 */
export function canonicalNote(note: Note): Note {
  return toSharp(note)
}

/**
 * Check if two notes are enharmonically equivalent.
 * 
 * Examples: enharmonicEqual('A#', 'Bb') -> true
 *          enharmonicEqual('C', 'C') -> true
 *          enharmonicEqual('C', 'D') -> false
 */
export function enharmonicEqual(a: Note, b: Note): boolean {
  return canonicalNote(a) === canonicalNote(b)
}

// --- Display functions ---

/**
 * Determine the preferred notation for a given key.
 * 
 * Based on music theory convention:
 * - F major, Bb major, Eb major, Ab major, Db major, Gb major -> flats
 * - G major, D major, A major, E major, B major, F# major, C# major -> sharps
 * - C major -> sharps (convention)
 */
export function getPreferredNotation(key: Note, scaleType?: string): 'sharp' | 'flat' {
  const canonical = canonicalNote(key)
  
  if (scaleType === 'minor') {
    // For minor keys, check the flat minor keys set
    // We check both the original and canonical forms
    if (FLAT_MINOR_KEYS.has(key) || FLAT_MINOR_KEYS.has(canonical)) {
      return 'flat'
    }
    return 'sharp'
  }
  
  // For major keys (or unspecified)
  if (FLAT_MAJOR_KEYS.has(key) || FLAT_MAJOR_KEYS.has(canonical)) {
    return 'flat'
  }
  return 'sharp'
}

/**
 * Display a note according to the user's notation preference.
 * 
 * - 'sharp': always use sharps (A#, C#, D#, F#, G#)
 * - 'flat': always use flats (Bb, Db, Eb, Gb, Ab)
 * - 'auto': use the musically conventional notation for the given key
 */
export function displayNote(
  note: Note,
  preference: NotationPreference,
  key?: Note,
  scaleType?: string
): Note {
  if (preference === 'sharp') return toSharp(note)
  if (preference === 'flat') return toFlat(note)
  
  // Auto mode: determine from key
  const effectivePref = key ? getPreferredNotation(key, scaleType) : 'sharp'
  return effectivePref === 'flat' ? toFlat(note) : toSharp(note)
}

// --- Chord ID utilities ---

/**
 * Extract the root note portion from a chord ID string.
 * Returns [rootNote, remainder] or null if parsing fails.
 * 
 * Examples:
 *   "Bbm7" -> ["Bb", "m7"]
 *   "C#dim" -> ["C#", "dim"]
 *   "Am" -> ["A", "m"]
 *   "G" -> ["G", ""]
 */
function splitChordRoot(chordId: string): [string, string] | null {
  // Try 2-character root first (sharps and flats)
  if (chordId.length >= 2) {
    const twoChar = chordId.substring(0, 2)
    if (twoChar[1] === '#' || twoChar[1] === 'b') {
      if (/^[A-G]/.test(twoChar)) {
        return [twoChar, chordId.substring(2)]
      }
    }
  }
  // Try 1-character root
  if (chordId.length >= 1 && /^[A-G]/.test(chordId)) {
    return [chordId[0], chordId.substring(1)]
  }
  return null
}

/**
 * Normalize a chord ID to its canonical (sharp) form.
 * 
 * Examples: "Bbm" -> "A#m", "Ebmaj7" -> "D#maj7", "Am" -> "Am"
 */
export function normalizeChordId(chordId: string): string {
  const parts = splitChordRoot(chordId)
  if (!parts) return chordId
  const [root, suffix] = parts
  const canonical = FLAT_TO_SHARP[root]
  if (canonical) return `${canonical}${suffix}`
  return chordId
}

/**
 * Convert a chord ID to display form based on notation preference.
 * 
 * Examples with 'flat' preference:
 *   "A#m" -> "Bbm"
 *   "C#7" -> "Db7"
 *   "Am" -> "Am" (no change, A has no flat equivalent)
 */
export function displayChordId(
  chordId: string,
  preference: NotationPreference,
  key?: Note,
  scaleType?: string
): string {
  const parts = splitChordRoot(chordId)
  if (!parts) return chordId
  const [root, suffix] = parts
  
  const displayRoot = displayNote(root as Note, preference, key, scaleType)
  return `${displayRoot}${suffix}`
}

/**
 * Check if two chord IDs are enharmonically equivalent.
 * 
 * Examples: enharmonicChordEqual("Bbm", "A#m") -> true
 *          enharmonicChordEqual("C", "C") -> true
 *          enharmonicChordEqual("Cm", "C") -> false (different quality)
 */
export function enharmonicChordEqual(a: string, b: string): boolean {
  return normalizeChordId(a) === normalizeChordId(b)
}
