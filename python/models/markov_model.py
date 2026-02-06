"""
Markov chain model for chord progressions.

Builds genre-specific transition probability matrices from the dataset
and provides an API for querying next-chord recommendations.
"""

import json
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

import pandas as pd


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
    Markov chain model for chord progressions.
    
    Stores transition probabilities P(chord_j | chord_i, genre)
    and provides methods for querying recommendations.
    """
    
    def __init__(self):
        """Initialize empty model."""
        # Structure: {genre: {from_chord: {to_chord: probability}}}
        self.transitions: dict[str, dict[str, dict[str, float]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        
        # Structure: {genre: {chord: frequency}}
        self.chord_frequencies: dict[str, dict[str, float]] = defaultdict(dict)
        
        # Total counts for normalization
        self.genre_totals: dict[str, int] = {}
    
    def add_transition(self, from_chord: str, to_chord: str, genre: str, probability: float):
        """Add a transition probability to the model."""
        self.transitions[genre][from_chord][to_chord] = probability
    
    def add_chord_frequency(self, chord: str, genre: str, frequency: float):
        """Add chord frequency to the model."""
        self.chord_frequencies[genre][chord] = frequency
    
    def get_recommendations(
        self,
        current_chord: str,
        genre: str,
        top_n: int = 10,
        min_probability: float = 0.001
    ) -> list[TransitionStats]:
        """
        Get top N chord recommendations given current chord and genre.
        
        Args:
            current_chord: Current chord in normalized format
            genre: Genre to query (e.g., "pop", "rock")
            top_n: Number of recommendations to return
            min_probability: Minimum probability threshold
        
        Returns:
            List of TransitionStats objects sorted by probability
        """
        if genre not in self.transitions:
            return []
        
        if current_chord not in self.transitions[genre]:
            return []
        
        # Get all transitions from current chord
        transitions = self.transitions[genre][current_chord]
        
        # Filter and sort
        results = []
        for to_chord, prob in transitions.items():
            if prob >= min_probability:
                # We don't have exact counts in the model, so we'll estimate
                # based on genre totals and probability
                estimated_count = int(prob * self.genre_totals.get(genre, 1000))
                results.append(TransitionStats(
                    from_chord=current_chord,
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
    
    def to_dict(self) -> dict:
        """Convert model to dictionary for serialization."""
        return {
            'transitions': dict(self.transitions),
            'chord_frequencies': dict(self.chord_frequencies),
            'genre_totals': self.genre_totals
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'MarkovModel':
        """Load model from dictionary."""
        model = cls()
        
        # Reconstruct transitions
        for genre, from_chords in data['transitions'].items():
            for from_chord, to_chords in from_chords.items():
                for to_chord, prob in to_chords.items():
                    model.add_transition(from_chord, to_chord, genre, prob)
        
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
    min_genre_size: int = 1000
) -> MarkovModel:
    """
    Build a Markov model from a DataFrame of progressions.
    
    Args:
        df: DataFrame with chord progressions
        chord_column: Column containing parsed chord lists
        genre_column: Column containing genre labels
        normalize_fn: Optional function to normalize chord names
        min_genre_size: Minimum number of progressions for a genre to be included
    
    Returns:
        Trained MarkovModel
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
        
        # Count transitions
        transition_counts = defaultdict(lambda: defaultdict(int))
        from_chord_totals = defaultdict(int)
        chord_counts = defaultdict(int)
        total_chords = 0
        
        for chord_list in genre_df[chord_column]:
            if len(chord_list) < 2:
                continue
            
            # Normalize chords if function provided
            if normalize_fn:
                chord_list = [normalize_fn(c) for c in chord_list]
            
            # Count transitions
            for i in range(len(chord_list) - 1):
                from_chord = chord_list[i]
                to_chord = chord_list[i + 1]
                
                transition_counts[from_chord][to_chord] += 1
                from_chord_totals[from_chord] += 1
                chord_counts[from_chord] += 1
                total_chords += 1
            
            # Count last chord
            if chord_list:
                chord_counts[chord_list[-1]] += 1
                total_chords += 1
        
        # Calculate probabilities
        for from_chord, to_chords in transition_counts.items():
            total = from_chord_totals[from_chord]
            for to_chord, count in to_chords.items():
                probability = count / total
                model.add_transition(from_chord, to_chord, genre, probability)
        
        # Calculate chord frequencies
        for chord, count in chord_counts.items():
            frequency = count / total_chords if total_chords > 0 else 0
            model.add_chord_frequency(chord, genre, frequency)
        
        # Store genre total
        model.genre_totals[genre] = len(genre_df)
        
        print(f"  - {len(transition_counts)} unique source chords")
        print(f"  - {len(chord_counts)} total unique chords")
        print(f"  - {sum(from_chord_totals.values())} total transitions")
    
    return model
