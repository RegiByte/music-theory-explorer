import { useState, useMemo, useEffect } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'
import { useTranslation } from 'react-i18next'
import { useResource } from '@/system'
import { Card } from '@/components/ui/card'
import { GenrePicker } from '@/components/pickers'
import { GENRE_DISPLAY } from '@/core/musicData'
import type { Genre } from '@/schemas'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
)

const TOP_N = 30

// Color gradient from intense to faded
function getBarColor(index: number, total: number): string {
  const intensity = 1 - (index / total) * 0.7
  return `rgba(99, 102, 241, ${intensity})` // Indigo
}

function getBarHoverColor(index: number, total: number): string {
  const intensity = 1 - (index / total) * 0.5
  return `rgba(79, 70, 229, ${intensity})` // Darker indigo
}

export function ChordFrequencyChart() {
  const [genre, setGenre] = useState<Genre>('pop')
  const [frequencies, setFrequencies] = useState<Record<string, number>>({})
  const { t } = useTranslation('tools')
  const recommender = useResource('recommender')
  const audio = useResource('audio')

  useEffect(() => {
    recommender.getChordFrequencies(genre).then(setFrequencies)
  }, [genre, recommender])

  // Sort and take top N
  const sortedChords = useMemo(() => {
    return Object.entries(frequencies)
      .sort(([, a], [, b]) => b - a)
      .slice(0, TOP_N)
  }, [frequencies])

  // Compute insight: top 10 coverage
  const top10Coverage = useMemo(() => {
    const allFreqs = Object.values(frequencies)
    const totalFreq = allFreqs.reduce((sum, f) => sum + f, 0)
    if (totalFreq === 0) return 0
    const top10Freq = allFreqs
      .sort((a, b) => b - a)
      .slice(0, 10)
      .reduce((sum, f) => sum + f, 0)
    return (top10Freq / totalFreq) * 100
  }, [frequencies])

  const chartData = useMemo(() => {
    const labels = sortedChords.map(([chord]) => chord)
    const data = sortedChords.map(([, freq]) => freq * 100)

    return {
      labels,
      datasets: [
        {
          label: t('chordFrequencyChart.datasetLabel'),
          data,
          backgroundColor: sortedChords.map((_, i) => getBarColor(i, sortedChords.length)),
          hoverBackgroundColor: sortedChords.map((_, i) => getBarHoverColor(i, sortedChords.length)),
          borderRadius: 4,
          borderSkipped: false,
          _chords: labels,
        },
      ],
    }
  }, [sortedChords, t])

  const chartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      interaction: {
        mode: 'nearest' as const,
        intersect: true,
        axis: 'y' as const,
      },
      onClick: (_event, elements) => {
        if (elements.length > 0) {
          const element = elements[0]
          const chord = sortedChords[element.index]?.[0]
          if (chord) {
            // Play a simple tone for the chord root
            const noteFreqs: Record<string, number> = {
              C: 261.63, 'C#': 277.18, Db: 277.18,
              D: 293.66, 'D#': 311.13, Eb: 311.13,
              E: 329.63, F: 349.23,
              'F#': 369.99, Gb: 369.99,
              G: 392.00, 'G#': 415.30, Ab: 415.30,
              A: 440.00, 'A#': 466.16, Bb: 466.16,
              B: 493.88,
            }
            // Extract root note from chord name (e.g., "Am" -> "A", "C#m" -> "C#", "Bb7" -> "Bb")
            const rootMatch = chord.match(/^([A-G][#b]?)/)
            if (rootMatch) {
              const freq = noteFreqs[rootMatch[1]]
              if (freq) audio.playNote(freq, 0.3)
            }
          }
        }
      },
      plugins: {
        title: {
          display: false,
        },
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0
              return `${sortedChords[idx]?.[0] ?? ''}`
            },
            label: (context) => {
              const idx = context.dataIndex
              const [, freq] = sortedChords[idx] ?? ['', 0]
              const friction = 1.0 - Math.min(freq * 10, 1.0)
              const rank = idx + 1
              const rarityLabel = friction < 0.3 
                ? t('chordFrequencyChart.tooltipRarityCommon')
                : friction < 0.7 
                ? t('chordFrequencyChart.tooltipRarityUncommon')
                : t('chordFrequencyChart.tooltipRarityRare')
              return [
                t('chordFrequencyChart.tooltipFrequency', { value: (freq * 100).toFixed(2) }),
                t('chordFrequencyChart.tooltipRank', { rank, genre: GENRE_DISPLAY[genre] }),
                t('chordFrequencyChart.tooltipRarity', { label: rarityLabel }),
              ]
            },
          },
        },
        annotation: {
          annotations: {
            top10Line: {
              type: 'line' as const,
              yMin: 9.5,
              yMax: 9.5,
              borderColor: 'rgba(239, 68, 68, 0.5)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: t('chordFrequencyChart.top10Line', { value: top10Coverage.toFixed(0) }),
                position: 'end' as const,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                color: '#fff',
                font: { size: 11 },
                padding: 4,
              },
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('chordFrequencyChart.axisFrequency'),
            font: { size: 13, weight: 'bold' as const },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.06)',
          },
        },
        y: {
          title: {
            display: false,
          },
          ticks: {
            font: { size: 12, weight: 'bold' as const },
            autoSkip: false,
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    [sortedChords, genre, top10Coverage, audio, t]
  )

  if (sortedChords.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-12">{t('chordFrequencyChart.loading')}</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-3 mb-4">
        <h3 className="text-xl font-semibold">{t('chordFrequencyChart.title')}</h3>
        <GenrePicker value={genre} onValueChange={setGenre} size="xs" />
      </div>

      <div className="h-[700px] w-full">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="mt-4 p-4 bg-linear-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <p 
          className="text-sm text-gray-700 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: t('chordFrequencyChart.top10Summary', { 
              value: top10Coverage.toFixed(0), 
              genre: GENRE_DISPLAY[genre] 
            }) 
          }}
        />
      </div>
    </Card>
  )
}
