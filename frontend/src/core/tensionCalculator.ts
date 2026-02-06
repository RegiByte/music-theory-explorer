import type { Chord, Note, HarmonicFunction } from '@/schemas'

/**
 * Calculate tension level of a chord in context
 * Returns 0-1 where 0 = stable/resolved, 1 = maximum tension
 * 
 * Components:
 * - Base tension by harmonic function (tonic=0, subdominant=0.3, dominant=0.7)
 * - Chord quality adjustments (dom7, dim7, aug add tension)
 * - Harmonic distance contribution (chromatic notes add tension)
 */
export function calculateTensionLevel(
  chord: Chord,
  _key: Note,
  harmonicFunction: HarmonicFunction,
  harmonicDistance: number
): number {
  let tension = 0
  
  // Base tension by function
  switch (harmonicFunction) {
    case 'tonic':
      tension = 0.0
      break
    case 'subdominant':
      tension = 0.3
      break
    case 'dominant':
      tension = 0.7
      break
  }
  
  // Adjust for chord quality
  if (chord.quality === 'dominant7') {
    tension += 0.2
  }
  if (chord.quality === 'diminished7' || chord.quality === 'diminished') {
    tension += 0.3
  }
  if (chord.quality === 'augmented') {
    tension += 0.25
  }
  if (chord.quality === 'half_diminished7') {
    tension += 0.2
  }
  
  // Adjust for harmonic distance (chromatic notes add tension)
  tension += harmonicDistance * 0.1
  
  return Math.min(tension, 1.0)
}

/**
 * Calculate tension delta between two chords
 * Positive = increasing tension, Negative = resolution
 */
export function calculateTensionDelta(
  fromTension: number,
  toTension: number
): number {
  return toTension - fromTension
}

/**
 * Calculate bonus for tension arc appropriateness
 * Rewards resolution and appropriate tension building
 */
export function calculateTensionArcBonus(
  pathLength: number,
  tensionDelta: number
): number {
  // Reward resolution (tension decreasing)
  if (tensionDelta < 0) {
    return Math.abs(tensionDelta) * 0.2
  }
  
  // Reward building tension early in progression
  if (tensionDelta > 0 && pathLength < 3) {
    return tensionDelta * 0.1
  }
  
  return 0
}

/**
 * Get tension level label for UI
 */
export function getTensionLabel(tensionLevel: number): string {
  if (tensionLevel < 0.2) return 'Stable'
  if (tensionLevel < 0.4) return 'Mild'
  if (tensionLevel < 0.6) return 'Moderate'
  if (tensionLevel < 0.8) return 'High'
  return 'Maximum'
}

/**
 * Get tension delta label for UI
 */
export function getTensionDeltaLabel(tensionDelta: number): string {
  if (Math.abs(tensionDelta) < 0.1) return 'Stable'
  if (tensionDelta > 0) return 'Building'
  return 'Resolving'
}

/**
 * Get color for tension level visualization
 */
export function getTensionColor(tensionLevel: number): string {
  if (tensionLevel < 0.2) return '#10b981' // Green - stable
  if (tensionLevel < 0.4) return '#84cc16' // Lime
  if (tensionLevel < 0.6) return '#eab308' // Yellow
  if (tensionLevel < 0.8) return '#f97316' // Orange
  return '#ef4444' // Red - maximum tension
}
