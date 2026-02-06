# Model Architecture

## Design Philosophy

**Data-First Functional Programming**

Every component follows these principles:
1. **Immutable data structures** - Models are pure data, never mutated
2. **Pure functions** - No side effects in core logic
3. **Composability** - Each piece works independently
4. **Clear I/O boundaries** - Training, querying, and serialization are separate

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ChordRecommender                        │
│                   (High-Level API)                          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
       ┌───────▼────────┐        ┌────────▼────────┐
       │  MarkovModel   │        │  PatternMiner   │
       │  (Transitions) │        │  (Sequences)    │
       └───────┬────────┘        └────────┬────────┘
               │                          │
               └──────────┬───────────────┘
                          │
                  ┌───────▼────────┐
                  │ChordNormalizer │
                  │  (Notation)    │
                  └────────────────┘
```

## 1. Chord Normalizer

**Purpose**: Convert dataset notation → standard format

**Input**: `"Amin7"`, `"Fsno3d"`, `"C/G"`  
**Output**: `ChordNotation(root='A', quality='m7', bass=None)`

### Key Functions

```python
normalize_chord(chord_str: str) -> ChordNotation
normalize_chord_simple(chord_str: str) -> str
```

### Data Structure

```python
@dataclass
class ChordNotation:
    root: str           # "C", "F#", "Bb"
    quality: str        # "maj", "m", "7", "M7", "5"
    bass: Optional[str] # For slash chords
    extensions: list[str]
```

### Notation Mapping

| Dataset | Standard | Quality |
|---------|----------|---------|
| `C` | `C` | `maj` |
| `Amin` | `Am` | `m` |
| `Fsmin7` | `F#m7` | `m7` |
| `Fmaj7` | `FM7` | `M7` |
| `Ano3d` | `A5` | `5` (power) |
| `C/G` | `C` | `maj` (bass: G) |

## 2. Markov Model

**Purpose**: Store and query transition probabilities

**Structure**: `P(chord_j | chord_i, genre)`

### Data Structures

```python
@dataclass
class TransitionStats:
    from_chord: str
    to_chord: str
    count: int
    probability: float
    genre: str

class MarkovModel:
    transitions: dict[genre][from_chord][to_chord] = probability
    chord_frequencies: dict[genre][chord] = frequency
    genre_totals: dict[genre] = count
```

### Key Methods

```python
# Get recommendations
get_recommendations(
    current_chord: str,
    genre: str,
    top_n: int = 10
) -> list[TransitionStats]

# Get chord stats
get_chord_frequency(chord: str, genre: str) -> float
get_friction_score(chord: str, genre: str) -> float
```

### Friction Score

```python
friction = 1.0 - min(frequency * 10, 1.0)

# Examples:
# C in pop: freq=0.15 → friction=0.0 (very common)
# Dbm7 in pop: freq=0.0001 → friction=0.99 (very rare)
```

## 3. Pattern Extractor

**Purpose**: Find common multi-chord sequences

**Structure**: N-grams of length 2, 3, 4

### Data Structures

```python
@dataclass
class ChordPattern:
    chords: tuple[str, ...]
    count: int
    frequency: float
    genre: str

class PatternMiner:
    patterns: dict[genre][length] = list[ChordPattern]
```

### Key Methods

```python
# Get top patterns
get_patterns(
    genre: str,
    length: int,
    top_n: int = 20
) -> list[ChordPattern]

# Find patterns with prefix
find_matching_patterns(
    prefix: list[str],
    genre: str,
    max_pattern_length: int = 4
) -> list[ChordPattern]
```

### Example Patterns

```
Pop 4-chord patterns:
1. C → G → Am → F  (freq: 0.0234)
2. G → D → Em → C  (freq: 0.0189)
3. Am → F → C → G  (freq: 0.0156)
```

## 4. Chord Recommender

**Purpose**: High-level API combining all models

### Data Structure

```python
@dataclass
class Recommendation:
    chord: str
    probability: float
    category: str  # 'common', 'interesting', 'adventurous'
    friction_score: float
    count: int
```

### Categorization Logic

```python
def categorize(probability: float, friction: float) -> str:
    if probability > 0.05 and friction < 0.3:
        return 'common'
    elif probability < 0.01 or friction > 0.7:
        return 'adventurous'
    else:
        return 'interesting'
```

### Key Methods

```python
# Get recommendations
get_recommendations(
    current_chord: str,
    genre: str,
    top_n: int = 10
) -> list[Recommendation]

# Find patterns
find_patterns(
    prefix: list[str],
    genre: str
) -> list[ChordPattern]

# Get chord stats
get_chord_stats(
    chord: str,
    genre: str
) -> dict
```

## Training Pipeline

```python
def build_models(df: DataFrame):
    # 1. Parse progressions
    df['parsed_chords'] = df['chords'].apply(parse_progression)
    
    # 2. Build Markov model
    markov = build_markov_model(
        df,
        normalize_fn=normalize_chord_simple,
        min_genre_size=5000
    )
    
    # 3. Extract patterns
    patterns = extract_patterns(
        df,
        normalize_fn=normalize_chord_simple,
        pattern_lengths=[2, 3, 4],
        top_n_per_length=100
    )
    
    # 4. Save models
    markov.save("trained/markov_model.json")
    patterns.save("trained/patterns.json")
```

## Query Flow

```
User Query: "What comes after C in pop?"
    │
    ▼
ChordRecommender.get_recommendations("C", "pop")
    │
    ├─► Normalize: "C" → "C" (already normalized)
    │
    ├─► MarkovModel.get_recommendations("C", "pop")
    │   └─► Returns: [(G, 0.362), (Am, 0.102), (F, 0.155), ...]
    │
    ├─► Calculate friction scores
    │   └─► G: 0.05, Am: 0.12, F: 0.08, ...
    │
    ├─► Categorize
    │   └─► G: common, Am: common, F: common, ...
    │
    └─► Return: [Recommendation(chord='G', prob=0.362, category='common', ...)]
```

## Serialization Format

### Markov Model (JSON)

```json
{
  "transitions": {
    "pop": {
      "C": {
        "G": 0.362,
        "Am": 0.102,
        "F": 0.155
      }
    }
  },
  "chord_frequencies": {
    "pop": {
      "C": 0.15,
      "G": 0.18,
      "Am": 0.09
    }
  },
  "genre_totals": {
    "pop": 66680
  }
}
```

### Patterns (JSON)

```json
{
  "pop": {
    "2": [
      {
        "chords": ["C", "G"],
        "count": 18241,
        "frequency": 0.0362,
        "genre": "pop"
      }
    ],
    "4": [
      {
        "chords": ["C", "G", "Am", "F"],
        "count": 1234,
        "frequency": 0.0234,
        "genre": "pop"
      }
    ]
  }
}
```

## Performance Characteristics

| Operation | Time | Memory |
|-----------|------|--------|
| Load models | 100-200ms | 50-100MB |
| Single query | <1ms | - |
| Pattern search | <5ms | - |
| Training | 5-10 min | 2-4GB |

## Extension Points

### 1. Context-Aware Models
```python
# Add section context
transitions[genre][section][from_chord][to_chord] = probability

# Query with context
get_recommendations(chord, genre, section='chorus')
```

### 2. Key Transposition
```python
# Normalize to C major
normalized_key = transpose_to_c(progression, original_key)

# Query in C
recs = get_recommendations(chord, genre)

# Transpose back
final_recs = transpose_from_c(recs, target_key)
```

### 3. Hybrid Scoring
```python
# Combine multiple signals
score = (
    0.4 * statistical_probability +
    0.3 * harmonic_distance_score +
    0.2 * friction_score +
    0.1 * pattern_match_score
)
```

## Testing Strategy

### Unit Tests
- Chord normalization (all notation variants)
- Transition probability calculations
- Pattern extraction accuracy

### Integration Tests
- End-to-end recommendation flow
- Model serialization/deserialization
- Genre filtering

### Validation Tests
- Prediction accuracy on held-out data
- Cross-genre consistency
- Edge case handling

## Future Enhancements

1. **Temporal models**: Decade-specific styles
2. **Hierarchical models**: Sub-genre refinement
3. **Sequence models**: LSTM/Transformer for longer context
4. **Multi-modal**: Combine with audio features
5. **Interactive learning**: User feedback loop

---

**Architecture designed for:**
- ✓ Simplicity (easy to understand)
- ✓ Composability (easy to extend)
- ✓ Performance (fast queries)
- ✓ Maintainability (pure functions, clear boundaries)
