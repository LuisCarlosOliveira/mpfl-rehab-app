# Dependency vetting: uqr and jsqr

Date: 2026-11-08. Task: T12b (QR pairing). The user ordered that every new dependency is checked for safety. This file holds the evidence.
Skills loaded with the Skill tool: `owasp-security`, `simple-english:simple-english`, `context7-mcp`. I read `mpfl-clinical-guardrails/SKILL.md`, `research/qr-pairing.md`, NFR6 and section 3.2 of `MPFL_APP_PLAN.md`. Context7 gave the API of both packages (library ids `/unjs/uqr` and `/cozmo/jsqr`).

Method: `npm view`, `npm pack` (tarball download only), `npm install --ignore-scripts --package-lock-only`, `npm audit`, GitHub API reads (GET only), and the npm advisory bulk query (POST, read-only). I ran no code from any package. All data is from 2026-11-08.

## 1. Summary
| Package | Version | License | Verdict |
|---|---|---|---|
| `uqr` (encoder) | 0.1.3 | MIT | ADOPT WITH CONDITIONS |
| `jsqr` (reader) | 1.4.0 | Apache-2.0 | ADOPT WITH CONDITIONS |
Both packages have no install script, no dependency, no network code, no `eval` and no storage code. Both shipped files match the GitHub source. The conditions are about pinning, the claims check, and tests that the frame never leaves memory.
## 2. uqr 0.1.3
### 2.1 Identity (check 1)

| Item | Value |
|---|---|
| Published | 2026-04-03T01:23:47Z by `antfu` (npm user) |
| Versions and age | 9 entries in `time` (4 releases: 0.1.0 to 0.1.3). Created 2023-08-04. |
| Gap | 0.1.2 is from 2023-08-16. 0.1.3 came 2.6 years later. |
| Maintainers | `pi0`, `antfu` (Anthony Fu, org `unjs`) |
| Repository | `git+https://github.com/unjs/uqr.git`. It exists. Owner type is Organization. 786 stars. MIT. |
| Homepage | `https://github.com/unjs/uqr#readme` |
| Tarball | `https://registry.npmjs.org/uqr/-/uqr-0.1.3.tgz` |
| shasum | `43b5b27508cd28ccc42401ea75b92a39bd8cd510` (I recomputed it: same) |
| integrity | `sha512-0rjE8iEJe4YmT9TOhwsZtqCMRLc5DXZUI2UEYUUg63ikBkqqE5EYWaI0etFe/5KUcmcYwLih2RND1kq+hrUJXA==` (recomputed: same) |
| Registry signature | Present (key `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U`) |
| `dist.attestations` (provenance) | None. The release script is `bumpp && npm publish` from a developer machine. |
| `deprecated` | Not set |
| Weekly downloads | 9,771,065 (2026-11-01 to 2026-11-07) |

Typosquat check: `uqr` is the real `unjs` package (repository name, package name and maintainer match). The name `qr` is another package (maintainer `paulmillr`, version 0.7.2). `jsQR` with capital letters does not exist in the registry (404). `qr-scanner` has maintainer `danimoh`. No collision with `uqr`. The weekly downloads are high, so the name is used widely.

### 2.2 Tarball (check 2)
Files: `LICENSE`, `README.md`, `package.json`, `dist/index.mjs` (27,482 B), `dist/index.cjs` (27,624 B), and four `.d.ts` files. Unpacked size is 79,278 B. The ESM file is 7,828 B gzip (level 9). The files are not minified, so a minified size is UNVERIFIED (no bundler was available in the scratch folder).

`package.json`: `type: module`, `sideEffects: false`. Scripts: `build`, `dev`, `lint`, `release`, `play`, `test`, `typecheck`. There is no `preinstall`, `install`, `postinstall` or `prepare` script. There is no `bin`. There is no `dependencies` field. The `simple-git-hooks` entry is dev only and does not run for a consumer.

Code scan (a script of regular expressions over `index.mjs`, `index.cjs` and both README files):

| Pattern | Hits in shipped code | Judgment |
|---|---|---|
| `eval(`, `new Function`, `Function(` | 0 | Clean |
| `XMLHttpRequest`, `fetch(`, `WebSocket`, `sendBeacon`, `importScripts`, `postMessage`, `Worker`, `WebAssembly` | 0 | Clean |
| `document.write`, `innerHTML`, `createElement`, `document`, `window`, `navigator`, `canvas` | 0 | Clean |
| `localStorage`, `sessionStorage`, `indexedDB`, `crypto.subtle`, `child_process`, `process.env` | 0 | Clean |
| `atob(`, `btoa(`, base64 strings of 80 or more characters | 0 | Clean |
| `http://` | 1, `index.mjs` line 723: `` let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`; `` | Benign. It is the XML namespace of the SVG text. It is not a request. |
| `https://` | 0 in code. Only README links and badges. | Benign |

### 2.3 Source match (check 3)
The tag `v0.1.3` exists on `unjs/uqr` (tag object `25ca83b0`, commit `23ac4e3c`, message "chore: release v0.1.3", 2026-04-03). I downloaded the tag archive with `curl`-style GET and did not build it.

- `LICENSE` in the tarball is identical to `LICENSE` in the tag.
- The `package.json` version is `0.1.3` in both.
- The build config uses `unbuild` with one entry (`src/index`) and a small rollup plugin that turns `assert(` into `false && assert(`. This explains why asserts are dead code in `dist`.
- I compared the identifiers, the numbers and the string literals of `dist/index.mjs` against `src/*.ts`. The extra items in `dist` are compiler artifacts. Examples are the renamed duplicate `QrCodeDataType2`, the `__PURE__` marker, and numbers such as 21522 and 1335 (the constants `0x5412` and `0x537`). Every behavior-bearing function in `dist` has a source function. I found no extra function or string that sets a network call or storage.
- Limit: I did not rebuild with `unbuild`, so byte equality is not proven. Status: MATCHES, not byte-verified.

The commit before the release is `44a82284`: "fix(svg): escape color attributes in renderSVG to prevent SVG/XML injection". So version 0.1.3 contains an injection fix. Earlier versions are not safe for user-controlled colors. Our app passes no color option.

### 2.4 Advisories (check 4)
| Source | Result |
|---|---|
| `npm audit --package-lock-only` (scratch project with only the two packages) | `found 0 vulnerabilities` |
| npm advisory bulk endpoint (POST for `uqr@0.1.3` and `jsqr@1.4.0`) | HTTP 200, `{}` (no advisory) |
| GitHub Advisory Database, `affects=uqr` | `[]` |
| Repository security advisories (`/security-advisories`) | `[]` |
| `SECURITY.md` in the repository and in `unjs/.github` | 404 (no policy file) |
| Open issues | 0 |

### 2.5 Maintenance (check 5)
- Last commit: 2026-04-03. Last release: 2026-04-03 (v0.1.3).
- Open issues: 0. Maintainer: an organization (`unjs`). The main contributor is `antfu` (21 commits).
- Pre-1.0: yes. The API can change in a minor version. The fix to `renderSVG` shows that the package gets security fixes.
- Risk: moderate and low. The code is small (about 49 KB of TypeScript, derived from Nayuki, which has a clean record). The 2.6-year gap and the manual publish without provenance mean that we rely on the npm account of the maintainer. The lockfile hash and the exact pin limit this risk.

### 2.6 Behavior in our setting (check 6)
- Network, `eval`, worker, wasm: none. The CSP needs no `unsafe-eval`, no `blob:` worker and no `wasm-unsafe-eval` for `uqr`.
- DOM and canvas: none. `renderSVG` returns a string. `encode` returns `{ data: boolean[][], version, size }`.
- API from Context7: `encode(text, options)` defaults to `ecc: 'L'`, `border: 1`, `minVersion: 1`, `maxVersion: 40`. Pass `ecc: 'M'` and `maxVersion: 11`. It throws "Data too long" when the data does not fit: catch it and fail closed.
- Our rule: draw the `encode` matrix with React as one `<svg>` and one `<path d>`. Then the app does not use `renderSVG`, `dangerouslySetInnerHTML` or a data URL. This keeps the guardrails clear.

### 2.7 Verdict
ADOPT WITH CONDITIONS: C1, C2, C3, C4, C5 (section 4).
## 3. jsqr 1.4.0
### 3.1 Identity (check 1)

| Item | Value |
|---|---|
| Published | 2021-04-24T03:17:20Z by `jefff` (npm user) |
| Versions and age | 19 entries in `time`. Created 2015-12-11. About 11 years old. |
| Maintainers | `jefff`, `templaedhel` (two persons: Jefff Nelson and Cosmo Wolfe) |
| Repository | `https://github.com/cozmo/jsQR`. It exists. Owner type is User. 4,050 stars. Apache-2.0. |
| Homepage | `https://github.com/cozmo/jsQR#readme` |
| Tarball | `https://registry.npmjs.org/jsqr/-/jsqr-1.4.0.tgz` |
| shasum | `8efb8d0a7cc6863cb6d95116b9069123ce9eb2d1` (recomputed: same) |
| integrity | `sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==` (recomputed: same) |
| Registry signature | Present (key `SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA`) |
| `dist.attestations` | None |
| `deprecated` | Not set |
| Weekly downloads | 6,310,742 (2026-11-01 to 2026-11-07) |

The `modified` field of the packument says 2025-11-13, but the last version is 1.4.0 from 2021-04-24. No version was published after 2021. Typosquat check: the repository `cozmo/jsQR` matches the package, and the contributors in `package.json` (Cosmo Wolfe, Jefff Nelson) match the npm maintainers. The name `jsQR` in capital letters is not in the registry. The names `qr`, `uqr` and `qr-scanner` belong to other authors.

### 3.2 Tarball (check 2)
Files: `LICENSE` (Apache-2.0 text, 11,358 B), `README.md`, `package.json`, `dist/jsQR.js` (256,885 B, a webpack 3 UMD bundle, not minified) and 13 `.d.ts` files. Unpacked size is 279,741 B. The JS file is 56,970 B gzip (level 9). Minified size is UNVERIFIED (no bundler available).

`package.json`: no `scripts` of the install kind (only `prebuild`, `build`, `watch`, `test`, `lint`, `generate-test-data`). No `bin`. No `dependencies` field (dev dependencies only). No `NOTICE` file in the tarball.

Code scan of `dist/jsQR.js`:

| Pattern | Hits | Judgment |
|---|---|---|
| `eval(`, `new Function` | 0 | Clean |
| `Function(` | 6 | Benign. They are `extracted.mappingFunction(...)` calls (lines 347 to 350) and `mappingFunction(xValue, yValue)` (line 9680). Not the `Function` constructor. |
| `XMLHttpRequest`, `fetch(`, `WebSocket`, `sendBeacon`, `importScripts`, `postMessage`, `Worker`, `WebAssembly`, `Blob` | 0 | Clean |
| `document`, `window`, `navigator`, `canvas`, `createElement`, `innerHTML`, `getImageData`, `toDataURL` | 0 | Clean. The library never touches the DOM or a canvas. |
| `localStorage`, `sessionStorage`, `indexedDB`, `crypto.subtle`, `process.env`, `child_process` | 0 | Clean |
| `atob(`, `btoa(`, base64 strings of 80 or more characters | 0 | Clean |
| `define` (lines 4 and 5) | 2 | Benign. It is the UMD check `typeof define === 'function' && define.amd`. |
| `self` (line 10) | 1 | Benign. UMD root: `typeof self !== 'undefined' ? self : this`. |
| `http://` (line 9758) | 1 | Benign. It is a comment: `// Uses a variant of http://en.wikipedia.org/wiki/Bresenham's_line_algorithm`. |
| `https://` | 0 in code | Clean |

### 3.3 Source match (check 3)
The GitHub repository has no tags and no releases (`/tags` returns `[]`). So I matched by commit. The commit `34d8eec1ec5d85496f3948ff02fcfe6406f89d81` has the message "1.4.0" (2021-04-24).

- `dist/jsQR.js` in the tarball is byte-identical to `dist/jsQR.js` of that commit (SHA-256 `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`). It is also identical to `docs/jsQR.js` of that commit.
- All `.d.ts` files, `LICENSE` and `README.md` are identical to the commit.
- The `src` folder has the same files in the commit and at the repository head `8e6a036bea` (2021-08-24). The only code change after 1.4.0 is `version: version` to `version,` (a style change).
- The identifiers that exist only in `dist` are webpack and TypeScript helper names (`__webpack_require__`, `installedModules`, `BitMatrix_1` and similar). They hold no behavior.
- Limit: the repository holds the built file, so a byte match proves that npm and GitHub agree. It does not prove that the committed `dist` came from the committed `src`. I did not rebuild (webpack 3 and TypeScript 2 need an install and a run). I read the shipped code against the source: it has the same stages (binarize, locate, extract, decode) and no extra code. Status: MATCHES the repository, build not re-run.

### 3.4 Advisories (check 4)
| Source | Result |
|---|---|
| `npm audit --package-lock-only` | `found 0 vulnerabilities` |
| npm advisory bulk endpoint | HTTP 200, `{}` |
| GitHub Advisory Database, `affects=jsqr` | `[]` |
| Repository security advisories | `[]` |
| `SECURITY.md` | 404 (no policy file) |
| Open issues that match "security" | 0 of 98 open issues |

### 3.5 Maintenance (check 5)
- Last release: 2021-04-24 (1.4.0). Last commit: 2021-08-24. The repository `pushed_at` is 2026-05-15 (a metadata change, because the last 8 commits are older).
- Open issues: 98 (GitHub count, it includes pull requests). Open pull requests: 18.
- Maintainer: two persons, no organization. Not pre-1.0.
- The package is frozen. A frozen package is not unsafe by itself. But it gets no fixes. Any future bug in the decoder stays. Two risks remain. The first is a crash or a hang on a crafted frame (a denial of service in the page). The second is wrong text. Both are handled in our code by a size limit, a schema, and a `try` and `catch` (see C6).
- Known behavior bug (Context7 note, confirmed in `src/index.ts`): the code assigns `const options = defaultOptions` and then writes into it. So the first call that passes an option changes the default for all later calls. Pass `inversionAttempts` on every call.
- `data` for byte chunks uses `decodeURIComponent`. A bad byte sequence can drop the text of that chunk. Use `binaryData` or treat an empty `data` as a failed scan.

### 3.6 Behavior in our setting (check 6)
- Network, `eval`, worker, wasm, DOM, canvas, storage: none. The CSP needs nothing extra for `jsqr`. It is plain synchronous JavaScript that runs on the main thread. It does not use the `blob:` worker.
- Input: `jsQR(data: Uint8ClampedArray, width, height, { inversionAttempts })`. The array must have exactly `4 * width * height` bytes (RGBA). Otherwise it throws "Malformed data passed to binarizer."
- So the caller draws a camera frame to a canvas and calls `getImageData`. Our `claims-check.sh` bans `getImageData` (line 19 of the script). A rule is in section 5.
- Data path (read in `src/index.ts` and `src/binarizer/index.ts`): `data` goes into `binarize`, which copies it into a new internal `Uint8ClampedArray(width * height)` of grey values. The decoder works on bit matrices. The function returns `{ binaryData, data, chunks, version, location }`. No module variable stores the image or the result. The only module state is `defaultOptions` (see 3.5). The image is not sent, not stored, and not logged. The library holds no reference after the call returns.
- Cost: `attemptBoth` takes about 50% more time. Use `dontInvert` (our code is black on white). Speed on a low-end phone is UNVERIFIED.

### 3.7 Verdict
ADOPT WITH CONDITIONS: C1, C2, C3, C4, C6, C7, C8 (section 4). The package is clean, but it is frozen. The privacy risk is in our own frame code, so the conditions test that code.

## 4. Conditions
| Id | Condition | Applies to |
|---|---|---|
| C1 | Pin exact versions without a caret (section 6). Commit `package-lock.json`. Install with `npm ci --ignore-scripts`. | both |
| C2 | Add the names to `scripts/allowed-deps.txt` in the same commit as the plan reason. Run `scripts/deps-check.sh` and `npm audit --omit=dev`. Run `scripts/make-notices.mjs` to refresh the notices. | both |
| C3 | After `npm ci`, compare the installed `package-lock.json` integrity with section 6. A different hash blocks the merge. | both |
| C4 | Re-run this vetting before any version change. A new version is not a safe patch by default. | both |
| C5 | Use the `encode` matrix and draw it with React. Do not call `renderSVG` on the production path. Catch "Data too long". Pass `ecc: 'M'`, `maxVersion: 11`. | `uqr` |
| C6 | Read the camera frame only in `src/pairing/qrReader.ts` (rule in section 5). Check the length of the scanned text (600 characters) before any parse. Wrap `jsQR` in `try` and `catch` and fail closed. | `jsqr` |
| C7 | Call `jsQR(..., { inversionAttempts: 'dontInvert' })` on every call. Never pass an object that is shared and changed. | `jsqr` |
| C8 | Record in the PR that `jsqr` is frozen (last release 2021) and has no fixes. Review the choice again when T12b ends, and when a maintained small reader exists. | `jsqr` |

## 5. Rule for `getImageData` in one file
The plan: allow the banned API only in `src/pairing/qrReader.ts`, with the marker on the single line.

1. In `claims-check.sh`, keep `getImageData` in the banned list. Do not change the pattern.
2. In `src/pairing/qrReader.ts`, write the one call as `const img = ctx.getImageData(0, 0, w, h) // claims-check:allow` (one line, one call).
3. Add a check to `claims-check.sh`: every line with `claims-check:allow` and `getImageData` must be in the file `src/pairing/qrReader.ts`. Any other file fails. Example: `grep -rn "getImageData" app/src | grep -v "^app/src/pairing/qrReader.ts"` must print nothing, test files excepted by name.
4. The file `qrReader.ts` has these limits:
   - It imports `jsqr` and no other module that stores data.
   - It has no `toBlob`, `toDataURL`, `MediaRecorder`, `ImageCapture`, `createImageBitmap`, `OffscreenCanvas`, `localStorage`, `indexedDB`, `fetch` or `postMessage`. The existing `claims-check.sh` already bans most of them. A line check also needs `fetch`, `localStorage` and `indexedDB` for this one file.
   - It uses one small canvas (maximum 640 pixels wide), created once, and removed at the end of the scan.
   - Its public function returns a string or `null`. It never returns the frame, the `ImageData` or the canvas.
   - It starts only after a button press and stops all tracks as the guardrails require (`visibilitychange`, `pagehide`, route change, error).
5. Test `qrReader.test.ts` (Vitest with jsdom or a canvas mock):
   - Feed a known QR frame. The function returns the expected text.
   - Spy on `HTMLCanvasElement.prototype.toBlob`, `toDataURL`, `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `Storage.prototype.setItem` and `indexedDB.open`. After the scan, each spy has 0 calls.
   - After the scan, the canvas has width and height 0 and is not in the DOM. The `ImageData` buffer is not held by any exported value (the function result is a string).
   - A frame with no code returns `null`. A frame with a wrong array length does not crash the page.
   - A source test reads `qrReader.ts` as text and fails if it holds a banned name from the list above.

## 6. Pinning
Lines for `package.json` (`dependencies`, exact):

```json
"jsqr": "1.4.0",
"uqr": "0.1.3"
```

Install command: `npm install --save-exact --ignore-scripts uqr@0.1.3 jsqr@1.4.0`.

Lines for `scripts/allowed-deps.txt`, in the runtime group, in alphabetical order:

```
jsqr
uqr
```

Integrity values that the lockfile must hold:

```
uqr   0.1.3  sha512-0rjE8iEJe4YmT9TOhwsZtqCMRLc5DXZUI2UEYUUg63ikBkqqE5EYWaI0etFe/5KUcmcYwLih2RND1kq+hrUJXA==
jsqr  1.4.0  sha512-dxLob7q65Xg2DvstYkRpkYtmKm2sPJ9oFhrhmudT1dZvNFFTlroai3AWSpLey/w5vMcLBXRgOJsbXpdN9HzU/A==
```

Notices for `public/THIRD_PARTY_NOTICES.txt`:

- `make-notices.mjs` reads the first file named `LICENSE` or `LICENCE` in each package and a `NOTICE` file if it exists. It prints the heading `== <name> <version> (<license>)`. It stops with an error if no license text exists.
- `uqr`: the file `LICENSE` is in the tarball. It is MIT with two copyright lines: "Copyright (c) Project Nayuki" and "Copyright (c) 2023 Anthony Fu". The script copies both lines. No change to the script is needed.
- `jsqr`: the file `LICENSE` is in the tarball. It is the Apache License 2.0 text. The tarball has no `NOTICE` file, so Apache section 4(d) needs no NOTICE text. The file holds the unfilled template line `Copyright {yyyy} {name of copyright owner}`. The copyright holder is therefore not named in the file. The `package.json` names the contributors Cosmo Wolfe and Jefff Nelson. Add a line to the notices by hand only if the team wants the names, as a note, not as a legal text. Legal review: UNVERIFIED.

## 7. Standing checklist for any new dependency
1. State the need and the alternatives in the plan. Prefer less code, no dependency, and a native browser API.
2. Run `npm view <name>@<version>`. Record the license, the maintainers, the repository URL, the publish date, the number of versions and the `deprecated` field.
3. Check the identity. The repository must exist and match the package name. Compare with similar names (typosquat). Read the weekly downloads.
4. Check `dist.signatures` and `dist.attestations`. Say if provenance is missing.
5. Run `npm pack <name>@<version>` into a new folder. Do not run a package script. List the files with `tar -tzf`.
6. Read `package.json` in the tarball. Look for `preinstall`, `install`, `postinstall`, `prepare`, `bin` and `dependencies`. Check each dependency with the same list.
7. Scan the shipped code for `eval`, `new Function`, network APIs, workers, wasm, DOM and storage APIs, `process.env`, base64 blobs and URL literals. Judge each hit and quote the line.
8. Compare the tarball with the repository tag or commit. Say what you compared and what you did not compare.
9. Run `npm install --ignore-scripts --package-lock-only` in a scratch project, then `npm audit`. Query the npm advisory bulk endpoint and the GitHub Advisory Database. Read the security policy.
10. Check maintenance: last commit, last release, open issues, organization or person, pre-1.0 status. State plainly that a frozen package gets no fixes.
11. Check the behavior in our setting: CSP, network, `eval`, camera or storage access, and the guardrails in `mpfl-clinical-guardrails`.
12. Pin the exact version. Add the name to `scripts/allowed-deps.txt`. Commit the lockfile. Update the notices.
13. Write the verdict (ADOPT, ADOPT WITH CONDITIONS, REJECT) and mark every unchecked item as UNVERIFIED. Delete the scratch folder.

## 8. Not verified
- Minified size of both packages: the shipped files are not minified and no bundler was available. Only gzip sizes of the shipped files are given.
- `uqr` build equality: I did not rebuild with `unbuild`. The comparison used identifiers, numbers and strings, so byte equality is not proven.
- `jsqr` build reproducibility: the repository file `dist/jsQR.js` equals the npm file, but I did not rebuild it from `src`.
- The `jsqr` copyright holder text: the license file holds the template line. Legal review is not done.
- The `jsqr` repository `pushed_at` of 2026-05-15: I saw no commit of that date in the last 8 commits. The cause is UNVERIFIED.
- The 98 open `jsqr` issues: I searched for "security" only. I did not read them all.
- Whether the npm account of the maintainers has two-factor authentication: not visible. This is the main supply-chain risk of a package with no provenance.
- Speed and scan quality of `jsqr` on a Redmi A3 and with the real camera: not tested.
- Both packages in the Vite build and under the CSP in a real browser: read from code only.
