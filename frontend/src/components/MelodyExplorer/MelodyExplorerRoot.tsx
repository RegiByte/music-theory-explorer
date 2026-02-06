import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useResource } from '@/system'
import { Fretboard, type FretboardPosition } from '@/components/Fretboard'
import { findNotePositions } from '@/core/fretboard'
import { MelodyPathCard, STYLE_COLORS } from './MelodyPathCard'
import { MELODY_STYLE_PRESETS } from '@/core/melodyGenerator'
import { generateScale } from '@/core/scales'
import { generateChord } from '@/core/chords'
import {
  KeyScalePicker,
  NotePicker,
  ChordQualityPicker,
} from '@/components/pickers'
import type { Note, ChordQuality } from '@/schemas'

const MELODY_LENGTHS = [4, 8, 12, 16] as const

const MELODY_CHORD_SUBSET: ChordQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'dominant7',
  'major7',
  'minor7',
]

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function MelodyExplorerRoot() {
  const store = useResource('melodyExplorer')
  const state = useStore(store)

  const {
    key,
    scaleType,
    chordRoot,
    chordQuality,
    targetLength,
    paths,
    selectedPathId,
    practiceMode,
    practiceStep,
    practiceTempo,
    practicePlaying,
    // Actions
    setKey,
    setScaleType,
    setChordContext,
    setTargetLength,
    generate,
    regeneratePath,
    selectPath,
    deselectPath,
    editNote,
    deleteNote,
    enterPracticeMode,
    exitPracticeMode,
    setPracticeTempo,
    advancePracticeStep,
    previousPracticeStep,
    resetPracticeStep,
    startPracticePlayback,
    stopPracticePlayback,
    playPath,
    playNote,
  } = state

  const { t } = useTranslation('tools')

  const selectedPath = useMemo(
    () => paths.find((p) => p.id === selectedPathId) ?? null,
    [paths, selectedPathId],
  )

  // Compute scale/chord notes for editing suggestions (passed to cards)
  const scaleNotes = useMemo(
    () => generateScale(key, scaleType).notes,
    [key, scaleType],
  )

  const chordNotes = useMemo(() => {
    if (chordRoot && chordQuality) {
      try {
        return generateChord(chordRoot, chordQuality).notes
      } catch {
        return []
      }
    }
    return scaleNotes.length >= 5
      ? [scaleNotes[0], scaleNotes[2], scaleNotes[4]]
      : [scaleNotes[0]]
  }, [chordRoot, chordQuality, scaleNotes])

  // -------------------------------------------------------------------------
  // Practice Mode
  // -------------------------------------------------------------------------

  if (practiceMode && selectedPath) {
    return (
      <MelodyPracticeView
        path={selectedPath}
        practiceStep={practiceStep}
        practiceTempo={practiceTempo}
        practicePlaying={practicePlaying}
        onBack={exitPracticeMode}
        onAdvance={advancePracticeStep}
        onPrevious={previousPracticeStep}
        onReset={resetPracticeStep}
        onSetTempo={setPracticeTempo}
        onStartPlayback={startPracticePlayback}
        onStopPlayback={stopPracticePlayback}
        onPlayNote={playNote}
      />
    )
  }

  // -------------------------------------------------------------------------
  // Explorer Mode
  // -------------------------------------------------------------------------

  return (
    <Card className="p-6">
      {/* Configuration Row */}
      <div className="space-y-4 mb-6">
        {/* Key + Scale */}
        <KeyScalePicker
          noteValue={key}
          onNoteChange={(v) => setKey(v)}
          scaleValue={scaleType}
          onScaleChange={(v) => setScaleType(v)}
          scaleGrouping="full"
        />

        {/* Chord context (optional) + Length */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium block">
              {t('melodyExplorer.chordContext')}{' '}
              <span className="text-muted-foreground">
                {t('melodyExplorer.optional')}
              </span>
            </label>
            <NotePicker
              value={chordRoot}
              onValueChange={(v) => {
                setChordContext(v, v ? (chordQuality ?? 'major') : null)
              }}
              allowNone
              size="xs"
            />
            {chordRoot && (
              <ChordQualityPicker
                value={chordQuality ?? 'major'}
                onValueChange={(v) => setChordContext(chordRoot, v)}
                subset={MELODY_CHORD_SUBSET}
                size="xs"
              />
            )}
          </div>

          <div className="w-[120px]">
            <label className="text-sm font-medium mb-2 block">
              {t('melodyExplorer.length')}
            </label>
            <Select
              value={targetLength.toString()}
              onValueChange={(v) => v && setTargetLength(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MELODY_LENGTHS.map((l) => (
                  <SelectItem key={l} value={l.toString()}>
                    {t('melodyExplorer.notes', { count: l })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={generate} className="w-full" size="lg">
          {t('melodyExplorer.generate')}
        </Button>
      </div>

      {/* Paths Grid */}
      {paths.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-muted-foreground">
              {selectedPathId
                ? t('melodyExplorer.hintSelected')
                : t('melodyExplorer.hintUnselected')}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paths.map((path) => (
              <MelodyPathCard
                key={path.id}
                path={path}
                isSelected={path.id === selectedPathId}
                scaleNotes={scaleNotes}
                chordNotes={chordNotes}
                onCardClick={() => {
                  if (path.id === selectedPathId) {
                    deselectPath()
                  } else {
                    selectPath(path.id)
                  }
                }}
                onPlay={() => playPath(path.id)}
                onRegenerate={() => regeneratePath(path.id)}
                onPractice={() => enterPracticeMode(path.id)}
                onPlayNote={(note) => playNote(note)}
                onEditNote={(noteIndex, newNote) =>
                  editNote(path.id, noteIndex, newNote)
                }
                onDeleteNote={(noteIndex) => deleteNote(path.id, noteIndex)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {paths.length === 0 && (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-lg mb-2">{t('melodyExplorer.emptyTitle')}</p>
          <p className="text-sm">{t('melodyExplorer.emptyDescription')}</p>
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Practice View
// ---------------------------------------------------------------------------

interface MelodyPracticeViewProps {
  path: import('@/core/melodyGenerator').MelodyPath
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

function MelodyPracticeView({
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
