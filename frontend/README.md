# Music Theory Explorer - Frontend

Interactive web application for learning music theory from first principles through visualization and sound.

## Architecture

### Vocabulary Pattern

All strings and constants are centralized:

- **`keywords.ts`**: String constants (note names, intervals, scale types, etc.)
- **`constants.ts`**: Numeric constants (frequencies, patterns, thresholds)
- **`schemas.ts`**: Zod schemas for type inference (no runtime validation)

### Functional Core, Imperative Shell

- **Pure Core** (`src/core/`): All music theory calculations as pure functions
  - `musicTheory.ts`: Frequency conversions, note operations
  - `intervals.ts`: Interval calculations and consonance
  - `scales.ts`: Scale generation and analysis
  - `chords.ts`: Chord generation and voicing finder

- **Imperative Shell** (`src/system/`, `src/components/`): State and effects
  - Braided audio system for lifecycle management
  - React components as observers

### Braided System

Audio engine managed as a Braided resource:

```typescript
// System lives in closure space (Z-axis)
// React observes through hooks (X-Y plane)
const audio = useResource('audio')
audio.playNote(440) // A4
```

Benefits:
- Audio system survives React remounts
- Clean lifecycle management
- No prop drilling
- Easy testing with dependency injection

## Project Structure

```
src/
├── keywords.ts           # Vocabulary (strings)
├── constants.ts          # Numeric constants
├── schemas.ts            # Zod schemas for types
├── core/                 # Pure functions
│   ├── musicTheory.ts
│   ├── scales.ts
│   ├── chords.ts
│   └── intervals.ts
├── system/               # Braided resources
│   ├── audioResource.ts
│   └── index.ts
├── components/           # React components
│   ├── CentsCalculator.tsx
│   ├── Fretboard.tsx
│   └── ui/              # shadcn components
└── App.tsx
```

## Components

### CentsCalculator

Interactive calculator for measuring tuning deviation in cents.

- Input two frequencies
- See cents deviation
- Play notes individually or together
- Visual feedback for tuning status

### Fretboard

Interactive SVG ukulele fretboard.

- Click positions to play notes
- Hover to see note names
- Support for highlighting positions (scales, chords)
- Responsive design

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Tone.js** - Audio synthesis
- **Braided** - System composition
- **Braided React** - React integration
- **Zod** - Schema validation (type inference only)
- **react-chartjs-2** - Charts (to be used)

## Design Principles

1. **Vocabulary Pattern**: No magic strings or numbers
2. **Functional Core**: Pure functions for all calculations
3. **Imperative Shell**: State and effects at boundaries
4. **Type Safety**: Full TypeScript with Zod inference
5. **Emergence**: Simple rules compose into complex behavior

## Next Steps

- [ ] Extract remaining notebook functions (melody, harmony)
- [ ] Build ScaleExplorer component
- [ ] Build ChordVoicingFinder (killer feature!)
- [ ] Add chart visualizations
- [ ] Build MelodyComposer
- [ ] Implement Circle of Fifths
- [ ] Add more interactive tools

## Philosophy

> "Everything is information processing. Simple rules compose. Emergence is reliable. No central governor needed."

This app teaches music theory the way it should be learned: from first principles, through interaction, with immediate feedback. Not memorization - understanding.

From frequency measurements to flow state. 🎵
