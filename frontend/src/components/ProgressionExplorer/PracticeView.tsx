import { CompactVoicingSelector } from '@/components/CompactVoicingSelector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { findChordVoicings } from '@/core/chords'
import { usePlayChord } from '@/hooks/usePlayChord'
import {
  displayChordId,
  enharmonicChordEqual,
  normalizeChordId,
  type NotationPreference,
} from '@/core/enharmonic'
import type {
  ChordVoicing,
  Genre,
  Note,
  ProgressionMap,
  ProgressionNode,
  ScaleType,
  TrunkNode,
} from '@/schemas'
import type { FavoritesApi } from '@/system/favoritesResource'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface PracticeViewProps {
  // Required for both modes
  map: ProgressionMap
  nodeRegistry: Record<string, ProgressionNode>
  notationPreference: NotationPreference
  mapKey: Note
  scaleType: ScaleType
  selectedGenre: Genre
  onBack: () => void
  onPlayChord: (chordId: string) => void
  favorites: FavoritesApi
  // Explorer mode (from trunk tree)
  trunkNodes?: TrunkNode[]
  practicePathNodeId?: string
  mutedNodes?: Set<string>
  // Loaded mode (from saved progression)
  loadedChords?: string[]
}

export function PracticeView({
  map,
  nodeRegistry,
  notationPreference,
  mapKey,
  scaleType,
  selectedGenre,
  onBack,
  onPlayChord,
  favorites,
  trunkNodes,
  practicePathNodeId,
  mutedNodes,
  loadedChords,
}: PracticeViewProps) {
  const { t } = useTranslation('tools')
  const { playChordByVoicing } = usePlayChord()
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
        setTimeout(() => {
          playChordByVoicing(voicing)
        }, idx * 800)
      }
    })
  }, [chordIds, chordVoicings, voicingSelections, playChordByVoicing])

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
                    onPlay={(voicing) => playChordByVoicing(voicing)}
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
