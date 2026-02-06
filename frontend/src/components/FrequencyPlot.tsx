import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { useTranslation, Trans } from 'react-i18next'
import { useResource } from '@/system'
import { getAllStringsData } from '@/core/frequencyAnalysis'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { UkuleleString } from '@/schemas'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

type ScaleType = 'linear' | 'log' | 'both'

// String colors matching the Fretboard component
const STRING_COLORS: Record<UkuleleString, string> = {
  G: '#3b82f6', // Blue
  C: '#10b981', // Green
  E: '#f59e0b', // Amber
  A: '#8b5cf6', // Purple
}

export function FrequencyPlot() {
  const [scaleType, setScaleType] = useState<ScaleType>('linear')
  const audio = useResource('audio')
  const { t } = useTranslation('tools')

  // Generate data for all strings
  const stringsData = useMemo(() => getAllStringsData(12), [])

  // Prepare chart data for single scale mode
  const chartData = useMemo(() => {
    if (scaleType === 'both') {
      // Return empty data for "both" mode - we'll render two separate charts
      return { labels: [], datasets: [] }
    }

    const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
    const frets = Array.from({ length: 13 }, (_, i) => i.toString())

    const datasets = strings.map((string) => {
      const data = stringsData[string]
      return {
        label: t('frequencyPlot.stringLabel', { string }),
        data: data.map((point) =>
          scaleType === 'log' ? point.logFrequency : point.frequency
        ),
        borderColor: STRING_COLORS[string],
        backgroundColor: STRING_COLORS[string] + '40',
        pointRadius: 8,
        pointHoverRadius: 12,
        pointBackgroundColor: STRING_COLORS[string],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.1,
        _originalData: data,
      }
    })

    return {
      labels: frets,
      datasets,
    }
  }, [stringsData, scaleType, t])

  // Prepare separate chart data for linear scale (used in "both" mode)
  const linearChartData = useMemo(() => {
    const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
    const frets = Array.from({ length: 13 }, (_, i) => i.toString())

    const datasets = strings.map((string) => {
      const data = stringsData[string]
      return {
        label: t('frequencyPlot.stringLabel', { string }),
        data: data.map((point) => point.frequency),
        borderColor: STRING_COLORS[string],
        backgroundColor: STRING_COLORS[string] + '40',
        pointRadius: 8,
        pointHoverRadius: 12,
        pointBackgroundColor: STRING_COLORS[string],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.1,
        _originalData: data,
      }
    })

    return {
      labels: frets,
      datasets,
    }
  }, [stringsData, t])

  // Prepare separate chart data for log scale (used in "both" mode)
  const logChartData = useMemo(() => {
    const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
    const frets = Array.from({ length: 13 }, (_, i) => i.toString())

    const datasets = strings.map((string) => {
      const data = stringsData[string]
      return {
        label: t('frequencyPlot.stringLabel', { string }),
        data: data.map((point) => point.logFrequency),
        borderColor: STRING_COLORS[string],
        backgroundColor: STRING_COLORS[string] + '40',
        pointRadius: 8,
        pointHoverRadius: 12,
        pointBackgroundColor: STRING_COLORS[string],
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.1,
        _originalData: data,
      }
    })

    return {
      labels: frets,
      datasets,
    }
  }, [stringsData, t])

  // Create chart options factory function
  const createChartOptions = (
    data: typeof chartData,
    isLogScale: boolean,
    title: string
  ): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'point' as const,
      intersect: true,
    },
    onClick: (_event, elements) => {
      if (elements.length > 0) {
        const element = elements[0]
        const datasetIndex = element.datasetIndex
        const dataIndex = element.index
        const dataset = data.datasets[datasetIndex] as any
        const dataPoint = dataset._originalData[dataIndex]

        if (dataPoint) {
          audio.playNote(dataPoint.frequency, 0.5)
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const datasetIndex = context.datasetIndex
            const dataIndex = context.dataIndex
            const dataset = data.datasets[datasetIndex] as any
            const dataPoint = dataset._originalData[dataIndex]

            if (dataPoint) {
              return [
                `String: ${dataPoint.string}`,
                `Fret: ${dataPoint.fret}`,
                `Note: ${dataPoint.note}`,
                `Frequency: ${dataPoint.frequency.toFixed(2)} Hz`,
                isLogScale
                  ? `Log₂(Freq): ${dataPoint.logFrequency.toFixed(2)}`
                  : '',
              ].filter(Boolean)
            }
            return context.dataset.label || ''
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: t('frequencyPlot.fretNumber'),
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        ticks: {
          stepSize: 1,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        type: isLogScale ? ('logarithmic' as const) : ('linear' as const),
        title: {
          display: true,
          text: isLogScale ? 'Log₂(Frequency)' : 'Frequency (Hz)',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  })

  // Chart options for single scale mode
  const chartOptions: ChartOptions<'line'> = useMemo(
    () =>
      createChartOptions(
        chartData,
        scaleType === 'log',
        scaleType === 'log'
          ? t('frequencyPlot.logChartTitle')
          : t('frequencyPlot.linearChartTitle')
      ),
    [scaleType, chartData, audio, t]
  )

  // Chart options for linear chart in "both" mode
  const linearChartOptions: ChartOptions<'line'> = useMemo(
    () =>
      createChartOptions(
        linearChartData,
        false,
        t('frequencyPlot.linearChartTitle')
      ),
    [linearChartData, audio, t]
  )

  // Chart options for log chart in "both" mode
  const logChartOptions: ChartOptions<'line'> = useMemo(
    () =>
      createChartOptions(
        logChartData,
        true,
        t('frequencyPlot.logChartTitle')
      ),
    [logChartData, audio, t]
  )

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">{t('frequencyPlot.title')}</h3>
          <div className="flex gap-2">
            <Button
              variant={scaleType === 'linear' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScaleType('linear')}
            >
              {t('frequencyPlot.linearScale')}
            </Button>
            <Button
              variant={scaleType === 'log' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScaleType('log')}
            >
              {t('frequencyPlot.logScale')}
            </Button>
            <Button
              variant={scaleType === 'both' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScaleType('both')}
            >
              {t('frequencyPlot.both')}
            </Button>
          </div>
        </div>

        {scaleType === 'both' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-96 w-full">
              <Line data={linearChartData} options={linearChartOptions} />
            </div>
            <div className="h-96 w-full">
              <Line data={logChartData} options={logChartOptions} />
            </div>
          </div>
        ) : (
          <div className="h-96 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-linear-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold mb-2 text-gray-800">
          {t('frequencyPlot.whatChartShows')}
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {scaleType === 'linear' ? (
            <Trans
              i18nKey="tools:frequencyPlot.linearExplanation"
              components={{ b: <strong /> }}
            />
          ) : scaleType === 'log' ? (
            <Trans
              i18nKey="tools:frequencyPlot.logExplanation"
              components={{ b: <strong /> }}
            />
          ) : (
            <Trans
              i18nKey="tools:frequencyPlot.bothExplanation"
              components={{ b: <strong /> }}
            />
          )}
        </p>
        <p className="text-xs text-gray-600 mt-2 italic">
          {t('frequencyPlot.clickHint')}
        </p>
      </div>
    </Card>
  )
}
