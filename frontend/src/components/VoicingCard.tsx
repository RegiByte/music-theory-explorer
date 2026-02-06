import { getDifficultyLabel, getChordSymbol } from '@/core/chords'
import type { ChordVoicing } from '@/schemas'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MiniFretboard } from './MiniFretboard'
import { useTranslation } from 'react-i18next'

interface VoicingCardProps {
  voicing: ChordVoicing
  index: number
  isSelected: boolean
  onSelect: () => void
  onPlay: () => void
}

export function VoicingCard({
  voicing,
  index,
  isSelected,
  onSelect,
  onPlay,
}: VoicingCardProps) {
  const { t } = useTranslation('tools')
  const difficulty = getDifficultyLabel(voicing.difficulty)

  // Check if detected quality differs from expected quality
  const qualityMismatch =
    voicing.detectedQuality && voicing.detectedQuality !== voicing.chord.quality

  const detectedChordSymbol =
    qualityMismatch && voicing.detectedQuality
      ? getChordSymbol({ ...voicing.chord, quality: voicing.detectedQuality })
      : null

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation() // Don't trigger card selection
    onPlay()
  }

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header with voicing number and play button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {t('voicingCard.voicing', { index: index + 1 })}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePlay}
            className="h-8 w-8 p-0"
            title={t('voicingCard.playVoicing')}
          >
            <span className="text-lg">▶</span>
          </Button>
        </div>

        {/* Mini fretboard visualization */}
        <MiniFretboard voicing={voicing} compact={false} />

        {/* Fret positions as text (G-C-E-A order for display) */}
        <div className="flex items-center justify-center gap-2 text-sm font-mono">
          {['G', 'C', 'E', 'A'].map((str) => {
            const pos = voicing.positions.find((p) => p.string === str)
            return (
              <div key={str} className="text-center">
                <div className="text-xs text-gray-500">{str}</div>
                <div className="font-bold text-gray-800">
                  {pos ? pos.fret : 'x'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quality mismatch badge (if applicable) */}
        {qualityMismatch && detectedChordSymbol && (
          <div className="flex items-center justify-center">
            <Badge
              variant="secondary"
              className="bg-amber-100 text-amber-800 border-amber-300"
            >
              {t('voicingCard.actually', { chord: detectedChordSymbol })}
            </Badge>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Badge variant={difficulty.variant}>{difficulty.label}</Badge>
            <span className="text-gray-600">
              {voicing.fretSpan === 1
                ? t('voicingCard.span', { count: 1 })
                : t('voicingCard.span_plural', { count: voicing.fretSpan })}
            </span>
          </div>
          <span className="text-gray-600">
            {Math.round(voicing.consonance * 100)}%
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
