#!/usr/bin/env bash
# Render 05_motion with Remotion → 06_render/raw.mp4, then loudness-normalise → final.mp4, plus captions.srt
set -euo pipefail
PROJ="$(cd "$1" && pwd)"; S="$(cd "$(dirname "$0")" && pwd)"
python3 "$S/setup_motion.py" "$PROJ"
mkdir -p "$PROJ/06_render"
cd "$PROJ/05_motion"
[ -d node_modules ] || npm install --no-audit --no-fund
# Use a local Chrome if REMOTION_BROWSER is set (for sandboxes that can't download Remotion's)
BROWSER_FLAG=""; [ -n "${REMOTION_BROWSER:-}" ] && BROWSER_FLAG="--browser-executable=$REMOTION_BROWSER"
npx remotion render src/index.ts Main "$PROJ/06_render/raw.mp4" --codec=h264 --crf=18 $BROWSER_FLAG ${REMOTION_FLAGS:-}
ffmpeg -y -loglevel error -i "$PROJ/06_render/raw.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k "$PROJ/06_render/final.mp4"
python3 "$S/export_srt.py" "$PROJ"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$PROJ/06_render/final.mp4" | xargs -I{} echo "final.mp4 ready ({}s)"
