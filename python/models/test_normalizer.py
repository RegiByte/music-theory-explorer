"""
Quick tests for chord normalizer.

Run with: python src/models/test_normalizer.py
"""

from chord_normalizer import normalize_chord, normalize_chord_simple


def test_basic_chords():
    """Test basic major and minor chords."""
    tests = [
        ("C", "C"),
        ("G", "G"),
        ("Amin", "Am"),
        ("Dmin", "Dm"),
        ("Emin", "Em"),
    ]
    
    print("Testing basic chords:")
    for input_chord, expected in tests:
        result = normalize_chord_simple(input_chord)
        status = "✓" if result == expected else "✗"
        print(f"  {status} {input_chord:10} -> {result:10} (expected: {expected})")


def test_sharps_flats():
    """Test sharp and flat notation."""
    tests = [
        ("Fs", "F#"),
        ("Cs", "C#"),
        ("Bb", "Bb"),
        ("Eb", "Eb"),
        ("Fsmin", "F#m"),
        ("Csmin7", "C#m7"),
    ]
    
    print("\nTesting sharps and flats:")
    for input_chord, expected in tests:
        result = normalize_chord_simple(input_chord)
        status = "✓" if result == expected else "✗"
        print(f"  {status} {input_chord:10} -> {result:10} (expected: {expected})")


def test_extensions():
    """Test chord extensions."""
    tests = [
        ("Amin7", "Am7"),
        ("Fmaj7", "FM7"),
        ("G7", "G7"),
        ("Dmin7", "Dm7"),
        ("Cmaj7", "CM7"),
    ]
    
    print("\nTesting extensions:")
    for input_chord, expected in tests:
        result = normalize_chord_simple(input_chord)
        status = "✓" if result == expected else "✗"
        print(f"  {status} {input_chord:10} -> {result:10} (expected: {expected})")


def test_slash_chords():
    """Test slash chords (bass notes)."""
    tests = [
        ("C/G", "C"),  # Simple format doesn't include bass
        ("D/Fs", "D"),
        ("Amin/G", "Am"),
    ]
    
    print("\nTesting slash chords:")
    for input_chord, expected in tests:
        result = normalize_chord_simple(input_chord)
        status = "✓" if result == expected else "✗"
        notation = normalize_chord(input_chord)
        bass_info = f" (bass: {notation.bass})" if notation.bass else ""
        print(f"  {status} {input_chord:10} -> {result:10} (expected: {expected}){bass_info}")


def test_power_chords():
    """Test power chords (no 3rd)."""
    tests = [
        ("Ano3d", "A5"),
        ("Gsno3d", "G#5"),
        ("Eno3d", "E5"),
    ]
    
    print("\nTesting power chords:")
    for input_chord, expected in tests:
        result = normalize_chord_simple(input_chord)
        status = "✓" if result == expected else "✗"
        print(f"  {status} {input_chord:10} -> {result:10} (expected: {expected})")


def test_detailed_notation():
    """Test detailed ChordNotation objects."""
    print("\nTesting detailed notation:")
    
    test_chords = ["Amin7", "C/G", "Fsno3d", "Ebmaj7"]
    
    for chord_str in test_chords:
        notation = normalize_chord(chord_str)
        print(f"\n  {chord_str}:")
        print(f"    Root: {notation.root}")
        print(f"    Quality: {notation.quality}")
        print(f"    Bass: {notation.bass or 'None'}")
        print(f"    Full: {str(notation)}")
        print(f"    Simple: {notation.to_simple()}")


if __name__ == "__main__":
    print("=" * 60)
    print("CHORD NORMALIZER TESTS")
    print("=" * 60)
    
    test_basic_chords()
    test_sharps_flats()
    test_extensions()
    test_slash_chords()
    test_power_chords()
    test_detailed_notation()
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETE")
    print("=" * 60)
