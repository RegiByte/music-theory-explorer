#!/usr/bin/env python3
"""
CLI tool for querying trained models.

Quick way to test recommendations without opening a notebook.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import get_recommender


def main():
    """Interactive CLI for model queries."""
    print("=" * 70)
    print("CHORD PROGRESSION RECOMMENDER")
    print("=" * 70)
    
    # Load models
    try:
        recommender = get_recommender()
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease run: python src/models/build_models.py")
        return
    
    genres = recommender.get_available_genres()
    print(f"\nAvailable genres: {', '.join(genres)}")
    print("\nCommands:")
    print("  rec <chord> <genre>     - Get recommendations")
    print("  pattern <c1> <c2> <genre> - Find patterns")
    print("  stats <chord> <genre>   - Get chord statistics")
    print("  quit                    - Exit")
    
    while True:
        print("\n" + "-" * 70)
        try:
            cmd = input("\n> ").strip().lower()
            
            if not cmd or cmd == "quit":
                print("\nGoodbye!")
                break
            
            parts = cmd.split()
            
            if parts[0] == "rec" and len(parts) >= 3:
                chord = parts[1]
                genre = parts[2]
                
                print(f"\nRecommendations for {chord} in {genre}:")
                recs = recommender.get_recommendations(chord, genre, top_n=10)
                
                if recs:
                    print(f"\n{'#':<4} {'Chord':<10} {'Prob':<10} {'Category':<15} {'Friction'}")
                    print("-" * 60)
                    for i, rec in enumerate(recs, 1):
                        print(f"{i:<4} {rec.chord:<10} {rec.probability:>8.4f}  "
                              f"{rec.category:<15} {rec.friction_score:>6.3f}")
                else:
                    print("No recommendations found")
            
            elif parts[0] == "pattern" and len(parts) >= 4:
                c1 = parts[1]
                c2 = parts[2]
                genre = parts[3]
                
                print(f"\nPatterns starting with {c1} → {c2} in {genre}:")
                patterns = recommender.find_patterns([c1, c2], genre)
                
                if patterns:
                    print(f"\n{'#':<4} {'Pattern':<40} {'Freq':<10} {'Count'}")
                    print("-" * 70)
                    for i, pattern in enumerate(patterns[:10], 1):
                        print(f"{i:<4} {str(pattern):<40} {pattern.frequency:>8.4f}  {pattern.count:>8,}")
                else:
                    print("No patterns found")
            
            elif parts[0] == "stats" and len(parts) >= 3:
                chord = parts[1]
                genre = parts[2]
                
                stats = recommender.get_chord_stats(chord, genre)
                print(f"\nStatistics for {stats['chord']} in {genre}:")
                print(f"  Frequency: {stats['frequency']:.6f}")
                print(f"  Friction:  {stats['friction_score']:.3f}")
                print(f"  Category:  {stats['category']}")
            
            else:
                print("Unknown command. Try: rec <chord> <genre>")
        
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    main()
