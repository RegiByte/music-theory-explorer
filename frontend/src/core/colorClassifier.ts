import { noteToIndex } from './musicTheory'
import { SCALE_PATTERNS } from '@/constants'
import type { ProgressionNode, Note, ScaleType, ColorClass } from '@/schemas'

/**
 * Classify a chord's color based on music theory
 * Priority order: diminished_passing > secondary_dominant > borrowed > diatonic > chromatic_other
 */
export function classifyColor(
  node: ProgressionNode,
  key: Note,
  scaleType: ScaleType
): ColorClass {
  if (isDiminishedPassing(node, key)) return 'diminished_passing'
  if (isSecondaryDominant(node, key, scaleType)) return 'secondary_dominant'
  if (isBorrowed(node, key, scaleType)) return 'borrowed'
  if (isDiatonic(node, key, scaleType)) return 'diatonic'
  return 'chromatic_other'
}

/**
 * Check if a chord is diatonic (all notes in the scale)
 */
export function isDiatonic(
  node: ProgressionNode,
  key: Note,
  scaleType: ScaleType
): boolean {
  const scalePattern = getScalePattern(scaleType)
  const keyIndex = noteToIndex(key)
  
  // Check if all chord tones are in the scale
  for (const note of node.chord.notes) {
    const interval = (noteToIndex(note) - keyIndex + 12) % 12
    if (!scalePattern.includes(interval)) {
      return false
    }
  }
  
  return true
}

/**
 * Check if a chord is a secondary dominant (V/x)
 * Detects:
 * - Roman numerals with V/ pattern
 * - Dominant 7th chords with chromatic roots
 */
export function isSecondaryDominant(
  node: ProgressionNode,
  key: Note,
  scaleType: ScaleType
): boolean {
  // Check roman numeral pattern
  if (node.romanNumeral.includes('V/')) {
    return true
  }
  
  // Check if it's a dominant 7th chord with chromatic root
  if (node.chord.quality === 'dominant7') {
    const scalePattern = getScalePattern(scaleType)
    const keyIndex = noteToIndex(key)
    const rootInterval = (noteToIndex(node.chord.root) - keyIndex + 12) % 12
    
    // If root is chromatic (not in scale), it's likely a secondary dominant
    return !scalePattern.includes(rootInterval)
  }
  
  return false
}

/**
 * Check if a chord is borrowed from parallel mode (modal interchange)
 * Example: Fm in C major (borrowed from C minor)
 */
export function isBorrowed(
  node: ProgressionNode,
  key: Note,
  scaleType: ScaleType
): boolean {
  // Get current and parallel scale patterns
  const currentScale = getScalePattern(scaleType)
  const parallelScale = getScalePattern(scaleType === 'major' ? 'minor' : 'major')
  
  const keyIndex = noteToIndex(key)
  
  // Check if chord contains notes from parallel scale but not current scale
  for (const note of node.chord.notes) {
    const interval = (noteToIndex(note) - keyIndex + 12) % 12
    
    // Note is in parallel scale but NOT in current scale
    if (parallelScale.includes(interval) && !currentScale.includes(interval)) {
      return true
    }
  }
  
  return false
}

/**
 * Check if a chord is a diminished passing chord
 * Typically dim7 chords with chromatic roots that resolve by half-step
 */
export function isDiminishedPassing(
  node: ProgressionNode,
  key: Note
): boolean {
  // Check if it's a diminished 7th chord
  if (node.chord.quality !== 'diminished7' && node.chord.quality !== 'diminished') {
    return false
  }
  
  // Check if roman numeral indicates passing function
  if (node.romanNumeral.includes('°') || node.romanNumeral.includes('dim')) {
    return true
  }
  
  // Check if root is chromatic (not in major scale - most common context)
  const scalePattern = SCALE_PATTERNS.major
  const keyIndex = noteToIndex(key)
  const rootInterval = (noteToIndex(node.chord.root) - keyIndex + 12) % 12
  
  return !(scalePattern as readonly number[]).includes(rootInterval)
}

/**
 * Get color-specific weights for scoring
 * Returns pattern weight, transition weight, and color bonus
 */
export function getColorWeights(colorClass: ColorClass): {
  patternWeight: number
  transitionWeight: number
  colorBonus: number
} {
  switch (colorClass) {
    case 'diatonic':
      // Balanced weighting, strong bonus
      return { patternWeight: 0.5, transitionWeight: 0.5, colorBonus: 0.3 }
    
    case 'secondary_dominant':
      // Rely more on context (transition) than patterns
      return { patternWeight: 0.3, transitionWeight: 0.7, colorBonus: 0.1 }
    
    case 'borrowed':
      // Emotional impact - moderate weighting
      return { patternWeight: 0.4, transitionWeight: 0.6, colorBonus: 0.15 }
    
    case 'diminished_passing':
      // Pure voice-leading function - transition dominates
      return { patternWeight: 0.2, transitionWeight: 0.8, colorBonus: 0.0 }
    
    case 'chromatic_other':
      // Exotic - needs strong transition justification
      return { patternWeight: 0.2, transitionWeight: 0.8, colorBonus: 0.0 }
  }
}

/**
 * Get scale pattern for a scale type
 */
function getScalePattern(scaleType: ScaleType): readonly number[] {
  return SCALE_PATTERNS[scaleType] || SCALE_PATTERNS.major
}

/**
 * Get color for UI display
 */
export function getColorClassColor(colorClass: ColorClass): string {
  switch (colorClass) {
    case 'diatonic':
      return '#10b981' // Green
    case 'secondary_dominant':
      return '#f59e0b' // Amber
    case 'borrowed':
      return '#8b5cf6' // Purple
    case 'diminished_passing':
      return '#ef4444' // Red
    case 'chromatic_other':
      return '#6b7280' // Gray
  }
}

/**
 * Get human-readable label for color class
 */
export function getColorClassLabel(colorClass: ColorClass): string {
  switch (colorClass) {
    case 'diatonic':
      return 'Diatonic'
    case 'secondary_dominant':
      return 'Secondary Dominant'
    case 'borrowed':
      return 'Borrowed'
    case 'diminished_passing':
      return 'Diminished Passing'
    case 'chromatic_other':
      return 'Chromatic'
  }
}
