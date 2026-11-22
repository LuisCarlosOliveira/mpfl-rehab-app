# Security review (T14)

Date: 2026-11-08. Scope: `app/src`, `public/_headers`, `index.html`, `vite.config.ts`, `scripts`, `e2e`, `package.json` and the lock file. The review was read-only. No repo file was changed. The main session applies the fixes.

Skills loaded: `owasp-security` and `simple-english:simple-english`. The skill `security-review` did not load. It failed because the repo has no `origin/HEAD`. The OWASP Top 10:2025 list and the three-question test of `owasp-security` were applied by hand.

Severity scale: HIGH is data exposure, a bypass of a safety rule, remote code execution or a camera left on. MEDIUM, LOW and INFO follow.

## Summary

| ID | Severity | Where | Problem | Fix |
|---|---|---|---|---|
| S-01 | HIGH | `src/ui/Summary.tsx` lines 42 to 70 | The pause message (FR12) shows only after a successful save. If the save fails, or the user never presses Save, the message never shows. | Compute `evaluateSession` as soon as both answers are set. Show the message before and apart from the save. |
| S-02 | MEDIUM | `src/main.tsx`, Zod 4.6.7 | Two CSP `script-src eval` violations on every load, from the Zod probe `Function('')`. NFR6 needs zero. Confirmed in a browser. | New file `src/zodConfig.ts` with `z.config({ jitless: true })`. Import it first in `main.tsx`. |
| S-03 | MEDIUM | `e2e/landmarker.spec.ts`, `e2e/harness` | The CSP test runs on a test page, not on the real app. This is why S-02 was not found. | Add a spec that opens the real app and listens for `securitypolicyviolation` on each screen. |
| S-04 | MEDIUM | `dist`, `docs/model.md` | The build holds no license file and no notice. MediaPipe and Dexie (Apache-2.0) and React and Zod (MIT) need their notice with each copy. | Add `THIRD_PARTY_NOTICES.txt` to `public/` and link it from the Privacy screen. |
| S-05 | LOW | `scripts/model-hash-check.sh`, `package.json` | The hash check proves integrity only. It does not run on `dist`, `dev` or `preview`. A change to the model plus `SHA256SUMS` plus `docs/model.md` passes. | Run `bash scripts/model-hash-check.sh dist/models` after `vite build`. Protect the two hash files with a code owner rule. |
| S-06 | LOW | `scripts/claims-check.sh` | The banned API list misses many ways to move a frame or to inject markup. The variable `$text_files` is unquoted. | Add the APIs of check 4. Read the file list with `find -print0`. |
| S-07 | LOW | `src/lib/storage/meta.ts`, `src/ui/App.tsx` line 63 | `localStorage` can throw (blocked storage) and crashes the first render. `crypto.randomUUID` does not exist on a plain `http` LAN address. | Wrap storage in `try`. Fall back to `crypto.getRandomValues` for the id. |
| S-08 | LOW | `src/lib/storage/export.ts` lines 15 to 20 and 99 | Date strings have no length limit. The schema allows 20,000 sessions. The plan (section 11) decided on 5,000. | Add `.max(40)` to the date fields. Set the session limit to 5,000. |
| S-09 | LOW | `src/lib/storage/db.ts` line 81 | `localStorage.clear()` erases the whole origin, not only the keys of this app. | Remove the four `mpfl.` keys by name. |
| S-10 | LOW | `src/pose/landmarker.ts`, `tests/pose/landmarker.test.ts` | The fetch guard covers `fetch` only. Its test covers a string URL only. | Add tests for `Request`, `URL`, `data:` and the release count. |
| S-11 | LOW | `index.html`, `public/_headers` | On a host that ignores `_headers` there is no `Permissions-Policy`, no `Referrer-Policy` and no `frame-ancestors`. | Add `<meta name="referrer" content="no-referrer">`. State the host rule in the docs. |
| S-12 | LOW | `package-lock.json` | `npm audit` shows 9 moderate findings, all in dev tools (`minimatch` through ESLint). | No runtime effect. Update ESLint when a fixed version exists. |
| S-13 | INFO | `src/lib/mode.ts`, `src/lib/protocol/loader.ts` | Patient mode and the approval field are self-asserted. Demo is the default. | None. Keep the plan wording. |
| S-14 | INFO | CSP | `worker-src`, `media-src` and `img-src` allow `blob:`. `img-src` allows `data:`. I did not test whether each is needed. | Remove one at a time and run the landmarker spec. |

Counts: 1 HIGH, 3 MEDIUM, 9 LOW, 2 INFO.

## Check 1: Dependencies

Commands and results:

- `npm audit --omit=dev`: `found 0 vulnerabilities`.
- `npm audit`: 9 moderate, all dev only. Chain: `minimatch` (GHSA-g3hv-75wg-m249, a denial of service in glob handling) then `@eslint/config-array`, `eslint`, and the `@typescript-eslint` packages. No runtime code uses them. See S-12.
- `npm audit signatures`: 337 packages with verified registry signatures. 119 have verified attestations. No failure.
- `npm ci --dry-run`: `up to date`. The lock file and `package.json` agree.
- The lock file is tracked (`git ls-files app/package-lock.json` lists it). All 380 `resolved` entries point to `registry.npmjs.org` and all 380 have an `integrity` hash.
- All versions in `package.json` are exact. `scripts/deps-check.sh` enforces this and an allow list.
- Install scripts: the only package with `hasInstallScript` is `fsevents` 2.3.3. It is a dev, optional, macOS-only package. No runtime package has an install script.

Licenses of the runtime packages (read from the lock file, with `package.json` of the package as the fallback):

| License | Count | Packages |
|---|---|---|
| MIT | 30 | not listed one by one |
| ISC | 11 | not listed one by one |
| Apache-2.0 | 2 | `@mediapipe/tasks-vision` 1.2.2, `dexie` 4.4.7 |
| BSD-3-Clause | 1 | `d3-ease` 3.0.2 |
| MIT AND ISC AND BSD-3-Clause | 1 | `victory-vendor` 37.4.1 |

No license outside the allowed list (MIT, Apache-2.0, BSD, ISC, 0BSD) exists. The lock file lists 45 non-dev packages. `npm ls --all --omit=dev` lists 47 name and version entries. I did not reconcile the difference of 2. The model weights have their own license question. It is in `docs/model.md` and in the plan section 11. See S-04 for the notice duty.

## Check 2: Content Security Policy

I built the app with `npx vite build` into a scratch folder. I read the output and ran it in Chromium.

Header and meta tag. `public/_headers` and the meta tag of `index.html` are equal, except that the meta tag has no `frame-ancestors`. This is right, because a meta tag cannot carry that directive. `e2e/headers.spec.ts` tests this.

The built `index.html` has no inline script and no `<style>` element. It has one external module script and one external style sheet. The built JavaScript has no `eval(` call. The only `new Function` use is the Zod probe (S-02). The text `innerHTML=` appears three times in `index-*.js`. All three come from React DOM internals (a script-element trick and the `dangerouslySetInnerHTML` support code). The app code never calls them.

`style-src` gap. The policy has no `style-src`, so `default-src 'self'` applies. The policy blocks a `style=` attribute in markup and a `<style>` element. `src` has no `style=` text. React sets the `style` prop through the CSSOM, which the CSP allows. The string `createElement('style')` in the bundle is the React DOM code for `<style>` host elements, which the app does not render. Recharts is in `package.json` but no file imports it yet. It has 0 matches in the bundle. Run this check again when T11 adds charts.

What `'wasm-unsafe-eval'` allows. It allows `WebAssembly.compile` and `WebAssembly.instantiate`. It does not allow `eval` or `new Function`. The app has one user of WebAssembly: the MediaPipe files in `/models/wasm/`. The glue script loads with a `<script>` element from the own origin, which `script-src 'self'` allows. The directive is needed only for MediaPipe.

Fetch guard (`blockForeignFetch`). I read the code and the test.

- It replaces `globalThis.fetch` with a function that resolves the URL against `location.href` and rejects any other origin. A bad URL gives a rejected promise. This is fail-closed.
- It restores the original `fetch` only if no other code replaced it after the guard (`globalThis.fetch === installed`). This is safe.
- The count `users` keeps the guard in place until the last landmarker closes. The comment says why: `close()` sends the last metrics.
- A `blob:` URL has the origin of its creator, so a blob URL of this page passes. A `data:` URL has the origin `null`, so it is blocked.
- It does not cover `XMLHttpRequest`, `sendBeacon`, `WebSocket`, WebRTC or a worker. The MediaPipe bundle holds 6 uses of `XMLHttpRequest` and one `fetch` to `https://odml.pa.googleapis.com/v1/log`. The CSP (`connect-src 'self'`) covers these.
- What only the fetch guard stops: nothing that the CSP does not also stop, while the CSP is active. The guard removes the CSP violation report for the metrics call. It also keeps the metrics call from leaving if a host removes the header and a browser ignores the meta tag. This is defense in depth.
- The test covers a string URL, a foreign origin and the own origin. It does not cover a `Request` object, a `URL` object, `data:` or the release count (S-10).

Browser result on the real build (check 8): two violations at each screen (S-02).

## Finding S-02 in detail: Zod and `new Function`

The coordinator asked me to confirm or refute this.

Confirmed. I built the real app and ran it under `vite preview` with the headers of `public/_headers`, in Playwright Chromium. The listener `securitypolicyviolation` caught the same two events on the Privacy, Load and Home screens:

`script-src http://127.0.0.1:4199/assets/index-CIyZyggc.js:11` (two times)

The cause is in the bundle: `qe=je(()=>{if(L.jitless||...)return!1;try{return Function(``),!0}catch{return!1}})`. This is the Zod 4 test `allowsEval`. The `catch` hides the error, but the browser still reports the CSP violation. The app works, because Zod falls back to the plain parser when the probe fails.

Zod documentation (context7, Zod v4.6.7, `compile.mdx`): "Compilation uses `new Function`, which is unavailable in CSP/no-`eval` environments. Global mode stands down when `jitless` is set" with `z.config({ jitless: true });`.

Where the call must run. It must run before any schema is created. All schemas are created when `src/lib/protocol/schema.ts` and `src/lib/storage/db.ts` load. ES imports run before the code of the importing file. So a line `z.config(...)` in the body of `main.tsx` is too late. I tested this: with the call at the top of `main.tsx` as a statement, the build still gave two violations on every screen.

The exact fix:

1. Create `src/zodConfig.ts` with two lines: `import { z } from 'zod';` and `z.config({ jitless: true });`.
2. Make `import './zodConfig';` the first line of `src/main.tsx`.
3. For unit tests, add the same import to `tests/setup.ts`, so that tests and the app use one setting.

Result with this fix, in a scratch copy of the app: 0 events on Privacy, Load and Home. A valid protocol still loads and Home shows. A node check with `jitless: true` still rejects a value above the range, a bad regex match, an unknown key (`__proto__`) and a bad date. Speed does not change in the browser. The probe already failed there, so the app already used the plain parser.

## Check 3: Untrusted input

Entry points in code: `loadProtocol` (file picker in `LoadProtocol.tsx`), `loadStoredProtocol` (IndexedDB), `parseExport` and `importSessions`, `exportJson` and `exportCsv`. Four screens are not built yet: session import, the clinician view, export and erase. No UI file calls `parseExport`, `importSessions`, `exportJson`, `exportCsv` or `eraseAll`. I reviewed the functions only.

- Size. `overByteCap` checks the length before `JSON.parse`. `LoadProtocol.tsx` also checks `file.size`. The cap is 5 MB.
- Strict schemas. Both schemas use `z.strictObject`. Unknown keys are rejected.
- Prototype pollution. `{"__proto__": ...}` and `{"constructor":{"prototype":...}}` give `unrecognized_keys`. `JSON.parse` makes `__proto__` an own key and Zod does not merge. After both tests, `({}).x` and `({}).p` were `undefined`.
- Memory and time. I parsed a 6 MB file with 2,000,000 empty session objects: 272 ms, about 111 MB of heap, one issue (the `max` check stops early). A valid file with 14,000 sessions parsed in 21 ms and about 4 MB. A 4 MB key name gave an error message of 4 MB inside Zod. `describeFirstIssue` cuts the shown text to 300 characters. `JSON.parse` of 200,000 nested arrays did not fail in Node 24. The browser limits can differ. This is not tested.
- Error text. Messages hold the path and the Zod message. A key name from the file can appear, cut to 300 characters. It is shown as React text (INFO, no finding).
- Path from file data to the DOM. A search of `src` for `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `insertAdjacent`, `outerHTML`, `href=`, `src=`, `style=`, `window.open` and `createObjectURL` has no match in app code. Only `srcObject` is set, to the camera stream. In the browser I loaded a protocol with the phase name `<img src=x onerror=alert(1)>` and `surgeon.brace` set to `<script>alert(2)</script> javascript:alert(3)`. The app showed Home. `main` had 0 `img`, 0 `script` and 0 `a` elements. 0 dialogs opened.
- Dates. `z.iso.datetime()` has no length limit. A 4,000,000-character fraction was accepted in 5 ms (S-08).
- CSV. `textCell` quotes every text cell and doubles inner quotes. It adds a leading `'` for `=`, `+`, `-`, `@`, tab, carriage return and the four wide forms. Number cells are numbers only. The id fields are limited by `protocolIdSchema`, so no free text reaches the CSV. `marginSource` is limited to 200 characters. Note: a text cell that starts with a space and then `=` is not changed. Spreadsheets do not run that as a formula.
- Same patient check. `importSessions` does not compare the `pseudonymId`. This is an open item in the plan section 11.

Every regular expression in `src` and `scripts`:

| File and line | Expression | Worst case |
|---|---|---|
| `src/lib/protocol/schema.ts` 14 | `/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/` | Anchored and bounded. Linear. 4 MB input: 2 ms. |
| `src/lib/storage/export.ts` 99 | `/^[=+\-@\t\r＝＋－＠]/` | One character test. Constant time. |
| `src/lib/storage/export.ts` 100 | `/"/g` | Linear. |
| `scripts/agreement.mjs` 28 | `/\r$/` | Linear, on one line. |
| Zod (library) | datetime, date, uuid | 4 MB inputs ran in 1 to 5 ms. |

No unbounded loop over file data exists. The loops run over arrays that the schema limits (sessions, phases, exercises) after the parse.

## Check 4: Camera and privacy

Paths that can store or send a frame: none. A search of `src` found no use of `canvas` (only a comment). It also found none of these: `ImageBitmap`, `createImageBitmap`, `toBlob`, `toDataURL`, `MediaRecorder`, `ImageCapture`, `OffscreenCanvas`, `RTCPeerConnection`, `WebSocket`, `XMLHttpRequest`, `sendBeacon`, `navigator.share`, `clipboard`, `new Worker`, and `fetch(`. The only frame consumer is `PoseLandmarker.detectForVideo(video, ...)` in `src/pose/landmarker.ts`. It returns `x`, `y` and `visibility` numbers. The video element shows the stream on screen only. The built bundle of the app has none of these APIs either. The MediaPipe glue holds `XMLHttpRequest` and `createObjectURL`. The CSP limits them to the own origin.

`getUserMedia`. One call: `src/pose/camera.ts` line 62, `{ video: { facingMode: 'user' }, audio: false }`. The UI starts it from a button (`Setup.tsx`). Exit paths in code are listed here. `stopCamera` is the explicit stop. The other paths are `visibilitychange` to hidden, `pagehide` and the `ended` event of a track. They also include an error after the stream was stored, and a stale start (generation counter). The unmount cleanup of `Setup.tsx` (line 24) and `Session.tsx` (line 144) also stops the camera. `cameraSource().release()` also clears `srcObject`. The tests are `tests/pose/camera.test.ts` and `e2e/camera*.spec.ts`. The e2e camera tests call `camera.ts` on a test page. I did not run the full camera flow in the real UI (see Not checked).

Stored data:

| Store | Content | Personal data |
|---|---|---|
| IndexedDB `mpfl-rehab`, table `sessions` | Date, exercise, side, reps, angles, counters, pain, swelling, protocol id, phase | Health data with a date. Pseudonymous, not anonymous. |
| IndexedDB, table `protocol` | The raw protocol file | Can hold the clinician name (`authoredBy`) and surgery details (`surgeon.*`, free text up to 200 characters). |
| `localStorage` | `mpfl.pseudoId` (UUID), `mpfl.lastExport`, `mpfl.persistAsked`, `mpfl.privacySeen` | The id links all exports of one browser. |

No video, image, Blob or data URL is stored. `eraseAll` deletes the database, recreates it, clears `localStorage`, deletes all Cache storage entries and unregisters service workers. The app registers none. No UI calls it yet, so FR16 cannot be tested in a browser. After an erase a new id is made on the next export. See S-09 for the over-wide `clear()`.

`crypto.randomUUID` exists only in secure contexts (`https`, `localhost`, `127.0.0.1`). On an `http` LAN address it is `undefined` and `getPseudonymId` throws. Export is not wired to a screen yet, so there is no effect today (S-07).

## Check 5: Safety rule bypasses

What is a security control and what is a safeguard against an honest mistake:

| Rule | Where | Class | Result |
|---|---|---|---|
| Phase (FR4) | `store.ts`, `phase-check.sh` | Safeguard | No setter exists. The store is frozen. `phase-check.sh` is a text search and can be evaded. A user can still edit the stored protocol in browser tools, and the schema check only needs a valid file. |
| Patient mode | `mode.ts`, `main.tsx` | Build-time switch | Only `VITE_PATIENT_USE_APPROVED === 'true'` at build time sets it. The value is baked into the bundle. No query string, `localStorage` or URL path is read (no `location` or `URLSearchParams` in `src`). Runtime forcing is not possible. |
| Approval | `loader.ts` | Self-asserted | Patient mode needs `approvedOn` (any valid date) and `example` not true. Anyone can write both. The plan says this. |
| Default mode | `mode.ts` | Fail-visible | A build without the flag runs as demo. The banner "Prototype. Not for patient use." shows on every screen. |
| Red-flag check (FR5) | `appState.ts` | Safeguard | The state is in memory only. No storage or URL can skip it. `setup` and `session` redirect to `redflag` when `redFlagCleared` is false. The patient can leave all boxes empty. |
| Pause message (FR12) | `Summary.tsx` | Broken, see S-01 | The verdict is set only after `saveSession` succeeds. |
| "Gave way" message | `Summary.tsx` | Works | It shows on entry to the Summary, before any save. |

Finding S-01 in detail. In `save()` the lines `await saveSession(db, input); setSaved(verdict);` come in one `try`. If IndexedDB throws (quota full, blocked storage, a private window), the `catch` sets `saveError` and the verdict is never shown. The patient sees the text `The session could not be saved. Try again.` A patient with pain 9 gets no pause message on each retry. The same happens if the patient closes the tab before pressing Save. The pause rule is the safety floor of FR12. No attacker is needed, so this is a failure case and not an exploit. I rate it HIGH, because the scale lists "a bypass of a safety rule". No test covers a failed save (`tests/ui/summary.test.tsx` has no such case). Fix: compute `evaluateSession` in the render when `pain` and `swelling` are both set, and show the message in the same place as the answers. Keep the save separate. Add a test with a `saveSession` that rejects.

## Check 6: Scripts

- `claims-check.sh`, `phase-check.sh`, `model-hash-check.sh`, `deps-check.sh`: no `eval`, no `source`, no network call. User input is limited to path arguments. They read only the repo (`src`, `public/models`, `../docs/model.md`). `deps-check.sh` runs `node -e` with single-quoted code, so the shell does not expand anything in it.
- `claims-check.sh` line 36 uses `$text_files` unquoted on purpose. A path with a space splits into two words and a file is skipped, so the check passes by mistake. The repo path has no space today. The list of banned APIs is short (S-06). The checks are text searches. They stop honest mistakes. They do not stop `window['to'+'Blob']`.
- `bland-altman.mjs` and `agreement.mjs` read one CSV path from the command line and print JSON. No `eval`, no shell. They are developer tools.
- `model-hash-check.sh`. It fails on a symlink, on a changed file, on an extra file and on a missing file. It also needs every `SHA256SUMS` line in `docs/model.md`. I ran it: `model-hash-check: ok`. A swapped model passes only if the same commit changes `SHA256SUMS` and `docs/model.md`. This is an integrity check, not an authenticity check (S-05). The script accepts a folder argument. `dist/models` can be checked with it, but the docs line check is then skipped.

## Check 7: Supply chain of the model

- I ran `sha256sum --check --strict` in `public/models`. All 5 files give `OK`. The five hashes in `docs/model.md` equal the hashes in `SHA256SUMS` (the script checks this).
- The 4 WASM files in `public/models/wasm` are byte-equal (`cmp`) to the files in `node_modules/@mediapipe/tasks-vision/wasm`. `dist/models/pose_landmarker_lite.task` has the same SHA-256 as the source file.
- The model URL uses `latest`. The hash fixes the file. A later upstream change does not reach the app until someone updates the hash.
- Apache-2.0 notice. `docs/model.md` holds the license text and says no `NOTICE` file exists. The build output has no license file. It has no license comment in the JavaScript or the WASM glue (a search for "Apache", "@license" and "Copyright" found nothing). Apache-2.0 section 4(a) needs a copy of the License with each redistributed copy of the Work. MIT packages (React and others) need their notice too. See S-04.
- The model card quote: not checked. The text in `docs/model.md` came from a PDF text extraction that lost some letters. A human must compare it with the PDF pages before release. I did not open the PDF.

## Check 8: Browser test

Tool: my own script in the scratchpad. It used Playwright Chromium from the app `node_modules`. The built app ran under `vite preview` on `127.0.0.1:4199`, with the headers of `public/_headers`. Fake camera flags were on.

- Privacy, Load and Home screens: requests were `/`, the JavaScript file and the CSS file only. 0 foreign requests. 0 failed requests. 0 console errors or warnings. 0 dialogs.
- `securitypolicyviolation`: 2 events at each screen (S-02). With the fix of S-02: 0 events.
- The protocol with `<img onerror>` and `<script>` text loaded and created no element (check 3).
- Storage after the steps: `localStorage` had `mpfl.privacySeen` only. One IndexedDB database `mpfl-rehab`.
- The landmarker screens were not opened (the Start button stayed disabled for my small test protocol). `e2e/landmarker.spec.ts` covers the model load under the CSP on its test page.
- Every process I started was stopped by its process id. The scratch folders are removed.

## Controls that work

- Strict schemas with limits on every string, array and number. Unknown keys, `__proto__` and `constructor` keys are rejected.
- The size check before `JSON.parse`, in UTF-8 bytes. Error text is cut to 300 characters.
- No path from file data to HTML, a link or a style. A hostile protocol created no element.
- CSV quoting for every text cell, with the wide-character forms.
- One `getUserMedia` call with `audio: false`, many exit paths, and a generation counter for races.
- No API that can store or send a frame in `src` or in the built app code.
- The CSP in the header and the meta tag are equal. The built page has no inline script and no `eval` use of its own.
- Self-hosted model and WASM files. All hashes match. No foreign request in the browser run.
- Patient mode cannot change at runtime. The red-flag state cannot be skipped by storage or URL.
- Dependencies: 0 runtime audit findings, signed packages, exact versions, a tracked lock file with integrity hashes, no runtime install script.
- The stored protocol is validated again on every start.

## Not checked

- The full camera flow in the real UI (Setup and Session screens, all exit paths) in a browser. I relied on code reading and the existing tests.
- The model load and the frame rate in the real app. The Start button was disabled for my test protocol.
- The screens for export, import, clinician view and erase. They do not exist yet (T11). FR14, FR15 and FR16 need a new check after T11.
- Recharts under the CSP. It is not imported yet.
- WebRTC. The plan adds a second device (FR25). `connect-src` does not control WebRTC traffic. It needs its own review.
- The model card quote against the PDF. A human must do this.
- The legal reading of the model license and its entertainment-only wording.
- Deep JSON nesting limits in browsers. Only Node 24 was tried.
- Whether each `blob:` and `data:` source of the CSP is needed (S-14).
- The hosting setup (HTTPS, HSTS, the real header support of the host).
- `npm audit` for dev tools beyond the 9 listed findings. I did not run the full unit suite, `npm run e2e` or `npm run precheck`, as ordered.
