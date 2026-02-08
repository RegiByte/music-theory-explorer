import { CompactVoicingSelector } from '@/components/CompactVoicingSelector'
import { GenrePicker, NotePicker, ScalePicker } from '@/components/pickers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { findChordVoicings } from '@/core/chords'
import {
  displayChordId,
  enharmonicChordEqual,
  normalizeChordId,
  type NotationPreference,
} from '@/core/enharmonic'
import { toReactFlowEdge, toReactFlowNode } from '@/core/trunkLayout'
import type {
  ChordVoicing,
  Genre,
  Note,
  ProgressionMap,
  ScaleType,
  TrunkNode,
} from '@/schemas'
import { useResource } from '@/system'
import type { FavoritesStoreApi } from '@/system/favoritesResource'
import type { SavedProgression } from '@/system/favoritesResource'
import type { ProgressionExplorerStore } from '@/system/progressionExplorerResource'
import {
  Background,
  Controls,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import ELK from 'elkjs/lib/elk.bundled.js'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ChordNode } from './ChordNode'
import { HarmonicEdge } from './HarmonicEdge'

const elk = new ELK()
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '80',
  'elk.layered.considerModelOrder': 'true',
  'elk.layered.crossingMinimization.semiInteractive': 'true',
} as const

const nodeTypes = {
  chordNode: ChordNode,
}

const edgeTypes = {
  harmonicEdge: HarmonicEdge,
}

const getLayoutedElements = async (
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

export function ProgressionExplorerRoot() {
  const audio = useResource('audio')
  const explorer = useResource(
    'progressionExplorer',
  ) as ProgressionExplorerStore
  const favorites = useResource('favorites') as FavoritesStoreApi
  const { t } = useTranslation('tools')
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null)

  // Loaded saved progression (bypasses the explorer tree)
  const [loadedProgression, setLoadedProgression] =
    useState<SavedProgression | null>(null)

  const state = useSyncExternalStore(
    explorer.subscribe,
    explorer.getState,
    explorer.getState,
  )

  const favoritesState = useSyncExternalStore(
    favorites.subscribe,
    favorites.getState,
    favorites.getState,
  )

  const {
    key,
    scaleType,
    selectedGenre,
    notationPreference,
    map,
    trunkNodes,
    trunkEdges,
    nodeCandidates,
    nodeCandidatesV2,
    genreCandidates,
    nodeRegistry,
    mutedNodes,
    practiceMode,
    practicePathNodeId,
    initialize,
    setGenre,
    setNotationPreference,
    expandNode,
    selectCandidate,
    deleteNode,
    toggleMute,
    enterPracticeMode,
    exitPracticeMode,
  } = state

  const handlePlayChord = useCallback(
    (chordId: string) => {
      if (!map) return
      // Check registry first (covers synthetic chords), then fall back to map
      const node =
        nodeRegistry[chordId] ?? map.nodes.find((n) => n.id === chordId)
      if (!node) return

      const voicings = findChordVoicings(node.chord)
      if (voicings.length > 0) {
        const frequencies = voicings[0].positions.map((p) => p.frequency)
        audio.playChord(frequencies, 0.8)
      }
    },
    [map, nodeRegistry, audio],
  )

  const flowNodes = useMemo(() => {
    return trunkNodes.map((node) => {
      const flowNode = toReactFlowNode(node, false, node.isLeaf)
      flowNode.data.isMuted = mutedNodes.has(node.id)
      flowNode.data.onPlay = () => handlePlayChord(node.chordId)
      flowNode.data.onPlayChord = handlePlayChord
      flowNode.data.onExpand = node.isLeaf
        ? () => expandNode(node.id)
        : undefined
      flowNode.data.onDelete = !node.isRoot
        ? () => deleteNode(node.id)
        : undefined
      flowNode.data.onMute = !node.isRoot
        ? () => toggleMute(node.id)
        : undefined
      flowNode.data.onPractice = node.isLeaf
        ? () => enterPracticeMode(node.id)
        : undefined
      flowNode.data.candidates = nodeCandidates[node.id] || []
      flowNode.data.categorizedCandidates = nodeCandidatesV2[node.id] || null
      flowNode.data.genreCandidates = genreCandidates[node.id] || null
      flowNode.data.notationPreference = notationPreference
      flowNode.data.mapKey = key
      flowNode.data.scaleType = scaleType
      flowNode.data.onSelectCandidate = node.isLeaf
        ? (chordId: string) => selectCandidate(node.id, chordId)
        : undefined
      flowNode.data.selectedGenre = selectedGenre
      flowNode.data.onGenreChange = setGenre
      return flowNode
    })
  }, [
    trunkNodes,
    nodeCandidates,
    nodeCandidatesV2,
    genreCandidates,
    mutedNodes,
    notationPreference,
    key,
    scaleType,
    selectedGenre,
    expandNode,
    selectCandidate,
    deleteNode,
    toggleMute,
    enterPracticeMode,
    setGenre,
    handlePlayChord,
  ])

  const flowEdges = useMemo(() => {
    return trunkEdges.map((edge) => toReactFlowEdge(edge))
  }, [trunkEdges])

  const [layoutedNodes, setLayoutedNodes] = useState(flowNodes)
  const [layoutedEdges, setLayoutedEdges] = useState(flowEdges)

  // Track node structure (not data) to avoid re-layout on candidate changes
  const nodeStructure = useMemo(
    () => trunkNodes.map((n) => `${n.id}-${n.parentId}`).join(','),
    [trunkNodes],
  )

  // Refs to decouple layout triggers from data-only changes.
  // The layout effect only needs to READ the latest flowNodes/instance,
  // but shouldn't RE-RUN when they change for non-structural reasons.
  // Synced via effects (declared before the layout effect) to satisfy
  // React compiler rules and ensure correct ordering.
  const flowNodesRef = useRef(flowNodes)
  const reactFlowInstanceRef = useRef(reactFlowInstance)

  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])
  useEffect(() => {
    reactFlowInstanceRef.current = reactFlowInstance
  }, [reactFlowInstance])

  // Explicit fit-view control: only fitView on initial layout or full reset
  // (key/scale change). Set to true before the state change that triggers
  // a structural layout, and consumed (reset to false) inside the effect.
  const shouldFitViewRef = useRef(true)

  // Merge node data changes into layouted nodes without re-layout
  const mergedLayoutedNodes = useMemo(
    () =>
      layoutedNodes.map((layoutNode) => {
        const flowNode = flowNodes.find((fn) => fn.id === layoutNode.id)
        if (flowNode) {
          return { ...layoutNode, data: flowNode.data }
        }
        return layoutNode
      }),
    [layoutedNodes, flowNodes],
  )

  useEffect(() => {
    let cancelled = false
    const currentNodes = flowNodesRef.current
    const shouldFit = shouldFitViewRef.current
    shouldFitViewRef.current = false

    startTransition(() => {
      getLayoutedElements(currentNodes, flowEdges)
        .then(({ nodes, edges }) => {
          if (cancelled) return
          setLayoutedNodes(nodes)
          setLayoutedEdges(edges)
          if (shouldFit) {
            const instance = reactFlowInstanceRef.current
            if (instance) {
              requestAnimationFrame(() => {
                instance.fitView({ padding: 0.2 })
              })
            }
          }
        })
        .catch(() => {
          if (cancelled) return
          setLayoutedNodes(currentNodes)
          setLayoutedEdges(flowEdges)
        })
    })

    return () => {
      cancelled = true
    }
  }, [nodeStructure, flowEdges]) // Only re-layout when tree structure actually changes

  const handleKeyChange = useCallback(
    (nextKey: Note) => {
      shouldFitViewRef.current = true
      initialize(nextKey, scaleType)
    },
    [initialize, scaleType],
  )

  const handleScaleChange = useCallback(
    (nextScale: ScaleType) => {
      shouldFitViewRef.current = true
      initialize(key, nextScale)
    },
    [initialize, key],
  )

  const handleLoadProgression = useCallback(
    (saved: SavedProgression) => {
      shouldFitViewRef.current = true
      initialize(saved.key, saved.scaleType)
      setGenre(saved.genre)
      setLoadedProgression(saved)
    },
    [initialize, setGenre],
  )

  if (!map) {
    return null
  }

  // If a saved progression is loaded, go straight to practice view
  if (loadedProgression) {
    return (
      <PracticeView
        map={map}
        nodeRegistry={nodeRegistry}
        notationPreference={notationPreference}
        mapKey={key}
        scaleType={scaleType}
        selectedGenre={loadedProgression.genre}
        onBack={() => setLoadedProgression(null)}
        onPlayChord={handlePlayChord}
        audio={audio}
        favorites={favorites}
        loadedChords={loadedProgression.chords}
      />
    )
  }

  // If in practice mode, show practice view
  if (practiceMode && practicePathNodeId) {
    return (
      <PracticeView
        trunkNodes={trunkNodes}
        practicePathNodeId={practicePathNodeId}
        mutedNodes={mutedNodes}
        map={map}
        nodeRegistry={nodeRegistry}
        notationPreference={notationPreference}
        mapKey={key}
        scaleType={scaleType}
        selectedGenre={selectedGenre}
        onBack={exitPracticeMode}
        onPlayChord={handlePlayChord}
        audio={audio}
        favorites={favorites}
      />
    )
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b flex items-center gap-4">
        <h2 className="text-xl font-bold">{t('progressionExplorer.title')}</h2>

        <NotePicker
          value={key}
          onValueChange={(v) => v && handleKeyChange(v)}
          notation={notationPreference === 'flat' ? 'flat' : 'sharp'}
          size="xs"
        />

        <ScalePicker
          value={scaleType}
          onValueChange={handleScaleChange}
          grouping="minimal"
          size="xs"
        />

        <GenrePicker value={selectedGenre} onValueChange={setGenre} size="xs" />

        <Select
          value={notationPreference}
          onValueChange={(v) => setNotationPreference(v as NotationPreference)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">
              {t('progressionExplorer.auto')}
            </SelectItem>
            <SelectItem value="sharp">
              {t('progressionExplorer.sharps')}
            </SelectItem>
            <SelectItem value="flat">
              {t('progressionExplorer.flats')}
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <SavedProgressionsDialog
            savedProgressions={favoritesState.progressions}
            onLoad={handleLoadProgression}
            onDelete={favoritesState.removeProgression}
          />
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={mergedLayoutedNodes}
          edges={layoutedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          minZoom={0.5}
          maxZoom={2}
          onInit={setReactFlowInstance}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
        <p>
          <span
            dangerouslySetInnerHTML={{
              __html: t('progressionExplorer.instructions'),
            }}
          />
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Practice View Component
// ============================================================================

interface PracticeViewProps {
  // Required for both modes
  map: ProgressionMap
  nodeRegistry: Record<string, import('@/schemas').ProgressionNode>
  notationPreference: NotationPreference
  mapKey: Note
  scaleType: ScaleType
  selectedGenre: Genre
  onBack: () => void
  onPlayChord: (chordId: string) => void
  audio: ReturnType<typeof useResource<'audio'>>
  favorites: FavoritesStoreApi
  // Explorer mode (from trunk tree)
  trunkNodes?: TrunkNode[]
  practicePathNodeId?: string
  mutedNodes?: Set<string>
  // Loaded mode (from saved progression)
  loadedChords?: string[]
}

function PracticeView({
  map,
  nodeRegistry,
  notationPreference,
  mapKey,
  scaleType,
  selectedGenre,
  onBack,
  onPlayChord,
  audio,
  favorites,
  trunkNodes,
  practicePathNodeId,
  mutedNodes,
  loadedChords,
}: PracticeViewProps) {
  const { t } = useTranslation('tools')
  const [voicingSelections, setVoicingSelections] = useState<
    Record<string, number>
  >({})
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')

  // Multi-fallback node lookup: registry (covers synthetic + map nodes) -> map -> enharmonic
  const lookupNode = useCallback(
    (chordId: string) => {
      return (
        nodeRegistry[chordId] ??
        nodeRegistry[normalizeChordId(chordId)] ??
        map.nodes.find((n) => n.id === chordId) ??
        map.nodes.find((n) => enharmonicChordEqual(n.id, chordId))
      )
    },
    [nodeRegistry, map],
  )

  // Build chord ID list — from trunk tree OR from loaded progression
  const chordIds = useMemo(() => {
    if (loadedChords) return loadedChords

    if (!trunkNodes || !practicePathNodeId) return []
    const path: TrunkNode[] = []
    let currentId: string | null = practicePathNodeId
    while (currentId) {
      const node = trunkNodes.find((n) => n.id === currentId)
      if (!node) break
      path.unshift(node)
      currentId = node.parentId
    }
    return path
      .filter((node) => !mutedNodes?.has(node.id))
      .map((node) => node.chordId)
  }, [loadedChords, trunkNodes, practicePathNodeId, mutedNodes])

  // Calculate voicings for all chords
  const chordVoicings = useMemo(() => {
    const voicings: Record<string, ChordVoicing[]> = {}
    chordIds.forEach((chordId) => {
      const progNode = lookupNode(chordId)
      if (progNode) {
        voicings[chordId] = findChordVoicings(progNode.chord)
      }
    })
    return voicings
  }, [chordIds, lookupNode])

  const handleVoicingChange = useCallback((chordId: string, index: number) => {
    setVoicingSelections((prev) => ({ ...prev, [chordId]: index }))
  }, [])

  const handlePlayAll = useCallback(() => {
    chordIds.forEach((chordId, idx) => {
      const voicings = chordVoicings[chordId] || []
      const selectedIndex = voicingSelections[chordId] || 0
      const voicing = voicings[selectedIndex]

      if (voicing) {
        const frequencies = voicing.positions.map((p) => p.frequency)
        setTimeout(() => {
          audio.playChord(frequencies, 0.8)
        }, idx * 800)
      }
    })
  }, [chordIds, chordVoicings, voicingSelections, audio])

  const handleSave = useCallback(() => {
    if (chordIds.length === 0) return

    // Auto-generate a name from the chord sequence
    const displayChords = chordIds.map((id) =>
      displayChordId(id, notationPreference, mapKey, scaleType),
    )
    const name = displayChords.join(' → ')

    favorites.getState().saveProgression(name, {
      key: mapKey,
      scaleType,
      genre: selectedGenre,
      chords: chordIds,
    })

    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }, [
    chordIds,
    notationPreference,
    mapKey,
    scaleType,
    selectedGenre,
    favorites,
  ])

  return (
    <div className="w-full flex flex-col p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {t('progressionExplorer.practiceMode')}
          </h2>
          <Button variant="outline" onClick={onBack}>
            {t('progressionExplorer.backToExplorer')}
          </Button>
        </div>

        {/* Progression Display */}
        <div className="flex items-center gap-2 text-lg font-medium flex-wrap mb-4">
          <span className="text-gray-600">
            {t('progressionExplorer.progression')}
          </span>
          {chordIds.map((chordId, idx) => (
            <span key={`${chordId}-${idx}`}>
              <Badge variant="secondary" className="text-base px-3 py-1">
                {displayChordId(chordId, notationPreference, mapKey, scaleType)}
              </Badge>
              {idx < chordIds.length - 1 && (
                <span className="mx-2 text-gray-400">→</span>
              )}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePlayAll}
            disabled={chordIds.length === 0}
            size="lg"
          >
            {t('progressionExplorer.playAll', { count: chordIds.length })}
          </Button>

          <Button
            onClick={handleSave}
            disabled={chordIds.length === 0 || saveState === 'saved'}
            variant="outline"
            size="lg"
          >
            {saveState === 'saved'
              ? `✓ ${t('progressionExplorer.saved')}`
              : t('progressionExplorer.saveProgression')}
          </Button>
        </div>
      </div>

      {/* Voicing Cards */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {chordIds.map((chordId, idx) => {
            const progNode = lookupNode(chordId)
            if (!progNode) return null

            const voicings = chordVoicings[chordId] || []
            const selectedIndex = voicingSelections[chordId] || 0
            const displayName = displayChordId(
              chordId,
              notationPreference,
              mapKey,
              scaleType,
            )

            return (
              <Card key={`${chordId}-${idx}`} className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{displayName}</h3>
                      <p className="text-sm text-gray-600">
                        {progNode.romanNumeral}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPlayChord(chordId)}
                      className="h-8 w-8 p-0"
                    >
                      ▶
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <CompactVoicingSelector
                    chord={progNode.chord}
                    voicings={voicings}
                    selectedIndex={selectedIndex}
                    onVoicingChange={(index: number) =>
                      handleVoicingChange(chordId, index)
                    }
                    onPlay={(voicing) => {
                      const frequencies = voicing.positions.map(
                        (p) => p.frequency,
                      )
                      audio.playChord(frequencies, 0.8)
                    }}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Saved Progressions Dialog
// ============================================================================

interface SavedProgressionsDialogProps {
  savedProgressions: import('@/system/favoritesResource').SavedItem<SavedProgression>[]
  onLoad: (progression: SavedProgression) => void
  onDelete: (id: string) => void
}

function SavedProgressionsDialog({
  savedProgressions,
  onLoad,
  onDelete,
}: SavedProgressionsDialogProps) {
  const { t } = useTranslation('tools')
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('progressionExplorer.loadSaved')}
          {savedProgressions.length > 0 && (
            <Badge variant="secondary" className="ml-1.5 text-[0.625rem] px-1.5 py-0">
              {savedProgressions.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('progressionExplorer.savedProgressions')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {savedProgressions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('progressionExplorer.noSavedProgressions')}
            </p>
          ) : (
            savedProgressions.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => {
                  onLoad(item.data)
                  setOpen(false)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onLoad(item.data)
                    setOpen(false)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.data.key} {item.data.scaleType} · {item.data.genre} ·{' '}
                    {t('progressionExplorer.chordsLabel', {
                      count: item.data.chords.length,
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(item.id)
                  }}
                >
                  ✕
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
