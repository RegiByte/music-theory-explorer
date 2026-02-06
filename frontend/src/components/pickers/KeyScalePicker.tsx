/**
 * KeyScalePicker — Composite NotePicker + ScalePicker.
 *
 * Renders note pills and scale pills together with subtle labels.
 * This is the main replacement for the Key + Scale Select pair used
 * across ScaleExplorer, MelodyExplorer, ProgressionExplorer, etc.
 */

import { NotePicker } from './NotePicker'
import { ScalePicker } from './ScalePicker'
import { cn } from '@/lib/utils'
import type { Note, ScaleType } from '@/schemas'
import type { ScaleGroupTier } from '@/core/musicData'

interface KeyScalePickerProps {
  noteValue: Note
  onNoteChange: (note: Note) => void
  scaleValue: ScaleType
  onScaleChange: (scale: ScaleType) => void
  /** Notation preference for note display */
  notation?: 'sharp' | 'flat'
  /** How to organize the scale options */
  scaleGrouping?: ScaleGroupTier
  size?: 'xs' | 'sm' | 'default'
  className?: string
  /** Hide labels for compact use */
  hideLabels?: boolean
}

export function KeyScalePicker({
  noteValue,
  onNoteChange,
  scaleValue,
  onScaleChange,
  notation = 'sharp',
  scaleGrouping = 'common',
  size = 'sm',
  className,
  hideLabels = false,
}: KeyScalePickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        {!hideLabels && (
          <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">Key</span>
        )}
        <NotePicker
          value={noteValue}
          onValueChange={(v) => v && onNoteChange(v)}
          notation={notation}
          size={size}
        />
      </div>
      <div className="flex items-start gap-2">
        {!hideLabels && (
          <span className="text-xs font-medium text-muted-foreground w-10 shrink-0 mt-1.5">Scale</span>
        )}
        <ScalePicker
          value={scaleValue}
          onValueChange={onScaleChange}
          grouping={scaleGrouping}
          size={size}
        />
      </div>
    </div>
  )
}
