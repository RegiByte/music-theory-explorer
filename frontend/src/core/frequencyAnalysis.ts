import { C4_FREQUENCY } from '@/constants'
import { getNoteAtPosition, getFrequencyAtPosition } from './fretboard'
import type { Note, UkuleleString } from '@/schemas'

/**
 * Data point for frequency plot visualization
 * Represents a single fretboard position with its frequency data
 */
export interface FretboardDataPoint {
  string: UkuleleString
  fret: number
  note: Note
  frequency: number
  logFrequency: number
}

/**
 * Generate frequency data for all fretboard positions
 * Used for the frequency plot visualization
 * From notebook: Step 1 - The "Ahhh" Moment
 */
export function generateFretboardData(
  maxFret: number = 12,
): FretboardDataPoint[] {
  const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
  const data: FretboardDataPoint[] = []

  for (const string of strings) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const note = getNoteAtPosition(string, fret)
      const frequency = getFrequencyAtPosition(string, fret, C4_FREQUENCY)
      const logFrequency = Math.log2(frequency)

      data.push({
        string,
        fret,
        note,
        frequency,
        logFrequency,
      })
    }
  }

  return data
}

/**
 * Get frequency data for a specific string
 * Used to plot individual string lines on the frequency chart
 */
export function getStringData(
  string: UkuleleString,
  maxFret: number = 12,
): FretboardDataPoint[] {
  const data: FretboardDataPoint[] = []

  for (let fret = 0; fret <= maxFret; fret++) {
    const note = getNoteAtPosition(string, fret)
    const frequency = getFrequencyAtPosition(string, fret, C4_FREQUENCY)
    const logFrequency = Math.log2(frequency)

    data.push({
      string,
      fret,
      note,
      frequency,
      logFrequency,
    })
  }

  return data
}

/**
 * Get all strings' data organized for chart display
 * Returns data grouped by string, ready for Chart.js
 */
export function getAllStringsData(
  maxFret: number = 12,
): Record<UkuleleString, FretboardDataPoint[]> {
  const strings: UkuleleString[] = ['G', 'C', 'E', 'A']
  const result: Partial<Record<UkuleleString, FretboardDataPoint[]>> = {}

  for (const string of strings) {
    result[string] = getStringData(string, maxFret)
  }

  return result as Record<UkuleleString, FretboardDataPoint[]>
}
