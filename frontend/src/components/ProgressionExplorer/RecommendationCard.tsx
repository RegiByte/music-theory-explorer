import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconPlayerPlay } from '@tabler/icons-react'
import { getColorClassColor, getColorClassLabel } from '@/core/colorClassifier'
import { getTensionLabel, getTensionColor } from '@/core/tensionCalculator'
import { getRarityLabel } from '@/core/genreCategorizer'
import { displayChordId, type NotationPreference } from '@/core/enharmonic'
import type { ScoredCandidate, FrequencyStats, Note, ScaleType } from '@/schemas'
import { useTranslation } from 'react-i18next'

interface RecommendationCardProps {
  candidate: ScoredCandidate
  onSelect: () => void
  onPlay: () => void
  showStatistics?: boolean
  frequencyStats?: FrequencyStats
  notationPreference?: NotationPreference
  mapKey?: Note
  scaleType?: ScaleType
}

export function RecommendationCard({
  candidate,
  onSelect,
  onPlay,
  showStatistics = false,
  frequencyStats,
  notationPreference = 'auto',
  mapKey,
  scaleType,
}: RecommendationCardProps) {
  const { t } = useTranslation('tools')
  const { node, breakdown } = candidate
  const displayId = displayChordId(node.id, notationPreference, mapKey, scaleType)
  const functionColor =
    node.function === 'tonic'
      ? '#3b82f6'
      : node.function === 'dominant'
        ? '#f97316'
        : '#22c55e'

  return (
    <Card
      className="p-2 cursor-pointer hover:bg-blue-50/70 hover:border-blue-300 transition-colors"
      onClick={onSelect}
    >
      {/* Row 1: All identity badges + play button */}
      <div className="flex items-center gap-1 mb-1">
        <span className="font-bold text-sm leading-none">{displayId}</span>
        <Badge variant="secondary" className="text-[0.6rem] leading-none px-1 py-0 h-4">
          {node.romanNumeral}
        </Badge>
        <Badge
          className="text-[0.6rem] leading-none px-1 py-0 h-4 text-white border-0"
          style={{ backgroundColor: getColorClassColor(breakdown.colorClass) }}
        >
          {getColorClassLabel(breakdown.colorClass)}
        </Badge>
        <Badge
          className="text-[0.6rem] leading-none px-1 py-0 h-4 capitalize text-white border-0"
          style={{ backgroundColor: functionColor }}
        >
          {node.function}
        </Badge>
        {node.category !== 'diatonic' && (
          <Badge variant="outline" className="text-[0.6rem] leading-none px-1 py-0 h-4">
            {node.category === 'secondary-dominant'
              ? t('recommendationCard.secDom')
              : node.category === 'diminished-passing'
                ? t('recommendationCard.dimPass')
                : t('recommendationCard.borrowed')}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          className="ml-auto shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors shadow-sm"
          title={t('recommendationCard.playChord')}
        >
          <IconPlayerPlay size={14} />
        </button>
      </div>

      {/* Compact metrics */}
      {showStatistics && (
        <div className="space-y-0.5 text-[0.65rem]">
          {/* Probability */}
          {breakdown.statisticalProbability !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium shrink-0 inline-block">
                {t('recommendationCard.probability')}
              </span>
              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${breakdown.statisticalProbability * 100}%` }}
                />
              </div>
              <span className="text-gray-500 font-mono w-10 text-right shrink-0">
                {(breakdown.statisticalProbability * 100).toFixed(1)}%
              </span>
            </div>
          )}

          {/* Frequency + rarity */}
          {breakdown.genreFrequency !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium w-14 shrink-0">
                {t('recommendationCard.frequency')}
              </span>
              <span className="text-gray-600 text-[0.65rem]">
                {t('recommendationCard.ofSongs', { value: (breakdown.genreFrequency * 100).toFixed(2) })}
              </span>
              {frequencyStats && (() => {
                const rarity = getRarityLabel(breakdown.genreFrequency, frequencyStats)
                return (
                  <Badge
                    variant="outline"
                    className="text-[0.55rem] leading-none px-1 py-0 h-3.5 ml-auto border-current"
                    style={{ color: rarity.color }}
                  >
                    {rarity.label}
                  </Badge>
                )
              })()}
            </div>
          )}

          {/* Transition */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium w-14 shrink-0">
              {t('recommendationCard.transition')}
            </span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full"
                style={{
                  width: `${breakdown.transitionStrength * 100}%`,
                  backgroundColor: functionColor,
                }}
              />
            </div>
            <span className="text-gray-500 font-mono w-10 text-right shrink-0">
              {Math.round(breakdown.transitionStrength * 100)}%
            </span>
          </div>

          {/* Pattern */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium w-14 shrink-0">
              {t('recommendationCard.pattern')}
            </span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${breakdown.patternNorm * 100}%` }}
              />
            </div>
            <span className="text-gray-500 font-mono w-10 text-right shrink-0">
              {Math.round(breakdown.patternNorm * 100)}%
            </span>
          </div>

          {/* Distance + Tension — merged into one row */}
          <div className="flex items-center gap-2 text-gray-500">
            <span className="font-medium w-14 shrink-0">
              {t('recommendationCard.distance')}
            </span>
            <span className="font-mono">
              {breakdown.harmonicDistance.toFixed(2)}
            </span>
            <span className="text-[0.6rem]">
              {breakdown.harmonicDistance < 0.5
                ? t('recommendationCard.veryClose')
                : breakdown.harmonicDistance < 1.5
                  ? t('recommendationCard.close')
                  : breakdown.harmonicDistance < 2.5
                    ? t('recommendationCard.moderate')
                    : t('recommendationCard.far')}
            </span>
            <span className="text-gray-300 mx-0.5">·</span>
            <span className="font-medium">{t('recommendationCard.tension')}</span>
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: getTensionColor(breakdown.tensionLevel) }}
            />
            <span>{getTensionLabel(breakdown.tensionLevel)}</span>
            {breakdown.tensionDelta !== undefined && (
              <span className="text-[0.6rem]">
                {breakdown.tensionDelta > 0.1
                  ? t('recommendationCard.building')
                  : breakdown.tensionDelta < -0.1
                    ? t('recommendationCard.resolving')
                    : t('recommendationCard.stable')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer: score + matched progressions */}
      <div className="flex items-center gap-1.5 mt-0.5 text-[0.6rem] text-gray-400">
        <span>
          {t('recommendationCard.score')} {breakdown.total.toFixed(3)}
        </span>
        {breakdown.matchedProgressions.length > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="truncate">
              {t('recommendationCard.matches')}{' '}
              {breakdown.matchedProgressions.slice(0, 2).join(', ')}
              {breakdown.matchedProgressions.length > 2 &&
                ` ${t('recommendationCard.more', { count: breakdown.matchedProgressions.length - 2 })}`}
            </span>
          </>
        )}
      </div>
    </Card>
  )
}
