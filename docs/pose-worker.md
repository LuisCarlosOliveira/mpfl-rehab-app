# Pose worker: measurement

Date: 2026-11-09. Task T42 ([plan](../MPFL_APP_PLAN.md)). The design is in [architecture.md](architecture.md), section "Pose worker".

## Summary

The pose model now runs in a Web Worker. On this machine the worker gives no gain in detections per second. Both builds reach the frame rate of the fake camera (about 24 frames per second) when the machine is quiet. Under load both fall to about 15. The gain is in the main thread. In 75 seconds, the main-thread build had a median of 91 long tasks (5.0 s) on a quiet machine. Under load it had a median of 1,081 long tasks (72.0 s). The worker build had none in 11 of 12 runs. The twelfth run had 26 long tasks (3.1 s), while another project pushed the load to 21. The reps and the angle range did not get worse. The worker ships ON, with a build flag that turns it OFF.

## What was compared

- Before: the same source with the build flag `VITE_POSE_WORKER=off`. This is the old path. The model runs on the main thread, in the frame callback of the loop. No source file of that path changed in behavior.
- After: the default build. The model runs in the worker.
- Both builds were made with `vite build` into a private folder (outside `app/dist`) and served with `vite preview` on ports 4376 (before) and 4375 (after).
- Browser: headless Chromium of Playwright, fake camera with a clip as the video file (Method B of [clip-analysis.md](clip-analysis.md), converted with `scripts/clip-to-webcam.sh`). Fresh profile for each run.
- The run is 75 seconds in the Session screen. At 20 seconds the script presses "Use my lowest steady angle as the start", as a person does, when the button is enabled.
- Runs alternate between the two builds, so that both see the same load of the machine.
- Clips: 01 heel slide, 02 heel slide with cuts, 03 and 04 straight leg raise (side), 05 and 07 mini squat (side and front). The mini squat runs used a copy of the example protocol with `activePhase` 2. The copy stays in the scratch folder.

## How each number was made

- Detections per second: for the worker build, the count of `result` messages from the worker. For the main-thread build, the count of video frame callbacks (the loop calls the model once in each). The table gives the median and the mean of the count in each full second.
- Gap p95: the 95th percentile of the time between two detections.
- Long tasks: the browser `longtask` entries (tasks of more than 50 ms on the main thread) that start inside the 75 second window.
- Angle and reps: the angle readout of the Session, read every 100 ms, and the rep count at the end of the run. The screen shows a new value at most 4 times each second.
- Load: the one-minute load average from `uptime` at the start of the window and at its end. The machine has 8 cores. Other projects ran at the same time and made the load change between runs.

## Result

Runs with a load of 2.5 or less at both ends ("quiet"), and the others ("loaded"):

| Regime | Build | Runs | Detections per second (median of the medians) | Mean (mean of the means) | Long tasks in 75 s (median count) | Long task time (median) |
|---|---|---|---|---|---|---|
| quiet | main thread | 4 | 24.0 | 23.4 | 91 | 5.0 s |
| quiet | worker | 5 | 24.0 | 23.8 | 0 | 0.0 s |
| loaded | main thread | 8 | 15.0 | 15.0 | 1,081 | 72.0 s |
| loaded | worker | 7 | 15.0 | 16.1 | 0 | 0.0 s |

All runs:

| Run | Clip | Detections per second (median, mean) | Gap p95 (ms) | Long tasks (count, total s) | Angle min to max | Reps | Load avg 1 min (start, end) |
|---|---|---|---|---|---|---|---|
| main r1 | 01 | 16, 15.0 | 94 | 1094, 72.0 | 4 to 141 | 0 | 4.8, 4.5 |
| worker r1 | 01 | 4, 6.9 | 620 | 26, 3.1 | 4 to 142 | 0 | 4.5, 21.3 |
| main r2 | 01 | 15, 14.4 | 96 | 1078, 73.8 | 3 to 142 | 0 | 9.0, 6.1 |
| worker r2 | 01 | 15, 15.9 | 85 | 0, 0.0 | 4 to 141 | 0 | 19.8, 9.1 |
| main r1 | 02 | 24, 23.7 | 50 | 90, 5.2 | 1 to 172 | 1 | 1.8, 1.3 |
| worker r1 | 02 | 24, 24.0 | 51 | 0, 0.0 | 1 to 132 | 2 | 1.6, 1.3 |
| main r2 | 02 | 14, 16.4 | 90 | 758, 52.8 | 0 to 170 | 1 | 1.0, 3.4 |
| worker r2 | 02 | 24, 24.0 | 51 | 0, 0.0 | 1 to 171 | 2 | 1.2, 1.1 |
| main r1 | 03 | 15, 15.5 | 80 | 1085, 70.7 | 1 to 78 | 0 | 6.6, 4.3 |
| worker r1 | 03 | 24, 23.4 | 50 | 0, 0.0 | 1 to 77 | 1 | 4.2, 2.2 |
| main r2 | 03 | 24, 23.3 | 52 | 94, 5.1 | 1 to 67 | 0 | 2.2, 1.6 |
| worker r2 | 03 | 24, 23.6 | 51 | 0, 0.0 | 1 to 72 | 0 | 2.2, 2.2 |
| main r1 | 04 | 24, 23.4 | 51 | 90, 5.0 | 0 to 167 | 6 | 1.5, 1.5 |
| worker r1 | 04 | 24, 23.8 | 49 | 0, 0.0 | 0 to 170 | 6 | 2.0, 1.8 |
| main r2 | 04 | 23, 23.3 | 51 | 92, 5.0 | 0 to 147 | 6 | 2.0, 1.4 |
| worker r2 | 04 | 24, 23.9 | 49 | 0, 0.0 | 0 to 165 | 6 | 2.2, 1.8 |
| main r1 | 05 | 15, 15.0 | 84 | 1107, 72.8 | 1 to 75 | 0 | 3.5, 4.4 |
| worker r1 | 05 | 16, 16.8 | 73 | 0, 0.0 | 0 to 90 | 2 | 4.5, 4.1 |
| main r2 | 05 | 16, 15.5 | 81 | 1131, 72.1 | 0 to 67 | 1 | 5.0, 4.4 |
| worker r2 | 05 | 15, 15.2 | 88 | 0, 0.0 | 0 to 67 | 2 | 4.0, 5.1 |
| main r1 | 07 | 16, 17.0 | 74 | 965, 59.9 | 0 to 20 | 0 | 4.2, 3.8 |
| worker r1 | 07 | 24, 23.2 | 50 | 0, 0.0 | 0 to 22 | 0 | 3.6, 2.0 |
| main r2 | 07 | 11, 10.9 | 108 | 816, 73.9 | 0 to 18 | 0 | 8.5, 9.6 |
| worker r2 | 07 | 11, 11.7 | 99 | 0, 0.0 | 0 to 17 | 0 | 2.5, 7.7 |

Reps at the end of the run, for the two runs of each clip (main thread, then worker):

| Clip | Main thread | Worker |
|---|---|---|
| 01 heel slide | 0, 0 | 0, 0 |
| 02 heel slide with cuts | 1, 1 | 2, 2 |
| 03 straight leg raise | 0, 0 | 1, 0 |
| 04 straight leg raise | 6, 6 | 6, 6 |
| 05 mini squat, side | 0, 1 | 2, 2 |
| 07 mini squat, front | 0, 0 | 0, 0 |

## How to read this

- No gain in the rate. The rate is the lower of two limits: the frame rate of the camera and the speed of the model. A quiet machine reaches the frame rate of the fake camera in both builds. A loaded machine slows the model in both builds. One worker run fell to a median of 4 detections per second (clip 01, run 1, load 4 to 21). The worker does not make the model faster. The model uses the same CPU.
- A first version of the bridge waited for the next video frame after each result. It reached 13.6 and 13.8 detections per second on clip 01 with a load of about 3. The main-thread build reached 15.7. This was slower. The bridge now takes the frame that shows at once when a result comes (tests in `tests/pose/frameBridge.test.ts`). The same clip then gave 18.1 detections per second in one run. The runs of the table use this final version.
- The gain is the main thread. With the model on the main thread, the page was blocked for up to 72 of 75 seconds under load. In the worker build the main thread had no long task. The Stop button, the body map and the angle text can react while the model runs. A tap on Stop was not timed (NOT RUN).
- Reps and angle. The counts do not get worse. The worker runs show the same or a higher count on every clip. The two runs of clip 02 and clip 05 differ by one or two reps between the builds. Two causes are likely but not proven: the press time of the lowest-angle button and the place of the looping clip at the start. The counts are a smoke test with no ground truth. The clips 01 and 07 give 0 reps in every run. On clip 01 the angle goes to 141 degrees and the example limit is 90, so a rep over the limit does not count. The reason for clip 07 was not examined. The angle range of each clip is the same in both builds.
- The guards for the counts stay the offline clip tests and the counter tests (`tests/analyzeClip.test.ts`, `tests/counters.test.ts`, `tests/legRaiseCounter.test.ts`, `tests/exercises.test.ts`). The worker changes no code of these paths. They read the same landmark numbers.

## Other checks

- Browser specs on the real build with the fake camera (own build, port 4375): the new `e2e/app-pose-worker.spec.ts` (4 tests) and `e2e/camera-exit.spec.ts` (7 tests) passed. The new spec has no CSP violation, no console error and no foreign request, and each result message holds only `type`, `timestampMs` and landmark numbers. Stop and Back end the worker (`terminate()` called once) and every track is ended.
- The new spec failed 3 of 4 tests when it ran against the main-thread build, so it can fail.
- WebKit (Playwright, port 4375): `e2e/webkit.spec.ts` passed 14 of 14. A probe showed that the worker starts in WebKit and loads the model (the `ready` message came, with the load bytes). The stub camera of that spec gives no video frame, so the frame path in WebKit is NOT PROVEN.
- A browser with no `Worker` runs the model on the main thread (spec test and unit tests).
- Request check: the page made no request to another origin in any run. The model and the WASM files came from the own origin.

## Limits

- One machine, a shared one, with a changing load. The numbers show a pattern and not a precise gain.
- Headless Chromium with a fake camera and software graphics. A real phone (the Redmi A3 for example) is NOT RUN. The speed of the worker on Android Chrome, and the cost of the picture on the main thread there, are UNPROVEN.
- The main-thread build in "before" is the new source with the flag off. It is not the old commit. The old loop and the old landmarker code run unchanged in it.
- Real Safari on iOS is NOT RUN.
