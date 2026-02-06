import { defineResource } from 'braided'
import * as Tone from 'tone'

interface AudioState {
  isReady: boolean
  isPlaying: boolean
}

export const audioResource = defineResource({
  start: async () => {
    // Initialize Tone.js (requires user interaction)
    await Tone.start()
    console.log('🎵 Audio system started')

    // Create a polyphonic synthesizer
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.3,
        release: 0.5,
      },
    }).toDestination()

    // Set volume
    synth.volume.value = -10 // Reduce volume slightly

    // State management for useSyncExternalStore
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
      // Play single note
      playNote: (frequency: number, duration = 0.5) => {
        updateState({ isPlaying: true })
        synth.triggerAttackRelease(frequency, duration)

        // Update state after note finishes
        setTimeout(() => {
          updateState({ isPlaying: false })
        }, duration * 1000)
      },

      // Play chord (multiple notes simultaneously)
      playChord: (frequencies: number[], duration = 1) => {
        updateState({ isPlaying: true })
        frequencies.forEach((freq) => {
          synth.triggerAttackRelease(freq, duration)
        })

        // Update state after chord finishes
        setTimeout(() => {
          updateState({ isPlaying: false })
        }, duration * 1000)
      },

      // Play sequence of notes
      playSequence: (
        notes: Array<{ frequency: number; duration: number }>,
        tempo = 120,
      ) => {
        updateState({ isPlaying: true })

        const sequence = new Tone.Sequence(
          (time, note) => {
            synth.triggerAttackRelease(note.frequency, note.duration, time)
          },
          notes,
          '4n',
        )

        Tone.Transport.bpm.value = tempo
        sequence.start(0)
        Tone.Transport.start()

        // Calculate total duration
        const totalDuration = notes.reduce(
          (sum, note) => sum + note.duration,
          0,
        )

        // Stop after sequence finishes
        setTimeout(
          () => {
            Tone.Transport.stop()
            sequence.dispose()
            updateState({ isPlaying: false })
          },
          (totalDuration * 1000 * 60) / tempo,
        )
      },

      // Stop all sounds
      stop: () => {
        synth.releaseAll()
        Tone.Transport.stop()
        Tone.Transport.cancel()
        updateState({ isPlaying: false })
      },

      // Subscribe to state changes (for useSyncExternalStore)
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },

      // Get current state snapshot
      getSnapshot: () => state,

      // Get synth for advanced usage
      getSynth: () => synth,
    }
  },

  halt: async (audio) => {
    console.log('🔇 Audio system shutting down')
    audio.stop()
    Tone.Transport.stop()
    Tone.Transport.cancel()
  },
})
