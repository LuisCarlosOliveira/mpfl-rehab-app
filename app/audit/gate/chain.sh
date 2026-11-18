#!/usr/bin/env bash
# Verification gate. It runs the checks in one chain and writes one status line for each step.
# Usage: bash audit/gate/chain.sh
# Environment: APP_DIR (app folder, default: two folders up), OUT (result folder, default: a temp folder),
#              PORT (preview port, default 4660), SKIP (steps to leave out, for example SKIP="precheck e2e").
# Steps: selftest precheck build size e2e a11y sec honesty src
# The build goes to $OUT/dist. The repo gets no build output.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$HERE/../.." && pwd)}"
OUT="${OUT:-${TMPDIR:-/tmp}/mpfl-gate}"
PORT="${PORT:-4660}"
SKIP="${SKIP:-}"
AUDIT="$APP_DIR/audit"
DIST="$OUT/dist"
mkdir -p "$OUT"
: > "$OUT/status.txt"
cd "$APP_DIR" || exit 9
want() { case " $SKIP " in *" $1 "*) return 1 ;; *) return 0 ;; esac; }
say() { echo "$*" >> "$OUT/status.txt"; }

if want selftest; then
  APP_ROOT="$APP_DIR" node "$AUDIT/honesty/honesty-audit.mjs" --selftest > "$OUT/selftest.log" 2>&1; say "selftest=$?"
  tail -1 "$OUT/selftest.log" >> "$OUT/status.txt"
fi
if want precheck; then
  npm run precheck > "$OUT/precheck.log" 2>&1; r=$?; say "precheck=$r"
  grep -E "Test Files|Tests " "$OUT/precheck.log" | tail -2 >> "$OUT/status.txt"
  [ $r -eq 0 ] || { say stop; exit 1; }
fi
if want build; then
  npm run build -- --outDir "$DIST" --emptyOutDir > "$OUT/build.log" 2>&1; r=$?; say "build=$r"
  [ $r -eq 0 ] || exit 1
fi
if want size; then
  node "$AUDIT/gate/first-load.mjs" "$DIST" >> "$OUT/status.txt"
fi
if want e2e; then
  flock /tmp/mpfl-e2e.lock npm run e2e -- --timeout=90000 > "$OUT/e2e.log" 2>&1; say "e2e=$?"
  tail -6 "$OUT/e2e.log" >> "$OUT/status.txt"
fi

PID=""
if want a11y || want sec || want honesty; then
  node "$APP_DIR/node_modules/vite/bin/vite.js" preview --outDir "$DIST" --host 127.0.0.1 --port "$PORT" --strictPort > "$OUT/preview.log" 2>&1 &
  PID=$!
  trap '[ -z "$PID" ] || kill "$PID" 2>/dev/null' EXIT
  for _ in $(seq 1 30); do curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 1; done
  say "preview_pid=$PID port=$PORT"
fi
U="http://127.0.0.1:$PORT"
if want a11y; then
  APP_DIR="$APP_DIR" BASE_URL="$U" LABEL=gate OUT="$OUT/a11y" node "$AUDIT/a11y/audit.mjs" > "$OUT/a11y.log" 2>&1; say "a11y=$?"
fi
if want sec; then
  PW_ROOT="$APP_DIR" BASE_URL="$U" OUT="$OUT/hostile-result.json" node "$AUDIT/sec/hostile.mjs" > "$OUT/sec.log" 2>&1; say "sec=$?"
fi
if want honesty; then
  APP_ROOT="$APP_DIR" node "$AUDIT/honesty/honesty-audit.mjs" "$U" --theme both --src "$APP_DIR/src" --out "$OUT/honesty-out" > "$OUT/honesty.log" 2>&1; say "honesty=$?"
fi
if [ -n "$PID" ]; then
  kill "$PID" 2>/dev/null; PID=""
  for _ in 1 2 3 4 5; do ss -ltn | grep -q ":$PORT " || break; sleep 1; done
  say "port_open_after=$(ss -ltn | grep -c ":$PORT ")"
fi
if want src; then
  bash "$AUDIT/gate/source-checks.sh" "$APP_DIR" > "$OUT/src.log" 2>&1; say "src=$?"
fi
say done
