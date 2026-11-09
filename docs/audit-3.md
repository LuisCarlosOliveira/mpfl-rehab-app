# Audit 3 of the MPFL rehab app (final audit)

Date: 2026-11-09. Commit under audit: `ab171d3`. Scope: `app/src`, `app/scripts`, `app/index.html`, `app/public`, the plan, `TASKS.md`, the README and `docs`. The audit is read-only. This file is the only file written. Scratch files were under `.../scratchpad/a3/` and are removed at the end.

## Method and limits

Skills loaded with the Skill tool: `owasp-security`, `anti-slop-code:anti-slop-code`, `web-design-guidelines` and `simple-english:simple-english`. The guardrails skill was read with Read. The rules URL of `web-design-guidelines` was not fetched, so no formal rule-by-rule review ran.

Commands run: `npm run typecheck`, `npm run lint`, `npm audit --omit=dev` (0 vulnerabilities), the five scripts of `app/scripts`, `npx vitest run tests/ui/bundleSize.test.ts` (4 passed) and `npx vitest list --json`. I also ran a scratch vitest of the generator and two scratch copies of `src` for the script checks. I read 24 screenshots. I ran no full unit suite, no e2e run and no browser.

Severity: HIGH is a safety rule that a user or a code path can defeat, or a false proof claim for such a rule. MEDIUM is a real risk or an overclaim with a clear path. LOW is a defect with a small effect.

## Counts

| Severity | Count |
|---|---|
| HIGH | 2 |
| MEDIUM | 9 (M1 to M9) |
| LOW | 16 (L1 to L22, without the 6 items that say "no finding") |

## Audit 2: is each finding closed?

Audit 2 had 29 findings. The table lists each one against the code of `ab171d3`.

| Finding | State | Evidence |
|---|---|---|
| A1-1 pairing hosts | Closed | `lib/pairing/payload.ts:33` accepts private, tailnet and link-local ranges only |
| A1-2 import identity | Closed | `lib/storage/export.ts:87` and `:98` |
| A1-3 free text `marginSource` | NOT closed | `lib/storage/db.ts:19` is still `z.string().max(200)` |
| A1-4 CSP `blob:` and `data:` | NOT closed | `index.html` and `public/_headers` still allow `blob:` and `data:` |
| A1-5 fetch guard replaces a global | NOT closed | `pose/landmarker.ts:59-65` restores `original` only if `fetch === installed` |
| A1-6 erase text | NOT closed | `ui/DataScreen.tsx:262` still says "removes all data of this app" with no note on exported files |
| A1-7 claims check gaps | NOT closed | See H2 below. The scratch test passes praise words and an inline colour |
| A1-8 install rule | Closed | `app/.npmrc` has `ignore-scripts=true` and the README says `npm ci` |
| A1-9 unused packages | Closed in part | `jsqr` and `uqr` have users now. `lighthouse` is used only by hand steps in `docs/lighthouse.md` |
| A2-1 care team view in patient mode | Closed | `ui/appState.ts:108-109` and the `onOpenClinician` guard in `App.tsx` |
| A2-2 red-flag block | Closed | `ui/RedFlag.tsx:24-26` keeps `everTicked` for the visit |
| A2-3 over-limit alert | Closed in part | The text stays (`Session.tsx:293-295`). The beep still plays once (`session.test.tsx:147`) |
| A2-4 pause is advice only | Closed in part | `lib/contactCard.ts` shows a card on Home after a saved session. A "Do not save" path shows no card |
| A2-5 word "Progress" | NOT closed | `ui/Home.tsx:296` and `ui/App.tsx:79` still use "Progress" |
| A2-6 limit near target | Closed | `lib/protocol/schema.ts:40-48` |
| A2-7 cue lacks "did not count" | NOT closed | `lib/cues.ts:18` is unchanged |
| A2-8 goal-like wording | NOT closed | `ui/Home.tsx:47` still shows "Target knee bend 60 degrees" for a clinician plan |
| A2-9 PROPOSAL values with no label | Closed in part | The plan screen labels the value 18. The pain floor 7 and the 5 s timer have no patient label |
| A2-10 unclear red-flag item | NOT closed | `lib/redflags.ts:39` is unchanged: "or it is not getting better" |
| A3-1, A3-2 plan section 8 and criteria | Closed | The plan has a rebuilt section 8 and a list of unmet criteria |
| A3-3 skills check proves a string | NOT closed | `scripts/plan-skills-check.sh` is unchanged. The header says so |
| A3-4 unconfirmed numbers | Closed in part | `test-results.md` exists. One count does not match (see M9) |
| A4-1 Summary dead end | Closed | `ui/Summary.tsx` has "Do not save" |
| A4-2 no speech in Setup | NOT closed | `speechSynthesis` appears nowhere in `src` |
| A4-3 "same place" text, step back | NOT closed for the text | `grep` finds no "same place" in `ui` or `lib` |
| A4-4 unhandled rejection on Home | Closed | `ui/Home.tsx:79` has a rejection handler |
| A5-1 test-only modules | Closed | `views.ts` and `pairing/` have importers in `Session`, `App` and `Setup` |
| A5-2 dead code | NOT closed | See L5 below |
| A5-3 duplicated facts | NOT closed | `ANGLE_LABEL` is in 3 files |
| A5-4 stale `lag` names | NOT closed | `counters.ts` still has `LagState` and `lagStep` |
| A5-5 casts hide event type | NOT closed | `Session.tsx:271` and `:273` still use `out.event as CueEvent` |
| A5-6 tests that cannot fail | NOT closed | `tests/pose/loop.test.ts:39` is unchanged |
| A5-7 `lastExportAt` | UNVERIFIED | Not read |
| A6-1 to A6-3 doc drift | Closed | README, architecture and clinical-limits were updated |
| A6-4 example numbers | UNVERIFIED | Not read |

Answer for the report: the three HIGH findings of audit 2 (A2-1, A2-2, A2-3) are closed in code. A2-3 is closed for the text only. Twelve other findings are not closed.

## Area 1: privacy and security

What I checked and found clean:

- `canvas`, `drawImage` and `getImageData` appear only in `src/pairing/qrReader.ts:31-39`. The reader has one marked line (`:39`), and the canvas shrinks to 0 by 0 in `finally`. It returns text or null, stores nothing and caps the text at 600 characters (`:7`, `:19`).
- `toBlob`, `toDataURL`, `createImageBitmap`, `ImageCapture`, `MediaRecorder`, `OffscreenCanvas`, `VideoFrame`, `captureStream`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `new Function`, `console.` and `style={{` appear nowhere in `src`.
- `RTCPeerConnection` is created with `iceServers: []` (`pairing/rtcLink.ts:30`). No STUN and no relay.
- The meta CSP and the `_headers` CSP are equal, except `frame-ancestors`. `connect-src 'self'` holds. The built bundle holds one foreign URL string that is called by MediaPipe (`odml.pa.googleapis.com`), and `blockForeignFetch` plus the CSP stop it.
- The CSV guard (`lib/storage/export.ts:120`) quotes every text cell and prefixes `=`, `+`, `-`, `@`, tab, CR and the four wide signs.
- Erase (`lib/storage/db.ts:142-152`) deletes and re-opens IndexedDB, which removes every table including `generatorInputs`. It removes the `mpfl.` keys, Cache storage and service workers. The pseudonymous id lives in `mpfl.pseudoId`, so erase removes it.
- Pairing: the payload has a strict schema and a private-host filter. The secret is 16 random bytes, compared without early exit (`lib/pairing/session.ts:45`, `:74`). The class `OneTimeSecrets` is not used. The clock is `performance.now()` (`rtcLink.ts:28`). The ready message exists (`rtcLink.ts:149`). The Wake Lock text says "stays on" only when the lock was granted (`PairCompanion.tsx:108-118`).
- Lazy chunks: `retryableLazy` (`LoadError.tsx:15-27`) and the error boundary show "Screen not loaded". No gate sits in a lazy chunk. The red-flag gate is in the reducer, which is in the entry chunk. A failed chunk cannot skip it.
- History: `backStep` (`ui/appState.ts:176-198`) never returns an `open` action for `setup`, `session` or `redflag`. Summary stays. A Back press in Session stops the camera. I found no path from history to Setup or Session.
- Dependencies: `package.json` has exact pins, `deps-check.sh` passes, `.npmrc` sets `ignore-scripts=true`, `npm audit --omit=dev` shows 0 vulnerabilities. Every direct dependency is in `allowed-deps.txt`.

### Findings

**M1 MEDIUM. `acceptProposal` and `confirmByPerson` protect against a missing click only.**
Where: `src/lib/protocol/accept.ts:1-5`, `:25-30`. The file says so itself: "It does not stop script in the same page". I confirm this. Any script in the page can call `saveProtocol` or write to IndexedDB through `db.table('protocol')`. A person can also edit the stored row in browser dev tools, and a hand-edited protocol file loads in demo mode. The scripts do not stop these paths (see H2). In patient mode, the generator is closed, and a file needs `approvedOn`, which is an unsigned claim (L2-05, open).
Fix idea: sign an approved file, or state in the README that the page has no defence against its own user.
Blocks: demo no. Pilot no. Patient use yes, until a clinician workflow signs the file.

**M2 MEDIUM. A generated plan takes the phase from a self-report.**
Where: `src/lib/protocolGen/generate.ts:106` (`phase2 = week >= 7 && i.phaseClearance === 'yes'`) and `:176` (`activePhase: phase2 ? 2 : 1`). The person answers "yes" to "my care team cleared phase 2" and the generated file carries `activePhase: 2`. The guard `movesForward` in `accept.ts:63-82` runs only when a plan is stored. Erase and then create gives a phase 2 plan with no check, because `stored` is null. The app never writes the phase in the sense of `phase-check.sh`, but the person can set it by one answer.
Evidence: my scratch run (below) gives `W 7 {"kind":"none"} yes active 2`.
Fix idea: refuse phase 2 in the generator and ask for a care team file. Or keep it behind `VITE_SELF_PROGRESSION` in the generator too.
Blocks: demo no. Pilot no. Patient use: the generator is closed in patient mode, so no. A future patient generator yes.

**L1 LOW. The fetch guard replaces a global.** `pose/landmarker.ts:59-65`. Unchanged since audit 2 (A1-5).

**L2 LOW. CSP sources are wider than proven.** `img-src data: blob:`, `media-src blob:`, `worker-src blob:`. No test removes each one (A1-4).

**L3 LOW. `marginSource` is a free string.** `lib/storage/db.ts:19`. A hand-made import can carry 200 characters of free text into the export. FR14 says no free text (A1-3). Fix: an enum.

**L4 LOW. Erase text says "all data".** `ui/DataScreen.tsx:262`. Files that the person exported stay. Camera permission stays (A1-6).

**L5 LOW. The dev build of the CSP is the meta tag only.** `frame-ancestors`, `Permissions-Policy` and `X-Content-Type-Options` work only on a host that reads `public/_headers`. The README does not name the host rule. UNVERIFIED for any real host.

## Area 2: clinical guardrails

### What the generator outputs

I ran `generateProtocol` with a scratch vitest. Today is 2026-11-09. All other answers are "no", "18-plus", "mpflr-only", "first surgery", no pain and no swelling.

| Week | Limit answer | Phase 2 clearance | Output |
|---|---|---|---|
| 0 | unknown | no | Phase 1, straight leg raise 2 sets of 10. No heel slide |
| 0 | 60 degrees | no | Phase 1, straight leg raise 2 x 10, heel slide target 18, max 60, return 9 |
| 3 | 90 degrees | no | Same, heel slide max 90 |
| 6 | none | no | Phase 1, straight leg raise only (no limit in phase 1 gives no heel slide) |
| 7 | none | yes | Active phase 2. Phase 2 has straight leg raise and a heel slide with no maximum |
| 7 | 120 degrees | no | Phase 1 only, heel slide max 120 |
| 11 | 140 degrees | yes | Active phase 2, heel slide max 140 in both phases |
| 12 | none | yes | Referral R10. No plan |

Also: a limit of 25 degrees gives only the straight leg raise. Pain 3 with "some" swelling still gives a plan. No week gives a mini squat or a seated hold.

Row by row against `research/rehab-rules.md` and `research/citation-audit.md`:

- Dose 2 sets of 10: `rules.ts` DOSE cites P2 rec 26. `citation-audit.md` V49 marks the quote EXACT. The population is ages 8 to 25, not adults after MPFL reconstruction. The label is OPINION and the rule text names the population in "Why this plan". The main plan screen shows "2 sets of 10 reps" with no source on the same screen.
- Phase window, week 7 and review dates 6 and 12 weeks: sources S1, P1 and P3 with grade OPINION. S1 and P1 disagree and the code takes the later value. This is labelled.
- Heel slide target 18 and return 9: ENGINEERING, derived from `MARGIN_DEG` = 9. They carry a clinical review flag. The plan screen says "set by the app, not by a clinician". The margin 9 itself is a start value, UNVERIFIED for the `lite` model.
- Heel slide limit: the person types it. The app accepts 0 to 180 (`inputs.ts`). There is no plausibility cap, and "none" in phase 2 produces a heel slide with no ceiling.
- Pain floor 7: a PROPOSAL with no source. The rule `PAIN` says so.
- I found no clinical number that lacks a source or an ENGINEERING label inside `rules.ts`. UNVERIFIED: I did not re-open the PDFs.

### Findings

**H1 HIGH. The pain floor does not apply between sets.**
Where: `src/ui/Session.tsx:437` and `:469-475`. Code: `const painAtStop = painPauseThreshold === undefined ? undefined : painAnswers.find((v) => v >= painPauseThreshold);`. With no protocol threshold, a patient who answers pain 10 between sets sees the next-set button and no message. Test `tests/ui/sessionPain.test.tsx:82` pins this: "does not stop for any answer when the protocol has no threshold".
Why it matters: the generator never sets `painPauseThreshold` (`tests/protocolGenGenerate.test.ts:126`). So every generated plan has no stop between sets. FR12 says the floor works "with no protocol threshold". The floor applies only at Summary, after the last set. The adaptation design chose this (L2) because no source gives a stop value. The same missing source applies to the floor at Summary, which the user accepted as an app rule. The two are not consistent.
Fix idea: apply `evaluateSession` with the floor to the answer between sets. Show the pause message and a Finish button, as the threshold path does.
Blocks: demo no. Pilot with a clinician watching: no, if the clinician knows. Patient use yes.

**H2 HIGH. The two guard scripts have proven blind spots, and the docs claim more.**
Evidence: I copied `src` to a scratch folder and added files. `bash scripts/phase-check.sh <copy>` printed `phase-check: ok` for all of these:
```
import { acceptProposal as ap } from '../lib/protocol/accept';   // alias, then ap(db, p)
const k = 'active' + 'Phase'; return { ...p, [k]: 2 };            // computed key
db.table('protocol').put(p)                                         // string table name
JSON.parse(JSON.stringify(p).replace('"activePhase":1','"activePhase":2'))
```
`bash scripts/claims-check.sh <copy>` printed `claims-check: ok` for a screen with `Great job. Well done, your knee is improving. Success!` and for `<div style={{ color: 'green' }}>`.
`docs/test-results.md` says "No code path writes the active phase or saves a generated plan outside `acceptProposal`". The script proves a pattern match, not that claim. Runtime tests cover the real paths (`protocolAccept.test.ts`), but the claim is too strong.
Fix idea: restate the claim as "no line matches these patterns". Add the words great, nice, well done, success, improve, worse, better, normal and the CSS colour check to the scripts. Add a type-level guard so only `accept.ts` can import `saveProtocol`.
Blocks: demo no. Pilot no. Patient use yes, because the user mandate says a safety rule can never be bypassed and the proof is a grep.

**M3 MEDIUM. Hand count of the straight leg raise is stored as a rep count.**
Where: `src/ui/Session.tsx:366-370` and `:397-401`, `ui/Summary.tsx:73-90`. The button "Count this rep" calls `applySets(countRep(...))`. The stored `reps` field has no marker for a hand count. A clinician reading the export cannot tell a camera count from taps. Ten taps complete a set and show "Set 1 done" or "All prescribed sets are complete".
Fix idea: add an optional field `repsBy: 'camera' | 'hand'` and show it in the clinician view.

**M4 MEDIUM. Completion text reads as a milestone.**
Where: `src/lib/sets.ts:42-45` and `Session.tsx:497`. "Set 1 done. Rest when you are ready." and "All prescribed sets are complete." The skill forbids showing a goal, pass or milestone in words. "All prescribed sets are complete" tells the person that the work is finished. The words are not on the banned list, so no script finds them.
Fix idea: "Sets counted: 3." The count is a fact. It does not state completion.

**M5 MEDIUM. The over-limit alert has no sound after the first beep.**
Where: `tests/ui/session.test.tsx:147` ("makes the over-limit sound once while the knee stays above the limit"). The text stays on screen, which closes the main part of A2-3. A person who looks away hears one 0.7 s beep. Fix idea: repeat the beep every few seconds while `stillOverLimit` holds, or record the choice in the plan.

**M6 MEDIUM. Red-flag item "not getting better" cannot be answered.**
Where: `src/lib/redflags.ts:39`. Same text as in audit 2 (A2-10). A person cannot test "not getting better" on one day. Fix idea: ask a clinician for a yes or no form. Flag on a clinician list, not a code fix.

**M7 MEDIUM. The "Progress" label and the "Target knee bend" chip remain.**
Where: `ui/Home.tsx:296`, `ui/App.tsx:79`, `ui/Home.tsx:47`. `research/ux-flow.md` section 3.4 says no word of progress or goal. "Target knee bend 60 degrees" reads as a goal to reach. Screenshot `f3/runs/over-c-390/home-390.png` shows the chip. For a clinician-set value this is allowed by the plan, but A2-8 asked to write "Protocol value".

**M8 MEDIUM. The "Highest knee bend" of a straight leg raise has no plausibility check.**
Evidence: `docs/live-test/retest.md` R2-08: 165 degrees on clip 04 and 85 degrees on clip 03 for a leg that stays straight. The Summary shows these as "Highest knee bend". The number can mislead a person and a clinician. Fix idea: hide the value for a straight leg raise when the number is above 30 degrees. Say that the camera cannot read the leg.

**L6 LOW. The red-flag and pause texts mix "Contact your care team" with "emergency services".** This is correct and sourced as general guidance. No finding. Listed to show it was read.

**L7 LOW. Verdict-word scan.** The banned list was grepped in `src` and all CSS. No banned word and no green or red colour. I scanned the colour tokens of the four CSS files for green and red hues and found none. The script does not catch these words in patient text: "complete" (M4), "Ready" (Setup heading) and "better" (M6). No "great", "nice", "well done", "perfect", "success", "correct", "wrong", "improve" or "worse" appears in patient text.

**L8 LOW. A plural error.** `ui/setupView.ts` `LEG_TEXT.resting` and `CAPTURE_TEXT.startingAngle` write "degrees" for every number. The screenshot `f3/runs/over-c-390/session-390.png` shows "Resting angle: 1 degrees". The Summary was fixed (`plural`) and these two were not.

**L9 LOW. The seated hold is never straight by default.** `rules.ts` HOLD refuses it for weeks 0 to 11, and `schema.ts:52-60` needs `minFlexion` from the clinician. `exercises.ts` returns "ask-your-surgeon" with no value. Checked, no finding.

**L10 LOW. Patient-mode build.** `lib/mode.ts` and `appState.ts` refuse the generator, the example, the care team view and "Update my plan". `workflows.md` D01 to D10 passed. One open case: a file with a hand-added `approvedOn` (L2-05, unchanged). I did not build the patient bundle.

## Area 3: traceability and overclaims

I checked the plan section 8 rows for FR1 to FR37 and NFR1 to NFR12 against the files that they name. The files exist. These items have evidence that is missing or too strong:

| Item | Problem |
|---|---|
| Test counts | `docs/test-results.md` says 143 files and 2,853 tests. `npx vitest list --json` gives 143 files and **2,256 tests**. The README and the plan say 2,815 tests in 140 files. Three numbers exist for one suite. I did not run the suite, so the gap of 597 is UNVERIFIED. It can come from collection rules. The files count matches. |
| "154 browser tests, 14 WebKit, 18 pairing" | `e2e` has 88 `test(` calls in 17 spec files. Projects and `test.each` can expand them. UNVERIFIED |
| First load 172,551 bytes | The test `bundleSize.test.ts` passes with a limit of 185 kB. The exact figure is UNVERIFIED. Its own comment says 172,736. Two figures exist (172,551 and 172,736) |
| Lighthouse 99 to 100 | Comes from `retest.md`. Not re-run. UNVERIFIED |
| 15 fps | Comes from `performance.md`. A laptop with no GPU. No phone number |
| 8 clips | The clips are not in the repo, by design. UNVERIFIED |
| FR5 "browser history cannot skip the check" | Backed by the reducer code and `workflows.md` B12 to B17. I confirm it by reading `backStep` |
| FR12 | Met at Summary. NOT met between sets without a threshold (H1) |
| FR22a | Met in code (`appState.ts:108`) |
| FR23 | Met for tested screens. M4 and M7 show words that the checks cannot find |
| FR8 and the margin | Met in `counters.ts` and `margin.ts`. The value 9 is UNVERIFIED for the `lite` model |
| FR34 B2 and `proposeAdjustment` | Not built. The plan says so |
| NFR4 frame rate | Not met on a phone. Not measured |
| NFR3 accuracy | No goniometer data. The plan says so |
| "Skills used" lines | The check proves a string. T29 and T31 name skills from their reports. T30 and T18 say "not recorded". I found no false skill claim. I did not read the transcripts |

Status drift: `TASKS.md` still says "the re-test is PENDING" in several lines, but `docs/live-test/retest.md` exists. The plan status block says "after commit 939d096". The tree is `ab171d3`. `TASKS.md` says the Opus final verdict file `docs/final-audit.md` does not exist. This is true.

## Area 4: UX and accessibility

Screens read in `src/ui`, and 24 screenshots from `f3`, `w3`, `ui11` and `ui7`, newest first. No view shows a dead end. Findings:

**M9 MEDIUM. The Session view on a phone has layout risks.** Screenshot `f3/runs/over-c-390/session-390.png` (full-page capture) shows the fixed bar over the counter card. It also shows the gauge caption split as "15 0 degree s". The full-page capture can create this overlap. The later shots `f3/runs/after2-390x844/session-capture-button.png` look fine at 390 by 844. At 195 by 600 the bar buttons wrap to one word per line (`session-capture-early.png`). The retest says the 195 px layout fails and 390 and 320 px pass. I ran no live browser. UNVERIFIED for a real phone.

**L11 LOW. "Why this plan" is one 12,491 px page at 390 px width.** `f3/runs/over-c-390/plan-why-open-390.png`. A person in pain will not read it. The sources are in code names (S1, P2, RR). Fix idea: show three lines per rule and put the long text behind a link.

**L12 LOW. Android Back leaves the app at a root screen.** `useBackButton.ts` keeps one entry. This is a known and recorded limit (L2-10). No gate is skipped.

**L13 LOW. No speech in Setup.** A person who stands 2 m from the screen sees the text only (A4-2). The round 1 and 2 reports did not test this with a person.

**L14 LOW. The first-launch flow.** Privacy, then Load, then Home. Load shows "Create my plan" and "Use this phone as the second camera". The generator question screens have Back and a disabled Next. Focus moves to the heading on each screen (`App.tsx:189-196`, `FocusHeading`). No finding.

**L15 LOW. Targets.** `styles.css` sets 48 px minimum for buttons. The round 1 report found one link under 48 px on Privacy (L3-05). I did not measure.

**L16 LOW. Pause text.** "Pause and contact your care team." with "This is a rule of the app. It is not a diagnosis." (`Summary.tsx:239-249`). A person in pain can read this as advice to stop, which is the intent. It does not state a cause. No finding.

Generator flow: Question 9 asks for "a limit for how far you can bend your knee, also with a brace" with a free number box. A value that the person does not know is a button "I do not know". A mistyped 160 is accepted (see Area 2). Second camera flow: the phone screen has a Back and a heading focus. The host screen has Skip. No dead end found. The failure text is fixed.

## Area 5: code quality

- Largest files: `ui/styles.css` 2,337 lines, `lib/figure.ts` 748, `ui/Session.tsx` 675, `ui/Setup.tsx` 503, `ui/App.tsx` 425. `Session.tsx` holds the frame loop, the sets, the capture, the second camera and the layout in one component.
- `TODO`, `FIXME`, `XXX` and `HACK`: none in `src`, `tests`, `scripts` or `e2e`.
- **L17 LOW. The hold band rule is written twice.** `ui/Session.tsx:262-269` repeats `counters.ts:196-202` (the `over` and `inBand` tests). A change in one file will not change the other. The comment at `Session.tsx:261` admits it. Fix idea: export a pure `inHoldBand(cfg, flexion)` from `counters.ts`.
- **L18 LOW. Dead or test-only code.** `FIXED.aboveTopLimit` in `lib/cues.ts:23` has no screen. `stopOnLeave` in `pose/camera.ts:56`. `Summary.topState` is computed in `exercises.ts:230-236` and no screen shows it. `allCueTexts` and `allSummaryTexts` are test helpers in production files. `OneTimeSecrets` is exported and the link does not use it.
- **L19 LOW. Duplicated constants.** `ANGLE_LABEL` in `ui/labels.ts:11`, `lib/reviewSummary.ts:17` and `LABEL` in `lib/cues.ts:13`. The 600 character cap in `qrReader.ts:7` and `payload.ts:19`.
- **L20 LOW. Casts.** `Session.tsx:271` and `:273` use `out.event as CueEvent`.
- **L21 LOW. Stale names.** `LagState`, `lagStep` and the kind `'lag'` for the top angle of the straight leg raise.
- **L22 LOW. Tests that cannot fail.** I sampled 10 files by grep. These four cannot fail in a useful way: `tests/pose/loop.test.ts:39` (a duration `>= 0`), `tests/logic-rederivation.test.ts:60` (an angle `>= 0`), `tests/baselineCapture.test.ts:186` (a baseline `>= 0`) and `tests/config.test.ts:10` (an index `>= 0`). The `not.toThrow` fuzz tests are fine. The mutation records in the plan show that the main logic tests do fail on a change.
- No formatting churn found. `npm run lint` and `npm run typecheck` print no error.
- Over-engineering: the pairing core has about 1,200 lines. It serves an optional front view with no clinical meaning (the plan says so). The cost is real and the feature is not on the main path.

## Area 6: documentation honesty

- `README.md` status table and counts: the README says "2,815 tests in 140 files". `docs/test-results.md` says 2,853 in 143. Fix: one source.
- `README.md` says the re-test is PENDING. `docs/live-test/retest.md` exists. The re-test ran on commit `939d096`. Later fixes have no live re-test, as `test-results.md` says.
- `docs/clinical-limits.md` says "The fix is in commit 6264037. The re-test is PENDING" for the pause rule. `retest.md` row L1-01 says YES. Stale.
- `docs/pairing-wiring.md` says Setup has "three steps: guide, pair and camera". The screenshot shows two steps until the person opens the pair step. This is consistent with its own note.
- Some PROPOSAL or UNVERIFIED values reach a patient with no label. These are the 5 s start timer, the 15 s capture time and the pain floor 7. The margin 9 is labelled on the chart ("Not measured for this model"), which is honest. The floor 7 appears in the pause text as "This is a rule of the app". It does not say that it has no source.
- The README and test-results state that no clinician, no regulatory expert and no real phone took part. I found no statement that the code contradicts.

## Area 7: what the live tests did not show

Ranked list of what is still unproven. A real phone test and a clinician review must cover each item.

1. A clinician review of every value and text. This covers red flags, pain floor 7, margin 9, dose 2 x 10, cue texts, the generated plan and "Why this plan". No clinician has read any of them.
2. A regulatory decision on the intended purpose and the class (MDCG 2019-11 reading is UNVERIFIED). The generator makes this the highest risk.
3. The real phone, Redmi A3: model load time, memory, frame rate, a real Wake Lock, real QR scan and the tailnet.
4. Accuracy of the `lite` model against a goniometer on a home camera. No reference data exists.
5. Rep counts on real exercise with the real patient population. The 8 clips are healthy people and have no ground truth. Heel slide and mini squat counts rely on the in-place capture, which has only clip runs.
6. A person in pain using the screens with no helper. No test used a real patient or a person in pain.
7. iOS Safari camera and WebKit on a device. The WebKit tests stub the camera.
8. A hidden tab and a lost camera on a real browser (headless Chromium never reports hidden).
9. The CSP and headers on the real host.
10. Long term use: storage quota, a shared device, and a person who clears browser data.

## Top 10 fixes, ranked

1. H1: apply the pain floor between sets, or record in FR12 that the floor applies at Summary only.
2. H2: restate the proof claim as a pattern check. Add the missing words and the CSS colour rule. Close the alias and the string-table bypass with a type or import rule.
3. M2: take phase 2 out of the generator, or put it behind the progression flag.
4. M4: replace the completion texts with a count.
5. M3: mark a hand count in the record and in the care team view.
6. M5: repeat the over-limit sound while the knee stays past the limit, or record the choice.
7. M6 and M7: send the red-flag item, "Target knee bend" and "Progress" to the clinician list and rename "Progress".
8. M8 and L8: hide an implausible top angle for the straight leg raise. Fix the plural in the resting and starting angle texts.
9. M9 and the number drift: make one source of test counts and re-check them with a run. Fix the three suite counts and the two first-load figures.
10. L17 to L22 and the open audit 2 LOW items: one commit. It covers the shared hold band function, the dead code, the casts and the weak tests.

## Verdicts

- Supervised developer demo: yes. The app is a labelled prototype, no frame leaves the code, and the scripts and the checks pass. The presenter must know H1 and M3.
- Pilot with one real phone and a clinician watching: not yet. Fix H1 first, run the phone test, and give the clinician the review list. The clinician can then accept the app as a counting tool with an observer.
- Any patient use: no. H1 and H2 are open, no clinician reviewed any rule, the regulatory class is not set, and the real phone is untested.

## Decisions that belong to others

| Owner | Decision |
|---|---|
| The user | Apply the pain floor between sets (H1) and the wording of the completion text (M4) |
| The user | Keep or remove the phase 2 self-report in the generator (M2) |
| The user | Keep or remove the front view, the body map and the pairing code. They cost the most and prove the least |
| The user | One source for test counts and the rule for the status blocks |
| A clinician | Every value, such as floor 7, margin 9, dose 2 x 10, the week 7 and week 12 dates and the review criteria |
| A clinician | Red-flag items and groups, in particular "not getting better" |
| A clinician | Cue texts, the over-limit and near-limit rule and the hand count of the straight leg raise |
| A clinician | A heel slide limit that the person types: a cap and a check against the surgeon letter |
| A regulatory expert | Intended purpose, the class under MDR Rule 11 and Rule 22 and whether Confirm closes the loop |
| A regulatory expert | Whether a generated plan with an unsigned `approvedOn` is acceptable in any build |
| A regulatory expert | Data protection for health data in IndexedDB on a shared device, and the export file |
