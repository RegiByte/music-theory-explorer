import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useResource } from '@/system'
import type { MelodyExplorerApi } from '@/system/melodyExplorerResource'
import { MelodyPathCard } from './MelodyPathCard'
import { MelodyPracticeView } from './MelodyPracticeView'
import { generateScale } from '@/core/scales'
import { generateChord } from '@/core/chords'
import {
  KeyScalePicker,
  NotePicker,
  ChordQualityPicker,
} from '@/components/pickers'
import type { ChordQuality } from '@/schemas'

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
  const store = useResource('melodyExplorer') as MelodyExplorerApi
  const state = store.useMelodyExplorer()

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
