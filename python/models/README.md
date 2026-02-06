# Chord Progression Models

Statistical models for genre-aware chord progression recommendations, built from the Chordonomicon dataset.

## Overview

This package provides three main components:

1. **Chord Normalizer** - Converts dataset notation to standardized format
2. **Markov Model** - Genre-specific transition probabilities
3. **Pattern Extractor** - Common multi-chord sequences

## Architecture

### Data-First Functional Design

All models follow pure functional principles:
- Immutable data structures
- No side effects in core logic
- Composable functions
- Clear separation of I/O and computation

### Model Components

```
models/
├── __init__.py              # Package exports
├── chord_normalizer.py      # Chord notation standardization
├── markov_model.py          # Transition probability model
├── pattern_extractor.py     # N-gram pattern mining
├── build_models.py          # Training pipeline
├── trained/                 # Serialized models
│   ├── markov_model.json
│   └── patterns.json
└── README.md               # This file
```

## Usage

### Training Models

```bash
python src/models/build_models.py
```

This will:
1. Load the Chordonomicon dataset
2. Parse and normalize chord progressions
3. Build genre-specific Markov models
4. Extract common patterns (2-4 chord sequences)
5. Save models to `trained/` directory

### Using Models

```python
from models import MarkovModel, PatternMiner, normalize_chord_simple

# Load trained models
markov = MarkovModel.load("src/models/trained/markov_model.json")

# Get recommendations
recs = markov.get_recommendations(
    current_chord="C",
    genre="pop",
    top_n=10
)

for rec in recs:
    print(f"{rec.to_chord}: {rec.probability:.2%}")
```

### Chord Normalization

```python
from models import normalize_chord, normalize_chord_simple

# Detailed normalization
chord = normalize_chord("Amin7")
# ChordNotation(root='A', quality='m7', bass=None, extensions=[])

# Simple string format
simple = normalize_chord_simple("Fsmin")  # "F#m"
```

### Pattern Matching

```python
from models import PatternMiner

patterns = PatternMiner.load("src/models/trained/patterns.json")

# Find patterns starting with C → G
matches = patterns.find_matching_patterns(
    prefix=["C", "G"],
    genre="pop",
    max_pattern_length=4
)

for pattern in matches[:5]:
    print(f"{pattern}: {pattern.frequency:.2%}")
```

## Model Details

### Markov Model

- **Structure**: P(chord_j | chord_i, genre)
- **Genres**: pop, rock, country, pop rock, alternative, punk (min 5000 progressions each)
- **Transitions**: ~150K unique chord transitions across all genres
- **Features**:
  - Probabilistic recommendations
  - Chord frequency tracking
  - Friction scores (rarity metric)

### Pattern Extractor

- **Lengths**: 2, 3, and 4-chord patterns
- **Top N**: 100 most common patterns per length per genre
- **Features**:
  - Prefix matching (find patterns starting with given chords)
  - Frequency-based ranking
  - Genre-specific patterns

### Chord Normalizer

Handles various notation styles:
- Minor: `Amin` → `Am`, `Csmin` → `C#m`
- Sharps/Flats: `Fs` → `F#`, `Bb` → `Bb`
- Extensions: `Amin7` → `Am7`, `Fmaj7` → `FM7`
- Slash chords: `C/G` → `C` with bass `G`
- Power chords: `Ano3d` → `A5`

## Integration with Frontend

The models are designed to integrate with the ProgressionExplorer component:

```typescript
// Pseudocode for frontend integration
interface RecommendationRequest {
  currentChord: string
  genre: 'pop' | 'rock' | 'country' | 'punk' | 'alternative' | 'pop rock'
  key: Note
  scaleType: 'major' | 'minor'
}

// Backend API would:
// 1. Get statistical candidates from Markov model
// 2. Filter by harmonic distance (existing logic)
// 3. Score and categorize (common/interesting/adventurous)
// 4. Return ranked recommendations with confidence scores
```

## Performance

- **Model Size**: ~10-20MB (JSON format)
- **Query Time**: <1ms for recommendations
- **Memory**: ~50-100MB loaded in memory
- **Training Time**: ~5-10 minutes on full dataset

## Future Enhancements

1. **Context-Aware Models**: Different probabilities for verse/chorus/bridge
2. **Key Transposition**: Normalize to C major, transpose results to user's key
3. **Hybrid Scoring**: Combine statistical + harmonic distance + friction
4. **Section-Specific Patterns**: Verse vs chorus pattern differences
5. **Temporal Models**: Decade-specific progression styles

## References

- Dataset: [Chordonomicon](https://www.kaggle.com/datasets/henryshan/a-dataset-of-666000-chord-progressions)
- 667K progressions across multiple genres
- 51M chord occurrences
- 4,259 unique chords
