#!/usr/bin/env bash
# Fail if a model or WASM file differs from public/models/SHA256SUMS.
# Also fail on: a symlink, a file that SHA256SUMS does not list, and a listed name that is not a file here.
# With the default folder, every line of SHA256SUMS must also appear in ../docs/model.md.
# With another folder (for example dist/models after the build), its SHA256SUMS must also equal public/models/SHA256SUMS.
# Usage: model-hash-check.sh [folder]   (default: public/models)
set -euo pipefail
cd "$(dirname "$0")/.."
dir="${1:-public/models}"
fail() { echo "model-hash-check: FAIL, $1"; exit 1; }
[ -f "$dir/SHA256SUMS" ] || fail "$dir/SHA256SUMS is missing"

if [ "$#" -gt 0 ]; then
  cmp -s "$dir/SHA256SUMS" public/models/SHA256SUMS || fail "$dir/SHA256SUMS differs from public/models/SHA256SUMS"
fi

[ -z "$(find "$dir" -type l)" ] || fail "a symlink is in $dir"

if ! (cd "$dir" && sha256sum --check --strict --quiet SHA256SUMS); then
  fail "a file differs from SHA256SUMS"
fi

# The listed names and the files on disk must be the same set.
listed="$(sed -E 's/^[0-9a-f]{64} [ *]//' "$dir/SHA256SUMS" | LC_ALL=C sort)"
found="$(cd "$dir" && find . -type f ! -name SHA256SUMS | sed 's|^\./||' | LC_ALL=C sort)"
[ "$listed" = "$found" ] || fail "the files in $dir do not match the names in SHA256SUMS"

if [ "$#" -eq 0 ]; then
  while IFS= read -r line; do
    grep -qF -- "$line" ../docs/model.md || fail "a line of SHA256SUMS is not in docs/model.md"
  done < "$dir/SHA256SUMS"
fi
echo "model-hash-check: ok"
