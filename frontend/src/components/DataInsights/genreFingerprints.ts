import type { Genre } from '@/schemas'

export interface GenreFingerprint {
  genre: Genre
  /** Number of unique chords with frequency > threshold (normalized 0-1) */
  chordDiversity: number
  /** Ratio of major chord usage to total major+minor (0=all minor, 1=all major) */
  majorMinorRatio: number
  /** How often dominant-function chords appear (normalized 0-1) */
  dominantUsage: number
  /** How concentrated transitions are in top 3 (higher = more predictable) */
  repetitiveness: number
  /** Usage of non-standard chords: sharps, flats, dim, aug, 7ths, etc. (normalized 0-1) */
  chromaticColor: number
}

export const FINGERPRINT_DIMENSIONS = [
  { key: 'chordDiversity' as const, label: 'Chord Diversity', description: 'How many different chords are commonly used' },
  { key: 'majorMinorRatio' as const, label: 'Major/Minor Ratio', description: 'Balance of major vs minor chord usage' },
  { key: 'dominantUsage' as const, label: 'Dominant Usage', description: 'How often dominant-function chords appear' },
  { key: 'repetitiveness' as const, label: 'Predictability', description: 'How concentrated the chord transitions are' },
  { key: 'chromaticColor' as const, label: 'Chromatic Color', description: 'Usage of extended, altered, and non-diatonic chords' },
]

// Simple heuristic: is this chord name a "major" chord?
function isMajorChord(chord: string): boolean {
  // Major chords: C, G, D, A, E, F, etc. (no 'm' suffix, not 'dim', not 'aug')
  // But "Am" is minor, "A" is major, "A7" is major-family
  const cleaned = chord.replace(/^[A-G][#b]?/, '') // Remove root note
  if (cleaned === '' || cleaned.startsWith('7') || cleaned.startsWith('maj') || cleaned.startsWith('sus') || cleaned.startsWith('add') || cleaned.startsWith('6') || cleaned.startsWith('9') || cleaned.startsWith('11') || cleaned.startsWith('13')) {
    return true
  }
  return false
}

function isMinorChord(chord: string): boolean {
  const cleaned = chord.replace(/^[A-G][#b]?/, '')
  return cleaned.startsWith('m') && !cleaned.startsWith('maj')
}

function isDominantOrExtended(chord: string): boolean {
  // Dominant 7th chords (not maj7), sus chords
  const cleaned = chord.replace(/^[A-G][#b]?/, '')
  return cleaned.includes('7') || cleaned.includes('sus') || cleaned.includes('dim') || cleaned.includes('aug')
}

function isChromaticOrExtended(chord: string): boolean {
  // Has sharps, flats, dim, aug, 7ths, 9ths, 11ths, 13ths, sus
  const root = chord.match(/^[A-G]([#b])?/)
  const hasSharpFlat = root?.[1] != null
  const cleaned = chord.replace(/^[A-G][#b]?/, '')
  const hasExtension = cleaned.length > 0 && cleaned !== 'm'
  return hasSharpFlat || hasExtension
}

export function computeGenreFingerprint(
  genre: Genre,
  frequencies: Record<string, number>,
  transitions: Record<string, Record<string, number>>
): GenreFingerprint {
  const chords = Object.entries(frequencies)
  const totalFreq = chords.reduce((sum, [, f]) => sum + f, 0)

  // 1. Chord diversity: count chords with frequency > 0.5%
  const threshold = 0.005
  const diverseCount = chords.filter(([, f]) => f > threshold).length
  // Normalize: assume 5-80 range for typical genres
  const chordDiversity = Math.min(1, Math.max(0, (diverseCount - 5) / 75))

  // 2. Major/minor ratio
  let majorFreq = 0
  let minorFreq = 0
  for (const [chord, freq] of chords) {
    if (isMajorChord(chord)) majorFreq += freq
    if (isMinorChord(chord)) minorFreq += freq
  }
  const majorMinorRatio = majorFreq + minorFreq > 0
    ? majorFreq / (majorFreq + minorFreq)
    : 0.5

  // 3. Dominant usage: frequency of chords that are dominant-function (7ths, sus, dim, aug)
  let dominantFreq = 0
  for (const [chord, freq] of chords) {
    if (isDominantOrExtended(chord)) dominantFreq += freq
  }
  // Normalize: typically 0-30% of total
  const dominantUsage = Math.min(1, (dominantFreq / Math.max(totalFreq, 0.001)) * 3.3)

  // 4. Repetitiveness: average concentration of top 3 transitions per chord
  let totalConcentration = 0
  let chordCount = 0
  for (const fromChord of Object.keys(transitions)) {
    const trans = Object.values(transitions[fromChord] || {})
    if (trans.length === 0) continue
    const sorted = trans.sort((a, b) => b - a)
    const top3Sum = sorted.slice(0, 3).reduce((s, v) => s + v, 0)
    totalConcentration += top3Sum
    chordCount++
  }
  const repetitiveness = chordCount > 0 ? totalConcentration / chordCount : 0

  // 5. Chromatic color: frequency of chords with sharps, flats, or extensions
  let chromaticFreq = 0
  for (const [chord, freq] of chords) {
    if (isChromaticOrExtended(chord)) chromaticFreq += freq
  }
  // Normalize: typically 10-60%
  const chromaticColor = Math.min(1, (chromaticFreq / Math.max(totalFreq, 0.001)) * 1.5)

  return {
    genre,
    chordDiversity,
    majorMinorRatio,
    dominantUsage,
    repetitiveness,
    chromaticColor,
  }
}
