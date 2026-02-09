import { type Edge, MarkerType } from '@xyflow/react'

export const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

export const MOVEMENT_COLORS = {
  resolution: '#3b82f6',
  tension: '#f97316',
  departure: '#22c55e',
  neutral: 'rgba(148, 163, 184, 0.35)',
}

export function extractRoot(chord: string): string | null {
  const match = chord.match(/^([A-G][#b]?)/)
  return match ? match[1] : null
}

export function classifyMovement(
  fromChord: string,
  toChord: string,
): 'resolution' | 'tension' | 'departure' {
  const fromRoot = extractRoot(fromChord)
  const toRoot = extractRoot(toChord)
  if (!fromRoot || !toRoot) return 'departure'

  const fromIdx = NOTE_INDEX[fromRoot]
  const toIdx = NOTE_INDEX[toRoot]
  if (fromIdx === undefined || toIdx === undefined) return 'departure'

  const interval = (((toIdx - fromIdx) % 12) + 12) % 12

  if (interval === 7) return 'tension'
  if (interval === 5) return 'resolution'
  if (interval === 1) return 'resolution'
  if (interval === 6) return 'tension'
  return 'departure'
}

export function computeNodeSize(frequency: number, maxFreq: number): number {
  const relSize = Math.max(0.4, frequency / Math.max(maxFreq, 0.001))
  return 30 + relSize * 30
}

/** Shared edge builder — used by both the ELK layout path and the fallback circular layout */
export function buildGravityEdges(
  edgeMap: Map<string, { from: string; to: string; prob: number }>,
  nodeSizes: Record<string, number>,
  options?: { includeMarker?: boolean },
): Edge[] {
  const includeMarker = options?.includeMarker ?? true
  return Array.from(edgeMap.values()).map(({ from, to, prob }) => ({
    id: `${from}->${to}`,
    source: from,
    target: to,
    sourceHandle: 'center',
    targetHandle: 'center-target',
    type: 'gravityEdge',
    animated: false,
    data: {
      probability: prob,
      from,
      to,
      sourceRadius: nodeSizes[from] / 2,
      targetRadius: nodeSizes[to] / 2,
    },
    style: {
      stroke: MOVEMENT_COLORS.neutral,
      strokeWidth: Math.max(1, prob * 10),
      opacity: 0.5,
    },
    ...(includeMarker
      ? {
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 10,
            height: 10,
            color: MOVEMENT_COLORS.neutral,
          },
        }
      : {}),
  }))
}
