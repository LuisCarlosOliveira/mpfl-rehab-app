#!/usr/bin/env bash
# FR4: only the protocol folder may touch the active phase.
# Fails if code outside src/lib/protocol/ calls setActivePhase or assigns activePhase.
# Usage: phase-check.sh [folder]   (default: src)
set -u
cd "$(dirname "$0")/.."
root="${1:-src}"

found=$(grep -rnE --include='*.ts' --include='*.tsx' \
  -e 'setActivePhase' \
  -e '\bactivePhase[[:space:]]*(=[^=>]|\+=|-=|\+\+|--)' \
  "$root" 2>/dev/null | grep -v '/lib/protocol/' | grep -v 'claims-check:allow' || true)

if [ -n "$found" ]; then
  echo "$found"
  echo "phase-check: FAIL"
  exit 1
fi
echo "phase-check: ok"
