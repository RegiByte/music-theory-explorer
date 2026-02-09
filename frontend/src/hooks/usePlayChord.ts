import { useCallback } from 'react'
import { useResource } from '@/system'
import { chordSymbolToFrequencies } from '@/core/chords'
import type { ChordVoicing } from '@/schemas'

/**
 * Shared hook for chord playback. Provides two helpers:
 *
 * - `playChordBySymbol(symbol)` — parses a chord symbol string (e.g. "Am", "G7")
 *   and plays it using `chordSymbolToFrequencies`.
 *
 * - `playChordByVoicing(voicing, duration?)` — plays a specific fretboard voicing
 *   by extracting frequencies from its positions.
 *
 * Both close over the audio resource so consumers don't need to wire up audio
 * themselves.
 */
export function usePlayChord() {
  const audio = useResource('audio')

  const playChordBySymbol = useCallback(
    (symbol: string, duration = 0.5) => {
      const freqs = chordSymbolToFrequencies(symbol)
      if (freqs) audio.playChord(freqs, duration)
    },
    [audio],
  )

  const playChordByVoicing = useCallback(
    (voicing: ChordVoicing, duration = 0.8) => {
      const frequencies = voicing.positions.map((p) => p.frequency)
      audio.playChord(frequencies, duration)
    },
    [audio],
  )

  return { audio, playChordBySymbol, playChordByVoicing }
}
