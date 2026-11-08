#!/usr/bin/env bash
# Fail if a model or WASM file differs from public/models/SHA256SUMS.
# Usage: model-hash-check.sh [folder]   (default: public/models)
set -euo pipefail
cd "$(dirname "$0")/.."
dir="${1:-public/models}"
[ -f "$dir/SHA256SUMS" ] || { echo "model-hash-check: FAIL, $dir/SHA256SUMS is missing"; exit 1; }
if (cd "$dir" && sha256sum --check --strict --quiet SHA256SUMS); then
  echo "model-hash-check: ok"
else
  echo "model-hash-check: FAIL, a file differs from SHA256SUMS"
  exit 1
fi
