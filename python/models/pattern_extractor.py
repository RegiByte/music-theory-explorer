"""
Pattern extraction for common chord sequences.

Identifies frequently occurring 2-4 chord patterns in progressions,
useful for suggesting complete sequences rather than single chords.
"""

from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from typing import Optional
import pandas as pd


@dataclass
class ChordPattern:
    """A common chord pattern."""
    chords: tuple[str, ...]
    count: int
    frequency: float
    genre: str
    
    def __len__(self) -> int:
        """Return pattern length."""
        return len(self.chords)
    
    def __str__(self) -> str:
        """Return string representation."""
        return " → ".join(self.chords)
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            'chords': list(self.chords),
            'count': self.count,
            'frequency': self.frequency,
            'genre': self.genre
        }


class PatternMiner:
    """
    Extract and store common chord patterns from progressions.
    """
    
    def __init__(self):
        """Initialize empty pattern store."""
        # Structure: {genre: {pattern_length: [ChordPattern, ...]}}
        self.patterns: dict[str, dict[int, list[ChordPattern]]] = defaultdict(
            lambda: defaultdict(list)
        )
    
    def add_pattern(self, pattern: ChordPattern):
        """Add a pattern to the store."""
        genre = pattern.genre
        length = len(pattern)
        self.patterns[genre][length].append(pattern)
    
    def get_patterns(
        self,
        genre: str,
        length: int,
        top_n: int = 20,
        min_frequency: float = 0.001
    ) -> list[ChordPattern]:
        """
        Get top patterns for a genre and length.
        
        Args:
            genre: Genre to query
            length: Pattern length (2, 3, or 4)
            top_n: Number of patterns to return
            min_frequency: Minimum frequency threshold
        
        Returns:
            List of ChordPattern objects sorted by frequency
        """
        if genre not in self.patterns:
            return []
        
        if length not in self.patterns[genre]:
            return []
        
        # Filter and sort
        patterns = [
            p for p in self.patterns[genre][length]
            if p.frequency >= min_frequency
        ]
        patterns.sort(key=lambda x: x.frequency, reverse=True)
        
        return patterns[:top_n]
    
    def find_matching_patterns(
        self,
        prefix: list[str],
        genre: str,
        max_pattern_length: int = 4
    ) -> list[ChordPattern]:
        """
        Find patterns that start with the given prefix.
        
        Args:
            prefix: List of chords to match (e.g., ["C", "G"])
            genre: Genre to search in
            max_pattern_length: Maximum pattern length to consider
        
        Returns:
            List of matching patterns sorted by frequency
        """
        if not prefix or genre not in self.patterns:
            return []
        
        prefix_tuple = tuple(prefix)
        prefix_len = len(prefix)
        matches = []
        
        # Search patterns of length >= prefix length
        for length in range(prefix_len, max_pattern_length + 1):
            if length not in self.patterns[genre]:
                continue
            
            for pattern in self.patterns[genre][length]:
                # Check if pattern starts with prefix
                if pattern.chords[:prefix_len] == prefix_tuple:
                    matches.append(pattern)
        
        # Sort by frequency
        matches.sort(key=lambda x: x.frequency, reverse=True)
        return matches
    
    def get_available_genres(self) -> list[str]:
        """Get list of genres in the pattern store."""
        return list(self.patterns.keys())
    
    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        result = {}
        for genre, lengths in self.patterns.items():
            result[genre] = {}
            for length, patterns in lengths.items():
                result[genre][length] = [p.to_dict() for p in patterns]
        return result
    
    @classmethod
    def from_dict(cls, data: dict) -> 'PatternMiner':
        """Load from dictionary."""
        miner = cls()
        for genre, lengths in data.items():
            for length_str, patterns in lengths.items():
                for p_dict in patterns:
                    pattern = ChordPattern(
                        chords=tuple(p_dict['chords']),
                        count=p_dict['count'],
                        frequency=p_dict['frequency'],
                        genre=p_dict['genre']
                    )
                    miner.add_pattern(pattern)
        return miner


def extract_patterns(
    df: pd.DataFrame,
    chord_column: str = 'parsed_chords',
    genre_column: str = 'main_genre',
    normalize_fn=None,
    pattern_lengths: list[int] = [2, 3, 4],
    min_genre_size: int = 1000,
    top_n_per_length: int = 100
) -> PatternMiner:
    """
    Extract common chord patterns from progressions.
    
    Args:
        df: DataFrame with chord progressions
        chord_column: Column containing parsed chord lists
        genre_column: Column containing genre labels
        normalize_fn: Optional function to normalize chord names
        pattern_lengths: List of pattern lengths to extract
        min_genre_size: Minimum number of progressions for a genre
        top_n_per_length: Number of top patterns to keep per length
    
    Returns:
        PatternMiner with extracted patterns
    """
    miner = PatternMiner()
    
    # Filter genres by size
    genre_counts = df[genre_column].value_counts()
    valid_genres = genre_counts[genre_counts >= min_genre_size].index.tolist()
    
    print(f"Extracting patterns for {len(valid_genres)} genres")
    
    for genre in valid_genres:
        if pd.isna(genre):
            continue
        
        print(f"Processing genre: {genre}")
        
        # Get progressions for this genre
        genre_df = df[df[genre_column] == genre]
        
        # Extract patterns for each length
        for length in pattern_lengths:
            print(f"  Extracting {length}-chord patterns...")
            
            pattern_counts = Counter()
            total_patterns = 0
            
            for chord_list in genre_df[chord_column]:
                if len(chord_list) < length:
                    continue
                
                # Normalize chords if function provided
                if normalize_fn:
                    chord_list = [normalize_fn(c) for c in chord_list]
                
                # Extract all n-grams of this length
                for i in range(len(chord_list) - length + 1):
                    pattern = tuple(chord_list[i:i + length])
                    pattern_counts[pattern] += 1
                    total_patterns += 1
            
            # Convert to ChordPattern objects
            for pattern, count in pattern_counts.most_common(top_n_per_length):
                frequency = count / total_patterns if total_patterns > 0 else 0
                chord_pattern = ChordPattern(
                    chords=pattern,
                    count=count,
                    frequency=frequency,
                    genre=genre
                )
                miner.add_pattern(chord_pattern)
            
            print(f"    Found {len(pattern_counts)} unique patterns, kept top {top_n_per_length}")
    
    return miner
