"""
Progression recommendation models.

This package contains statistical models built from the Chordonomicon dataset
for generating genre-aware chord progression recommendations.
"""

from .chord_normalizer import normalize_chord, normalize_chord_simple, ChordNotation
from .markov_model import MarkovModel, build_markov_model
from .pattern_extractor import extract_patterns, PatternMiner
from .recommender import ChordRecommender, get_recommender, Recommendation

__all__ = [
    'normalize_chord',
    'normalize_chord_simple',
    'ChordNotation',
    'MarkovModel',
    'build_markov_model',
    'extract_patterns',
    'PatternMiner',
    'ChordRecommender',
    'get_recommender',
    'Recommendation',
]
