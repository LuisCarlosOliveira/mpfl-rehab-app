#!/usr/bin/env bash
# Fail if a tracked file holds a secret, a private key, a person e-mail address, a private IP address,
# a local user path, a file name that must not be tracked, or a file that is too large.
# The check reads the files that git tracks (git ls-files) in the whole repository, also when it runs from the app folder.
# Usage: secrets-check.sh [--repo <folder>]   check the repository that holds <folder> (default: the app folder)
#        secrets-check.sh --selftest          run every rule on built-in samples. Prints "secrets-check selftest: OK" if all pass.
# Exit codes: 0 clean, 1 finding, 2 usage error.
# A line that holds the marker "secrets-check:allow <reason>" is skipped. The reason is required. A bare marker does not work.
# The marker does not apply to the rule file-name and large-file (they have no line).
# Output: <file>:<line>: <kind>: <first 4 characters>****. The matched value is never printed in full.
# Skipped: binary files, package-lock.json, app/public/models/ (content and size, not the file name) and this script
# (its own patterns would match some rules).
# HONEST LIMIT: this is a pattern match. It finds the shapes in the rules. It cannot find a secret of another shape,
# a secret in a binary file, or a secret that is split over two lines. History is not scanned: only the tracked tree.
set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
self_rel="app/scripts/secrets-check.sh"
max_bytes=$((2 * 1024 * 1024))

# kind~case flag (i or -)~regex~exception regex on the matched text (empty = none)
rules=(
  'private-key~-~-----BEGIN ([A-Z0-9]+ )*PRIVATE KEY( BLOCK)?-----~'
  'aws-access-key~-~\b(AKIA|ASIA)[0-9A-Z]{16}\b~'
  'github-token~-~\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})~'
  'slack-token~-~xox[baprs]-[A-Za-z0-9-]{10,}~'
  'google-api-key~-~AIza[0-9A-Za-z_-]{35}~'
  'openai-key~-~\bsk-(ant-)?[A-Za-z0-9_-]{20,}~'
  'stripe-live-key~-~\b[sr]k_live_[0-9A-Za-z]{16,}~'
  'jwt~-~eyJ[A-Za-z0-9_-]{5,}\.eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*~'
  'atlassian-token~-~\bAT(ATT|CTT)[A-Za-z0-9_=-]{16,}~'
  'bitbucket-token~-~\bBBDC-[A-Za-z0-9]{16,}~'
  'tailscale-key~-~tskey-[A-Za-z0-9-]{10,}~'
  'npm-auth-token~-~_authToken=[^[:space:]$"'"'"']+~'
  'url-password~-~[A-Za-z][A-Za-z0-9+.-]*://[^/[:space:]:@"'"'"']+:[^/[:space:]@"'"'"']+@[^/[:space:]"'"'"']+~evil\.example'
  'generic-secret~i~(key|secret|token|password|passwd|bearer)[A-Za-z0-9_]*["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9+/=_-]{16,}["'"'"']~(example|placeholder|changeme|your[-_]|x{6,}|dummy|fake)'
  'email~-~[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b~^noreply@|@(example\.com|example\.org|evil\.example)$'
  'private-ip~-~(^|[^0-9.])(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3}|192\.168\.[0-9]{1,3}\.[0-9]{1,3}|100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3})([^0-9]|$)~'
  'local-path~-~(^|[^A-Za-z0-9._%/-])(/home/[A-Za-z0-9._-]+/|/Users/[A-Za-z0-9._-]+/|/mnt/[c]/)|[A-Za-z]:\\+Users\\+[A-Za-z0-9._-]+~'
)

mask() {
  local s="$1"
  s="${s#"${s%%[A-Za-z0-9]*}"}"
  printf '%s****' "${s:0:4}"
}

# scan <repo folder>: prints findings, returns 1 if any.
scan() {
  local top="$1" found=0 list file kind flag re exc line text m hit size base rule rest v
  list="$(mktemp)"
  git -C "$top" ls-files -z > "$list"

  # Rule 7: file names and size.
  while IFS= read -r -d '' file; do
    base="${file##*/}"
    case "$base" in
      .env|.env.*|*.pem|*.key|*.p12|*.pfx|*.har|*.sqlite|*.db|id_rsa*)
        echo "$file: file-name: a file with this name must not be tracked"; found=1 ;;
    esac
    [[ "$file" == app/public/models/* ]] && continue
    if [ -f "$top/$file" ]; then
      size=$(stat -c %s "$top/$file")
      if [ "$size" -gt "$max_bytes" ]; then
        echo "$file: large-file: $size bytes (limit $max_bytes)"; found=1
      fi
    fi
  done < "$list"

  # Content scan list: tracked, existing, not skipped.
  local clist
  clist="$(mktemp)"
  while IFS= read -r -d '' file; do
    base="${file##*/}"
    [ "$base" = "package-lock.json" ] && continue
    [[ "$file" == app/public/models/* ]] && continue
    [ "$file" = "$self_rel" ] && continue
    [ -f "$top/$file" ] || continue
    printf '%s\0' "$file" >> "$clist"
  done < "$list"

  for rule in "${rules[@]}"; do
    IFS='~' read -r kind flag re exc <<< "$rule"
    local gflags=-nIHE
    [ "$flag" = i ] && gflags=-nIHEi
    while IFS= read -r hit; do
      [ -z "$hit" ] && continue
      file="${hit%%:*}"; rest="${hit#*:}"; line="${rest%%:*}"; text="${rest#*:}"
      if [[ "$text" =~ secrets-check:allow[[:space:]]+[^[:space:]] ]]; then continue; fi
      if [ "$kind" = generic-secret ] && [[ "$text" =~ (sha[0-9]*|integrity|hash|checksum) ]]; then continue; fi
      while IFS= read -r m; do
        [ -z "$m" ] && continue
        if [ -n "$exc" ] && printf '%s' "$m" | grep -qE${flag/-/} -- "$exc"; then continue; fi
        if [ "$kind" = generic-secret ]; then
          v="$(printf '%s' "$m" | grep -oE "[\"'][A-Za-z0-9+/=_-]{16,}[\"']" | tail -n 1)"
          [[ "$v" =~ [0-9] && "$v" =~ [A-Za-z] ]] || continue
        fi
        echo "$file:$line: $kind: $(mask "$m")"
        found=1
      done < <(printf '%s\n' "$text" | grep -oE${flag/-/} -- "$re")
    done < <(cd "$top" && xargs -0 -r grep $gflags -e "$re" -- < "$clist" 2>/dev/null)
  done
  rm -f "$list" "$clist"
  return $found
}

selftest() {
  local t out fail=0 name kind
  t="$(mktemp -d)"
  trap 'rm -rf "$t"' RETURN
  git -C "$t" init -q
  # Samples are built from pieces, so this file holds no full pattern.
  local -A samples=(
    [private-key]="-----BEGIN RSA ""PRIVATE KEY-----"
    [aws-access-key]="AK""IAABCDEFGH""IJKLMNOP"
    [github-token]="gh""p_aB3dE6gH9jK2mN5pQ8sT1vW4yZ7bC0eF3hJ"
    [slack-token]="xo""xb-1234567890-abcdefghij"
    [google-api-key]="AI""zaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"
    [openai-key]="s""k-ant-AbCdEfGhIjKlMnOpQrStUv"
    [stripe-live-key]="s""k_live_AbCdEfGhIjKlMnOpQr"
    [jwt]="ey""JhbGciOiJIUzI1NiJ9.ey""JzdWIiOiIxMjM0In0.abc123"
    [atlassian-token]="AT""ATT3xFfGF0AbCdEfGhIjKlMn"
    [bitbucket-token]="BB""DC-AbCdEfGhIjKlMnOpQr"
    [tailscale-key]="ts""key-auth-AbCdEfGhIjKl"
    [npm-auth-token]="//registry.example.test/:_auth""Token=abcDEF123456"
    [url-password]="https://bob:hunter2pw""@db.internal.test/x"
    [generic-secret]="const api_""key = 'Ab3dE6gH9jK2mN5pQ8';"
    [email]="mail jane.doe""@corp.test now"
    [private-ip]="host 192.""168.1.20 here"
    [local-path]="at /ho""me/jane/notes"
  )
  for kind in "${!samples[@]}"; do
    printf '%s\n' "${samples[$kind]}" > "$t/s-$kind.txt"
  done
  : > "$t/.env"
  head -c $((max_bytes + 10)) /dev/zero > "$t/big.txt"
  printf 'clean line, noreply@example.com, pw@evil.example, https://u:p@evil.example/\n' > "$t/clean.txt"
  printf 'host 192.''168.1.20 here // secrets-check:allow range test\n' > "$t/allowed.txt"
  printf 'host 192.''168.1.20 here // secrets-check:allow\n' > "$t/bare.txt"
  git -C "$t" add -A -f
  out="$(scan "$t")"
  for kind in "${!samples[@]}"; do
    if ! grep -q "^s-$kind.txt:1: $kind: " <<< "$out"; then echo "selftest: rule not caught: $kind"; fail=1; fi
  done
  grep -q '^\.env: file-name:' <<< "$out" || { echo "selftest: file-name rule not caught"; fail=1; }
  grep -q '^big.txt: large-file:' <<< "$out" || { echo "selftest: large-file rule not caught"; fail=1; }
  grep -q '^clean.txt' <<< "$out" && { echo "selftest: clean file flagged"; fail=1; }
  grep -q '^allowed.txt' <<< "$out" && { echo "selftest: allow marker did not work"; fail=1; }
  grep -q '^bare.txt:1: private-ip' <<< "$out" || { echo "selftest: bare marker was accepted"; fail=1; }
  for kind in "${!samples[@]}"; do
    name="${samples[$kind]}"
    grep -qF -- "$name" <<< "$out" && { echo "selftest: full value printed for $kind"; fail=1; }
  done
  if [ "$fail" -ne 0 ]; then echo "secrets-check selftest: FAIL"; return 1; fi
  echo "secrets-check selftest: OK"
}

case "${1:-}" in
  --selftest) selftest; exit $? ;;
  --repo)
    [ $# -eq 2 ] || { echo "secrets-check: --repo needs a folder" >&2; exit 2; }
    target="$2"
    [ -d "$target" ] || { echo "secrets-check: folder not found: $target" >&2; exit 2; } ;;
  "") target="$root" ;;
  *) echo "usage: secrets-check.sh [--repo <folder>] | --selftest" >&2; exit 2 ;;
esac

top="$(git -C "$target" rev-parse --show-toplevel 2>/dev/null)" || { echo "secrets-check: not a git repository: $target" >&2; exit 2; }
if scan "$top"; then
  echo "secrets-check: ok"
  exit 0
fi
echo "secrets-check: FAIL"
exit 1
