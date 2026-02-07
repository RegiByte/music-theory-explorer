import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, Line } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotePicker } from '@/components/pickers'
import { C4_FREQUENCY } from '@/constants'
import {
  findHarmonicOverlap,
  generateHarmonics,
  generateWaveformPair,
} from '@/core/harmonics'
import { analyzeInterval } from '@/core/intervals'
import { noteToIndex, semitonesToHz } from '@/core/musicTheory'
import { useResource } from '@/system'
import type { Note } from '@/schemas'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

const COLORS = {
  note1: '#3b82f6', // blue-500
  note2: '#a855f7', // purple-500
  combined: '#7c3aed', // violet-600
  overlap: '#16a34a', // green-600
} as const

function getConsonanceBadgeColor(
  consonance: number,
): 'default' | 'secondary' | 'destructive' {
  if (consonance >= 0.8) return 'default'
  if (consonance >= 0.5) return 'secondary'
  return 'destructive'
}

export function HarmonicOverlap() {
  const audio = useResource('audio')
  const { t } = useTranslation('tools')
  const [note1, setNote1] = useState<Note>('C')
  const [note2, setNote2] = useState<Note>('G')
  const [isAnimating, setIsAnimating] = useState(false)
  const [phase, setPhase] = useState(0)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const lastTimeRef = useRef<number | undefined>(undefined)

  // Calculate frequencies
  const freq1 = useMemo(() => {
    const semitonesFromC = noteToIndex(note1) - noteToIndex('C')
    return semitonesToHz(semitonesFromC, C4_FREQUENCY)
  }, [note1])

  const freq2 = useMemo(() => {
    const semitonesFromC = noteToIndex(note2) - noteToIndex('C')
    return semitonesToHz(semitonesFromC, C4_FREQUENCY)
  }, [note2])

  // Analyze interval
  const interval = useMemo(
    () => analyzeInterval(note1, note2, freq1, freq2),
    [note1, note2, freq1, freq2],
  )

  // Generate harmonics and find overlaps
  const harmonics1 = useMemo(() => generateHarmonics(freq1), [freq1])
  const harmonics2 = useMemo(() => generateHarmonics(freq2), [freq2])
  const overlaps = useMemo(
    () => findHarmonicOverlap(freq1, freq2),
    [freq1, freq2],
  )

  // Count overlapping harmonics
  const overlapCount = useMemo(
    () => overlaps.filter((o) => o.isOverlapping).length,
    [overlaps],
  )

  // Animation loop
  useEffect(() => {
    if (!isAnimating) {
      lastTimeRef.current = undefined
      return
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current !== undefined) {
        const deltaTime = (currentTime - lastTimeRef.current) / 1000 // Convert to seconds
        // Slow, smooth animation: about 0.5 Hz (one cycle every 2 seconds)
        // This creates a gentle, meditative flowing effect
        setPhase((prevPhase) => prevPhase + 2 * Math.PI * 0.1 * deltaTime)
      }
      lastTimeRef.current = currentTime
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isAnimating, freq1, freq2])

  // Reset phase when notes change
  useEffect(() => {
    startTransition(() => {
      setPhase(0)
    })
  }, [note1, note2])

  // Generate waveforms for visualization
  const waveforms = useMemo(
    () => generateWaveformPair(freq1, freq2, 3, phase),
    [freq1, freq2, phase],
  )

  // Waveform chart data
  const waveformChartData = useMemo(() => {
    const timeLabels = waveforms.waveform1.map((p) =>
      (p.time * 1000).toFixed(1),
    )

    return {
      labels: timeLabels,
      datasets: [
        {
          label: `${note1} (${freq1.toFixed(1)} Hz)`,
          data: waveforms.waveform1.map((p) => p.amplitude),
          borderColor: COLORS.note1,
          backgroundColor: `${COLORS.note1}33`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: `${note2} (${freq2.toFixed(1)} Hz)`,
          data: waveforms.waveform2.map((p) => p.amplitude),
          borderColor: COLORS.note2,
          backgroundColor: `${COLORS.note2}33`,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
        },
        {
          label: t('harmonicOverlap.datasetCombined'),
          data: waveforms.combined.map((p) => p.amplitude),
          borderColor: COLORS.combined,
          backgroundColor: `${COLORS.combined}22`,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
      ],
    }
  }, [waveforms, note1, note2, freq1, freq2, t])

  const waveformChartOptions: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              return t('harmonicOverlap.tooltipTime', { value: item.label })
            },
            label: (context) => {
              const value = context.parsed.y ?? 0
              return `${context.dataset.label}: ${value.toFixed(3)}`
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('harmonicOverlap.axisTimeMs'),
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          ticks: {
            maxTicksLimit: 10,
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
        },
        y: {
          title: {
            display: true,
            text: t('harmonicOverlap.axisAmplitude'),
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          min: -2.5,
          max: 2.5,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    }),
    [t],
  )

  // Harmonic bar chart data
  const harmonicChartData = useMemo(() => {
    const labels = harmonics1.map((h) => h.harmonicNumber.toString())

    // Create a map of overlapping harmonics for quick lookup
    const overlapMap = new Map<string, boolean>()
    overlaps.forEach((o) => {
      if (o.isOverlapping) {
        overlapMap.set(`${o.harmonic1Number}-${o.harmonic2Number}`, true)
      }
    })

    return {
      labels,
      datasets: [
        {
          label: t('harmonicOverlap.datasetHarmonics', { note: note1 }),
          data: harmonics1.map((h) => h.frequency),
          backgroundColor: harmonics1.map((h) => {
            const hasOverlap = overlaps.some(
              (o) => o.harmonic1Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : COLORS.note1
          }),
          borderColor: harmonics1.map((h) => {
            const hasOverlap = overlaps.some(
              (o) => o.harmonic1Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : COLORS.note1
          }),
          borderWidth: 1,
          _harmonics: harmonics1,
          _note: note1,
        },
        {
          label: t('harmonicOverlap.datasetHarmonics', { note: note2 }),
          data: harmonics2.map((h) => h.frequency),
          backgroundColor: harmonics2.map((h) => {
            const hasOverlap = overlaps.some(
              (o) => o.harmonic2Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : COLORS.note2
          }),
          borderColor: harmonics2.map((h) => {
            const hasOverlap = overlaps.some(
              (o) => o.harmonic2Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : COLORS.note2
          }),
          borderWidth: 1,
          _harmonics: harmonics2,
          _note: note2,
        },
      ],
    }
  }, [harmonics1, harmonics2, overlaps, note1, note2, t])

  const harmonicChartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (_event, elements) => {
        if (!elements.length) return
        const element = elements[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataset = harmonicChartData.datasets[element.datasetIndex] as any
        const harmonic = dataset._harmonics[element.index]
        if (harmonic) {
          audio.playFrequency(harmonic.frequency, 0.5)
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              return t('harmonicOverlap.tooltipHarmonic', {
                number: item.label,
              })
            },
            label: (context) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dataset = context.dataset as any
              const harmonic = dataset._harmonics[context.dataIndex]
              if (!harmonic) return ''

              const overlap = overlaps.find(
                (o) =>
                  (o.harmonic1Number === harmonic.harmonicNumber &&
                    dataset._note === note1) ||
                  (o.harmonic2Number === harmonic.harmonicNumber &&
                    dataset._note === note2),
              )

              const lines = [
                t('harmonicOverlap.tooltipNoteHarmonic', {
                  note: dataset._note,
                  number: harmonic.harmonicNumber,
                }),
                t('harmonicOverlap.tooltipFrequency', {
                  value: harmonic.frequency.toFixed(2),
                }),
                t('harmonicOverlap.tooltipNote', {
                  note: harmonic.closestNote,
                }),
              ]

              if (overlap?.isOverlapping) {
                lines.push(
                  t('harmonicOverlap.tooltipOverlaps', {
                    value: overlap.centsDifference.toFixed(1),
                  }),
                )
              }

              return lines
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('harmonicOverlap.axisHarmonicNumber'),
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          title: {
            display: true,
            text: t('harmonicOverlap.axisFrequency'),
            font: {
              size: 14,
              weight: 'bold',
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    }),
    [audio, harmonicChartData, overlaps, note1, note2, t],
  )

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">
            {t('harmonicOverlap.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('harmonicOverlap.description')}
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">
              {t('harmonicOverlap.note1')}
            </span>
            <NotePicker value={note1} onValueChange={(v) => v && setNote1(v)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">
              {t('harmonicOverlap.note2')}
            </span>
            <NotePicker value={note2} onValueChange={(v) => v && setNote2(v)} />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => audio.playFrequency(freq1, 0.5)}
            >
              {t('harmonicOverlap.playNote', { note: note1 })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => audio.playFrequency(freq2, 0.5)}
            >
              {t('harmonicOverlap.playNote', { note: note2 })}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => audio.playFrequencies([freq1, freq2], 1.0)}
            >
              {t('harmonicOverlap.playBoth')}
            </Button>
            <Button
              variant={isAnimating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsAnimating(!isAnimating)}
            >
              {isAnimating
                ? t('harmonicOverlap.pause')
                : t('harmonicOverlap.animate')}
            </Button>
          </div>
        </div>

        {/* Interval Info */}
        <div className="rounded-lg bg-linear-to-r from-blue-50 to-purple-50 p-4 border border-blue-200">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <h4 className="text-lg font-bold text-gray-800">{interval.name}</h4>
            <Badge variant={getConsonanceBadgeColor(interval.consonance)}>
              {t('harmonicOverlap.consonanceLabel', {
                value: Math.round(interval.consonance * 100),
              })}
            </Badge>
            <span className="text-sm text-gray-600">
              {t('harmonicOverlap.semitonesRatio', {
                semitones: interval.semitones,
                ratio: interval.ratio.toFixed(3),
                cents: interval.cents.toFixed(0),
              })}
            </span>
          </div>
          <div className="text-sm text-gray-700">
            <span className="font-semibold">
              {t('harmonicOverlap.harmonicAlignment')}
            </span>{' '}
            {t('harmonicOverlap.harmonicsOverlap', {
              count: overlapCount,
              total: harmonics1.length,
            })}
          </div>
        </div>
      </div>

      {/* Waveform Visualization */}
      <div className="mb-8">
        <h4 className="text-md font-semibold mb-3 text-gray-800">
          {t('harmonicOverlap.waveformInterference')}
        </h4>
        <div className="h-80 w-full">
          <Line data={waveformChartData} options={waveformChartOptions} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t('harmonicOverlap.waveformHint')}
        </p>
      </div>

      {/* Harmonic Alignment */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 text-gray-800">
          {t('harmonicOverlap.harmonicFrequencyAlignment')}
        </h4>
        <div className="h-80 w-full">
          <Bar data={harmonicChartData} options={harmonicChartOptions} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t('harmonicOverlap.harmonicAlignmentHint')}
        </p>
      </div>

      {/* Explanation */}
      <div className="rounded-lg border border-emerald-200 bg-linear-to-r from-emerald-50 to-blue-50 p-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          {t('harmonicOverlap.consonanceAnalysis')}
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {interval.consonance >= 0.9
            ? t('harmonicOverlap.consonanceStrong')
            : interval.consonance >= 0.7
              ? t('harmonicOverlap.consonanceGood')
              : interval.consonance >= 0.5
                ? t('harmonicOverlap.consonanceModerate')
                : interval.consonance >= 0.3
                  ? t('harmonicOverlap.consonanceLimited')
                  : t('harmonicOverlap.consonanceMinimal')}
        </p>
      </div>
    </Card>
  )
}
