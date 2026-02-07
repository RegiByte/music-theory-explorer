import { defineResource } from 'braided'
import * as Tone from 'tone'

interface AudioState {
  isReady: boolean
  isPlaying: boolean
}

/**
 * Convert a frequency in Hz to a Tone.js note name (e.g. 440 → "A4").
 * Tone.Sampler needs note names to find the nearest sample and pitch-shift.
 */
function hzToNote(frequency: number): string {
  return Tone.Frequency(frequency, 'hz').toNote()
}

export const audioResource = defineResource({
  start: async () => {
    // Initialize Tone.js (requires user interaction)
    await Tone.start()
    console.log('🎵 Audio system started')

    // ─── Dual Audio Engine ───────────────────────────────────────────
    //
    // Engine 1: Sampler — real ukulele samples for musical playback
    //   Used by: playNote, playChord, playSequence
    //   Best for: chords, progressions, scales, melodies
    //
    // Engine 2: PolySynth — exact frequency playback for theory features
    //   Used by: playFrequency, playFrequencies
    //   Best for: cents comparison, harmonic series, frequency analysis
    //
    // Both share a subtle reverb for room ambiance.

    const reverb = new Tone.Reverb({
      decay: 0.4, // Short — just enough room feel
      wet: 0.12, // Very subtle
    }).toDestination()
    await reverb.ready

    // ─── Engine 1: Ukulele Sampler ──────────────────────────────────
    // 12 anchor samples every ~3 semitones from G3 to C6 (Low G tuning)
    // Tone.Sampler pitch-shifts between anchors automatically
    const sampler = await new Promise<Tone.Sampler>((resolve) => {
      const s = new Tone.Sampler({
        urls: {
          G3: 'G3.mp3',
          Bb3: 'Bb3.mp3',
          C4: 'C4.mp3',
          Eb4: 'Eb4.mp3',
          E4: 'E4.mp3',
          G4: 'G4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          Eb5: 'Eb5.mp3',
          'F#5': 'Fs5.mp3', // File renamed to avoid # in URL
          A5: 'A5.mp3',
          C6: 'C6.mp3',
        },
        baseUrl: `${import.meta.env.BASE_URL}samples/ukulele/`,
        onload: () => {
          console.log('🎸 Ukulele samples loaded (12 anchors, G3–C6)')
          resolve(s)
        },
        onerror: (err) => {
          console.error('Failed to load ukulele samples:', err)
          // Still resolve so the app doesn't hang — playback will be silent
          resolve(s)
        },
      }).connect(reverb)
    })

    sampler.volume.value = -6

    // ─── Engine 2: PolySynth for Exact Frequencies ──────────────────
    // Plucked-string-like synthesis for frequency-precise playback.
    // Features like Cents Calculator and Harmonic Series need to play
    // exact Hz values — the Sampler quantizes to the nearest note.
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 3000,
      rolloff: -12,
    }).connect(reverb)

    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        partials: [1, 0.4, 0.2, 0.09, 0.04, 0.02],
      },
      envelope: {
        attack: 0.003,
        decay: 0.25,
        sustain: 0.04,
        release: 0.9,
      },
    }).connect(filter)

    synth.volume.value = -8

    // ─── State Management ───────────────────────────────────────────
    let state: AudioState = {
      isReady: true,
      isPlaying: false,
    }
    const listeners = new Set<() => void>()

    const notifyListeners = () => {
      listeners.forEach((listener) => listener())
    }

    const updateState = (updates: Partial<AudioState>) => {
      state = { ...state, ...updates }
      notifyListeners()
    }

    return {
      // ─── Sampler Methods (musical note playback) ────────────────
      // Use these for chords, progressions, scales, melodies.
      // Frequencies are snapped to the nearest chromatic note.

      playNote: (frequency: number, duration = 0.5) => {
        updateState({ isPlaying: true })
        sampler.triggerAttackRelease(hzToNote(frequency), duration)
        setTimeout(() => updateState({ isPlaying: false }), duration * 1000)
      },

      playChord: (frequencies: number[], duration = 1) => {
        updateState({ isPlaying: true })
        const notes = frequencies.map(hzToNote)
        sampler.triggerAttackRelease(notes, duration)
        setTimeout(() => updateState({ isPlaying: false }), duration * 1000)
      },

      playSequence: (
        notes: Array<{ frequency: number; duration: number }>,
        tempo = 120,
      ) => {
        updateState({ isPlaying: true })

        const sequence = new Tone.Sequence(
          (time, note) => {
            sampler.triggerAttackRelease(
              hzToNote(note.frequency),
              note.duration,
              time,
            )
          },
          notes,
          '4n',
        )

        Tone.Transport.bpm.value = tempo
        sequence.start(0)
        Tone.Transport.start()

        const totalDuration = notes.reduce(
          (sum, note) => sum + note.duration,
          0,
        )

        setTimeout(
          () => {
            Tone.Transport.stop()
            sequence.dispose()
            updateState({ isPlaying: false })
          },
          (totalDuration * 1000 * 60) / tempo,
        )
      },

      // ─── Synth Methods (exact frequency playback) ───────────────
      // Use these for frequency-precise features: cents comparison,
      // harmonic series, frequency analysis, harmonic overlap.
      // Plays the EXACT Hz value — no note quantization.

      playFrequency: (frequency: number, duration = 0.5) => {
        updateState({ isPlaying: true })
        synth.triggerAttackRelease(frequency, duration)
        setTimeout(() => updateState({ isPlaying: false }), duration * 1000)
      },

      playFrequencies: (frequencies: number[], duration = 1) => {
        updateState({ isPlaying: true })
        frequencies.forEach((freq) => {
          synth.triggerAttackRelease(freq, duration)
        })
        setTimeout(() => updateState({ isPlaying: false }), duration * 1000)
      },

      // ─── Common ─────────────────────────────────────────────────

      stop: () => {
        sampler.releaseAll()
        synth.releaseAll()
        Tone.Transport.stop()
        Tone.Transport.cancel()
        updateState({ isPlaying: false })
      },

      dispose: () => {
        sampler.dispose()
        synth.dispose()
        filter.dispose()
        reverb.dispose()
      },

      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },

      getSnapshot: () => state,
      getSampler: () => sampler,
      getSynth: () => synth,
    }
  },

  halt: async (audio) => {
    console.log('🔇 Audio system shutting down')
    audio.stop()
    audio.dispose()
    Tone.Transport.stop()
    Tone.Transport.cancel()
  },
})
