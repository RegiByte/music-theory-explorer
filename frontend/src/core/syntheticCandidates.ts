import type {
  ScoredCandidate,
  StatisticalRecommendation,
  ProgressionMap,
  ProgressionNode,
  ScoreBreakdown,
  Note,
  ChordQuality,
  Chord,
  HarmonicFunction,
  ScaleType,
} from '@/schemas'
import { generateChord } from '@/core/chords'
import { calculateHarmonicDistance } from '@/core/harmonicDistance'
import { classifyColor } from '@/core/colorClassifier'
import { noteToIndex } from '@/core/musicTheory'
import { getHarmonicFunctionForDegree } from '@/core/progressionMap'
import { normalizeChordId } from '@/core/enharmonic'

// Major scale intervals in semitones from the root (degrees 1-7)
const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
// Minor scale intervals in semitones from the root (degrees 1-7)
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10]

// Roman numerals for major keys (uppercase = major, lowercase = minor)
const MAJOR_ROMAN_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
// Roman numerals for minor keys
const MINOR_ROMAN_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']

// Chromatic roman numeral names (for non-diatonic notes, using flat convention)
// Index = number of semitones above the key root
const CHROMATIC_ROMAN_MAJOR: Record<number, string> = {
  0: 'I',
  1: '♭II',
  2: 'II',
  3: '♭III',
  4: 'III',
  5: 'IV',
  6: '♯IV',
  7: 'V',
  8: '♭VI',
  9: 'VI',
  10: '♭VII',
  11: 'VII',
}
const CHROMATIC_ROMAN_MINOR: Record<number, string> = {
  0: 'i',
  1: '♭II',
  2: 'ii',
  3: 'III',
  4: '♯III',
  5: 'iv',
  6: '♯IV',
  7: 'v',
  8: 'VI',
  9: '♯VI',
  10: 'VII',
  11: '♯VII',
}

/**
 * Simple chord parser for statistical model format
 * Converts strings like "C", "Em", "G7", "Dmaj7" to Chord objects
 */
function parseChordSymbol(symbol: string): Chord | null {
  // Extract root note (first 1-2 characters)
  let root: Note | null = null
  let remaining = symbol

  // Try 2-character root first (e.g., "C#", "Bb", "A#")
  if (symbol.length >= 2) {
    const twoChar = symbol.substring(0, 2)
    if (
      ['A#', 'C#', 'D#', 'F#', 'G#', 'Bb', 'Db', 'Eb', 'Gb', 'Ab'].includes(
        twoChar,
      )
    ) {
      root = twoChar as Note
      remaining = symbol.substring(2)
    }
  }

  // Try 1-character root
  if (!root && symbol.length >= 1) {
    const oneChar = symbol[0]
    if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(oneChar)) {
      root = oneChar as Note
      remaining = symbol.substring(1)
    }
  }

  if (!root) return null

  // Parse quality from remaining string
  let quality: ChordQuality = 'major' // Default

  if (remaining === '') {
    quality = 'major'
  } else if (remaining === 'm' || remaining === 'min') {
    quality = 'minor'
  } else if (remaining === 'dim') {
    quality = 'diminished'
  } else if (remaining === 'aug') {
    quality = 'augmented'
  } else if (remaining === 'maj7' || remaining === 'M7') {
    quality = 'major7'
  } else if (remaining === 'm7') {
    quality = 'minor7'
  } else if (remaining === '7') {
    quality = 'dominant7'
  } else if (remaining === 'dim7') {
    quality = 'diminished7'
  } else if (remaining === 'm7♭5' || remaining === 'm7b5') {
    quality = 'half_diminished7'
  } else if (remaining === 'sus2') {
    quality = 'sus2'
  } else if (remaining === 'sus4') {
    quality = 'sus4'
  } else {
    // Unknown quality - skip complex extensions for now
    // This includes things like "add9", "add11", "13", etc.
    return null
  }

  return generateChord(root, quality)
}

/**
 * Infer the harmonic function of a chord based on its root note
 * relative to the key center. Uses scale degree analysis.
 *
 * For diatonic chords, this maps directly to the classical function:
 *   Tonic: I, iii, vi  |  Dominant: V, vii°  |  Subdominant: ii, IV
 *
 * For chromatic chords, we find the closest scale degree and use that
 * degree's function, which provides a musically reasonable approximation.
 */
function inferHarmonicFunction(
  chordRoot: Note,
  key: Note,
  scaleType: ScaleType,
): HarmonicFunction {
  const keyIdx = noteToIndex(key)
  const rootIdx = noteToIndex(chordRoot)
  const interval = (((rootIdx - keyIdx) % 12) + 12) % 12

  const scaleIntervals =
    scaleType === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS

  // Check if this interval matches a diatonic scale degree exactly
  const exactDegreeIndex = scaleIntervals.indexOf(interval)
  if (exactDegreeIndex !== -1) {
    return getHarmonicFunctionForDegree(exactDegreeIndex + 1) // degrees are 1-indexed
  }

  // For chromatic notes, find the closest scale degree
  let closestDegree = 1
  let minDistance = 12
  for (let i = 0; i < scaleIntervals.length; i++) {
    const dist = Math.min(
      Math.abs(interval - scaleIntervals[i]),
      12 - Math.abs(interval - scaleIntervals[i]),
    )
    if (dist < minDistance) {
      minDistance = dist
      closestDegree = i + 1
    }
  }

  // Special case: dominant7 chords almost always have dominant function
  // regardless of position (they act as secondary dominants)
  // This catches V/x patterns from the statistical model
  if (interval === 7 || interval === 6) {
    return 'dominant'
  }

  return getHarmonicFunctionForDegree(closestDegree)
}

/**
 * Infer a roman numeral for a chord based on its root note
 * relative to the key center.
 *
 * For diatonic chords, returns the standard roman numeral.
 * For chromatic chords, returns an accidental-modified numeral
 * (e.g., ♭VII, ♯IV) with case adjusted for quality.
 */
function inferRomanNumeral(
  chordRoot: Note,
  chordQuality: ChordQuality,
  key: Note,
  scaleType: ScaleType,
): string {
  const keyIdx = noteToIndex(key)
  const rootIdx = noteToIndex(chordRoot)
  const interval = (((rootIdx - keyIdx) % 12) + 12) % 12

  const scaleIntervals =
    scaleType === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS
  const romanNumerals =
    scaleType === 'major' ? MAJOR_ROMAN_NUMERALS : MINOR_ROMAN_NUMERALS

  // Check if this interval matches a diatonic scale degree exactly
  const exactDegreeIndex = scaleIntervals.indexOf(interval)
  if (exactDegreeIndex !== -1) {
    // Diatonic note - but the quality might differ from expected
    // (e.g., a major chord on a normally-minor degree = borrowed)
    const standardRoman = romanNumerals[exactDegreeIndex]
    const isMinorQuality = [
      'minor',
      'minor7',
      'diminished',
      'diminished7',
      'half_diminished7',
    ].includes(chordQuality)

    // If the quality matches the roman numeral case, use as-is
    const standardIsLowercase = standardRoman === standardRoman.toLowerCase()
    if (isMinorQuality === standardIsLowercase) {
      return standardRoman
    }

    // Quality mismatch - adjust case
    return isMinorQuality
      ? standardRoman.toLowerCase()
      : standardRoman.toUpperCase()
  }

  // Chromatic note - use accidental-modified roman numeral
  const chromaticMap =
    scaleType === 'major' ? CHROMATIC_ROMAN_MAJOR : CHROMATIC_ROMAN_MINOR
  let roman = chromaticMap[interval] ?? '?'

  // Adjust case based on chord quality
  const isMinorQuality = [
    'minor',
    'minor7',
    'diminished',
    'diminished7',
    'half_diminished7',
  ].includes(chordQuality)
  if (isMinorQuality) {
    // Keep accidentals, lowercase the numeral letters
    roman = roman.replace(/[IViv]+/g, (match) => match.toLowerCase())
  } else {
    // Keep accidentals, uppercase the numeral letters
    roman = roman.replace(/[IViv]+/g, (match) => match.toUpperCase())
  }

  // Add diminished/augmented markers
  if (chordQuality === 'diminished' || chordQuality === 'diminished7') {
    roman += '°'
  } else if (chordQuality === 'augmented') {
    roman += '+'
  } else if (chordQuality === 'dominant7') {
    roman += '7'
  } else if (chordQuality === 'major7') {
    roman += 'maj7'
  } else if (chordQuality === 'minor7') {
    roman += '7'
  }

  return roman
}

/**
 * Create synthetic candidates from statistical recommendations
 * that don't exist in the harmonic progression map
 *
 * This allows us to show all statistically valid chords,
 * not just the ones in the theoretical harmonic map
 */
export function createSyntheticCandidates(
  statisticalRecs: StatisticalRecommendation[],
  existingCandidates: ScoredCandidate[],
  map: ProgressionMap,
): ScoredCandidate[] {
  // Build a set of existing chord IDs in canonical (sharp) form for enharmonic-aware dedup
  const existingChordIdsCanonical = new Set(
    existingCandidates.map((c) => normalizeChordId(c.node.id)),
  )
  const synthetic: ScoredCandidate[] = []

  for (const stat of statisticalRecs) {
    // Skip if already in harmonic candidates (enharmonic-aware)
    if (existingChordIdsCanonical.has(normalizeChordId(stat.chord))) continue

    // Try to parse the chord
    const chord = parseChordSymbol(stat.chord)
    if (!chord) continue

    // Infer harmonic function from scale degree analysis
    const harmonicFunction = inferHarmonicFunction(
      chord.root,
      map.key,
      map.scaleType,
    )

    // Infer roman numeral from interval analysis
    const romanNumeral = inferRomanNumeral(
      chord.root,
      chord.quality,
      map.key,
      map.scaleType,
    )

    // Create temporary node for classification
    const tempNode: ProgressionNode = {
      id: stat.chord,
      chord,
      romanNumeral,
      function: harmonicFunction,
      category: 'diatonic', // Will be updated by color classification
      extensions: [],
    }

    // Calculate basic metrics
    const harmonicDistance = calculateHarmonicDistance(
      chord,
      map.key,
      map.scaleType,
    )
    const colorClass = classifyColor(tempNode, map.key, map.scaleType)

    // Determine category from color classification
    const category =
      colorClass === 'diatonic'
        ? 'diatonic'
        : colorClass === 'secondary_dominant'
          ? 'secondary-dominant'
          : colorClass === 'diminished_passing'
            ? 'diminished-passing'
            : 'borrowed'

    // Create final synthetic node with correct category
    const node: ProgressionNode = {
      ...tempNode,
      category,
    }

    // Create synthetic breakdown
    const breakdown: ScoreBreakdown = {
      patternRaw: 0,
      patternNorm: 0,
      patternConfidence: 0,
      transitionStrength: stat.probability, // Use statistical probability as transition
      colorClass,
      harmonicDistance,
      tensionLevel: 0.5, // Neutral
      patternWeight: 0,
      transitionWeight: 1.0,
      colorBonus: 0,
      total: stat.probability, // Will be recalculated by hybrid scoring
      matchedProgressions: [],
      category: 'safe_common',
      statisticalProbability: stat.probability,
      genreFrequency: stat.frequency,
      frictionScore: stat.friction,
    }

    synthetic.push({ node, breakdown })
  }

  return synthetic
}
