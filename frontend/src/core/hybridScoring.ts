import type { ScoredCandidate, StatisticalRecommendation } from '@/schemas'
import { normalizeChordId } from '@/core/enharmonic'

export interface HybridScoringWeights {
  statistical: number // 0.25 (reduced from 0.4 to make room for contextual)
  harmonic: number // 0.25
  voiceLeading: number // 0.15
  friction: number // 0.1
  contextual: number // 0.25 — new: pattern-based progression context
}

export const DEFAULT_WEIGHTS: HybridScoringWeights = {
  statistical: 0.25,
  harmonic: 0.25,
  voiceLeading: 0.15,
  friction: 0.1,
  contextual: 0.25,
}

/**
 * A map of chord → contextual boost score, derived from pattern matching
 * against the user's recent progression history.
 *
 * Built by looking at trained n-gram patterns that match the current path
 * prefix, then extracting what "comes next" in each matching pattern.
 * The score is the sum of pattern frequencies for each continuation chord.
 */
export type ContextualBoostMap = Map<string, number>

/**
 * Build a contextual boost map from pattern matching results.
 *
 * Given the current path and matching patterns, extracts the "next chord"
 * from each pattern (the chord that immediately follows the matched prefix)
 * and sums their frequencies per chord.
 *
 * @param path The current progression path (e.g. ["C", "G", "Am"])
 * @param matchingPatterns Patterns from findPatterns() that match the path
 * @returns Map of chord → contextual score (sum of pattern frequencies)
 */
export function buildContextualBoostMap(
  path: string[],
  matchingPatterns: Array<{ chords: string[]; frequency: number }>,
): ContextualBoostMap {
  const boostMap: ContextualBoostMap = new Map()

  for (const pattern of matchingPatterns) {
    // The path is a prefix of the pattern. The "next chord" is the one
    // right after the prefix in the pattern sequence.
    const nextIndex = path.length
    if (nextIndex < pattern.chords.length) {
      const nextChord = pattern.chords[nextIndex]
      const current = boostMap.get(nextChord) ?? 0
      boostMap.set(nextChord, current + pattern.frequency)
    }
  }

  return boostMap
}

/**
 * Combine harmonic candidates with statistical recommendations and
 * contextual pattern data to create hybrid scores that balance
 * music theory, real-world statistics, and progression context.
 */
export function combineScores(
  harmonicCandidates: ScoredCandidate[],
  statisticalRecs: StatisticalRecommendation[],
  contextualBoost: ContextualBoostMap,
  weights: HybridScoringWeights = DEFAULT_WEIGHTS,
): ScoredCandidate[] {
  // Create a map of statistical probabilities for fast lookup.
  // The Markov model may contain both enharmonic spellings of the same
  // pitch as separate entries (e.g. "Bb" at 12.7% AND "A#" at 2.2%).
  // We merge them under the canonical (sharp) key, summing probabilities
  // and keeping the max frequency, so candidates get the full statistical
  // weight of their pitch class regardless of spelling.
  const statMap = new Map<string, StatisticalRecommendation>()
  for (const r of statisticalRecs) {
    const canonical = normalizeChordId(r.chord)
    const existing = statMap.get(canonical)
    if (existing) {
      // Merge enharmonic duplicate: sum probabilities, keep best frequency
      const merged: StatisticalRecommendation = {
        chord: existing.chord, // Keep the first spelling (higher probability)
        probability: existing.probability + r.probability,
        frequency: Math.max(existing.frequency, r.frequency),
        friction: Math.min(existing.friction, r.friction),
      }
      statMap.set(canonical, merged)
      statMap.set(existing.chord, merged)
      statMap.set(r.chord, merged)
    } else {
      statMap.set(r.chord, r)
      statMap.set(canonical, r)
    }
  }

  // Find the max contextual boost for normalization (so we get 0-1 range)
  const maxContextual = Math.max(...contextualBoost.values(), 0)

  // Enhance harmonic candidates with statistical + contextual data
  const enhanced = harmonicCandidates.map((candidate) => {
    const stat =
      statMap.get(candidate.node.id) ??
      statMap.get(normalizeChordId(candidate.node.id))

    // Look up contextual boost (try both original and normalized chord ID)
    const contextScore =
      contextualBoost.get(candidate.node.id) ??
      contextualBoost.get(normalizeChordId(candidate.node.id)) ??
      0
    // Normalize to 0-1 range
    const contextualNorm = maxContextual > 0 ? contextScore / maxContextual : 0

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
        0.5 * weights.friction + // Neutral friction
        contextualNorm * weights.contextual

      return {
        ...candidate,
        breakdown: {
          ...candidate.breakdown,
          statisticalProbability: estimatedProbability,
          genreFrequency: 0,
          frictionScore: 0.5, // Neutral friction
          contextualScore: contextualNorm,
          total: hybridScore,
        },
      }
    }

    // Calculate hybrid score with statistical + contextual data
    const harmonicScore = candidate.breakdown.total
    const statisticalScore = stat.probability
    const frictionBonus = 1 - stat.friction // Bonus for common chords

    // Normalize harmonic score (assume max ~2.0 from current system)
    const harmonicNorm = Math.min(harmonicScore / 2.0, 1.0)

    const hybridScore =
      statisticalScore * weights.statistical +
      harmonicNorm * weights.harmonic +
      candidate.breakdown.transitionStrength * weights.voiceLeading +
      frictionBonus * weights.friction +
      contextualNorm * weights.contextual

    return {
      ...candidate,
      breakdown: {
        ...candidate.breakdown,
        statisticalProbability: stat.probability,
        genreFrequency: stat.frequency,
        frictionScore: stat.friction,
        contextualScore: contextualNorm,
        total: hybridScore, // Replace with hybrid score
      },
    }
  })

  // Sort by hybrid score (descending)
  return enhanced.sort((a, b) => b.breakdown.total - a.breakdown.total)
}
