# MPFL Rehabilitation App: Plan

This file is the single source of truth. Research inputs are in `research/clinical.md`, `research/apps.md` and `research/tech.md`. Each fact there is marked VERIFIED or UNVERIFIED. This plan keeps those marks.

Status: plan reviewed (revision 2). Implementation not started. Date: 2026-11-08.

## 0. Progress checklist

- [x] Research: clinical, apps, technology (3 files, style check clean)
- [x] Skill discovery (section 4)
- [x] Requirements and architecture (sections 2 and 3)
- [x] Task plan (section 6)
- [x] Independent plan review, 3 reviewers, 36 findings (section 9)
- [ ] Implementation (tasks T0 to T15, section 6)
- [ ] Final independent audit (section 10)

## 1. Research findings and decisions

### 1.1 Clinical evidence (research/clinical.md)

- No validated MPFL reconstruction protocol exists. Hsu 2025 is the review with phase detail. It is a commentary of level of evidence 5. The systematic reviews are S2 to S5. Only 1 randomized trial was found among 85 studies.
- Sources disagree on weight-bearing, brace use, range-of-motion limits and return-to-sport timing. The app must not pick a side.
- Knee angle changes patellofemoral stress in healthy people (S14 to S18). The link to graft safety is UNVERIFIED.
- The red-flag items come from general practice. No opened source supports them or their thresholds. They are UNVERIFIED and the app text must say so.
- Hip angle, ankle angle, valgus thresholds and blood flow restriction after MPFL surgery have no evidence. The MVP does not use them.
- Section 9 of `research/clinical.md` lists 14 decisions that belong to the surgeon. The app shows them as "ask your surgeon" and sets no default.

### 1.2 Existing apps and reuse (research/apps.md)

| Item | License | Decision |
|---|---|---|
| MediaPipe Pose Landmarker (package) | Apache-2.0 | Adopt. The license of the model weights is UNVERIFIED. T8 checks it. |
| yakupzengin/fitness-trainer-pose-estimation | MIT | Borrow the idea of a rep-counter state machine. Copy no code. |
| free-exercise-db schema | Unlicense | Borrow the field names. Ship none of its images (origin UNVERIFIED). |
| UI-PRMD dataset | PDDL 1.0 | Skeleton data, not video. Use it only for counter tests in T4. |
| Ultralytics, wger code | AGPL-3.0 | Avoid |
| OpenPose | Non-commercial | Avoid |

No open-source project covers knee or MPFL rehab. The app builds the protocol layer itself.

### 1.3 Technology decisions (research/tech.md)

| Layer | Choice | Reason |
|---|---|---|
| Pose model | MediaPipe Pose Landmarker, `lite` model, self-hosted | Runs in the browser. Accuracy of `lite` is not known. T13 tests it. |
| Front end | Vite + React + TypeScript | Static build. No server to patch. |
| Storage | IndexedDB through Dexie | Local-first. No health data in the cloud. |
| Charts | Recharts, with a data table next to each chart | Fits React. The table gives accessibility. |
| Protocol and export files | JSON, checked by Zod | One format, strict limits. |
| Unit and component tests | Vitest, Testing Library, jsdom, fake-indexeddb | Same tool chain as Vite. |
| Browser tests | Playwright (Chromium and WebKit), Chromium fake webcam video | Tests the camera flow without a person. |
| Accessibility check | `@axe-core/playwright` and Lighthouse CLI | Objective score for NFR5. |

Versions come from `npm view` on 2026-11-08 (see `research/tech.md` section 1). T0 checks them again, pins exact versions, commits the lockfile and uses `npm ci`. T0 also checks the license of Zod and TypeScript and the peer dependencies of every plugin. If TypeScript 7.0.2 breaks a plugin, T0 pins the newest version that all plugins accept and records the reason.

Rejected: backend in the MVP, Next.js, MoveNet, server-side pose, native app, automatic progression. Reasons are in `research/tech.md` section 7.

### 1.4 Key decision: two stages

- MVP: static web app. Patient app and a read-only clinician view. No backend, no account, no upload.
- Future (not built): shared data with a hosted database, accounts and a live clinician dashboard. Supabase in an EU region is a candidate. EU hosting, multi-factor login, the data processing agreement and the price are all UNVERIFIED.

The clinician view reads a session file that the patient exports. It reuses the patient dashboard component with a different data source. It holds the file in memory only. It never writes to the local database.

Limits of this design: the file is unsigned and the patient can edit it. The file holds health data. Section 11 and `docs/clinical-limits.md` say this.

### 1.5 Intended purpose (draft, for expert review)

The app supports monitoring of exercise and symptoms under a protocol that a clinician sets. It counts reps, estimates knee angle, logs pain and swelling, and shows the trend. It gives no diagnosis. It gives no advice to change phase or load.

This is monitoring of an injury. Under EU MDR this is a medical purpose, so the app is probably medical device software (`research/tech.md` section 6.1, a reading and not a ruling). The class is not settled. The plan does not call the result "lower risk". An expert must read MDCG 2019-11 rev.1 and Annex VIII Rule 11 and set the class. The FDA general-wellness path likely does not fit (UNVERIFIED).

Control: a build flag `PATIENT_USE_APPROVED`. Without the flag, every screen shows "Prototype. Not for patient use." Nobody can set the flag as part of this work. It needs the expert result and clinician review.

Protocol rules:
- The app never changes the active phase. FR4 stops the app from progressing a phase. It cannot stop a user from editing the file.
- A protocol carries `authoredBy` and `approvedOn`. Home shows both. If they are missing, Home shows "No clinician approval recorded".
- The example protocol loads only in demo mode with a fixed banner. Patient mode refuses a protocol with no `approvedOn`.
- A clinician authoring form is future work (FR21). Until then, a developer or clinician edits JSON. This is a recorded gap.

## 2. Requirements

Priority: M = MVP, F = future. Each requirement has an acceptance criterion (AC) that a test or a check can prove.

### 2.1 Functional

| ID | P | Requirement | Acceptance criterion |
|---|---|---|---|
| FR1 | M | Load a protocol file. Reject an invalid file with a named error. Import limits: size cap 5 MB before parse, strict schema, maximum length on every string and array, unknown keys rejected. | Valid file loads. Tests: 5 invalid fixtures, oversized file, unknown key, string `<img onerror>`, key `__proto__`. Each is rejected or shown as plain text. |
| FR2 | M | The protocol holds `schemaVersion`, `side` (left or right), phases, exercises, target ROM, optional `maxFlexion` for each exercise, sets, reps, optional pain pause threshold, surgeon fields, `authoredBy` and `approvedOn`. A missing surgeon field shows "ask your surgeon". No default value appears. | Protocol with no brace field shows the text. Type test: surgeon fields have no default. |
| FR3 | M | One example protocol is built from the evidence. Each value has a `source` (S-number or PROPOSAL). It loads only in demo mode. A fixed banner reads "EXAMPLE, NOT APPROVED". | Banner appears on every route and on the error state. Patient mode refuses the example. |
| FR4 | M | The active phase comes only from the protocol field `activePhase`. The store is read-only and has no setter. | Type test: no setter. Grep check with this exact pattern in precheck: no `setActivePhase` and no write to `activePhase` outside `src/lib/protocol/`. |
| FR5 | M | Before each session, show the red-flag check from a fixed list (data file `src/lib/redflags.ts`). The list has two groups: "call your care team" and "call emergency services". The text says "general guidance, not verified for MPFL surgery". Any "yes" blocks the session and shows the message of its group. A direct route to the session screen redirects to the check. | Test for each item and each group. Playwright test opens the session route directly and lands on the check. |
| FR6 | M | Camera capture runs in the browser only. The app stores and sends no video or image. | Network log shows zero upload requests. A source search finds no `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. Test scans IndexedDB and localStorage for Blob and data URL values. |
| FR7 | M | Estimate knee flexion from hip, knee and ankle of the operated side. Skip a frame if any landmark has visibility below 0.5. Smooth the angle. Show it live. | Unit test on synthetic landmarks: error under 0.5 degrees without noise. Low-visibility frame returns null and the counter pauses. |
| FR8 | M | Count reps with a state machine. A rep counts only if the peak reaches the target and stays at or below `maxFlexion` if it is set. Above `maxFlexion` the app shows an alert and does not count the rep. | Unit tests: noise, partial rep, full rep, over-limit rep. |
| FR9 | M | Four exercises, all in side view: heel slide (peak flexion), straight leg raise (extension lag at the top), mini squat (depth cap), seated knee extension hold (hold time). | Each exercise has a definition, a counter test on synthetic traces and a replay test on recorded landmarks. |
| FR10 | M | Live cues as text, sound and a screen-reader live region: leg not visible, move into frame, rep counted, "stop at your limit, do not push". | Playwright finds the text. Testing Library asserts the audio call with a mock. |
| FR11 | M | The Session screen has a visible Stop button and a "knee gave way or hurts" button. Each ends the session and shows the care-team message. After a session, ask pain (0 to 10) and swelling (none, some, more than before). Save the session. | Test for each button. Session record holds both values. |
| FR12 | M | Safety floor: if pain is 7 or more, or swelling is "more than before", show "pause and contact your care team". This works with no protocol threshold. If the protocol sets a lower pain threshold, that value is used. The floor is an app rule and not a clinical default. | Tests: no threshold with pain 7, no threshold with swelling "more than before", threshold 5 with pain 5. |
| FR13 | M | Patient dashboard: ROM peak per session, reps per day, pain trend. Each chart has a data table. No goal, pass, fail or milestone wording or colour. | Chart and table show the same numbers. Banned-phrase check passes. |
| FR14 | M | Export all sessions as JSON and CSV. Both carry `schemaVersion`, app version, protocol id, and `angleMethod: "2D webcam estimate, not a goniometer measurement"`. The CSV first row holds the same text. Exports use a random pseudonymous id and no name, birth date or free text. CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return get a leading quote. Every text cell is quoted. The export screen warns that the file holds health data. The CSV is export only. | Round-trip test for JSON. CSV tests for quoting, commas and formula cells. |
| FR15 | M | Clinician view: open an exported JSON file. Reuse the dashboard. Show the session list and the pain log. Read-only. Memory only. | Fixture values match. Test: after load, IndexedDB is unchanged. Unknown schema version shows an error. |
| FR16 | M | Erase all local data with one action and a confirmation. It clears IndexedDB, localStorage, Cache storage and service workers. | After erase, all four are empty. |
| FR17 | M | Home shows the date of the last export and a reminder after 7 days. The app calls `navigator.storage.persist()` at the first save. | Test with a mocked clock and a mocked storage API. |
| FR18 | M | A short privacy notice screen. It says: no video leaves the device, a shared device means shared data, the export holds health data. | Screen exists and is linked from Home. |
| FR19 | F | Left and right comparison from two recordings. Label it "movement symmetry", never "LSI". | Not built. |
| FR20 | F | Frontal-plane valgus cue. Needs a validated threshold. | Not built. |
| FR21 | F | Clinician protocol authoring form, accounts, shared data, live dashboard, encrypted export. | Not built. |
| FR22 | F | Progression suggestions. Needs clinical validation and regulatory review. | Not built. |

### 2.2 Non-functional

| ID | Requirement | Acceptance criterion |
|---|---|---|
| NFR1 Privacy | No video leaves the device by design, proven by the network test. No third-party scripts. Self-host the model and WASM files. | Playwright network check: all requests go to the own origin. |
| NFR2 Claims | Every angle shows "estimated angle, not a medical measurement". No text says "clinically validated". No goal, pass, fail or milestone wording. | Text test on every route and error state. `claims-check.sh` passes. |
| NFR3 Accuracy | Document the angle error. Record that `lite` accuracy is not known. Run a Bland-Altman check if reference data exists. Reported errors range from about 3 to 15 degrees. The 15 degree figure is UNVERIFIED. | `docs/accuracy.md` holds real numbers or the statement that no reference data exists. |
| NFR4 Performance | Pose loop median is at least 15 frames per second over 60 seconds, headed Chromium, dev machine, `lite` model. Phone speed is UNVERIFIED until a phone test. | Median value recorded in `docs/accuracy.md`. |
| NFR5 Accessibility | WCAG 2.2 AA target. Keyboard use, large buttons, text alternatives for charts. | axe has 0 serious or critical issues. Lighthouse accessibility is 95 or more. Keyboard checklist in T12 is complete. |
| NFR6 Security | CSP and headers as in section 3.2. No `eval`. `wasm-unsafe-eval` only for MediaPipe. Lockfile, `npm ci`, exact versions, SHA-256 of model and WASM files checked at build. | `npm audit --omit=dev` shows 0 high. Hash check passes. Playwright reads the headers and finds 0 CSP violations. |
| NFR7 Simplicity | Dependencies stay inside the allowed list in this plan. No state library. No backend. | `scripts/deps-check.sh` compares `package.json` with `scripts/allowed-deps.txt`. |
| NFR8 Documentation | All docs follow the skill `simple-english`. | `ste-check.py` prints zeros on all docs. |
| NFR9 Camera | Ask for video only (`audio:false`), only after a button press and a short explanation. Stop all tracks on session end, `visibilitychange`, `pagehide`, route change and error. Warn that other people in the frame are in the video. | Test: `readyState` is `ended` after each exit path. Permission denied shows error text and a retry button. No-device case shows its own text. |
| NFR10 Untrusted input | File data shows as plain text only. No `dangerouslySetInnerHTML`. No link from file data. | Lint rule and tests with a script string and a link string. |

## 3. Architecture

Static single-page app. All code runs in the browser.

```
camera -> MediaPipe (WASM) -> landmarks -> visibility gate -> kneeAngle -> oneEuro -> counter -> session
                                                                                       |
protocol.json -> Zod schema -> read-only protocol store ------------------------------> UI
session -> Dexie (IndexedDB) -> dashboard, export (JSON, CSV)
exported JSON -> Zod schema -> memory only -> same dashboard (clinician view)
```

| Path | Content |
|---|---|
| `src/lib/angle.ts` | Pure function: knee angle and flexion |
| `src/lib/oneEuro.ts` | Pure filter (about 30 lines, own code) |
| `src/lib/counters.ts` | Pure counters. One interface, three variants: reps by peak, lag at top, hold timer |
| `src/lib/redflags.ts` | Red-flag list as data, two groups |
| `src/lib/protocol/` | Zod schema, loader, read-only store, example protocol |
| `src/lib/db.ts` | Dexie: sessions table |
| `src/lib/export.ts` | JSON and CSV export, import, CSV escaping |
| `src/pose/` | Camera and MediaPipe wrapper, visibility gate |
| `src/ui/` | Screens: Home, RedFlag, Session, Summary, Dashboard, Data, Privacy |
| `public/models/` | Self-hosted model and WASM files |
| `public/_headers` | Host header file for the policy in 3.2 |
| `scripts/` | `claims-check.sh`, `deps-check.sh`, `allowed-deps.txt`, hash check |
| `tests/` | Vitest and Playwright tests, fixtures |

Session record fields: date, exercise, side, reps, peak flexion, hold seconds, extension lag, pain, swelling, protocol id, phase, `schemaVersion`.

Reuse: MediaPipe, Dexie, Recharts, Zod. Own code: angle, filter, counters. These are small. A package adds risk and gives no gain.

### 3.1 Pose loop rule

The landmark loop writes to a ref or a canvas. React state updates at most 4 times each second. T8 logs long tasks and frame time. Exit rule: if the median is below 15 frames per second on a mid-range phone, move inference to a Web Worker with `createImageBitmap`. Until a phone test exists, the phone result is UNVERIFIED.

### 3.2 Security policy

Content-Security-Policy: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`. Style rules are adjusted only if Recharts or Vite need inline styles, and then T8 records why.

Other headers: `Permissions-Policy: camera=(self), microphone=()`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`. A static build sets no header. The file `public/_headers` serves hosts that read it (Netlify and Cloudflare Pages style). The `index.html` also carries a CSP meta tag, without `frame-ancestors`. T8 tests that the app works under this policy.

## 4. Agent and skill mapping

All skills and agent types below were checked against the lists of this session. A sub-agent does not load skills by itself, so each brief says "load skill X first".

### 4.1 Gaps found and decisions

| Need | Search result | Decision |
|---|---|---|
| MediaPipe pose skill | 4 skills in the registry. The best has 82 installs. | Not adopted. Under the 100-install caution line of `find-skills`. Use `context7-mcp` for current docs. |
| Rehab or physiotherapy skill | 4 skills, 11 installs or fewer | Not adopted. Not trustworthy for clinical content. |
| Safety wording and gating rules for this app | None | Create `mpfl-clinical-guardrails` (T1), project-local in `.claude/skills/`. |

### 4.2 Agents and skills by activity

| Activity | Agent | Skills and tools |
|---|---|---|
| Plan review | Security Engineer, Software Architect, Code Reviewer (read-only) | `owasp-security` (the review agent could not load it, so the main session applies it in T14) |
| Create skill | main session | `skill-creator:skill-creator`, `mcp__skillspector__scan_skill` |
| Scaffold, pure logic, tests | main session (Sonnet) | `vite-react-best-practices`, `context7-mcp`, Vitest |
| Pose wrapper and UI | Frontend Developer (Sonnet) | `vite-react-best-practices`, `frontend-design:frontend-design`, `mpfl-clinical-guardrails`, `web-design-guidelines` |
| Browser tests | Frontend Developer (Sonnet) | Playwright MCP tools, `chrome-devtools-mcp:a11y-debugging`. `frontend-verify` is specific to another project. |
| Docs | Technical Writer (Sonnet) | `simple-english:simple-english`, `ste-check.py` |
| Slice review | Code Reviewer (read-only) | `anti-slop-code:anti-slop-code` |
| Security audit | Security Engineer (read-only, findings only) | `owasp-security`, `security-review` |
| Final verdict | Opus, once, after Sonnet audit and test run | `OPUS-REASON: final-verdict` |

Routing: Sonnet runs the work. Haiku is not planned. Opus judges once at the end. Every brief says "clean up only what you created". Every delegated result gets one independent check (a test run or a diff read). Read-only agents write findings. The main session or the Frontend Developer applies fixes and re-runs the check.

## 5. Test strategy

| Level | Tool | Scope |
|---|---|---|
| Unit | Vitest | angle, filter, counters, schema, export, db (fake-indexeddb) |
| Replay | Vitest | recorded landmark JSON through the full chain (visibility, angle, filter, counter). No camera needed. |
| Component | Vitest + Testing Library | screens and rules with mocked pose input |
| End to end | Playwright, Chromium fake video, `--workers=1` | full session on a clip. Permission denied. No camera device. Direct route to Session. |
| WebKit smoke | Playwright WebKit | the app loads and the first screens work. Camera on iOS stays UNVERIFIED without a device. |
| Performance | Playwright, frame log | median over 60 seconds |
| Security | `npm audit`, headers test, network test, CSV tests | see NFR6 |
| Accuracy | Bland-Altman script | only if reference data exists |
| Clinical validation | Not possible here | See section 11 |

Test first: all logic code (T2 to T6, T9 and the rule parts of T10). UI layout is not test-first because the layout is judged by eye and by axe. Vitest runs with `--maxWorkers=2` and Playwright with `--workers=1`. The repo has no pipeline, so these run locally, one suite at a time.

## 6. Tasks (in order)

Format: Agent. Skills. Tech. Depends on. Steps. Tests. Acceptance. Result is filled in during execution.

### T0. Scaffold and version check
- Agent: main session. Skills: `vite-react-best-practices`, `context7-mcp`. Tech: Vite, React, TypeScript, Vitest, Testing Library, jsdom, fake-indexeddb, ESLint, Playwright, axe-core, Lighthouse CLI, Zod, Dexie, Recharts. Depends on: none.
- Steps: run `npm view` for each package. Check peer dependencies and the license of Zod and TypeScript. Create `app/` with Vite React TS. Install with exact versions. Commit the lockfile. Add scripts `dev`, `build`, `test`, `lint`, `typecheck`, `e2e`, `precheck`. Write `scripts/allowed-deps.txt` and `scripts/deps-check.sh`. Check that `ffmpeg` exists. On 2026-11-08 it was not installed. T7 needs it. If it cannot be installed without a system change, record the blocker and use the fallback of T7.
- Tests: `npm run typecheck`, `npm run build`, one smoke test, `deps-check.sh`.
- Acceptance: all pass. Versions match section 1.3 or each difference has a recorded reason. Licenses are recorded.
- Result: DONE 2026-11-08. typecheck, lint, test (1 test), deps-check and build pass. One difference: TypeScript is pinned to 6.0.3, because typescript-eslint 8.72.1 needs TypeScript below 6.1.0 and 7.0.2 failed `npm install`. Other versions match section 1.3. `@types/react` and `@types/react-dom` are 19.3.0. Licenses: Zod MIT, TypeScript Apache-2.0, axe-core MPL-2.0 (dev only). `ffmpeg` is not installed (see T7).

### T1. Skill `mpfl-clinical-guardrails`
- Agent: main session. Skills: `skill-creator:skill-creator`. Tech: SKILL.md, shell. Tools: `mcp__skillspector__scan_skill`. Depends on: none.
- Steps: write `.claude/skills/mpfl-clinical-guardrails/SKILL.md`. Content: banned claims, banned goal, pass, fail and milestone wording, and the "ask your surgeon" rule. Also red-flag behavior, no auto-progression, no LSI label for webcam data, the safety floor of FR12 and the camera rules. Required labels: "estimated angle, not a medical measurement" and "EXAMPLE, NOT APPROVED". Write `scripts/claims-check.sh` that searches the source for banned phrases and banned APIs (`MediaRecorder`, `toBlob`, `toDataURL`, `ImageCapture`, `dangerouslySetInnerHTML`).
- Tests: skillspector scan. The script fails on a fixture with a banned phrase and passes on a clean fixture.
- Acceptance: scan has no high finding. Script passes and fails as expected. The skill loads with the Skill tool. This task supports NFR2, NFR9 and NFR10.
- Result: pending.

### T2. Angle function and visibility gate
- Agent: main session. Skills: `context7-mcp` (landmark IDs). Tech: TypeScript, Vitest. Depends on: T0.
- Steps: test first. Implement `kneeAngle` and `flexion` with aspect-ratio scaling. Select landmarks 23, 25, 27 or 24, 26, 28 by `side`. Return null for a zero vector or a landmark with visibility below 0.5.
- Tests: straight leg gives flexion 0. Right angle gives 90. Non-square fixture. Zero vector gives null. Low visibility gives null.
- Acceptance: all pass. Error under 0.5 degrees on 20 synthetic poses (fixed seed).
- Result: pending.

### T3. One Euro filter
- Agent: main session. Skills: none (own 30 lines, reference DOI 10.1145/2207676.2208639). Tech: TypeScript, Vitest. Depends on: T0.
- Steps: test first. Take time in milliseconds as input.
- Tests: constant input stays constant. Noise fixture (seed 1, sigma 2 degrees, 300 samples, slow sine) has at least 50 percent lower variance. A step has bounded lag.
- Acceptance: all pass.
- Result: pending.

### T4. Counters
- Agent: main session. Skills: none. Tech: TypeScript, Vitest. Depends on: T2, T3.
- Steps: test first. Define one `ExerciseCounter` interface: `(state, sample) -> (state, event)`. Three variants. Reps by peak: two thresholds, minimum state time 300 ms as a start value, peak check, `maxFlexion` ceiling. Lag at the top. Hold timer: the hold must reach the minimum time and a drop resets it. A null sample pauses counting.
- Tests: jitter counts 0. Partial range counts 0. Ten full reps count 10. Over-limit rep gives an alert and counts 0. Hold resets on a drop. Null sample pauses.
- Acceptance: all pass. Hand mutation check: remove the hysteresis and the failing test name is recorded in section 8.
- Result: pending.

### T5. Protocol schema, red flags and example
- Agent: main session. Skills: `mpfl-clinical-guardrails`. Tech: Zod, TypeScript, Vitest. Depends on: T0, T1.
- Steps: test first. Strict schema with the import limits of FR1 and the fields of FR2. Read-only store (FR4). Write `src/lib/redflags.ts` from `research/clinical.md` section 7, two groups, each marked "general guidance, not verified for MPFL surgery". Write `example-protocol.json` from `research/clinical.md` sections 2 and 4, each value with `source`. Demo and patient modes.
- Tests: FR1 fixtures. Missing surgeon field gives the marker. Patient mode refuses a protocol with no `approvedOn` and refuses the example. Type test for no setter. Grep check for FR4 in precheck.
- Acceptance: all pass. Each value of the example has a `source`.
- Result: pending.

### T6. Storage and export
- Agent: main session. Skills: none. Tech: Dexie, fake-indexeddb, Vitest. Depends on: T5.
- Steps: test first. Sessions table with the fields in section 3. Export JSON and CSV (FR14). Import with the strict schema and `schemaVersion`. Erase (FR16). `persist()` call and last-export date (FR17).
- Tests: JSON round trip. Unknown version rejected. Duplicate import is rejected with a clear message (no merge in the MVP). CSV quoting, commas and formula cells. Erase clears all four stores. Pseudonymous id has no personal data.
- Acceptance: all pass.
- Result: pending.

### T7. Test clip and landmark fixtures
- Agent: main session. Skills: none. Tech: ffmpeg, Node. Depends on: T0.
- Steps: find a side-view exercise video with a permissive license (the license is recorded). If none exists, ask the user for a short consented clip, or record the gap as a blocker. Convert the clip with `ffmpeg` to the format that the Chromium fake video flag needs. Later, T8 runs the landmarker on it and stores the landmark JSON as a replay fixture. A stick-figure video is not used, because it gives no reliable landmarks.
- Tests: the converted file plays in Chromium with the fake video flag.
- Acceptance: clip with a recorded license and a known rep count exists. If it does not, section 11 records the blocker. T8 and T12 then use mocked landmarks and replay fixtures only.
- Result: pending.

### T8. Pose wrapper
- Agent: Frontend Developer (Sonnet). Skills: `context7-mcp`, `vite-react-best-practices`. Tech: `@mediapipe/tasks-vision`, TypeScript. Depends on: T0, T7.
- Steps: self-host the lite model and WASM in `public/models/`. Write `docs/model.md` with the quoted model card text, the source URL, the SHA-256 of each file and the Apache-2.0 LICENSE and NOTICE text. Add the build step that fails on a hash difference. Camera rules of NFR9. Pose loop rule of 3.1. Add `public/_headers` and the meta CSP of 3.2. Record landmark JSON from the T7 clip.
- Tests: Vitest with a mocked landmarker. Playwright: landmarks arrive on the fake video. `readyState` is `ended` after each exit path. Permission denied and no-device cases. The app runs with 0 CSP violations. The headers test reads the built output.
- Acceptance: no request leaves the own origin. The model card text is quoted in `docs/model.md`, or the model is not shipped. Hash check passes.
- Result: pending.

### T9. Exercise definitions
- Agent: main session. Skills: `mpfl-clinical-guardrails`. Tech: TypeScript, Vitest. Depends on: T4, T5, T8.
- Steps: test first. Define the four exercises of FR9 with start thresholds. Mark each threshold "tuning start value, not evidence". Add `maxFlexion` handling and the cue text "stop at your limit, do not push".
- Tests: synthetic trace for each exercise. Replay test with the recorded landmarks. Over-limit gives an alert.
- Acceptance: each of the four exercises has a passing counter test. The replay test counts the known number of reps within a tolerance of 1.
- Result: pending.

### T10. Session screens
- Agent: Frontend Developer (Sonnet). Skills: `frontend-design:frontend-design`, `mpfl-clinical-guardrails`, `web-design-guidelines`. Tech: React. Depends on: T6, T8, T9.
- Steps: build five screens. Home shows the active phase, approval fields, last export, banners and build flag text. RedFlag. Session shows video, live angle, rep count, cues, live region, and the Stop and "knee gave way" buttons. Summary asks pain and swelling, saves, and applies the safety floor. Privacy. Test first for the rule parts: red-flag block, safety floor, buttons.
- Tests: Testing Library for FR5, FR10 (audio mock), FR11, FR12. `claims-check.sh` passes. Every route shows the label "estimated angle, not a medical measurement" where an angle appears.
- Acceptance: FR3, FR5, FR10, FR11, FR12, FR17 and FR18 pass their tests.
- Result: pending.

### T11. Dashboards and data screen
- Agent: Frontend Developer (Sonnet). Skills: `frontend-design:frontend-design`, `web-design-guidelines`. Tech: Recharts, React. Depends on: T6, T10.
- Steps: one Dashboard component with a data source prop. Patient mode reads Dexie. Clinician mode reads a parsed file in memory. Data screen: export with warning, import check, erase with confirmation. No goal or milestone wording or colour.
- Tests: chart and table show equal numbers. Clinician fixture values. IndexedDB unchanged after clinician load. Erase flow.
- Acceptance: FR13 to FR16 pass.
- Result: pending.

### T12. End-to-end tests
- Agent: Frontend Developer (Sonnet). Skills: Playwright MCP, `chrome-devtools-mcp:a11y-debugging`. Tech: Playwright (Chromium and WebKit), axe. Depends on: T10, T11.
- Steps: full flows: load protocol, red flag, direct route redirect, session, summary, dashboard, export, clinician view, erase. WebKit smoke flow. Keyboard checklist: every control reachable by Tab, visible focus, Escape closes dialogs, Stop button reachable by keyboard.
- Tests: the flows above, network check for FR6 and NFR1, axe, Lighthouse.
- Acceptance: flows pass. Zero foreign requests. axe has 0 serious or critical issues. Lighthouse accessibility is 95 or more. Keyboard checklist is complete.
- Result: pending.

### T13. Accuracy and performance record
- Agent: main session. Skills: none. Tech: Node script, Playwright. Depends on: T8, T12.
- Steps: measure the frame rate (median over 60 seconds, headed Chromium). Write the Bland-Altman script for paired data. Without reference data, write that fact. Add a manual iOS Safari checklist (HTTPS, user gesture to start, `playsinline`, orientation). Record the iOS result as UNVERIFIED if no device exists. Test whether `lite` accuracy can be assessed. Do not invent numbers.
- Tests: the script runs on a small synthetic pair file.
- Acceptance: `docs/accuracy.md` holds measured numbers or a clear statement of no reference data. It states that errors of about 3 to 15 degrees are reported (the 15 degree figure is UNVERIFIED).
- Result: pending.

### T14. Security pass
- Agent: Security Engineer (read-only, findings only). Skills: `owasp-security`, `security-review`. Tech: review, `npm audit`. Depends on: T12.
- Steps: review code, policy, file import, CSV export, camera handling, dependencies. Run `npm audit --omit=dev`, `npm audit signatures` and a license check. The main session applies fixes and re-runs the checks.
- Tests: audit commands. A CSV cell test (also in T6) is rechecked.
- Acceptance: 0 high findings open. Severity scale: high means data exposure or a safety rule bypass. Medium findings are fixed or recorded.
- Result: pending.

### T15. Documentation
- Agent: Technical Writer (Sonnet). Skills: `simple-english:simple-english`. Depends on: T12, T13, T14.
- Steps: write `README.md` (run, test, build). Write `docs/clinical-limits.md`. It holds what the app does not do, the 14 surgeon decisions, the unsigned file, the angle error margin and the intended-purpose draft. Write `docs/architecture.md` (short, link to this plan). Add a diagram only if it removes words.
- Tests: `ste-check.py` on all docs.
- Acceptance: zero hits. Another agent follows the README on a clean clone and the app runs.
- Result: pending.

## 7. Completion criteria

Done means every command below passes. Evidence goes in section 8.

1. `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass.
2. `npm run e2e` passes (Chromium and WebKit smoke).
3. `scripts/claims-check.sh` and `scripts/deps-check.sh` pass.
4. `npm audit --omit=dev` shows 0 high. The model hash check passes.
5. axe shows 0 serious or critical issues. Lighthouse accessibility is 95 or more.
6. `python3 ~/.claude/scripts/ste-check.py` prints zeros on all docs.
7. `docs/accuracy.md` and `docs/clinical-limits.md` exist.
8. The traceability table in section 8 maps FR1 to FR18 and NFR1 to NFR10 to a passing test name.
9. Review agents have 0 open high findings. A high finding is a data exposure or a bypass of a safety rule.

## 8. Verification evidence

Each line: task, command, result, date. The traceability table is added when T12 ends.

(empty)

## 9. Independent plan review

Three read-only agents reviewed revision 1: Security Engineer (clinical safety, regulatory, privacy), Software Architect (technology, KISS) and Code Reviewer (requirements, tests). They reported 36 findings. Result: 33 accepted, 2 partly accepted and 1 rejected.

Accepted, with the change:
- Task order: exercise definitions now come before the session screens (T9 before T10). A test clip task (T7) comes before the pose wrapper. The counter has three variants. T7 no longer depends on the angle function.
- Safety: fixed red-flag list with two groups and the UNVERIFIED mark (FR5). Safety floor for pain and swelling (FR12). Stop button and "knee gave way" button (FR11). Ceiling `maxFlexion` and a live cue (FR8, FR10).
- Protocol trust: demo mode, `authoredBy`, `approvedOn`, build flag `PATIENT_USE_APPROVED`, read-only store with a type test, honest limit in 1.5 (FR2 to FR4).
- Intended purpose: draft statement in 1.5. The words "lower risk" are removed.
- Exports: `schemaVersion`, app version and `angleMethod` in every export. Pseudonymous id. CSV escaping moved to T6 (FR14). No goal or milestone wording (FR13).
- Import: size cap, strict schema, maximum lengths, plain-text rule, memory-only clinician view (FR1, FR15, NFR10).
- Security: concrete policy and header file (3.2). Lockfile, exact versions, model hash (NFR6). Camera rules (NFR9).
- Privacy and storage: export warning, privacy notice, wider erase, `persist()` and export reminder (FR14 to FR18).
- Tests: WebKit smoke, permission denied, no device, direct route and replay tests. Also a method for the frame rate and a fixed noise fixture. Completion criteria are objective, with a traceability table, a dependency check script and a test-first scope.
- Marks restored: model license, "by design" wording for privacy, Supabase facts, review wording, error range.
- Dependencies: T0 installs all tools. TypeScript license and peer dependencies are checked.

Partly accepted:
- Reuse the dashboard for the clinician view: accepted. The separate screen is removed.
- Replace Dexie with a lighter store: rejected. Dexie is small and the allowed list keeps it. Revisit only if T0 finds a problem.
- Encrypted export: moved to future (FR21) to keep the MVP simple. The export warning covers the risk for now.

Rejected:
- "Skill names look invented" (Software Architect, finding 11). All names are in the skill list of this session. The reviewer searched the wrong folder. The part about the briefs was accepted (section 4).

## 10. Final audit

An independent agent maps each requirement to a passing test. An Opus agent gives one final verdict after that (`OPUS-REASON: final-verdict`). The report lives in `docs/final-audit.md`.

(pending)

## 11. Blockers, limits and open items

Clinical limits are in `research/clinical.md` and `docs/clinical-limits.md`. This list holds only what blocks release or what is still open.

- Clinical validation is not possible in this work. A qualified clinician must review every protocol value before any patient uses the app.
- Regulatory class is not settled (section 1.5). An expert must confirm it. The app is not for public release before this.
- A 2D webcam angle is not a clinical measurement. One opened study shows limits of agreement of about 9 degrees (DOI 10.3390/s26185890). Other reports are UNVERIFIED. Accuracy of the `lite` model is not known.
- MediaPipe model license, phone frame rates, iOS Safari camera rules and Safari storage eviction are UNVERIFIED. T8 and T13 address them. Safari can delete site data after about 7 days of no use. FR17 reduces this risk.
- No consented side-view clip exists yet (T7). Without one, the full chain is tested only with mocked landmarks.
- The exported file is unsigned and holds health data. The data controller for the file exchange is an open question for the expert. A DPIA and a consent flow are needed before the future stage.
- A clinician authoring form does not exist. Protocol files are edited by hand until FR21.
- Institution protocols (Dartmouth, Lahey, Mayo, UVA, Bankston) are UNVERIFIED. The example protocol does not use them.
