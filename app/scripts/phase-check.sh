#!/usr/bin/env bash
# FR4: only the protocol folder may touch the active phase.
# Fails if code outside src/lib/protocol/ calls setActivePhase, assigns activePhase,
# or copies a value into it with Object.assign.
# Usage: phase-check.sh [folder]   (default: the src folder of the app)
# A path that does not exist is an error (exit 2).
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
target="${1:-$root/src}"

if [ ! -e "$target" ]; then
  echo "phase-check: path not found: $target" >&2
  exit 2
fi

found=$(grep -rnE --include='*.ts' --include='*.tsx' \
  -e 'setActivePhase' \
  -e '\bactivePhase[[:space:]]*(=[^=>]|\+=|-=|\+\+|--)' \
  -e 'Object\.assign\([^)]*activePhase' \
  "$target" 2>/dev/null | grep -v '/lib/protocol/' | grep -v 'claims-check:allow' || true)

if [ -n "$found" ]; then
  echo "$found"
  echo "phase-check: FAIL"
  exit 1
fi
echo "phase-check: ok"
