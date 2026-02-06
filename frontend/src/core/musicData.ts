/**
 * musicData.ts — Consolidated display names and groupings for musical concepts.
 *
 * Single source of truth for:
 *  - Scale display names & groups (was in ScaleExplorer, MelodyExplorerRoot)
 *  - Chord quality display names (was in ChordVoicingFinder, MelodyExplorerRoot)
 *  - Genre display names & colors (was in 4 DataInsights files + genreCategorizer)
 */

import type { ScaleType, ChordQuality, Genre } from '@/schemas'

// ---------------------------------------------------------------------------
// Scale display names — canonical human-readable name for every ScaleType
// ---------------------------------------------------------------------------

export const SCALE_DISPLAY_NAMES: Record<ScaleType, string> = {
  // Major family
  major: 'Major',
  lydian: 'Lydian',
  mixolydian: 'Mixolydian',
  major_bebop: 'Major Bebop',

  // Minor family
  minor: 'Natural Minor',
  dorian: 'Dorian',
  phrygian: 'Phrygian',
  locrian: 'Locrian',
  minor_bebop: 'Minor Bebop',

  // Harmonic minor and modes
  harmonic_minor: 'Harmonic Minor',
  phrygian_dominant: 'Phrygian Dominant',
  locrian_natural6: 'Locrian ♮6',
  ionian_augmented: 'Ionian Augmented',

  // Melodic minor and modes (jazz)
  melodic_minor: 'Melodic Minor',
  melodic_minor_mode2_dorian_b2: 'Dorian ♭2 (Phrygian #6)',
  melodic_minor_mode3_lydian_aug: 'Lydian Augmented',
  melodic_minor_mode4_lydian_dominant: 'Lydian Dominant',
  melodic_minor_mode5_mixolydian_b6: 'Mixolydian ♭6',
  melodic_minor_mode6_locrian_n2: 'Locrian ♮2',
  melodic_minor_mode7_altered: 'Altered (Super Locrian)',

  // Symmetric scales
  whole_tone: 'Whole Tone',
  diminished_half_whole: 'Diminished (H-W)',
  diminished_whole_half: 'Diminished (W-H)',

  // Exotic / World scales
  hungarian_minor: 'Hungarian Minor',
  double_harmonic_major: 'Double Harmonic Major (Byzantine)',
  neapolitan_minor: 'Neapolitan Minor',
  neapolitan_major: 'Neapolitan Major',

  // Pentatonic scales
  pentatonic_major: 'Major Pentatonic',
  pentatonic_minor: 'Minor Pentatonic',
  pentatonic_suspended: 'Suspended Pentatonic',
  in_sen: 'In Sen',
  hirajoshi: 'Hirajoshi',
  iwato: 'Iwato',

  // Blues
  blues: 'Blues',
}

// ---------------------------------------------------------------------------
// Scale groups — three tiers of grouping for different contexts
// ---------------------------------------------------------------------------

export type ScaleGroupTier = 'minimal' | 'common' | 'full'

export interface ScaleGroupEntry {
  value: ScaleType
  label: string
}

export interface ScaleGroup {
  label: string
  scales: ScaleGroupEntry[]
}

/** Full grouped list — all 30+ scales organized by family */
const FULL_SCALE_GROUPS: ScaleGroup[] = [
  {
    label: 'Common',
    scales: [
      { value: 'major', label: 'Major' },
      { value: 'minor', label: 'Natural Minor' },
      { value: 'pentatonic_major', label: 'Pentatonic Major' },
      { value: 'pentatonic_minor', label: 'Pentatonic Minor' },
      { value: 'blues', label: 'Blues' },
    ],
  },
  {
    label: 'Modes',
    scales: [
      { value: 'dorian', label: 'Dorian' },
      { value: 'phrygian', label: 'Phrygian' },
      { value: 'lydian', label: 'Lydian' },
      { value: 'mixolydian', label: 'Mixolydian' },
      { value: 'locrian', label: 'Locrian' },
    ],
  },
  {
    label: 'Harmonic Minor',
    scales: [
      { value: 'harmonic_minor', label: 'Harmonic Minor' },
      { value: 'phrygian_dominant', label: 'Phrygian Dominant' },
      { value: 'locrian_natural6', label: 'Locrian ♮6' },
      { value: 'ionian_augmented', label: 'Ionian Augmented' },
    ],
  },
  {
    label: 'Melodic Minor',
    scales: [
      { value: 'melodic_minor', label: 'Melodic Minor' },
      { value: 'melodic_minor_mode4_lydian_dominant', label: 'Lydian Dominant' },
      { value: 'melodic_minor_mode7_altered', label: 'Altered' },
      { value: 'melodic_minor_mode2_dorian_b2', label: 'Dorian ♭2' },
      { value: 'melodic_minor_mode3_lydian_aug', label: 'Lydian Augmented' },
      { value: 'melodic_minor_mode5_mixolydian_b6', label: 'Mixolydian ♭6' },
      { value: 'melodic_minor_mode6_locrian_n2', label: 'Locrian ♮2' },
    ],
  },
  {
    label: 'Pentatonic & World',
    scales: [
      { value: 'pentatonic_suspended', label: 'Suspended Pentatonic' },
      { value: 'in_sen', label: 'In Sen' },
      { value: 'hirajoshi', label: 'Hirajoshi' },
      { value: 'iwato', label: 'Iwato' },
      { value: 'hungarian_minor', label: 'Hungarian Minor' },
      { value: 'double_harmonic_major', label: 'Double Harmonic' },
      { value: 'neapolitan_minor', label: 'Neapolitan Minor' },
      { value: 'neapolitan_major', label: 'Neapolitan Major' },
    ],
  },
  {
    label: 'Symmetric',
    scales: [
      { value: 'whole_tone', label: 'Whole Tone' },
      { value: 'diminished_half_whole', label: 'Diminished (H-W)' },
      { value: 'diminished_whole_half', label: 'Diminished (W-H)' },
    ],
  },
  {
    label: 'Bebop',
    scales: [
      { value: 'major_bebop', label: 'Major Bebop' },
      { value: 'minor_bebop', label: 'Minor Bebop' },
    ],
  },
]

/**
 * Get scale groups for a given tier.
 * - 'minimal': Major/Minor only (ProgressionExplorer, ProgressionBuilder)
 * - 'common': Major, Minor, Dorian, Mixolydian, Pentatonics, Blues
 * - 'full': All scales organized by family (MelodyExplorer)
 */
export function getScaleGroups(tier: ScaleGroupTier): ScaleGroup[] {
  switch (tier) {
    case 'minimal':
      return [
        {
          label: 'Scale',
          scales: [
            { value: 'major', label: 'Major' },
            { value: 'minor', label: 'Minor' },
          ],
        },
      ]
    case 'common':
      return [
        {
          label: 'Common',
          scales: [
            { value: 'major', label: 'Major' },
            { value: 'minor', label: 'Natural Minor' },
            { value: 'dorian', label: 'Dorian' },
            { value: 'mixolydian', label: 'Mixolydian' },
            { value: 'pentatonic_major', label: 'Pentatonic Maj' },
            { value: 'pentatonic_minor', label: 'Pentatonic Min' },
            { value: 'blues', label: 'Blues' },
          ],
        },
      ]
    case 'full':
      return FULL_SCALE_GROUPS
  }
}

// ---------------------------------------------------------------------------
// Chord quality display names
// ---------------------------------------------------------------------------

/** Full display names for all chord qualities */
export const CHORD_QUALITY_DISPLAY: Record<ChordQuality, string> = {
  major: 'Major',
  minor: 'Minor',
  diminished: 'Diminished',
  augmented: 'Augmented',
  major7: 'Major 7th',
  minor7: 'Minor 7th',
  dominant7: 'Dominant 7th',
  diminished7: 'Diminished 7th',
  half_diminished7: 'Half Dim 7th',
  sus2: 'Sus 2',
  sus4: 'Sus 4',
}

/** Short display names — compact pill labels */
export const CHORD_QUALITY_SHORT: Record<ChordQuality, string> = {
  major: 'Maj',
  minor: 'Min',
  diminished: 'Dim',
  augmented: 'Aug',
  major7: 'Maj7',
  minor7: 'Min7',
  dominant7: '7',
  diminished7: 'Dim7',
  half_diminished7: 'ø7',
  sus2: 'Sus2',
  sus4: 'Sus4',
}

// ---------------------------------------------------------------------------
// Genre display names & colors
// ---------------------------------------------------------------------------

/** Human-readable genre labels */
export const GENRE_DISPLAY: Record<Genre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  country: 'Country',
  punk: 'Punk',
  alternative: 'Alternative',
  'pop rock': 'Pop Rock',
  rap: 'Rap',
  metal: 'Metal',
  soul: 'Soul',
}

/** All genres in display order */
export const ALL_GENRES: Genre[] = [
  'pop', 'rock', 'country', 'punk', 'alternative', 'pop rock', 'rap', 'metal', 'soul',
]

/** Per-genre colors — solid for pills/borders, translucent for backgrounds */
export const GENRE_COLORS: Record<Genre, { solid: string; bg: string }> = {
  pop:         { solid: 'rgb(239, 68, 68)',   bg: 'rgba(239, 68, 68, 0.15)' },
  rock:        { solid: 'rgb(59, 130, 246)',   bg: 'rgba(59, 130, 246, 0.15)' },
  country:     { solid: 'rgb(234, 179, 8)',    bg: 'rgba(234, 179, 8, 0.15)' },
  punk:        { solid: 'rgb(16, 185, 129)',   bg: 'rgba(16, 185, 129, 0.15)' },
  alternative: { solid: 'rgb(168, 85, 247)',   bg: 'rgba(168, 85, 247, 0.15)' },
  'pop rock':  { solid: 'rgb(249, 115, 22)',   bg: 'rgba(249, 115, 22, 0.15)' },
  rap:         { solid: 'rgb(20, 184, 166)',    bg: 'rgba(20, 184, 166, 0.15)' },
  metal:       { solid: 'rgb(107, 114, 128)',  bg: 'rgba(107, 114, 128, 0.15)' },
  soul:        { solid: 'rgb(236, 72, 153)',   bg: 'rgba(236, 72, 153, 0.15)' },
}

/** Tailwind-friendly class pairs for genre pills (active state) */
export const GENRE_PILL_CLASSES: Record<Genre, string> = {
  pop:         'bg-red-500 text-white',
  rock:        'bg-blue-500 text-white',
  country:     'bg-yellow-500 text-white',
  punk:        'bg-emerald-500 text-white',
  alternative: 'bg-purple-500 text-white',
  'pop rock':  'bg-orange-500 text-white',
  rap:         'bg-teal-500 text-white',
  metal:       'bg-gray-500 text-white',
  soul:        'bg-pink-500 text-white',
}
