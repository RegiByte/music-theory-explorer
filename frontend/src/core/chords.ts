// Barrel re-export — all downstream imports from '@/core/chords' continue to work.
export { generateChord, isChordTone, getChordSymbol, getChordDegree, buildChordFromIntervals } from './chordGeneration'
export { detectVoicingQuality, findChordVoicings, getDifficultyLabel, formatVoicingString, calculateVoicingConsonance } from './chordVoicings'
export { chordSymbolToFrequencies } from './chordAudio'
export { analyzeChordQuality, getChordIntervalBreakdown } from './chordAnalysis'
