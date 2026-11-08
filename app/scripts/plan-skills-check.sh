#!/usr/bin/env bash
# Skill use is mandatory (user decision, 2026-11-08) and must be recorded.
# Fails if a task of the plan has a finished Result line (starting "DONE" or "BLOCKED")
# and no "Skills used:" text in the same task. A task is the text from one "### T" heading
# to the next. The check proves that the record exists. It cannot prove that a skill ran.
# Usage: plan-skills-check.sh [plan-file]   (default: MPFL_APP_PLAN.md at the repo root)
# A plan file that does not exist is an error (exit 2).
set -u
root="$(cd "$(dirname "$0")/../.." && pwd)"
plan="${1:-$root/MPFL_APP_PLAN.md}"

if [ ! -f "$plan" ]; then
  echo "plan-skills-check: plan not found: $plan" >&2
  exit 2
fi

missing=$(awk '
  function flush() {
    if (task != "" && finished && !recorded) print task
  }
  /^### T[0-9]/ { flush(); task=$0; finished=0; recorded=0; next }
  /^## / { flush(); task=""; next }
  /^- Result: (DONE|BLOCKED)/ { finished=1 }
  /Skills used:/ { recorded=1 }
  END { flush() }
' "$plan")

if [ -n "$missing" ]; then
  echo "$missing"
  echo "plan-skills-check: FAIL (each finished task needs a Skills used: record)"
  exit 1
fi
echo "plan-skills-check: ok"
