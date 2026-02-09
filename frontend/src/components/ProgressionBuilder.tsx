import { useState, useMemo, useEffect, startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KeyScalePicker } from '@/components/pickers'
import { PROGRESSION_TEMPLATES } from '@/constants'
import {
  buildProgression,
  analyzeRootMovement,
  getHarmonicFunction,
} from '@/core/progressions'
import { getChordSymbol, findChordVoicings } from '@/core/chords'
import { usePlayChord } from '@/hooks/usePlayChord'
import { CompactVoicingSelector } from './CompactVoicingSelector'
import type { Note, ScaleType, ProgressionChord, ChordVoicing } from '@/schemas'

export function ProgressionBuilder() {
  const { t } = useTranslation('tools')
  const { audio, playChordByVoicing } = usePlayChord()
  const [key, setKey] = useState<Note>('C')
  const [scaleType, setScaleType] = useState<ScaleType>('major')
  const [progression, setProgression] = useState<ProgressionChord[]>([])
  const [currentDegrees, setCurrentDegrees] = useState<readonly number[]>([])

  // Voicing state management
  const [selectedVoicings, setSelectedVoicings] = useState<
    Record<string, number>
  >({})
  const [chordVoicings, setChordVoicings] = useState<
    Record<string, ChordVoicing[]>
  >({})

  // Load template
  const loadTemplate = (degrees: readonly number[]) => {
    setCurrentDegrees(degrees)
    const newProgression = buildProgression(key, scaleType, degrees)
    setProgression(newProgression)
  }

  // Update progression when key or scale changes
  useEffect(() => {
    if (currentDegrees.length > 0) {
      const newProgression = buildProgression(key, scaleType, currentDegrees)
      startTransition(() => {
        setProgression(newProgression)
      })
    }
  }, [key, scaleType, currentDegrees])

  // Compute voicings for each chord when progression changes
  useEffect(() => {
    if (progression.length > 0) {
      const newVoicings: Record<string, ChordVoicing[]> = {}
      const newSelectedVoicings: Record<string, number> = {}

      progression.forEach((chord) => {
        // Find voicings for this chord (limit to top 20)
        const voicings = findChordVoicings(chord.chord, 4).slice(0, 20)
        newVoicings[chord.id] = voicings

        // Auto-select first voicing
        newSelectedVoicings[chord.id] = 0
      })

      startTransition(() => {
        setChordVoicings(newVoicings)
        setSelectedVoicings(newSelectedVoicings)
      })
    } else {
      startTransition(() => {
        setChordVoicings({})
        setSelectedVoicings({})
      })
    }
  }, [progression])

  // Play single chord with selected voicing
  const playChord = (chord: ProgressionChord) => {
    const voicingIndex = selectedVoicings[chord.id] || 0
    const voicings = chordVoicings[chord.id] || []
    const voicing = voicings[voicingIndex]

    if (voicing) {
      playChordByVoicing(voicing, 1)
    }
  }

  // Play voicing directly
  const playVoicing = (voicing: ChordVoicing) => {
    playChordByVoicing(voicing, 1)
  }

  // Play progression once with selected voicings
  const playProgression = () => {
    progression.forEach((chord, index) => {
      setTimeout(() => playChord(chord), index * 1000)
    })
  }

  // Analysis
  const rootMovements = useMemo(
    () => analyzeRootMovement(progression),
    [progression],
  )

  return (
    <Card className="p-6">
      {/* Controls */}
      <div className="mb-6">
        <KeyScalePicker
          noteValue={key}
          onNoteChange={setKey}
          scaleValue={scaleType}
          onScaleChange={setScaleType}
          scaleGrouping="minimal"
        />
      </div>

      {/* Templates */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">
          {t('progressionBuilder.quickTemplates')}
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROGRESSION_TEMPLATES).map(([key, template]) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              onClick={() => loadTemplate(template.degrees)}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Progression Strip */}
      {progression.length > 0 && (
        <>
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">
              {t('progressionBuilder.yourProgression')}
            </label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {progression.map((chord) => (
                <Card key={chord.id} className="shrink-0 w-[225px]">
                  {/* Header: Roman numeral + chord symbol */}
                  <div className="text-center p-3 border-b">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {chord.romanNumeral}
                    </div>
                    <div className="text-sm font-medium mb-1">
                      {getChordSymbol(chord.chord)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {getHarmonicFunction(chord.degree)}
                    </Badge>
                  </div>

                  {/* Voicing Selector */}
                  <CompactVoicingSelector
                    chord={chord.chord}
                    voicings={chordVoicings[chord.id] || []}
                    selectedIndex={selectedVoicings[chord.id] || 0}
                    onVoicingChange={(index) => {
                      setSelectedVoicings((prev) => ({
                        ...prev,
                        [chord.id]: index,
                      }))
                    }}
                    onPlay={(voicing) => playVoicing(voicing)}
                  />
                </Card>
              ))}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex gap-2 mb-6">
            <Button onClick={playProgression}>
              {t('progressionBuilder.playProgression')}
            </Button>
            <Button variant="outline" onClick={() => audio.stop()}>
              {t('progressionBuilder.stop')}
            </Button>
          </div>

          {/* Analysis */}
          <div className="bg-linear-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">
              {t('progressionBuilder.analysis')}
            </h4>
            <div className="text-sm space-y-1">
              <p>
                <strong>{t('progressionBuilder.rootMovement')}</strong>{' '}
                {rootMovements.map((m, i) => (
                  <span key={i}>
                    {m > 0 ? '+' : ''}
                    {m} {t('progressionBuilder.semitones')}
                    {i < rootMovements.length - 1 ? ' → ' : ''}
                  </span>
                ))}
              </p>
              <p>
                <strong>{t('progressionBuilder.chords')}</strong>{' '}
                {t('progressionBuilder.chordsCount', {
                  count: progression.length,
                })}
              </p>
            </div>
          </div>
        </>
      )}

      {progression.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          {t('progressionBuilder.selectTemplate')}
        </div>
      )}
    </Card>
  )
}
