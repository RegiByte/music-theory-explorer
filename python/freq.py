open_frequencies = {
    'G': 196,
    'C': 261.63,
    'E': 329.63,
    'A': 440,
}

chromatic_sequence = [
    'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'
]

def nth_frequency(nth: int, base_frequency: float) -> float:
    if nth <= 0:
        return base_frequency
    result = base_frequency * 2 ** (nth / 12)
    return round(result, 2)

def nth_note(nth: int) -> str:
    return chromatic_sequence[nth % len(chromatic_sequence)]

def note_index(note: str) -> int:
    return chromatic_sequence.index(note)

csv_headers = ['string', 'fret', 'note', 'frequency_hz']
csv_rows = []

last_note = None
for note, frequency in open_frequencies.items():
    if last_note is not None and last_note != note:
        print("-" * 20)
    last_note = note
    for i in range(0, 13):
        nth = note_index(note) + i
        chromatic_note = nth_note(nth)
        chromatic_frequency = nth_frequency(i, frequency)
        print(f"[{note}{i}]: {chromatic_note} - {chromatic_frequency}")
        csv_rows.append([note, i, chromatic_note, chromatic_frequency])

import csv

from shared.paths import get_project_root

dataset_path = get_project_root() / "data" / "generated.csv"

with open(dataset_path, 'w') as f:
    writer = csv.writer(f)
    writer.writerow(csv_headers)
    writer.writerows(csv_rows)