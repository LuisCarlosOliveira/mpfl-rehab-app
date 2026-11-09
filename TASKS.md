# Verification campaign with real videos

Status: planned on 2026-11-08. It starts after the UI build and the pairing wiring. Tick each item when it has evidence.

Update 2026-11-09: live test round 1 ran on 2026-11-08 and 2026-11-09 with four testers (commit b451206). Fixes followed in commits 6264037, 8a148dd and 939d096. Each item below has a note with its evidence or its gap. The re-test of the fixes is PENDING. The report will be `docs/live-test/retest.md`. A tick means that a round 1 report holds the evidence. A note "PARTLY" or "NOT RUN" means no tick. Counts are from the four reports and were not re-run by me.

Update 2026-11-09, after commit 903d2c9: round 2 (`docs/live-test/retest.md`, commit 939d096) re-tested the fixes: 18 of 22 verified, 3 failed, 1 partly. Round 3 (ab171d3) and the audit 3 fixes (903d2c9) changed code after it and have no live re-test. Audit 3 (`docs/audit-3.md`) is written. The final counts are in `docs/test-results.md`. They are 2,978 tests in 147 files. `npm run e2e` has 154 tests across all its projects (130 in the `app` project, 14 in WebKit, 10 in older harness projects). The pairing suite has 18 tests, run three times, and passed 3 runs out of 3. The older counts below are marked. A tick below means that a document or the git history holds the evidence. The real-phone test and the clinician review are NOT RUN. The live re-test of round 3 and F4a is PENDING. The Opus final verdict is DONE on commit b00d2aa (`docs/final-audit.md`): developer demo YES, pilot NOT YET, patient use NO.

## How the real videos are used
- Method A: the clip tool `app/scripts/analyze-clip.mjs` runs a clip through the real pose pipeline. It gives detection rate, angle trace and reps. See `docs/clip-analysis.md`.
- Method B: ffmpeg converts a clip to a file that Chromium plays as the fake webcam (`--use-file-for-fake-video-capture`). The real app then runs every screen with a real person in view.
- A clip never enters the repository. Clips and outputs stay in the scratchpad or in `app/.clip-out/`.
- One clip is a smoke test. It is not a validation of accuracy.

## Blocked until the user decides
- [x] Source of the clips. The user accepted `yt-dlp` for private tests after a safety check (`docs/dependency-vetting-ytdlp.md`, plan T21). Eight public Creative Commons clips ran. Their licences and attribution are in `docs/accuracy.md`. The clips never enter the repo.

## Features to test with a person in view
- [ ] Setup rules: person, three joints, whole leg, leg size, side-on, held still. Each rule changes from "not seen" to "seen". PARTLY: the rules changed from "not seen" to "seen" in 10.9 s on clip 04. The countdown ran in 1 of 3 runs on clip 04 and in no run on the other clips (`exercise-flows.md`, checks 10 and 16). Round 2: clip 05 reached all six rules and the countdown text, and clip 07 did not (`retest.md`, R2-07). Still PARTLY.
- [ ] Position guide and camera guide match what the clip shows. PARTLY: the guide figures and text read well at 390 px (checks 6 and 7). A match with each clip was not judged. The guide text named the operated leg when the other leg was chosen (L1-06). Fixed later in the numbered guide. Round 2 verified the label (L1-06). A match with each clip is still not judged.
- [ ] Heel slide: reps counted, peak angle, near-limit and over-limit cues, margin rule at the edges. NOT RUN for the count: no clip gave a resting angle, so the count was 0 (checks 14, 18 and 50). The cues ran (checks 22 and 23). The in-place capture of the fix loop is the answer. Round 2 ran it. Clips 01 and 02 found a starting angle and counted 11 reps in 90 s each. That is 3 to 4 passes of a looping clip, with no ground truth. The near-limit and over-limit cues ran. The margin rule at the edges was not tested. Round 3 changed the lowest-angle rule with no live re-run. Still PARTLY.
- [ ] Straight leg raise, mini squat, seated hold: counters, hold timer, lost leg resets the timer. PARTLY: the seated hold counted 1 hold of about 6 on clip 06, and the restart cue showed (checks 19 and 20). The straight leg raise ran by hand with "Count this rep". The mini squat count was NOT RUN in round 1 (no resting angle). Round 2 counted 11 reps in 90 s on clip 05 and 2 on clip 07. By eye, each pass of clip 05 has 4 to 5 squats. No ground truth exists. Still PARTLY.
- [ ] Wrong side, front view, partly out of frame: the app says what to fix and does not count. PARTLY: the setup texts said what to fix (check 11). The front-view mini squat clip counted 0. The note for the other leg showed on three clips, and the truth for the leg is not known (L1-08).
- [ ] Stop, "knee gave way or hurts", hidden tab: the camera ends and the session closes. PARTLY: Stop, Cancel and the gave-way press ended the camera (checks 29 to 31). A real hidden tab is NOT RUN, because headless Chromium never reports hidden. The synthetic `visibilitychange` and `pagehide` events ran in `workflows.md` (G08) and `pairing.md` (check 28).
- [x] Summary: pain and swelling answers, pause message at pain 7 or more, Save, Do not save. Evidence: `exercise-flows.md` checks 32 to 35 and `workflows.md` E01 to E18. Live test 1 found that pain 7 alone gave no message (L1-01, HIGH). The fix is in commit 6264037. Round 2 verified it (`retest.md`). Audit 3 then found that the floor did not apply between sets (H1). The fix is in commit 903d2c9 with unit tests and no live re-test.
- [x] Progress charts and tables with saved sessions. Export JSON and CSV. Import. Erase. Evidence: `exercise-flows.md` checks 37 to 44 and `workflows.md` F01 to F29. Live test 1 found that an import did not keep the id of the file (L1-02). The fix is in commit 6264037. Round 2 verified it (`retest.md`). The screen name "Progress" is now "Your sessions" (903d2c9).
- [x] Second camera: phone sends landmarks, host receives them, front-view change shows for the clinician only. Evidence: `pairing.md` checks 15 to 22 (two Chromium browsers, 1,184 messages, no image field). It did not run on a real phone.

## Every workflow, end to end
- [x] First launch, privacy notice, load protocol, bad file, Home, reload keeps the protocol. Evidence: `workflows.md` A01 to A09. A long text field made the page 537 px wide at 390 px (A10 FAIL, L2-06). The fix is in the fix loop. Round 2 verified no overflow at 390 px and 320 px. At 195 px it failed (R2-02). Round 3 changed the layout and has no browser re-run.
- [x] Red-flag check: block is sticky, Back to Home, fresh visit continues. Evidence: `workflows.md` B01 to B11 (all 9 items).
- [x] Direct routes and browser Back never skip the red-flag check. Evidence: `workflows.md` B12 to B17. The Android Back button left the app (L2-10, LOW), and round 2 confirmed it (R2-01). Round 3 added the in-app Back (`useBackButton`) with unit tests and no live re-test. No gate is bypassed.
- [x] Patient mode build: no care team view, no example protocol. Evidence: `workflows.md` D01 to D10. One check failed: a generated plan with a hand-added `approvedOn` loads (D05, L2-05). It is open and listed in plan section 11.4.
- [ ] Camera denied, no camera, camera lost during a session. PARTLY: denied and no camera passed (`workflows.md` G01 to G04). A lost camera is NOT RUN (G05): a page script `stop()` fires no `ended` event.
- [ ] Low memory phone (Redmi A3): load, camera, model, 60 second frame rate. NOT RUN. UNPROVEN.

## Final live test gate (user order, 2026-11-08)

The user ordered: "in the end launch a full and factual live test, fixing any issue found". This gate runs last, on the finished and committed tree. It does not end until the issue list is empty or every open item is recorded with its reason.

- [ ] Freeze: full precheck green, commit, build once. Record the commit id. Round 1 ran on commit b451206. The fix commits are 6264037, 8a148dd and 939d096. Round 2 ran on 939d096. The later commits are ab171d3 and 903d2c9 (the final tree). `docs/test-results.md` holds the precheck and the browser suites of 903d2c9. The build of 903d2c9 had no live run. Not ticked: no live run covers the final tree.
- [ ] Live run A uses the real built app. The real clips play as the fake webcam, made with `scripts/clip-to-webcam.sh`. Test every item of "Features to test with a person in view" and "Every workflow, end to end" above, with one clip for each exercise. Read the screenshots by eye. Keep the console, network and CSP logs. Round 1 is done (four testers, 4 reports in `docs/live-test/`). Round 2 is done (`docs/live-test/retest.md`, one tester, commit 939d096). A live run on the final tree 903d2c9 is NOT RUN. Not ticked.
- [ ] Live run B uses the real phone over the tailnet. Serve the build on 100.77.0.108. Set the two Chrome flags. Follow the pairing steps of `docs/pairing-wiring.md`. Check the camera, the model load and the frame rate. The user does the taps. Anything not done on the real phone stays marked UNPROVEN. NOT RUN (still true after audit 3). The Chrome flags are not named in any document (PENDING).
- [x] Factual record: for each check, what was done, what was seen, the evidence file, PASS or FAIL. No result without evidence. A check that did not run is marked NOT RUN with the reason. The round 1 reports and the round 2 report follow this format. The evidence files of round 2 stay in a scratch folder outside the repository.
- [ ] Fix loop: each FAIL becomes an issue with evidence. A fix agent fixes it test first. The same check re-runs after the fix. Repeat until no issue is open. Each loop round re-runs the full precheck and the browser suites. Round 1 gave one fix loop (three commits). Round 2 re-ran the checks: 3 failed and 1 was partly fixed. Round 3 (ab171d3) and the audit 3 fixes (903d2c9) are two more fix rounds, and their check re-runs are NOT RUN. Not ticked.
- [x] Independent audit of the final tree, then the Opus final verdict (`docs/final-audit.md`): DONE on commit b00d2aa (Opus at high effort, user-authorized). Verdicts: (A) supervised developer demo YES. (B) pilot with one real phone and a clinician watching NOT YET. (C) any patient use NO. H2 (the guard scripts) is improved, not fixed. The fixes of this audit (F5a) are in progress.
- [ ] Live re-test of round 3 and of the F4a fixes on the built app: PENDING. The final audit asks for it before any pilot (next step 4).
- [ ] Real phone test on the Redmi A3: NOT RUN.
- [x] Accuracy study kit (T13): protocol `docs/accuracy-study-protocol.md`, blank sheet `docs/accuracy-study-sheet.csv`, tool `app/scripts/accuracy-analyze.mjs` and its tests with SYNTHETIC rows. The kit is ready. No data exists.
- [ ] Real accuracy study against a goniometer with 10 healthy volunteers (T13): NOT RUN. It needs volunteers, two goniometer readers, a phone, consent, and a clinician and statistician decision on the rule in the protocol. The 9 degrees stays a start value until it runs.
- [ ] Clinician review of every value and text: NOT RUN.
- [ ] Final report to the user: what passed, what failed and was fixed, what is still unproven (real phone, real accuracy, clinician review, regulatory decision).

### Round 2 and audit 3 counts

| Report | Result |
|---|---|
| `retest.md` (round 2, commit 939d096, one tester) | 22 round 1 fixes: 18 verified, 3 failed (Back button, 195 px layout twice), 1 partly. New issues: R2-01 to R2-08, 0 HIGH |
| `audit-3.md` (commit ab171d3, one agent, read-only) | 2 HIGH, 9 MEDIUM, 16 LOW. Verdicts: a supervised developer demo yes, a pilot with a real phone and a clinician watching not yet, any patient use no |

### Round 1 counts (commit b451206)

| Report | Result |
|---|---|
| `exercise-flows.md` (a person in view, 8 clips) | 50 checks: 41 PASS, 5 FAIL, 4 NOT RUN. Issues: 1 HIGH, 2 MEDIUM, 6 LOW |
| `workflows.md` (no person in view) | 134 PASS, 3 FAIL, 5 NOT RUN, 5 NOTE. 0 HIGH, 5 MEDIUM, 6 LOW |
| `pairing.md` (second camera, two Chromium browsers) | 48 checks: 40 PASS, 2 FAIL, 6 NOT RUN. 0 HIGH, 2 MEDIUM, 5 LOW |
| `performance.md` (speed, memory, size, extremes) | 34 checks: 20 PASS, 11 FAIL, 3 NOT RUN. 0 HIGH, 5 MEDIUM, 5 LOW |

## Body map overlay (user request, 2026-11-09, only if it helps)

The user showed two physiotherapy apps that draw the body on the camera picture. The user decided: add it only if it improves a feature of the app, such as the count or the evaluation. A map does not evaluate form, so the case rests on the count and on Setup. The live tests showed that tracking the wrong leg gave 0 reps on clip 01 and 4 reps on the other leg. Build it as a small experiment with two gates. Gate 1: the median pose loop frame rate drops by no more than 1 fps with the map on. Measure it over 60 seconds on the real clips, on the same machine. Gate 2: on the real clips, a wrong leg or a lost joint is clearly visible on the map. If a gate fails, remove the map and report the numbers.

Status on 2026-11-09: the map is built in Setup (`app/src/ui/BodyMap.tsx`, commit 8a148dd). It is NOT in Session. No document records a result for gate 1, so Session stays without the map (PENDING). Gate 2 was replaced by unit tests on the saved landmarks of the real clips (`tests/ui/bodyMapClips.test.tsx`). Those tests check the style of the legs, the label of a lost joint and the position of the knee. They are not a reading by three people, which the study of `docs/ui-ideas.md` asked for. So gate 2 as written is NOT RUN.

- [x] Draw the skeleton as an SVG layer over the camera picture. Do not use a canvas that holds the video. The app must never copy a frame. Evidence: `bodyMap.test.tsx` (no canvas, no frame call, no pixel read) and the frame-drawing guard in `claims-check.sh`.
- [x] Draw the bones and joints that the pose model finds. The chosen leg (hip, knee, ankle) is drawn stronger. Other joints are drawn softer. Evidence: `bodyMap.test.tsx`.
- [x] A joint with low visibility is drawn dim or dashed, and the rule "leg not seen" stays the same. Changed: the map shows a label such as "Ankle not seen" in the top corner and hides the bones to that joint. It draws no ring at the guess of the model. Evidence: `bodyMap.test.tsx`, `bodyMapClips.test.tsx`.
- [x] Draw the knee angle arc on the chosen leg with the live number, with the label "estimated angle". Evidence: `bodyMap.test.tsx`.
- [x] The picture and the map use the same mirror setting. A test proves that the map follows the person. Evidence: `bodyMap.test.tsx`, `bodyMapAspect.test.tsx`, `bodyMapClips.test.tsx`.
- [ ] Draw with no React state per frame, so the pose loop keeps its frame rate. Measure the frame rate before and after. PARTLY: a test shows 1 commit for the mount and none for 200 frames. The frame rate before and after is NOT RUN (gate 1).
- [x] Use neutral colours. No green or red verdict colour. No score. No "perfect form" text. The user decided earlier that the app never judges form. Evidence: `bodyMap.test.tsx`.
- [x] A hold timer ring or bar for the seated hold, with the seconds left. The hold time comes from the protocol. Built as the hold meter in Session (a text and a bar, `Session.tsx`).
- [x] Keep an off switch ("Hide body map") for a person who finds it distracting. Evidence: `bodyMap.test.tsx`. The choice is kept for the page session only.
- [ ] Test with the real clips: the map must sit on the person. PARTLY: unit test on saved landmarks of real clips. A look at live screenshots is PENDING (the re-test).

## UI ideas study (2026-11-09)

The study is `docs/ui-ideas.md`: 163 finds of designeer.xyz, 19 ideas. Built in commit 8a148dd and neighbours: U4 tabular numbers, U8 rest panel, U6 hold meter, U3 first-view layout and U10 status line. Also built: U12 import states, U15 and U16 chart cards with the error band, and U19 unseen rules first. Also built: U13 and U14 numbered guide, and the body map in Setup. NOT built: U7 (tone for each rep) and U5 (rep pips). Their gates need a test with 5 people, which has not run.

## Quality gates
- [x] Full precheck. Full `npm run e2e`. `npm run e2e:pairing`. `docs/test-results.md` holds the final run on commit 903d2c9. It has 2,978 tests in 147 files. `npm run e2e` has 154 tests across all its projects (130 in the `app` project, 14 in WebKit, 10 in older harness projects). The pairing suite has 18 tests and passed in 3 runs out of 3. The final audit re-ran the precheck and got the same 2,978 tests. The main session ran them. The raw logs are not in the repository and I did not re-run them. The older count of 2,815 tests in 140 files is superseded.
- [x] Lighthouse 95 or more. axe zero violations. WebKit smoke test. Round 2 on commit 939d096 (`retest.md`): Lighthouse Performance 99 to 100, Accessibility 100 and Best practices 100 in 12 runs on Load and Home. axe had 0 violations at 390 px and 320 px. WebKit passed 14 tests on the final tree (`docs/test-results.md`, camera stubbed). SEO is 63 and its target is dropped (`docs/lighthouse.md`). Round 1 numbers (Mobile Performance 97, 99 and 92) are older. No Lighthouse run covers ab171d3 or 903d2c9 (NOT RUN). A plan screen got no Lighthouse run. The 195 px layout failed in round 2 and has no re-run.
- [x] Final independent audit and the Opus final verdict (`docs/final-audit.md`): DONE on commit b00d2aa. Developer demo YES, pilot NOT YET, any patient use NO.
- [ ] Live re-test of round 3 and of the F4a fixes: PENDING.
- [ ] Real-phone test (Redmi A3, tailnet, real Wake Lock): NOT RUN.
- [ ] Clinician review of every value and text: NOT RUN.

## Round 3 live re-test (2026-11-09, commit 045b73d)

Report: `docs/live-test/retest3.md`. 16 changes checked in the real build: 14 verified, 1 partly fixed, 1 unchanged (L2-05). No fix failed. No new HIGH or MEDIUM issue. The eight starting-angle clicks on clip 01 gave 6, 4, 4, 4, 4, 4, 4 and 5 degrees (round 2: 20 to 46).
- [x] R3-01 "1 degrees" in the top angle text: fixed with a test that failed first (`tests/cues.test.ts`).
- [x] R3-02 The starting-angle button sits under the bottom bar on a small screen (LOW). Before, measured with the fake camera, the button ended 369 px (390 x 844) and 439 px (360 x 640) under the bar. After: it ends 208 px and 165 px above the bar, with the camera, the count and the angle above the bar. Fix: the button comes right after the camera and before the numbers. The picture is 4 rem lower. On a screen shorter than 41 rem the gaps are smaller. The picture is then 64 px high at 360 x 640. Tests that failed first: `tests/ui/sessionCapture.test.tsx` (button before the numbers) and `e2e/app-session-layout.spec.ts` (two sizes). At 320 px and 195 px wide there is no sideways scroll, and the button is inside the width. The pinned constant in `tests/ui/styles.test.ts` changed from 33 rem to 37 rem on purpose.
- [x] R3-03 "Finish" can be out of view with a pause message at 390 x 844 (LOW, one screenshot, not measured). Before, measured: the pause message ended 99 px and "Finish" 167 px under the top of the bar. After: they end 187 px and 119 px above the bar, and the pain scale is in reach. Fix: during a rest the panel comes before the camera on a phone. Test that failed first: `e2e/app-session-layout.spec.ts`. NOT FIXED at 360 x 640 with the hand-count bar. The pause message ends 17 px under the bar and "Finish" ends 85 px under it. The banners and the three-row bar leave about 258 px. The request named 390 x 844 only.
- [x] R3-04 Back inside the generator questions leaves the generator and drops the answers (design note). Fixed. Back goes one question back and keeps the answers. On the first question, Back goes to Home or to the Load screen. From "Check your answers" it goes to the last question. The shell asks the questions screen first (`backRef`). The red-flag guard of `backStep` is unchanged and the answers stay in memory only. Tests that failed first: two tests in `tests/ui/appGenerator.test.tsx` ("Back of the browser inside the questions").
- [ ] R3-05 Rule codes such as "(RANGE_SURGEON)", "(PH2)" and "(HEEL)" show in the Update plan text (LOW). The codes are consistent, so this is a design choice for the user.
- [ ] L2-05 A generated file with a hand-added `approvedOn` loads in the patient build. Stays open (regulatory item).
- Unproven: the real Redmi A3, a real Wake Lock, speed on a phone, accuracy against a goniometer. The over-limit repeat beep is proven only at a fixture limit of 45.

