import { useState, useMemo, useEffect, useCallback, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GenrePicker } from '@/components/pickers'
import { GENRE_DISPLAY } from '@/core/musicData'
import type { Genre } from '@/schemas'

const NOTE_FREQS: Record<string, number> = {
  C: 261.63,
  'C#': 277.18,
  Db: 277.18,
  D: 293.66,
  'D#': 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  'F#': 369.99,
  Gb: 369.99,
  G: 392.0,
  'G#': 415.3,
  Ab: 415.3,
  A: 440.0,
  'A#': 466.16,
  Bb: 466.16,
  B: 493.88,
}

function chordToFreq(chord: string): number | null {
  const rootMatch = chord.match(/^([A-G][#b]?)/)
  if (rootMatch) return NOTE_FREQS[rootMatch[1]] ?? null
  return null
}

// Color intensity from probability (0-1) to CSS color
function probToColor(prob: number, maxProb: number): string {
  if (prob === 0) return 'transparent'
  const intensity = Math.min(1, prob / Math.max(maxProb, 0.001))
  // White -> Indigo gradient
  const r = Math.round(255 - intensity * 186) // 255 -> 69
  const g = Math.round(255 - intensity * 193) // 255 -> 62
  const b = Math.round(255 - intensity * 14) // 255 -> 241
  return `rgb(${r}, ${g}, ${b})`
}

function probToTextColor(prob: number, maxProb: number): string {
  const intensity = Math.min(1, prob / Math.max(maxProb, 0.001))
  return intensity > 0.5 ? '#fff' : '#374151'
}

interface TransitionHeatmapProps {
  mode: 'single-chord' | 'matrix'
}

export function TransitionHeatmap({ mode }: TransitionHeatmapProps) {
  const [genre, setGenre] = useState<Genre>('pop')
  const [topN, setTopN] = useState(mode === 'matrix' ? 15 : 20)
  const [selectedChord, setSelectedChord] = useState<string>('C')
  const [hoveredCell, setHoveredCell] = useState<{
    row: number
    col: number
  } | null>(null)
  const [transitions, setTransitions] = useState<
    Record<string, Record<string, number>>
  >({})
  const [topChords, setTopChords] = useState<string[]>([])
  const recommender = useResource('recommender')
  const audio = useResource('audio')

  useEffect(() => {
    async function load() {
      const [trans, top] = await Promise.all([
        recommender.getTransitionMatrix(genre),
        recommender.getTopChords(genre, Math.max(topN, 30)),
      ])
      setTransitions(trans)
      setTopChords(top)
      // Reset selected chord if it's no longer in top chords
      if (!top.includes(selectedChord) && top.length > 0) {
        setSelectedChord(top[0])
      }
    }
    load()
  }, [genre, recommender, topN])

  const playChord = useCallback(
    (chord: string) => {
      const freq = chordToFreq(chord)
      if (freq) audio.playNote(freq, 0.3)
    },
    [audio],
  )

  const playTransition = useCallback(
    (from: string, to: string) => {
      const f1 = chordToFreq(from)
      const f2 = chordToFreq(to)
      if (f1) audio.playNote(f1, 0.3)
      if (f2) setTimeout(() => audio.playNote(f2, 0.3), 400)
    },
    [audio],
  )

  // --- Single-chord mode ---
  if (mode === 'single-chord') {
    return (
      <SingleChordView
        genre={genre}
        setGenre={setGenre}
        selectedChord={selectedChord}
        setSelectedChord={setSelectedChord}
        transitions={transitions}
        topChords={topChords}
        playChord={playChord}
        playTransition={playTransition}
      />
    )
  }

  // --- Full matrix mode ---
  return (
    <MatrixView
      genre={genre}
      setGenre={setGenre}
      topN={topN}
      setTopN={setTopN}
      transitions={transitions}
      topChords={topChords}
      hoveredCell={hoveredCell}
      setHoveredCell={setHoveredCell}
      playTransition={playTransition}
      playChord={playChord}
    />
  )
}

// ─── Single-Chord View ────────────────────────────────────────────────────────

interface SingleChordViewProps {
  genre: Genre
  setGenre: (g: Genre) => void
  selectedChord: string
  setSelectedChord: (c: string) => void
  transitions: Record<string, Record<string, number>>
  topChords: string[]
  playChord: (c: string) => void
  playTransition: (from: string, to: string) => void
}

function SingleChordView({
  genre,
  setGenre,
  selectedChord,
  setSelectedChord,
  transitions,
  topChords,
  playTransition,
}: SingleChordViewProps) {
  const chordTransitions = useMemo(() => {
    const trans = transitions[selectedChord] || {}
    return Object.entries(trans)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
  }, [transitions, selectedChord])

  const maxProb = chordTransitions[0]?.[1] ?? 0

  if (topChords.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-8">
          Loading transition data...
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-3 mb-4">
        <h3 className="text-xl font-semibold">Chord Transitions</h3>
        <GenrePicker value={genre} onValueChange={setGenre} size="xs" />
      </div>

      {/* Chord selector */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {topChords.slice(0, 20).map((chord) => (
          <Button
            key={chord}
            variant={chord === selectedChord ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedChord(chord)}
            className="text-xs"
          >
            {chord}
          </Button>
        ))}
      </div>

      {/* Transition bars */}
      <div className="space-y-1.5">
        {chordTransitions.map(([chord, prob]) => (
          <button
            key={chord}
            className="w-full flex items-center gap-3 group cursor-pointer hover:bg-gray-50 rounded-md px-2 py-1 transition-colors"
            onClick={() => playTransition(selectedChord, chord)}
          >
            <span className="w-12 text-sm font-bold text-right shrink-0">
              {chord}
            </span>
            <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${Math.max((prob / maxProb) * 100, 2)}%`,
                  backgroundColor: probToColor(prob, maxProb),
                }}
              />
              <span
                className="absolute inset-0 flex items-center px-2 text-xs font-medium"
                style={{ color: prob / maxProb > 0.4 ? '#fff' : '#374151' }}
              >
                {(prob * 100).toFixed(1)}%
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-3 italic">
        Click any row to hear the transition.
      </p>
    </Card>
  )
}

// ─── Matrix View ──────────────────────────────────────────────────────────────

interface MatrixViewProps {
  genre: Genre
  setGenre: (g: Genre) => void
  topN: number
  setTopN: (n: number) => void
  transitions: Record<string, Record<string, number>>
  topChords: string[]
  hoveredCell: { row: number; col: number } | null
  setHoveredCell: (c: { row: number; col: number } | null) => void
  playTransition: (from: string, to: string) => void
  playChord: (c: string) => void
}

function MatrixView({
  genre,
  setGenre,
  topN,
  setTopN,
  transitions,
  topChords,
  hoveredCell,
  setHoveredCell,
  playTransition,
  playChord,
}: MatrixViewProps) {
  const { t } = useTranslation('tools')
  const chords = topChords.slice(0, topN)

  // Build matrix + find max probability for color scaling
  const { matrix, maxProb } = useMemo(() => {
    let max = 0
    const m = chords.map((from) => {
      return chords.map((to) => {
        const prob = transitions[from]?.[to] ?? 0
        if (prob > max) max = prob
        return prob
      })
    })
    return { matrix: m, maxProb: max }
  }, [chords, transitions])

  if (chords.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-12">
          {t('transitionHeatmap.loadingMatrix')}
        </p>
      </Card>
    )
  }

  const cellSize = topN <= 10 ? 48 : topN <= 15 ? 40 : 34
  const headerSize = 48

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="text-xl font-semibold">
          {t('transitionHeatmap.chordTransitionMatrix')}
        </h3>
        <div className="flex gap-2 items-center flex-wrap">
          <GenrePicker value={genre} onValueChange={setGenre} size="xs" />
          <div className="flex gap-1">
            {[10, 15, 20].map((n) => (
              <Button
                key={n}
                variant={topN === n ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTopN(n)}
                className="text-xs"
              >
                {n}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `${headerSize}px repeat(${chords.length}, ${cellSize}px)`,
            gridTemplateRows: `${headerSize}px repeat(${chords.length}, ${cellSize}px)`,
            gap: '1px',
          }}
        >
          {/* Top-left corner */}
          <div className="flex items-end justify-end pr-1 pb-1 text-[10px] text-gray-400">
            <span>{t('transitionHeatmap.fromTo')}</span>
          </div>

          {/* Column headers */}
          {chords.map((chord, colIdx) => (
            <button
              key={`col-${chord}`}
              className={`flex items-center justify-center text-xs font-bold cursor-pointer transition-colors rounded-sm ${
                hoveredCell?.col === colIdx
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
              }}
              onClick={() => playChord(chord)}
            >
              {chord}
            </button>
          ))}

          {/* Rows */}
          {chords.map((fromChord, rowIdx) => (
            <Fragment key={`row-${fromChord}`}>
              {/* Row header */}
              <button
                className={`flex items-center justify-end pr-2 text-xs font-bold cursor-pointer transition-colors rounded-sm ${
                  hoveredCell?.row === rowIdx
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => playChord(fromChord)}
              >
                {fromChord}
              </button>

              {/* Data cells */}
              {chords.map((toChord, colIdx) => {
                const prob = matrix[rowIdx][colIdx]
                const isHoveredRow = hoveredCell?.row === rowIdx
                const isHoveredCol = hoveredCell?.col === colIdx
                const isExactHover = isHoveredRow && isHoveredCol
                const isCrosshair = isHoveredRow || isHoveredCol

                return (
                  <button
                    key={`${fromChord}-${toChord}`}
                    className={`relative cursor-pointer transition-all duration-100 rounded-sm border ${
                      isExactHover
                        ? 'border-indigo-600 ring-2 ring-indigo-400 z-10'
                        : isCrosshair
                          ? 'border-indigo-200'
                          : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor:
                        prob > 0 ? probToColor(prob, maxProb) : '#f9fafb',
                    }}
                    onMouseEnter={() =>
                      setHoveredCell({ row: rowIdx, col: colIdx })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => playTransition(fromChord, toChord)}
                    title={`${fromChord} → ${toChord}: ${(prob * 100).toFixed(1)}%`}
                  >
                    {prob > 0 && cellSize >= 40 && (
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-medium"
                        style={{ color: probToTextColor(prob, maxProb) }}
                      >
                        {(prob * 100).toFixed(0)}
                      </span>
                    )}
                  </button>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Hover info */}
      <div className="h-6 mt-2">
        {hoveredCell && (
          <p className="text-sm text-gray-600">
            <strong>{chords[hoveredCell.row]}</strong> →{' '}
            <strong>{chords[hoveredCell.col]}</strong>:{' '}
            <span className="font-mono">
              {(matrix[hoveredCell.row][hoveredCell.col] * 100).toFixed(2)}%
            </span>{' '}
            {t('transitionHeatmap.probability', {
              genre: GENRE_DISPLAY[genre],
            })}
          </p>
        )}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-gray-500">0%</span>
        <div className="flex h-4 flex-1 max-w-48 rounded-sm overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => {
            const p = (i / 19) * maxProb
            return (
              <div
                key={i}
                className="flex-1"
                style={{ backgroundColor: probToColor(p, maxProb) }}
              />
            )
          })}
        </div>
        <span className="text-xs text-gray-500">
          {(maxProb * 100).toFixed(0)}%
        </span>
        <span className="text-xs text-muted-foreground ml-2 italic">
          {t('transitionHeatmap.clickCell')}
        </span>
      </div>
    </Card>
  )
}
