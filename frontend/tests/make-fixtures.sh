#!/usr/bin/env bash
# Builds the Y4M camera fixtures used by tests/proctoring.test.mjs.
#
# Chromium can be handed a Y4M file as its webcam
# (--use-file-for-fake-video-capture), which is the only way to prove the
# proctoring engine detects a real face rather than a stub.
#
# Requires: ffmpeg, curl
set -euo pipefail

OUT="${1:-$(dirname "$0")/fixtures}"
mkdir -p "$OUT"

SRC="$OUT/.source-face.jpg"
if [ ! -f "$SRC" ]; then
  echo "Fetching a test portrait…"
  curl -sL -o "$SRC" "https://storage.googleapis.com/mediapipe-assets/portrait.jpg"
fi

echo "one-face.y4m   — a single centred face"
ffmpeg -loglevel error -y -loop 1 -i "$SRC" -t 4 -r 15 \
  -vf "scale=640:480:force_original_aspect_ratio=increase,crop=640:480" \
  -pix_fmt yuv420p "$OUT/one-face.y4m"

echo "two-faces.y4m  — two people in frame (violation)"
ffmpeg -loglevel error -y -loop 1 -i "$SRC" -loop 1 -i "$SRC" -t 4 -r 15 \
  -filter_complex "[0:v]scale=320:480:force_original_aspect_ratio=increase,crop=320:480[l];\
[1:v]scale=320:480:force_original_aspect_ratio=increase,crop=320:480,hflip[r];\
[l][r]hstack=inputs=2,scale=640:480" \
  -pix_fmt yuv420p "$OUT/two-faces.y4m"

echo "no-face.y4m    — an empty room"
ffmpeg -loglevel error -y -f lavfi -i "color=c=0x7a6a5a:s=640x480:r=15:d=4" \
  -pix_fmt yuv420p "$OUT/no-face.y4m"

echo
echo "Fixtures written to $OUT (~26 MB each, git-ignored)."
