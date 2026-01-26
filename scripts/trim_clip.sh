#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/trim_clip.sh <input.mp4> <start_seconds> <end_seconds> <output.mp4>

IN="$1"
START="$2"
END="$3"
OUT="$4"

DUR=$(python - <<PY
s=float("$START"); e=float("$END"); print(max(0.01, e-s))
PY
)

# Re-encode to avoid keyframe issues in MVP.
ffmpeg -y -i "$IN" -ss "$START" -t "$DUR" "$OUT"
