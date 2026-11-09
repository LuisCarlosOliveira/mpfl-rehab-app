#!/usr/bin/env bash
# Fail if the given paths hold a banned claim or a banned API.
# Usage: claims-check.sh <file-or-folder> [...]   (default: the src folder of the app)
# A path that does not exist is an error (exit 2). A line that ends with the marker
# "claims-check:allow" is skipped.
# HONEST LIMIT: this is a pattern match. No line of the source matches the patterns of this script.
# The check cannot prove that no other banned text exists, for example a verdict that uses a word
# that is not on the lists. Runtime tests cover the real screens (tests/ui/noVerdict*, tests/ui/styles.test.ts).
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

# Frame drawing: a canvas, getContext and drawImage are banned in every file except
# pairing/qrReader.ts. A screen (the body map for example) draws from landmark numbers as SVG and
# never draws a frame. The marker does not help outside the reader.
while IFS= read -r hit; do
  [ -z "$hit" ] && continue
  file="${hit%%:*}"
  if reader_ok "$file"; then continue; fi
  echo "$hit"
  hits=1
done < <(grep -rHniE --include='*.ts' --include='*.tsx' --include='*.html' -e 'drawImage' -e "createElement\(['\"]canvas" -e '<canvas' -e 'getContext\(' "${paths[@]}" 2>/dev/null)

# Patient text: the word ban applies to the files that hold text a patient reads:
# any file under a ui folder, cues.ts, redflags.ts and camera.ts.
# F4b: the praise and outcome words apply to the old files and also to sets.ts, guides.ts, planView.ts,
# onboarding.ts and setupView.ts, which hold patient text too. Those five files have code names such as
# Grade and comments with the word goal, so the older verdict list does not apply to them.
words='correct|incorrect|good|bad|perfect|wrong|mistake|safe|dangerous|score|grade|pass|fail|goal|milestone'
praise='great|nice|well done|excellent|awesome|congratulations|success|successful|improve|improving|improved|worse|worsening|healing|recovered|recovery'
# The file list is read with NUL separators, so a path with a space stays one word.
found=$(find "${paths[@]}" -type f \( -name '*.ts' -o -name '*.tsx' \) \( -path '*/ui/*' -o -name 'cues.ts' -o -name 'redflags.ts' -o -name 'camera.ts' \) -print0 2>/dev/null \
  | xargs -0 -r grep -HniwE -e "$words|$praise" -e 'risk of injury' 2>/dev/null | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi
found=$(find "${paths[@]}" -type f \( -name 'sets.ts' -o -name 'guides.ts' -o -name 'planView.ts' -o -name 'onboarding.ts' -o -name 'setupView.ts' \) -print0 2>/dev/null \
  | xargs -0 -r grep -HniwE -e "$praise" 2>/dev/null | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi

# F4b: no colour in a screen file. A colour comes from the style sheet only (tests/ui/styles.test.ts checks its tokens).
# Banned in every .tsx file: a style attribute, a colour function, a hex colour and a colour name in a string.
# Banned in a .ts or .tsx file under a ui folder: a write to the style of an element.
names='red|green|blue|orange|yellow|purple|pink|teal|crimson|lime|gold|coral|olive|maroon|navy|cyan|magenta|brown|tomato|salmon|khaki|indigo|violet|turquoise|aqua|silver|gray|grey|black|white|limegreen|darkgreen|darkred|lightgreen'
found=$(find "${paths[@]}" -type f -name '*.tsx' -print0 2>/dev/null \
  | xargs -0 -r grep -HniE -e '(^|[^[:alnum:]_-])style[[:space:]]*=' -e '(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)[[:space:]]*\(' \
      -e "#[0-9a-fA-F]{3,8}([^[:alnum:]_-]|$)" -e "['\"\`]($names)['\"\`]" \
      -e "(color|background|fill|stroke)[[:space:]]*[:=][[:space:]]*['\"\`]?($names)([^[:alnum:]_-]|$)" 2>/dev/null \
  | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi
found=$(find "${paths[@]}" -type f \( -name '*.ts' -o -name '*.tsx' \) -path '*/ui/*' -print0 2>/dev/null \
  | xargs -0 -r grep -HniE -e '\.style\b' -e 'cssText' -e "setAttribute[[:space:]]*\([[:space:]]*['\"\`]style" 2>/dev/null \
  | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi

if [ "$hits" -ne 0 ]; then
  echo "claims-check: FAIL"
  exit 1
fi
echo "claims-check: ok"
