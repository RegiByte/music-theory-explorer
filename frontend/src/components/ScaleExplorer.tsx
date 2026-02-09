import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import type { FavoritesApi } from '@/system/favoritesResource'
import { Fretboard, type FretboardPosition } from './Fretboard'
import { generateScale, findScalePositions } from '@/core/scales'
import { getNoteAtPosition } from '@/core/fretboard'
import { semitonesToHz, noteToIndex } from '@/core/musicTheory'
import { SCALE_PATTERNS } from '@/constants'
import { KeyScalePicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconHeart, IconHeartFilled, IconX } from '@tabler/icons-react'
import type { Note, ScaleType, UkuleleString } from '@/schemas'

// Helper to get scale pattern as W-H notation
function getScalePattern(scaleType: ScaleType): string {
  const intervals = SCALE_PATTERNS[scaleType]
  const steps: string[] = []

  for (let i = 0; i < intervals.length - 1; i++) {
    const diff = intervals[i + 1] - intervals[i]
    if (diff === 2) steps.push('W')
    else if (diff === 1) steps.push('H')
    else if (diff === 3) steps.push('W+H')
  }

  return steps.join('-')
}

export function ScaleExplorer() {
  const { t } = useTranslation('tools')
  const audio = useResource('audio')
  const favorites = useResource('favorites') as FavoritesApi
  const [root, setRoot] = useState<Note>('C')
  const [scaleType, setScaleType] = useState<ScaleType>('major')
  const [currentlyPlayingNote, setCurrentlyPlayingNote] = useState<Note | null>(
    null,
  )

  const favoritesState = favorites.useFavorites()

  const isFavorited = favoritesState.isScaleFavorited(root, scaleType)

  const handleToggleFavorite = useCallback(() => {
    favoritesState.toggleScale(root, scaleType)
  }, [favoritesState, root, scaleType])

  const handleLoadFavorite = useCallback(
    (favRoot: Note, favScaleType: ScaleType) => {
      setRoot(favRoot)
      setScaleType(favScaleType)
    },
    [],
  )

  // Generate scale using existing function
  const scale = generateScale(root, scaleType)

  // Find all positions on fretboard
  const strings: UkuleleString[] = ['A', 'E', 'C', 'G']
  const highlightedPositions: FretboardPosition[] = []

  strings.forEach((string) => {
    const positions = findScalePositions(root, scaleType, string)
    positions.forEach((fret) => {
      const note = getNoteAtPosition(string, fret)
      const isRoot = note === root
      const isCurrentlyPlaying = note === currentlyPlayingNote

      highlightedPositions.push({
        string,
        fret,
        color: isCurrentlyPlaying ? 'accent' : isRoot ? 'primary' : 'secondary',
        emphasis: isCurrentlyPlaying ? 'strong' : isRoot ? 'strong' : 'normal',
        label: isRoot ? 'R' : undefined,
      })
    })
  })

  // Play scale ascending or descending
  const playScale = (direction: 'ascending' | 'descending' = 'ascending') => {
    // Get notes in the correct order
    const notesToPlay =
      direction === 'descending' ? [...scale.notes].reverse() : scale.notes

    const frequencies = notesToPlay.map((note) => {
      const semitones = noteToIndex(note) - noteToIndex('C')
      return semitonesToHz(semitones, 261.63)
    })

    // Play sequence using audio resource
    const noteDuration = 0.4
    const noteInterval = 0.45 // Slight overlap for smoother sound

    // Clear any existing playing state
    setCurrentlyPlayingNote(null)

    // Play notes sequentially with visual feedback
    notesToPlay.forEach((note, i) => {
      setTimeout(
        () => {
          // Highlight the note being played
          setCurrentlyPlayingNote(note)

          // Play the note
          audio.playNote(frequencies[i], noteDuration)

          // Clear highlight after note finishes
          setTimeout(() => {
            setCurrentlyPlayingNote((current) =>
              current === note ? null : current,
            )
          }, noteDuration * 1000)
        },
        i * noteInterval * 1000,
      )
    })
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-3">
        <KeyScalePicker
          noteValue={root}
          onNoteChange={setRoot}
          scaleValue={scaleType}
          onScaleChange={setScaleType}
          scaleGrouping="full"
        />

        {/* Play Buttons + Favorite Toggle */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => playScale('ascending')}
            variant="default"
            size="sm"
          >
            {t('scaleExplorer.playAscending')}
          </Button>
          <Button
            onClick={() => playScale('descending')}
            variant="outline"
            size="sm"
          >
            {t('scaleExplorer.playDescending')}
          </Button>

          <Button
            onClick={handleToggleFavorite}
            variant="ghost"
            size="sm"
            className={
              isFavorited
                ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
            }
          >
            {isFavorited ? (
              <IconHeartFilled className="size-4" />
            ) : (
              <IconHeart className="size-4" />
            )}
          </Button>
        </div>

        {/* Favorite Scales Bar */}
        {favoritesState.scales.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('scaleExplorer.favorites')}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {favoritesState.scales.map((item) => {
                const isActive =
                  item.data.root === root && item.data.scaleType === scaleType
                return (
                  <Badge
                    key={item.id}
                    variant={isActive ? 'default' : 'secondary'}
                    className={`cursor-pointer text-xs px-2 py-0.5 gap-1 transition-colors ${
                      isActive
                        ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                        : 'hover:bg-gray-200'
                    }`}
                    onClick={() =>
                      handleLoadFavorite(item.data.root, item.data.scaleType)
                    }
                  >
                    <IconHeartFilled className="size-2.5 shrink-0" />
                    {item.name}
                    <button
                      type="button"
                      className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                        isActive
                          ? 'hover:bg-red-400'
                          : 'hover:bg-gray-300'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        favoritesState.removeScale(item.id)
                      }}
                      aria-label={t('scaleExplorer.removeFavorite')}
                    >
                      <IconX className="size-2.5" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scale Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">
            {t('scaleExplorer.notes')}
          </span>
          <div className="flex gap-2">
            {scale.notes.map((note, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded-md text-sm font-mono font-bold ${
                  note === root
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-700'
                }`}
              >
                {note}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {t('scaleExplorer.pattern')}
          </span>
          <span className="text-sm font-mono text-gray-600">
            {getScalePattern(scaleType)}
          </span>
        </div>
      </div>

      {/* Fretboard with highlighted scale positions */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <Fretboard highlightedPositions={highlightedPositions} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
          <span>{t('scaleExplorer.rootNote')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-400 border-2 border-purple-600"></div>
          <span>{t('scaleExplorer.scaleNotes')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600"></div>
          <span>{t('scaleExplorer.currentlyPlaying')}</span>
        </div>
      </div>
    </div>
  )
}
