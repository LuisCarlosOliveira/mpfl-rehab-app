# Audit 2 of the MPFL rehab app

Date: 2026-11-08. Scope: `app/src`, `app/index.html`, `app/public/_headers`, `app/scripts`, the plan, the README and `docs`. The audit is read-only. This file is the only file written.
## Method and limits
Skills loaded with the Skill tool: `owasp-security`, `anti-slop-code:anti-slop-code`, `web-design-guidelines` and `simple-english:simple-english`. The rules URL of `web-design-guidelines` was not fetched, so no formal rule-by-rule review ran. The guardrail skill and `research/INDEX.md` were read with Read.

Commands run: `npm run typecheck`, `npm run lint`, and the scripts `deps-check.sh`, `claims-check.sh src`, `phase-check.sh src`, `plan-skills-check.sh` and `model-hash-check.sh`. All pass. No unit suite, no e2e run, no `npm audit` and no browser ran. Any result that needs them is marked UNVERIFIED.

Severity scale: HIGH is a safety rule that a user can defeat, or a data exposure. MEDIUM is a plan requirement that the code does not meet, or a real risk with a clear path. LOW is a defect with small effect.

## Counts
| Severity | Count |
|---|---|
| HIGH | 3 |
| MEDIUM | 11 |
| LOW | 15 |

## What was checked and found clean
- No frame, video or image is stored or sent. `canvas`, `getImageData` and `drawImage` appear only in `src/pairing/qrReader.ts`. `toBlob`, `toDataURL`, `createImageBitmap`, `MediaRecorder`, `sendBeacon`, `WebSocket` and `XMLHttpRequest` appear nowhere in `src`.
- `fetch` appears only in the guard `blockForeignFetch` in `src/pose/landmarker.ts`. `Blob` appears only in the text download of `src/ui/DataScreen.tsx`.
- No `console` call exists in `src`. No landmark is logged.
- The meta CSP in `index.html` and the header CSP in `public/_headers` are equal. The one difference is `frame-ancestors`, which a meta tag cannot carry.
- The CSV guard in `src/lib/storage/export.ts:99` covers `=`, `+`, `-`, `@`, tab, carriage return and the four wide signs.
- The protocol import has a byte cap, a strict schema, string limits and a limit on every array.
- Only `src/lib/protocol/` writes the active phase. `appReducer` never changes it.
- No verdict word and no green or red colour appears in `src` or in the CSS. The CSS tokens are grey and dark blue.
- Every one of the 25 tasks in the plan has a `Skills used:` line.

## Area 1: privacy and security

### A1-1 MEDIUM, latent: a pairing code can name any IPv4 host
- Where: `src/lib/pairing/payload.ts:33`.
- Evidence: the check is `ipv4.test(h) && !/^(0|2[2-5]\d)\./.test(h)`. It refuses only first octets 0 and 220 to 259. Loopback, link-local and public addresses pass.
- Effect: a hostile QR code makes the browser send ICE checks to a host that the attacker picks. This breaks the plan rule "no third-party host" (FR25, NFR1). The code is not wired, so no user is exposed today.
- Fix: accept only private ranges (10/8, 172.16/12, 192.168/16) and mDNS names. Add a test for each refused range.

### A1-2 MEDIUM: the import accepts the file of another patient
- Where: `src/lib/storage/export.ts:72-85`.
- Evidence: `importSessions` never reads `parsed.file.pseudonymId`. Its duplicate key is `date|exercise` only.
- Effect: a patient can import the file of a second person and mix the two histories. The plan lists this as an open question (section 11), and the code takes no side.
- Fix: refuse a file with a different `pseudonymId` when the database holds sessions. Then update the plan.

### A1-3 LOW: free text enters the export through the import
- Where: `src/lib/storage/db.ts:18`.
- Evidence: `marginSource: z.string().max(200)`. FR14 says the export has no free text.
- Fix: use an enum or a regex for `marginSource`. The app writes only one value today.

### A1-4 LOW: the CSP allows more than the tests prove
- Where: `index.html`, `public/_headers`.
- Evidence: `img-src data: blob:`, `media-src blob:` and `worker-src blob:` stay. Finding S-14 of `docs/security-review.md` asked to test each one and no test does. The CSP has no rule for WebRTC. `Permissions-Policy` and `frame-ancestors` work only on a host that reads `_headers`.
- Fix: remove each `blob:` and `data:` source in turn and run the landmarker spec. Write the host rule in the README.

### A1-5 LOW: the fetch guard replaces a global
- Where: `src/pose/landmarker.ts:27-50`.
- Evidence: `releaseFetchGuard` restores `original` only if `globalThis.fetch === installed`. If other code wraps `fetch` in between, the guard stays and a later call wraps it again.
- Fix: keep the guard for the page life and never restore it. Or move the block into the CSP only.

### A1-6 LOW: the erase text claims too much
- Where: `src/ui/DataScreen.tsx:170`.
- Evidence: "Erase removes all data of this app from this device." Exported files in the downloads folder stay. The camera permission stays.
- Fix: add one sentence: "Files that you exported stay where you saved them."

### A1-7 LOW: the claims check has gaps
- Where: `app/scripts/claims-check.sh`.
- Evidence: it scans `ts`, `tsx`, `json` and `html` only, not CSS. The API list lacks `XMLHttpRequest`, `drawImage`, `captureStream`, `RTCPeerConnection` and `window.open`. The verdict list lacks "well done", "great" and "normal".
- Fix: add these terms. Add a CSS test for colour names that carry a verdict.

### A1-8 MEDIUM: the install rule of the vetting is not enforced
- Where: `README.md` (install row), `app/package.json`, no `.npmrc`.
- Evidence: `docs/dependency-vetting.md` condition C1 says "Install with `npm ci --ignore-scripts`". The README says `npm install`. No `.npmrc` sets `ignore-scripts=true`.
- Effect: a contributor who follows the README runs install scripts. The vetted state is not kept.
- Fix: add `ignore-scripts=true` in `app/.npmrc`. Change the README to `npm ci`.

### A1-9 LOW: a dependency with no user
- Where: `app/package.json`.
- Evidence: `lighthouse` 13.6.0 is a devDependency. No script and no test calls it. `jsqr` and `uqr` are runtime dependencies with no importer in the build (see A5-1).
- Fix: remove `lighthouse` or run it (see A3-4). Keep `jsqr` and `uqr` out of `dependencies` until a screen uses them.

## Area 2: clinical guardrails

### A2-1 HIGH: the care team view, with review criteria, opens inside the patient app
- Where: `src/ui/DataScreen.tsx:158-165`, `src/ui/appState.ts:49-51`, `src/ui/App.tsx:248-252`.
- Evidence: Home leads to My data. My data shows a button that calls `onOpenClinician`. The reducer allows it: `return state.screen === 'data' || state.screen === 'clinician' ? target : 'home'`. Nothing checks `mode`.
- Effect: FR22a says "Criteria never reach the patient screens". A patient loads their own protocol file in this view and reads "Above the limit by more than the margin" for each criterion. The plan also says an expert must confirm the class of this summary before release (section 11). In patient mode the view is still open.
- Fix: build the care team view into a second entry point or hide it when `mode` is `patient`. Add a test that patient mode has no path to it.

### A2-2 HIGH: a red-flag block disappears when the patient clears the tick
- Where: `src/ui/RedFlag.tsx:23-28, 46, 64`.
- Evidence: `onChange={(e) => setTicked((t) => ({ ...t, [flag.id]: e.target.checked }))}` and `disabled={result.blocked}`. The block follows the live ticks and has no memory.
- Effect: the patient ticks "calf", reads "Stop. Do not exercise. Contact your care team.", clears the tick and presses Continue. `onBlocked` already ran, so the session record carries `redFlagBlocks: 1` for a session that went ahead. FR5 says "Any yes blocks the session".
- Fix: keep the block for that visit once a tick was set. Leave the screen only with Back to Home. A new visit starts a new check. Add a test for tick, untick and Continue.

### A2-3 HIGH: the over-limit cue shows for 4 seconds and does not repeat
- Where: `src/ui/Session.tsx:20, 116, 129`, `src/lib/counters.ts:67-69`.
- Evidence: `until: now + CUE_SHOW_MS` with `CUE_SHOW_MS = 4000`. The tick clears it: `const cue = state.cue && now < state.cue.until ? state.cue : null`. The counter fires once: `if (flexion > cfg.maxFlexion + margin && !s.overLimit)`. The sound is one beep of 0.7 s.
- Effect: the knee can stay past the limit for more than 4 seconds. Then the text and the sound are gone, with no repeat until the next rep. A safety cue stops while the hazard goes on.
- Fix: keep the alert on screen while the filtered angle stays above the limit plus the margin. Repeat the beep every few seconds in that state. Add a counter test with a held over-limit angle.

### A2-4 MEDIUM: the pause rule is advice only
- Where: `src/ui/Summary.tsx:193-205`, `src/ui/appState.ts` (`finish`).
- Evidence: `PauseNotice` shows the message. Then Done goes to Home, and Start opens the red-flag check, which asks only the fixed symptom list. Pain 9 from the last session has no effect.
- Effect: FR12 as written is met, because it asks only for a message. A patient can start the next exercise at once. The message is not visible again.
- Fix: keep the last verdict in the session record. Show it on Home until the next export or until the care team clears it. Ask a clinician if the app must block.

### A2-5 MEDIUM: the word "Progress" breaks the own flow document
- Where: `src/ui/Home.tsx:162`, `src/ui/App.tsx:57`, `src/ui/Dashboard.tsx:151`.
- Evidence: `research/ux-flow.md` section 3.4 says "No word of progress, goal, milestone or score". The button and the title read "Progress". `claims-check.sh` does not list the word.
- Fix: rename to "My charts" or "Sessions over time". Add "progress" to the check for patient text.

### A2-6 MEDIUM: a limit near the target makes a stop cue on every rep
- Where: `src/lib/protocol/schema.ts:28-31`, `src/lib/counters.ts:70`.
- Evidence: the schema accepts `maxFlexion >= targetFlexion`, so equal values pass. The near-limit event starts at `maxFlexion - margin`. With a limit equal to the target, the event starts 9 degrees before the target.
- Effect: every rep at target depth shows "Close to your limit, stop." and a double beep. FR23 says an in-range rep shows nothing. Patients learn to ignore the cue.
- Fix: reject a `maxFlexion` that is less than `targetFlexion + margin`, or warn in the load error. The example protocol (60 and 90, 30 and 50) is fine.

### A2-7 LOW: the over-limit cue does not say that the rep did not count
- Where: `src/lib/cues.ts:18`.
- Evidence: `research/ux-flow.md` section 8.3 gives "Stop at your limit. Do not push. This rep did not count." The code has no second sentence. The counter row stays the same, so the patient sees no reason.
- Fix: add the sentence to `overLimit` and update the cue tests.

### A2-8 LOW: goal-like and instruction-like wording remains
- Where: `src/ui/Home.tsx:28`, `src/lib/cues.ts:16-17`.
- Evidence: "Target knee bend 60 degrees" reads as a goal. "Close to your limit, stop." is an exercise instruction. The plan (section 11) already asks a clinician to review the two cue texts.
- Fix: write "Protocol value: knee bend 60 degrees". Keep the clinician review open.

### A2-9 LOW: values with no source carry no label for the patient
- Where: the pain floor 7 (`src/lib/safety.ts:7`), the 2 s rep time in the example, the sound pitches, the 5 s start timer.
- Evidence: each is marked PROPOSAL in code or docs. No screen says so. Patient mode removes the prototype banner (`src/lib/mode.ts`) and keeps the values.
- Fix: this holds only after the flag is set, and the flag needs a review. Add a check to the review list that no PROPOSAL value stays without a clinician sign-off.

### A2-10 LOW: the red-flag list has an unclear item
- Where: `src/lib/redflags.ts:112`.
- Evidence: "Your knee bend is getting less, or it is not getting better." A patient cannot test "not getting better" today.
- Fix: ask a clinician for a form that has a yes or no answer, for example a loss of bend since the last visit.

## Area 3: plan traceability

The table in plan section 8 is out of date. It shows 164 tests in 13 files and "none yet" for FR6, FR10, FR12, FR13, FR18, FR23 and FR26 to FR29. The repo has 59 unit test files and 11 e2e specs. The table below is rebuilt from the code and tests. Test counts were not re-run.

| Req | Code | Test evidence | Verdict |
|---|---|---|---|
| FR1 | `protocol/loader.ts` | `protocol.test.ts`, `data-rederivation.test.ts` | Met |
| FR2 | `protocol/schema.ts` | `protocol.test.ts`, `protocol-followup.test.ts` | Met |
| FR3 | `mode.ts`, `Banners.tsx` | `flow.test.ts`, `e2e/helpers/app.ts` | Met |
| FR4 | `protocol/store.ts` | `protocol.test.ts`, `scripts.test.ts` | Met. The check is a grep |
| FR5 | `redflags.ts`, `appState.ts` | `redflag.test.tsx`, `appState.test.ts` | Weak. See A2-2. No e2e direct-route test. The app has no URL routes |
| FR6 | no frame API in `src` | `data-rederivation.test.ts:414`, `app-flow.spec.ts:242` | Met |
| FR7 | `angle.ts`, `oneEuro.ts` | `angle.test.ts`, `oneEuro.test.ts` | Met |
| FR8 | `counters.ts`, `margin.ts` | `counters.test.ts`, `margin.test.ts` | Met in code. See A2-3 and A2-6 |
| FR9 | `exercises.ts` | `exercises.test.ts`. No recorded replay (T7 blocked) | Partly |
| FR10 | `cues.ts`, `sound.ts`, `Session.tsx` | `sound.test.ts`, `app-sound.spec.ts` | Met. Persistence gap A2-3 |
| FR11 | `Session.tsx`, `Summary.tsx` | `session.test.tsx`, `summary.test.tsx` | Met |
| FR12 | `safety.ts`, `Summary.tsx` | `safety.test.ts`, `summary.test.tsx` | Met as written. See A2-4 |
| FR13 | `progress.ts`, `Dashboard.tsx` | `progress.test.ts`, `dashboard.test.tsx` | Met. Wording A2-5 |
| FR14 | `storage/export.ts` | `storage.test.ts`, `dataScreen.test.tsx` | Met. See A1-3 |
| FR15 | `ClinicianView.tsx` | `clinicianView.test.tsx:82` | Met. See A2-1 |
| FR16 | `storage/db.ts` | `storage.test.ts`, `app-data.spec.ts` | Met |
| FR17 | `storage/meta.ts`, `Home.tsx` | `storage.test.ts`, `home.test.tsx` | Met |
| FR18 | `Privacy.tsx`, `meta.ts` | `privacy.test.tsx`, `storage-followup.test.ts` | Met |
| FR22a | `reviewSummary.ts` | `reviewSummary.test.ts` | Met in code. See A2-1 |
| FR23 | `cues.ts`, `styles.test.ts` | `cues.test.ts`, `noVerdict.test.tsx` | Met. See A2-6 |
| FR24 | `views.ts` | `views.test.ts` | Unit only. No importer in `src` |
| FR25 | `lib/pairing`, `pairing/` | `tests/pairing`, `tests/pairing-ui` | Core only. No `RTCPeerConnection`, no screen, no phone test |
| FR26 to FR29 | `storage/db.ts`, `LoadProtocol.tsx`, `setupRules.ts`, `guides.ts` | matching tests | Met. FR27 has no speech and no "same place" text (A4-3) |
| FR19 to FR21, FR22b | none | none | Future, as planned |
| NFR1 | CSP, guard | `app-csp.spec.ts`, `landmarker.spec.ts` | Met for one device. WebRTC is not tested |
| NFR2 | labels, `claims-check.sh` | `scripts.test.ts`, route tests | Partly. The word list has gaps (A1-7) |
| NFR3 | `docs/accuracy.md` | none | Met by the "no data" statement. The 9 degree margin stays UNVERIFIED |
| NFR4 | `pose/loop.ts` | median math only | Not met. No 60 s run exists |
| NFR5 | CSS, `app-a11y.spec.ts` | axe on 13 screens (UNVERIFIED, not re-run) | Partly. No Lighthouse run, no WebKit |
| NFR6 | `_headers`, `model-hash-check.sh` | `headers.spec.ts`, `modelHash.test.ts` | Met. `npm audit` not re-run (UNVERIFIED) |
| NFR7 | `deps-check.sh` | script passes | Met. See A1-8 and A1-9 |
| NFR8 | all docs | `ste-check.py` | Met. One semicolon in `research/github-features.md` |
| NFR9 | `pose/camera.ts` | `camera.test.ts`, `camera-exit.spec.ts` | Met |
| NFR10 | no `dangerouslySetInnerHTML`, ESLint rule | `clinicianView.test.tsx`, `privacy.test.tsx` | Met |

### A3-1 MEDIUM: section 8 and the header of the plan are stale
- Where: `MPFL_APP_PLAN.md:5, 468-501`.
- Evidence: line 5 says "T0 to T6, T8 and T9 are done". The T10 to T15 results say work is done or partial. Section 8 reports 164 tests.
- Fix: replace section 8 with the table above. Update line 5.

### A3-2 MEDIUM: completion criteria 2, 5, 8 and 9 are not met and the plan does not say so
- Where: `MPFL_APP_PLAN.md` section 7.
- Evidence: criterion 2 needs a WebKit smoke test, and `playwright.config.ts` has Chromium projects only. Criterion 5 needs Lighthouse 95 or more, and no run exists. NFR4 needs a 60 s frame-rate run, and none exists. Section 10 reads "(pending)".
- Fix: add a line to section 7 that lists each unmet criterion. Do not call the work "done" before they pass.

### A3-3 LOW: the skills check proves a string, not a skill
- Where: `app/scripts/plan-skills-check.sh`, plan tasks T0, T2 to T6b, T7, T9, T9b.
- Evidence: `Skills used: none` and "planned and not loaded" pass the check. The script header states this limit. The plan rule says a task with no record is not done.
- Fix: fail the check on a record that holds "none" for a task that lists a skill, or move those tasks to "re-run needed". T0, T5, T5b, T9 and T9b have re-run notes already.

### A3-4 LOW: result lines with numbers that the audit did not confirm
- Where: plan T12 and T12b results.
- Evidence: "99 browser tests pass", "axe finds 0 violations on 13 screens", "1,148 tests in 59 files". The audit counted 59 test files and 54 `it` or `test` calls in `e2e`, and did not run them.
- Fix: UNVERIFIED here. Re-run once and keep the log in `docs`.

## Area 4: UX flow and accessibility

Compared with `research/ux-flow.md` sections 3, 6 and 8. Steps F1 to F3, S1 to S8 and U1 to U6 all have a screen. Gaps follow.

### A4-1 MEDIUM: Summary has no way out except Save
- Where: `src/ui/Summary.tsx:133-188`.
- Evidence: the buttons are Save, disabled until both answers are set, and Done after the save. There is no Back and no Discard.
- Effect: after a camera failure or an early Stop, the patient must answer pain and swelling and save a session with no reps. The history fills with empty rows. A patient who does not want to answer can only reload.
- Fix: add "Do not save" with a confirm. Skip the save when no frame arrived. Keep the pause message in both paths.

### A4-2 MEDIUM: setup instructions have no speech
- Where: `src/ui/Setup.tsx`, `src/ui/sound.ts`.
- Evidence: FR27 and `research/ux-flow.md` section 6.2 say each instruction shows as "text and speech". `speechSynthesis` appears nowhere in `src`. The patient stands side-on, away from the screen.
- Effect: a patient who cannot read the screen from 2 m gets only a hidden live region. Only a screen reader user hears it.
- Fix: add `speechSynthesis` for the announced text, with the mute button, or record the cut in the plan.

### A4-3 LOW: two flow items are missing
- Where: `src/ui/Setup.tsx`.
- Evidence: `grep` finds no "Use the same place as last time" (ux-flow 6.3, FR27). The step 2 screen has no way back to the guide step.
- Fix: add the text for a return visit and a Back button in step 2.

### A4-4 LOW: an unhandled rejection on Home
- Where: `src/ui/Home.tsx:54`.
- Evidence: `void db.sessions.count().then(...)` has no rejection handler. `Progress` and `DataScreen` have one.
- Fix: add the second argument as in `DataScreen.tsx:45`.

### A4-5 Accessibility, what holds
- Buttons and scale items have `min-height: 48px`. Focus outline is 3 px. The heading takes focus on each screen change. The charts have tables. The pain scale is a radio group with a legend. Colour never carries meaning.
- UNVERIFIED: contrast values in the CSS comments, touch size on a real phone, screen reader behaviour, and the 48 px rule on file inputs. The plan lists the last one as untested.

## Area 5: code quality

### A5-1 MEDIUM: modules that only tests import
- Where: `src/lib/views.ts`, `src/lib/pairing/*` (6 files, 596 lines), `src/pairing/*` (3 files).
- Evidence: a search of `src` outside these folders finds no import of them. `OneTimeSecrets` in `security.ts` is not used by `session.ts`. T9c and T12b state "PARTIAL".
- Effect: about 1,000 lines and two npm packages carry risk and cost, and no user feature runs them. README says "Planned", which is honest.
- Fix: keep them on a branch until a screen uses them. Or add one line to the README module map that names them as unwired.

### A5-2 LOW: dead and test-only code in production files
- Where: `src/lib/cues.ts:20` (`aboveTopLimit`), `src/lib/exercises.ts` (`topState`), `src/lib/progress.ts:19` (`SERIES_TITLE` export), `src/pose/camera.ts` (`stopOnLeave`), `allCueTexts`, `allSummaryTexts`, and the `diff` seam of `secretsEqual`.
- Evidence: no screen shows `topState` or `aboveTopLimit`. The other names have test importers only.
- Fix: delete, or move the helpers to `tests/helpers`.

### A5-3 LOW: duplicated facts
- Where: `ANGLE_LABEL` in `src/ui/labels.ts:11`, `src/lib/cues.ts:13` and `src/lib/reviewSummary.ts:15`. The 600 character cap in `src/pairing/qrReader.ts:7` and `src/lib/pairing/payload.ts:19`. The text "The file is larger than 5 MB." in four files.
- Fix: one export for each.

### A5-4 LOW: stale names and comments
- Where: `src/lib/counters.ts:4, 166-183`, `src/lib/exercises.ts:33`.
- Evidence: the types `LagState`, `lagStep` and the kind `'lag'` stay for a value the plan calls the top angle. The comment explains the name.
- Fix: rename to `top` in one commit. The grep test of T6b covers storage names only.

### A5-5 LOW: casts hide the event type
- Where: `src/ui/Session.tsx:113-114`.
- Evidence: `out.event as CueEvent`. The pipeline returns `string | null`, so a new event name compiles and falls to "no cue".
- Fix: type `StepOutput.event` as the union of events.

### A5-6 LOW: tests that cannot fail
- Where: `tests/pose/loop.test.ts:39`, `tests/logic-rederivation.test.ts:60`.
- Evidence: `expect(stats.medianDetectMs()).toBeGreaterThanOrEqual(0)`. A duration is never negative.
- Fix: assert a value with a fake clock. The `not.toThrow` fuzz tests are fine. The mutation records in the plan show the other tests do fail.

### A5-7 LOW: `lastExportAt` is always null in the care team view
- Where: `src/ui/ClinicianView.tsx:87`.
- Evidence: the summary function has a "since last export" mode that this screen never uses. The label says "Sessions in this file", so it is honest.
- Fix: remove the parameter from this call path or drop the mode.

## Area 6: documentation honesty

### A6-1 MEDIUM: the README status table contradicts the repo
- Where: `README.md:12-24`.
- Evidence: "Camera setup rules, position guide: Planned (T10b)", "Dashboards, data screen, clinician view: Planned (T11)", "Accuracy and speed record: Planned (T13)", "Security review: Planned (T14)". The code, `docs/accuracy.md` and `docs/security-review.md` exist. The folder map omits `app/src/pairing`.
- Fix: update the four rows to "Built" or "Partial" and add the pairing folder.

### A6-2 MEDIUM: `docs/clinical-limits.md` says a file does not exist
- Where: `docs/clinical-limits.md:19`.
- Evidence: "The accuracy record (`docs/accuracy.md`) is planned (T13). It does not exist yet." The file exists with 99 lines. It holds no measured number, which is the honest part.
- Fix: write "exists, holds no measured number".

### A6-3 MEDIUM: `docs/architecture.md` is behind the code
- Where: `docs/architecture.md:3, 22-47`.
- Evidence: it says the clinician view "is planned". The module map lacks `setupRules.ts`, `guides.ts`, `figure.ts`, `views.ts`, `pairing`, `Dashboard.tsx`, `DataScreen.tsx`, `ClinicianView.tsx`, `GuideFigure.tsx`, `sound.ts` and `setupView.ts`.
- Fix: add the rows. Mark `views.ts` and `pairing` as unwired.

### A6-4 LOW: example numbers in the plan do not match the example file
- Where: `MPFL_APP_PLAN.md` T9b tests.
- Evidence: "The example target is 45, the ceiling is 50". `example-protocol.json` holds 60 and 90 for the heel slide and 30 and 50 for the mini squat.
- Fix: correct the numbers.

## Top 10 fixes, ranked
1. A2-2: make a red-flag block last for the visit.
2. A2-3: keep the over-limit alert and sound while the knee stays over the limit.
3. A2-1: keep the care team view and its criteria out of patient mode.
4. A4-1: add a way to leave Summary without saving an empty session.
5. A2-4: carry a pause verdict to Home, or ask a clinician for the rule.
6. A2-6: reject a limit that is within one margin of the target.
7. A1-8: enforce `npm ci` with `ignore-scripts` and fix the README.
8. A1-1 and A1-2: restrict pairing hosts to private ranges, and refuse an import with another pseudonymous id.
9. A3-1, A3-2, A6-1 to A6-3: refresh section 8, the criteria list, the README and the architecture file.
10. A5-1 and A1-9: remove or isolate the unwired code and the unused packages.

## Verdict
As a prototype, the app is ready for a supervised developer demo. The logic is well tested, no image leaves the code, and the scripts pass. It is not ready for any patient or clinic trial until A2-1, A2-2 and A2-3 are fixed. It is not a medical device and makes no such claim.
