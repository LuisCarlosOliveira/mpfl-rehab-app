#!/usr/bin/env bash
# Converts a video clip into a file that Chromium reads as a fake webcam (Method B of docs/clip-analysis.md).
# Usage: bash scripts/clip-to-webcam.sh <clip> [<out folder>]
# Output: <out folder>/<clip name>.mjpeg, 30 fps, long side at most 640 px, no sound.
# Set FORMAT=y4m for a y4m file. It is much larger. Set WIDTH to change the long side.
# The script writes no frame to the repository. The default out folder is `.clip-out/webcam` in the current folder. Git ignores `.clip-out/`.
set -euo pipefail

clip="${1:-}"
out="${2:-.clip-out/webcam}"
format="${FORMAT:-mjpeg}"
long_side="${WIDTH:-640}"

if [[ -z "$clip" || ! -f "$clip" ]]; then
  echo "Usage: bash scripts/clip-to-webcam.sh <clip> [<out folder>]" >&2
  exit 2
fi
case "$format" in mjpeg | y4m) ;; *) echo "FORMAT must be mjpeg or y4m, not $format." >&2; exit 2 ;; esac

mkdir -p "$out"
name="$(basename "${clip%.*}")"
target="$out/$name.$format"

# ffmpeg turns a rotated clip upright by itself. The scale keeps the picture shape and makes both sides even.
scale="scale=w='if(gt(iw,ih),min($long_side,iw),-2)':h='if(gt(iw,ih),-2,min($long_side,ih))'"
if [[ "$format" == "mjpeg" ]]; then
  codec=(-c:v mjpeg -q:v 3 -pix_fmt yuvj420p -f mjpeg)
else
  codec=(-pix_fmt yuv420p -f yuv4mpegpipe)
fi
ffmpeg -v error -y -i "$clip" -an -vf "$scale" -r 30 "${codec[@]}" "$target"

echo "Written: $target"
echo "Playwright launch args:"
echo "  --use-fake-device-for-media-stream"
echo "  --use-fake-ui-for-media-stream"
echo "  --use-file-for-fake-video-capture=$target"
