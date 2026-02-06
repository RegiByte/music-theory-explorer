import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MiniFretboard } from './MiniFretboard'
import { getDifficultyLabel } from '@/core/chords'
import type { Chord, ChordVoicing } from '@/schemas'
import { useTranslation } from 'react-i18next'

interface CompactVoicingSelectorProps {
  chord: Chord
  voicings: ChordVoicing[]
  selectedIndex: number
  onVoicingChange: (index: number) => void
  onPlay?: (voicing: ChordVoicing) => void
  maxVoicings?: number
}

export function CompactVoicingSelector({
  voicings,
  selectedIndex,
  onVoicingChange,
  onPlay,
  maxVoicings = 20,
}: CompactVoicingSelectorProps) {
  const { t } = useTranslation('tools')
  // Limit voicings to maxVoicings
  const displayedVoicings = voicings.slice(0, maxVoicings)
  const selectedVoicing = displayedVoicings[selectedIndex] || null

  // Handle navigation
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onVoicingChange(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex < displayedVoicings.length - 1) {
      onVoicingChange(selectedIndex + 1)
    }
  }

  const handlePlay = () => {
    if (selectedVoicing && onPlay) {
      onPlay(selectedVoicing)
    }
  }

  // No voicings available
  if (displayedVoicings.length === 0) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-gray-500">{t('compactVoicingSelector.noVoicings')}</p>
      </div>
    )
  }

  // Get difficulty info
  const difficulty = selectedVoicing ? getDifficultyLabel(selectedVoicing.difficulty) : null

  return (
    <div className="p-3 space-y-2">
      {/* Mini Fretboard */}
      {selectedVoicing && <MiniFretboard voicing={selectedVoicing} compact={true} />}

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handlePrevious}
          disabled={selectedIndex === 0}
          className="h-7 w-7 p-0"
        >
          ◀
        </Button>
        <span className="text-xs font-medium text-gray-700 min-w-[60px] text-center">
          {t('compactVoicingSelector.voicingOf', { current: selectedIndex + 1, total: displayedVoicings.length })}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleNext}
          disabled={selectedIndex === displayedVoicings.length - 1}
          className="h-7 w-7 p-0"
        >
          ▶
        </Button>
      </div>

      {/* Metadata */}
      {selectedVoicing && difficulty && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <Badge variant={difficulty.variant} className="text-xs">
            {difficulty.label}
          </Badge>
          <span className="text-gray-600">
            {t('compactVoicingSelector.span', { count: selectedVoicing.fretSpan })}
          </span>
        </div>
      )}

      {/* Play Button */}
      {onPlay && (
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlay}
          className="w-full h-7 text-xs"
        >
          {t('compactVoicingSelector.play')}
        </Button>
      )}
    </div>
  )
}
