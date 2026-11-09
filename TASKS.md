# Verification campaign with real videos

Status: planned on 2026-11-08. It starts after the UI build and the pairing wiring. Tick each item when it has evidence.

Update 2026-11-09: live test round 1 ran on 2026-11-08 and 2026-11-09 with four testers (commit b451206). Fixes followed in commits 6264037, 8a148dd and 939d096. Each item below has a note with its evidence or its gap. The re-test of the fixes is PENDING. The report will be `docs/live-test/retest.md`. A tick means that a round 1 report holds the evidence. A note "PARTLY" or "NOT RUN" means no tick. Counts are from the four reports and were not re-run by me.

## How the real videos are used
- Method A: the clip tool `app/scripts/analyze-clip.mjs` runs a clip through the real pose pipeline. It gives detection rate, angle trace and reps. See `docs/clip-analysis.md`.
- Method B: ffmpeg converts a clip to a file that Chromium plays as the fake webcam (`--use-file-for-fake-video-capture`). The real app then runs every screen with a real person in view.
- A clip never enters the repository. Clips and outputs stay in the scratchpad or in `app/.clip-out/`.
- One clip is a smoke test. It is not a validation of accuracy.

## Blocked until the user decides
- [x] Source of the clips. The user accepted `yt-dlp` for private tests after a safety check (`docs/dependency-vetting-ytdlp.md`, plan T21). Eight public Creative Commons clips ran. Their licences and attribution are in `docs/accuracy.md`. The clips never enter the repo.

## Features to test with a person in view
- [ ] Setup rules: person, three joints, whole leg, leg size, side-on, held still. Each rule changes from "not seen" to "seen". PARTLY: the rules changed from "not seen" to "seen" in 10.9 s on clip 04. The countdown ran in 1 of 3 runs on clip 04 and in no run on the other clips (`exercise-flows.md`, checks 10 and 16).
- [ ] Position guide and camera guide match what the clip shows. PARTLY: the guide figures and text read well at 390 px (checks 6 and 7). A match with each clip was not judged. The guide text named the operated leg when the other leg was chosen (L1-06). Fixed later in the numbered guide, re-test PENDING.
- [ ] Heel slide: reps counted, peak angle, near-limit and over-limit cues, margin rule at the edges. NOT RUN for the count: no clip gave a resting angle, so the count was 0 (checks 14, 18 and 50). The cues ran (checks 22 and 23). The in-place capture of the fix loop is the answer. A run on a clip is PENDING.
- [ ] Straight leg raise, mini squat, seated hold: counters, hold timer, lost leg resets the timer. PARTLY: the seated hold counted 1 hold of about 6 on clip 06, and the restart cue showed (checks 19 and 20). The straight leg raise ran by hand with "Count this rep". The mini squat count is NOT RUN (no resting angle).
- [ ] Wrong side, front view, partly out of frame: the app says what to fix and does not count. PARTLY: the setup texts said what to fix (check 11). The front-view mini squat clip counted 0. The note for the other leg showed on three clips, and the truth for the leg is not known (L1-08).
- [ ] Stop, "knee gave way or hurts", hidden tab: the camera ends and the session closes. PARTLY: Stop, Cancel and the gave-way press ended the camera (checks 29 to 31). A real hidden tab is NOT RUN, because headless Chromium never reports hidden. The synthetic `visibilitychange` and `pagehide` events ran in `workflows.md` (G08) and `pairing.md` (check 28).
- [x] Summary: pain and swelling answers, pause message at pain 7 or more, Save, Do not save. Evidence: `exercise-flows.md` checks 32 to 35 and `workflows.md` E01 to E18. Live test 1 found that pain 7 alone gave no message (L1-01, HIGH). The fix is in commit 6264037. The re-test is PENDING.
- [x] Progress charts and tables with saved sessions. Export JSON and CSV. Import. Erase. Evidence: `exercise-flows.md` checks 37 to 44 and `workflows.md` F01 to F29. Live test 1 found that an import did not keep the id of the file (L1-02). The fix is in commit 6264037. The re-test is PENDING.
- [x] Second camera: phone sends landmarks, host receives them, front-view change shows for the clinician only. Evidence: `pairing.md` checks 15 to 22 (two Chromium browsers, 1,184 messages, no image field). It did not run on a real phone.

## Every workflow, end to end
- [x] First launch, privacy notice, load protocol, bad file, Home, reload keeps the protocol. Evidence: `workflows.md` A01 to A09. A long text field made the page 537 px wide at 390 px (A10 FAIL, L2-06). The fix is in the fix loop. The re-test is PENDING.
- [x] Red-flag check: block is sticky, Back to Home, fresh visit continues. Evidence: `workflows.md` B01 to B11 (all 9 items).
- [x] Direct routes and browser Back never skip the red-flag check. Evidence: `workflows.md` B12 to B17. The Android Back button leaves the app (L2-10, LOW). No gate is bypassed.
- [x] Patient mode build: no care team view, no example protocol. Evidence: `workflows.md` D01 to D10. One check failed: a generated plan with a hand-added `approvedOn` loads (D05, L2-05). It is open and listed in plan section 11.4.
- [ ] Camera denied, no camera, camera lost during a session. PARTLY: denied and no camera passed (`workflows.md` G01 to G04). A lost camera is NOT RUN (G05): a page script `stop()` fires no `ended` event.
- [ ] Low memory phone (Redmi A3): load, camera, model, 60 second frame rate. NOT RUN. UNPROVEN.

## Final live test gate (user order, 2026-11-08)

The user ordered: "in the end launch a full and factual live test, fixing any issue found". This gate runs last, on the finished and committed tree. It does not end until the issue list is empty or every open item is recorded with its reason.

- [ ] Freeze: full precheck green, commit, build once. Record the commit id. Round 1 ran on commit b451206. The fix commits are 6264037, 8a148dd and 939d096. The freeze for the re-test is PENDING.
- [ ] Live run A uses the real built app. The real clips play as the fake webcam, made with `scripts/clip-to-webcam.sh`. Test every item of "Features to test with a person in view" and "Every workflow, end to end" above, with one clip for each exercise. Read the screenshots by eye. Keep the console, network and CSP logs. Round 1 is done (four testers, 4 reports in `docs/live-test/`). The re-test on the fixed tree is PENDING.
- [ ] Live run B uses the real phone over the tailnet. Serve the build on 100.77.0.108. Set the two Chrome flags. Follow the pairing steps of `docs/pairing-wiring.md`. Check the camera, the model load and the frame rate. The user does the taps. Anything not done on the real phone stays marked UNPROVEN. NOT RUN. The Chrome flags are not named in any document (PENDING).
- [ ] Factual record: for each check, what was done, what was seen, the evidence file, PASS or FAIL. No result without evidence. A check that did not run is marked NOT RUN with the reason. Round 1 reports follow this format.
- [ ] Fix loop: each FAIL becomes an issue with evidence. A fix agent fixes it test first. The same check re-runs after the fix. Repeat until no issue is open. Each loop round re-runs the full precheck and the browser suites. Round 1 gave one fix loop (three commits). The check re-runs are PENDING.
- [ ] Independent audit of the final tree, then the Opus final verdict (`docs/final-audit.md`). The file does not exist.
- [ ] Final report to the user: what passed, what failed and was fixed, what is still unproven (real phone, real accuracy, clinician review, regulatory decision).

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
- [ ] Full precheck. Full `npm run e2e`. `npm run e2e:pairing`. The main session reported 2,815 unit tests in 140 files, 154 browser tests, 14 WebKit tests and 18 pairing tests (three runs in a row). No report file holds these runs (not re-run by me).
- [ ] Lighthouse 95 or more. axe zero violations. WebKit smoke test. Round 1 on commit b451206: Accessibility 100 in 18 runs. axe found 0 violations on 37 screens at two sizes. Mobile Performance was 97, 99 and 92. SEO was 63. The SEO target is dropped (`docs/lighthouse.md`). After the first-load split the main session reported a Home median of 95. No report holds it (PENDING).
- [ ] Final independent audit and the Opus final verdict (`docs/final-audit.md`). The file does not exist.
