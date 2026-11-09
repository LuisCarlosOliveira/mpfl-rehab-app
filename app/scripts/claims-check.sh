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
apis='MediaRecorder|toBlob|toDataURL|ImageCapture|OffscreenCanvas|navigator\.share|sendBeacon|WebSocket|dangerouslySetInnerHTML|\beval\(|captureStream|\bVideoFrame\b|MediaStreamTrackProcessor|MediaStreamTrackGenerator'

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
# Frame picture (T-W, the pose Web Worker): createImageBitmap is banned in every file except pose/frameBridge.ts,
# with the same rule: ONE line, with the marker. The worker file never names it. It gets the picture as a message.
# at_path <file> <relative path>: true if the file is that path under a given folder, or is the given file itself.
at_path() {
  local f="$1" rel="$2" p
  for p in "${paths[@]}"; do
    p="${p%/}"
    [ "$f" = "$p/$rel" ] && return 0
    [ "$f" = "$p" ] && [[ "$f" == */$rel ]] && return 0
  done
  return 1
}
reader_ok() { at_path "$1" pairing/qrReader.ts; }
# one_line_only <api> <relative path of the one allowed file>
one_line_only() {
  local api="$1" rel="$2" allowed_lines=0 hit file rest text
  while IFS= read -r hit; do
    [ -z "$hit" ] && continue
    file="${hit%%:*}"
    rest="${hit#*:}"; text="${rest#*:}"
    if at_path "$file" "$rel" && [[ "$text" == *claims-check:allow ]] && [ "$allowed_lines" -eq 0 ]; then
      allowed_lines=1
      continue
    fi
    echo "$hit"
    hits=1
  done < <(grep -rHniE --include='*.ts' --include='*.tsx' --include='*.json' --include='*.html' -e "$api" "${paths[@]}" 2>/dev/null)
}
one_line_only 'getImageData' pairing/qrReader.ts
one_line_only 'createImageBitmap' pose/frameBridge.ts

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
praise='great|nice|well done|well-done|excellent|awesome|congratulations|success|successful|improve|improving|improved|worse|worsening|healing|recovered|recovery|proud|fantastic|amazing|brilliant|superb|impressive|keep it up|you did it|way to go|healed'
# The file list is read with NUL separators, so a path with a space stays one word.
# F5a: each file is read two ways. First as it is. Second with every string that is built from two quoted parts
# ('Well ' + 'done') or from the parts of a join('') joined into one text. A quoted fragment that a variable joins stays unseen.
# A line that ends with the allow marker is left out in both reads.
patient_scan() {
  local re="$1" f out
  while IFS= read -r -d '' f; do
    out=$(grep -HniwE -e "$re" -e 'risk of injury' "$f" 2>/dev/null | grep -v 'claims-check:allow' || true)
    [ -n "$out" ] && { echo "$out"; hits=1; }
    out=$(grep -v 'claims-check:allow' "$f" | tr '\n' ' ' | sed -E "s/['\"\`][[:space:]]*\+[[:space:]]*['\"\`]//g; s/\\$\{[^}]*\}//g" \
      | { if grep -qE "join\(['\"\`]{2}\)" "$f"; then sed -E "s/['\"\`][[:space:]]*,[[:space:]]*['\"\`]//g"; else cat; fi; } \
      | grep -oiwE -e "$re" | head -n 1 || true)
    [ -n "$out" ] && { echo "$f: joined text holds the word: $out"; hits=1; }
  done
  return 0
}
patient_scan "$words|$praise" < <(find "${paths[@]}" -type f \( -name '*.ts' -o -name '*.tsx' \) \( -path '*/ui/*' -o -name 'cues.ts' -o -name 'redflags.ts' -o -name 'camera.ts' \) -print0 2>/dev/null)
# These lib files hold patient text too. The praise words apply. The verdict list does not, because they hold code names such as
# Grade and comments with the word goal. protocolGen/sources.ts and rules.ts are not in the list: they quote clinical sources.
patient_scan "$praise" < <(find "${paths[@]}" -type f \( -name 'sets.ts' -o -name 'guides.ts' -o -name 'planView.ts' -o -name 'onboarding.ts' -o -name 'setupView.ts' \
  -o -name 'setupRules.ts' -o -name 'figure.ts' -o -name 'reviewSummary.ts' -o -name 'contactCard.ts' -o -name 'askSurgeon.ts' \) -print0 2>/dev/null)

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

# F5a: no colour in a lib .ts file. A colour name or a literal colour value in a quoted string, or a colour property with a quoted
# value that is not a CSS variable, could reach a screen through a spread. figure.ts is included: it must use CSS variable names only.
# A colour in a .css file is allowed, except as a literal fallback in var(): it would show when the token is missing.
found=$(find "${paths[@]}" -type f -name '*.ts' -path '*/lib/*' -print0 2>/dev/null \
  | xargs -0 -r grep -HniE -e '(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)[[:space:]]*\(' \
      -e "#[0-9a-fA-F]{3,8}([^[:alnum:]_-]|$)" -e "['\"\`]($names)['\"\`]" \
      -e "(color|background|backgroundColor|fill|stroke|borderColor|outline)['\"\`]?[[:space:]]*:[[:space:]]*['\"\`][^'\"\`]" 2>/dev/null \
  | grep -vE "(color|background|backgroundColor|fill|stroke|borderColor|outline)['\"\`]?[[:space:]]*:[[:space:]]*['\"\`](var\(--|currentColor|none|transparent|inherit)" \
  | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi
colour_value="#[0-9a-fA-F]{3,8}([^[:alnum:]_-]|$)|(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|hwb)[[:space:]]*\\(|($names)([^[:alnum:]_-]|$)"
found=$(find "${paths[@]}" -type f \( -name '*.css' -o -name '*.ts' -o -name '*.tsx' \) -print0 2>/dev/null \
  | xargs -0 -r grep -HniE "var\([[:space:]]*--[[:alnum:]_-]+[[:space:]]*,[[:space:]]*($colour_value)" 2>/dev/null \
  | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi

# F5a: a STUN or TURN server, and an ICE server list that is not empty. The data channel needs none (pairing/rtcLink.ts uses
# iceServers: []). Only the exact empty list passes. A list that a variable fills is flagged too.
found=$(grep -rniE --include='*.ts' --include='*.tsx' -e "['\"\`](stuns?|turns?):" -e 'iceServers' "${paths[@]}" 2>/dev/null \
  | grep -vE 'iceServers[[:space:]]*:[[:space:]]*\[[[:space:]]*\]' | grep -v 'claims-check:allow' || true)
if [ -n "$found" ]; then
  echo "$found"
  hits=1
fi

if [ "$hits" -ne 0 ]; then
  echo "claims-check: FAIL"
  exit 1
fi
echo "claims-check: ok"
