"""
Model building script.

Loads the Chordonomicon dataset, builds Markov models and pattern extractors,
and saves them to disk for use in the recommendation system.
"""

import pandas as pd
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.paths import get_project_root
from models.chord_normalizer import normalize_chord_simple
from models.markov_model import build_markov_model
from models.pattern_extractor import extract_patterns


def load_dataset() -> pd.DataFrame:
    """Load and prepare the Chordonomicon dataset."""
    print("Loading dataset...")
    csv_path = get_project_root() / "data" / "progressions.csv" / "chordonomicon.csv"
    df = pd.read_csv(csv_path)
    print(f"Loaded {len(df):,} progressions")
    return df


def parse_progressions(df: pd.DataFrame) -> pd.DataFrame:
    """Parse chord progressions from the dataset."""
    import re
    
    def parse_progression(progression_str):
        """Parse a progression string and extract individual chords."""
        if pd.isna(progression_str):
            return []
        
        # Remove structure tags
        cleaned = re.sub(r'<[^>]+>', '', progression_str)
        
        # Split by whitespace and filter empty strings
        chords = [c.strip() for c in cleaned.split() if c.strip()]
        
        return chords
    
    print("Parsing progressions...")
    df['parsed_chords'] = df['chords'].apply(parse_progression)
    df['num_chords'] = df['parsed_chords'].apply(len)
    print(f"Parsed {df['num_chords'].sum():,} total chords")
    
    return df


def main():
    """Main model building pipeline."""
    # Configuration
    MIN_GENRE_SIZE = 5000  # Minimum progressions per genre
    OUTPUT_DIR = get_project_root() / "src" / "models" / "trained"
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    print("=" * 80)
    print("CHORD PROGRESSION MODEL BUILDER")
    print("=" * 80)
    
    # Load and parse data
    df = load_dataset()
    df = parse_progressions(df)
    
    # Build Markov model
    print("\n" + "=" * 80)
    print("BUILDING MARKOV MODEL")
    print("=" * 80)
    
    markov_model = build_markov_model(
        df,
        chord_column='parsed_chords',
        genre_column='main_genre',
        normalize_fn=normalize_chord_simple,
        min_genre_size=MIN_GENRE_SIZE
    )
    
    # Save Markov model
    markov_path = OUTPUT_DIR / "markov_model.json"
    print(f"\nSaving Markov model to {markov_path}")
    markov_model.save(markov_path)
    print(f"✓ Saved model with {len(markov_model.get_available_genres())} genres")
    
    # Build pattern extractor
    print("\n" + "=" * 80)
    print("EXTRACTING COMMON PATTERNS")
    print("=" * 80)
    
    pattern_miner = extract_patterns(
        df,
        chord_column='parsed_chords',
        genre_column='main_genre',
        normalize_fn=normalize_chord_simple,
        pattern_lengths=[2, 3, 4],
        min_genre_size=MIN_GENRE_SIZE,
        top_n_per_length=100
    )
    
    # Save pattern miner
    patterns_path = OUTPUT_DIR / "patterns.json"
    print(f"\nSaving patterns to {patterns_path}")
    import json
    with open(patterns_path, 'w') as f:
        json.dump(pattern_miner.to_dict(), f, indent=2)
    print(f"✓ Saved patterns for {len(pattern_miner.get_available_genres())} genres")
    
    # Print summary statistics
    print("\n" + "=" * 80)
    print("MODEL SUMMARY")
    print("=" * 80)
    
    print(f"\nGenres in models: {', '.join(markov_model.get_available_genres())}")
    
    for genre in markov_model.get_available_genres():
        print(f"\n{genre.upper()}:")
        print(f"  Total progressions: {markov_model.genre_totals.get(genre, 0):,}")
        
        # Count unique transitions
        n_transitions = sum(
            len(to_chords)
            for to_chords in markov_model.transitions[genre].values()
        )
        print(f"  Unique transitions: {n_transitions:,}")
        
        # Count patterns
        n_patterns = sum(
            len(patterns)
            for patterns in pattern_miner.patterns[genre].values()
        )
        print(f"  Common patterns: {n_patterns}")
    
    print("\n" + "=" * 80)
    print("✓ MODEL BUILDING COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
