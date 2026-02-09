import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Fretboard, type FretboardPosition } from '@/components/Fretboard'
import { findNotePositions } from '@/core/fretboard'
import { STYLE_COLORS } from './MelodyPathCard'
import { MELODY_STYLE_PRESETS } from '@/core/melodyGenerator'
import type { MelodyPath } from '@/core/melodyGenerator'
import type { Note } from '@/schemas'

export interface MelodyPracticeViewProps {
  path: MelodyPath
  practiceStep: number
  practiceTempo: number
  practicePlaying: boolean
  onBack: () => void
  onAdvance: () => void
  onPrevious: () => void
  onReset: () => void
  onSetTempo: (bpm: number) => void
  onStartPlayback: () => void
  onStopPlayback: () => void
  onPlayNote: (note: Note) => void
}

export function MelodyPracticeView({
  path,
  practiceStep,
  practiceTempo,
  practicePlaying,
  onBack,
  onAdvance,
  onPrevious,
  onReset,
  onSetTempo,
  onStartPlayback,
  onStopPlayback,
  onPlayNote,
}: MelodyPracticeViewProps) {
  const { t } = useTranslation('tools')
  const colors = STYLE_COLORS[path.style]
  const preset = MELODY_STYLE_PRESETS[path.style]

  const currentNote = path.notes[practiceStep]
  const currentNoteValue = currentNote?.note

  // Build fretboard positions — current note has highest priority
  const highlightedPositions = useMemo((): FretboardPosition[] => {
    const positionMap = new Map<string, FretboardPosition>()
    const makeKey = (s: string, f: number) => `${s}-${f}`

    // 1. Remaining notes (lowest priority) — secondary
    const remainingNotes = path.notes.slice(practiceStep + 1).map((n) => n.note)
    if (remainingNotes.length > 0) {
      for (const pos of findNotePositions(remainingNotes)) {
        positionMap.set(makeKey(pos.string, pos.fret), {
          string: pos.string,
          fret: pos.fret,
          color: 'secondary',
          emphasis: 'normal',
        })
      }
    }

    // 2. Completed notes (medium priority) — muted, overwrites remaining
    const completedNotes = path.notes.slice(0, practiceStep).map((n) => n.note)
    if (completedNotes.length > 0) {
      for (const pos of findNotePositions(completedNotes)) {
        positionMap.set(makeKey(pos.string, pos.fret), {
          string: pos.string,
          fret: pos.fret,
          color: 'muted',
          emphasis: 'normal',
        })
      }
    }

    // 3. Current note (highest priority) — accent/strong, overwrites everything
    if (currentNoteValue) {
      for (const pos of findNotePositions([currentNoteValue])) {
        positionMap.set(makeKey(pos.string, pos.fret), {
          string: pos.string,
          fret: pos.fret,
          color: 'accent',
          emphasis: 'strong',
          label: currentNoteValue,
        })
      }
    }

    return Array.from(positionMap.values())
  }, [path.notes, practiceStep, currentNoteValue])

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            {t('melodyExplorer.back')}
          </Button>
          <Badge className={`${colors.badge} text-xs`}>{preset.label}</Badge>
          <h3 className="font-semibold">{t('melodyExplorer.practiceMode')}</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('melodyExplorer.noteOf', {
            current: practiceStep + 1,
            total: path.notes.length,
          })}
        </div>
      </div>

      {/* Note sequence with progress indicator */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {path.notes.map((melodyNote, idx) => (
          <button
            key={melodyNote.id}
            onClick={() => onPlayNote(melodyNote.note)}
            className={`
              inline-flex items-center justify-center
              min-w-[36px] h-8 px-2
              text-xs font-bold rounded-full
              border-2 transition-all cursor-pointer
              ${
                idx < practiceStep
                  ? 'bg-gray-200 text-gray-500 border-gray-300'
                  : idx === practiceStep
                    ? 'bg-amber-400 text-amber-900 border-amber-500 scale-110 shadow-md'
                    : `${colors.notePill}`
              }
            `}
          >
            {melodyNote.note}
          </button>
        ))}
      </div>

      {/* Current note display */}
      {currentNote && (
        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-amber-600 mb-1">
            {currentNote.note}
          </div>
          <div className="flex gap-2 justify-center">
            {currentNote.isChordTone && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-100 text-green-800"
              >
                {t('melodyExplorer.chordTone')}
              </Badge>
            )}
            {currentNote.isStrongBeat && (
              <Badge variant="secondary" className="text-xs">
                {t('melodyExplorer.strongBeat')}
              </Badge>
            )}
            {currentNote.scaleDegree && (
              <Badge variant="outline" className="text-xs">
                {t('melodyExplorer.degree', { value: currentNote.scaleDegree })}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Fretboard */}
      <div className="mb-6">
        <Fretboard highlightedPositions={highlightedPositions} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={practiceStep === 0 || practicePlaying}
          >
            {t('melodyExplorer.previous')}
          </Button>
          {practicePlaying ? (
            <Button size="sm" onClick={onStopPlayback}>
              {t('melodyExplorer.stop')}
            </Button>
          ) : (
            <Button size="sm" onClick={onStartPlayback}>
              {t('melodyExplorer.playAll')}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onAdvance}
            disabled={practiceStep >= path.notes.length - 1 || practicePlaying}
          >
            {t('melodyExplorer.next')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={practicePlaying}
          >
            {t('melodyExplorer.reset')}
          </Button>
        </div>

        {/* Tempo control */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">
            {t('melodyExplorer.tempo')}
          </label>
          <input
            type="range"
            min={40}
            max={240}
            value={practiceTempo}
            onChange={(e) => onSetTempo(parseInt(e.target.value))}
            className="w-24 h-1.5"
            disabled={practicePlaying}
          />
          <span className="text-xs font-mono w-12">
            {t('melodyExplorer.bpm', { value: practiceTempo })}
          </span>
        </div>
      </div>
    </Card>
  )
}
