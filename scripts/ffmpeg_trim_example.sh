#!/usr/bin/env bash
# Example only: trim a clip from a saved replay buffer file.
# Usage: ./ffmpeg_trim_example.sh input.mp4 00:01:12.000 00:01:45.000 output.mp4

set -euo pipefail
IN="$1"
START="$2"
END="$3"
OUT="$4"

# Re-encode for simplicity; for speed, you can keyframe-align and stream-copy when possible.
ffmpeg -y -i "$IN" -ss "$START" -to "$END" -c:v libx264 -c:a aac "$OUT"
