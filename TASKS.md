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

## Quality gates
- [ ] Full precheck. Full `npm run e2e`. `npm run e2e:pairing`.
- [ ] Lighthouse 95 or more. axe zero violations. WebKit smoke test.
- [ ] Final independent audit and the Opus final verdict (`docs/final-audit.md`).
