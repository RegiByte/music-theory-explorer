"""
Markov chain model for chord progressions.

Builds genre-specific transition probability matrices from the dataset
and provides an API for querying next-chord recommendations.

Supports three orders of context:
  - Order 1 (unigram):  P(next | current_chord, genre)
  - Order 2 (bigram):   P(next | prev_chord, current_chord, genre)
  - Order 3 (trigram):  P(next | prev2, prev1, current_chord, genre)

Higher-order models capture progression context: the same chord reached
via different paths leads to different next-chord distributions.
"""

import json
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import pandas as pd

# Separator for higher-order context keys (e.g. "G|Am" for bigram)
CONTEXT_SEP = "|"


@dataclass
class TransitionStats:
    """Statistics for a chord transition."""
    from_chord: str
    to_chord: str
    count: int
    probability: float
    genre: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class ChordStats:
    """Statistics for a single chord."""
    chord: str
    count: int
    frequency: float  # Relative frequency in genre
    genre: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return asdict(self)


class MarkovModel:
    """
    Multi-order Markov chain model for chord progressions.
    
    Stores transition probabilities at three levels of context:
      - Order 1: P(chord_j | chord_i, genre)             — single chord context
      - Order 2: P(chord_j | chord_h, chord_i, genre)    — two chord context
      - Order 3: P(chord_j | chord_g, chord_h, chord_i, genre) — three chord context
    
    Higher orders capture how the same chord reached via different paths
    leads to different continuations. Queries use backoff: try order 3 first,
    fall back to 2, then 1.
    """
    
    def __init__(self):
        """Initialize empty model."""
        # Order 1 — Structure: {genre: {from_chord: {to_chord: probability}}}
        self.transitions: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        
        # Order 2 — Structure: {genre: {"A|B": {to_chord: probability}}}
        # Key is "prev|current" joined by CONTEXT_SEP
        self.bigram_transitions: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        
        # Order 3 — Structure: {genre: {"A|B|C": {to_chord: probability}}}
        # Key is "prev2|prev1|current" joined by CONTEXT_SEP
        self.trigram_transitions: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        
        # Structure: {genre: {chord: frequency}}
        self.chord_frequencies: dict[str, dict[str, float]] = defaultdict(dict)
        
        # Total counts for normalization
        self.genre_totals: dict[str, int] = {}
    
    def add_transition(self, from_chord: str, to_chord: str, genre: str, probability: float):
        """Add a 1st-order transition probability to the model."""
        self.transitions[genre][from_chord][to_chord] = probability
    
    def add_bigram_transition(self, context_key: str, to_chord: str, genre: str, probability: float):
        """Add a 2nd-order (bigram) transition probability."""
        self.bigram_transitions[genre][context_key][to_chord] = probability
    
    def add_trigram_transition(self, context_key: str, to_chord: str, genre: str, probability: float):
        """Add a 3rd-order (trigram) transition probability."""
        self.trigram_transitions[genre][context_key][to_chord] = probability
    
    def add_chord_frequency(self, chord: str, genre: str, frequency: float):
        """Add chord frequency to the model."""
        self.chord_frequencies[genre][chord] = frequency
    
    def get_recommendations(
        self,
        current_chord: str,
        genre: str,
        top_n: int = 10,
        min_probability: float = 0.001,
        context: Optional[list[str]] = None,
    ) -> list[TransitionStats]:
        """
        Get top N chord recommendations with backoff through context orders.
        
        Tries the most specific context first (trigram → bigram → unigram).
        Falls back to lower orders when higher orders have no data.
        
        Args:
            current_chord: Current chord in normalized format
            genre: Genre to query (e.g., "pop", "rock")
            top_n: Number of recommendations to return
            min_probability: Minimum probability threshold
            context: Optional list of preceding chords (most recent last).
                     E.g. ["C", "G"] means the path was C → G → current_chord.
                     If None, uses 1st-order only.
        
        Returns:
            List of TransitionStats objects sorted by probability
        """
        transitions = None
        from_label = current_chord
        
        # Try order 3 (trigram): need at least 2 context chords
        if context and len(context) >= 2:
            trigram_key = CONTEXT_SEP.join([context[-2], context[-1], current_chord])
            if genre in self.trigram_transitions and trigram_key in self.trigram_transitions[genre]:
                transitions = self.trigram_transitions[genre][trigram_key]
                from_label = trigram_key
        
        # Try order 2 (bigram): need at least 1 context chord
        if transitions is None and context and len(context) >= 1:
            bigram_key = CONTEXT_SEP.join([context[-1], current_chord])
            if genre in self.bigram_transitions and bigram_key in self.bigram_transitions[genre]:
                transitions = self.bigram_transitions[genre][bigram_key]
                from_label = bigram_key
        
        # Fall back to order 1 (unigram)
        if transitions is None:
            if genre not in self.transitions or current_chord not in self.transitions[genre]:
                return []
            transitions = self.transitions[genre][current_chord]
            from_label = current_chord
        
        # Filter and sort
        results = []
        for to_chord, prob in transitions.items():
            if prob >= min_probability:
                estimated_count = int(prob * self.genre_totals.get(genre, 1000))
                results.append(TransitionStats(
                    from_chord=from_label,
                    to_chord=to_chord,
                    count=estimated_count,
                    probability=prob,
                    genre=genre
                ))
        
        # Sort by probability descending
        results.sort(key=lambda x: x.probability, reverse=True)
        
        return results[:top_n]
    
    def get_chord_frequency(self, chord: str, genre: str) -> float:
        """
        Get the frequency of a chord in a genre.
        
        Args:
            chord: Chord in normalized format
            genre: Genre to query
        
        Returns:
            Frequency (0.0 to 1.0), or 0.0 if not found
        """
        if genre not in self.chord_frequencies:
            return 0.0
        return self.chord_frequencies[genre].get(chord, 0.0)
    
    def get_friction_score(self, chord: str, genre: str) -> float:
        """
        Calculate friction score for a chord.
        
        Higher frequency = lower friction (easier/more common)
        Lower frequency = higher friction (harder/more unusual)
        
        Args:
            chord: Chord in normalized format
            genre: Genre to query
        
        Returns:
            Friction score (0.0 = very common, 1.0 = very rare)
        """
        freq = self.get_chord_frequency(chord, genre)
        if freq == 0:
            return 1.0
        # Invert and normalize: common chords have low friction
        return 1.0 - min(freq * 10, 1.0)  # Scale to make it more sensitive
    
    def get_available_genres(self) -> list[str]:
        """Get list of genres in the model."""
        return list(self.transitions.keys())
    
    def to_dict(
        self,
        max_per_context: int = 15,
        probability_precision: int = 4,
        min_export_probability: float = 0.005,
    ) -> dict:
        """
        Convert model to dictionary for serialization.
        
        Higher-order transitions are pruned to keep the model compact for
        frontend delivery:
          - Only top `max_per_context` transitions per context key
          - Probabilities rounded to `probability_precision` decimal places
          - Transitions below `min_export_probability` are dropped
        
        Order 1 (unigram) is exported in full since it's already compact.
        """
        def _prune_transitions(
            trans: dict[str, dict[str, dict[str, float]]],
            prune: bool = False,
        ) -> dict:
            result = {}
            for genre, contexts in trans.items():
                result[genre] = {}
                for context_key, to_chords in contexts.items():
                    # Filter by minimum probability
                    filtered = {
                        chord: round(prob, probability_precision)
                        for chord, prob in to_chords.items()
                        if prob >= min_export_probability
                    }
                    if not filtered:
                        continue
                    # Keep only top N if pruning
                    if prune and len(filtered) > max_per_context:
                        top = sorted(filtered.items(), key=lambda x: x[1], reverse=True)[:max_per_context]
                        filtered = dict(top)
                    result[genre][context_key] = filtered
            return result
        
        return {
            'transitions': _prune_transitions(dict(self.transitions), prune=False),
            'bigram_transitions': _prune_transitions(dict(self.bigram_transitions), prune=True),
            'trigram_transitions': _prune_transitions(dict(self.trigram_transitions), prune=True),
            'chord_frequencies': dict(self.chord_frequencies),
            'genre_totals': self.genre_totals
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'MarkovModel':
        """Load model from dictionary."""
        model = cls()
        
        # Reconstruct 1st-order transitions
        for genre, from_chords in data['transitions'].items():
            for from_chord, to_chords in from_chords.items():
                for to_chord, prob in to_chords.items():
                    model.add_transition(from_chord, to_chord, genre, prob)
        
        # Reconstruct 2nd-order (bigram) transitions
        for genre, contexts in data.get('bigram_transitions', {}).items():
            for context_key, to_chords in contexts.items():
                for to_chord, prob in to_chords.items():
                    model.add_bigram_transition(context_key, to_chord, genre, prob)
        
        # Reconstruct 3rd-order (trigram) transitions
        for genre, contexts in data.get('trigram_transitions', {}).items():
            for context_key, to_chords in contexts.items():
                for to_chord, prob in to_chords.items():
                    model.add_trigram_transition(context_key, to_chord, genre, prob)
        
        # Reconstruct chord frequencies
        for genre, chords in data['chord_frequencies'].items():
            for chord, freq in chords.items():
                model.add_chord_frequency(chord, genre, freq)
        
        model.genre_totals = data.get('genre_totals', {})
        
        return model
    
    def save(self, filepath: Path):
        """Save model to JSON file."""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, filepath: Path) -> 'MarkovModel':
        """Load model from JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return cls.from_dict(data)


def build_markov_model(
    df: pd.DataFrame,
    chord_column: str = 'parsed_chords',
    genre_column: str = 'main_genre',
    normalize_fn=None,
    min_genre_size: int = 1000,
    min_bigram_count: int = 3,
    min_trigram_count: int = 2,
) -> MarkovModel:
    """
    Build a multi-order Markov model from a DataFrame of progressions.
    
    Trains three orders simultaneously:
      - Order 1: P(next | current)           — always available
      - Order 2: P(next | prev, current)     — pruned by min_bigram_count
      - Order 3: P(next | prev2, prev, cur)  — pruned by min_trigram_count
    
    Higher-order transitions are pruned by minimum count to avoid storing
    noisy one-off sequences that would bloat the model without adding value.
    
    Args:
        df: DataFrame with chord progressions
        chord_column: Column containing parsed chord lists
        genre_column: Column containing genre labels
        normalize_fn: Optional function to normalize chord names
        min_genre_size: Minimum number of progressions for a genre to be included
        min_bigram_count: Minimum times a bigram context must appear to be kept
        min_trigram_count: Minimum times a trigram context must appear to be kept
    
    Returns:
        Trained MarkovModel with 1st, 2nd, and 3rd order transitions
    """
    model = MarkovModel()
    
    # Filter genres by size
    genre_counts = df[genre_column].value_counts()
    valid_genres = genre_counts[genre_counts >= min_genre_size].index.tolist()
    
    print(f"Building model for {len(valid_genres)} genres with >= {min_genre_size} progressions")
    
    for genre in valid_genres:
        if pd.isna(genre):
            continue
        
        print(f"Processing genre: {genre}")
        
        # Get progressions for this genre
        genre_df = df[df[genre_column] == genre]
        
        # --- Count all orders simultaneously ---
        # Order 1
        transition_counts = defaultdict(lambda: defaultdict(int))
        from_chord_totals = defaultdict(int)
        chord_counts = defaultdict(int)
        total_chords = 0
        
        # Order 2 (bigram context)
        bigram_counts = defaultdict(lambda: defaultdict(int))
        bigram_totals = defaultdict(int)
        
        # Order 3 (trigram context)
        trigram_counts = defaultdict(lambda: defaultdict(int))
        trigram_totals = defaultdict(int)
        
        for chord_list in genre_df[chord_column]:
            if len(chord_list) < 2:
                continue
            
            # Normalize chords if function provided
            if normalize_fn:
                chord_list = [normalize_fn(c) for c in chord_list]
            
            # Count all orders in a single pass through the progression
            for i in range(len(chord_list) - 1):
                from_chord = chord_list[i]
                to_chord = chord_list[i + 1]
                
                # Order 1: single chord context
                transition_counts[from_chord][to_chord] += 1
                from_chord_totals[from_chord] += 1
                chord_counts[from_chord] += 1
                total_chords += 1
                
                # Order 2: bigram context (need at least 1 preceding chord)
                if i >= 1:
                    bigram_key = CONTEXT_SEP.join([chord_list[i - 1], from_chord])
                    bigram_counts[bigram_key][to_chord] += 1
                    bigram_totals[bigram_key] += 1
                
                # Order 3: trigram context (need at least 2 preceding chords)
                if i >= 2:
                    trigram_key = CONTEXT_SEP.join([chord_list[i - 2], chord_list[i - 1], from_chord])
                    trigram_counts[trigram_key][to_chord] += 1
                    trigram_totals[trigram_key] += 1
            
            # Count last chord
            if chord_list:
                chord_counts[chord_list[-1]] += 1
                total_chords += 1
        
        # --- Calculate probabilities ---
        
        # Order 1
        for from_chord, to_chords in transition_counts.items():
            total = from_chord_totals[from_chord]
            for to_chord, count in to_chords.items():
                probability = count / total
                model.add_transition(from_chord, to_chord, genre, probability)
        
        # Order 2 (with minimum count pruning)
        bigram_kept = 0
        for context_key, to_chords in bigram_counts.items():
            total = bigram_totals[context_key]
            if total < min_bigram_count:
                continue  # Skip rare bigram contexts
            for to_chord, count in to_chords.items():
                probability = count / total
                model.add_bigram_transition(context_key, to_chord, genre, probability)
                bigram_kept += 1
        
        # Order 3 (with minimum count pruning)
        trigram_kept = 0
        for context_key, to_chords in trigram_counts.items():
            total = trigram_totals[context_key]
            if total < min_trigram_count:
                continue  # Skip rare trigram contexts
            for to_chord, count in to_chords.items():
                probability = count / total
                model.add_trigram_transition(context_key, to_chord, genre, probability)
                trigram_kept += 1
        
        # Calculate chord frequencies
        for chord, count in chord_counts.items():
            frequency = count / total_chords if total_chords > 0 else 0
            model.add_chord_frequency(chord, genre, frequency)
        
        # Store genre total
        model.genre_totals[genre] = len(genre_df)
        
        print(f"  - {len(transition_counts)} unique source chords (order 1)")
        print(f"  - {len(bigram_counts)} bigram contexts, {bigram_kept} transitions kept (order 2, min_count={min_bigram_count})")
        print(f"  - {len(trigram_counts)} trigram contexts, {trigram_kept} transitions kept (order 3, min_count={min_trigram_count})")
        print(f"  - {len(chord_counts)} total unique chords")
        print(f"  - {sum(from_chord_totals.values())} total transitions")
    
    return model
