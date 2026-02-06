import { z } from 'zod'

// Note schema - all chromatic notes with both sharp and flat enharmonic spellings
// Internally, sharps are the canonical form (used for indexing).
// Flats are valid display alternatives (Bb = A#, Db = C#, etc.)
export const NoteSchema = z.enum([
  'A',
  'A#',
  'Bb',
  'B',
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
])

// Scale type schema
export const ScaleTypeSchema = z.enum([
  // Major family
  'major',
  'lydian',
  'mixolydian',
  'major_bebop',

  // Minor family
  'minor',
  'dorian',
  'phrygian',
  'locrian',
  'minor_bebop',

  // Harmonic minor and modes
  'harmonic_minor',
  'phrygian_dominant',
  'locrian_natural6',
  'ionian_augmented',

  // Melodic minor and modes (jazz)
  'melodic_minor',
  'melodic_minor_mode2_dorian_b2',
  'melodic_minor_mode3_lydian_aug',
  'melodic_minor_mode4_lydian_dominant',
  'melodic_minor_mode5_mixolydian_b6',
  'melodic_minor_mode6_locrian_n2',
  'melodic_minor_mode7_altered',

  // Symmetric scales
  'whole_tone',
  'diminished_half_whole',
  'diminished_whole_half',

  // Exotic / World scales
  'hungarian_minor',
  'double_harmonic_major',
  'neapolitan_minor',
  'neapolitan_major',

  // Pentatonic scales
  'pentatonic_major',
  'pentatonic_minor',
  'pentatonic_suspended',
  'in_sen',
  'hirajoshi',
  'iwato',

  // Blues
  'blues',
])

// Chord quality schema
export const ChordQualitySchema = z.enum([
  'major',
  'minor',
  'diminished',
  'augmented',
  'major7',
  'minor7',
  'dominant7',
  'diminished7',
  'half_diminished7',
  'sus2',
  'sus4',
])

// Ukulele string schema
export const UkuleleStringSchema = z.enum(['G', 'C', 'E', 'A'])

// Scale schema
export const ScaleSchema = z.object({
  root: NoteSchema,
  type: ScaleTypeSchema,
  notes: z.array(NoteSchema),
  intervals: z.array(z.number()),
})

// Chord schema
export const ChordSchema = z.object({
  root: NoteSchema,
  quality: ChordQualitySchema,
  notes: z.array(NoteSchema),
  intervals: z.array(z.number()),
})

// Fret position schema
export const FretPositionSchema = z.object({
  string: UkuleleStringSchema,
  fret: z.number().min(0).max(12),
  note: NoteSchema,
  frequency: z.number(),
})

// Chord voicing schema
export const ChordVoicingSchema = z.object({
  chord: ChordSchema,
  positions: z.array(FretPositionSchema),
  fretSpan: z.number(),
  difficulty: z.number().min(0).max(10),
  consonance: z.number().min(0).max(1),
  detectedQuality: ChordQualitySchema.optional(),
  metadata: z
    .object({
      minFret: z.number().min(0).max(12),
      maxFret: z.number().min(0).max(12),
    })
    .optional(),
})

// Interval schema
export const IntervalSchema = z.object({
  semitones: z.number(),
  name: z.string(),
  ratio: z.number(),
  cents: z.number(),
  consonance: z.number().min(0).max(1),
})

// Melody note schema
export const MelodyNoteSchema = z.object({
  note: NoteSchema,
  duration: z.number(),
  frequency: z.number(),
})

// Melody schema
export const MelodySchema = z.object({
  notes: z.array(MelodyNoteSchema),
  scale: ScaleSchema,
  chord: ChordSchema.optional(),
  analysis: z
    .object({
      stepPercentage: z.number(),
      chordTonePercentage: z.number(),
      tensionProfile: z.array(z.number()),
    })
    .optional(),
})

// Progression chord - extends DiatonicChord with ID
export const ProgressionChordSchema = z.object({
  id: z.string(),
  degree: z.number().min(1).max(7),
  romanNumeral: z.string(),
  root: NoteSchema,
  quality: ChordQualitySchema,
  chord: ChordSchema,
})

// Progression template
export const ProgressionTemplateSchema = z.object({
  name: z.string(),
  degrees: z.array(z.number()),
  description: z.string().optional(),
})

// Melody note with mute capability (for MelodyComposer)
export const MelodyNoteWithMuteSchema = z.object({
  id: z.string(),
  note: NoteSchema,
  isChordTone: z.boolean(),
  isStrongBeat: z.boolean(),
  muted: z.boolean(),
})

// Harmonic function (for progression map)
export const HarmonicFunctionSchema = z.enum([
  'tonic',
  'subdominant',
  'dominant',
])

// Chord category (for progression map)
export const ChordCategorySchema = z.enum([
  'diatonic',
  'secondary-dominant',
  'diminished-passing',
  'borrowed',
])

// Progression node - represents a chord in the progression map
export const ProgressionNodeSchema = z.object({
  id: z.string(), // e.g., "C", "Dm", "A7"
  chord: ChordSchema,
  romanNumeral: z.string(), // "I", "ii", "V/ii", etc.
  function: HarmonicFunctionSchema,
  category: ChordCategorySchema,
  extensions: z.array(z.string()), // ['7', '9', 'sus4']
})

// Progression edge - represents a transition between chords
export const ProgressionEdgeSchema = z.object({
  from: z.string(), // Node ID
  to: z.string(), // Node ID
  strength: z.number().min(0).max(1),
})

// Progression map - the full graph of chord relationships
export const ProgressionMapSchema = z.object({
  key: NoteSchema,
  scaleType: ScaleTypeSchema,
  nodes: z.array(ProgressionNodeSchema),
  edges: z.array(ProgressionEdgeSchema),
})

// Harmonic movement type (for DAG edges)
export const HarmonicMovementSchema = z.enum([
  'to-tonic',
  'to-subdominant',
  'to-dominant',
])

// Trunk-based exploration types
export const TrunkNodeSchema = z.object({
  id: z.string(), // Unique: "trunk-0-depth-2-Dm"
  chordId: z.string(), // "C", "Dm", "G", etc.
  trunkId: z.number(), // 0, 1, 2 (trunk index), -1 for root
  depth: z.number(), // 0 = root, 1 = trunk head, 2+...
  isLeaf: z.boolean(), // true if current end of trunk
  isRoot: z.boolean(), // true for the root node
  isTrunkHead: z.boolean(), // true for depth 1 nodes
  parentId: z.string().nullable(),
})

export const TrunkEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // TrunkNode.id
  target: z.string(), // TrunkNode.id
  trunkId: z.number(),
  harmonicMovement: HarmonicMovementSchema,
  strength: z.number(),
  isChromatic: z.boolean(),
  matchedProgressions: z.array(z.string()).optional(), // ["ii-V-I", "I-IV-V-I"]
  breakdown: z.any().optional(), // ScoreBreakdown for edge hover
})

export const TrunkStateSchema = z.object({
  nodes: z.array(TrunkNodeSchema),
  edges: z.array(TrunkEdgeSchema),
  activeTrunks: z.number(), // 0-5
  maxTrunks: z.number(), // 5
  topK: z.number(), // 5 (configurable)
})

// Color class taxonomy
export const ColorClassSchema = z.enum([
  'diatonic',
  'secondary_dominant',
  'borrowed',
  'diminished_passing',
  'chromatic_other',
])

// Recommendation category (user goal)
export const RecommendationCategorySchema = z.enum([
  'safe_common',
  'tension_building',
  'exploratory',
  'resolution',
])

// Pattern match detail
export const PatternMatchSchema = z.object({
  key: z.string(),
  mode: z.enum(['prefix', 'contained']),
  windowSize: z.number(),
  score: z.number(),
})

// Pattern match result
export const PatternMatchResultSchema = z.object({
  matches: z.array(PatternMatchSchema),
  rawSum: z.number(),
  maxPerTemplateSum: z.number(),
  confidence: z.number(),
  norm: z.number(),
})

// Genre schema - 9 genres from the trained models
export const GenreSchema = z.enum([
  'pop',
  'rock',
  'country',
  'punk',
  'alternative',
  'pop rock',
  'rap',
  'metal',
  'soul',
])

// Markov transition
export const MarkovTransitionSchema = z.object({
  toChord: z.string(),
  probability: z.number().min(0).max(1),
})

// Pattern from trained model
export const TrainedPatternSchema = z.object({
  chords: z.array(z.string()),
  count: z.number(),
  frequency: z.number(),
  genre: GenreSchema,
})

// Statistical recommendation (from Markov model)
export const StatisticalRecommendationSchema = z.object({
  chord: z.string(),
  probability: z.number(),
  frequency: z.number(), // Overall chord frequency in genre
  friction: z.number(), // 1 - frequency (rarity metric)
})

// Frequency distribution stats for relative rarity labeling
export const FrequencyStatsSchema = z.object({
  min: z.number(),
  max: z.number(),
  mean: z.number(),
  median: z.number(),
  p25: z.number(), // 25th percentile
  p75: z.number(), // 75th percentile
})

// Enhanced score breakdown
export const ScoreBreakdownSchema = z.object({
  // Raw scores
  patternRaw: z.number(),
  patternNorm: z.number(),
  patternConfidence: z.number(),
  transitionStrength: z.number(),

  // New metrics
  colorClass: ColorClassSchema,
  harmonicDistance: z.number(),
  tensionLevel: z.number(),
  tensionDelta: z.number().optional(),

  // Weights applied
  patternWeight: z.number(),
  transitionWeight: z.number(),
  colorBonus: z.number(),

  // Final score
  total: z.number(),

  // Explainability
  matchedProgressions: z.array(z.string()),
  matchDetails: z.array(PatternMatchSchema).optional(),
  category: RecommendationCategorySchema,

  // Statistical metrics (from trained models)
  statisticalProbability: z.number().optional(), // From Markov model
  genreFrequency: z.number().optional(), // Chord frequency in genre
  frictionScore: z.number().optional(), // Rarity metric
  patternMatches: z.array(TrainedPatternSchema).optional(), // Matched patterns from model

  // Contextual score (from pattern-based context matching)
  // Measures how well this chord fits the recent progression history,
  // not just the single previous chord. Higher = better contextual fit.
  contextualScore: z.number().optional(),
})

// Scored candidate with breakdown
export const ScoredCandidateSchema = z.object({
  node: ProgressionNodeSchema,
  breakdown: ScoreBreakdownSchema,
})

// Categorized recommendations
export const CategorizedRecommendationsSchema = z.object({
  safe_common: z.array(ScoredCandidateSchema),
  tension_building: z.array(ScoredCandidateSchema),
  exploratory: z.array(ScoredCandidateSchema),
  resolution: z.array(ScoredCandidateSchema),
})

// Enhanced categorized recommendations with genre + canonical/spicy split
export const GenreCategorizedRecommendationsSchema = z.object({
  genre: GenreSchema,
  canonical: z.array(ScoredCandidateSchema), // Top 50% by probability
  spicy: z.array(ScoredCandidateSchema), // Bottom 50% by probability
  frequencyStats: FrequencyStatsSchema, // Distribution stats for relative rarity
})

// Type inference (no runtime validation needed)
export type Note = z.infer<typeof NoteSchema>
export type ScaleType = z.infer<typeof ScaleTypeSchema>
export type ChordQuality = z.infer<typeof ChordQualitySchema>
export type UkuleleString = z.infer<typeof UkuleleStringSchema>
export type Scale = z.infer<typeof ScaleSchema>
export type Chord = z.infer<typeof ChordSchema>
export type FretPosition = z.infer<typeof FretPositionSchema>
export type ChordVoicing = z.infer<typeof ChordVoicingSchema>
export type Interval = z.infer<typeof IntervalSchema>
export type MelodyNote = z.infer<typeof MelodyNoteSchema>
export type Melody = z.infer<typeof MelodySchema>
export type ProgressionChord = z.infer<typeof ProgressionChordSchema>
export type ProgressionTemplate = z.infer<typeof ProgressionTemplateSchema>
export type MelodyNoteWithMute = z.infer<typeof MelodyNoteWithMuteSchema>
export type HarmonicFunction = z.infer<typeof HarmonicFunctionSchema>
export type ChordCategory = z.infer<typeof ChordCategorySchema>
export type ProgressionNode = z.infer<typeof ProgressionNodeSchema>
export type ProgressionEdge = z.infer<typeof ProgressionEdgeSchema>
export type ProgressionMap = z.infer<typeof ProgressionMapSchema>
export type HarmonicMovement = z.infer<typeof HarmonicMovementSchema>
export type TrunkNode = z.infer<typeof TrunkNodeSchema>
export type TrunkEdge = z.infer<typeof TrunkEdgeSchema>
export type TrunkState = z.infer<typeof TrunkStateSchema>
export type ColorClass = z.infer<typeof ColorClassSchema>
export type RecommendationCategory = z.infer<
  typeof RecommendationCategorySchema
>
export type PatternMatch = z.infer<typeof PatternMatchSchema>
export type PatternMatchResult = z.infer<typeof PatternMatchResultSchema>
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>
export type ScoredCandidate = z.infer<typeof ScoredCandidateSchema>
export type CategorizedRecommendations = z.infer<
  typeof CategorizedRecommendationsSchema
>
export type Genre = z.infer<typeof GenreSchema>
export type MarkovTransition = z.infer<typeof MarkovTransitionSchema>
export type TrainedPattern = z.infer<typeof TrainedPatternSchema>
export type StatisticalRecommendation = z.infer<
  typeof StatisticalRecommendationSchema
>
export type FrequencyStats = z.infer<typeof FrequencyStatsSchema>
export type GenreCategorizedRecommendations = z.infer<
  typeof GenreCategorizedRecommendationsSchema
>
