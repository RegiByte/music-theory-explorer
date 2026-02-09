import { GenrePicker, NotePicker, ScalePicker } from '@/components/pickers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { findChordVoicings } from '@/core/chords'
import { type NotationPreference } from '@/core/enharmonic'
import { usePlayChord } from '@/hooks/usePlayChord'
import { toReactFlowEdge, toReactFlowNode } from '@/core/trunkLayout'
import type { Note, ScaleType } from '@/schemas'
import { useResource } from '@/system'
import type { FavoritesApi } from '@/system/favoritesResource'
import type { SavedProgression } from '@/system/favoritesResource'
import type { ProgressionExplorerApi } from '@/system/progressionExplorerResource'
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ChordNode } from './ChordNode'
import { HarmonicEdge } from './HarmonicEdge'
import { getLayoutedElements } from './layoutUtils'
import { PracticeView } from './PracticeView'
import { SavedProgressionsDialog } from './SavedProgressionsDialog'

const nodeTypes = {
  chordNode: ChordNode,
}

const edgeTypes = {
  harmonicEdge: HarmonicEdge,
}

/**
 * Inner canvas component — a child of ReactFlowProvider, so useReactFlow()
 * is guaranteed to return the instance. Owns all layout state and effects.
 */
function ProgressionExplorerCanvas({
  flowNodes,
  flowEdges,
  nodeStructure,
  shouldFitViewRef,
}: {
  flowNodes: Node[]
  flowEdges: Edge[]
  nodeStructure: string
  shouldFitViewRef: React.RefObject<boolean>
}) {
  const { fitView } = useReactFlow()

  const [layoutedNodes, setLayoutedNodes] = useState(flowNodes)
  const [layoutedEdges, setLayoutedEdges] = useState(flowEdges)

  // Ref to decouple layout triggers from data-only changes.
  const flowNodesRef = useRef(flowNodes)
  useEffect(() => {
    flowNodesRef.current = flowNodes
  }, [flowNodes])

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
            // useReactFlow() guarantees the instance — no null check needed
            setTimeout(() => fitView({ padding: 0.2 }), 1000)
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
      shouldFitViewRef.current = shouldFit
    }
  }, [nodeStructure, flowEdges, fitView, shouldFitViewRef])

  return (
    <ReactFlow
      nodes={mergedLayoutedNodes}
      edges={layoutedEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.5}
      maxZoom={2}
    >
      <Background />
      <Controls />
    </ReactFlow>
  )
}

export function ProgressionExplorerRoot() {
  const { playChordByVoicing } = usePlayChord()
  const explorer = useResource(
    'progressionExplorer',
  ) as ProgressionExplorerApi
  const favorites = useResource('favorites') as FavoritesApi
  const { t } = useTranslation('tools')

  // Loaded saved progression (bypasses the explorer tree)
  const [loadedProgression, setLoadedProgression] =
    useState<SavedProgression | null>(null)

  const state = explorer.useExplorer()

  const favoritesState = favorites.useFavorites()

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
        playChordByVoicing(voicings[0])
      }
    },
    [map, nodeRegistry, playChordByVoicing],
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

  // Track node structure (not data) to avoid re-layout on candidate changes
  const nodeStructure = useMemo(
    () => trunkNodes.map((n) => `${n.id}-${n.parentId}`).join(','),
    [trunkNodes],
  )

  // Explicit fit-view control: only fitView on initial layout or full reset
  // (key/scale change). Set to true before the state change that triggers
  // a structural layout, and consumed (reset to false) inside the canvas effect.
  const shouldFitViewRef = useRef(true)

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

  if (!map || !flowNodes.length || !flowEdges.length) {
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
        <ReactFlowProvider>
          <ProgressionExplorerCanvas
            flowNodes={flowNodes}
            flowEdges={flowEdges}
            nodeStructure={nodeStructure}
            shouldFitViewRef={shouldFitViewRef}
          />
        </ReactFlowProvider>
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
