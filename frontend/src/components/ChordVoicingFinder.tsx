import { useState, useMemo, useEffect, startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlayChord } from '@/hooks/usePlayChord'
import { Fretboard, type FretboardPosition } from './Fretboard'
import { VoicingCard } from './VoicingCard'
import {
  generateChord,
  findChordVoicings,
  getChordSymbol,
  getChordDegree,
} from '@/core/chords'
import type { Note, ChordQuality, ChordVoicing } from '@/schemas'
import { NotePicker, ChordQualityPicker } from '@/components/pickers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'

export function ChordVoicingFinder() {
  const { t } = useTranslation('tools')
  const { playChordByVoicing } = usePlayChord()
  const [root, setRoot] = useState<Note>('C')
  const [quality, setQuality] = useState<ChordQuality>('major')
  const [selectedVoicingIndex, setSelectedVoicingIndex] = useState<
    number | null
  >(null)
  const [maxFretSpan, setMaxFretSpan] = useState(4)
  const [showOnlyMatching, setShowOnlyMatching] = useState(true)

  // Generate chord and find all voicings
  const chord = useMemo(() => generateChord(root, quality), [root, quality])
  const voicings = useMemo(
    () => findChordVoicings(chord, maxFretSpan),
    [chord, maxFretSpan],
  )

  // Filter voicings by quality if needed
  const filteredVoicings = useMemo(() => {
    if (showOnlyMatching) {
      return voicings.filter((v) => v.detectedQuality === quality)
    }
    return voicings
  }, [voicings, showOnlyMatching, quality])

  // Limit to top 20 voicings for performance
  const displayedVoicings = filteredVoicings.slice(0, 20)
  const selectedVoicing =
    selectedVoicingIndex !== null
      ? displayedVoicings[selectedVoicingIndex]
      : null

  // Convert selected voicing to fretboard positions
  const highlightedPositions: FretboardPosition[] = selectedVoicing
    ? selectedVoicing.positions.map((pos) => ({
        string: pos.string,
        fret: pos.fret,
        color: pos.note === chord.root ? 'primary' : 'secondary',
        emphasis: 'strong' as const,
        label: getChordDegree(pos.note, chord),
      }))
    : []

  // Play a voicing
  const playVoicing = (voicing: ChordVoicing) => {
    playChordByVoicing(voicing, 1.5)
  }

  // Auto-select first voicing when chord changes
  useEffect(() => {
    startTransition(() => {
      if (displayedVoicings.length > 0) {
        setSelectedVoicingIndex(0)
      } else {
        setSelectedVoicingIndex(null)
      }
    })
  }, [displayedVoicings.length, root, quality])

  const chordSymbol = getChordSymbol(chord)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-end gap-4 flex-wrap">
        {/* Root Note Selector */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">
            {t('chordVoicingFinder.rootNote')}
          </Label>
          <NotePicker value={root} onValueChange={(v) => v && setRoot(v)} />
        </div>

        {/* Chord Quality Selector */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium">
            {t('chordVoicingFinder.chordQuality')}
          </Label>
          <ChordQualityPicker value={quality} onValueChange={setQuality} />
        </div>

        {/* Max Fret Span Selector */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="span-select" className="text-sm font-medium">
            {t('chordVoicingFinder.maxFretSpan')}
          </Label>
          <Select
            value={maxFretSpan.toString()}
            onValueChange={(value) => {
              if (value) {
                const parsed = parseInt(value, 10)
                if (!isNaN(parsed)) setMaxFretSpan(parsed)
              }
            }}
          >
            <SelectTrigger id="span-select" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((span) => (
                <SelectItem key={span} value={span.toString()}>
                  {t('chordVoicingFinder.frets', { count: span })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quality Filter Toggle */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-toggle" className="text-sm font-medium">
            {t('chordVoicingFinder.qualityFilter')}
          </Label>
          <Button
            id="filter-toggle"
            variant={showOnlyMatching ? 'default' : 'outline'}
            onClick={() => setShowOnlyMatching(!showOnlyMatching)}
            className="w-[180px]"
          >
            {showOnlyMatching
              ? t('chordVoicingFinder.matchingOnly')
              : t('chordVoicingFinder.showAllQualities')}
          </Button>
        </div>

        {/* Chord Info */}
        <div className="flex-1 flex items-end">
          <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg px-4 py-2">
            <span className="text-sm text-gray-600">
              {t('chordVoicingFinder.chord')}
            </span>
            <span className="text-lg font-bold text-gray-800">
              {chordSymbol}
            </span>
            <span className="text-sm text-gray-600 ml-3">
              ({chord.notes.join(' - ')})
            </span>
          </div>
        </div>
      </div>

      {/* Available Voicings Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {t('chordVoicingFinder.availableVoicings')}
          </h3>
          <span className="text-sm text-gray-600">
            {displayedVoicings.length}
            {filteredVoicings.length > 20 &&
              ` ${t('chordVoicingFinder.ofTotal', { total: filteredVoicings.length })}`}
            {!showOnlyMatching &&
              filteredVoicings.length !== voicings.length && (
                <span className="text-gray-500">
                  {' '}
                  {t('chordVoicingFinder.filteredFrom', {
                    total: voicings.length,
                  })}
                </span>
              )}
          </span>
        </div>

        {displayedVoicings.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            {t('chordVoicingFinder.noVoicingsFound')}
          </div>
        ) : (
          <Carousel
            opts={{
              align: 'start',
              slidesToScroll: 1,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4  py-2 pl-2 pr-8">
              {displayedVoicings.map((voicing, index) => (
                <CarouselItem
                  key={index}
                  className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 select-none"
                >
                  <VoicingCard
                    voicing={voicing}
                    index={index}
                    isSelected={selectedVoicingIndex === index}
                    onSelect={() => setSelectedVoicingIndex(index)}
                    onPlay={() => playVoicing(voicing)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious size="icon-lg" variant={'default'} />
            <CarouselNext size="icon-lg" variant={'default'} />
          </Carousel>
        )}
      </div>

      {/* Fretboard Visualization */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {t('chordVoicingFinder.fretboardVisualization')}
          </h3>
          {selectedVoicing && (
            <div className="text-sm text-gray-600 mb-4">
              <span className="font-medium">
                {t('chordVoicingFinder.voicingOf', {
                  current: selectedVoicingIndex! + 1,
                  total: displayedVoicings.length,
                })}
              </span>
              <span className="mx-2">•</span>
              <span>
                {t('chordVoicingFinder.difficulty')}{' '}
                {[
                  t('chordVoicingFinder.easy'),
                  t('chordVoicingFinder.medium'),
                  t('chordVoicingFinder.hard'),
                ][Math.min(2, Math.floor(selectedVoicing.difficulty / 3.5))] ||
                  t('chordVoicingFinder.hard')}
              </span>
              <span className="mx-2">•</span>
              <span>
                {t('chordVoicingFinder.consonance', {
                  value: Math.round(selectedVoicing.consonance * 100),
                })}
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <Fretboard highlightedPositions={highlightedPositions} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
            <span>{t('chordVoicingFinder.rootNoteLegend')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-400 border-2 border-purple-600"></div>
            <span>{t('chordVoicingFinder.chordTones')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
