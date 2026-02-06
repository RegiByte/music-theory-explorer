import type { TrunkNode, TrunkEdge } from '@/schemas'

export const LAYOUT_CONSTANTS = {
  HORIZONTAL_SPACING: 200, // Distance between depth levels
  VERTICAL_SPACING: 120, // Base vertical spacing
  DIAGONAL_OFFSET: 60, // Vertical offset per depth for diagonals
  ROOT_X: 100, // Starting X position
  ROOT_Y: 400, // Center Y position (for 800px height)
}

/**
 * Calculate position for a trunk node
 * Layout strategy:
 * - Root at (ROOT_X, ROOT_Y)
 * - Trunk 0 (top): diagonal upward
 * - Trunk 1 (middle): straight horizontal
 * - Trunk 2 (bottom): diagonal downward
 */
export function calculateNodePosition(node: TrunkNode): {
  x: number
  y: number
} {
  const { ROOT_X, ROOT_Y, HORIZONTAL_SPACING, DIAGONAL_OFFSET } =
    LAYOUT_CONSTANTS

  // Root node
  if (node.isRoot) {
    return { x: ROOT_X, y: ROOT_Y }
  }

  const x = ROOT_X + node.depth * HORIZONTAL_SPACING

  // Calculate Y based on trunk
  let y = ROOT_Y

  if (node.trunkId === 0) {
    // Top trunk: diagonal upward
    y = ROOT_Y - node.depth * DIAGONAL_OFFSET
  } else if (node.trunkId === 1) {
    // Middle trunk: straight
    y = ROOT_Y
  } else if (node.trunkId === 2) {
    // Bottom trunk: diagonal downward
    y = ROOT_Y + node.depth * DIAGONAL_OFFSET
  }

  return { x, y }
}

/**
 * Convert TrunkNode to React Flow node format
 */
export function toReactFlowNode(
  trunkNode: TrunkNode,
  isSelected: boolean = false,
  showExpand: boolean = false,
): any {
  const position = calculateNodePosition(trunkNode)

  return {
    id: trunkNode.id,
    type: 'chordNode', // Custom node type
    position,
    data: {
      chordId: trunkNode.chordId,
      trunkId: trunkNode.trunkId,
      depth: trunkNode.depth,
      isLeaf: trunkNode.isLeaf,
      isRoot: trunkNode.isRoot,
      isTrunkHead: trunkNode.isTrunkHead,
      isSelected,
      showExpand,
      onPlay: undefined,
      onExpand: undefined,
    },
  }
}

/**
 * Convert TrunkEdge to React Flow edge format
 */
export function toReactFlowEdge(trunkEdge: TrunkEdge): any {
  return {
    id: trunkEdge.id,
    source: trunkEdge.source,
    target: trunkEdge.target,
    type: 'harmonicEdge', // Custom edge type
    animated: false,
    data: {
      harmonicMovement: trunkEdge.harmonicMovement,
      strength: trunkEdge.strength,
      isChromatic: trunkEdge.isChromatic,
      matchedProgressions: trunkEdge.matchedProgressions,
    },
  }
}
