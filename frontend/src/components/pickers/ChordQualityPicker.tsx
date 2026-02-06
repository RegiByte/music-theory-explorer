/**
 * ChordQualityPicker — Pill-based chord quality selection.
 *
 * Shows pills for chord qualities (Maj, Min, Dim, Aug, 7, Maj7, etc.)
 * Optional `subset` prop limits which qualities are shown.
 */

import { CHORD_QUALITY_SHORT } from '@/core/musicData'
import { PillGroup, Pill } from '@/components/ui/pill-group'
import type { ChordQuality } from '@/schemas'

/** All chord qualities in a sensible display order */
const ALL_QUALITIES: ChordQuality[] = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'dominant7',
  'major7',
  'minor7',
  'diminished7',
  'half_diminished7',
  'sus2',
  'sus4',
]

interface ChordQualityPickerProps {
  value: ChordQuality
  onValueChange: (quality: ChordQuality) => void
  /** Only show these qualities (default: show all) */
  subset?: ChordQuality[]
  size?: 'xs' | 'sm' | 'default'
  className?: string
}

export function ChordQualityPicker({
  value,
  onValueChange,
  subset,
  size = 'sm',
  className,
}: ChordQualityPickerProps) {
  const qualities = subset
    ? ALL_QUALITIES.filter((q) => subset.includes(q))
    : ALL_QUALITIES

  return (
    <PillGroup
      value={value}
      onValueChange={(v) => onValueChange(v as ChordQuality)}
      size={size}
      colorScheme="quality"
      className={className}
    >
      {qualities.map((q) => (
        <Pill key={q} value={q}>
          {CHORD_QUALITY_SHORT[q]}
        </Pill>
      ))}
    </PillGroup>
  )
}
