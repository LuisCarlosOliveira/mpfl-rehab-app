# Final audit of the MPFL rehab app (final judge)

Date: 2026-11-09. Commit under audit: `b00d2aa` (code of `903d2c9`). Model: Opus, as the final judge of task T27.

Skills loaded with the Skill tool: `owasp-security`, `anti-slop-code:anti-slop-code` and `simple-english:simple-english`. The guardrails skill `.claude/skills/mpfl-clinical-guardrails/SKILL.md` was read with Read and applied.

Method. I read the plan, `TASKS.md`, `docs/test-results.md`, audit 2, audit 3, the live-test reports, the design files and the research files that the brief names. Then I read the code of the fixes F4a and F4b and tried to break it. All copies and scratch tests ran under `/tmp/fa-judge/`. I wrote no file in the repository except this one.

Limits. I ran no real phone, no goniometer and no person. I re-fetched two guideline PDFs and read their text layer with a small zlib script, because no PDF tool is installed. I did not run the full e2e suite, the WebKit project or the pairing suite. I did not read the transcripts of earlier agents. A result that I did not check is marked UNVERIFIED.

## Verdicts

**(A) A supervised developer demo: YES.** The app is a labelled prototype. I ran the precheck and two browser specs, and both match the record. The pain floor and the red-flag gate held in every case that I tried. No frame leaves the code path that I read. Conditions: the presenter says that no clinician approved any value. The generated plan is not advice. The guard scripts are a pattern match and not a proof.

**(B) A pilot with one real phone and a clinician watching: NOT YET.** The gap is short and concrete. First, run the real phone test and a live re-test of the round 3 and F4a fixes. Second, give the clinician the review list and record a decision for each value that the pilot shows. Third, use a protocol file that the clinician writes, and not the generator. Fourth, use a healthy volunteer until a regulatory expert says whether a pilot with a patient is a clinical investigation. The full list is in section 8, items 1 to 9.

**(C) Any patient use: NO.** The blockers are in four groups, and each group alone blocks.
- Regulatory: the intended purpose and the class are not settled. The reading of MDCG 2019-11 (Rule 11, Rule 22) is UNVERIFIED. No DPIA, no consent flow and no ethics approval exist.
- Clinical: no clinician reviewed any value, cue, red-flag item or generated plan.
- Evidence: the camera error of the `lite` model in live video is not measured. The margin of 9 degrees comes from still photos with the heavy model (F1). Exercise video in F3 gave 9.3 to 21.9 degrees. No count has a ground truth.
- Engineering: no real phone ran the app. The phase and save rules rest on review and tests, not on structure (section 1.4). A protocol `approvedOn` date is an unsigned claim (L2-05). A script in the page can save a plan (M1).

## 1. My own checks

### 1.1 Precheck

Command, run alone: `cd app && npm run precheck`. Output, from `/tmp/fa-judge/precheck.log`:

```
 Test Files  147 passed (147)
      Tests  2978 passed (2978)
model-hash-check: ok
deps-check: ok
claims-check: ok
phase-check: ok
plan-skills-check: ok
real 2m12.177s   EXIT=0
```

This matches `docs/test-results.md` exactly: 147 files and 2,978 tests.

### 1.2 Build and two browser specs

Commands: `npm run build` (exit 0), then `npx playwright test --workers=1 --project=app e2e/app-flow.spec.ts e2e/app-csp.spec.ts`. Result: `16 passed (47.5s)`, exit 0. The specs cover these points:
- every screen with 0 CSP violations, 0 console errors and 0 foreign requests
- no path to Setup or Session without the red-flag step
- the pause message from the answers, without Save
- a saved session with no image data

After the run, ports 4173 and 4174 were free and no preview server or browser was left.

### 1.3 The F4a fixes, read in the code

| Fix | Where | What I found |
|---|---|---|
| Pain floor between sets (H1) | `ui/Session.tsx:461`, `lib/safety.ts:36` | Correct. The stop uses `evaluateSession`, so the threshold is `min(7, painPauseThreshold)`. A higher protocol value does not lift the floor. |
| Pain floor at Summary | `ui/Summary.tsx:61-65` | Correct. The highest answer of the sets and of the Summary decides. A high answer between sets shows the pause before any Summary answer. |
| Hand-count marker (M3) | `ui/Session.tsx:208-212`, `:407`, `lib/storage/db.ts:63` | Correct. One hand rep marks the session `hand`. A rep during a set pause counts for nobody. The Dashboard and the review summary do not show it (recorded as open). |
| Neutral set text (M4) | `lib/sets.ts:44`, `ui/Session.tsx:539-542` | The last-set text is neutral. The rest panel still shows a check-mark icon next to "Set N done". A tick is a common pass sign. No script checks icons. |
| Repeating over-limit beep (M5) | `ui/Session.tsx:289-294` | Correct. It repeats every 5 s while `stillOverLimit` holds, stops on return, and `sound.play` does nothing while muted. |
| Leg raise peak plausibility (M8) | `lib/cues.ts:108-113`, `ui/Summary.tsx:168` | Correct for `peakFlexion`. Not applied to `topFlexion`: the Summary line from `topAngleText` (`lib/cues.ts:116-118`) and the care team column (`ui/ClinicianView.tsx:220`) show any value. Whether `topFlexion` misreads like the peak is UNVERIFIED. |
| `marginSource` enum (A1-3) | `lib/storage/db.ts:13-28` | Correct. Three fixed texts. Any other value fails the schema, so the export carries no free text in this field. |

### 1.4 Pain floor, my own test

File: `/tmp/fa-judge/app/tests/ui/judgePain.test.tsx` (scratch, removed at the end). It renders the real `Session` and `Summary`. Between sets it tries thresholds 9, 7, 5 and none with pain 0, 4, 5, 6, 7, 8 and 10. At Summary it tries the same thresholds with a between-set answer of none, 3 or 8 and an end answer of 2, 5 or 7. The expected rule is "stop when pain is at least `min(7, threshold)`".

Command: `npx vitest run tests/ui/judgePain.test.tsx`. Result: `Tests 64 passed (64)`.

Power check: with `PAIN_FLOOR = 11` in the scratch copy, the same test gave `15 failed | 49 passed`. So the test can fail, and the floor works as FR12 says.

### 1.5 The guard scripts, attack cases

I copied `src` and `scripts` to `/tmp/fa-judge/scripts`. I added one file for each case and ran the script. "FAIL" means the script caught the case.

| Case | Script | Result |
|---|---|---|
| Audit 3: `import { acceptProposal as ap }` | phase-check | FAIL (caught) |
| Audit 3: `const k = 'active' + 'Phase'` then `[k]: 2` | phase-check | FAIL (caught) |
| Audit 3: `db.table('protocol').put(p)` | phase-check | FAIL (caught) |
| Audit 3: `Great job. Well done, your knee is improving. Success!` | claims-check | FAIL (caught) |
| Audit 3: `style={{ color: 'green' }}` | claims-check | FAIL (caught) |
| Key from `String.fromCharCode(97,99,...)` | phase-check | ok (MISSED) |
| `const t = db.protocol; t.put(p)` | phase-check | ok (MISSED) |
| `({ protocol }) => protocol.put(p)` | phase-check | ok (MISSED) |
| `db.tables.find(...).put(p)` | phase-check | ok (MISSED) |
| `indexedDB.open('mpfl-rehab')` or `new Dexie('mpfl-rehab')` in `ui` | phase-check | ok (MISSED) |
| `import * as m from '.../accept'` then `m['accept' + 'Proposal']()` | phase-check | ok (MISSED) |
| `st.saveProtocol` with `(` on the next line | phase-check | ok (MISSED) |
| Re-export `export { acceptProposal as go }` | phase-check | FAIL (caught) |
| Praise in a template string `` `Excellent, ${n} reps` `` | claims-check | FAIL (caught) |
| Praise split `'Well ' + 'done'` | claims-check | ok (MISSED) |
| Praise not on the list: "Fantastic work. You are on track. Keep it up!" | claims-check | ok (MISSED) |
| Praise in a new `lib` file, or "Excellent recovery" in `lib/protocolGen/` | claims-check | ok (MISSED) |
| `style` in an object in a `.tsx` file, spread as a prop | claims-check | FAIL (caught) |
| `style` object with `limegreen` in a `lib/*.ts` file, spread in a screen | claims-check | ok (MISSED) |
| `color: 'var(--ok, lime)'` | claims-check | ok (MISSED) |
| `fetch('https://x.example', { method: 'POST' })` in `ui` | claims-check | ok (MISSED, the CSP blocks it) |
| `new RTCPeerConnection` with a STUN server | claims-check | ok (MISSED, the CSP does not cover WebRTC) |
| `new VideoFrame(video)`, `video.captureStream()` | claims-check | ok (MISSED) |
| Canvas from `document.createElement('can' + 'vas')` | claims-check | ok (MISSED) |

All five cases of audit 3 are now caught. Fourteen of my new cases are missed. The scripts carry an honest header that says "pattern match". The FR6 claim in the plan says that a search finds no frame API. The script list has no `captureStream` and no `VideoFrame`, so the precheck does not enforce that part of the claim.

### 1.6 The import-graph test, attack cases

I added cases to a copy of `tests/importGraph.test.ts`. Three are missed:
- A `.js` specifier, `import { saveProtocol } from '../lib/storage/db.js'`. The resolver (`importGraph.test.ts:41`) tries the path, `.ts`, `.tsx` and `index` only.
- `confirmByPerson` is not in the guarded list (`importGraph.test.ts:14-17`). Only `phase-check.sh` watches it.
- A value re-bound in an allowed file, for example `export const keep = saveProtocol` in `LoadProtocol.tsx`, is not traced.

Combined test: I added `src/ui/JudgeBypass.ts` to the scratch copy. It holds `import * as st from '../lib/storage/db.js'` and a call `st.saveProtocol` with the parenthesis on the next line. `tsc --noEmit` exit 0, `eslint` exit 0, `phase-check: ok`, `claims-check: ok`, and `importGraph.test.ts` 13 passed. So a new save path passes every gate of the precheck. Whether `vite build` resolves the `.js` path is UNVERIFIED. The real tree holds no such file. This is a gap in the gate, not a defect in the product.

### 1.7 The red-flag gate

- Reducer search. File `/tmp/fa-judge/app/tests/judgeGate.test.ts` (scratch). From the first state it tries every `open` action to every screen from every screen. It also tries each other action on its own screen and the `backStep` result. Depth 6, demo and patient mode, with and without a protocol. A Setup or Session screen without `red-flags-clear` on the red-flag screen fails the test. Result: `Tests 4 passed (4)`. A first version of the search flagged `open setup` from Home. That was an error in my model: `red-flags-clear` was allowed from any screen. With actions bound to their screens the search is clean.
- Back button. `useBackButton.ts:43-68` ignores the history state and runs `backStep` only. `backStep` (`appState.ts:196-219`) never returns an `open` of Setup, Session or the red-flag screen. Back in Session stops the run, or goes Home when the Session chunk has not loaded yet (`App.tsx:176-181`).
- Reload. `App.tsx:160-164` builds the state from `initialAppState`, with `redFlagCleared: false`. The reducer state is not stored. A reload lands on Privacy, Load or Home.
- Lazy chunk error. `LoadError` offers "Back to Home" (`App.tsx:417`). The gate is in the reducer, in the entry chunk.
- Companion screen. It needs no protocol and no check (`appState.ts:84`). It has no Setup or Session path.
- Generator and ConfirmPlan. `plan-accepted` sets `redFlagCleared: false` (`appState.ts:165`). The generator path never opens Setup.

I found no path that skips the check.

### 1.8 Policy files

`index.html` and `public/_headers` hold the same CSP, except `frame-ancestors`. `connect-src 'self'`. `blob:` is only in `worker-src`. `img-src 'self' data:` and `media-src 'self'`. This matches the F4b claim. A real host that reads `_headers` is NOT RUN (L5).

## 2. Science check

Five numbers that a patient screen can show, against `research/rehab-rules.md`, `research/citation-audit.md` and, for P1 and P2, the PDF text that I fetched again.

| Number on screen | Code | Source and my check | Verdict |
|---|---|---|---|
| Straight leg raise, 2 sets of 10 | `rules.ts` DOSE | P2 rec 26. PDF text: "It is recommended that strengthening exercises are initiated in 2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated". Title: "children and adults aged 8 - 25 years". | Quote correct. The use breaks condition 1 of `citation-audit.md` section 6 and section 4.3 ("SAFE ONLY AS A CLINICIAN-SET VALUE"). The user chose option C. A clinician must decide. |
| Phase 2 from week 7 | `rules.ts` PH2 | P1 PDF: "Phase 2 ( Weeks 7-11)". S1 "6-12 weeks" (audit V3 EXACT, not re-fetched). | Correct, and the later value is the more conservative one. Phase 2 needs one self-reported answer (M2, open). |
| No plan from week 12 | `rules.ts` W1, R10 | P1 phase 2 ends at week 11 (PDF). S1 "12-16 weeks" (audit EXACT). | Correct. |
| No seated knee hold in weeks 0 to 11 | `rules.ts` HOLD | P2 rec 29, PDF: "short arc quadriceps exercises (knee extension from 30° to 0°) and long arc quadriceps exercises in the terminal range of 30° to 0° are avoided". P1 PDF: "Do not perform AROM open chain KE". | Correct and protective. |
| Heel slide count start 18 degrees, return 9 degrees | `rules.ts` ENG_TARGET, ENG_RETURN | Two times and one time the margin of 9. The margin comes from F1 (LoA about ±8.8 degrees, still photos, heavy model). F3 gives 9.3 to 21.9 degrees on exercise video. | Labelled on screen as an app value. The basis is weak for live video. The margin can be too small. |

Also checked: the pain floor 7 has no source. `rules.ts` PAIN and `safety.ts` say so. The screen text says "This is a rule of the app. It is not a diagnosis." It does not say "no source".

A heel slide can enter phase 1 with a surgeon number (S1, P3). The P1 PDF starts it later: "heel slides once KF >120". `rules.ts` HEEL records the choice. A clinician must confirm it.

One misquote. `sources.ts:92` quotes P1 as "Follow most conservative guideline", and `citation-audit.md` V34 marks it EXACT. The P1 PDF text reads "Follow more conservative guideline", twice, next to the list of combined procedures. The effect on an app rule is small. It shows that an EXACT mark is not always exact. `protocolGenSources.test.ts` checks quotes against the research files, not against the sources, so it cannot find this.

## 3. Privacy check

Command: a grep of `app/src` for network, media, frame and storage APIs. The pattern held these names:

```
fetch( XMLHttpRequest WebSocket sendBeacon RTCPeerConnection getUserMedia MediaRecorder toBlob toDataURL captureStream
ImageCapture createImageBitmap VideoFrame OffscreenCanvas getImageData drawImage getContext createObjectURL postMessage indexedDB
```

Hits:
- `pose/camera.ts:72`: `getUserMedia({ video, audio: false })`.
- `pairing/qrReader.ts:31-39`: the one canvas. It reads one frame into memory, decodes it to text of at most 600 characters, and shrinks the canvas to 0 by 0 in `finally`.
- `pairing/rtcLink.ts:30`: `new RTCPeerConnection({ iceServers: [] })`, one data channel, no media track.
- `ui/DataScreen.tsx:23`: `createObjectURL` of the export text, for the download.
- `pose/landmarker.ts:48`: the fetch guard that blocks a foreign origin.
- Storage: `meta.ts` (the `mpfl.` keys) and the erase code in `db.ts`.

The channel. The phone builds each message in `pairing/frameMessage.ts`. It holds 33 points, with only the six leg points filled, rounded and clamped. `rtcLink.ts:303-305` checks each outgoing message with the same strict schema as the receiver (`lib/pairing/messages.ts`, 4,096 bytes, no unknown key). No schema field can carry an image.

Verdict. The code supports the claim "no frame or video leaves a device and none is stored". The tests that I ran support it too. `app-csp.spec.ts` showed 0 foreign requests. `app-flow.spec.ts` found no image data in the stored session. The claim holds for this code on Chromium.

What can still break it:
- New code. `claims-check.sh` does not ban `captureStream`, `VideoFrame`, `fetch` or a STUN server (section 1.5). The CSP stops `fetch` to a foreign origin. It does not cover WebRTC.
- A real network. The pairing ran in two browsers on one machine only. Router behavior and the tailnet are UNPROVEN.
- The host. `frame-ancestors` and the other headers work only on a host that reads `_headers` (L5).
- The data that stays. The export file and IndexedDB hold health data (surgery date, pain). On a shared device another person can read them. This is not a frame leak, but it is the larger privacy risk.

## 4. Honesty check: 10 claims

| # | Claim and place | My check | Result |
|---|---|---|---|
| 1 | Precheck: 2,978 tests in 147 files (`test-results.md`, plan, README) | Ran it | TRUE |
| 2 | "154 browser tests passed in the `app` project" (`test-results.md:16`) | `playwright test --list`: `app` 130, all five projects 154, WebKit 14 included | WRONG label. The plan and README then add "and the WebKit project has 14", which reads as 168 tests |
| 3 | `claims-check.sh` and `phase-check.sh` print ok (plan T37) | Ran them | TRUE. The plan states the pattern-match limit honestly |
| 4 | "Commit 903d2c9 fixed H1, H2" (README status table) | H1 verified (section 1.4). H2: 14 new cases pass (section 1.5) | H1 TRUE. H2 overstated: improved, not fixed. The plan T37 text is more careful than the README |
| 5 | The import-graph test covers "alias, re-export, namespace and dynamic import" (plan FR4) | Section 1.6 | TRUE for those. It misses a `.js` path and does not guard `confirmByPerson` |
| 6 | The pain floor applies between sets and at Summary (FR12) | My 64-case test and code read | TRUE |
| 7 | A leg raise peak above 30 degrees shows the unreadable text (FR9, FR13) | Code read | TRUE for the peak. The top angle line has no such check |
| 8 | `blob:` is removed from `img-src` and `media-src` (NFR6) | Read both files. CSP spec passed | TRUE |
| 9 | P1 "Follow most conservative guideline", audit V34 EXACT | P1 PDF | WRONG in one word ("more") |
| 10 | P2 rec 26 dose and rec 29 arc quotes, audit V49 and V45 EXACT | P2 PDF | TRUE |

Also checked:
- The "Skills used" lines of T35 and T37 say "not recorded (gap)". This is honest. `plan-skills-check.sh` passes on those lines, so it proves a string only, as its header says.
- The header of `phase-check.sh:17` names `tests/ui/importGraph.test.ts`. The file is `tests/importGraph.test.ts`.
- The plan status blocks keep every older count and mark it OLDER COUNT. That is honest, but a reader must go through four blocks to find the current state.

## 5. The three biggest remaining risks

1. **The generator makes exercise plans with no clinician.** The dose 2 x 10 comes from an 8 to 25 age group. Phase 2 comes from one self-reported answer (M2). The heel slide limit is a number that the person types, 0 to 180. Patient mode closes the generator, but the demo build is the only build that runs today. Anyone who opens it gets a plan. This feature most likely sets the regulatory class (UNVERIFIED).
2. **The camera error is unknown where it matters.** Counts, the near-limit cue and the over-limit cue depend on the margin of 9 degrees. That number is from still photos with another model. No goniometer, phone or patient data exist.
3. **The safety and phase rules rest on review, not on structure.** The scripts and the import test can be passed (sections 1.5 and 1.6). A script in the page or an IndexedDB edit can save a plan (M1). `approvedOn` is unsigned (L2-05). Today the code is correct. A future change can break it with no gate that fails.

## 6. The three strongest parts

1. **Privacy by design, with evidence.** The code has one frame reader and no media track on the peer. The ICE list is empty and both ends of the channel use a strict schema. The CSP has `connect-src 'self'`, and a fetch guard stops foreign requests. My e2e run showed 0 foreign requests and no image in the stored data.
2. **The safety floor and the red-flag gate are correct and tested.** My 64-case pain test, its mutation check and the reducer search found no defect. The pause shows without Save, and it stays after Finish.
3. **A record that marks its own limits.** UNVERIFIED, PROPOSAL and ENGINEERING labels are on values in code and docs. Each generator rule has a source id, a grade and a population. My precheck matched the claimed counts exactly, and the P2 quotes matched the PDF. The defects that I found in the record are small.

## 7. What earlier audits or the main session overstated or missed

- H2 is reported as fixed in the README. It is a better pattern match with an honest limit. Fourteen of my cases pass the scripts.
- "154 browser tests in the `app` project" is wrong. It is 130 in `app` and 154 over all projects.
- The citation audit marks V34 EXACT with one wrong word.
- The M8 fix covers the peak and not the top angle.
- The rest panel uses a check-mark icon with "Set N done". No audit named it.
- The claims check does not enforce the full frame-API list of FR6 (`captureStream`, `VideoFrame`). Audit 3 searched those names by hand, and the precheck does not.
- `confirmByPerson` is guarded by a text pattern only, not by the import test.

## 8. Decisions and next steps

Decisions, ranked inside each owner.

| Owner | Rank | Decision |
|---|---|---|
| User | 1 | For the pilot, use a protocol file that a clinician writes and switch the generator off. My recommendation is yes. |
| User | 2 | Keep the generator with the dose 2 x 10 (option C), or limit it to a demo. |
| User | 3 | Make the guards structural (an ESLint import rule for each folder, one write module for the protocol table), or accept the pattern match with its limit. |
| User | 4 | The Worker for the pose loop, after the phone test. |
| User | 5 | Keep the front view, the body map and the pairing code. |
| Clinician | 1 | Every value that a patient sees: pain floor 7, dose 2 x 10, week 7, review weeks 6 and 12, margin 9, count start 18, return 9, plausibility 30, beep repeat 5 s. |
| Clinician | 2 | The red-flag items and groups, and "or it is not getting better" (M6). |
| Clinician | 3 | The cue texts, the hand count, the set texts and the check-mark icon. |
| Clinician | 4 | A heel slide in phase 1 with a surgeon number, against P1 "heel slides once KF >120". |
| Regulatory expert | 1 | The intended purpose and the class (MDR Rule 11, Rule 22), with and without the generator. |
| Regulatory expert | 2 | Whether a pilot with a patient is a clinical investigation that needs approval. |
| Regulatory expert | 3 | Signed protocol files in place of an unsigned `approvedOn`. |
| Regulatory expert | 4 | GDPR: the surgery date, the export file, a shared device and a DPIA. |
| Regulatory expert | 5 | The MediaPipe model card, which says the model is not for life-critical decisions. |

Next steps, in order:
1. Correct the record. Write `test-results.md:16` as 130 in `app` and 154 in total. Change README "fixed H2" to "improved H2". Correct V34 and `sources.ts:92` to "more". Correct the test path in `phase-check.sh:17`.
2. Close the cheap gate gaps. Add `confirmByPerson` to the import test, resolve a `.js` path, and add `captureStream` and `VideoFrame` to the claims check. An ESLint `no-restricted-imports` rule for `storage/db` and `protocol/accept` is stronger than a grep.
3. Apply the plausibility rule to the leg raise top angle, or mark it as not checked.
4. Run a live re-test on the built app of round 3 and F4a. Cover the stop at pain 7 between sets with a generated plan, the beep repeat, the Back button, 195 px and the hand-count marker.
5. Run the real phone test on the Redmi A3. Record model load, memory, a 60 s frame rate, the camera, the Wake Lock, the QR scan and the tailnet.
6. Measure the `lite` error in live video against a goniometer on a few healthy volunteers. Then set the margin from the result.
7. Hold a clinician review with the list of section 8. Record a decision for each item.
8. Ask a regulatory expert the questions of section 8.
9. Build the patient-mode bundle for the pilot. Load the clinician file. Keep the generator closed.
10. Run pilot B with the clinician watching, first on a healthy volunteer. Use a patient only after step 8 allows it.
11. Do one cleanup commit for L17 to L22.
12. Before any patient use: signed protocol files, a DPIA, a consent flow and ethics approval.

Cleanup: I removed `/tmp/fa-judge/` (scratch copies, logs and the two PDFs) after this file was written. `app/dist` was rebuilt by `npm run build`. It is git-ignored.
