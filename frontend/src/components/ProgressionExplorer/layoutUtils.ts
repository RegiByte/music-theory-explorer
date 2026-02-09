import { toReactFlowEdge, toReactFlowNode } from '@/core/trunkLayout'
import ELK from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

export const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '80',
  'elk.layered.considerModelOrder': 'true',
  'elk.layered.crossingMinimization.semiInteractive': 'true',
} as const

export const getLayoutedElements = async (
  nodes: ReturnType<typeof toReactFlowNode>[],
  edges: ReturnType<typeof toReactFlowEdge>[],
) => {
  const orderedNodes = [...nodes].sort((a, b) => {
    const aTrunk = a.data?.trunkId ?? 0
    const bTrunk = b.data?.trunkId ?? 0
    if (aTrunk !== bTrunk) return aTrunk - bTrunk
    const aDepth = a.data?.depth ?? 0
    const bDepth = b.data?.depth ?? 0
    if (aDepth !== bDepth) return aDepth - bDepth
    return a.id.localeCompare(b.id)
  })

  const graph = {
    id: 'root',
    layoutOptions: elkOptions,
    children: orderedNodes.map((node) => ({
      ...node,
      targetPosition: 'left',
      sourcePosition: 'right',
      width: node.data?.isRoot ? 96 : 116,
      height: node.data?.isRoot ? 96 : 75,
    })),
    edges,
  }

  const layoutedGraph = await elk.layout(graph)
  const layoutedNodes =
    layoutedGraph.children?.map((node) => ({
      ...node,
      position: { x: node.x ?? 0, y: node.y ?? 0 },
    })) ?? nodes

  const rootNode = layoutedNodes.find((node) => node.data?.isRoot)
  const rootX = rootNode?.position?.x ?? 0
  const rootY = rootNode?.position?.y ?? 0

  const centeredNodes = layoutedNodes.map((node) => ({
    ...node,
    position: {
      x: (node.position?.x ?? 0) - rootX,
      y: (node.position?.y ?? 0) - rootY,
    },
  }))

  const laneGap = 120
  const trunkIds = Array.from(
    new Set(
      centeredNodes
        .map((node) => node.data?.trunkId)
        .filter((id) => id !== undefined && id >= 0),
    ),
  ).sort((a, b) => a - b)
  const trunkIndex = new Map(trunkIds.map((id, idx) => [id, idx]))
  const trunkMid = trunkIds.length > 0 ? Math.floor(trunkIds.length / 2) : 0

  const lanedNodes = centeredNodes.map((node) => {
    if (node.data?.isRoot) {
      return node
    }
    const trunkId = node.data?.trunkId
    if (trunkId === undefined || trunkId < 0) {
      return node
    }
    const laneIdx = trunkIndex.get(trunkId) ?? 0
    return {
      ...node,
      position: {
        x: node.position?.x ?? 0,
        y: (laneIdx - trunkMid) * laneGap,
      },
    }
  })

  return {
    nodes: lanedNodes,
    edges: layoutedGraph.edges ?? edges,
  }
}
