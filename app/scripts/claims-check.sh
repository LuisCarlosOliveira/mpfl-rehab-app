#!/usr/bin/env bash
# Fail if the given paths hold a banned claim or a banned API.
# Usage: claims-check.sh <file-or-folder> [...]   (default: the src folder of the app)
# A path that does not exist is an error (exit 2). A line that ends with the marker
# "claims-check:allow" is skipped.
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
paths=("$@")
[ ${#paths[@]} -eq 0 ] && paths=("$root/src")

for p in "${paths[@]}"; do
  if [ ! -e "$p" ]; then
    echo "claims-check: path not found: $p" >&2
    exit 2
  fi
done

phrases='clinically (validated|proven)|medically accurate|goal (reached|achieved|met)|milestone|you (passed|failed)|cleared to (run|jump|progress|return)|ready to progress|(correct|incorrect|good|bad|perfect) form|\bLSI\b'
apis='MediaRecorder|toBlob|toDataURL|ImageCapture|createImageBitmap|OffscreenCanvas|navigator\.share|sendBeacon|WebSocket|dangerouslySetInnerHTML|\beval\('

hits=0
for pattern in "$phrases" "$apis"; do
  found=$(grep -rniE --include='*.ts' --include='*.tsx' --include='*.json' --include='*.html' -e "$pattern" "${paths[@]}" 2>/dev/null | grep -v 'claims-check:allow' || true)
  if [ -n "$found" ]; then
    echo "$found"
    hits=1
  fi
done

# Pixel read: getImageData is banned in every file except pairing/qrReader.ts (relative to a
# given folder, or the file itself). There it is allowed on ONE line, and that line must end
# with the marker. A marker anywhere else does not help. Any other line that names it fails.
reader_ok() {
  local f="$1" p
  for p in "${paths[@]}"; do
    p="${p%/}"
    [ "$f" = "$p/pairing/qrReader.ts" ] && return 0
    [ "$f" = "$p" ] && [[ "$f" == */pairing/qrReader.ts ]] && return 0
  done
  return 1
}
allowed_lines=0
while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  file="${hit%%:*}"
  rest="${hit#*:}"; text="${rest#*:}"
  if reader_ok "$file" && [[ "$text" == *claims-check:allow ]] && [ "$allowed_lines" -eq 0 ]; then
    allowed_lines=1
    continue
  fi
  echo "$hit"
  hits=1
done < <(grep -rHniE --include='*.ts' --include='*.tsx' --include='*.json' --include='*.html' -e 'getImageData' "${paths[@]}" 2>/dev/null)

# Patient text: the word ban applies to the files that hold text a patient reads:
# any file under a ui folder, cues.ts, redflags.ts and camera.ts.
words='correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone'
# The file list is read with NUL separators, so a path with a space stays one word.
found=$(find "${paths[@]}" -type f \( -name '*.ts' -o -name '*.tsx' \) \( -path '*/ui/*' -o -name 'cues.ts' -o -name 'redflags.ts' -o -name 'camera.ts' \) -print0 2>/dev/null \
  | xargs -0 -r grep -HniwE -e "$words" -e 'risk of injury' 2>/dev/null | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi

if [ "$hits" -ne 0 ]; then
  echo "claims-check: FAIL"
  exit 1
fi
echo "claims-check: ok"
