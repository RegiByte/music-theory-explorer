import { useState, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { useResource } from '@/system'
import {
  calculateCircleOfFifths,
  getDiatonicChords,
  getPrimaryChords,
} from '@/core/harmony'
import { generateChord } from '@/core/chords'
import { semitonesToHz, noteToIndex } from '@/core/musicTheory'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { C4_FREQUENCY } from '@/constants'
import type { Note } from '@/schemas'

// Circle layout constants
const CIRCLE_RADIUS = 150
const NOTE_RADIUS = 28
const CENTER_X = 200
const CENTER_Y = 200
const VIEWBOX_SIZE = 400

// Colors for highlighting
const COLORS = {
  tonic: '#10b981', // Green (I)
  subdominant: '#f59e0b', // Amber (IV)
  dominant: '#ef4444', // Red (V)
  default: '#3b82f6', // Blue
  selected: '#7c3aed', // Purple
}

export function CircleOfFifths() {
  const [selectedKey, setSelectedKey] = useState<Note>('C')
  const audio = useResource('audio')
  const { t } = useTranslation('tools')

  const circle = useMemo(() => calculateCircleOfFifths(), [])
  const diatonicChords = useMemo(
    () => getDiatonicChords(selectedKey),
    [selectedKey],
  )
  const primaryChords = useMemo(
    () => getPrimaryChords(selectedKey),
    [selectedKey],
  )

  // Calculate positions for each note
  const notePositions = useMemo(() => {
    const angleStep = (2 * Math.PI) / 12
    const startAngle = -Math.PI / 2 // Start at top (12 o'clock)

    return circle.map((note, i) => {
      const angle = startAngle + i * angleStep
      const x = CENTER_X + CIRCLE_RADIUS * Math.cos(angle)
      const y = CENTER_Y + CIRCLE_RADIUS * Math.sin(angle)

      // Determine highlight color
      let color = COLORS.default
      let highlight = false

      if (note === selectedKey) {
        color = COLORS.selected
        highlight = true
      } else if (note === primaryChords.subdominant.root) {
        color = COLORS.subdominant
      } else if (note === primaryChords.dominant.root) {
        color = COLORS.dominant
      }

      return {
        note,
        x,
        y,
        angle,
        color,
        highlight,
      }
    })
  }, [circle, selectedKey, primaryChords])

  const handleNoteClick = (note: Note) => {
    setSelectedKey(note)
  }

  const handleChordClick = (chord: ReturnType<typeof generateChord>) => {
    // Play all notes in the chord simultaneously
    const frequencies = chord.notes.map((note) => {
      const semitones = noteToIndex(note) - noteToIndex('C')
      return semitonesToHz(semitones, C4_FREQUENCY)
    })

    frequencies.forEach((freq) => {
      audio.playNote(freq, 1.0)
    })
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">
          {t('circleOfFifths.title')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t('circleOfFifths.description')}
        </p>

        {/* SVG Circle */}
        <div className="flex justify-center mb-6">
          <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            className="w-full max-w-md"
            style={{ aspectRatio: '1 / 1' }}
          >
            {/* Connecting lines between adjacent notes */}
            {notePositions.map((pos, i) => {
              const nextPos = notePositions[(i + 1) % 12]
              return (
                <line
                  key={`line-${i}`}
                  x1={pos.x}
                  y1={pos.y}
                  x2={nextPos.x}
                  y2={nextPos.y}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  opacity="0.3"
                />
              )
            })}

            {/* Note circles */}
            {notePositions.map((pos) => (
              <g key={pos.note}>
                {/* Highlight ring for selected/primary chords */}
                {pos.highlight && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NOTE_RADIUS + 4}
                    fill="none"
                    stroke={pos.color}
                    strokeWidth="3"
                    opacity="0.5"
                  />
                )}
                {(pos.note === primaryChords.subdominant.root ||
                  pos.note === primaryChords.dominant.root) &&
                  pos.note !== selectedKey && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={NOTE_RADIUS + 2}
                      fill="none"
                      stroke={pos.color}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  )}

                {/* Note circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NOTE_RADIUS}
                  fill={pos.color}
                  stroke="#1e293b"
                  strokeWidth="2"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleNoteClick(pos.note)}
                />

                {/* Note label */}
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {pos.note}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.selected }}
            />
            <span className="text-sm">{t('circleOfFifths.selectedKeyI')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.subdominant }}
            />
            <span className="text-sm">{t('circleOfFifths.subdominantIV')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS.dominant }}
            />
            <span className="text-sm">{t('circleOfFifths.dominantV')}</span>
          </div>
        </div>
      </div>

      {/* Selected Key Info */}
      <div className="mb-6 p-4 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold mb-3 text-gray-800">
          {t('circleOfFifths.selectedKey')}:{' '}
          <span className="text-blue-600">
            {selectedKey} {t('circleOfFifths.major')}
          </span>
        </h4>

        {/* Diatonic Chords */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {t('circleOfFifths.diatonicChords')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {diatonicChords.map((chordInfo) => {
              const isPrimary =
                chordInfo.degree === 1 ||
                chordInfo.degree === 4 ||
                chordInfo.degree === 5

              return (
                <Button
                  key={chordInfo.degree}
                  variant={isPrimary ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChordClick(chordInfo.chord)}
                  className="text-xs"
                >
                  <span className="font-semibold">
                    {chordInfo.romanNumeral}
                  </span>
                  <span className="ml-1 opacity-75">
                    ({chordInfo.root}
                    {chordInfo.quality === 'minor' ? 'm' : ''}
                    {chordInfo.quality === 'diminished' ? '°' : ''})
                  </span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Primary Chords Highlight */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600 mb-2">
            <Trans
              i18nKey="tools:circleOfFifths.primaryChordsNote"
              components={{ b: <strong /> }}
            />
          </p>
          <div className="flex gap-2">
            <Badge variant="default" className="bg-green-600">
              I ({primaryChords.tonic.root})
            </Badge>
            <Badge variant="default" className="bg-amber-600">
              IV ({primaryChords.subdominant.root})
            </Badge>
            <Badge variant="default" className="bg-red-600">
              V ({primaryChords.dominant.root})
            </Badge>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold mb-2 text-gray-800">
          {t('circleOfFifths.reference')}
        </h4>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refClockwise"
              components={{ b: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refCounterClockwise"
              components={{ b: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refAdjacentKeys"
              components={{ b: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refIIVV"
              components={{ b: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refTransposition"
              components={{ b: <strong /> }}
            />
          </li>
          <li>
            <Trans
              i18nKey="tools:circleOfFifths.refModulation"
              components={{ b: <strong /> }}
            />
          </li>
        </ul>
        <p className="text-xs text-gray-600 mt-3 italic">
          {t('circleOfFifths.clickHint')}
        </p>
      </div>
    </Card>
  )
}
