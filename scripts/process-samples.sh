#!/usr/bin/env bash
#
# process-samples.sh — Convert raw ukulele recordings to web-ready MP3 samples
#
# Usage:
#   ./scripts/process-samples.sh [input_dir] [output_dir]
#
# Defaults:
#   input_dir:  data/sounds
#   output_dir: frontend/public/samples/ukulele
#
# What it does for each .wav file:
#   1. Trims leading silence (keeps 20ms pre-attack for natural pluck feel)
#   2. Peak-normalizes to -1dB (consistent volume across all samples)
#   3. Applies 50ms fade-out at the tail (prevents end-of-file clicks)
#   4. Converts to MP3 192kbps (good quality, small file size)
#   5. Renames files with '#' in the name to 's' (URL-safe: F#5 → Fs5)
#
# Requirements:
#   - ffmpeg with libmp3lame support
#   - ffprobe (comes with ffmpeg)
#
# Recording guide for new samples:
#   - Single clean pluck with finger pad (not nail)
#   - Let the string ring 3-4 seconds until natural decay
#   - Quiet room, consistent mic distance (~15-20cm from sound hole)
#   - Name files by note: G3.wav, C4.wav, Eb4.wav, etc.
#   - Record each note as a separate file

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────
INPUT_DIR="${1:-data/sounds}"
OUTPUT_DIR="${2:-frontend/public/samples/ukulele}"
TARGET_PEAK_DB="-1"       # Peak normalize target
SILENCE_THRESHOLD="-40dB" # Below this = silence (for trimming)
PRE_ATTACK_MS="0.02"      # Seconds of silence to keep before pluck
FADE_OUT_SECS="0.05"      # Fade-out duration at tail
MP3_BITRATE="192k"        # MP3 quality

# ─── Preflight checks ───────────────────────────────────────────────
if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

if ! command -v ffprobe &>/dev/null; then
  echo "Error: ffprobe not found. Install with: brew install ffmpeg"
  exit 1
fi

if ! command -v bc &>/dev/null; then
  echo "Error: bc not found. Install with: brew install bc"
  exit 1
fi

if [ ! -d "$INPUT_DIR" ]; then
  echo "Error: Input directory '$INPUT_DIR' not found"
  exit 1
fi

WAV_COUNT=$(find "$INPUT_DIR" -name "*.wav" -maxdepth 1 | wc -l | tr -d ' ')
if [ "$WAV_COUNT" -eq 0 ]; then
  echo "Error: No .wav files found in '$INPUT_DIR'"
  exit 1
fi

# ─── Process ─────────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Ukulele Sample Processor                               ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Input:  $INPUT_DIR ($WAV_COUNT files)"
echo "║  Output: $OUTPUT_DIR"
echo "║  Target: peak ${TARGET_PEAK_DB}dB, MP3 ${MP3_BITRATE}"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

TOTAL_SIZE=0
PROCESSED=0

for wav in "$INPUT_DIR"/*.wav; do
  basename=$(basename "$wav" .wav)

  # Make filename URL-safe: replace '#' with 's'
  safe_name=$(echo "$basename" | sed 's/#/s/g')

  # Detect peak volume
  peak=$(ffmpeg -i "$wav" -af volumedetect -f null /dev/null 2>&1 \
    | grep max_volume \
    | sed 's/.*max_volume: //' \
    | sed 's/ dB//')

  # Calculate gain needed to reach target peak
  gain=$(echo "${TARGET_PEAK_DB} - (${peak})" | bc)

  # Get original duration for reporting
  orig_duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$wav")

  # Process:
  #   silenceremove  → trim leading silence, keep pre-attack
  #   volume         → peak normalize
  #   areverse+afade → fade out last N ms (reverse trick)
  #   libmp3lame     → MP3 encoding
  ffmpeg -y -i "$wav" \
    -af "silenceremove=start_periods=1:start_silence=${PRE_ATTACK_MS}:start_threshold=${SILENCE_THRESHOLD},volume=${gain}dB,areverse,afade=t=in:d=${FADE_OUT_SECS},areverse" \
    -c:a libmp3lame -b:a "$MP3_BITRATE" \
    "$OUTPUT_DIR/${safe_name}.mp3" 2>/dev/null

  # Report
  out_duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT_DIR/${safe_name}.mp3")
  out_size=$(stat -f%z "$OUTPUT_DIR/${safe_name}.mp3" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${safe_name}.mp3" 2>/dev/null)
  out_size_kb=$((out_size / 1024))
  TOTAL_SIZE=$((TOTAL_SIZE + out_size))
  PROCESSED=$((PROCESSED + 1))

  # Show rename if it happened
  rename_note=""
  if [ "$basename" != "$safe_name" ]; then
    rename_note=" (renamed from ${basename})"
  fi

  printf "  ✓ %-8s → %-10s | gain: %+6.1fdB | %.1fs → %.1fs | %dKB%s\n" \
    "$basename" "${safe_name}.mp3" "$gain" "$orig_duration" "$out_duration" "$out_size_kb" "$rename_note"
done

TOTAL_KB=$((TOTAL_SIZE / 1024))
echo ""
echo "Done! ${PROCESSED} samples processed, total size: ${TOTAL_KB}KB"
echo ""
echo "Sampler URL mapping for audioResource.ts:"
echo "  baseUrl: \${import.meta.env.BASE_URL}samples/ukulele/"
echo ""

for mp3 in "$OUTPUT_DIR"/*.mp3; do
  fname=$(basename "$mp3" .mp3)
  # Convert safe name back to note name for Tone.js key
  note_key=$(echo "$fname" | sed 's/s/#/g')
  # Only show the mapping if the names differ
  if [ "$note_key" != "$fname" ]; then
    echo "  '${note_key}': '${fname}.mp3',"
  else
    echo "  ${note_key}: '${fname}.mp3',"
  fi
done
