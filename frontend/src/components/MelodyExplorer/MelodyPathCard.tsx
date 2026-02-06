import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MELODY_STYLE_PRESETS, type MelodyPath, type MelodyStyle } from '@/core/melodyGenerator'
import { suggestNextNotes, type NoteSuggestion } from '@/core/melody'
import type { Note } from '@/schemas'

// ---------------------------------------------------------------------------
// Style Colors
// ---------------------------------------------------------------------------

const STYLE_COLORS: Record<MelodyStyle, {
  badge: string
  notePill: string
  chordPill: string
  bg: string
  border: string
  selectedBorder: string
}> = {
  smooth: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    notePill: 'bg-blue-50 text-blue-700 border-blue-200',
    chordPill: 'bg-blue-500 text-white border-blue-600',
    bg: 'hover:bg-blue-50/50',
    border: 'border-blue-200',
    selectedBorder: 'ring-2 ring-blue-400 ring-offset-1 border-blue-400',
  },
  melodic: {
    badge: 'bg-green-100 text-green-800 border-green-300',
    notePill: 'bg-green-50 text-green-700 border-green-200',
    chordPill: 'bg-green-500 text-white border-green-600',
    bg: 'hover:bg-green-50/50',
    border: 'border-green-200',
    selectedBorder: 'ring-2 ring-green-400 ring-offset-1 border-green-400',
  },
  angular: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    notePill: 'bg-amber-50 text-amber-700 border-amber-200',
    chordPill: 'bg-amber-500 text-white border-amber-600',
    bg: 'hover:bg-amber-50/50',
    border: 'border-amber-200',
    selectedBorder: 'ring-2 ring-amber-400 ring-offset-1 border-amber-400',
  },
  arpeggiated: {
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    notePill: 'bg-purple-50 text-purple-700 border-purple-200',
    chordPill: 'bg-purple-500 text-white border-purple-600',
    bg: 'hover:bg-purple-50/50',
    border: 'border-purple-200',
    selectedBorder: 'ring-2 ring-purple-400 ring-offset-1 border-purple-400',
  },
}

// ---------------------------------------------------------------------------
// Suggestion category colors
// ---------------------------------------------------------------------------

function getCategoryColor(category: NoteSuggestion['category']) {
  switch (category) {
    case 'strong': return 'bg-green-100 text-green-800 border-green-300'
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'interesting': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'risky': return 'bg-red-100 text-red-800 border-red-300'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MelodyPathCardProps {
  path: MelodyPath
  isSelected: boolean
  scaleNotes: Note[]
  chordNotes: Note[]
  onCardClick: () => void
  onPlay: () => void
  onRegenerate: () => void
  onPractice: () => void
  onPlayNote: (note: Note) => void
  onEditNote: (noteIndex: number, newNote: Note) => void
  onDeleteNote: (noteIndex: number) => void
}

export function MelodyPathCard({
  path,
  isSelected,
  scaleNotes,
  chordNotes,
  onCardClick,
  onPlay,
  onRegenerate,
  onPractice,
  onPlayNote,
  onEditNote,
  onDeleteNote,
}: MelodyPathCardProps) {
  const preset = MELODY_STYLE_PRESETS[path.style]
  const colors = STYLE_COLORS[path.style]
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null)
  const { t } = useTranslation('tools')

  // Compute suggestions for the currently editing note
  const suggestions = useMemo(() => {
    if (editingNoteIndex === null) return []
    const melodyBefore = path.notes.slice(0, editingNoteIndex).map(n => n.note)
    return suggestNextNotes(
      melodyBefore,
      scaleNotes,
      chordNotes,
      editingNoteIndex,
      path.notes.length,
    )
  }, [editingNoteIndex, path.notes, scaleNotes, chordNotes])

  return (
    <Card
      className={`p-4 transition-all cursor-pointer ${colors.bg} ${
        isSelected
          ? colors.selectedBorder
          : `border ${colors.border}`
      }`}
      onClick={() => onCardClick()}
    >
      {/*
        When NOT selected: pointer-events-none on all children makes every
        click land on the card itself = reliable select.
        When selected: children are interactive (notes open popovers, buttons work).
      */}
      <div className={isSelected ? '' : 'pointer-events-none'}>
        {/* Header: Style badge + description + actions */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <Badge className={`${colors.badge} text-xs font-semibold`}>
              {preset.label}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {preset.description}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onPlay() }}
              className="text-xs h-7 px-2"
            >
              {t('melodyPathCard.play')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onRegenerate() }}
              className="text-xs h-7 px-2"
            >
              {t('melodyPathCard.regen')}
            </Button>
            {isSelected && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onPractice() }}
                className="text-xs h-7 px-2"
              >
                {t('melodyPathCard.practice')}
              </Button>
            )}
          </div>
        </div>

        {/* Note pills - horizontal sequence */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {path.notes.map((melodyNote, idx) => (
            <NoteWithPopover
              key={melodyNote.id}
              note={melodyNote.note}
              index={idx}
              isChordTone={melodyNote.isChordTone}
              isStrongBeat={melodyNote.isStrongBeat}
              isEditing={editingNoteIndex === idx}
              isSelected={isSelected}
              canDelete={path.notes.length > 2}
              colors={colors}
              suggestions={editingNoteIndex === idx ? suggestions : []}
              scaleNotes={scaleNotes}
              onOpenEdit={() => setEditingNoteIndex(idx)}
              onCloseEdit={() => setEditingNoteIndex(null)}
              onPlayNote={onPlayNote}
              onEditNote={(newNote) => {
                onEditNote(idx, newNote)
                setEditingNoteIndex(null)
              }}
              onDeleteNote={() => {
                onDeleteNote(idx)
                setEditingNoteIndex(null)
              }}
            />
          ))}
        </div>

        {/* Analysis stats */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span title="Stepwise motion percentage">
            {t('melodyPathCard.steps')} <span className="font-medium text-foreground">{path.analysis.stepPercentage}%</span>
          </span>
          <span title="Chord tone percentage">
            {t('melodyPathCard.chord')} <span className="font-medium text-foreground">{path.analysis.chordTonePercentage}%</span>
          </span>
          <span title="Interval range">
            {t('melodyPathCard.range')} <span className="font-medium text-foreground">{path.analysis.intervalRange}</span>
          </span>
          <span title="Total notes">
            {t('melodyPathCard.notesLabel')} <span className="font-medium text-foreground">{path.analysis.totalNotes}</span>
          </span>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Note with Popover (inline sub-component)
// ---------------------------------------------------------------------------

interface NoteWithPopoverProps {
  note: Note
  index: number
  isChordTone: boolean
  isStrongBeat: boolean
  isEditing: boolean
  isSelected: boolean
  canDelete: boolean
  colors: typeof STYLE_COLORS[MelodyStyle]
  suggestions: NoteSuggestion[]
  scaleNotes: Note[]
  onOpenEdit: () => void
  onCloseEdit: () => void
  onPlayNote: (note: Note) => void
  onEditNote: (note: Note) => void
  onDeleteNote: () => void
}

function NoteWithPopover({
  note,
  index,
  isChordTone,
  isStrongBeat,
  isEditing,
  isSelected,
  canDelete,
  colors,
  suggestions,
  scaleNotes,
  onOpenEdit,
  onCloseEdit,
  onPlayNote,
  onEditNote,
  onDeleteNote,
}: NoteWithPopoverProps) {
  const { t } = useTranslation('tools')
  // If the card is not selected, just show the note pill (purely visual,
  // pointer-events-none on parent means clicks go to the card for selection)
  if (!isSelected) {
    return (
      <span
        className={`
          inline-flex items-center justify-center
          min-w-[32px] h-7 px-2
          text-xs font-semibold rounded-full
          border
          ${isChordTone ? colors.chordPill : colors.notePill}
          ${isStrongBeat ? 'ring-1 ring-offset-1 ring-gray-300' : ''}
        `}
        title={`${note}${isChordTone ? ' (chord tone)' : ''}`}
      >
        {note}
      </span>
    )
  }

  // Selected card: note pill with popover for editing
  return (
    <Popover
      open={isEditing}
      onOpenChange={(open) => {
        if (open) {
          onOpenEdit()
          onPlayNote(note)
        } else {
          onCloseEdit()
        }
      }}
    >
      <PopoverTrigger
        className={`
          inline-flex items-center justify-center
          min-w-[32px] h-7 px-2
          text-xs font-semibold rounded-full
          border transition-all cursor-pointer
          hover:scale-110 hover:shadow-sm
          ${isEditing
            ? 'ring-2 ring-indigo-400 ring-offset-1 bg-indigo-100 text-indigo-800 border-indigo-400'
            : isChordTone
              ? colors.chordPill
              : colors.notePill
          }
          ${isStrongBeat && !isEditing ? 'ring-1 ring-offset-1 ring-gray-300' : ''}
        `}
        render={<button />}
      >
        {note}
      </PopoverTrigger>
      <PopoverContent className="w-auto min-w-[200px] max-w-[320px]" side="bottom" align="center">
        <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">
              {t('melodyPathCard.noteLabel', { index: index + 1 })} <span className="text-indigo-600">{note}</span>
            </span>
            {canDelete && (
              <button
                onClick={onDeleteNote}
                className="text-[10px] text-red-500 hover:text-red-700 font-medium"
              >
                {t('melodyPathCard.remove')}
              </button>
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{t('melodyPathCard.replaceWith')}</p>
              <div className="flex gap-1.5 flex-wrap">
                {suggestions.map((s) => (
                  <button
                    key={s.note}
                    onClick={() => {
                      onPlayNote(s.note)
                      onEditNote(s.note)
                    }}
                    className={`
                      px-2 py-1 rounded-md border text-xs font-semibold
                      cursor-pointer hover:scale-105 transition-all
                      ${getCategoryColor(s.category)}
                    `}
                    title={s.reasons.join(', ')}
                  >
                    {s.note}
                    <span className="text-[9px] ml-0.5 opacity-60">{s.score}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All scale notes */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">{t('melodyPathCard.scaleNotes')}</p>
            <div className="flex gap-1 flex-wrap">
              {scaleNotes.map((sn) => (
                <button
                  key={sn}
                  onClick={() => {
                    onPlayNote(sn)
                    onEditNote(sn)
                  }}
                  className={`
                    px-1.5 py-0.5 rounded text-[11px] font-medium border
                    cursor-pointer hover:scale-105 transition-all
                    ${sn === note
                      ? 'bg-indigo-500 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }
                  `}
                >
                  {sn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { STYLE_COLORS }
