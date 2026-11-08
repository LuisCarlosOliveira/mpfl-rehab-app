# MPFL Rehabilitation App: Plan

This file is the single source of truth. Research inputs are in `research/clinical.md`, `research/apps.md` and `research/tech.md`. Each fact there is marked VERIFIED or UNVERIFIED. This plan keeps those marks.

Status: revision 3. T0 to T6, T8 and T9 are done. T7 is blocked. Date: 2026-11-08.

## 0. Progress checklist

- [x] Research: clinical, apps, technology (3 files, style check clean)
- [x] Skill discovery (section 4)
- [x] Requirements and architecture (sections 2 and 3)
- [x] Task plan (section 6)
- [x] Independent plan review, 3 reviewers, 36 findings (section 9)
- [x] Form and GitHub investigations (3 reports) folded into the plan (revision 3, section 9)
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
- Form monitoring (`research/form.md` and `research/form-opus.md`): two independent reports agree on the core. No validated threshold exists for valgus, trunk lean, pelvic drop or landing after MPFL reconstruction. No study links a movement pattern to recurrence. A clinician can still set a limit for one patient, and the app can report a measured value against it.
- The patellofemoral pain guideline (Willy 2019, Grade B) advises against visual biofeedback on knee alignment. So the app gives no live alignment cue. Frontal-plane data is future work and is for the clinician only.
- The 2D side-view knee error is about 9 degrees (Okuno 2026, heavy model, still photos). No study measured the `lite` model in live video. T13 must measure it.

### 1.2 Existing apps and reuse (research/apps.md)

| Item | License | Decision |
|---|---|---|
| MediaPipe Pose Landmarker (package) | Apache-2.0 | Adopt. The license of the model weights is UNVERIFIED. T8 checks it. |
| yakupzengin/fitness-trainer-pose-estimation | MIT | Borrow the idea of a rep-counter state machine. Copy no code. |
| free-exercise-db schema | Unlicense | Borrow the field names. Ship none of its images (origin UNVERIFIED). |
| UI-PRMD dataset | PDDL 1.0 | Skeleton data, not video. Use it only for counter tests in T4. |
| Ultralytics, wger code | AGPL-3.0 | Avoid |
| OpenPose | Non-commercial | Avoid |
| leonardo-carnevalli/pose-rep-counter | MIT | Borrow patterns: cues as data, visibility gates, landmark replay test, noise sweep script |
| montasim/repstate | MIT | Borrow patterns: pure state machine with a fake clock, recorded landmark fixtures with known counts |
| SAMARTHJAISWAL/repcount | MIT | Borrow patterns: aria-live announcer, pixel-aspect angle test |
| julienjave/Stride-frontend | Apache-2.0 | Borrow patterns: patient and clinician screens, pain charts |
| SlightlyDazed/openkick | GPL-3.0 | Idea only: report of MediaPipe knee error against a lab dataset (use for T13) |

No open-source project covers knee or MPFL rehab. The app builds the protocol layer itself.

The feature survey is in `research/github-features.md`. A spot check of the top two repos confirmed their MIT license and push dates through the API. The LICENSE text was not read (UNVERIFIED). These repos are new, small and have one author each. So the plan copies no code and borrows patterns only. Ten features have no reference repo, for example the protocol schema, the red-flag check, the hold timer and the read-only clinician view. The app builds them.

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

This is monitoring of an injury. Under EU MDR this is a medical purpose, so the app is probably medical device software (`research/tech.md` section 6.1, a reading and not a ruling). The class is not settled. The plan does not call the result "lower risk". An expert must read MDCG 2019-11 rev.1 and Annex VIII Rule 11 and set the class. The FDA general-wellness path likely does not fit (UNVERIFIED). Form feedback cannot lower the class. MDCG 2019-11 rev.1 says Rule 11 applies to most software with a medical purpose (a reading from the research, not legal advice). A claim about correct form needs clinical evidence that does not exist for MPFL surgery. So the app reports measured values against limits that a clinician sets, and it never judges form.

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
| FR2 | M | The protocol holds `schemaVersion`, `side` (left or right), phases, exercises, target ROM, optional `maxFlexion` for each exercise, optional `minRepSeconds`, optional `maxTopFlexion` for the straight leg raise (not smaller than the margin), sets, reps, optional pain pause threshold, surgeon fields, `authoredBy` and `approvedOn`. A missing surgeon field shows "ask your surgeon". No default value appears. | Protocol with no brace field shows the text. Type test: surgeon fields have no default. |
| FR3 | M | One example protocol is built from the evidence. Each value has a `source` (S-number or PROPOSAL). It loads only in demo mode. A fixed banner reads "EXAMPLE, NOT APPROVED". | Banner appears on every route and on the error state. Patient mode refuses the example. |
| FR4 | M | The active phase comes only from the protocol field `activePhase`. The store is read-only and has no setter. | Type test: no setter. Grep check with this exact pattern in precheck: no `setActivePhase` and no write to `activePhase` outside `src/lib/protocol/`. |
| FR5 | M | Before each session, show the red-flag check from a fixed list (data file `src/lib/redflags.ts`). The list has two groups: "call your care team" and "call emergency services". The text says "general guidance, not verified for MPFL surgery". Any "yes" blocks the session and shows the message of its group. A direct route to the session screen redirects to the check. | Test for each item and each group. Playwright test opens the session route directly and lands on the check. |
| FR6 | M | Camera capture runs in the browser only. The app stores and sends no video or image. | Network log shows zero upload requests. A source search finds no `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. Test scans IndexedDB and localStorage for Blob and data URL values. |
| FR7 | M | Estimate knee flexion from hip, knee and ankle of the operated side. Skip a frame if any landmark has visibility below 0.5. Smooth the angle. Show it live. | Unit test on synthetic landmarks: error under 0.5 degrees without noise. Low-visibility frame returns null and the counter pauses. |
| FR8 | M | Count reps with a state machine. A rep counts if the peak reaches the target minus the margin. Within the margin of `maxFlexion`, show "close to your limit, stop". Above `maxFlexion` plus the margin, show an alert and do not count the rep. The margin is a start value of 9 degrees. It is UNVERIFIED for the `lite` model. | Unit tests at limit minus margin, at the limit and at limit plus margin. Noise test with an error equal to the margin. |
| FR9 | M | Four exercises, all in side view: heel slide (peak flexion), straight leg raise (estimated knee angle at the top, shown as a number), mini squat (depth cap), seated knee extension hold (hold time). | Each exercise has a definition, a counter test on synthetic traces and a replay test on recorded landmarks. The word "lag" appears only when the clinician sets a limit larger than the margin. |
| FR10 | M | Live cues as text, sound and a screen-reader live region: leg not visible, move into frame, rep counted, "stop at your limit, do not push". | Playwright finds the text. Testing Library asserts the audio call with a mock. |
| FR11 | M | The Session screen has a visible Stop button and a "knee gave way or hurts" button. Each ends the session and shows the care-team message. After a session, ask pain (0 to 10) and swelling (none, some, more than before). Save the session. | Test for each button. Session record holds both values. |
| FR12 | M | Safety floor: if pain is 7 or more, or swelling is "more than before", show "pause and contact your care team". This works with no protocol threshold. If the protocol sets a lower pain threshold, that value is used. The floor is an app rule and not a clinical default. | Tests: no threshold with pain 7, no threshold with swelling "more than before", threshold 5 with pain 5. |
| FR13 | M | Patient dashboard: ROM peak per session, reps per day, pain trend. Each chart has a data table. No goal, pass, fail or milestone wording or colour. | Chart and table show the same numbers. Banned-phrase check passes. |
| FR14 | M | Export all sessions as JSON and CSV. Both carry `schemaVersion`, app version, protocol id, and `angleMethod: "2D webcam estimate, not a goniometer measurement"`. The CSV first row holds the same text. Exports use a random pseudonymous id and no name, birth date or free text. CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return get a leading quote. Every text cell is quoted. The export screen warns that the file holds health data. The CSV is export only. | Round-trip test for JSON. CSV tests for quoting, commas and formula cells. |
| FR15 | M | Clinician view: open an exported JSON file. Reuse the dashboard. Show the session list and the pain log. Read-only. Memory only. | Fixture values match. Test: after load, IndexedDB is unchanged. Unknown schema version shows an error. |
| FR16 | M | Erase all local data with one action and a confirmation. It clears IndexedDB, localStorage, Cache storage and service workers. | After erase, all four are empty. |
| FR17 | M | Home shows the date of the last export and a reminder after 7 days. The app calls `navigator.storage.persist()` at the first save. | Test with a mocked clock and a mocked storage API. |
| FR18 | M | A short privacy notice screen. It says: no video leaves the device, a shared device means shared data, the export holds health data. | Screen exists and is linked from Home. |
| FR23 | M | Movement cues in neutral wording, from a fixed list in `src/lib/cues.ts`: below the target, close to the limit, above the limit, rep faster than the minimum rep time, leg not visible, estimated angle at the top. Each cue says what was measured. An in-range rep shows nothing, because "within range" reads as a pass. No right or wrong, no good or bad, no score, no pass or fail, and no green or red verdict colour. | One test for each cue. The banned-word check on `src/ui` and `src/lib/cues.ts` finds none of the words in the guardrail skill. A test finds no green or red verdict style in the UI. |
| FR19 | F | Left and right comparison from two recordings. Label it "movement symmetry", never "LSI". | Not built. |
| FR20 | F | Frontal-plane valgus, trunk lean, hip drop and any "correct form" label. No validated threshold exists (`research/clinical.md` section 4). | Not built. |
| FR21 | F | Clinician protocol authoring form, accounts, shared data, live dashboard, encrypted export. | Not built. |
| FR24 | F | Front-view set: knee moving inward as a change from the start of the rep. Recorded for the clinician, with a stick-figure replay from stored landmarks (no image). No live cue. Needs an own accuracy test and a clinician limit. | Not built. |
| FR22 | F | Progression suggestions. Needs clinical validation and regulatory review. | Not built. |

### 2.2 Non-functional

| ID | Requirement | Acceptance criterion |
|---|---|---|
| NFR1 Privacy | No video leaves the device by design, proven by the network test. No third-party scripts. Self-host the model and WASM files. | Playwright network check: all requests go to the own origin. |
| NFR2 Claims | Every angle shows "estimated angle, not a medical measurement". No text says "clinically validated". No goal, pass, fail or milestone wording. | Text test on every route and error state. `claims-check.sh` passes. |
| NFR3 Accuracy | Document the angle error. Record that `lite` accuracy is not known. Run a Bland-Altman check if reference data exists. Reported errors range from about 3 to 15 degrees. The 15 degree figure is UNVERIFIED. The app uses a start margin of 9 degrees (Okuno 2026, heavy model, still photos). It is UNVERIFIED for `lite`. | `docs/accuracy.md` holds real numbers or the statement that no reference data exists. |
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

Session record fields: date, exercise, side, reps, peak flexion, hold seconds and `topFlexion` (the estimated angle at the top). Also margin degrees, margin source, pain, swelling, protocol id, phase and `schemaVersion`.

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
- Result: DONE with one open item, 2026-11-08. `SKILL.md` and `app/scripts/claims-check.sh` exist. skillspector scan (static only, the LLM pass was off): risk score 0, no findings. The script was tested on fixtures. A bad fixture fails with exit 1. A clean fixture and a fixture with the allow marker pass. `src` passes. Style check on the skill file: zeros. Open item: the Skill tool does not load the skill in this session, because the session skill list is fixed at start (`Unknown skill`). It must load in a new session in this folder. This is not yet shown. Until then, each brief for an agent says: read `.claude/skills/mpfl-clinical-guardrails/SKILL.md` first.

### T2. Angle function and visibility gate
- Agent: main session. Skills: `context7-mcp` (landmark IDs). Tech: TypeScript, Vitest. Depends on: T0.
- Steps: test first. Implement `kneeAngle` and `flexion` with aspect-ratio scaling. Select landmarks 23, 25, 27 or 24, 26, 28 by `side`. Return null for a zero vector or a landmark with visibility below 0.5.
- Tests: straight leg gives flexion 0. Right angle gives 90. Non-square fixture. Zero vector gives null. Low visibility gives null.
- Acceptance: all pass. Error under 0.5 degrees on 20 synthetic poses (fixed seed).
- Result: DONE 2026-11-08. `tests/angle.test.ts`, 13 tests. The tests were red first (module missing). Error is under 0.5 degrees on 20 seeded synthetic poses. Self-review found two weak tests before the code was written. One was a perpendicular aspect-ratio case that proves nothing. The other was a convoluted pose builder. Both were rewritten.

### T3. One Euro filter
- Agent: main session. Skills: none (own 30 lines, reference DOI 10.1145/2207676.2208639). Tech: TypeScript, Vitest. Depends on: T0.
- Steps: test first. Take time in milliseconds as input.
- Tests: constant input stays constant. Noise fixture (seed 1, sigma 2 degrees, 300 samples, slow sine) has at least 50 percent lower variance. A step has bounded lag.
- Acceptance: all pass.
- Result: DONE 2026-11-08. `tests/oneEuro.test.ts`, 5 tests. The acceptance metric changed. The plan said the variance of the error against the truth must drop 50 percent. The first run failed (6.3 against 3.8). The cause is lag of the low-pass filter on a 30 degree sine, not a filter fault. The test now measures jitter (variance of sample-to-sample differences) and drops by at least 50 percent. Lag is covered by the step test. The metric change is a deliberate decision, recorded here.

### T4. Counters
- Agent: main session. Skills: none. Tech: TypeScript, Vitest. Depends on: T2, T3.
- Steps: test first. Define one `ExerciseCounter` interface: `(state, sample) -> (state, event)`. Three variants. Reps by peak: two thresholds, minimum state time 300 ms as a start value, peak check, `maxFlexion` ceiling. Lag at the top. Hold timer: the hold must reach the minimum time and a drop resets it. A null sample pauses counting.
- Tests: jitter counts 0. Partial range counts 0. Ten full reps count 10. Over-limit rep gives an alert and counts 0. Hold resets on a drop. Null sample pauses.
- Acceptance: all pass. Hand mutation check: remove the hysteresis and the failing test name is recorded in section 8.
- Result: DONE 2026-11-08. `tests/counters.test.ts`, 15 tests for reps, hold and lag. Mutation check by hand: replace `>= cfg.minStateMs` with `>= 0`. First run, 1 test failed ("ignores a spike shorter than the minimum state time"). That showed the jitter test was weak, so a test for jitter around the exit threshold was added. Second run, 2 tests fail. They are the exit-jitter test and the spike test. The code was restored and 29 of 29 tests pass.

### T5. Protocol schema, red flags and example
- Agent: main session. Skills: `mpfl-clinical-guardrails`. Tech: Zod, TypeScript, Vitest. Depends on: T0, T1.
- Steps: test first. Strict schema with the import limits of FR1 and the fields of FR2. Read-only store (FR4). Write `src/lib/redflags.ts` from `research/clinical.md` section 7, two groups, each marked "general guidance, not verified for MPFL surgery". Write `example-protocol.json` from `research/clinical.md` sections 2 and 4, each value with `source`. Demo and patient modes.
- Tests: FR1 fixtures. Missing surgeon field gives the marker. Patient mode refuses a protocol with no `approvedOn` and refuses the example. Type test for no setter. Grep check for FR4 in precheck.
- Acceptance: all pass. Each value of the example has a `source`.
- Result: DONE 2026-11-08. 36 new tests in `tests/protocol.test.ts` and `tests/redflags.test.ts`. Tests were written first. The suite has 64 tests and all pass. `typecheck`, `lint` and `precheck` exit 0. The `@ts-expect-error` lines prove the store has no setter, because `tsc` fails if the store becomes writable. Mutation check: remove `Object.freeze(value)` from the store and the freeze test fails. Code restored. `scripts/phase-check.sh` is the FR4 grep check. It is in `precheck`. It fails on a write outside `src/lib/protocol/` and passes on a read and on a write inside the folder (fixture test). Deviation from the plan wording: the plan said every value of the example has a `source`. The schema has one `source` text for each exercise, and that text names the source of each value. Every value that is only a design suggestion says PROPOSAL. The example is marked `example: true` and has no `approvedOn`. The red-flag list has 3 emergency items and 4 care-team items.

### T6. Storage and export
- Agent: main session. Skills: none. Tech: Dexie, fake-indexeddb, Vitest. Depends on: T5.
- Steps: test first. Sessions table with the fields in section 3. Export JSON and CSV (FR14). Import with the strict schema and `schemaVersion`. Erase (FR16). `persist()` call and last-export date (FR17).
- Tests: JSON round trip. Unknown version rejected. Duplicate import is rejected with a clear message (no merge in the MVP). CSV quoting, commas and formula cells. Erase clears all four stores. Pseudonymous id has no personal data.
- Acceptance: all pass.
- Result: DONE 2026-11-08. `tests/storage.test.ts`, 26 tests, written first (red: module missing). Suite is 90 tests, all pass. `typecheck` and `lint` exit 0. Mutation checks: without the CSV formula guard, 6 tests fail. Without the duplicate check, 1 test fails. Code restored and byte-identical. Code is in `src/lib/storage/` (`db.ts`, `export.ts`, `meta.ts`). The tests also cover these cases. Round trip of 3 sessions. Unknown version, corrupt file, unknown key, `__proto__` and oversize file. No database write by `parseExport`. Export with fixed fields only. `persist()` asked once. The 7-day reminder with a fixed clock. Erase of IndexedDB, localStorage, Cache storage and service workers. Limits: the erase test uses mocks for Cache storage and service workers. A real browser check is part of T12. The 5 MB cap checks string length and not bytes. For text with many multi-byte characters the real size is larger. This is a known gap and it is low risk, because the schema also limits every field.

### T7. Test clip and landmark fixtures
- Agent: main session. Skills: none. Tech: ffmpeg, Node. Depends on: T0.
- Steps: find a side-view exercise video with a permissive license (the license is recorded). If none exists, ask the user for a short consented clip, or record the gap as a blocker. Convert the clip with `ffmpeg` to the format that the Chromium fake video flag needs. Later, T8 runs the landmarker on it and stores the landmark JSON as a replay fixture. A stick-figure video is not used, because it gives no reliable landmarks.
- Tests: the converted file plays in Chromium with the fake video flag.
- Acceptance: clip with a recorded license and a known rep count exists. If it does not, section 11 records the blocker. T8 and T12 then use mocked landmarks and replay fixtures only.
- Result: BLOCKED, fallback used, 2026-11-08. Two web searches found no side-view bodyweight clip with a clear license. Wikimedia Commons has a rear-view weighted squat (CC BY 3.0) and animated GIFs (not video). Pexels has a gym barbell squat clip. Its license was seen only in search summaries and is UNVERIFIED. The plan does not commit that clip, because the Pexels terms can limit redistribution. `ffmpeg` is also not installed. Decision: no clip in the repo. T8 and T12 use mocked landmarks and synthetic replay traces. These test the chain from landmark to counter. They do not test the pose model on real video. The full pose chain stays UNVERIFIED on video until a consented clip exists. Action for the user: provide a short side-view clip of heel slides or mini squats with consent, and install `ffmpeg`. Section 11 lists this.

### T8. Pose wrapper
- Agent: Frontend Developer (Sonnet). Skills: `context7-mcp`, `vite-react-best-practices`. Tech: `@mediapipe/tasks-vision`, TypeScript. Depends on: T0, T7.
- Steps: self-host the lite model and WASM in `public/models/`. Write `docs/model.md` with the quoted model card text, the source URL, the SHA-256 of each file and the Apache-2.0 LICENSE and NOTICE text. Add the build step that fails on a hash difference. Camera rules of NFR9. Pose loop rule of 3.1. Add `public/_headers` and the meta CSP of 3.2. Record landmark JSON from the T7 clip.
- Tests: Vitest with a mocked landmarker. Playwright: landmarks arrive on the fake video. `readyState` is `ended` after each exit path. Permission denied and no-device cases. The app runs with 0 CSP violations. The headers test reads the built output.
- Acceptance: no request leaves the own origin. The model card text is quoted in `docs/model.md`, or the model is not shipped. Hash check passes.
- Result: DONE with open items, 2026-11-08. Built by a Frontend Developer agent and checked again by the main session. `npm run precheck` exits 0: 147 unit tests pass (36 are new, in `tests/pose`), plus `model-hash-check`, `deps-check`, `claims-check` and `phase-check`. `npm run e2e` passes 10 of 10. The tests cover camera stop on 5 exit paths and the headers. They also cover the landmarker under the CSP with 0 violations and own-origin requests only, permission denied with retry, and no camera device. Files: `src/pose/` (camera, landmarker, loop), `public/models/` (lite model, 4 WASM files, `SHA256SUMS`), `public/_headers`, `playwright.config.ts`, `e2e/`, `docs/model.md`. Deviations: (1) MediaPipe sends usage metrics to a Google address with `fetch`. The CSP blocks it, but that counts as a violation. The agent added `blockForeignFetch()`, which replaces `fetch` for the whole page and fails any foreign request. It is tested. T14 reviews it. (2) Playwright has 3 projects. The `denied` project uses the full Chromium build, because the headless shell returns a different error. (3) `vite.config.ts` reads `public/_headers` so that `vite preview` sends the real headers. Open items: (a) The model card says Apache License 2.0 and says the model is for entertainment and not for life-critical decisions. No separate license file for the weights exists. The user and a legal review must decide whether this is enough to ship the model. (b) The model card quotes were read from a text extraction that lost some letters. A person must compare them with the PDF. (c) UNVERIFIED: landmarks from real video (the fake camera shows no person), phone speed, and the frame rate (T13). (d) The repo now holds about 44 MB of model and WASM files. The hash check keeps them exact.

### T9. Exercise definitions
- Agent: main session. Skills: `mpfl-clinical-guardrails`. Tech: TypeScript, Vitest. Depends on: T4, T5, T8.
- Steps: test first. Define the four exercises of FR9 with start thresholds. Mark each threshold "tuning start value, not evidence". Add `maxFlexion` handling and the cue text "stop at your limit, do not push".
- Tests: synthetic trace for each exercise. Replay test with the recorded landmarks. Over-limit gives an alert.
- Acceptance: each of the four exercises has a passing counter test. The replay test counts the known number of reps within a tolerance of 1.
- Result: DONE with a limit, 2026-11-08. `src/lib/exercises.ts` and `tests/exercises.test.ts` (20 tests, helper `tests/helpers/leg.ts`). Written first. The suite has 111 tests and all pass. `typecheck` and `lint` exit 0. The four exercises are defined. A missing target or hold time gives `ask-your-surgeon` and no default. Replay tests run synthetic landmarks through the whole chain: visibility, angle, filter and counter. Ten heel slides with landmark noise count 10. An over-limit peak counts 0 and gives an alert. The mini squat ceiling works. A lost leg pauses and keeps the count. The hold resets on a bend. The straight leg raise reports the worst lag. Mutation checks: no settle time (1 test fails), no minimum target (1 test fails), ceiling dropped (4 tests fail). Code restored and identical. Design fix found while writing the replay test: the straight leg raise lag is read only after 500 ms of raise. The filter starts at 0. Without the wait, every lift reports a lag of about 0. Change to T4: the hold counter has a `direction` (at least or at most), so the extension hold works. Limit: the replay uses synthetic landmarks. It does not test the pose model on real video. This is the T7 blocker.

### T9b. Margin rule and movement cues
- Agent: main session. Skills: `mpfl-clinical-guardrails`. Tech: TypeScript, Zod, Vitest. Depends on: T4, T5, T6, T9.
- Steps: test first. Add `src/lib/margin.ts` with `MARGIN_DEG = 9` and its source text ("start value, UNVERIFIED for lite, Okuno 2026"). Make the rep counter margin-aware (FR8). Count from target minus margin. Warn from limit minus margin with the event `near-limit`. Refuse the count above limit plus margin. Add the rep duration and the event `too-fast` when a counted rep is shorter than `minRepSeconds` (PROPOSAL start value 2 s). Add `minRepSeconds` and `maxTopFlexion` to the protocol schema. Zod rejects a `maxTopFlexion` smaller than the margin and the error text names the margin. Rename `extensionLag` to `topFlexion` in the pipeline, the session schema, the export schema and the tests. Add `marginDeg` and `marginSource` to the session record and the export. Write `src/lib/cues.ts`: a fixed list from key to text, no free text, and no cue for an in-range rep. A failed visibility gate gives "cannot tell" and never an in-range result.
- Decision recorded: the plan does not add a generic `criteria` array that the Opus report proposes. C1 to C5 already map to existing protocol fields. A second structure copies them (DRY and YAGNI). Revisit if a clinician needs more criteria.
- Tests: boundaries at limit minus margin, at the limit and at limit plus margin, for the ceiling and for the target. The example target 45, ceiling 50 and margin 9 warns from 41 and counts from 36. A noise test with an error equal to the margin. A fast rep gives `too-fast` and a slow rep gives none. The Zod rejection. Every cue text passes `claims-check.sh`. A test lists every cue text and finds none of the banned words.
- Acceptance: FR8 and FR23 pass. A mutation check (remove the margin from the ceiling test) fails at least one test.
- Result: pending.

### T10. Session screens
- Agent: Frontend Developer (Sonnet). Skills: `frontend-design:frontend-design`, `mpfl-clinical-guardrails`, `web-design-guidelines`. Tech: React. Depends on: T6, T8, T9, T9b.
- Steps: build five screens. Home shows the active phase, approval fields, last export, banners and build flag text. RedFlag. Session shows video, live angle, rep count, cues, live region, and the Stop and "knee gave way" buttons. Summary asks pain and swelling, saves, and applies the safety floor. Privacy. Test first for the rule parts: red-flag block, safety floor, buttons. Show a cue only from `src/lib/cues.ts`. An in-range rep shows no message. Use no green or red verdict colour.
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
- Steps: measure the frame rate (median over 60 seconds, headed Chromium). Write the Bland-Altman script for paired data. Without reference data, write that fact. Add a manual iOS Safari checklist (HTTPS, user gesture to start, `playsinline`, orientation). Record the iOS result as UNVERIFIED if no device exists. Test whether `lite` accuracy can be assessed. Do not invent numbers. Measure the margin and the test-retest error of the `lite` model against a goniometer in a real camera setup. This needs participants and a goniometer. Without them, the 9 degree start value stays and is labelled UNVERIFIED.
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

Revision 3 (after the form and GitHub investigations, 2026-11-08). A Sonnet and an Opus agent investigated form monitoring in two independent reports. They agree that no validated form threshold exists after MPFL surgery. They also agree on a design with limits that the clinician sets, an error margin and no app verdict. Changes in the plan: FR8 and FR9 changed, FR23 was rewritten, FR24 was added, T9b was rewritten and the banned-word list grew. The reports disagree on one point. The Sonnet report shows "within the range your care team set" for an in-range rep. The Opus report shows nothing. The plan follows the Opus report, because the message reads as a pass. This is an open decision for the user (section 11). The Opus report also corrected the Sonnet report on three points. They are the test-retest value of the Asaeda 2024 change measure, the MediaPipe model name in Kim 2026, and the counting rule near the margin.

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
- Open decision: does "above the limit your care team set" break the guardrail ban on pass and fail? The Opus report says no, if in-range reps show nothing. The plan follows this and the user must confirm.
- Open decisions for the clinician: which limits apply to each exercise. Also whether the app stops the set at "close to your limit" or only warns. Also whether the values hold for adolescents. Most MPFL data come from adolescents. All pose data come from healthy adults.
- Open decision: is a front-view set part of the first release? The reports advise the next release. A stick-figure replay from stored landmarks stores no image, but it is health data in the export.
- A study with patients needs ethics approval before any frontal-plane value reaches a patient.
- The real error of the `lite` model on a home webcam in live video is unknown. No study measures it. Every margin depends on T13.
- About 20 citations in `research/form.md` were not confirmed by the second agent. Two sources cannot be opened: the JMIR preprint 102399 and the JOSPT 2018 FPPA review. They are UNVERIFIED.
