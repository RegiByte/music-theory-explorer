import '@xyflow/react/dist/style.css'
import { useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type ReactFlowInstance,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react'
import ELK from 'elkjs/lib/elk.bundled.js'
import { useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GenrePicker } from '@/components/pickers'
import { GENRE_DISPLAY } from '@/core/musicData'
import { usePlayChord } from '@/hooks/usePlayChord'
import type { Genre } from '@/schemas'
import { GravityEdge } from './GravityEdge'
import { GravityNode } from './GravityNode'
import {
  MOVEMENT_COLORS,
  classifyMovement,
  computeNodeSize,
  buildGravityEdges,
} from './graphUtils'

const elk = new ELK()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const edgeTypes = { gravityEdge: GravityEdge as any }
const nodeTypes = { gravityNode: GravityNode }

// ─── Main Component ───────────────────────────────────────────────────────────

export function GCentricUniverse() {
  const { t } = useTranslation('tools')
  const [genre, setGenre] = useState<Genre>('rock')
  const [topN, setTopN] = useState(20)
  const [edgeThreshold, setEdgeThreshold] = useState(0.02)
  const [hoveredChord, setHoveredChord] = useState<string | null>(null)
  const [layouted, setLayouted] = useState<{ nodes: Node[]; edges: Edge[] }>({
    nodes: [],
    edges: [],
  })
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null)
  const [loading, setLoading] = useState(true)

  const recommender = useResource('recommender')
  const { playChordBySymbol: playChord } = usePlayChord()

  // Load data and compute layout
  useEffect(() => {
    let cancelled = false
    async function compute() {
      setLoading(true)
      const [frequencies, transitions] = await Promise.all([
        recommender.getChordFrequencies(genre),
        recommender.getTransitionMatrix(genre),
      ])

      if (cancelled) return

      const topChords = Object.entries(frequencies)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([chord]) => chord)

      const topSet = new Set(topChords)
      const maxFreq = Math.max(...topChords.map((c) => frequencies[c] || 0))

      // Build nodes
      const rawNodes: Node[] = topChords.map((chord) => ({
        id: chord,
        type: 'gravityNode',
        position: { x: 0, y: 0 },
        data: {
          chord,
          frequency: frequencies[chord] || 0,
          maxFrequency: maxFreq,
          isHighlighted: false,
          onPlay: playChord,
          onHover: setHoveredChord,
        },
      }))

      // Build deduplicated edges
      const edgeMap = new Map<
        string,
        { from: string; to: string; prob: number }
      >()
      for (const from of topChords) {
        const trans = transitions[from] || {}
        for (const [to, prob] of Object.entries(trans)) {
          if (!topSet.has(to) || prob < edgeThreshold || from === to) continue
          const key = [from, to].sort().join('|')
          const existing = edgeMap.get(key)
          if (!existing || prob > existing.prob) {
            edgeMap.set(key, { from, to, prob })
          }
        }
      }

      // Compute node sizes for layout
      const nodeSizes: Record<string, number> = {}
      topChords.forEach((c) => {
        nodeSizes[c] = computeNodeSize(frequencies[c] || 0, maxFreq)
      })

      try {
        const graph = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': 'stress',
            'elk.stress.desiredEdgeLength': '180',
            'elk.spacing.nodeNode': '100',
            'elk.stress.epsilon': '0.001',
            'elk.stress.iterationLimit': '500',
          },
          children: rawNodes.map((n) => ({
            id: n.id,
            width: nodeSizes[n.id],
            height: nodeSizes[n.id],
          })),
          edges: Array.from(edgeMap.values()).map(({ from, to }, i) => ({
            id: `elk-${i}`,
            sources: [from],
            targets: [to],
          })),
        }

        const layoutResult = await elk.layout(graph)
        if (cancelled) return

        // Build position map from layout
        const posMap: Record<string, { x: number; y: number }> = {}
        for (const child of layoutResult.children ?? []) {
          posMap[child.id] = { x: child.x ?? 0, y: child.y ?? 0 }
        }

        const laidOutNodes = rawNodes.map((node) => ({
          ...node,
          position: posMap[node.id] ?? { x: 0, y: 0 },
        }))

        const laidOutEdges = buildGravityEdges(edgeMap, nodeSizes, {
          includeMarker: true,
        })

        setLayouted({ nodes: laidOutNodes, edges: laidOutEdges })
      } catch {
        // Fallback: circular layout
        const angleStep = (2 * Math.PI) / topChords.length
        const radius = topChords.length * 25
        const fallbackNodes = rawNodes.map((node, i) => ({
          ...node,
          position: {
            x: radius * Math.cos(i * angleStep),
            y: radius * Math.sin(i * angleStep),
          },
        }))
        const fallbackEdges = buildGravityEdges(edgeMap, nodeSizes, {
          includeMarker: false,
        })
        setLayouted({ nodes: fallbackNodes, edges: fallbackEdges })
      }

      setLoading(false)
    }

    compute()
    return () => {
      cancelled = true
    }
  }, [genre, topN, edgeThreshold, recommender, playChord])

  // Node highlighting on hover
  const displayNodes = useMemo(() => {
    if (!hoveredChord) return layouted.nodes

    const connectedChords = new Set<string>()
    connectedChords.add(hoveredChord)
    for (const edge of layouted.edges) {
      if (edge.source === hoveredChord) connectedChords.add(edge.target)
      if (edge.target === hoveredChord) connectedChords.add(edge.source)
    }

    return layouted.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: connectedChords.has(node.id),
        onPlay: playChord,
        onHover: setHoveredChord,
      },
      style: {
        ...node.style,
        opacity: connectedChords.has(node.id) ? 1 : 0.25,
      },
    }))
  }, [layouted.nodes, layouted.edges, hoveredChord, playChord])

  // Edge coloring on hover
  const displayEdges = useMemo(() => {
    if (!hoveredChord) return layouted.edges

    return layouted.edges.map((edge) => {
      const isFromHovered = edge.source === hoveredChord
      const isToHovered = edge.target === hoveredChord
      const connected = isFromHovered || isToHovered

      if (!connected) {
        return {
          ...edge,
          style: { ...edge.style, opacity: 0.04 },
          markerEnd: undefined,
        }
      }

      const from = isFromHovered ? edge.source : edge.target
      const to = isFromHovered ? edge.target : edge.source
      const movement = classifyMovement(from, to)
      const color = MOVEMENT_COLORS[movement]
      const prob = (edge.data as Record<string, unknown>)?.probability as number ?? 0

      return {
        ...edge,
        style: {
          stroke: color,
          strokeWidth: Math.max(2, prob * 12),
          opacity: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color,
        },
      }
    })
  }, [layouted.edges, hoveredChord])

  // Fit view on layout change
  useEffect(() => {
    if (reactFlowInstance && layouted.nodes.length > 0 && !loading) {
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({ padding: 0.15 })
      })
    }
  }, [layouted.nodes.length, reactFlowInstance, loading])

  // Hover info
  const hoveredInfo = useMemo(() => {
    if (!hoveredChord) return null
    const node = layouted.nodes.find((n) => n.id === hoveredChord)
    if (!node) return null
    const freq = (node.data as Record<string, unknown>).frequency as number
    const connectedEdges = layouted.edges.filter(
      (e) => e.source === hoveredChord || e.target === hoveredChord,
    )
    const topConnections = connectedEdges
      .map((e) => {
        const other = e.source === hoveredChord ? e.target : e.source
        const prob = (e.data as Record<string, unknown>)?.probability as number ?? 0
        const movement = classifyMovement(hoveredChord, other)
        return { chord: other, probability: prob, movement }
      })
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5)

    return { chord: hoveredChord, frequency: freq, topConnections }
  }, [hoveredChord, layouted])

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-xl font-semibold">{t('gCentricUniverse.title')}</h3>
        <div className="flex gap-2 items-center flex-wrap">
          <GenrePicker value={genre} onValueChange={setGenre} size="xs" />
          <div className="flex gap-1">
            {[15, 20, 25].map((n) => (
              <Button
                key={n}
                variant={topN === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopN(n)}
                className="text-xs"
              >
                {n}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">
              {t('gCentricUniverse.edgeCutoff')}
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={edgeThreshold * 100}
              onChange={(e) => setEdgeThreshold(Number(e.target.value) / 100)}
              className="w-20"
            />
            <span className="text-xs font-mono text-gray-600">
              {(edgeThreshold * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-200">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {t('gCentricUniverse.computing')}
          </div>
        ) : (
          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            minZoom={0.3}
            maxZoom={3}
            onInit={setReactFlowInstance}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>

      {/* Hover info panel */}
      <div className="min-h-[48px] mt-2 flex items-center">
        {hoveredInfo ? (
          <div className="text-sm text-gray-700">
            <strong>{hoveredInfo.chord}</strong>:{' '}
            <span className="font-mono">
              {(hoveredInfo.frequency * 100).toFixed(1)}%
            </span>{' '}
            {t('gCentricUniverse.ofSongs', { genre: GENRE_DISPLAY[genre] })}
            {hoveredInfo.topConnections.length > 0 && (
              <span className="ml-3 text-gray-500">
                {t('gCentricUniverse.top')}{' '}
                {hoveredInfo.topConnections.map((c, i) => (
                  <span key={c.chord}>
                    {i > 0 && ', '}
                    <span
                      style={{
                        color: MOVEMENT_COLORS[c.movement],
                        fontWeight: 600,
                      }}
                    >
                      {c.chord}
                    </span>{' '}
                    ({(c.probability * 100).toFixed(0)}%)
                  </span>
                ))}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {t('gCentricUniverse.hoverHint')}
          </p>
        )}
      </div>

      {/* Movement legend */}
      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
        <span className="font-medium text-gray-600">
          {t('gCentricUniverse.onHover')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{
              backgroundColor: MOVEMENT_COLORS.resolution,
              display: 'inline-block',
            }}
          />
          {t('gCentricUniverse.resolution')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{
              backgroundColor: MOVEMENT_COLORS.tension,
              display: 'inline-block',
            }}
          />
          {t('gCentricUniverse.tension')}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-0.5 rounded"
            style={{
              backgroundColor: MOVEMENT_COLORS.departure,
              display: 'inline-block',
            }}
          />
          {t('gCentricUniverse.departure')}
        </span>
      </div>

      <div className="mt-3 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <p
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: t('gCentricUniverse.nodeSizeDescription', {
              genre: GENRE_DISPLAY[genre],
            })
              .replace(
                /<blue>/g,
                `<span style="color: ${MOVEMENT_COLORS.resolution}; font-weight: 600;">`,
              )
              .replace(/<\/blue>/g, '</span>')
              .replace(
                /<orange>/g,
                `<span style="color: ${MOVEMENT_COLORS.tension}; font-weight: 600;">`,
              )
              .replace(/<\/orange>/g, '</span>')
              .replace(
                /<green>/g,
                `<span style="color: ${MOVEMENT_COLORS.departure}; font-weight: 600;">`,
              )
              .replace(/<\/green>/g, '</span>'),
          }}
        />
      </div>
    </Card>
  )
}
