#!/usr/bin/env bash
# Fail if the given paths hold a banned claim or a banned API.
# Usage: claims-check.sh <file-or-folder> [...]   (default: src)
# A line that ends with the marker "claims-check:allow" is skipped.
set -u
cd "$(dirname "$0")/.."
paths=("$@")
[ ${#paths[@]} -eq 0 ] && paths=(src)

phrases='clinically (validated|proven)|medically accurate|goal (reached|achieved|met)|milestone|you (passed|failed)|cleared to (run|jump|progress|return)|ready to progress|(correct|incorrect|good|bad|perfect) form|\bLSI\b'
apis='MediaRecorder|toBlob|toDataURL|ImageCapture|dangerouslySetInnerHTML|\beval\('

hits=0
for pattern in "$phrases" "$apis"; do
  found=$(grep -rniE --include='*.ts' --include='*.tsx' --include='*.json' --include='*.html' -e "$pattern" "${paths[@]}" 2>/dev/null | grep -v 'claims-check:allow' || true)
  if [ -n "$found" ]; then
    echo "$found"
    hits=1
  fi
done

if [ "$hits" -ne 0 ]; then
  echo "claims-check: FAIL"
  exit 1
fi
echo "claims-check: ok"
