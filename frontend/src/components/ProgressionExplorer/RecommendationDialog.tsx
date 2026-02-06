import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PillGroup, Pill } from '@/components/ui/pill-group'
import { RecommendationCard } from './RecommendationCard'
import { GenrePicker } from '@/components/pickers'
import { GENRE_DISPLAY } from '@/core/musicData'
import type { NotationPreference } from '@/core/enharmonic'
import type { GenreCategorizedRecommendations, Genre, Note, ScaleType } from '@/schemas'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface RecommendationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  genreRecommendations: Record<Genre, GenreCategorizedRecommendations> | null
  onSelectCandidate: (chordId: string) => void
  onPlayChord: (chordId: string) => void
  notationPreference?: NotationPreference
  mapKey?: Note
  scaleType?: ScaleType
  trigger: ReactNode
}

export function RecommendationDialog({
  open,
  onOpenChange,
  genreRecommendations,
  onSelectCandidate,
  onPlayChord,
  notationPreference = 'auto',
  mapKey,
  scaleType,
  trigger,
}: RecommendationDialogProps) {
  const { t } = useTranslation('tools')
  const [selectedGenre, setSelectedGenre] = useState<Genre>('pop')
  const [tab, setTab] = useState<'canonical' | 'spicy'>('canonical')

  const handleSelect = (chordId: string) => {
    onSelectCandidate(chordId)
    onOpenChange(false)
  }

  const currentRecs = genreRecommendations?.[selectedGenre]
  const items = tab === 'canonical' ? currentRecs?.canonical : currentRecs?.spicy
  const canonicalCount = currentRecs?.canonical.length || 0
  const spicyCount = currentRecs?.spicy.length || 0

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={<div className="inline-flex" />}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-[380px] max-h-[520px] p-0 overflow-hidden flex flex-col z-50 gap-0"
        sideOffset={20}
      >
        {!genreRecommendations ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {t('recommendationDialog.loadingSuggestions')}
          </div>
        ) : (
          <>
              {/* Header */}
              <div className="px-3 pt-3 pb-2 border-b bg-gray-50/80">
                <h3 className="font-semibold text-sm leading-tight">
                  {t('recommendationDialog.chooseNextChord')}
                </h3>
                <p className="text-[0.65rem] text-gray-500 mt-0.5">
                  {t('recommendationDialog.basedOnSongs')}
              </p>
            </div>

              {/* Genre pills */}
              <div className="px-3 py-2 border-b">
                <GenrePicker
                  value={selectedGenre}
                  onValueChange={setSelectedGenre}
                  size="xs"
                />
              </div>

              {/* Canonical / Spicy toggle + context hint */}
              <div className='flex flex-col w-full border-b px-3 py-2'>
                <div className="flex items-center gap-3">
                  <PillGroup
                    value={tab}
                    onValueChange={(v) => setTab(v as 'canonical' | 'spicy')}
                    size="xs"
                    wrap={false}
                  >
                    <Pill value="canonical">
                      {t('recommendationDialog.canonical')} ({canonicalCount})
                    </Pill>
                    <Pill value="spicy">
                      {t('recommendationDialog.spicy')} ({spicyCount})
                    </Pill>
                  </PillGroup>

                </div>
                <span className="text-[0.6rem] text-gray-400 truncate">
                  {tab === 'canonical'
                    ? t('recommendationDialog.mostFrequent', { genre: GENRE_DISPLAY[selectedGenre] })
                    : t('recommendationDialog.lessCommon', { genre: GENRE_DISPLAY[selectedGenre] })}
                </span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
                {items && items.length > 0 ? (
                  items.map((candidate, idx) => (
                    <RecommendationCard
                      key={`${candidate.node.id}-${idx}`}
                      candidate={candidate}
                      onSelect={() => handleSelect(candidate.node.id)}
                      onPlay={() => onPlayChord(candidate.node.id)}
                      showStatistics
                      frequencyStats={currentRecs!.frequencyStats}
                      notationPreference={notationPreference}
                      mapKey={mapKey}
                      scaleType={scaleType}
                    />
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-gray-500">
                    {tab === 'canonical'
                      ? t('recommendationDialog.noCanonical')
                      : t('recommendationDialog.noSpicy')}
                  </div>
                )}
              </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
