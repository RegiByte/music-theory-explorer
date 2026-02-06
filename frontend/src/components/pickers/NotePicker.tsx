/**
 * NotePicker — 12 chromatic note pills with notation-preference-aware display.
 *
 * Shows either sharp names (C, C#, D, ...) or flat names (C, Db, D, ...)
 * based on the `notation` prop. Internally maps through enharmonic conversion
 * so the consumer always receives the canonical Note type.
 */

import { CHROMATIC, CHROMATIC_FLATS } from '@/keywords'
import { toSharp } from '@/core/enharmonic'
import { PillGroup, Pill } from '@/components/ui/pill-group'
import type { Note } from '@/schemas'

interface NotePickerProps {
  value: Note | null
  onValueChange: (note: Note | null) => void
  /** Which notation to show — 'sharp' renders C# style, 'flat' renders Db style */
  notation?: 'sharp' | 'flat'
  size?: 'xs' | 'sm' | 'default'
  /** Show a "None" pill at the start (for optional contexts) */
  allowNone?: boolean
  className?: string
}

/** Sentinel value for "no note selected" */
const NONE_VALUE = '__none__'

export function NotePicker({
  value,
  onValueChange,
  notation = 'sharp',
  size = 'sm',
  allowNone = false,
  className,
}: NotePickerProps) {
  const notes = notation === 'flat' ? CHROMATIC_FLATS : CHROMATIC

  // Convert the current value to the display notation for matching
  const displayValue = value
    ? notation === 'flat'
      ? flatDisplayOf(value)
      : value
    : NONE_VALUE

  function handleChange(v: string) {
    if (v === NONE_VALUE) {
      onValueChange(null)
      return
    }
    // Always return canonical (sharp) form to consumer
    const canonical = toSharp(v as Note)
    onValueChange(canonical)
  }

  return (
    <PillGroup
      value={displayValue}
      onValueChange={handleChange}
      size={size}
      colorScheme="note"
      className={className}
    >
      {allowNone && <Pill value={NONE_VALUE}>None</Pill>}
      {notes.map((note) => (
        <Pill key={note} value={note}>
          {note}
        </Pill>
      ))}
    </PillGroup>
  )
}

/**
 * Convert a canonical (sharp) note to its flat display form.
 * Natural notes pass through unchanged.
 */
function flatDisplayOf(note: Note): string {
  const map: Record<string, string> = {
    'A#': 'Bb',
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab',
  }
  return map[note] ?? note
}
