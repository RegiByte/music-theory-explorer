import { useState, useMemo, useEffect } from 'react'
import { Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import { Card } from '@/components/ui/card'
import { GenrePicker } from '@/components/pickers'
import { GENRE_DISPLAY, GENRE_COLORS, ALL_GENRES } from '@/core/musicData'
import {
  computeGenreFingerprint,
  FINGERPRINT_DIMENSIONS,
  type GenreFingerprint,
} from './genreFingerprints'
import type { Genre } from '@/schemas'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

/** Chart.js needs border/bg format for datasets */
const CHART_GENRE_COLORS: Record<Genre, { border: string; bg: string }> = {
  pop: { border: GENRE_COLORS.pop.solid, bg: GENRE_COLORS.pop.bg },
  rock: { border: GENRE_COLORS.rock.solid, bg: GENRE_COLORS.rock.bg },
  country: { border: GENRE_COLORS.country.solid, bg: GENRE_COLORS.country.bg },
  punk: { border: GENRE_COLORS.punk.solid, bg: GENRE_COLORS.punk.bg },
  alternative: {
    border: GENRE_COLORS.alternative.solid,
    bg: GENRE_COLORS.alternative.bg,
  },
  'pop rock': {
    border: GENRE_COLORS['pop rock'].solid,
    bg: GENRE_COLORS['pop rock'].bg,
  },
  rap: { border: GENRE_COLORS.rap.solid, bg: GENRE_COLORS.rap.bg },
  metal: { border: GENRE_COLORS.metal.solid, bg: GENRE_COLORS.metal.bg },
  soul: { border: GENRE_COLORS.soul.solid, bg: GENRE_COLORS.soul.bg },
}

export function GenreFingerprintsChart() {
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([
    'pop',
    'rock',
    'metal',
  ])
  const [fingerprints, setFingerprints] = useState<
    Record<Genre, GenreFingerprint>
  >({} as any)
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation('tools')
  const recommender = useResource('recommender')

  // Compute fingerprints for all genres on mount
  useEffect(() => {
    async function computeAll() {
      setLoading(true)
      const results: Record<string, GenreFingerprint> = {}
      for (const genre of ALL_GENRES) {
        const [frequencies, transitions] = await Promise.all([
          recommender.getChordFrequencies(genre),
          recommender.getTransitionMatrix(genre),
        ])
        results[genre] = computeGenreFingerprint(
          genre,
          frequencies,
          transitions,
        )
      }
      setFingerprints(results as Record<Genre, GenreFingerprint>)
      setLoading(false)
    }
    computeAll()
  }, [recommender])

  const chartData = useMemo(() => {
    const labels = FINGERPRINT_DIMENSIONS.map((d) => d.label)
    const datasets = selectedGenres
      .filter((g) => fingerprints[g])
      .map((genre) => {
        const fp = fingerprints[genre]
        const colors = CHART_GENRE_COLORS[genre]
        return {
          label: GENRE_DISPLAY[genre],
          data: FINGERPRINT_DIMENSIONS.map((d) => fp[d.key]),
          borderColor: colors.border,
          backgroundColor: colors.bg,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.border,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }
      })

    return { labels, datasets }
  }, [selectedGenres, fingerprints])

  const chartOptions: ChartOptions<'radar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 16,
            font: { size: 13 },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const dimIndex = context.dataIndex
              const dim = FINGERPRINT_DIMENSIONS[dimIndex]
              const value = context.raw as number
              return t('genreFingerprintsChart.dimensionDescription', {
                genre: context.dataset.label,
                value: (value * 100).toFixed(0),
                description: dim.description,
              })
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 1,
          ticks: {
            stepSize: 0.2,
            display: false,
          },
          pointLabels: {
            font: { size: 12, weight: 'bold' as const },
            padding: 12,
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.08)',
          },
          angleLines: {
            color: 'rgba(0, 0, 0, 0.08)',
          },
        },
      },
    }),
    [t],
  )

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-12">
          {t('genreFingerprintsChart.loading')}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-4 space-y-2">
        <h3 className="text-xl font-semibold">
          {t('genreFingerprintsChart.title')}
        </h3>
        <GenrePicker
          value={selectedGenres}
          onValueChange={setSelectedGenres}
          multi
          max={4}
          size="sm"
        />
        <p className="text-xs text-muted-foreground">
          {t('genreFingerprintsChart.selectHint')}
        </p>
      </div>

      <div className="h-[500px] w-full max-w-2xl mx-auto">
        <Radar data={chartData} options={chartOptions} />
      </div>

      <div className="mt-4 p-4 bg-linear-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <p
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html:
              t('genreFingerprintsChart.chordDiversity') +
              ' ' +
              t('genreFingerprintsChart.majorMinorRatio') +
              ' ' +
              t('genreFingerprintsChart.dominantUsage') +
              ' ' +
              t('genreFingerprintsChart.predictability') +
              ' ' +
              t('genreFingerprintsChart.chromaticColor'),
          }}
        />
      </div>
    </Card>
  )
}
