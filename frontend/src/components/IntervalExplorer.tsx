import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import { Fretboard, type FretboardPosition } from './Fretboard'
import { analyzeInterval } from '@/core/intervals'
import { findPositionsForNote } from '@/core/fretboard'
import { semitonesToHz, noteToIndex } from '@/core/musicTheory'
import type { Note, UkuleleString } from '@/schemas'
import { NotePicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// Helper to get consonance badge variant
function getConsonanceVariant(
  consonance: number
): 'default' | 'secondary' | 'destructive' {
  if (consonance >= 0.8) return 'default' // Green-ish (high consonance)
  if (consonance >= 0.5) return 'secondary' // Yellow-ish (moderate)
  return 'destructive' // Red-ish (low consonance/dissonant)
}

export function IntervalExplorer() {
  const audio = useResource('audio')
  const { t } = useTranslation('tools')
  const [note1, setNote1] = useState<Note>('C')
  const [note2, setNote2] = useState<Note>('G') // Perfect 5th default

  // Calculate frequencies for both notes (using C4 as reference)
  const freq1 = semitonesToHz(noteToIndex(note1) - noteToIndex('C'), 261.63)
  const freq2 = semitonesToHz(noteToIndex(note2) - noteToIndex('C'), 261.63)

  // Analyze the interval
  const interval = analyzeInterval(note1, note2, freq1, freq2)

  // Find all positions for both notes on the fretboard
  const strings: UkuleleString[] = ['A', 'E', 'C', 'G']
  const note1Positions = findPositionsForNote(note1, strings, 12)
  const note2Positions = findPositionsForNote(note2, strings, 12)

  // Create highlighted positions for fretboard
  const highlightedPositions: FretboardPosition[] = [
    // All note1 positions (blue/primary)
    ...note1Positions.map((pos) => ({
      string: pos.string,
      fret: pos.fret,
      color: 'primary' as const,
      emphasis: 'strong' as const,
      label: note1,
    })),
    // All note2 positions (purple/secondary)
    ...note2Positions.map((pos) => ({
      string: pos.string,
      fret: pos.fret,
      color: 'secondary' as const,
      emphasis: 'strong' as const,
      label: note2,
    })),
  ]

  // Play melodic (sequential)
  const playMelodic = () => {
    audio.playNote(freq1, 0.5)
    setTimeout(() => {
      audio.playNote(freq2, 0.5)
    }, 600) // Slight gap between notes
  }

  // Play harmonic (simultaneous)
  const playHarmonic = () => {
    // Play both at once
    audio.playNote(freq1, 1.0)
    audio.playNote(freq2, 1.0)
  }

  // Helper to get consonance message
  const getConsonanceMessage = (consonance: number): string => {
    if (consonance >= 0.9) return t('intervalExplorer.veryConsonant')
    if (consonance >= 0.7) return t('intervalExplorer.consonant')
    if (consonance >= 0.5) return t('intervalExplorer.moderatelyConsonant')
    if (consonance >= 0.3) return t('intervalExplorer.dissonant')
    return t('intervalExplorer.veryDissonant')
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">{t('common:labels.note1')}</span>
          <NotePicker value={note1} onValueChange={(v) => v && setNote1(v)} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">{t('common:labels.note2')}</span>
          <NotePicker value={note2} onValueChange={(v) => v && setNote2(v)} />
        </div>

        {/* Play Buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={playMelodic} variant="default" size="sm">
            {t('intervalExplorer.playMelodic')}
          </Button>
          <Button onClick={playHarmonic} variant="outline" size="sm">
            {t('intervalExplorer.playHarmonic')}
          </Button>
        </div>
      </div>

      {/* Interval Info Panel */}
      <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg p-4 space-y-3">
        {/* Interval name */}
        <div className="text-2xl font-bold text-gray-800">{interval.name}</div>

        {/* Metrics row */}
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="font-medium">{interval.semitones} {t('common:labels.semitones')}</span>
          <span className="font-medium">{interval.ratio.toFixed(3)}:1 {t('common:labels.ratio')}</span>
          <span className="font-medium">{interval.cents.toFixed(0)} {t('common:labels.cents')}</span>
        </div>

        {/* Consonance badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{t('intervalExplorer.consonance')}:</span>
          <Badge variant={getConsonanceVariant(interval.consonance)}>
            {(interval.consonance * 100).toFixed(0)}%
          </Badge>
        </div>

        {/* Educational message */}
        <p className="text-sm text-gray-700">
          {getConsonanceMessage(interval.consonance)}
        </p>
      </div>

      {/* Fretboard with highlighted interval positions */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <Fretboard highlightedPositions={highlightedPositions} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700"></div>
          <span>
            {note1} ({t('common:labels.note1')})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-400 border-2 border-purple-600"></div>
          <span>
            {note2} ({t('common:labels.note2')})
          </span>
        </div>
      </div>

      {/* Educational Context */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">
          {t('intervalExplorer.fretboardPattern')}
        </h3>
        <p className="text-sm text-gray-700">
          <Trans
            i18nKey="tools:intervalExplorer.fretboardPatternText"
            values={{
              note1,
              note2,
              intervalName: interval.name,
            }}
            components={{
              note1: <span className="text-blue-500">{note1}</span>,
              note2: <span className="text-purple-500">{note2}</span>,
              intervalName: <span className="text-gray-500">{interval.name}</span>,
            }}
          />
        </p>
      </div>
    </div>
  )
}
