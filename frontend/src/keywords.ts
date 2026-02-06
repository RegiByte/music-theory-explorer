// Musical note names
export const NOTES = {
  A: 'A',
  A_SHARP: 'A#',
  B: 'B',
  C: 'C',
  C_SHARP: 'C#',
  D: 'D',
  D_SHARP: 'D#',
  E: 'E',
  F: 'F',
  F_SHARP: 'F#',
  G: 'G',
  G_SHARP: 'G#',
} as const

// Chromatic scale - sharp form (canonical, used for indexing)
export const CHROMATIC = [
  'A',
  'A#',
  'B',
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
] as const

// Chromatic scale - flat form (used for display when preference is 'flat')
export const CHROMATIC_FLATS = [
  'A',
  'Bb',
  'B',
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
] as const

// Interval names
export const INTERVALS = {
  UNISON: 'Unison',
  MINOR_2ND: 'Minor 2nd',
  MAJOR_2ND: 'Major 2nd',
  MINOR_3RD: 'Minor 3rd',
  MAJOR_3RD: 'Major 3rd',
  PERFECT_4TH: 'Perfect 4th',
  TRITONE: 'Tritone',
  PERFECT_5TH: 'Perfect 5th',
  MINOR_6TH: 'Minor 6th',
  MAJOR_6TH: 'Major 6th',
  MINOR_7TH: 'Minor 7th',
  MAJOR_7TH: 'Major 7th',
  OCTAVE: 'Octave',
} as const

// Scale types
export const SCALE_TYPES = {
  // Major family
  MAJOR: 'major',
  LYDIAN: 'lydian',
  MIXOLYDIAN: 'mixolydian',
  MAJOR_BEBOP: 'major_bebop',
  
  // Minor family
  MINOR: 'minor',
  DORIAN: 'dorian',
  PHRYGIAN: 'phrygian',
  LOCRIAN: 'locrian',
  MINOR_BEBOP: 'minor_bebop',
  
  // Harmonic minor and modes
  HARMONIC_MINOR: 'harmonic_minor',
  PHRYGIAN_DOMINANT: 'phrygian_dominant',
  LOCRIAN_NATURAL6: 'locrian_natural6',
  IONIAN_AUGMENTED: 'ionian_augmented',
  
  // Melodic minor and modes (jazz)
  MELODIC_MINOR: 'melodic_minor',
  MELODIC_MINOR_MODE2_DORIAN_B2: 'melodic_minor_mode2_dorian_b2',
  MELODIC_MINOR_MODE3_LYDIAN_AUG: 'melodic_minor_mode3_lydian_aug',
  MELODIC_MINOR_MODE4_LYDIAN_DOMINANT: 'melodic_minor_mode4_lydian_dominant',
  MELODIC_MINOR_MODE5_MIXOLYDIAN_B6: 'melodic_minor_mode5_mixolydian_b6',
  MELODIC_MINOR_MODE6_LOCRIAN_N2: 'melodic_minor_mode6_locrian_n2',
  MELODIC_MINOR_MODE7_ALTERED: 'melodic_minor_mode7_altered',
  
  // Symmetric scales
  WHOLE_TONE: 'whole_tone',
  DIMINISHED_HALF_WHOLE: 'diminished_half_whole',
  DIMINISHED_WHOLE_HALF: 'diminished_whole_half',
  
  // Exotic / World scales
  HUNGARIAN_MINOR: 'hungarian_minor',
  DOUBLE_HARMONIC_MAJOR: 'double_harmonic_major',
  NEAPOLITAN_MINOR: 'neapolitan_minor',
  NEAPOLITAN_MAJOR: 'neapolitan_major',
  
  // Pentatonic scales
  PENTATONIC_MAJOR: 'pentatonic_major',
  PENTATONIC_MINOR: 'pentatonic_minor',
  PENTATONIC_SUSPENDED: 'pentatonic_suspended',
  IN_SEN: 'in_sen',
  HIRAJOSHI: 'hirajoshi',
  IWATO: 'iwato',
  
  // Blues
  BLUES: 'blues',
} as const

// Chord qualities
export const CHORD_QUALITIES = {
  MAJOR: 'major',
  MINOR: 'minor',
  DIMINISHED: 'diminished',
  AUGMENTED: 'augmented',
  MAJOR_7: 'major7',
  MINOR_7: 'minor7',
  DOMINANT_7: 'dominant7',
  DIMINISHED_7: 'diminished7',
  HALF_DIMINISHED_7: 'half_diminished7',
  SUS2: 'sus2',
  SUS4: 'sus4',
} as const

// Ukulele strings (standard tuning)
export const UKULELE_STRINGS = {
  G: 'G',
  C: 'C',
  E: 'E',
  A: 'A',
} as const

// Roman numerals for chord degrees
export const ROMAN_NUMERALS = {
  I: 'I',
  II: 'II',
  III: 'III',
  IV: 'IV',
  V: 'V',
  VI: 'VI',
  VII: 'VII',
} as const
