import { Handle, Position } from '@xyflow/react'
import { memo, useState, useEffect, startTransition } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RecommendationDialog } from './RecommendationDialog'
import { displayChordId, type NotationPreference } from '@/core/enharmonic'
import type {
  ProgressionNode,
  CategorizedRecommendations,
  GenreCategorizedRecommendations,
  Genre,
  Note,
  ScaleType,
} from '@/schemas'
import { IconPlayerPlay, IconPlus, IconTrash } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface CandidateSuggestion {
  node: ProgressionNode
  score: number
  matchedProgressions: string[]
  transitionStrength: number
}

interface ChordNodeData {
  chordId: string
  trunkId: number
  depth: number
  isLeaf: boolean
  isRoot: boolean
  isTrunkHead: boolean
  isSelected: boolean
  isMuted: boolean
  showExpand: boolean
  onPlay?: () => void
  onExpand?: () => void
  onPlayChord?: (chordId: string) => void
  onDelete?: () => void
  onMute?: () => void
  onPractice?: () => void
  candidates?: CandidateSuggestion[]
  categorizedCandidates?: CategorizedRecommendations | null | undefined
  genreCandidates?:
    | Record<Genre, GenreCategorizedRecommendations>
    | null
    | undefined
  notationPreference?: NotationPreference
  mapKey?: Note
  scaleType?: ScaleType
  onSelectCandidate?: (chordId: string) => void
}

export const ChordNode = memo(({ data }: { data: ChordNodeData }) => {
  const {
    chordId,
    isLeaf,
    isRoot,
    isTrunkHead,
    isSelected,
    isMuted,
    showExpand,
    onPlay,
    onExpand,
    onPlayChord,
    onDelete,
    onMute,
    onPractice,
    candidates,
    categorizedCandidates,
    genreCandidates,
    notationPreference = 'auto',
    mapKey,
    scaleType: nodeScaleType,
    onSelectCandidate,
  } = data

  const { t } = useTranslation('tools')

  // Display chord ID with notation preference
  const displayId = displayChordId(
    chordId,
    notationPreference,
    mapKey,
    nodeScaleType,
  )

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [requestedExpand, setRequestedExpand] = useState(false)

  // Open dialog when genre candidates are loaded after expand request (preferred)
  useEffect(() => {
    if (requestedExpand && genreCandidates) {
      startTransition(() => {
        setDialogOpen(true)
        setRequestedExpand(false)
      })
    }
  }, [genreCandidates, requestedExpand])

  // Fallback: Open dialog for categorized candidates
  useEffect(() => {
    if (requestedExpand && !genreCandidates && categorizedCandidates) {
      startTransition(() => {
        setDialogOpen(true)
        setRequestedExpand(false)
      })
    }
  }, [categorizedCandidates, genreCandidates, requestedExpand])

  // Fallback: Open popover for legacy candidates
  useEffect(() => {
    if (
      requestedExpand &&
      !genreCandidates &&
      !categorizedCandidates &&
      candidates &&
      candidates.length > 0
    ) {
      startTransition(() => {
        setPopoverOpen(true)
        setRequestedExpand(false)
      })
    }
  }, [candidates, categorizedCandidates, genreCandidates, requestedExpand])

  // Colors
  const bgColor = isMuted
    ? 'bg-gray-400'
    : isRoot
      ? 'bg-purple-600'
      : isTrunkHead
        ? 'bg-blue-600'
        : 'bg-blue-500'

  const borderColor = isLeaf
    ? 'border-yellow-400 border-4'
    : isSelected
      ? 'border-blue-800 border-2'
      : 'border-transparent'

  const size = isRoot ? 'w-24 h-24' : 'w-28 h-18'

  return (
    <div className="relative pointer-events-auto">
      <Handle type="target" position={Position.Left} className="opacity-0" />

      <div
        className={`${size} ${bgColor} ${borderColor} rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-shadow cursor-pointer`}
      >
        <div className="text-lg">{displayId}</div>
        {isLeaf && <div className="text-xs text-yellow-300 mt-1">●</div>}
      </div>

      {/* Play button */}
      {onPlay && (
        <button
          onClick={onPlay}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-xs hover:bg-gray-100"
        >
          <IconPlayerPlay size={16} />
        </button>
      )}

      {/* Delete button (only for non-root nodes) */}
      {!isRoot && onDelete && (
        <button
          onClick={onDelete}
          className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full shadow-md flex items-center justify-center text-xs hover:bg-red-600"
        >
          <IconTrash size={16} />
        </button>
      )}

      {/* Mute button (only for non-root nodes) */}
      {!isRoot && onMute && (
        <button
          onClick={onMute}
          className={`absolute top-6 -left-2 w-6 h-6 ${isMuted ? 'bg-gray-600' : 'bg-gray-300'} text-white rounded-full shadow-md flex items-center justify-center text-xs hover:opacity-80`}
          title={isMuted ? t('chordNode.unmute') : t('chordNode.mute')}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      )}

      {/* Practice button (only on leaf nodes) */}
      {isLeaf && onPractice && (
        <button
          onClick={onPractice}
          className="absolute -bottom-2 left-[50%] translate-x-[-50%] w-8 h-8 bg-indigo-500 text-white rounded-full shadow-md flex items-center justify-center text-xs font-bold hover:bg-indigo-600"
          title={t('chordNode.practiceThisPath')}
        >
          🎹
        </button>
      )}

      {/* Expand button with popover (only on leaf nodes) */}
      {isLeaf && showExpand && onSelectCandidate && (
        <>
          {/* New categorized popover — wrapper is positioned so
              the popover anchor matches the expand button's visual location */}
          <div className="absolute bottom-[50%] translate-y-[50%] -right-10 z-10">
            <RecommendationDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              genreRecommendations={genreCandidates ?? null}
              onSelectCandidate={onSelectCandidate}
              onPlayChord={onPlayChord || (() => {})}
              notationPreference={notationPreference}
              mapKey={mapKey}
              scaleType={nodeScaleType}
              trigger={
                <button
                  className={cn(
                    'w-8 h-8',
                    'bg-green-500 text-white rounded-full shadow-md flex items-center justify-center text-lg font-bold hover:bg-green-600',
                    dialogOpen && 'bg-red-500',
                  )}
                  onClick={() => {
                    if (dialogOpen) {
                      setDialogOpen(false)
                    } else if (onExpand) {
                      setRequestedExpand(true)
                      onExpand()
                    }
                  }}
                >
                  <IconPlus size={16} />
                </button>
              }
            />
          </div>

          {/* Legacy popover fallback */}
          <Popover
            open={popoverOpen}
            onOpenChange={(open) => {
              setPopoverOpen(open)
              if (!open) {
                setRequestedExpand(false)
              }
            }}
          >
            <PopoverTrigger className="hidden" />
            <PopoverContent
              side="right"
              align="start"
              className="w-80 p-4 z-50"
            >
              <div className="space-y-2">
                <h3 className="font-bold text-sm mb-3">
                  {t('chordNode.chooseNextChord')}
                </h3>
                {candidates && candidates.length > 0 ? (
                  candidates.map((candidate, idx) => (
                    <Card
                      key={idx}
                      className="p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors"
                      onClick={() => {
                        onSelectCandidate(candidate.node.id)
                        setPopoverOpen(false)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Header: Chord name + Roman numeral */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base">
                              {candidate.node.id}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {candidate.node.romanNumeral}
                            </Badge>
                          </div>

                          {/* Function + Category badges */}
                          <div className="flex items-center gap-1 mb-1">
                            <Badge
                              className="text-xs capitalize text-white border-0"
                              style={{
                                backgroundColor:
                                  candidate.node.function === 'tonic'
                                    ? '#3b82f6'
                                    : candidate.node.function === 'dominant'
                                      ? '#f97316'
                                      : '#22c55e',
                              }}
                            >
                              {candidate.node.function}
                            </Badge>
                            {candidate.node.category !== 'diatonic' && (
                              <Badge variant="outline" className="text-xs">
                                {candidate.node.category ===
                                'secondary-dominant'
                                  ? t('chordNode.secDom')
                                  : t('chordNode.dimPass')}
                              </Badge>
                            )}
                          </div>

                          {/* Transition strength bar */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-600 font-medium shrink-0">
                              {t('chordNode.strength')}
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${candidate.transitionStrength * 100}%`,
                                  backgroundColor:
                                    candidate.node.function === 'tonic'
                                      ? '#3b82f6'
                                      : candidate.node.function === 'dominant'
                                        ? '#f97316'
                                        : '#22c55e',
                                }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 font-mono shrink-0">
                              {Math.round(candidate.transitionStrength * 100)}%
                            </span>
                          </div>

                          {/* Matched progressions */}
                          {candidate.matchedProgressions.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {candidate.matchedProgressions
                                .slice(0, 2)
                                .join(', ')}
                              {candidate.matchedProgressions.length > 2 &&
                                '...'}
                            </div>
                          )}
                        </div>

                        {/* Play button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onPlayChord) onPlayChord(candidate.node.id)
                          }}
                          className="ml-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 text-xs shrink-0"
                        >
                          ▶
                        </button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    {t('chordNode.loadingSuggestions')}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  )
})

ChordNode.displayName = 'ChordNode'
