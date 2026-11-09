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
# F4b: also fails on an alias of acceptProposal, confirmByPerson or saveProtocol (import as, a destructure rename or a quoted member
# name), a string table name (.table( or ['protocol']) outside storage/db.ts, a build of the text activePhase from string parts, and the
# quoted text activePhase or a replace or JSON.parse line with activePhase outside src/lib/protocol/ and protocolGen/generate.ts.
# F5a: also fails on a key built with fromCharCode, a table kept in a variable (const t = db.protocol), a destructured or bare
# protocol table (const { protocol } = db, protocol.put(), only in a file that is not storage/db.ts), db.tables, a raw indexedDB or
# Dexie use outside storage/db.ts, and a call that is split over two lines (acceptProposal, confirmByPerson, saveProtocol, and a
# table method after a line break). The split call is found by joining each file into one line before the match.
# HONEST LIMIT: this is a pattern match. No line of the source matches the patterns of this script. The check cannot prove that no
# other code path exists. Runtime tests cover the real save path (tests/protocolAccept.test.ts and tests/importGraph.test.ts).
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

# F4b bypass patterns. Alias names of the three save functions are banned outside the files that may call them.
names='acceptProposal|confirmByPerson|saveProtocol'
add "$(scan -e "(^|[^[:alnum:]_])($names)[[:space:]]+as[[:space:]]" \
  -e "(^|[^[:alnum:]_])($names)[[:space:]]*:[[:space:]]*[[:alpha:]_]" \
  -e "\\[[[:space:]]*['\"\`]($names)['\"\`]" \
  | grep -Ev '/lib/protocol/accept\.ts:[0-9]+:|/ui/ConfirmPlan\.tsx:[0-9]+:|/lib/storage/db\.ts:[0-9]+:|/ui/LoadProtocol\.tsx:[0-9]+:')"
# String table access and a bracket access of the protocol table.
add "$(scan -e '\.table[[:space:]]*\(' -e "\\[[[:space:]]*['\"\`]protocol['\"\`][[:space:]]*\\]" | grep -Ev '/lib/storage/db\.ts:[0-9]+:')"
# The text activePhase built from parts, or named in a string that is parsed or replaced.
add "$(scan -e "['\"\`]active['\"\`][[:space:]]*(\+|,[[:space:]]*['\"\`]Phase['\"\`])" \
  -e "\+[[:space:]]*['\"\`]Phase['\"\`]" \
  -e '`active\$\{' -e '\}Phase`' \
  -e "['\"\`]activePhase['\"\`]" \
  -e '(replace|replaceAll|JSON\.parse)[[:space:]]*\(.*activePhase' -e 'activePhase.*(replace|replaceAll|JSON\.parse)[[:space:]]*\(' \
  | grep -v '/lib/protocol/' | grep -Ev '/lib/protocolGen/generate\.ts:[0-9]+:')"

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

# F5a: more save paths. A text pattern on one line of source.
not_db='/lib/storage/db\.ts:[0-9]+:'
add "$(scan -e 'fromCharCode' | grep -Ev '/lib/pairing/payload\.ts:[0-9]+:')"
# A table kept in a variable or passed as a value: x.protocol followed by the end of a statement or an argument list.
add "$(scan -e '(=|\(|,|return)[[:space:]]*([[:alnum:]_?!]+\.)*([[:alnum:]_]*[dD][bB]|store|dexie)\.protocol[[:space:]]*($|[;,)])' | grep -Ev "$not_db")"
# A destructured protocol table, a destructured parameter and a bare write to a table named protocol.
add "$(scan -e 'const[[:space:]]*\{[^}]*(^|[^[:alnum:]_])protocol[^}]*\}[[:space:]]*=[[:space:]]*([[:alnum:]_]+\.)*([[:alnum:]_]*[dD][bB]|store|dexie)[[:space:]]*(;|$)' \
  -e '(^|[^.[:alnum:]_])protocol\.(put|add|update|bulkPut|bulkAdd|set|delete|clear)[[:space:]]*\(' | grep -Ev "$not_db")"
add "$(scan -e '\.tables([^[:alnum:]_]|$)' | grep -Ev "$not_db")"
add "$(scan -e 'indexedDB' -e 'new[[:space:]]+Dexie' -e "from[[:space:]]+['\"]dexie['\"]" -e "require\([[:space:]]*['\"]dexie['\"]" | grep -Ev "$not_db")"

# F5a: a call that is split over two lines. Each file is read as one line, so a line break before ( or . does not hide the call.
# The path list uses NUL separators. A file is named once for each rule that it breaks.
joined_scan() {
  local re="$1" msg="$2" skip="$3" f
  while IFS= read -r -d '' f; do
    if [ -n "$skip" ] && printf '%s' "$f" | grep -Eq "$skip"; then continue; fi
    if grep -v 'claims-check:allow' "$f" | tr '\n' ' ' | grep -qE -e "$re"; then add "$f: $msg"; fi
  done < <(find "$target" -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 2>/dev/null)
}
joined_scan 'acceptProposal[[:space:]]*\(' 'acceptProposal is called outside accept.ts and ConfirmPlan.tsx (joined lines).' '/lib/protocol/accept\.ts$|/ui/ConfirmPlan\.tsx$'
joined_scan 'confirmByPerson[[:space:]]*\(' 'confirmByPerson is called outside accept.ts and ConfirmPlan.tsx (joined lines).' '/lib/protocol/accept\.ts$|/ui/ConfirmPlan\.tsx$'
joined_scan 'saveProtocol[[:space:]]*\(' 'saveProtocol is called outside the allowed files (joined lines).' '/lib/storage/db\.ts$|/lib/protocol/accept\.ts$|/ui/LoadProtocol\.tsx$'
joined_scan '\.protocol[[:space:]]*\.[[:space:]]*(put|add|update|bulkPut|bulkAdd|set|delete|clear)[[:space:]]*\(' 'A write to the protocol table is outside storage/db.ts (joined lines).' '/lib/storage/db\.ts$'

found=$(printf '%s\n' "$found" | sed '/^$/d')

if [ -n "$found" ]; then
  echo "$found"
  echo "phase-check: FAIL"
  exit 1
fi
echo "phase-check: ok"
