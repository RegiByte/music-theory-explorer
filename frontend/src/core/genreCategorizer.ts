import type { 
  ScoredCandidate, 
  Genre, 
  GenreCategorizedRecommendations,
  FrequencyStats,
} from '@/schemas'

/**
 * Compute frequency distribution statistics from a set of candidates.
 * These stats are used downstream for distribution-relative rarity labels
 * rather than hardcoded thresholds that don't match real-world data.
 */
function computeFrequencyStats(candidates: ScoredCandidate[]): FrequencyStats {
  const frequencies = candidates
    .map(c => c.breakdown.genreFrequency ?? 0)
    .sort((a, b) => a - b)
  
  if (frequencies.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p25: 0, p75: 0 }
  }
  
  const sum = frequencies.reduce((acc, f) => acc + f, 0)
  const mean = sum / frequencies.length
  
  const percentile = (arr: number[], p: number): number => {
    const idx = (p / 100) * (arr.length - 1)
    const lower = Math.floor(idx)
    const upper = Math.ceil(idx)
    if (lower === upper) return arr[lower]
    return arr[lower] + (arr[upper] - arr[lower]) * (idx - lower)
  }
  
  return {
    min: frequencies[0],
    max: frequencies[frequencies.length - 1],
    mean,
    median: percentile(frequencies, 50),
    p25: percentile(frequencies, 25),
    p75: percentile(frequencies, 75),
  }
}

/**
 * Categorize candidates by genre with canonical/spicy split
 * 
 * Canonical: Top 50% by statistical probability (most common progressions)
 * Spicy: Bottom 50% by statistical probability (less common but valid)
 * 
 * Also computes frequency distribution stats for relative rarity labeling.
 */
export function categorizeByGenre(
  candidates: ScoredCandidate[],
  genre: Genre,
): GenreCategorizedRecommendations {
  // Sort by statistical probability (descending)
  // All candidates now have statisticalProbability from hybrid scoring
  const sorted = [...candidates].sort((a, b) => 
    (b.breakdown.statisticalProbability || 0) - (a.breakdown.statisticalProbability || 0)
  )
  
  // Split into canonical (top 50%) and spicy (bottom 50%)
  const midpoint = Math.ceil(sorted.length / 2)
  const canonical = sorted.slice(0, midpoint).slice(0, 20) // Top 20
  const spicy = sorted.slice(midpoint).slice(0, 20) // Top 20 of bottom half
  
  // Compute frequency distribution stats across ALL candidates
  // so rarity labels are relative to what's actually in the dataset
  const frequencyStats = computeFrequencyStats(sorted)
  
  return {
    genre,
    canonical,
    spicy,
    frequencyStats,
  }
}

/**
 * Get a rarity label for a candidate relative to the frequency distribution.
 * 
 * Uses quartile-based classification:
 *   - Above P75 → "Very Common" (top quarter)
 *   - Above median → "Common" (above average)
 *   - Above P25 → "Uncommon" (below average)
 *   - Below P25 → "Rare" (bottom quarter)
 * 
 * For candidates with no frequency data → "Unknown"
 */
export function getRarityLabel(
  genreFrequency: number | undefined,
  stats: FrequencyStats
): { label: string; color: string } {
  if (genreFrequency === undefined || genreFrequency === 0) {
    return { label: 'Unknown', color: '#9ca3af' } // gray-400
  }
  
  // If all frequencies are the same (or near-zero range), everything is "Common"
  if (stats.max - stats.min < 0.0001) {
    return { label: 'Common', color: '#22c55e' } // green-500
  }
  
  if (genreFrequency >= stats.p75) {
    return { label: 'Very Common', color: '#16a34a' } // green-600
  }
  if (genreFrequency >= stats.median) {
    return { label: 'Common', color: '#22c55e' } // green-500
  }
  if (genreFrequency >= stats.p25) {
    return { label: 'Uncommon', color: '#f59e0b' } // amber-500
  }
  return { label: 'Rare', color: '#ef4444' } // red-500
}

/**
 * Get human-readable label for a genre
 */
export function getGenreLabel(genre: Genre): string {
  const labels: Record<Genre, string> = {
    'pop': 'Pop',
    'rock': 'Rock',
    'country': 'Country',
    'punk': 'Punk',
    'alternative': 'Alternative',
    'pop rock': 'Pop Rock',
    'rap': 'Rap',
    'metal': 'Metal',
    'soul': 'Soul',
  }
  return labels[genre]
}

/**
 * Get description for a genre (for tooltips/info)
 */
export function getGenreDescription(genre: Genre): string {
  const descriptions: Record<Genre, string> = {
    'pop': 'Catchy, accessible progressions from 66K pop songs',
    'rock': 'Guitar-driven progressions from 63K rock songs',
    'country': 'Storytelling progressions from 36K country songs',
    'punk': 'Raw, energetic progressions from 19K punk songs',
    'alternative': 'Creative, diverse progressions from 29K alternative songs',
    'pop rock': 'Hybrid progressions from 31K pop rock songs',
    'rap': 'Loop-based progressions from 9K rap songs',
    'metal': 'Heavy, powerful progressions from 8K metal songs',
    'soul': 'Soulful, expressive progressions from 6K soul songs',
  }
  return descriptions[genre]
}
