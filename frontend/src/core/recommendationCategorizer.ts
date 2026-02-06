import type {
  ScoredCandidate,
  CategorizedRecommendations,
  ProgressionMap,
} from '@/schemas'

/**
 * Categorize scored candidates by user goal
 *
 * Categories:
 * - Safe & Common: Diatonic chords with high pattern confidence
 * - Tension Building: Dominant function with positive tension delta
 * - Exploratory/Spicy: Chromatic chords with high harmonic distance
 * - Resolution: Tonic function with negative tension delta
 *
 * Note: A chord can appear in multiple categories if it fits multiple goals
 */
export function categorizeRecommendations(
  candidates: ScoredCandidate[],
  _currentPath: string[],
  _map: ProgressionMap,
): CategorizedRecommendations {
  const categories: CategorizedRecommendations = {
    safe_common: [],
    tension_building: [],
    exploratory: [],
    resolution: [],
  }

  for (const candidate of candidates) {
    const { node, breakdown } = candidate

    // Safe & Common: Diatonic, low distance, decent pattern confidence
    // OR high transition strength (common progressions)
    if (
      (breakdown.colorClass === 'diatonic' &&
        breakdown.harmonicDistance < 1.0 &&
        breakdown.patternConfidence > 0.3) ||
      (breakdown.colorClass === 'diatonic' &&
        breakdown.transitionStrength > 0.4)
    ) {
      categories.safe_common.push({
        ...candidate,
        breakdown: { ...breakdown, category: 'safe_common' },
      })
    }

    // Tension Building: Dominant function with positive or neutral tension delta
    // OR secondary dominants (they build tension by definition)
    if (
      (node.function === 'dominant' && (breakdown.tensionDelta ?? 0) >= -0.1) ||
      breakdown.colorClass === 'secondary_dominant'
    ) {
      categories.tension_building.push({
        ...candidate,
        breakdown: { ...breakdown, category: 'tension_building' },
      })
    }

    // Exploratory/Spicy: Chromatic chords with distance >= 1.0
    // OR borrowed chords (modal interchange is spicy)
    // OR diminished passing (chromatic voice leading)
    if (
      (breakdown.colorClass !== 'diatonic' &&
        breakdown.harmonicDistance >= 1.0) ||
      breakdown.colorClass === 'borrowed' ||
      breakdown.colorClass === 'diminished_passing'
    ) {
      categories.exploratory.push({
        ...candidate,
        breakdown: { ...breakdown, category: 'exploratory' },
      })
    }

    // Resolution: Tonic function with negative tension delta (resolving)
    // OR returning to I (terminal chords)
    if (
      (node.function === 'tonic' && (breakdown.tensionDelta ?? 0) < -0.1) ||
      node.romanNumeral === 'I' ||
      node.romanNumeral === 'i'
    ) {
      categories.resolution.push({
        ...candidate,
        breakdown: { ...breakdown, category: 'resolution' },
      })
    }
  }

  // Sort each category by total score (descending)
  categories.safe_common.sort((a, b) => b.breakdown.total - a.breakdown.total)
  categories.tension_building.sort(
    (a, b) => b.breakdown.total - a.breakdown.total,
  )
  categories.exploratory.sort((a, b) => b.breakdown.total - a.breakdown.total)
  categories.resolution.sort((a, b) => b.breakdown.total - a.breakdown.total)

  // Limit each category to top 8 to avoid overwhelming UI
  categories.safe_common = categories.safe_common.slice(0, 8)
  categories.tension_building = categories.tension_building.slice(0, 8)
  categories.exploratory = categories.exploratory.slice(0, 8)
  categories.resolution = categories.resolution.slice(0, 8)

  return categories
}

/**
 * Get category label for UI display
 */
export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'safe_common':
      return 'Safe & Common'
    case 'tension_building':
      return 'Tension Building'
    case 'exploratory':
      return 'Exploratory/Spicy'
    case 'resolution':
      return 'Resolution'
    default:
      return category
  }
}

/**
 * Get category description for UI tooltips
 */
export function getCategoryDescription(category: string): string {
  switch (category) {
    case 'safe_common':
      return 'Familiar, diatonic progressions that sound natural and expected'
    case 'tension_building':
      return 'Chords that create anticipation and forward motion'
    case 'exploratory':
      return 'Chromatic and borrowed chords for color and surprise'
    case 'resolution':
      return 'Chords that resolve tension and provide closure'
    default:
      return ''
  }
}
