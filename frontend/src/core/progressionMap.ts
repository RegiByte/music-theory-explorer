import { getDiatonicChords, getDiatonicChordsMinor } from './harmony'
import { generateChord, getChordSymbol } from './chords'
import { noteToIndex, indexToNote } from './musicTheory'
import type {
  Note,
  ScaleType,
  Chord,
  ProgressionNode,
  ProgressionEdge,
  ProgressionMap,
  HarmonicFunction,
  HarmonicMovement,
} from '@/schemas'

/**
 * Get the secondary dominant (V7) of a target chord
 * The secondary dominant is a dominant 7th chord built on the 5th of the target
 * Example: A7 is V7/ii in C major (resolves to Dm)
 */
export function getSecondaryDominant(targetRoot: Note): Chord {
  // V of target = root a perfect 5th above target
  // In semitones: target + 7 = V root
  const targetIdx = noteToIndex(targetRoot)
  const dominantRoot = indexToNote(targetIdx + 7) // Up a P5
  return generateChord(dominantRoot, 'dominant7')
}

/**
 * Get the diminished approach chord (dim7 a half-step below target)
 * These create smooth chromatic voice leading into the target
 * Example: C#dim7 resolves to Dm
 */
export function getDiminishedApproach(targetRoot: Note): Chord {
  const targetIdx = noteToIndex(targetRoot)
  const dimRoot = indexToNote(targetIdx - 1) // Half-step below
  return generateChord(dimRoot, 'diminished7')
}

/**
 * Calculate the transition strength between two chords
 * Returns a score from 0-1 indicating how natural the progression sounds
 * Enhanced for better differentiation and variety
 */
export function calculateTransitionStrength(from: Chord, to: Chord): number {
  let score = 0

  const fromRootIdx = noteToIndex(from.root)
  const toRootIdx = noteToIndex(to.root)
  const interval = (((toRootIdx - fromRootIdx) % 12) + 12) % 12

  // Root motion by fifth (strongest progressions)
  // Down a 5th (up a 4th) = interval of 5 semitones - STRONGER
  // Up a 5th (down a 4th) = interval of 7 semitones
  if (interval === 5) {
    score += 0.35 // Stronger for descending fifth (most common resolution)
  } else if (interval === 7) {
    score += 0.25 // Slightly weaker for ascending fifth
  }

  // Common tones (shared notes create smooth voice leading)
  const commonTones = from.notes.filter((n) => to.notes.includes(n))
  score += commonTones.length * 0.12 // Slightly increased weight

  // Dominant to tonic resolution (V -> I motion) - ENHANCED
  if (from.quality === 'dominant7' || from.quality === 'major') {
    if (interval === 5) {
      score += 0.25 // Strong resolution bonus
    }
  }

  // Diminished resolution (half-step up) - ENHANCED
  if (from.quality === 'diminished' || from.quality === 'diminished7') {
    if (interval === 1) {
      score += 0.3 // Strong chromatic resolution
    }
  }

  // Subdominant to dominant (IV -> V)
  if (interval === 2 && from.quality === 'major' && to.quality === 'major') {
    score += 0.18
  }

  // Minor to relative major (vi -> I, ii -> IV, iii -> vi)
  if (interval === 3 || interval === 9) {
    if (from.quality === 'minor' && to.quality === 'major') {
      score += 0.15 // Increased for smooth minor-major transitions
    }
  }

  // Step-wise motion (seconds) - smooth but less strong
  if (interval === 1 || interval === 2) {
    score += 0.08 // Small bonus for step-wise motion
  }

  // Major to minor of same root (modal interchange)
  if (from.root === to.root && from.quality !== to.quality) {
    score += 0.12 // Modal color change
  }

  // Chromatic approach (half-step below target)
  if (interval === 11) {
    // Half-step below
    score += 0.1
  }

  return Math.min(score, 1)
}

/**
 * Get the harmonic function of a scale degree
 */
export function getHarmonicFunctionForDegree(degree: number): HarmonicFunction {
  // Tonic function: I, iii, vi
  if (degree === 1 || degree === 3 || degree === 6) {
    return 'tonic'
  }
  // Dominant function: V, vii°
  if (degree === 5 || degree === 7) {
    return 'dominant'
  }
  // Subdominant function: ii, IV
  return 'subdominant'
}

/**
 * Get available extensions for a chord based on its quality
 */
function getAvailableExtensions(quality: string): string[] {
  switch (quality) {
    case 'major':
      return ['7', 'M7', '6', 'sus4', 'sus2', '9']
    case 'minor':
      return ['7', 'm7', '9']
    case 'diminished':
      return ['7', 'dim7']
    default:
      return []
  }
}

/**
 * Build a complete progression map for a given key
 * Includes diatonic chords, secondary dominants, and diminished passing chords
 */
export function buildProgressionMap(
  key: Note,
  scaleType: ScaleType,
): ProgressionMap {
  const nodes: ProgressionNode[] = []
  const edges: ProgressionEdge[] = []

  // Get diatonic chords
  const diatonicChords =
    scaleType === 'major' ? getDiatonicChords(key) : getDiatonicChordsMinor(key)

  // Add diatonic chord nodes
  diatonicChords.forEach((dc) => {
    const nodeId = getChordSymbol(dc.chord)
    nodes.push({
      id: nodeId,
      chord: dc.chord,
      romanNumeral: dc.romanNumeral,
      function: getHarmonicFunctionForDegree(dc.degree),
      category: 'diatonic',
      extensions: getAvailableExtensions(dc.quality),
    })
  })

  // Add secondary dominants (V7/x) for degrees ii, iii, IV, V, vi
  // We don't add V7/vii° because diminished chords don't have strong secondary dominants
  const secondaryDominantTargets = [2, 3, 4, 5, 6] // ii, iii, IV, V, vi

  secondaryDominantTargets.forEach((targetDegree) => {
    const targetChord = diatonicChords[targetDegree - 1]
    const secDom = getSecondaryDominant(targetChord.root)
    const nodeId = getChordSymbol(secDom)

    // Only add if not already a diatonic chord
    const existingNode = nodes.find((n) => n.id === nodeId)
    if (!existingNode) {
      nodes.push({
        id: nodeId,
        chord: secDom,
        romanNumeral: `V/${targetChord.romanNumeral}`,
        function: 'dominant',
        category: 'secondary-dominant',
        extensions: ['9', '13', 'sus4'],
      })
    }
  })

  // Add diminished passing chords for select targets
  // Common ones: approaching ii, iii, V, vi
  const diminishedTargets = [2, 5] // ii and V are most common

  diminishedTargets.forEach((targetDegree) => {
    const targetChord = diatonicChords[targetDegree - 1]
    const dimApproach = getDiminishedApproach(targetChord.root)
    const nodeId = getChordSymbol(dimApproach)

    // Only add if not already present
    const existingNode = nodes.find((n) => n.id === nodeId)
    if (!existingNode) {
      nodes.push({
        id: nodeId,
        chord: dimApproach,
        romanNumeral: `#${targetDegree - 1}°7`,
        function: 'dominant', // Diminished chords have dominant function
        category: 'diminished-passing',
        extensions: [],
      })
    }
  })

  // Calculate edges between all pairs of nodes
  const EDGE_THRESHOLD = 0.2 // Minimum strength to include edge

  nodes.forEach((fromNode) => {
    nodes.forEach((toNode) => {
      if (fromNode.id !== toNode.id) {
        const strength = calculateTransitionStrength(
          fromNode.chord,
          toNode.chord,
        )

        if (strength >= EDGE_THRESHOLD) {
          edges.push({
            from: fromNode.id,
            to: toNode.id,
            strength,
          })
        }
      }
    })
  })

  return {
    key,
    scaleType,
    nodes,
    edges,
  }
}

/**
 * Get the position of a node in the visual layout
 * Returns { row, col } for grid-based positioning
 */
export function getNodePosition(
  node: ProgressionNode,
  allNodes: ProgressionNode[],
): { row: number; col: number } {
  // Diatonic chords go in the center rows
  if (node.category === 'diatonic') {
    // Map roman numerals to positions
    const diatonicPositions: Record<string, { row: number; col: number }> = {
      // Row 1: vi, ii, iii
      vi: { row: 1, col: 0 },
      ii: { row: 1, col: 1 },
      iii: { row: 1, col: 2 },
      // Row 2: IV, I, V
      IV: { row: 2, col: 0 },
      I: { row: 2, col: 1 },
      V: { row: 2, col: 2 },
      // Row 3: vii°
      'vii°': { row: 3, col: 1 },
      // Minor key equivalents
      i: { row: 2, col: 1 },
      'ii°': { row: 1, col: 1 },
      III: { row: 1, col: 2 },
      iv: { row: 2, col: 0 },
      v: { row: 2, col: 2 },
      VI: { row: 1, col: 0 },
      VII: { row: 3, col: 1 },
    }

    return diatonicPositions[node.romanNumeral] || { row: 2, col: 1 }
  }

  // Secondary dominants go in row 0
  if (node.category === 'secondary-dominant') {
    const secDomNodes = allNodes.filter(
      (n) => n.category === 'secondary-dominant',
    )
    const idx = secDomNodes.indexOf(node)
    return { row: 0, col: idx }
  }

  // Diminished passing chords go in row 4
  if (node.category === 'diminished-passing') {
    const dimNodes = allNodes.filter((n) => n.category === 'diminished-passing')
    const idx = dimNodes.indexOf(node)
    return { row: 4, col: idx }
  }

  // Borrowed chords also go in row 4
  return { row: 4, col: 3 }
}

/**
 * Get edges that connect to a specific node
 */
export function getNodeEdges(
  nodeId: string,
  edges: ProgressionEdge[],
): { incoming: ProgressionEdge[]; outgoing: ProgressionEdge[] } {
  return {
    incoming: edges.filter((e) => e.to === nodeId),
    outgoing: edges.filter((e) => e.from === nodeId),
  }
}

/**
 * Get suggested next chords from a given chord
 * Returns nodes sorted by transition strength
 */
export function getSuggestedNextChords(
  currentNodeId: string,
  map: ProgressionMap,
): Array<{ node: ProgressionNode; strength: number }> {
  const outgoingEdges = map.edges.filter((e) => e.from === currentNodeId)

  return outgoingEdges
    .map((edge) => ({
      node: map.nodes.find((n) => n.id === edge.to)!,
      strength: edge.strength,
    }))
    .filter((item) => item.node) // Filter out any undefined
    .sort((a, b) => b.strength - a.strength)
}

/**
 * Validate a chord progression path
 * Returns total strength and any weak transitions
 */
export function validateProgression(
  nodeIds: string[],
  map: ProgressionMap,
): {
  totalStrength: number
  averageStrength: number
  weakTransitions: Array<{ from: string; to: string; strength: number }>
} {
  const weakTransitions: Array<{ from: string; to: string; strength: number }> =
    []
  let totalStrength = 0

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const from = nodeIds[i]
    const to = nodeIds[i + 1]

    const edge = map.edges.find((e) => e.from === from && e.to === to)
    const strength = edge?.strength || 0

    totalStrength += strength

    if (strength < 0.3) {
      weakTransitions.push({ from, to, strength })
    }
  }

  return {
    totalStrength,
    averageStrength:
      nodeIds.length > 1 ? totalStrength / (nodeIds.length - 1) : 0,
    weakTransitions,
  }
}

// ============================================================================
// DAG (Directed Acyclic Graph) Functions
// ============================================================================

/**
 * Determine the harmonic movement type of a transition
 * This tells us WHERE the progression is going functionally
 */
export function getHarmonicMovement(
  _fromNode: ProgressionNode,
  toNode: ProgressionNode,
): HarmonicMovement {
  // The movement type is determined by the DESTINATION's function
  // - Moving TO a tonic chord = resolution
  // - Moving TO a dominant chord = building tension
  // - Moving TO a subdominant chord = departure/exploration

  // Defensive: if toNode or its function is missing, default to subdominant
  // This can happen with synthetic candidates from the statistical model
  const harmonicFn = toNode?.function ?? 'subdominant'
  return `to-${harmonicFn}` as HarmonicMovement
}

/**
 * Get color for harmonic movement (for visualization)
 */
export function getHarmonicMovementColor(movement: HarmonicMovement): string {
  switch (movement) {
    case 'to-tonic':
      return '#3b82f6' // Blue - resolution
    case 'to-dominant':
      return '#f97316' // Orange - tension
    case 'to-subdominant':
      return '#22c55e' // Green - departure
    default:
      return '#94a3b8' // Gray fallback
  }
}

/**
 * Get label for harmonic movement (for tooltips)
 */
export function getHarmonicMovementLabel(movement: HarmonicMovement): string {
  switch (movement) {
    case 'to-tonic':
      return 'Resolution (to tonic)'
    case 'to-dominant':
      return 'Tension (to dominant)'
    case 'to-subdominant':
      return 'Departure (to subdominant)'
    default:
      return 'Movement'
  }
}
