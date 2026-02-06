import { useState, useMemo } from 'react'
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
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotePicker } from '@/components/pickers'
import { C4_FREQUENCY } from '@/constants'
import {
  buildChordFromIntervals,
  analyzeChordQuality,
  getChordIntervalBreakdown,
  getChordSymbol,
} from '@/core/chords'
import {
  findHarmonicOverlap,
  generateHarmonics,
  generateMultipleWaveforms,
} from '@/core/harmonics'
import { noteToIndex, indexToNote, semitonesToHz } from '@/core/musicTheory'
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
  combined: '#7c3aed', // violet-600
  overlap: '#16a34a', // green-600
  quality: '#dc2626', // red-600
  stability: '#2563eb', // blue-600
  color: '#9333ea', // purple-600
}

// Diverse color palette for waveforms - high contrast and easily distinguishable
const WAVEFORM_COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#a855f7', // purple-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
]

interface IntervalOption {
  semitones: number
  name: string
  shortName: string
  role?: 'quality' | 'stability' | 'color'
}

const AVAILABLE_INTERVALS: IntervalOption[] = [
  { semitones: 1, name: 'Minor 2nd', shortName: 'm2' },
  { semitones: 2, name: 'Major 2nd', shortName: 'M2' },
  { semitones: 3, name: 'Minor 3rd', shortName: 'm3', role: 'quality' },
  { semitones: 4, name: 'Major 3rd', shortName: 'M3', role: 'quality' },
  { semitones: 5, name: 'Perfect 4th', shortName: 'P4' },
  { semitones: 6, name: 'Tritone', shortName: 'TT' },
  { semitones: 7, name: 'Perfect 5th', shortName: 'P5', role: 'stability' },
  { semitones: 8, name: 'Minor 6th', shortName: 'm6' },
  { semitones: 9, name: 'Major 6th', shortName: 'M6' },
  { semitones: 10, name: 'Minor 7th', shortName: 'm7', role: 'color' },
  { semitones: 11, name: 'Major 7th', shortName: 'M7', role: 'color' },
]

function getConsonanceBadgeColor(
  consonance: number,
): 'default' | 'secondary' | 'destructive' {
  if (consonance >= 0.8) return 'default'
  if (consonance >= 0.5) return 'secondary'
  return 'destructive'
}

function getRoleColor(role?: 'quality' | 'stability' | 'color'): string {
  if (role === 'quality') return COLORS.quality
  if (role === 'stability') return COLORS.stability
  if (role === 'color') return COLORS.color
  return '#6b7280' // gray-500
}

export function ChordBuilder() {
  const audio = useResource('audio')
  const { t } = useTranslation('tools')
  const [root, setRoot] = useState<Note>('C')
  const [selectedIntervals, setSelectedIntervals] = useState<Set<number>>(
    new Set([4, 7]), // Start with major triad (M3 + P5)
  )

  // Build chord from selected intervals
  const chord = useMemo(() => {
    const intervals = Array.from(selectedIntervals)
    return buildChordFromIntervals(root, intervals)
  }, [root, selectedIntervals])

  // Calculate frequencies for each note
  const noteFrequencies = useMemo(() => {
    const semitonesFromC = noteToIndex(root) - noteToIndex('C')
    const rootFreq = semitonesToHz(semitonesFromC, C4_FREQUENCY)

    return chord.notes.map((note, i) => ({
      note,
      interval: chord.intervals[i],
      frequency: semitonesToHz(chord.intervals[i], rootFreq),
    }))
  }, [root, chord])

  // Analyze chord quality and anatomy
  const analysis = useMemo(() => analyzeChordQuality(chord), [chord])

  // Get pairwise interval breakdown
  const intervalBreakdown = useMemo(
    () => getChordIntervalBreakdown(chord),
    [chord],
  )

  // Generate harmonic overlap data (for first 3 notes to keep it manageable)
  const harmonicData = useMemo(() => {
    if (noteFrequencies.length < 2) return null

    const freq1 = noteFrequencies[0].frequency
    const freq2 = noteFrequencies[1].frequency

    return {
      harmonics1: generateHarmonics(freq1, 12),
      harmonics2: generateHarmonics(freq2, 12),
      overlaps: findHarmonicOverlap(freq1, freq2, 12),
    }
  }, [noteFrequencies])

  // Generate waveform data for visualization
  const waveformData = useMemo(() => {
    if (noteFrequencies.length < 2) return null

    const frequencies = noteFrequencies.map((nf) => nf.frequency)
    return generateMultipleWaveforms(frequencies, 2)
  }, [noteFrequencies])

  // Toggle interval selection
  const toggleInterval = (semitones: number) => {
    const newSet = new Set(selectedIntervals)
    if (newSet.has(semitones)) {
      newSet.delete(semitones)
    } else {
      newSet.add(semitones)
    }
    setSelectedIntervals(newSet)
  }

  // Audio playback functions
  const playNote = (frequency: number) => {
    audio.playNote(frequency, 0.5)
  }

  const playChord = () => {
    const frequencies = noteFrequencies.map((nf) => nf.frequency)
    audio.playChord(frequencies, 1.5)
  }

  const playArpeggio = () => {
    noteFrequencies.forEach((nf, i) => {
      setTimeout(() => {
        audio.playNote(nf.frequency, 0.5)
      }, i * 300)
    })
  }

  // Harmonic overlap chart data
  const harmonicChartData = useMemo(() => {
    if (!harmonicData) return null

    const labels = harmonicData.harmonics1.map((h) =>
      h.harmonicNumber.toString(),
    )
    const overlapMap = new Map<string, boolean>()
    harmonicData.overlaps.forEach((o) => {
      if (o.isOverlapping) {
        overlapMap.set(`${o.harmonic1Number}-${o.harmonic2Number}`, true)
      }
    })

    return {
      labels,
      datasets: [
        {
          label: `${noteFrequencies[0].note} harmonics`,
          data: harmonicData.harmonics1.map((h) => h.frequency),
          backgroundColor: harmonicData.harmonics1.map((h) => {
            const hasOverlap = harmonicData.overlaps.some(
              (o) => o.harmonic1Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : WAVEFORM_COLORS[0]
          }),
          borderColor: harmonicData.harmonics1.map((h) => {
            const hasOverlap = harmonicData.overlaps.some(
              (o) => o.harmonic1Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : WAVEFORM_COLORS[0]
          }),
          borderWidth: 1,
          _harmonics: harmonicData.harmonics1,
        },
        {
          label: `${noteFrequencies[1].note} harmonics`,
          data: harmonicData.harmonics2.map((h) => h.frequency),
          backgroundColor: harmonicData.harmonics2.map((h) => {
            const hasOverlap = harmonicData.overlaps.some(
              (o) => o.harmonic2Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : WAVEFORM_COLORS[1]
          }),
          borderColor: harmonicData.harmonics2.map((h) => {
            const hasOverlap = harmonicData.overlaps.some(
              (o) => o.harmonic2Number === h.harmonicNumber && o.isOverlapping,
            )
            return hasOverlap ? COLORS.overlap : WAVEFORM_COLORS[1]
          }),
          borderWidth: 1,
          _harmonics: harmonicData.harmonics2,
        },
      ],
    }
  }, [harmonicData, noteFrequencies])

  const harmonicChartOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (_event, elements) => {
        if (!elements.length || !harmonicChartData) return
        const element = elements[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataset = harmonicChartData.datasets[element.datasetIndex] as any
        const harmonic = dataset._harmonics[element.index]
        if (harmonic) {
          audio.playNote(harmonic.frequency, 0.5)
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (items) =>
              `${t('chordBuilder.harmonicNumber')} ${items[0].label}`,
            label: (context) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dataset = context.dataset as any
              const harmonic = dataset._harmonics[context.dataIndex]
              if (!harmonic) return ''
              return [
                `${context.dataset.label}`,
                `${t('chordBuilder.frequencyHz')}: ${harmonic.frequency.toFixed(2)}`,
                `Note: ${harmonic.closestNote}`,
              ]
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: t('chordBuilder.harmonicNumber'),
            font: { size: 12, weight: 'bold' },
          },
          grid: { display: false },
        },
        y: {
          title: {
            display: true,
            text: t('chordBuilder.frequencyHz'),
            font: { size: 12, weight: 'bold' },
          },
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
        },
      },
    }),
    [audio, harmonicChartData, t],
  )

  // Waveform chart data
  const waveformChartData = useMemo(() => {
    if (!waveformData) return null

    const timeLabels = waveformData.combined.map((p) =>
      (p.time * 1000).toFixed(1),
    )

    // Create datasets for each individual waveform using the diverse color palette
    const individualDatasets = waveformData.waveforms.map((waveform, index) => {
      const color = WAVEFORM_COLORS[index % WAVEFORM_COLORS.length]
      return {
        label: `${noteFrequencies[index].note} (${noteFrequencies[index].frequency.toFixed(1)} Hz)`,
        data: waveform.map((p) => p.amplitude),
        borderColor: color,
        backgroundColor: `${color}33`,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
      }
    })

    // Add the combined waveform dataset
    const combinedDataset = {
      label: 'Combined',
      data: waveformData.combined.map((p) => p.amplitude),
      borderColor: COLORS.combined,
      backgroundColor: `${COLORS.combined}22`,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }

    return {
      labels: timeLabels,
      datasets: [...individualDatasets, combinedDataset],
    }
  }, [waveformData, noteFrequencies])

  const waveformChartOptions: ChartOptions<'line'> = useMemo(() => {
    // Dynamic Y-axis scale based on number of notes
    // Each note can contribute ±1, so max amplitude is ±noteCount
    const noteCount = noteFrequencies.length
    const maxAmplitude = noteCount * 1.2 // Add 20% padding

    return {
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
            title: (items) => `${t('chordBuilder.timeMs')}: ${items[0].label}`,
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
            text: t('chordBuilder.timeMs'),
            font: { size: 12, weight: 'bold' },
          },
          ticks: { maxTicksLimit: 8 },
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
        },
        y: {
          title: {
            display: true,
            text: t('chordBuilder.amplitude'),
            font: { size: 12, weight: 'bold' },
          },
          min: -maxAmplitude,
          max: maxAmplitude,
          grid: { color: 'rgba(0, 0, 0, 0.1)' },
        },
      },
    }
  }, [noteFrequencies.length, t])

  // Educational message based on selected intervals
  const educationalMessage = useMemo(() => {
    const hasMinor3 = selectedIntervals.has(3)
    const hasMajor3 = selectedIntervals.has(4)
    const hasPerfect5 = selectedIntervals.has(7)
    const hasDim5 = selectedIntervals.has(6)
    const hasAug5 = selectedIntervals.has(8)
    const hasMinor7 = selectedIntervals.has(10)
    const hasMajor7 = selectedIntervals.has(11)

    if (!hasMinor3 && !hasMajor3) {
      return t('chordBuilder.noThird')
    }

    if (hasMajor3 && hasPerfect5) {
      if (hasMinor7) return t('chordBuilder.dominant7th')
      if (hasMajor7) return t('chordBuilder.major7th')
      return t('chordBuilder.majorTriad')
    }

    if (hasMinor3 && hasPerfect5) {
      if (hasMinor7) return t('chordBuilder.minor7th')
      return t('chordBuilder.minorTriad')
    }

    if (hasMinor3 && hasDim5) return t('chordBuilder.diminished')
    if (hasMajor3 && hasAug5) return t('chordBuilder.augmented')
    if (hasMajor3 && !hasPerfect5) return t('chordBuilder.majorNoFifth')
    if (hasMinor3 && !hasPerfect5) return t('chordBuilder.minorNoFifth')

    return t('chordBuilder.defaultMessage')
  }, [selectedIntervals, t])

  const chordSymbol = getChordSymbol(chord)
  const overlapCount = harmonicData
    ? harmonicData.overlaps.filter((o) => o.isOverlapping).length
    : 0

  return (
    <Card className="p-6">
      <div className="mb-6 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">
            {t('chordBuilder.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('chordBuilder.description')}
          </p>
        </div>

        {/* Root note selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            {t('common:labels.root')}:
          </label>
          <NotePicker value={root} onValueChange={(v) => v && setRoot(v)} />
        </div>

        {/* Interval toggles */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            {t('chordBuilder.selectIntervals')}:
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERVALS.map((interval) => {
              const isSelected = selectedIntervals.has(interval.semitones)
              const roleColor = getRoleColor(interval.role)

              // Calculate the actual note for this interval from the root
              const rootIdx = noteToIndex(root)
              const intervalNote = indexToNote(rootIdx + interval.semitones)

              return (
                <Button
                  key={interval.semitones}
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleInterval(interval.semitones)}
                  className="relative flex flex-col items-center py-1 px-3 h-auto"
                  style={
                    isSelected && interval.role
                      ? {
                          backgroundColor: roleColor,
                          borderColor: roleColor,
                        }
                      : {}
                  }
                >
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">{intervalNote}</span>
                    {interval.role && (
                      <span className="text-xs opacity-75">
                        {interval.role === 'quality' && '◆'}
                        {interval.role === 'stability' && '●'}
                        {interval.role === 'color' && '★'}
                      </span>
                    )}
                  </span>
                  <span className="text-xs opacity-80">
                    {interval.shortName}
                  </span>
                </Button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ◆ = {t('chordBuilder.legendQuality')} • ● ={' '}
            {t('chordBuilder.legendStability')} • ★ ={' '}
            {t('chordBuilder.legendColor')}
          </p>
        </div>

        {/* Current chord display */}
        <div className="rounded-lg bg-linear-to-r from-blue-50 to-purple-50 p-4 border border-blue-200">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div>
              <span className="text-sm text-gray-600">
                {t('common:labels.chord')}:{' '}
              </span>
              <span className="text-xl font-bold text-gray-800">
                {chordSymbol}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">
                {t('common:labels.notes')}:{' '}
              </span>
              <span className="text-md font-medium text-gray-700">
                {chord.notes.join(' - ')}
              </span>
            </div>
            <Badge variant={getConsonanceBadgeColor(analysis.consonance)}>
              {t('common:labels.consonance')}:{' '}
              {Math.round(analysis.consonance * 100)}%
            </Badge>
          </div>
          {harmonicData && (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">
                {t('chordBuilder.harmonicAlignment')}:
              </span>{' '}
              {t('chordBuilder.overlappingHarmonics', { count: overlapCount })}
            </div>
          )}
        </div>

        {/* Play buttons */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={playChord}>
            {t('chordBuilder.playChord')}
          </Button>
          <Button variant="outline" size="sm" onClick={playArpeggio}>
            {t('chordBuilder.playArpeggio')}
          </Button>
          {noteFrequencies.map((nf) => (
            <Button
              key={nf.note}
              variant="ghost"
              size="sm"
              onClick={() => playNote(nf.frequency)}
            >
              {nf.note}
            </Button>
          ))}
        </div>
      </div>

      {/* Visualizations */}
      {noteFrequencies.length >= 2 && (
        <>
          {/* Harmonic overlap chart */}
          {harmonicChartData && (
            <div className="mb-8">
              <h4 className="text-md font-semibold mb-3 text-gray-800">
                {t('chordBuilder.harmonicOverlap')}
              </h4>
              <div className="h-64 w-full">
                <Bar data={harmonicChartData} options={harmonicChartOptions} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('chordBuilder.harmonicOverlapHint')}
              </p>
            </div>
          )}

          {/* Waveform chart */}
          {waveformChartData && (
            <div className="mb-8">
              <h4 className="text-md font-semibold mb-3 text-gray-800">
                {t('chordBuilder.waveformPattern')}
              </h4>
              <div className="h-64 w-full">
                <Line data={waveformChartData} options={waveformChartOptions} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('chordBuilder.waveformHint')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Chord anatomy */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3 text-gray-800">
          {t('chordBuilder.chordAnatomy')}
        </h4>
        <div className="space-y-2">
          {analysis.definingIntervals
            .filter((di) => di.interval !== 0)
            .map((di) => (
              <div
                key={di.interval}
                className="flex items-center gap-3 p-2 rounded bg-gray-50"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getRoleColor(di.role) }}
                />
                <span className="font-medium text-gray-800">{di.name}</span>
                <span className="text-sm text-gray-600">
                  {di.role === 'quality' && t('chordBuilder.roleQuality')}
                  {di.role === 'stability' && t('chordBuilder.roleStability')}
                  {di.role === 'color' && t('chordBuilder.roleColor')}
                </span>
                <div className="ml-auto">
                  <Badge variant="outline" className="text-xs">
                    {t('chordBuilder.importance', {
                      value: Math.round(di.importance * 100),
                    })}
                  </Badge>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Interval breakdown */}
      {intervalBreakdown.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-semibold mb-3 text-gray-800">
            {t('chordBuilder.pairwiseIntervals')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {intervalBreakdown.map((ib, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm"
              >
                <span className="font-medium text-gray-700">
                  {ib.note1} → {ib.note2}
                </span>
                <span className="text-gray-600">{ib.intervalName}</span>
                <Badge
                  variant={getConsonanceBadgeColor(ib.consonance)}
                  className="text-xs"
                >
                  {Math.round(ib.consonance * 100)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Educational context */}
      <div className="rounded-lg border border-emerald-200 bg-linear-to-r from-emerald-50 to-blue-50 p-4">
        <h4 className="font-semibold text-gray-800 mb-2">
          {t('chordBuilder.chordAnalysis')}
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {educationalMessage}
        </p>
      </div>
    </Card>
  )
}
