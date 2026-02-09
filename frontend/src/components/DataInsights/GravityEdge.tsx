import { BaseEdge, getStraightPath } from '@xyflow/react'

interface GravityEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  style?: React.CSSProperties
  markerEnd?: string
  data?: {
    sourceRadius?: number
    targetRadius?: number
    probability?: number
    from?: string
    to?: string
    [key: string]: unknown
  }
}

/**
 * Custom edge that connects at the exact circle perimeters.
 *
 * sourceX/sourceY and targetX/targetY come from the center handles,
 * so they represent node centers. We offset each endpoint outward
 * along the center-to-center line by the node's radius, producing
 * an edge that starts and ends precisely at the circle boundary.
 */
export function GravityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: GravityEdgeProps) {
  const sourceRadius: number = data?.sourceRadius ?? 0
  const targetRadius: number = data?.targetRadius ?? 0

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy) || 1

  // Unit vector from source center to target center
  const ux = dx / len
  const uy = dy / len

  // Offset start/end to circle perimeters (with breathing room on the target)
  const arrowGap = 4
  const sx = sourceX + ux * sourceRadius
  const sy = sourceY + uy * sourceRadius
  const tx = targetX - ux * (targetRadius + arrowGap)
  const ty = targetY - uy * (targetRadius + arrowGap)

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  })

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={{ ...style, strokeLinecap: 'round' }}
    />
  )
}
