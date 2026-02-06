/**
 * pill-group.tsx — Generic pill-based selection primitive.
 *
 * A visual "select from visible options" component where all options are
 * rendered as pills (rounded buttons). Supports single-select and multi-select.
 *
 * Sub-components:
 *  - PillGroup — container, manages selection state via React context
 *  - Pill — individual selectable item
 *  - PillGroupLabel — inline text label for visual grouping
 *  - PillGroupSeparator — thin visual divider between groups
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Context — passes selection state from PillGroup to Pill children
// ---------------------------------------------------------------------------

interface PillGroupContextValue {
  value: string | string[]
  multi: boolean
  max?: number
  size: 'xs' | 'sm' | 'default'
  colorScheme: 'default' | 'note' | 'scale' | 'quality' | 'genre'
  onSelect: (value: string) => void
  isSelected: (value: string) => boolean
}

const PillGroupContext = createContext<PillGroupContextValue | null>(null)

function usePillGroup() {
  const ctx = useContext(PillGroupContext)
  if (!ctx) throw new Error('Pill must be used inside a PillGroup')
  return ctx
}

// ---------------------------------------------------------------------------
// PillGroup — container
// ---------------------------------------------------------------------------

interface PillGroupBaseProps {
  children: ReactNode
  size?: 'xs' | 'sm' | 'default'
  colorScheme?: 'default' | 'note' | 'scale' | 'quality' | 'genre'
  wrap?: boolean
  className?: string
}

interface PillGroupSingleProps extends PillGroupBaseProps {
  multi?: false
  max?: never
  value: string
  onValueChange: (value: string) => void
}

interface PillGroupMultiProps extends PillGroupBaseProps {
  multi: true
  max?: number
  value: string[]
  onValueChange: (value: string[]) => void
}

type PillGroupProps = PillGroupSingleProps | PillGroupMultiProps

function PillGroup({
  children,
  value,
  onValueChange,
  multi = false,
  max,
  size = 'sm',
  colorScheme = 'default',
  wrap = true,
  className,
}: PillGroupProps) {
  const isSelected = useCallback(
    (v: string) => {
      if (multi) return (value as string[]).includes(v)
      return value === v
    },
    [value, multi],
  )

  const onSelect = useCallback(
    (v: string) => {
      if (multi) {
        const arr = value as string[]
        const onChange = onValueChange as (val: string[]) => void
        if (arr.includes(v)) {
          onChange(arr.filter((x) => x !== v))
        } else {
          if (max && arr.length >= max) return
          onChange([...arr, v])
        }
      } else {
        ;(onValueChange as (val: string) => void)(v)
      }
    },
    [value, onValueChange, multi, max],
  )

  return (
    <PillGroupContext.Provider value={{ value, multi, max, size, colorScheme, onSelect, isSelected }}>
      <div
        data-slot="pill-group"
        role={multi ? 'group' : 'radiogroup'}
        className={cn(
          'inline-flex items-center gap-1',
          wrap ? 'flex-wrap' : 'overflow-x-auto',
          className,
        )}
      >
        {children}
      </div>
    </PillGroupContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Pill — individual selectable item
// ---------------------------------------------------------------------------

const pillVariants = cva(
  // Base styles — all pills share these
  'inline-flex items-center justify-center rounded-full border font-medium transition-all cursor-pointer select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        xs: 'h-5 min-w-5 px-1.5 text-[0.625rem]',
        sm: 'h-7 min-w-7 px-2.5 text-xs',
        default: 'h-8 min-w-8 px-3 text-sm',
      },
    },
    defaultVariants: {
      size: 'sm',
    },
  },
)

interface PillProps extends VariantProps<typeof pillVariants> {
  value: string
  children: ReactNode
  className?: string
  /** Override active classes (used by GenrePicker for per-item colors) */
  activeClassName?: string
  disabled?: boolean
}

function Pill({ value, children, className, activeClassName, disabled }: PillProps) {
  const { size, colorScheme, onSelect, isSelected } = usePillGroup()
  const active = isSelected(value)

  // Color scheme classes
  const activeClasses = activeClassName ?? getActiveClasses(colorScheme)
  const inactiveClasses = getInactiveClasses(colorScheme)

  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      disabled={disabled}
      data-slot="pill"
      data-active={active || undefined}
      onClick={() => onSelect(value)}
      className={cn(
        pillVariants({ size }),
        active ? activeClasses : inactiveClasses,
        className,
      )}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Color scheme helpers
// ---------------------------------------------------------------------------

function getActiveClasses(scheme: PillGroupContextValue['colorScheme']): string {
  switch (scheme) {
    case 'note':
      return 'bg-primary text-primary-foreground border-primary shadow-sm'
    case 'scale':
      return 'bg-teal-600 text-white border-teal-600 shadow-sm dark:bg-teal-500 dark:border-teal-500'
    case 'quality':
      return 'bg-amber-600 text-white border-amber-600 shadow-sm dark:bg-amber-500 dark:border-amber-500'
    case 'genre':
      // Genre uses per-pill activeClassName override, this is a fallback
      return 'bg-primary text-primary-foreground border-primary shadow-sm'
    case 'default':
    default:
      return 'bg-primary text-primary-foreground border-primary shadow-sm'
  }
}

function getInactiveClasses(scheme: PillGroupContextValue['colorScheme']): string {
  switch (scheme) {
    case 'note':
      return 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
    case 'scale':
      return 'bg-muted/60 text-muted-foreground border-transparent hover:bg-teal-100 hover:text-teal-900 dark:hover:bg-teal-950 dark:hover:text-teal-200'
    case 'quality':
      return 'bg-muted/60 text-muted-foreground border-transparent hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-950 dark:hover:text-amber-200'
    case 'genre':
      return 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
    case 'default':
    default:
      return 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
  }
}

// ---------------------------------------------------------------------------
// PillGroupLabel — inline text label for visual grouping
// ---------------------------------------------------------------------------

function PillGroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      data-slot="pill-group-label"
      className={cn(
        'text-xs font-medium text-muted-foreground px-1 select-none',
        className,
      )}
    >
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// PillGroupSeparator — thin visual divider between groups
// ---------------------------------------------------------------------------

function PillGroupSeparator({ className }: { className?: string }) {
  return (
    <span
      data-slot="pill-group-separator"
      aria-hidden="true"
      className={cn('w-px h-4 bg-border mx-0.5 shrink-0', className)}
    />
  )
}

export { PillGroup, Pill, PillGroupLabel, PillGroupSeparator, pillVariants }
export type { PillGroupProps, PillProps }
