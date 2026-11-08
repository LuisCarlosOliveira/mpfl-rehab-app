#!/usr/bin/env bash
# Fail if package.json has a direct dependency that is not in allowed-deps.txt,
# or a version that is not exact.
set -euo pipefail
cd "$(dirname "$0")/.."
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const allowed = new Set(fs.readFileSync("scripts/allowed-deps.txt", "utf8").split("\n").filter(l => l && !l.startsWith("#")));
let bad = 0;
for (const group of ["dependencies", "devDependencies"]) {
  for (const [name, ver] of Object.entries(pkg[group] || {})) {
    if (!allowed.has(name)) { console.error("not allowed: " + name); bad++; }
    if (!/^\d+\.\d+\.\d+$/.test(ver)) { console.error("not exact: " + name + "@" + ver); bad++; }
  }
}
if (bad) process.exit(1);
console.log("deps-check: ok");
'
