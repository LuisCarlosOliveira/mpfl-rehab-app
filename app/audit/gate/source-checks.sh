#!/usr/bin/env bash
# Source checks. Usage: source-checks.sh <app dir of the tree to check> [<app dir of the main tree>]
# The last 5 checks compare package files and the CSP with the main tree. They run only when you give that second folder.
# Read-only. Exit code is the number of hits.
set -u
T="${1:?app dir of the tree}"; M="${2:-}"; n=0
hit() { n=$((n+1)); echo "HIT  $*"; }
cd "$T"
while IFS= read -r l; do hit "unsafe API: $l"; done < <(grep -rn -E "dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacent|document\.write|\beval\(|new Function|srcdoc|setTimeout\(['\"\`]|setInterval\(['\"\`]" src index.html 2>/dev/null)
while IFS= read -r l; do case "$l" in *noopener*) ;; *) hit "target=_blank without noopener: $l";; esac; done < <(grep -rn "_blank" src index.html 2>/dev/null)
while IFS= read -r l; do hit "inline style attribute: $l"; done < <(grep -rn -E "style=\{|style=\"" src index.html 2>/dev/null | grep -v "^src/.*test")
while IFS= read -r l; do hit "inline script or created element: $l"; done < <(grep -rn -E "<script[^>]*>[^<]|createElement\(['\"](script|style|iframe|link)" src index.html 2>/dev/null)
while IFS= read -r l; do hit "javascript/data URL in source: $l"; done < <(grep -rn -E "href=[\"'{]+\s*(javascript|data):" src 2>/dev/null)
while IFS= read -r l; do hit "remote URL in source: $l"; done < <(grep -rn -E "https?://" src index.html 2>/dev/null | grep -v -E "src/lib/protocolGen/sources\.ts|w3\.org|^\S+:\s*(//|\*)|THIRD_PARTY|import |reactjs\.org|react\.dev|doi\.org" | head -20)
while IFS= read -r l; do hit "dynamic href (check the value is never file data): $l"; done < <(grep -rn -E "href=\{|src=\{" src 2>/dev/null)
while IFS= read -r l; do hit "CSS remote import or url(): $l"; done < <(grep -rn -E "@import|url\(\s*['\"]?https?:" src --include=*.css 2>/dev/null)
[ -z "$M" ] || {
diff -q "$M/package.json" package.json >/dev/null || { hit "package.json differs from main tree"; diff "$M/package.json" package.json | head -20; }
diff -q "$M/package-lock.json" package-lock.json >/dev/null || hit "package-lock.json differs from main tree"
}
grep -q "Content-Security-Policy" index.html || hit "no CSP meta in index.html"
[ -z "$M" ] || {
diff <(grep -o "Content-Security-Policy: .*" "$M/public/_headers") <(grep -o "Content-Security-Policy: .*" public/_headers) >/dev/null || hit "CSP in public/_headers differs from main tree"
diff <(grep -o 'Content-Security-Policy" content="[^"]*"' "$M/index.html") <(grep -o 'Content-Security-Policy" content="[^"]*"' index.html) >/dev/null || hit "CSP meta in index.html differs from main tree"
}
echo "source-checks: $n hit(s) for $T"
exit $n
