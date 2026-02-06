"""
Chord notation normalizer.

Converts various chord notations from the dataset into a standardized format
compatible with the frontend music theory system.
"""

import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class ChordNotation:
    """Normalized chord representation."""
    root: str           # e.g., "C", "F#", "Bb"
    quality: str        # e.g., "maj", "min", "7", "maj7", "dim", "aug"
    bass: Optional[str] # For slash chords, e.g., "G" in C/G
    extensions: list[str]  # Additional extensions like "sus4", "add9"
    
    def __str__(self) -> str:
        """Return standard notation."""
        base = f"{self.root}{self.quality}"
        if self.extensions:
            base += "".join(self.extensions)
        if self.bass:
            base += f"/{self.bass}"
        return base
    
    def to_simple(self) -> str:
        """Return simplified notation (root + basic quality)."""
        # Don't include 'maj' for plain major chords
        if self.quality == "maj":
            return self.root
        else:
            return f"{self.root}{self.quality}"


# Mapping of dataset notation to standard notation
NOTE_MAPPING = {
    # Sharps
    'Cs': 'C#',
    'Ds': 'D#',
    'Fs': 'F#',
    'Gs': 'G#',
    'As': 'A#',
    
    # Flats (keep as-is)
    'Bb': 'Bb',
    'Db': 'Db',
    'Eb': 'Eb',
    'Gb': 'Gb',
    'Ab': 'Ab',
    
    # Naturals (keep as-is)
    'C': 'C',
    'D': 'D',
    'E': 'E',
    'F': 'F',
    'G': 'G',
    'A': 'A',
    'B': 'B',
}


def normalize_note(note: str) -> str:
    """
    Normalize a note name.
    
    Args:
        note: Note name in dataset format (e.g., "Cs", "Bb", "C")
    
    Returns:
        Standardized note name (e.g., "C#", "Bb", "C")
    """
    return NOTE_MAPPING.get(note, note)


def parse_chord_components(chord_str: str) -> tuple[str, str, Optional[str]]:
    """
    Parse chord string into root, quality, and bass components.
    
    Args:
        chord_str: Chord string from dataset (e.g., "Amin7", "C/G", "Fsno3d")
    
    Returns:
        Tuple of (root, quality, bass_note)
    """
    # Handle slash chords first
    bass = None
    if '/' in chord_str:
        chord_part, bass_part = chord_str.split('/', 1)
        bass = normalize_note(bass_part)
        chord_str = chord_part
    
    # Match root note (1-2 characters: note + optional sharp/flat)
    root_match = re.match(r'^([A-G][sb]?)', chord_str)
    if not root_match:
        raise ValueError(f"Could not parse root note from: {chord_str}")
    
    root = normalize_note(root_match.group(1))
    quality_str = chord_str[len(root_match.group(1)):]
    
    # Parse quality
    quality = parse_quality(quality_str)
    
    return root, quality, bass


def parse_quality(quality_str: str) -> str:
    """
    Parse chord quality from the remainder of the chord string.
    
    Args:
        quality_str: Everything after the root note
    
    Returns:
        Normalized quality string
    """
    if not quality_str:
        return 'maj'  # Default to major
    
    # Power chords (no 3rd)
    if 'no3d' in quality_str.lower():
        return '5'  # Power chord
    
    # Minor chords
    if quality_str.startswith('min'):
        rest = quality_str[3:]
        if rest == '7':
            return 'm7'
        elif rest == 'maj7':
            return 'mM7'
        elif rest.startswith('add'):
            return f"m{rest}"
        return 'm'
    
    # Diminished
    if quality_str.startswith('dim'):
        rest = quality_str[3:]
        if rest == '7':
            return 'dim7'
        return 'dim'
    
    # Augmented
    if quality_str.startswith('aug'):
        return 'aug'
    
    # Suspended
    if quality_str.startswith('sus'):
        return quality_str  # Keep as-is (sus2, sus4)
    
    # Major variants
    if quality_str.startswith('maj'):
        rest = quality_str[3:]
        if rest == '7':
            return 'M7'
        elif rest == '9':
            return 'M9'
        return 'maj'
    
    # Dominant 7th and extensions
    if quality_str == '7':
        return '7'
    elif quality_str == '9':
        return '9'
    elif quality_str == '11':
        return '11'
    elif quality_str == '13':
        return '13'
    
    # Add chords
    if quality_str.startswith('add'):
        return quality_str
    
    # If we get here, try to preserve the original
    return quality_str if quality_str else 'maj'


def normalize_chord(chord_str: str) -> ChordNotation:
    """
    Normalize a chord string from the dataset.
    
    Args:
        chord_str: Chord string from dataset (e.g., "Amin7", "C/G", "Fsno3d")
    
    Returns:
        ChordNotation object with standardized components
    
    Examples:
        >>> normalize_chord("Amin7")
        ChordNotation(root='A', quality='m7', bass=None, extensions=[])
        
        >>> normalize_chord("C/G")
        ChordNotation(root='C', quality='maj', bass='G', extensions=[])
        
        >>> normalize_chord("Fsno3d")
        ChordNotation(root='F#', quality='5', bass=None, extensions=[])
    """
    try:
        root, quality, bass = parse_chord_components(chord_str)
        
        # For now, we'll keep extensions empty and handle them later if needed
        extensions = []
        
        return ChordNotation(
            root=root,
            quality=quality,
            bass=bass,
            extensions=extensions
        )
    except Exception as e:
        # If parsing fails, return a basic representation
        # This helps with edge cases in the dataset
        return ChordNotation(
            root=chord_str,
            quality='unknown',
            bass=None,
            extensions=[]
        )


def normalize_chord_simple(chord_str: str) -> str:
    """
    Normalize chord to simple string format.
    
    Args:
        chord_str: Chord string from dataset
    
    Returns:
        Simplified normalized chord string (e.g., "Am7", "C", "F#5")
    """
    try:
        notation = normalize_chord(chord_str)
        return notation.to_simple()
    except:
        return chord_str  # Return original if normalization fails


# Precompute common chord mappings for performance
_CHORD_CACHE: dict[str, ChordNotation] = {}


def get_normalized_chord(chord_str: str, use_cache: bool = True) -> ChordNotation:
    """
    Get normalized chord with optional caching.
    
    Args:
        chord_str: Chord string from dataset
        use_cache: Whether to use the cache (default: True)
    
    Returns:
        ChordNotation object
    """
    if use_cache:
        if chord_str not in _CHORD_CACHE:
            _CHORD_CACHE[chord_str] = normalize_chord(chord_str)
        return _CHORD_CACHE[chord_str]
    return normalize_chord(chord_str)
