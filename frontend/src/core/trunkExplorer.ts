import { PROGRESSION_TEMPLATES } from '@/constants'
import type { ProgressionMap, ProgressionNode, Note, PatternMatchResult, PatternMatch, ScoredCandidate, ScoreBreakdown } from '@/schemas'
import { classifyColor, getColorWeights } from './colorClassifier'
import { calculateHarmonicDistance } from './harmonicDistance'
import { calculateTensionLevel, calculateTensionDelta, calculateTensionArcBonus } from './tensionCalculator'

// Window and mode weights for pattern matching v2
const WINDOW_WEIGHT = { 5: 1.0, 3: 0.6, 2: 0.3 } as const
const MODE_MULT = { prefix: 1.0, contained: 0.55 } as const

/**
 * Match a path against canonical progressions (v2)
 * Returns structured result with matches, confidence, and normalized score
 * Uses both prefix AND contained matching with confidence-based normalization
 */
export function matchProgressionPatternsV2(
  path: string[], // ["C", "Dm", "G", "C"]
  map: ProgressionMap,
  windowSizes: number[] = [5, 3, 2]
): PatternMatchResult {
  const matches: PatternMatch[] = []
  const bestHitByTemplate = new Map<string, number>()
  
  // Convert chord IDs to degrees
  const degrees = path.map(chordId => {
    const node = map.nodes.find(n => n.id === chordId)
    return node ? getDegreeFromRomanNumeral(node.romanNumeral) : null
  }).filter(d => d !== null) as number[]
  
  if (degrees.length === 0) {
    return {
      matches: [],
      rawSum: 0,
      maxPerTemplateSum: 0,
      confidence: 0,
      norm: 0,
    }
  }
  
  // Try each window size
  for (const windowSize of windowSizes) {
    if (degrees.length < windowSize) continue
    
    const window = degrees.slice(-windowSize)
    const windowWeight = WINDOW_WEIGHT[windowSize as keyof typeof WINDOW_WEIGHT] || 0.3
    
    // Check each progression template
    for (const [key, template] of Object.entries(PROGRESSION_TEMPLATES)) {
      if (template.degrees.length < windowSize) continue
      
      // Check prefix match
      const prefixMatch = matchWindowPrefix(window, template.degrees)
      if (prefixMatch) {
        const score = windowWeight * MODE_MULT.prefix
        matches.push({ key, mode: 'prefix', windowSize, score })
        bestHitByTemplate.set(key, Math.max(bestHitByTemplate.get(key) || 0, score))
      }
      
      // Check contained match (any contiguous slice)
      const containedMatch = matchWindowContained(window, template.degrees)
      if (containedMatch && !prefixMatch) { // Don't double-count if already matched prefix
        const score = windowWeight * MODE_MULT.contained
        matches.push({ key, mode: 'contained', windowSize, score })
        bestHitByTemplate.set(key, Math.max(bestHitByTemplate.get(key) || 0, score))
      }
    }
  }
  
  // Calculate raw sum (max per template to avoid double-counting)
  const rawSum = Array.from(bestHitByTemplate.values()).reduce((sum, score) => sum + score, 0)
  
  // Calculate confidence (how dominant is the best match?)
  const best = Math.max(...Array.from(bestHitByTemplate.values()), 0)
  const eps = 0.001
  const confidence = rawSum > 0 ? best / (rawSum + eps) : 0
  
  // Normalize with confidence dampening
  const norm = rawSum > 0 ? 1 - Math.exp(-rawSum * confidence) : 0
  
  return {
    matches,
    rawSum,
    maxPerTemplateSum: rawSum,
    confidence,
    norm,
  }
}

/**
 * Legacy function for backward compatibility
 * Returns matching progression names with scores
 * Uses prefix-only matching with path-length confidence weighting
 */
export function matchProgressionPatterns(
  path: string[], // ["C", "Dm", "G", "C"]
  map: ProgressionMap,
  windowSizes: number[] = [5, 3, 2]
): Map<string, number> {
  const scores = new Map<string, number>()
  
  // Convert chord IDs to degrees
  const degrees = path.map(chordId => {
    const node = map.nodes.find(n => n.id === chordId)
    return node ? getDegreeFromRomanNumeral(node.romanNumeral) : null
  }).filter(d => d !== null) as number[]
  
  // Path-length confidence multiplier
  // 1 chord: 0.3x (weak evidence - just starting)
  // 2 chords: 0.6x (medium evidence - establishing direction)
  // 3+ chords: 1.0x (strong evidence - clear pattern)
  const pathLengthMultiplier = degrees.length === 1 ? 0.3 : 
                                degrees.length === 2 ? 0.6 : 1.0
  
  // Try each window size
  for (const windowSize of windowSizes) {
    if (degrees.length < windowSize) continue
    
    const window = degrees.slice(-windowSize)
    
    // Check each progression template
    for (const [key, template] of Object.entries(PROGRESSION_TEMPLATES)) {
      // Only match from the BEGINNING of the template (prefix match)
      const matchScore = matchWindowPrefixScore(window, template.degrees, windowSize)
      if (matchScore > 0) {
        // Apply path-length confidence multiplier
        scores.set(key, (scores.get(key) || 0) + matchScore * pathLengthMultiplier)
      }
    }
  }
  
  return scores
}

/**
 * Enhanced scoring function with full breakdown (v2)
 * Integrates all signals: pattern matching, color classification, harmonic distance, tension
 */
export function getScoredCandidatesV2(
  currentChordId: string,
  path: string[],
  map: ProgressionMap
): ScoredCandidate[] {
  const currentNode = map.nodes.find(n => n.id === currentChordId)
  if (!currentNode) return []
  
  // Calculate tension of current chord (for tension delta)
  const currentHarmonicDistance = calculateHarmonicDistance(currentNode.chord, map.key, map.scaleType)
  const currentTension = calculateTensionLevel(
    currentNode.chord,
    map.key,
    currentNode.function,
    currentHarmonicDistance
  )
  
  const candidates = map.edges
    .filter(e => e.from === currentChordId)
    .map(edge => {
      const targetNode = map.nodes.find(n => n.id === edge.to)!
      
      // 1. Pattern matching v2
      const testPath = [...path, edge.to]
      const patternResult = matchProgressionPatternsV2(testPath, map)
      
      // 2. Color classification
      const colorClass = classifyColor(targetNode, map.key, map.scaleType)
      const weights = getColorWeights(colorClass)
      
      // 3. Harmonic distance
      const harmonicDistance = calculateHarmonicDistance(
        targetNode.chord,
        map.key,
        map.scaleType
      )
      
      // 4. Tension calculation
      const tension = calculateTensionLevel(
        targetNode.chord,
        map.key,
        targetNode.function,
        harmonicDistance
      )
      
      const tensionDelta = calculateTensionDelta(currentTension, tension)
      const tensionArcBonus = calculateTensionArcBonus(path.length, tensionDelta)
      
      // 5. Calculate final score
      const score = 
        patternResult.norm * weights.patternWeight +
        edge.strength * weights.transitionWeight +
        weights.colorBonus +
        (1 / (1 + harmonicDistance)) * 0.1 +
        tensionArcBonus * 0.15
      
      // 6. Build breakdown
      const breakdown: ScoreBreakdown = {
        patternRaw: patternResult.rawSum,
        patternNorm: patternResult.norm,
        patternConfidence: patternResult.confidence,
        transitionStrength: edge.strength,
        colorClass,
        harmonicDistance,
        tensionLevel: tension,
        tensionDelta,
        patternWeight: weights.patternWeight,
        transitionWeight: weights.transitionWeight,
        colorBonus: weights.colorBonus,
        total: score,
        matchedProgressions: patternResult.matches.map(m => m.key),
        matchDetails: patternResult.matches,
        category: 'safe_common', // Will be set by categorizer
      }
      
      return {
        node: targetNode,
        breakdown,
      }
    })
  
  // Sort by total score
  const sorted = candidates.sort((a, b) => b.breakdown.total - a.breakdown.total)
  
  // Deduplicate by chord ID while preserving highest score
  const deduplicated = sorted.reduce((acc, candidate) => {
    const existing = acc.find(c => c.node.id === candidate.node.id)
    if (existing) {
      // Keep higher score
      if (candidate.breakdown.total > existing.breakdown.total) {
        acc[acc.indexOf(existing)] = candidate
      }
    } else {
      acc.push(candidate)
    }
    return acc
  }, [] as ScoredCandidate[])
  
  return deduplicated
}

/**
 * Core function to get scored and deduplicated candidates (legacy)
 * Used internally by both getSuggestedNextChords and getChromaticDiverseTrunks
 */
function getScoredCandidates(
  currentChordId: string,
  path: string[],
  map: ProgressionMap
): Array<{
  node: ProgressionNode
  score: number
  matchedProgressions: string[]
  transitionStrength: number
}> {
  const currentNode = map.nodes.find(n => n.id === currentChordId)
  if (!currentNode) return []
  
  const candidates = map.edges
    .filter(e => e.from === currentChordId)
    .map(edge => {
      const targetNode = map.nodes.find(n => n.id === edge.to)!
      
      // Calculate pattern match score
      const testPath = [...path, edge.to]
      const patternMatches = matchProgressionPatterns(testPath, map)
      const patternScore = Array.from(patternMatches.values())
        .reduce((sum, score) => sum + score, 0)
      
      // Option 1: Diatonic bonus - prioritize common diatonic transitions
      const diatonicBonus = targetNode.category === 'diatonic' ? 0.3 : 0
      
      // Option 2: Reduce pattern weight for chromatic chords
      // Diatonic: 50% pattern + 50% transition
      // Chromatic: 30% pattern + 70% transition (rely more on harmonic strength)
      const isDiatonic = targetNode.category === 'diatonic'
      const patternWeight = isDiatonic ? 0.5 : 0.3
      const transitionWeight = isDiatonic ? 0.5 : 0.7
      
      const score = patternScore * patternWeight + edge.strength * transitionWeight + diatonicBonus
      
      return {
        node: targetNode,
        score,
        matchedProgressions: Array.from(patternMatches.keys()),
        transitionStrength: edge.strength,
      }
    })
  
  // Sort by score
  const sorted = candidates.sort((a, b) => b.score - a.score)
  
  // Deduplicate by chord ID while preserving highest score and merging progressions
  const deduplicated = sorted.reduce((acc, candidate) => {
    const existing = acc.find(c => c.node.id === candidate.node.id)
    if (existing) {
      // Merge matched progressions and keep higher score
      if (candidate.score > existing.score) {
        existing.score = candidate.score
        existing.transitionStrength = candidate.transitionStrength
      }
      // Merge unique progression names
      const newProgressions = candidate.matchedProgressions.filter(
        p => !existing.matchedProgressions.includes(p)
      )
      existing.matchedProgressions.push(...newProgressions)
    } else {
      acc.push(candidate)
    }
    return acc
  }, [] as typeof candidates)
  
  return deduplicated
}

/**
 * Get top-K suggestions for next chord with functional diversity
 * Prioritizes showing one candidate per harmonic function before duplicates
 * Used for expansion suggestions (when clicking + button)
 */
export function getSuggestedNextChords(
  currentChordId: string,
  path: string[],
  map: ProgressionMap,
  topK: number = 5
): Array<{
  node: ProgressionNode
  score: number
  matchedProgressions: string[]
  transitionStrength: number
}> {
  const deduplicated = getScoredCandidates(currentChordId, path, map)
  
  // Apply functional diversity: prioritize one per function
  const result: typeof deduplicated = []
  const usedFunctions = new Set<string>()
  
  // First pass: pick best candidate for each function
  for (const candidate of deduplicated) {
    const func = candidate.node.function
    if (!usedFunctions.has(func)) {
      result.push(candidate)
      usedFunctions.add(func)
      if (result.length >= topK) return result
    }
  }
  
  // Second pass: fill remaining slots with next-best candidates
  for (const candidate of deduplicated) {
    if (!result.find(c => c.node.id === candidate.node.id)) {
      result.push(candidate)
      if (result.length >= topK) return result
    }
  }
  
  return result
}

/**
 * Helper: Extract degree number from roman numeral
 */
function getDegreeFromRomanNumeral(roman: string): number | null {
  const degreeMap: Record<string, number> = {
    'I': 1, 'i': 1,
    'II': 2, 'ii': 2,
    'III': 3, 'iii': 3,
    'IV': 4, 'iv': 4,
    'V': 5, 'v': 5,
    'VI': 6, 'vi': 6,
    'VII': 7, 'vii': 7,
  }
  
  // Handle secondary dominants like "V/ii"
  const base = roman.split('/')[0].replace('°', '').replace('7', '')
  return degreeMap[base] || null
}

/**
 * Helper: Match a window of degrees against the START of a template (prefix match only)
 * Returns true if window matches the beginning of the template
 */
function matchWindowPrefix(
  window: number[],
  template: readonly number[]
): boolean {
  if (template.length < window.length) return false
  
  const templatePrefix = template.slice(0, window.length)
  return arraysEqual(window, templatePrefix)
}

/**
 * Helper: Match a window against ANY contiguous slice within a template
 * Returns true if window matches any position in the template
 */
function matchWindowContained(
  window: number[],
  template: readonly number[]
): boolean {
  if (template.length < window.length) return false
  
  // Try all possible positions
  for (let i = 0; i <= template.length - window.length; i++) {
    const slice = template.slice(i, i + window.length)
    if (arraysEqual(window, slice)) {
      return true
    }
  }
  
  return false
}

/**
 * Legacy helper: Match a window of degrees against the START of a template with score
 * This ensures we only match progressions that make sense from the beginning
 * Example: [1, 6] matches [1, 6, 4, 5] but NOT [6, 4, 1, 5]
 */
function matchWindowPrefixScore(
  window: number[],
  template: readonly number[],
  windowSize: number
): number {
  // Only match if the window matches the BEGINNING of the template
  if (template.length < windowSize) return 0
  
  const templatePrefix = template.slice(0, windowSize)
  if (arraysEqual(window, templatePrefix)) {
    // Score based on window size: 5-note = 1.0, 3-note = 0.6, 2-note = 0.3
    return windowSize === 5 ? 1.0 : windowSize === 3 ? 0.6 : 0.3
  }
  
  return 0
}

function arraysEqual(a: number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i])
}

/**
 * Get chromatic-diverse trunk suggestions
 * Prioritizes having at least one candidate for each chromatic degree
 * to ensure musical diversity (e.g., C→Em for "Somewhere Over the Rainbow")
 * Used ONLY for initial trunk selection from root
 */
export function getChromaticDiverseTrunks(
  rootChordId: string,
  path: string[],
  map: ProgressionMap,
  topK: number = 5,
  minScore: number = 0.1  // Low threshold to ensure chromatic diversity
): Array<{
  node: ProgressionNode
  score: number
  matchedProgressions: string[]
  transitionStrength: number
}> {
  // Get all candidates with scores (without functional diversity filter)
  const allCandidates = getScoredCandidates(rootChordId, path, map)

  console.log('allCandidates', allCandidates)
  
  // Group candidates by their root note (keep ALL candidates per root, not just best)
  const candidatesByRoot = new Map<Note, typeof allCandidates>()
  
  for (const candidate of allCandidates) {
    const rootNote = candidate.node.chord.root
    if (!candidatesByRoot.has(rootNote)) {
      candidatesByRoot.set(rootNote, [])
    }
    candidatesByRoot.get(rootNote)!.push(candidate)
  }
  
  // Sort candidates within each root by score
  for (const candidates of candidatesByRoot.values()) {
    candidates.sort((a, b) => b.score - a.score)
  }
  
  // Get all chromatic degrees (excluding the root itself)
  const rootNote = map.nodes.find(n => n.id === rootChordId)?.chord.root
  
  // Build a list of (root, best_candidate) pairs, sorted by candidate score
  const rootCandidatePairs: Array<{ root: Note; candidate: typeof allCandidates[0] }> = []
  
  for (const [candidateRoot, candidates] of candidatesByRoot) {
    if (candidateRoot === rootNote) continue // Skip same root as starting chord
    const best = candidates[0] // Already sorted by score
    if (best && best.score >= minScore) {
      rootCandidatePairs.push({ root: candidateRoot, candidate: best })
    }
  }
  
  // Sort by: 1) diatonic first, 2) then by score
  // This ensures we prioritize diatonic chords (Em, Am, Dm) over chromatic (C#dim7, A7)
  rootCandidatePairs.sort((a, b) => {
    const aDiatonic = a.candidate.node.category === 'diatonic' ? 1 : 0
    const bDiatonic = b.candidate.node.category === 'diatonic' ? 1 : 0
    
    // Diatonic chords first
    if (aDiatonic !== bDiatonic) return bDiatonic - aDiatonic
    
    // Then by score
    return b.candidate.score - a.candidate.score
  })
  
  // Pick top K, ensuring chromatic diversity (one per root)
  const diverseCandidates: typeof allCandidates = []
  const usedRoots = new Set<Note>()
  
  for (const { root, candidate } of rootCandidatePairs) {
    if (!usedRoots.has(root)) {
      diverseCandidates.push(candidate)
      usedRoots.add(root)
      
      if (diverseCandidates.length >= topK) break
    }
  }
  
  return diverseCandidates
}
