"""
High-level recommendation API.

Provides a simple interface for getting chord recommendations
that combines Markov model, patterns, and friction scores.
"""

from pathlib import Path
from typing import Optional
from dataclasses import dataclass

from .markov_model import MarkovModel, TransitionStats
from .pattern_extractor import PatternMiner, ChordPattern
from .chord_normalizer import normalize_chord_simple


@dataclass
class Recommendation:
    """A chord recommendation with metadata."""
    chord: str
    probability: float
    category: str  # 'common', 'interesting', 'adventurous'
    friction_score: float
    count: int
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            'chord': self.chord,
            'probability': self.probability,
            'category': self.category,
            'friction_score': self.friction_score,
            'count': self.count
        }


class ChordRecommender:
    """
    High-level chord recommendation system.
    
    Combines Markov model and pattern matching to provide
    genre-aware chord progression recommendations.
    """
    
    def __init__(self, model_dir: Optional[Path] = None):
        """
        Initialize recommender with trained models.
        
        Args:
            model_dir: Directory containing trained models.
                      If None, uses default location.
        """
        if model_dir is None:
            # Default to trained/ directory
            model_dir = Path(__file__).parent / "trained"
        
        self.model_dir = Path(model_dir)
        self.markov: Optional[MarkovModel] = None
        self.patterns: Optional[PatternMiner] = None
        self._loaded = False
    
    def load(self):
        """Load trained models from disk."""
        if self._loaded:
            return
        
        markov_path = self.model_dir / "markov_model.json"
        patterns_path = self.model_dir / "patterns.json"
        
        if not markov_path.exists():
            raise FileNotFoundError(
                f"Markov model not found at {markov_path}. "
                "Run build_models.py first."
            )
        
        print(f"Loading models from {self.model_dir}")
        
        # Load Markov model
        self.markov = MarkovModel.load(markov_path)
        print(f"✓ Loaded Markov model ({len(self.markov.get_available_genres())} genres)")
        
        # Load patterns
        if patterns_path.exists():
            import json
            with open(patterns_path, 'r') as f:
                pattern_data = json.load(f)
            self.patterns = PatternMiner.from_dict(pattern_data)
            print(f"✓ Loaded patterns ({len(self.patterns.get_available_genres())} genres)")
        else:
            print("⚠ Patterns not found, pattern matching disabled")
            self.patterns = None
        
        self._loaded = True
    
    def get_recommendations(
        self,
        current_chord: str,
        genre: str,
        top_n: int = 10,
        normalize: bool = True
    ) -> list[Recommendation]:
        """
        Get chord recommendations.
        
        Args:
            current_chord: Current chord (will be normalized if normalize=True)
            genre: Genre for recommendations
            top_n: Number of recommendations to return
            normalize: Whether to normalize chord notation
        
        Returns:
            List of Recommendation objects sorted by score
        """
        if not self._loaded:
            self.load()
        
        # Normalize chord if requested
        if normalize:
            current_chord = normalize_chord_simple(current_chord)
        
        # Get Markov recommendations
        markov_recs = self.markov.get_recommendations(
            current_chord,
            genre,
            top_n=top_n * 2  # Get more to filter/categorize
        )
        
        if not markov_recs:
            return []
        
        # Convert to Recommendation objects with categories
        recommendations = []
        for rec in markov_recs:
            friction = self.markov.get_friction_score(rec.to_chord, genre)
            category = self._categorize(rec.probability, friction)
            
            recommendations.append(Recommendation(
                chord=rec.to_chord,
                probability=rec.probability,
                category=category,
                friction_score=friction,
                count=rec.count
            ))
        
        return recommendations[:top_n]
    
    def _categorize(self, probability: float, friction: float) -> str:
        """
        Categorize a recommendation based on probability and friction.
        
        Args:
            probability: Transition probability
            friction: Friction score (0=common, 1=rare)
        
        Returns:
            Category: 'common', 'interesting', or 'adventurous'
        """
        # High probability, low friction = common
        if probability > 0.05 and friction < 0.3:
            return 'common'
        
        # Low probability or high friction = adventurous
        elif probability < 0.01 or friction > 0.7:
            return 'adventurous'
        
        # Everything else = interesting
        else:
            return 'interesting'
    
    def find_patterns(
        self,
        prefix: list[str],
        genre: str,
        max_length: int = 4,
        normalize: bool = True
    ) -> list[ChordPattern]:
        """
        Find patterns starting with given prefix.
        
        Args:
            prefix: List of chords to match
            genre: Genre to search in
            max_length: Maximum pattern length
            normalize: Whether to normalize chord notation
        
        Returns:
            List of matching ChordPattern objects
        """
        if not self._loaded:
            self.load()
        
        if self.patterns is None:
            return []
        
        # Normalize chords if requested
        if normalize:
            prefix = [normalize_chord_simple(c) for c in prefix]
        
        return self.patterns.find_matching_patterns(
            prefix,
            genre,
            max_pattern_length=max_length
        )
    
    def get_available_genres(self) -> list[str]:
        """Get list of available genres."""
        if not self._loaded:
            self.load()
        return self.markov.get_available_genres()
    
    def get_chord_stats(self, chord: str, genre: str, normalize: bool = True) -> dict:
        """
        Get statistics for a chord in a genre.
        
        Args:
            chord: Chord to query
            genre: Genre to query
            normalize: Whether to normalize chord notation
        
        Returns:
            Dictionary with frequency and friction score
        """
        if not self._loaded:
            self.load()
        
        if normalize:
            chord = normalize_chord_simple(chord)
        
        frequency = self.markov.get_chord_frequency(chord, genre)
        friction = self.markov.get_friction_score(chord, genre)
        
        return {
            'chord': chord,
            'genre': genre,
            'frequency': frequency,
            'friction_score': friction,
            'category': 'common' if friction < 0.3 else 'adventurous' if friction > 0.7 else 'interesting'
        }


# Singleton instance for easy access
_recommender: Optional[ChordRecommender] = None


def get_recommender() -> ChordRecommender:
    """Get or create the global recommender instance."""
    global _recommender
    if _recommender is None:
        _recommender = ChordRecommender()
        _recommender.load()
    return _recommender
