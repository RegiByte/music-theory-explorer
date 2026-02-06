import type { ScoredCandidate, StatisticalRecommendation } from '@/schemas'
import { normalizeChordId } from '@/core/enharmonic'

export interface HybridScoringWeights {
  statistical: number // 0.4
  harmonic: number // 0.3
  voiceLeading: number // 0.2
  friction: number // 0.1
}

export const DEFAULT_WEIGHTS: HybridScoringWeights = {
  statistical: 0.4,
  harmonic: 0.3,
  voiceLeading: 0.2,
  friction: 0.1,
}

/**
 * Combine harmonic candidates with statistical recommendations
 * to create hybrid scores that balance music theory with real-world data
 */
export function combineScores(
  harmonicCandidates: ScoredCandidate[],
  statisticalRecs: StatisticalRecommendation[],
  weights: HybridScoringWeights = DEFAULT_WEIGHTS,
): ScoredCandidate[] {
  // Create a map of statistical probabilities for fast lookup
  // Index by both original and canonical (sharp) chord IDs for enharmonic matching
  const statMap = new Map<string, StatisticalRecommendation>()
  for (const r of statisticalRecs) {
    statMap.set(r.chord, r)
    statMap.set(normalizeChordId(r.chord), r)
  }

  // Enhance harmonic candidates with statistical data
  const enhanced = harmonicCandidates.map((candidate) => {
    const stat =
      statMap.get(candidate.node.id) ??
      statMap.get(normalizeChordId(candidate.node.id))

    if (!stat) {
      // No statistical data - use harmonic score only with low statistical probability
      // This ensures all candidates are included but prioritizes those in the training data
      const harmonicScore = candidate.breakdown.total
      const harmonicNorm = Math.min(harmonicScore / 2.0, 1.0)

      // Give a small statistical probability based on harmonic score
      const estimatedProbability = harmonicNorm * 0.01 // Max 1% for unknown chords

      const hybridScore =
        estimatedProbability * weights.statistical +
        harmonicNorm * weights.harmonic +
        candidate.breakdown.transitionStrength * weights.voiceLeading +
        0.5 * weights.friction // Neutral friction

      return {
        ...candidate,
        breakdown: {
          ...candidate.breakdown,
          statisticalProbability: estimatedProbability,
          genreFrequency: 0,
          frictionScore: 0.5, // Neutral friction
          total: hybridScore,
        },
      }
    }

    // Calculate hybrid score with statistical data
    const harmonicScore = candidate.breakdown.total
    const statisticalScore = stat.probability
    const frictionBonus = 1 - stat.friction // Bonus for common chords

    // Normalize harmonic score (assume max ~2.0 from current system)
    const harmonicNorm = Math.min(harmonicScore / 2.0, 1.0)

    const hybridScore =
      statisticalScore * weights.statistical +
      harmonicNorm * weights.harmonic +
      candidate.breakdown.transitionStrength * weights.voiceLeading +
      frictionBonus * weights.friction

    return {
      ...candidate,
      breakdown: {
        ...candidate.breakdown,
        statisticalProbability: stat.probability,
        genreFrequency: stat.frequency,
        frictionScore: stat.friction,
        total: hybridScore, // Replace with hybrid score
      },
    }
  })

  // Sort by hybrid score (descending)
  return enhanced.sort((a, b) => b.breakdown.total - a.breakdown.total)
}
