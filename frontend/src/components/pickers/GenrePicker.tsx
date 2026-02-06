/**
 * GenrePicker — Per-genre colored pills, single and multi-select modes.
 *
 * Each genre pill uses its established color when active.
 * Supports single-select (ProgressionExplorer, DataInsights) and
 * multi-select (GenreFingerprints radar chart).
 */

import { ALL_GENRES, GENRE_DISPLAY, GENRE_PILL_CLASSES } from '@/core/musicData'
import { PillGroup, Pill } from '@/components/ui/pill-group'
import type { Genre } from '@/schemas'

interface GenrePickerSingleProps {
  value: Genre
  onValueChange: (genre: Genre) => void
  multi?: false
  max?: never
  size?: 'xs' | 'sm' | 'default'
  className?: string
}

interface GenrePickerMultiProps {
  value: Genre[]
  onValueChange: (genres: Genre[]) => void
  multi: true
  max?: number
  size?: 'xs' | 'sm' | 'default'
  className?: string
}

type GenrePickerProps = GenrePickerSingleProps | GenrePickerMultiProps

export function GenrePicker(props: GenrePickerProps) {
  const { multi = false, max, size = 'sm', className } = props

  if (multi) {
    const { value, onValueChange } = props as GenrePickerMultiProps
    return (
      <PillGroup
        value={value as string[]}
        onValueChange={(v) => onValueChange(v as Genre[])}
        multi
        max={max}
        size={size}
        colorScheme="genre"
        className={className}
      >
        {ALL_GENRES.map((genre) => (
          <Pill key={genre} value={genre} activeClassName={GENRE_PILL_CLASSES[genre]}>
            {GENRE_DISPLAY[genre]}
          </Pill>
        ))}
      </PillGroup>
    )
  }

  const { value, onValueChange } = props as GenrePickerSingleProps
  return (
    <PillGroup
      value={value}
      onValueChange={(v) => onValueChange(v as Genre)}
      size={size}
      colorScheme="genre"
      className={className}
    >
      {ALL_GENRES.map((genre) => (
        <Pill key={genre} value={genre} activeClassName={GENRE_PILL_CLASSES[genre]}>
          {GENRE_DISPLAY[genre]}
        </Pill>
      ))}
    </PillGroup>
  )
}
