// Reference frequencies (Hz)
export const A4_FREQUENCY = 440
export const C4_FREQUENCY = 261.63

// Musical constants
export const SEMITONES_PER_OCTAVE = 12
export const CENTS_PER_OCTAVE = 1200
export const CENTS_PER_SEMITONE = 100

// Tuning thresholds (cents)
export const CENTS_BARELY_NOTICEABLE = 5
export const CENTS_CLEARLY_OFF = 20
export const CENTS_ACCEPTABLE_RANGE = 10

// Scale patterns (semitone intervals from root)
export const SCALE_PATTERNS = {
  // Major family
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  major_bebop: [0, 2, 4, 5, 7, 8, 9, 11],
  
  // Minor family
  minor: [0, 2, 3, 5, 7, 8, 10], // Natural minor / Aeolian
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  minor_bebop: [0, 2, 3, 5, 7, 8, 9, 10],
  
  // Harmonic minor and modes
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  phrygian_dominant: [0, 1, 4, 5, 7, 8, 10], // Harmonic minor mode 5
  locrian_natural6: [0, 1, 3, 5, 6, 9, 10], // Harmonic minor mode 2
  ionian_augmented: [0, 2, 4, 5, 8, 9, 11], // Harmonic minor mode 3
  
  // Melodic minor and modes (jazz)
  melodic_minor: [0, 2, 3, 5, 7, 9, 11],
  melodic_minor_mode2_dorian_b2: [0, 1, 3, 5, 7, 9, 10], // Phrygian #6
  melodic_minor_mode3_lydian_aug: [0, 2, 4, 6, 8, 9, 11],
  melodic_minor_mode4_lydian_dominant: [0, 2, 4, 6, 7, 9, 10], // Jazzy dominant
  melodic_minor_mode5_mixolydian_b6: [0, 2, 4, 5, 7, 8, 10],
  melodic_minor_mode6_locrian_n2: [0, 2, 3, 5, 6, 8, 10], // Half-diminished bright
  melodic_minor_mode7_altered: [0, 1, 3, 4, 6, 8, 10], // Super locrian / V7alt
  
  // Symmetric scales
  whole_tone: [0, 2, 4, 6, 8, 10],
  diminished_half_whole: [0, 1, 3, 4, 6, 7, 9, 10], // For dominant chords
  diminished_whole_half: [0, 2, 3, 5, 6, 8, 9, 11], // For diminished chords
  
  // Exotic / World scales
  hungarian_minor: [0, 2, 3, 6, 7, 8, 11],
  double_harmonic_major: [0, 1, 4, 5, 7, 8, 11], // Byzantine
  neapolitan_minor: [0, 1, 3, 5, 7, 8, 11],
  neapolitan_major: [0, 1, 3, 5, 7, 9, 11],
  
  // Pentatonic scales
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
  pentatonic_suspended: [0, 2, 5, 7, 10],
  in_sen: [0, 1, 5, 7, 10], // Japanese
  hirajoshi: [0, 2, 3, 7, 8], // Japanese
  iwato: [0, 1, 5, 6, 10], // Japanese
  
  // Blues
  blues: [0, 3, 5, 6, 7, 10],
} as const

// Chord patterns (semitone intervals from root)
export const CHORD_PATTERNS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  diminished7: [0, 3, 6, 9],
  half_diminished7: [0, 3, 6, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
} as const

// Consonance scores for intervals (0-1, higher = more consonant)
export const CONSONANCE_SCORES: Record<number, number> = {
  0: 1.0, // Unison - perfect
  1: 0.1, // Minor 2nd - very dissonant
  2: 0.4, // Major 2nd - mildly dissonant
  3: 0.6, // Minor 3rd - mildly consonant
  4: 0.8, // Major 3rd - consonant
  5: 0.9, // Perfect 4th - very consonant
  6: 0.2, // Tritone - dissonant
  7: 0.95, // Perfect 5th - very consonant
  8: 0.6, // Minor 6th - mildly consonant
  9: 0.7, // Major 6th - consonant
  10: 0.5, // Minor 7th - mildly dissonant
  11: 0.4, // Major 7th - dissonant
  12: 1.0, // Octave - perfect
} as const

// Frequency ratios for perfect intervals
export const PERFECT_INTERVALS = {
  unison: { semitones: 0, ratio: 1 / 1 },
  perfect_4th: { semitones: 5, ratio: 4 / 3 },
  perfect_5th: { semitones: 7, ratio: 3 / 2 },
  octave: { semitones: 12, ratio: 2 / 1 },
  major_3rd: { semitones: 4, ratio: 5 / 4 },
  minor_3rd: { semitones: 3, ratio: 6 / 5 },
} as const

// Ukulele tuning (semitones from C4)
export const UKULELE_TUNING = {
  G: 7, // G4 (re-entrant tuning - actually G above C, not below)
  C: 0, // C4
  E: 4, // E4
  A: 9, // A4
} as const

// Fretboard constants
export const MAX_FRETS = 12
export const MAX_FRET_SPAN = 4 // Maximum comfortable finger stretch

// Harmonic series constants
export const MAX_HARMONICS = 16
export const HARMONIC_OVERLAP_THRESHOLD = 50 // cents

// Common chord progression templates
export const PROGRESSION_TEMPLATES = {
  classic_cadence: {
    name: 'I-IV-V-I',
    degrees: [1, 4, 5, 1],
    description: 'Classic cadence - the foundation of Western music',
  },
  pop_progression: {
    name: 'I-V-vi-IV',
    degrees: [1, 5, 6, 4],
    description: 'Pop progression - used in countless hit songs',
  },
  jazz_turnaround: {
    name: 'ii-V-I',
    degrees: [2, 5, 1],
    description: 'Jazz turnaround - smooth resolution',
  },
  fifties_progression: {
    name: 'I-vi-IV-V',
    degrees: [1, 6, 4, 5],
    description: '50s progression - Stand By Me, Blue Moon',
  },
  emotional: {
    name: 'vi-IV-I-V',
    degrees: [6, 4, 1, 5],
    description: 'Emotional progression - Let It Be, Apologize',
  },
  andalusian_cadence: {
    name: 'vi-V-IV-III',
    degrees: [6, 5, 4, 3],
    description: 'Andalusian cadence - descending progression',
  },
  circle_of_fifths: {
    name: 'I-IV-vii-iii-vi-ii-V-I',
    degrees: [1, 4, 7, 3, 6, 2, 5, 1],
    description: 'Circle of fifths - complete cycle',
  },
  blues_progression: {
    name: 'I-I-I-I-IV-IV-I-I-V-IV-I-V',
    degrees: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5],
    description: '12-bar blues progression',
  },
  royal_road: {
    name: 'IV-V-iii-vi',
    degrees: [4, 5, 3, 6],
    description: 'Royal road progression - Japanese pop',
  },
  pachelbel_canon: {
    name: 'I-V-vi-iii-IV-I-IV-V',
    degrees: [1, 5, 6, 3, 4, 1, 4, 5],
    description: "Pachelbel's Canon progression",
  },
  
  // Tier 1: Jazz Extensions
  jazz_turnaround_extended: {
    name: 'I-vi-ii-V',
    degrees: [1, 6, 2, 5],
    description: 'Extended jazz turnaround - classic 1950s jazz',
  },
  jazz_minor_turnaround: {
    name: 'i-iv-VII-III',
    degrees: [1, 4, 7, 3],
    description: 'Minor jazz turnaround - modal resolution',
  },
  
  // Tier 1: Short Cadences (Building Blocks)
  plagal_cadence: {
    name: 'IV-I',
    degrees: [4, 1],
    description: 'Plagal cadence - Amen cadence',
  },
  deceptive_cadence: {
    name: 'V-vi',
    degrees: [5, 6],
    description: 'Deceptive cadence - avoided resolution',
  },
  half_cadence: {
    name: 'I-V',
    degrees: [1, 5],
    description: 'Half cadence - open ending',
  },
  
  // Tier 1: Modal Vamps
  dorian_vamp: {
    name: 'i-IV',
    degrees: [1, 4],
    description: 'Dorian vamp - So What, Impressions',
  },
  mixolydian_loop: {
    name: 'I-VII-IV',
    degrees: [1, 7, 4],
    description: 'Mixolydian loop - rock/folk staple',
  },
  lydian_vamp: {
    name: 'I-II',
    degrees: [1, 2],
    description: 'Lydian vamp - bright, floating quality',
  },
  
  // Tier 2: Neo-Soul/R&B
  neo_soul_loop: {
    name: 'iii-vi-ii-V',
    degrees: [3, 6, 2, 5],
    description: 'Neo-soul loop - smooth, jazzy R&B',
  },
  rnb_progression: {
    name: 'vi-ii-V-I',
    degrees: [6, 2, 5, 1],
    description: 'R&B progression - emotional resolution',
  },
  
  // Tier 2: More Modal Progressions
  phrygian_cadence: {
    name: 'i-II',
    degrees: [1, 2],
    description: 'Phrygian cadence - Spanish/flamenco flavor',
  },
  
  // Tier 2: Contemporary Pop
  sad_pop: {
    name: 'i-VI-III-VII',
    degrees: [1, 6, 3, 7],
    description: 'Sad pop progression - Billie Eilish style',
  },
  alt_pop: {
    name: 'vi-V-IV-V',
    degrees: [6, 5, 4, 5],
    description: 'Alternative pop - tension and release',
  },
} as const
