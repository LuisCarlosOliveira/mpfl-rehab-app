#!/usr/bin/env bash
# FR4: only the protocol folder may touch the active phase.
# Fails if code outside src/lib/protocol/ calls setActivePhase, writes to a member
# named activePhase (any value, with or without spaces), assigns a bare activePhase
# variable, or copies a value into it with Object.assign.
# A React prop such as activePhase={store.activePhase} only passes a value to a screen.
# It is not a write and it passes.
# T23b: the save path of a plan that the app made has one place (acceptProposal in src/lib/protocol/accept.ts).
# Also fails on: an object key `activePhase: value` outside src/lib/protocol/ and src/lib/protocolGen/generate.ts,
# a storage import or a browser storage use inside src/lib/protocolGen/, a call of acceptProposal or confirmByPerson
# outside accept.ts and src/ui/ConfirmPlan.tsx, a call of saveProtocol outside storage/db.ts, protocol/accept.ts and
# ui/LoadProtocol.tsx (and in LoadProtocol.tsx when the file uses the generator), and a write to db.protocol outside storage/db.ts.
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
  -e '\.activePhase[[:space:]]*(=[^=]|\+=|-=|\+\+|--)' \
  -e '\[[^]]*activePhase[^]]*\][[:space:]]*(=[^=]|\+=|-=)' \
  -e '(^|[^.[:alnum:]_])activePhase[[:space:]]*(=[^={>]|\+=|-=|\+\+|--)' \
  -e 'Object\.assign\([^)]*activePhase' \
  "$target" 2>/dev/null | grep -v '/lib/protocol/' | grep -v 'claims-check:allow' || true)

# The scan below gives lines of the form "path:line:text". The allow lists are the grep -v filters.
scan() { grep -rnHE --include='*.ts' --include='*.tsx' "$@" "$target" 2>/dev/null | grep -v 'claims-check:allow' || true; }
add() { [ -n "$1" ] && found="$found"$'\n'"$1"; return 0; }

add "$(scan -e 'activePhase[[:space:]]*:[^;]*[,}]' \
  | grep -v '/lib/protocol/' | grep -Ev '/lib/protocolGen/generate\.ts:[0-9]+:')"

add "$(scan -e "(import|from|require)[^'\"]*['\"][^'\"]*(storage|dexie|protocol/accept)" \
  -e 'localStorage|sessionStorage|indexedDB' | grep -E '/lib/protocolGen/[^:]*:[0-9]+:')"

add "$(scan -e 'acceptProposal[[:space:]]*\(' | grep -Ev '/lib/protocol/accept\.ts:[0-9]+:|/ui/ConfirmPlan\.tsx:[0-9]+:')"
add "$(scan -e 'confirmByPerson[[:space:]]*\(' | grep -Ev '/lib/protocol/accept\.ts:[0-9]+:|/ui/ConfirmPlan\.tsx:[0-9]+:')"

add "$(scan -e '\.protocol\.(put|add|update|bulkPut|bulkAdd|set|delete|clear)[[:space:]]*\(' | grep -Ev '/lib/storage/db\.ts:[0-9]+:')"

# saveProtocol: only the storage file defines it, accept.ts saves a plan, and LoadProtocol.tsx saves a file.
# LoadProtocol.tsx must not also use the generator.
save_files=$(grep -rlE --include='*.ts' --include='*.tsx' 'saveProtocol[[:space:]]*\(' "$target" 2>/dev/null || true)
for f in $save_files; do
  case "$f" in
    */lib/storage/db.ts | */lib/protocol/accept.ts) ;;
    */ui/LoadProtocol.tsx)
      if grep -qE 'protocolGen|generateProtocol|GENERATED_BY|\.generated\b|generated[[:space:]]*:' "$f"; then
        add "$f: saveProtocol is called in a file that uses a generated protocol. Use acceptProposal."
      fi ;;
    *) add "$f: saveProtocol is called outside the allowed files. Use acceptProposal for a generated protocol." ;;
  esac
done

found=$(printf '%s\n' "$found" | sed '/^$/d')

if [ -n "$found" ]; then
  echo "$found"
  echo "phase-check: FAIL"
  exit 1
fi
echo "phase-check: ok"
