import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { Card } from '@/components/ui/card'
import { NotePicker } from '@/components/pickers'
import { C4_FREQUENCY, MAX_HARMONICS } from '@/constants'
import { generateHarmonics } from '@/core/harmonics'
import { noteToIndex, semitonesToHz } from '@/core/musicTheory'
import { useResource } from '@/system'
import type { Note } from '@/schemas'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const HARMONIC_COLORS = {
  strong: '#16a34a',
  medium: '#f59e0b',
  weak: '#ef4444',
} as const

const CENTS_COLORS = {
  octave: '#16a34a',
  neutral: '#60a5fa',
} as const

function getHarmonicColor(harmonicNumber: number): string {
  if (harmonicNumber <= 4) return HARMONIC_COLORS.strong
  if (harmonicNumber <= 8) return HARMONIC_COLORS.medium
  return HARMONIC_COLORS.weak
}

function isPowerOfTwo(value: number): boolean {
  return value > 0 && (value & (value - 1)) === 0
}

export function HarmonicSeries() {
  const { t } = useTranslation('tools')
  const audio = useResource('audio')
  const [rootNote, setRootNote] = useState<Note>('C')

  const fundamentalFreq = useMemo(() => {
    const semitonesFromC = noteToIndex(rootNote) - noteToIndex('C')
    return semitonesToHz(semitonesFromC, C4_FREQUENCY)
  }, [rootNote])

  const harmonics = useMemo(
    () => generateHarmonics(fundamentalFreq, MAX_HARMONICS),
    [fundamentalFreq],
  )

  const chartData = useMemo(() => {
    const labels = harmonics.map((harmonic) =>
      harmonic.harmonicNumber.toString(),
    )
    const colors = harmonics.map((harmonic) =>
      getHarmonicColor(harmonic.harmonicNumber),
    )

    return {
      labels,
      datasets: [
        {
          label: t('harmonicSeries.datasetFrequency'),
          data: harmonics.map((harmonic) => harmonic.frequency),
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1,
          _harmonics: harmonics,
        },
      ],
    }
  }, [harmonics, t])

  const centsChartData = useMemo(() => {
    const labels = harmonics.map((harmonic) =>
      harmonic.harmonicNumber.toString(),
    )

    return {
      labels,
      datasets: [
        {
          label: t('harmonicSeries.datasetCents'),
          data: harmonics.map((harmonic) => Math.abs(harmonic.centsDeviation)),
          minBarLength: 2,
          backgroundColor: (context: any) => {
            const harmonic = harmonics[context.dataIndex]
            if (!harmonic) return CENTS_COLORS.neutral
            return isPowerOfTwo(harmonic.harmonicNumber)
              ? CENTS_COLORS.octave
              : CENTS_COLORS.neutral
          },
          borderColor: (context: any) => {
            const harmonic = harmonics[context.dataIndex]
            if (!harmonic) return CENTS_COLORS.neutral
            return isPowerOfTwo(harmonic.harmonicNumber)
              ? CENTS_COLORS.octave
              : CENTS_COLORS.neutral
          },
          borderWidth: (context: any) => {
            const harmonic = harmonics[context.dataIndex]
            if (!harmonic) return 1
            return isPowerOfTwo(harmonic.harmonicNumber) ? 2 : 1
          },
        },
      ],
    }
  }, [harmonics, t])

  const labelPlugin = useMemo(
    () => ({
      id: 'harmonicNoteLabels',
      afterDatasetsDraw: (chart: ChartJS) => {
        const meta = chart.getDatasetMeta(0)
        const dataset = chart.data.datasets[0] as any
        const datasetHarmonics = dataset?._harmonics as
          | typeof harmonics
          | undefined
        const ctx = chart.ctx
        const fontSize = 11

        if (!datasetHarmonics) return

        ctx.save()
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
        ctx.fillStyle = '#111827'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        meta.data.forEach((bar, index) => {
          const harmonic = datasetHarmonics[index]
          if (!harmonic || !bar) return
          ctx.fillText(harmonic.closestNote, bar.x, bar.y - 6)
        })

        ctx.restore()
      },
    }),
    [],
  )

  const chartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: true,
      },
      onClick: (_event, elements) => {
        if (!elements.length) return
        const element = elements[0]
        const dataset = chartData.datasets[element.datasetIndex] as any
        const harmonic = dataset._harmonics[element.index]
        if (harmonic) {
          audio.playFrequency(harmonic.frequency, 0.5)
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              return t('harmonicSeries.tooltipHarmonic', { number: item.label })
            },
            label: (context) => {
              const dataset = context.dataset as any
              const harmonic = dataset._harmonics[context.dataIndex]
              if (!harmonic) return ''
              return [
                t('harmonicSeries.tooltipFrequency', {
                  value: harmonic.frequency.toFixed(2),
                }),
                t('harmonicSeries.tooltipClosestNote', {
                  note: harmonic.closestNote,
                }),
                t('harmonicSeries.tooltipCentsOff', {
                  value: harmonic.centsDeviation.toFixed(1),
                }),
                t('harmonicSeries.tooltipInterval', {
                  interval: harmonic.intervalFromFundamental,
                }),
              ]
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('harmonicSeries.axisHarmonicNumber'),
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
            text: t('harmonicSeries.axisFrequency'),
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
    [audio, chartData.datasets, t],
  )

  const centsChartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: true,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const item = items[0]
              return t('harmonicSeries.tooltipHarmonic', { number: item.label })
            },
            label: (context) => {
              const harmonic = harmonics[context.dataIndex]
              if (!harmonic) return ''
              return t('harmonicSeries.tooltipDeviation', {
                value: Math.abs(harmonic.centsDeviation).toFixed(1),
              })
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('harmonicSeries.axisHarmonicNumber'),
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
            text: t('harmonicSeries.axisCentsDeviation'),
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
    [harmonics, t],
  )

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-semibold">
              {t('harmonicSeries.title')}
            </h3>
            <p className="text-sm text-gray-600">
              {t('harmonicSeries.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">
              {t('harmonicSeries.rootNote')}
            </label>
            <NotePicker
              value={rootNote}
              onValueChange={(v) => v && setRootNote(v)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">{t('harmonicSeries.clickHint')}</p>
      </div>

      <div className="space-y-8">
        <div className="h-96 w-full">
          <Bar
            data={chartData}
            options={chartOptions}
            plugins={[labelPlugin]}
          />
        </div>
        <div className="h-80 w-full">
          <Bar data={centsChartData} options={centsChartOptions} />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-emerald-200 bg-linear-to-r from-emerald-50 to-amber-50 p-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          {t('harmonicSeries.harmonicRatios')}
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {t('harmonicSeries.harmonicRatiosText')}
        </p>
      </div>
    </Card>
  )
}
