# Verification campaign with real videos

Status: planned on 2026-11-08. It starts after the UI build and the pairing wiring. Tick each item when it has evidence.

## How the real videos are used
- Method A: the clip tool `app/scripts/analyze-clip.mjs` runs a clip through the real pose pipeline. It gives detection rate, angle trace and reps. See `docs/clip-analysis.md`.
- Method B: ffmpeg converts a clip to a file that Chromium plays as the fake webcam (`--use-file-for-fake-video-capture`). The real app then runs every screen with a real person in view.
- A clip never enters the repository. Clips and outputs stay in the scratchpad or in `app/.clip-out/`.
- One clip is a smoke test. It is not a validation of accuracy.

## Blocked until the user decides
- [ ] Source of the clips. YouTube terms forbid downloads with a tool. The user decides: own phone clips, clips that the user downloads, or `yt-dlp` for private tests after a safety check.

## Features to test with a person in view
- [ ] Setup rules: person, three joints, whole leg, leg size, side-on, held still. Each rule changes from "not seen" to "seen".
- [ ] Position guide and camera guide match what the clip shows.
- [ ] Heel slide: reps counted, peak angle, near-limit and over-limit cues, margin rule at the edges.
- [ ] Straight leg raise, mini squat, seated hold: counters, hold timer, lost leg resets the timer.
- [ ] Wrong side, front view, partly out of frame: the app says what to fix and does not count.
- [ ] Stop, "knee gave way or hurts", hidden tab: the camera ends and the session closes.
- [ ] Summary: pain and swelling answers, pause message at pain 7 or more, Save, Do not save.
- [ ] Progress charts and tables with saved sessions. Export JSON and CSV. Import. Erase.
- [ ] Second camera: phone sends landmarks, host receives them, front-view change shows for the clinician only.

## Every workflow, end to end
- [ ] First launch, privacy notice, load protocol, bad file, Home, reload keeps the protocol.
- [ ] Red-flag check: block is sticky, Back to Home, fresh visit continues.
- [ ] Direct routes and browser Back never skip the red-flag check.
- [ ] Patient mode build: no care team view, no example protocol.
- [ ] Camera denied, no camera, camera lost during a session.
- [ ] Low memory phone (Redmi A3): load, camera, model, 60 second frame rate.

## Final live test gate (user order, 2026-11-08)

The user ordered: "in the end launch a full and factual live test, fixing any issue found". This gate runs last, on the finished and committed tree. It does not end until the issue list is empty or every open item is recorded with its reason.

- [ ] Freeze: full precheck green, commit, build once. Record the commit id.
- [ ] Live run A uses the real built app. The real clips play as the fake webcam, made with `scripts/clip-to-webcam.sh`. Test every item of "Features to test with a person in view" and "Every workflow, end to end" above, with one clip for each exercise. Read the screenshots by eye. Keep the console, network and CSP logs.
- [ ] Live run B uses the real phone over the tailnet. Serve the build on 100.77.0.108. Set the two Chrome flags. Follow the pairing steps of `docs/pairing-wiring.md`. Check the camera, the model load and the frame rate. The user does the taps. Anything not done on the real phone stays marked UNPROVEN.
- [ ] Factual record: for each check, what was done, what was seen, the evidence file, PASS or FAIL. No result without evidence. A check that did not run is marked NOT RUN with the reason.
- [ ] Fix loop: each FAIL becomes an issue with evidence. A fix agent fixes it test first. The same check re-runs after the fix. Repeat until no issue is open. Each loop round re-runs the full precheck and the browser suites.
- [ ] Independent audit of the final tree, then the Opus final verdict (`docs/final-audit.md`).
- [ ] Final report to the user: what passed, what failed and was fixed, what is still unproven (real phone, real accuracy, clinician review, regulatory decision).

## Body map overlay (user request, 2026-11-09, only if it helps)

The user showed two physiotherapy apps that draw the body on the camera picture. The user decided: add it only if it improves a feature of the app, such as the count or the evaluation. A map does not evaluate form, so the case rests on the count and on Setup. The live tests showed that tracking the wrong leg gave 0 reps on clip 01 and 4 reps on the other leg. Build it as a small experiment with two gates. Gate 1: the median pose loop frame rate drops by no more than 1 fps with the map on. Measure it over 60 seconds on the real clips, on the same machine. Gate 2: on the real clips, a wrong leg or a lost joint is clearly visible on the map. If a gate fails, remove the map and report the numbers.

- [ ] Draw the skeleton as an SVG layer over the camera picture. Do not use a canvas that holds the video. The app must never copy a frame.
- [ ] Draw the bones and joints that the pose model finds. The chosen leg (hip, knee, ankle) is drawn stronger. Other joints are drawn softer.
- [ ] A joint with low visibility is drawn dim or dashed, and the rule "leg not seen" stays the same.
- [ ] Draw the knee angle arc on the chosen leg with the live number, with the label "estimated angle".
- [ ] The picture and the map use the same mirror setting. A test proves that the map follows the person.
- [ ] Draw with no React state per frame, so the pose loop keeps its frame rate. Measure the frame rate before and after.
- [ ] Use neutral colours. No green or red verdict colour. No score. No "perfect form" text. The user decided earlier that the app never judges form.
- [ ] A hold timer ring or bar for the seated hold, with the seconds left. The hold time comes from the protocol.
- [ ] Keep an off switch ("Hide body map") for a person who finds it distracting.
- [ ] Test with the real clips: the map must sit on the person.

## Quality gates
- [ ] Full precheck. Full `npm run e2e`. `npm run e2e:pairing`.
- [ ] Lighthouse 95 or more. axe zero violations. WebKit smoke test.
- [ ] Final independent audit and the Opus final verdict (`docs/final-audit.md`).
