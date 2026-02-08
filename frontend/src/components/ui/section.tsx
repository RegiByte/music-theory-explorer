import * as React from 'react'
import { cn } from '@/lib/utils'

// --- Section ---

interface SectionProps {
  id?: string
  number: number
  title: string
  subtitle: string
  className?: string
  children: React.ReactNode
}

export function Section({
  id,
  number,
  title,
  subtitle,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn('py-16 first:pt-0 scroll-mt-16', className)}
    >
      {/* Section header */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-lg font-bold shrink-0">
            {number}
          </span>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl ml-14">
          {subtitle}
        </p>
      </div>

      {/* Section body */}
      <div className="space-y-8">{children}</div>
    </section>
  )
}

// --- KnowledgeBlock ---

interface KnowledgeBlockProps {
  className?: string
  children: React.ReactNode
}

export function KnowledgeBlock({ className, children }: KnowledgeBlockProps) {
  return (
    <div
      className={cn(
        'max-w-3xl text-base leading-relaxed text-foreground/90',
        '[&>p]:mb-4 [&>p:last-child]:mb-0',
        '[&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul>li]:mb-1.5',
        '[&>ol]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol>li]:mb-1.5',
        className,
      )}
    >
      {children}
    </div>
  )
}

// --- DeepDive ---

interface DeepDiveProps {
  title: string
  defaultOpen?: boolean
  className?: string
  children: React.ReactNode
}

export function DeepDive({
  title,
  defaultOpen = false,
  className,
  children,
}: DeepDiveProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div
      className={cn(
        'max-w-3xl border border-border rounded-lg overflow-hidden',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left bg-muted/50 hover:bg-muted transition-colors"
      >
        <svg
          className={cn(
            'w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-90',
          )}
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M6 3l5 5-5 5V3z" />
        </svg>
        <span className="text-sm font-medium text-foreground/80">{title}</span>
      </button>

      {isOpen && (
        <div className="px-5 py-4 border-t border-border bg-background">
          <div className="text-sm leading-relaxed text-foreground/80 [&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul>li]:mb-1">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// --- ConceptTerm ---

interface ConceptTermProps {
  definition?: string
  href?: string // Optional link (e.g., Wikipedia) for further reading
  children?: React.ReactNode
}

export function ConceptTerm({ definition, href, children }: ConceptTermProps) {
  if (!definition && !href) {
    return <span className="font-semibold text-foreground">{children}</span>
  }

  const content = (
    <span className="relative group/term inline">
      <span
        className={cn(
          'font-semibold text-foreground border-b border-dotted border-foreground/40',
          href
            ? 'cursor-pointer hover:text-primary hover:border-primary/60 transition-colors'
            : 'cursor-help',
        )}
      >
        {children}
        {href && (
          <svg
            className="inline-block w-3 h-3 ml-0.5 mb-0.5 opacity-40 group-hover/term:opacity-70 transition-opacity"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M4.5 2A2.5 2.5 0 0 0 2 4.5v7A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5v-3a.5.5 0 0 0-1 0v3A1.5 1.5 0 0 1 11.5 13h-7A1.5 1.5 0 0 1 3 11.5v-7A1.5 1.5 0 0 1 4.5 3h3a.5.5 0 0 0 0-1h-3zM9 2.5a.5.5 0 0 1 .5-.5H14a.5.5 0 0 1 .5.5V7a.5.5 0 0 1-1 0V3.707l-5.146 5.147a.5.5 0 0 1-.708-.708L12.293 3H9.5a.5.5 0 0 1-.5-.5z" />
          </svg>
        )}
      </span>
      {definition && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-popover-foreground bg-popover border border-border rounded-md shadow-md whitespace-nowrap opacity-0 pointer-events-none group-hover/term:opacity-100 transition-opacity duration-150 z-50">
          {definition}
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline"
      >
        {content}
      </a>
    )
  }

  return content
}

// --- SectionDivider ---

export function SectionDivider() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="w-24 h-px bg-border" />
      <div className="mx-4 w-2 h-2 rounded-full bg-muted-foreground/30" />
      <div className="w-24 h-px bg-border" />
    </div>
  )
}
