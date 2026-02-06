import {
  A4_FREQUENCY,
  HARMONIC_OVERLAP_THRESHOLD,
  MAX_HARMONICS,
  SEMITONES_PER_OCTAVE,
} from '@/constants'
import {
  getIntervalName,
  hzToCents,
  indexToNote,
  noteToIndex,
  semitonesToHz,
} from '@/core/musicTheory'
import type { Note } from '@/schemas'

export interface HarmonicDataPoint {
  harmonicNumber: number
  frequency: number
  closestNote: Note
  centsDeviation: number
  intervalFromFundamental: string
}

export interface HarmonicOverlap {
  harmonic1Number: number
  harmonic2Number: number
  frequency1: number
  frequency2: number
  centsDifference: number
  isOverlapping: boolean
}

export interface WaveformPoint {
  time: number
  amplitude: number
}

export interface BeatAnalysis {
  beatFreq: number
  beatsPerSecond: number
  description: string
  category: 'very-stable' | 'stable' | 'moderate' | 'dissonant' | 'very-dissonant'
}

export interface StabilityAnalysis {
  stability: number
  variance: number
  description: string
}

function getClosestNoteData(frequency: number): {
  closestNote: Note
  centsDeviation: number
} {
  const semitonesFromA4 = SEMITONES_PER_OCTAVE * Math.log2(frequency / A4_FREQUENCY)
  const closestSemitone = Math.round(semitonesFromA4)
  const closestNote = indexToNote(noteToIndex('A') + closestSemitone)
  const equalTempFreq = semitonesToHz(closestSemitone, A4_FREQUENCY)
  const centsDeviation = hzToCents(equalTempFreq, frequency)

  return { closestNote, centsDeviation }
}

function getIntervalFromFundamental(
  frequency: number,
  fundamentalFreq: number
): string {
  const semitonesFromFundamental =
    SEMITONES_PER_OCTAVE * Math.log2(frequency / fundamentalFreq)
  const roundedSemitones = Math.round(semitonesFromFundamental)
  return getIntervalName(roundedSemitones % SEMITONES_PER_OCTAVE)
}

export function generateHarmonics(
  fundamentalFreq: number,
  count = MAX_HARMONICS
): HarmonicDataPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const harmonicNumber = index + 1
    const frequency = fundamentalFreq * harmonicNumber
    const { closestNote, centsDeviation } = getClosestNoteData(frequency)
    const intervalFromFundamental = getIntervalFromFundamental(
      frequency,
      fundamentalFreq
    )

    return {
      harmonicNumber,
      frequency,
      closestNote,
      centsDeviation,
      intervalFromFundamental,
    }
  })
}

export function findHarmonicOverlap(
  freq1: number,
  freq2: number,
  numHarmonics = MAX_HARMONICS,
  threshold = HARMONIC_OVERLAP_THRESHOLD
): HarmonicOverlap[] {
  const harmonics1 = generateHarmonics(freq1, numHarmonics)
  const harmonics2 = generateHarmonics(freq2, numHarmonics)

  const overlaps: HarmonicOverlap[] = []

  for (const harm1 of harmonics1) {
    for (const harm2 of harmonics2) {
      const centsDiff = Math.abs(hzToCents(harm1.frequency, harm2.frequency))
      const isOverlapping = centsDiff < threshold

      overlaps.push({
        harmonic1Number: harm1.harmonicNumber,
        harmonic2Number: harm2.harmonicNumber,
        frequency1: harm1.frequency,
        frequency2: harm2.frequency,
        centsDifference: centsDiff,
        isOverlapping,
      })
    }
  }

  return overlaps
}

export function generateWaveform(
  frequency: number,
  totalTime: number,
  sampleRate = 1000,
  phaseOffset = 0
): WaveformPoint[] {
  const totalSamples = Math.floor(totalTime * sampleRate)
  const timeStep = totalTime / totalSamples
  const points: WaveformPoint[] = []

  for (let i = 0; i <= totalSamples; i++) {
    const time = i * timeStep
    const amplitude = Math.sin(2 * Math.PI * frequency * time + phaseOffset)
    points.push({ time, amplitude })
  }

  return points
}

export function generateWaveformPair(
  freq1: number,
  freq2: number,
  cycles = 3,
  phaseOffset = 0
): {
  waveform1: WaveformPoint[]
  waveform2: WaveformPoint[]
  combined: WaveformPoint[]
} {
  // Use the slower frequency to determine total time
  const slowerFreq = Math.min(freq1, freq2)
  const totalTime = cycles / slowerFreq
  const sampleRate = 1000 // samples per second

  // Generate both waveforms on the same time scale with phase offset
  const waveform1 = generateWaveform(freq1, totalTime, sampleRate, phaseOffset)
  const waveform2 = generateWaveform(freq2, totalTime, sampleRate, phaseOffset)

  // Combine waveforms (sum amplitudes - this is how sound waves actually combine)
  const combined: WaveformPoint[] = []
  const minLength = Math.min(waveform1.length, waveform2.length)

  for (let i = 0; i < minLength; i++) {
    combined.push({
      time: waveform1[i].time,
      amplitude: waveform1[i].amplitude + waveform2[i].amplitude,
    })
  }

  return { waveform1, waveform2, combined }
}

export function generateMultipleWaveforms(
  frequencies: number[],
  cycles = 2,
  phaseOffset = 0
): {
  waveforms: WaveformPoint[][]
  combined: WaveformPoint[]
} {
  if (frequencies.length === 0) {
    return { waveforms: [], combined: [] }
  }

  // Use the slowest frequency to determine total time
  const slowestFreq = Math.min(...frequencies)
  const totalTime = cycles / slowestFreq
  const sampleRate = 1000 // samples per second

  // Generate all waveforms on the same time scale
  const waveforms = frequencies.map((freq) =>
    generateWaveform(freq, totalTime, sampleRate, phaseOffset)
  )

  // Combine all waveforms (sum amplitudes - this is how sound waves actually combine)
  const combined: WaveformPoint[] = []
  const minLength = Math.min(...waveforms.map((w) => w.length))

  for (let i = 0; i < minLength; i++) {
    const sumAmplitude = waveforms.reduce(
      (sum, waveform) => sum + waveform[i].amplitude,
      0
    )
    combined.push({
      time: waveforms[0][i].time,
      amplitude: sumAmplitude,
    })
  }

  return { waveforms, combined }
}

/**
 * Calculate beat frequency for a set of frequencies based on harmonic interactions.
 * The perceptual beat comes from close harmonic overlaps, not just fundamental differences.
 * For consonant intervals (like P5), harmonics align closely creating slow beats.
 * For dissonant intervals (like m2), fundamentals are close creating rapid beats.
 */
export function calculateBeatFrequency(frequencies: number[]): BeatAnalysis {
  if (frequencies.length === 0) {
    return {
      beatFreq: 0,
      beatsPerSecond: 0,
      description: 'No frequencies provided',
      category: 'very-stable',
    }
  }

  if (frequencies.length === 1) {
    return {
      beatFreq: 0,
      beatsPerSecond: 0,
      description: 'Single frequency - no beating',
      category: 'very-stable',
    }
  }

  // Strategy: Find the closest frequency pair (either fundamentals or harmonics)
  // This represents the most prominent audible beating
  let minBeatFreq = Infinity

  // Check all pairwise combinations
  for (let i = 0; i < frequencies.length; i++) {
    for (let j = i + 1; j < frequencies.length; j++) {
      const freq1 = frequencies[i]
      const freq2 = frequencies[j]

      // Generate harmonics for both frequencies (up to 8 harmonics)
      const harmonics1 = Array.from({ length: 8 }, (_, k) => freq1 * (k + 1))
      const harmonics2 = Array.from({ length: 8 }, (_, k) => freq2 * (k + 1))

      // Find the closest harmonic pair
      for (const h1 of harmonics1) {
        for (const h2 of harmonics2) {
          const beatFreq = Math.abs(h1 - h2)
          
          // Only consider beats in the audible/perceptual range (0.1 - 50 Hz)
          // Beats outside this range are either imperceptible or heard as separate tones
          if (beatFreq >= 0.1 && beatFreq <= 50 && beatFreq < minBeatFreq) {
            minBeatFreq = beatFreq
          }
        }
      }
    }
  }

  // If no close harmonics found, use fundamental difference (for very close notes)
  if (minBeatFreq === Infinity) {
    for (let i = 0; i < frequencies.length; i++) {
      for (let j = i + 1; j < frequencies.length; j++) {
        const beatFreq = Math.abs(frequencies[i] - frequencies[j])
        if (beatFreq >= 0.1 && beatFreq <= 50 && beatFreq < minBeatFreq) {
          minBeatFreq = beatFreq
        }
      }
    }
  }

  const beatFreq = minBeatFreq === Infinity ? 0 : minBeatFreq
  const beatsPerSecond = beatFreq

  // Categorize and describe the beating
  let category: BeatAnalysis['category']
  let description: string

  if (beatFreq < 0.5) {
    category = 'very-stable'
    description = 'Extremely stable - virtually no beating. Perfect consonance.'
  } else if (beatFreq < 2) {
    category = 'stable'
    description = 'Very stable - slow, gentle beating. High consonance.'
  } else if (beatFreq < 5) {
    category = 'moderate'
    description = 'Moderate beating - noticeable wobble. Some tension.'
  } else if (beatFreq < 10) {
    category = 'dissonant'
    description = 'Rapid beating - clear instability. Dissonant.'
  } else {
    category = 'very-dissonant'
    description = 'Very rapid beating - harsh, unstable sound. Strong dissonance.'
  }

  return { beatFreq, beatsPerSecond, description, category }
}

/**
 * Extract the amplitude envelope from a waveform using a moving window.
 * The envelope shows the overall amplitude variation over time (the beat pattern).
 * 
 * Strategy: Window size should be about 1-2 periods of the highest frequency component.
 * This lets us track how the peak amplitude varies over time without being fooled by
 * the individual wave cycles.
 * 
 * For automatic mode (no highestFreq provided), we estimate from the waveform.
 */
export function extractEnvelope(
  waveform: WaveformPoint[],
  highestFreq?: number // Optional: highest frequency in Hz for better accuracy
): WaveformPoint[] {
  if (waveform.length === 0) {
    return []
  }

  const envelope: WaveformPoint[] = []
  const totalTime = waveform[waveform.length - 1].time - waveform[0].time

  // Determine window size based on highest frequency
  let windowSize: number
  
  if (highestFreq && highestFreq > 0) {
    // Use 2 periods of the highest frequency
    // This captures a full wave cycle to find the peak amplitude
    windowSize = (2 / highestFreq)
  } else {
    // Fallback: estimate from waveform
    // Count zero crossings to estimate dominant frequency
    let zeroCrossings = 0
    for (let i = 1; i < waveform.length; i++) {
      if (
        (waveform[i - 1].amplitude >= 0 && waveform[i].amplitude < 0) ||
        (waveform[i - 1].amplitude < 0 && waveform[i].amplitude >= 0)
      ) {
        zeroCrossings++
      }
    }
    const estimatedFreq = zeroCrossings / (2 * totalTime)
    windowSize = estimatedFreq > 0 ? 2 / estimatedFreq : totalTime / 20
  }

  // Calculate samples per window
  const samplesPerWindow = Math.max(
    5, // Minimum 5 samples to get meaningful max
    Math.floor((windowSize / totalTime) * waveform.length)
  )

  // Use a sliding window to find local maxima (envelope peaks)
  // Step by 1/4 of window for good resolution
  const step = Math.max(1, Math.floor(samplesPerWindow / 4))
  
  for (let i = 0; i < waveform.length; i += step) {
    const windowEnd = Math.min(i + samplesPerWindow, waveform.length)
    const windowSlice = waveform.slice(i, windowEnd)

    // Find max absolute amplitude in this window
    const maxAmplitude = Math.max(
      ...windowSlice.map((p) => Math.abs(p.amplitude))
    )

    // Use the middle time point of the window
    const middleIndex = Math.floor((i + windowEnd) / 2)
    envelope.push({
      time: waveform[middleIndex].time,
      amplitude: maxAmplitude,
    })
  }

  return envelope
}

/**
 * Analyze the stability of a waveform based on its envelope.
 * More stable waveforms have consistent amplitude (low variance).
 * Less stable waveforms have fluctuating amplitude (high variance).
 */
export function analyzeWaveformStability(
  envelope: WaveformPoint[]
): StabilityAnalysis {
  if (envelope.length === 0) {
    return {
      stability: 1.0,
      variance: 0,
      description: 'No envelope data',
    }
  }

  // Calculate mean amplitude
  const meanAmplitude =
    envelope.reduce((sum, p) => sum + p.amplitude, 0) / envelope.length

  // Calculate variance
  const variance =
    envelope.reduce((sum, p) => {
      const diff = p.amplitude - meanAmplitude
      return sum + diff * diff
    }, 0) / envelope.length

  // Convert variance to stability score (0-1, higher = more stable)
  // Use exponential decay: stability = e^(-k * variance)
  // Tuned so that variance of 0.1 gives ~60% stability, 0.01 gives ~90%
  const k = 10
  const stability = Math.exp(-k * variance)

  // Generate description
  let description: string
  if (stability >= 0.9) {
    description =
      'Very stable - smooth, consistent amplitude. Strong consonance.'
  } else if (stability >= 0.7) {
    description = 'Stable - mostly consistent with gentle fluctuations.'
  } else if (stability >= 0.5) {
    description = 'Moderately stable - noticeable amplitude variations.'
  } else if (stability >= 0.3) {
    description = 'Unstable - significant amplitude fluctuations. Dissonant.'
  } else {
    description = 'Very unstable - chaotic amplitude pattern. Strong dissonance.'
  }

  return { stability, variance, description }
}
