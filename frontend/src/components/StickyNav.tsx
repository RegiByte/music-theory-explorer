import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IconList, IconChevronUp } from '@tabler/icons-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface NavSection {
  id: string
  number: number
  titleKey: string
}

interface StickyNavProps {
  sections: NavSection[]
}

export function StickyNav({ sections }: StickyNavProps) {
  const { t } = useTranslation(['sections', 'common'])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [visible, setVisible] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Track which section is currently at the top of the viewport
  useEffect(() => {
    const sectionEls = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[]

    if (sectionEls.length === 0) return

    // We use a map to track visibility of each section
    const visibleSections = new Map<string, IntersectionObserverEntry>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibleSections.set(entry.target.id, entry)
        })

        // Find the topmost visible section
        let topMostIndex = -1
        let topMostTop = Infinity

        visibleSections.forEach((entry, id) => {
          if (entry.isIntersecting) {
            const rect = entry.boundingClientRect
            if (rect.top < topMostTop) {
              topMostTop = rect.top
              topMostIndex = sections.findIndex((s) => s.id === id)
            }
          }
        })

        // If nothing visible via intersection, find the section whose top is closest
        // to (but above) the viewport top — meaning we've scrolled past its header
        if (topMostIndex === -1) {
          let bestIndex = -1
          let bestDistance = -Infinity

          sectionEls.forEach((el, i) => {
            const rect = el.getBoundingClientRect()
            // Section top is above viewport top (scrolled past it)
            if (rect.top <= 80) {
              if (rect.top > bestDistance) {
                bestDistance = rect.top
                bestIndex = i
              }
            }
          })

          if (bestIndex !== -1) {
            topMostIndex = bestIndex
          }
        }

        if (topMostIndex !== -1) {
          setActiveIndex(topMostIndex)
        }
      },
      {
        // Offset by the sticky header height, observe when sections enter/leave
        rootMargin: '-64px 0px -40% 0px',
        threshold: [0, 0.1],
      },
    )

    sectionEls.forEach((el) => observerRef.current!.observe(el))

    return () => {
      observerRef.current?.disconnect()
    }
  }, [sections])

  // Show/hide the sticky bar based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past 200px (roughly past the header area)
      setVisible(window.scrollY > 200)
    }

    handleScroll() // Check initial state
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setTocOpen(false)
      }
    },
    [],
  )

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const activeSection = activeIndex >= 0 ? sections[activeIndex] : null
  const progress =
    activeIndex >= 0 ? ((activeIndex + 1) / sections.length) * 100 : 0

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Main bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container mx-auto max-w-6xl px-8 h-14 flex items-center gap-3">
          {/* TOC Button */}
          <Popover open={tocOpen} onOpenChange={setTocOpen}>
            <PopoverTrigger
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <IconList size={18} />
              <span className="hidden sm:inline">{t('common:nav.contents')}</span>
            </PopoverTrigger>

            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-80 p-0"
            >
              <nav className="py-2 max-h-[70vh] overflow-y-auto">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('common:nav.tableOfContents')}
                </div>
                {sections.map((section, i) => {
                  const isActive = i === activeIndex
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-muted/60'
                      }`}
                    >
                      <span
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : i < activeIndex
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {section.number}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {t(`sections:${section.titleKey}`)}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </PopoverContent>
          </Popover>

          {/* Separator */}
          <div className="w-px h-5 bg-border/60" />

          {/* Current section indicator */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {activeSection && (
              <>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {activeSection.number}
                </span>
                <span className="text-sm font-medium text-foreground/90 truncate">
                  {t(`sections:${activeSection.titleKey}`)}
                </span>
              </>
            )}
          </div>

          {/* Section count / scroll to top */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {activeIndex >= 0
                ? `${activeIndex + 1} / ${sections.length}`
                : ''}
            </span>
            <button
              onClick={scrollToTop}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label={t('common:nav.scrollToTop')}
            >
              <IconChevronUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-border/30">
        <div
          className="h-full bg-primary/60 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
