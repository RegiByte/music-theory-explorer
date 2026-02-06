import { defineResource, type StartedResource } from 'braided'
import type { Genre, StatisticalRecommendation, TrainedPattern } from '@/schemas'

interface MarkovModel {
  transitions: Record<string, Record<string, Record<string, number>>>
  chord_frequencies: Record<string, Record<string, number>>
  genre_totals: Record<string, number>
}

interface PatternModel {
  [genre: string]: {
    [length: string]: TrainedPattern[]
  }
}

export const recommenderResource = defineResource({
  start: async () => {
    // Lazy load models (non-blocking)
    let markovModel: MarkovModel | null = null
    let patternModel: PatternModel | null = null
    let isLoading = true
    
    // Start loading immediately but don't block
    const loadPromise = Promise.all([
      fetch('/models/markov_model.json').then(r => r.json()),
      fetch('/models/patterns.json').then(r => r.json()),
    ]).then(([markov, patterns]) => {
      markovModel = markov
      patternModel = patterns
      isLoading = false
      console.log('📊 Statistical models loaded')
    }).catch(err => {
      console.error('Failed to load models:', err)
      isLoading = false
    })
    
    return {
      // Get statistical recommendations for a chord in a genre
      getRecommendations: async (
        fromChord: string, 
        genre: Genre, 
        topN = 20
      ): Promise<StatisticalRecommendation[]> => {
        await loadPromise // Wait for models if still loading
        if (!markovModel) return []
        
        const transitions = markovModel.transitions[genre]?.[fromChord] || {}
        const frequencies = markovModel.chord_frequencies[genre] || {}
        
        return Object.entries(transitions)
          .map(([chord, probability]) => {
            const freq = frequencies[chord] || 0
            // Match Python model: friction = 1 - min(freq * 10, 1.0)
            // This scales so that chords in >=10% of songs have friction ~0
            const friction = 1.0 - Math.min(freq * 10, 1.0)
            return { chord, probability, frequency: freq, friction }
          })
          .sort((a, b) => b.probability - a.probability)
          .slice(0, topN)
      },
      
      // Find matching patterns for a chord sequence
      findPatterns: async (
        prefix: string[],
        genre: Genre,
        maxLength = 4
      ): Promise<TrainedPattern[]> => {
        await loadPromise
        if (!patternModel) return []
        
        const genrePatterns = patternModel[genre]
        if (!genrePatterns) return []
        
        const matches: TrainedPattern[] = []
        
        for (let length = prefix.length; length <= maxLength; length++) {
          const patterns = genrePatterns[length.toString()] || []
          for (const pattern of patterns) {
            // Check if pattern starts with prefix
            if (pattern.chords.slice(0, prefix.length).every((c, i) => c === prefix[i])) {
              matches.push(pattern)
            }
          }
        }
        
        return matches.sort((a, b) => b.frequency - a.frequency)
      },
      
      // Get chord statistics for a genre
      getChordStats: async (
        chord: string,
        genre: Genre
      ) => {
        await loadPromise
        if (!markovModel) return null
        
        const frequency = markovModel.chord_frequencies[genre]?.[chord] || 0
        // Match Python model: friction = 1 - min(freq * 10, 1.0)
        const friction = 1.0 - Math.min(frequency * 10, 1.0)
        
        return {
          frequency,
          friction,
          category: friction < 0.3 ? 'common' : friction < 0.7 ? 'interesting' : 'adventurous',
        }
      },
      
      // Check if models are loaded
      isReady: () => !isLoading,
      
      // Get available genres
      getGenres: () => ['pop', 'rock', 'country', 'punk', 'alternative', 'pop rock', 'rap', 'metal', 'soul'] as Genre[],

      // --- Bulk data access (for visualizations) ---

      // Full transition matrix for a genre
      getTransitionMatrix: async (genre: Genre): Promise<Record<string, Record<string, number>>> => {
        await loadPromise
        if (!markovModel) return {}
        return markovModel.transitions[genre] || {}
      },

      // All chord frequencies for a genre
      getChordFrequencies: async (genre: Genre): Promise<Record<string, number>> => {
        await loadPromise
        if (!markovModel) return {}
        return markovModel.chord_frequencies[genre] || {}
      },

      // Genre totals (song counts per genre)
      getGenreTotals: async (): Promise<Record<string, number>> => {
        await loadPromise
        if (!markovModel) return {}
        return markovModel.genre_totals || {}
      },

      // Top N chords by frequency for a genre
      getTopChords: async (genre: Genre, topN: number): Promise<string[]> => {
        await loadPromise
        if (!markovModel) return []
        const frequencies = markovModel.chord_frequencies[genre] || {}
        return Object.entries(frequencies)
          .sort(([, a], [, b]) => b - a)
          .slice(0, topN)
          .map(([chord]) => chord)
      },
    }
  },
  
  halt: async () => {
    console.log('📊 Recommender resource halted')
  },
})

export type RecommenderResource = StartedResource<typeof recommenderResource>