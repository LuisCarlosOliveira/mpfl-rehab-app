# Accuracy record

This file records the angle error and the frame rate of the app. It follows [plan NFR3 and NFR4](../MPFL_APP_PLAN.md) and task T13.

## Status

No reference data exists. No goniometer data and no consented real-video clip have been collected. No frame rate has been measured on a phone. Update 2026-11-09: the frame rate of the pose loop was measured on one laptop with no GPU (section "Frame rate" below). No angle error was measured against a reference.

The margin of 9 degrees is a start value. It is UNVERIFIED for the `lite` model. It comes from a study of the highest-complexity model on still photos. The source is in [research/form-opus.md section 2.3](../research/form-opus.md). The margin rule is in section 4.3 of the same file. Reported errors range from about 3 to 15 degrees. The 15 degree figure is UNVERIFIED ([research/tech.md section 2.3](../research/tech.md)).

## Collect the data for the margin

Each view needs its own data, because the front view has a different error. Record one row for each pair of values.

The proposed minimum is 30 pairs for each view. This number is a PROPOSAL and not a source. A statistician must review it. The script prints no margin below this number.

### File for the margin

Use a CSV file with a header, commas, and a decimal point. A line that starts with `#` is a comment. Write the camera setup in comment lines at the top.

```
# device: <name>, browser: <name>, view: side, distance: 2.5 m, light: <text>, model: lite
subject,view,reference_deg,camera_deg
p01,side,45,48.2
```

- `subject`: a code with no name. Do not write a real name.
- `view`: `side` or `front`.
- `reference_deg`: the goniometer value.
- `camera_deg`: the angle that the app showed for the same pose.

### File for the test-retest error

Use the columns `subject,view,session,camera_deg`. Each subject needs 2 or more sessions. Keep the pose and the camera setup the same between sessions.

### Goniometer protocol (PROPOSAL)

A clinician or a physiotherapist must review this protocol before use.

1. Use a universal goniometer. Use one examiner and one goniometer for the whole data set.
2. Place the subject in the pose. Use fixed knee angles, for example 0, 30, 60, 90 and 120 degrees ([research/tech.md section 5.3](../research/tech.md)).
3. Hold the pose still. The examiner reads the goniometer and writes the value.
4. At the same time, the app shows the angle. Write the value that the app shows after it is stable.
5. Repeat for each view. Keep the camera setup fixed for the whole set.

### Camera setup to record

Record the setup in the comment lines of the file. The setup is part of the record.

- The view (`side` or `front`).
- The distance from the camera to the subject.
- The light.
- The device and the browser.
- The model name (`lite`).

Do not store video or photos of faces in the repository.

## Run the script

The script needs only Node. It adds no package.

```
node scripts/bland-altman.mjs data/pairs.csv
node scripts/bland-altman.mjs --repeat data/sessions.csv
```

The output is JSON. For each view, the first mode gives:

- `pairs`: the number of pairs.
- `bias`: the mean of camera minus reference.
- `sd`: the standard deviation of the differences.
- `loaLower` and `loaUpper`: the 95 percent limits of agreement (bias plus and minus 1.96 times `sd`).
- `enoughData`: false below 30 pairs.
- `margin`: the larger absolute limit, rounded up to the next whole degree. It is `null` when `enoughData` is false. Then `marginReason` gives the reason.

The `--repeat` mode gives `withinSubjectSd` and `repeatability` (2.77 times `withinSubjectSd`). The repeatability is the test-retest error.

The script exits with code 2 and a message in four cases. The cases are a missing file, a bad header, a value that is not a number, and fewer than 2 pairs. A decimal comma is an error.

## What the result can change

The result can change `MARGIN_DEG` and its source text in `src/lib/margin.ts`.

Rule: the margin changes only when a recorded data file is in the repository. The new source text must name that file, the number of pairs and the camera setup. Without such a file, the 9 degree start value stays.

## Study kit

NOT RUN. No volunteer data exists. The 9 degrees stays a start value.

The kit is ready for a physiotherapist: the [study protocol](accuracy-study-protocol.md), the [blank sheet](accuracy-study-sheet.csv) and the tool `app/scripts/accuracy-analyze.mjs`. The tool has tests with SYNTHETIC rows only (`app/tests/accuracyAnalyze.test.ts`). The tests prove the maths and the input checks. They prove nothing about the real camera error.

## Frame rate (NFR4)

The target is a median of at least 15 frames per second. Measure it over 60 seconds in headed Chromium, with the `lite` model, on the development machine. Record the median in the table. Phone speed is UNVERIFIED until a phone test.

| Device | Browser | Median fps | Date |
|---|---|---|---|
| Development laptop (i5, 8 threads, no GPU, software rendering, shared with agents) | Chromium (live tests) | About 15 detections per second. 12.6 to 15.3 depending on machine load | 2026-11-09 |
| The same laptop, three clips as the fake camera | Chromium | 14.99 (clip 05), 20 (clip 01) and 29.9 (clip 06) | 2026-11-08 and 2026-11-09 |
| The same laptop, 4x CPU throttle | Chromium | About 3.5 | 2026-11-09 |
| Phone | Chrome | not measured | not measured |
| Phone | Safari | not measured | not measured |

Sources and caveats. The first row is the figure of `docs/test-results.md` (from `docs/live-test/performance.md` and the W4 measurements of the main session). The second row is from `docs/live-test/exercise-flows.md`. The 4x throttle figure of `docs/live-test/performance.md` reads 3.0 in the plan (NFR4), and this record gives about 3.5 as the main session reported. The two figures differ and the cause is not recorded (UNPROVEN). The medians depend on the clip and on the load of the machine. The loop runs on the main thread. Live test round 2 measured 29.94 in 7 of 8 runs and 20.04 in 1 run on clip 01 in Setup, from `requestVideoFrameCallback` (`docs/live-test/retest.md`). The reports do not agree and the cause is not recorded. No measurement exists on a phone, so the target of 15 on a phone is UNPROVEN.

## Baseline spread of the lowest-angle button

Round 2 found that the starting angle of the lowest-angle button depended on the press moment. It gave 46, 41 and 20 degrees in three runs on clip 01 (`docs/live-test/retest.md`, R2-06). Round 3 changed the rule to the lowest 0.5 s plateau of the whole capture (`lib/baseline.ts`, commit ab171d3). The test `tests/baselineStable.test.ts` presses at 24 moments between 15 s and 61 s on clips 01, 02 and 05. It requires a spread of at most 2 degrees. The main session reported a spread of 50.8 degrees before the change and 0.4 degrees after it on clip 01. No document in the repository holds these two numbers (UNPROVEN, not re-run). A clip is a smoke test and not a validation. The plateau value of 0.5 s is ENGINEERING and needs a clinician review.

## Not done

- The Redmi A3 phone test.
- The iOS Safari test.

## Smoke results on public Creative Commons clips, 2026-11-08

This section is a plausibility check of the clip tool. It is not validation. The tool is `app/scripts/analyze-clip.mjs` ([clip analysis](clip-analysis.md)). It ran the real pipeline on 8 public clips. The pose model is `lite`. The target is 60 degrees, the tool default (PROPOSAL, see [clip analysis](clip-analysis.md)). The margin is 9 degrees. No frame and no image is stored in the repository.

### Results for each clip

"Leg run" is the leg that the first run used. "By eye" is a rough count by one person who watched the clip. It is not a reference. Angles are filtered estimated flexion in degrees.

| Clip | Exercise | View | Leg run | Detection | Angle range | Reps counted | By eye |
|---|---|---|---|---|---|---|---|
| 01 | heel slide | oblique, supine, 60 fps | right | 68.7 percent | 22 to 142 | 0 | 6 to 7 swings |
| 02 | heel slide | mixed: overhead, close-ups, wide side | right | 77.9 percent | 1 to 134 | 0 | not recorded |
| 03 | straight leg raise | side, supine | left | 87.2 percent | 0 to 53 (top 34) | none by design | not recorded |
| 04 | straight leg raise | side, on a table, close-up cuts | right | 62.1 percent | 4 to 119 | none by design | not recorded |
| 05 | mini squat | front start, then side, close-up cuts | left | 72.3 percent | 1 to 67 | 2 | about 3 |
| 06 | seated knee extension hold | side, seated | right | 24.2 percent | 3 to 79 | 1 hold | not recorded |
| 07 | mini squat | front, whole body | right | 100 percent | 0 to 55 | 1 | unclear |
| 08 | straight leg raise | oblique, supine, therapist in frame | right | 94.1 percent | 92 to 134 | none by design | not recorded |

The straight leg raise has a camera count since 2026-11-09. It counts a lifted leg as an estimate, with the height of the ankle above the hip and not with the knee angle. The counter kind is `lag`. It also reports the estimated angle at the top ([plan FR9](../MPFL_APP_PLAN.md)). The columns "none by design" and "no rep counter" in the tables below are from before this change. The counts on the clips are in [leg-raise-count.md](live-test/leg-raise-count.md). The check did not fire on the oblique clip 08.

### Root cause of 0 reps in clip 01

The counter is not defective. The clip tool ran with the wrong leg for this clip.

- Clip 01 shows two legs. They move one after the other. The right leg is the leg that the manifest names. Its filtered angle swings between about 45 and 130 degrees.
- For the right leg, a rep needs a return to 18 degrees or less (30 percent of the target). The lowest value is 22.3 degrees. It is one frame. Its raw value is 4.5 degrees, so it is an outlier. Every other frame is at 40 degrees or more. The return threshold is never reached, so the state stays `FLEXED` and no rep ends.
- A target of 90 degrees gives a return threshold of 27 degrees, and a target of 150 degrees gives 45 degrees. All three give 0 reps.
- Crossings of the right-leg angle: the angle goes up through 48 degrees 11 times and through 72 degrees 5 times. It goes up through 18 degrees 0 times.
- For the left leg, the detection is 94.1 percent and the visibility is 0.96. The angle goes from about 5 to about 140 degrees. The same counter, with no change, counts 4 reps. The reps end at 5.4, 12.1, 18.5 and 24.9 seconds.
- The right leg is the supporting leg for part of the time. Its low plateau of about 47 degrees is a real bent knee in the picture, or a projection effect of the oblique view. The data cannot tell which. No goniometer exists.

Experiments on the saved landmark series. Each one replays the series through the real functions `createPipeline` and `repsStep` of the app.

| Change | Reps (right leg) |
|---|---|
| None (target 60 degrees) | 0 |
| Target 90, 130 or 150 degrees | 0 |
| Gaps in detection filled with the last value | 0 |
| Raw angle, no One Euro filter | 0 |
| Every second frame removed (30 fps) | 0 |
| Time scaled by 0.5 or by 2 | 0 |
| Return threshold set by hand to 50 degrees | 4 |
| Left leg, no other change | 4 |

Filling gaps, removing the filter, changing the frame rate and changing the time base do not change the result. A lost leg only restarts the dwell timer of the counter. It does not reset the phase. Timestamps are right: the tool uses the frame rate from `ffprobe` (59.94 fps) and 1919 frames cover 32 seconds.

The verdict is a wrong tool setting for this clip: the leg. For the right leg, 0 reps is the result that the thresholds give. The return threshold is a PROPOSAL (30 percent of the target) and is not clinical evidence. A clinician and a test on more people must decide whether it needs a change. Note that a person who does not return below the threshold, for example in an oblique view, gets no rep. A fixed threshold also has no baseline for each person. This is a design limit.

The tool now warns when the other leg is found in more than 25 percentage points more frames. The same check on the saved series warns for clips 01, 04 and 06. It does not warn for clip 08, because the right leg is the one with a high detection there.

### Other leg, same clips (replay of the saved landmarks)

| Clip | Left leg: detection, range, reps | Right leg: detection, range, reps |
|---|---|---|
| 01 | 94 percent, 5 to 142, 4 | 69 percent, 22 to 142, 0 |
| 02 | 84 percent, 2 to 176, 4 | 78 percent, 1 to 134, 0 |
| 05 | 72 percent, 1 to 67, 2 | 21 percent, 3 to 68, 1 |
| 06 | 99 percent, 2 to 109, 1 hold | 25 percent, 3 to 79, 1 hold |
| 07 | 100 percent, 0 to 22, 0 | 100 percent, 0 to 55, 1 |
| 08 | 12 percent, 116 to 153 | 94 percent, 92 to 134 |

For clip 06, the low detection of 24 percent belongs to the right leg. The left leg is found in 99 percent of the frames. The first reading, that the chair hides the leg, is not supported by this check. The reason can be the leg choice. The clip does not show which leg does the exercise.

### Failure cases

- Clip 08: the filtered angle stays near 92 to 134 degrees. A therapist and clothing confuse the landmarks, so the value is not a knee angle. No rule in the app detects this case.
- Clip 06: low detection for the leg that the first run used. See the table above.
- Clips 02 and 05: the framing changes between overhead, close-up and wide views. The leg is partly out of the frame in the close-ups. Clip 02 has one flexion of the right leg that lasts about 0.3 seconds (at 10.0 seconds), so it gives 0 reps. Clip 05 gives 2 reps, and about 3 are seen. The data does not show which rep is missing.
- Clip 01, right leg: 31.3 percent of the frames have no detection. The left-leg run has 5.9 percent of frames without detection. The cause of the gaps is not examined.

### Limits

- No goniometer data. No angle was compared with a reference.
- One person for each clip. The people are not patients. No MPFL case is in the set.
- The eye counts are rough and have one observer. For clip 01 the eye count matches the swings of the right leg and not the reps of one leg.
- With a single frame rate for each clip, the tool seeks frame by frame. The speed (about 8 to 10 frames each second) is an offline value and not a phone value.
- This is a plausibility check of the tool and the counter, not validation.
- Not explained: why clip 01 gives 4 reps for the left leg and the eye count is 6 to 7. The two legs alternate, so the eye count can mix both legs. The clip 02 left-leg maximum of 176 degrees is also not explained. Both need a goniometer or a manual frame count.

### Attribution

The 8 clips are public videos under Creative Commons Attribution (CC BY). The file `manifest.json` in the scratch folder of the run holds the title, author, link, licence and attribution text of each clip. The clips were re-encoded and trimmed, video only. They are not in this repository. The attribution lines are:

- Clip 01: "Heel Slides | PhysiqueDevelopment.com" by Physique Development, https://www.youtube.com/watch?v=AKk2fNwwDYA, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 02: "Heel Slides" by Motion, https://www.youtube.com/watch?v=JTSkGqetpcM, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 03: "Straight leg Raise exercise stage 1 knee pain" by Spire Injury Clinic, https://www.youtube.com/watch?v=vJ5JIlV1zxk, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 04: "Straight Leg Raises" by Motion, https://www.youtube.com/watch?v=pXvEadIwMgw, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 05: "Mini Squats" by Motion, https://www.youtube.com/watch?v=wqCvuhfRXRU, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 06: "Seated Knee Flexion" by Motion, https://www.youtube.com/watch?v=G0EdB5vwmJY, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 07: "Mini Squats - Stage 1 PFPS" by Spire Injury Clinic, https://www.youtube.com/watch?v=NRcuNnO988g, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.
- Clip 08: "Quads   03 Straight Leg Raise" by MyMichiganHealth, https://www.youtube.com/watch?v=gH-CJTv7TyQ, licensed under Creative Commons Attribution (CC BY). Re-encoded and trimmed, video only.

## Re-run after the baseline rule, 2026-11-08

This section is a plausibility check of the clip tool after task T17. It is not validation. Before this run, the tool called `createPipeline` with no baseline. Since T17 the counter counts no rep without a baseline, so the old tool counted 0 reps. The tool now takes the baseline from the first still window of the clip, with the real functions `restingBaseline` and `isStill`. It then calls the real `createPipeline` with the baseline, the leg and the camera side ([clip analysis](clip-analysis.md)). The pose model is `lite`. The target is 60 degrees. The return value is the value of the example protocol: 20 degrees for the heel slide and 15 degrees for the mini squat. This is a PROPOSAL and not clinical evidence. The count starts when the still window ends. No frame and no image is stored in the repository.

### Results for each clip

"Leg" is the leg with the higher detection in the saved landmarks of the first runs. "Detection" is the share of frames in which the three joints of this leg are visible. "Baseline" is the median flexion of the first still window and the times of the window. "Blocked" is the reason that the pipeline gives when no rep can count. "Before" is the reps of the earlier run. "By eye" is the rough count of one person. It is not a reference.

| Clip | Exercise | Leg | Detection | Baseline | Blocked | Reps or result now | Before | By eye |
|---|---|---|---|---|---|---|---|---|
| 01 | heel slide | left | 94.1 percent | none (no still window) | no-baseline | 0 reps | left leg 4 | 6 to 7 swings |
| 02 | heel slide | left | 82.7 percent | none (no still window) | no-baseline | 0 reps | left leg 4 | not recorded |
| 03 | straight leg raise | right | 100 percent | 1.0 degrees (5.1 to 7.1 s) | none | top angle 12 degrees, no rep counter | top 34 (left leg) | not recorded |
| 04 | straight leg raise | left | 99.8 percent | 3.1 degrees (8.1 to 10.1 s) | none | top angle 3 degrees, no rep counter | none | not recorded |
| 05 | mini squat | left | 79.9 percent | 1.0 degrees (3.6 to 5.6 s) | none | 2 reps, peaks 64 and 66 degrees | 2 | about 3 |
| 06 | seated hold | left | 91.4 percent | 101.0 degrees (5.1 to 7.1 s) | none | 1 hold, no rep counter | 1 hold (right leg) | not recorded |
| 07 | mini squat | right | 100 percent | 2.0 degrees (3.0 to 5.0 s) | none | 1 rep, peak 59 degrees | 1 | unclear |
| 08 | straight leg raise | right | 93.5 percent | none (no still window) | none, no rep counter | no top angle | none | not recorded |

For clips 01 and 02 the person never holds still for 2 seconds. The calmest 2.2 second window of the left leg has a move of 0.043 and 0.055 of the frame height. The rule allows 0.02. The app gives the same answer to a person who never holds still: no baseline, no rep. So the old counts of 4 reps for these clips do not come back with the real rule.

A sensitivity run gives the result if a baseline exists. It uses `--baseline 5`, a value that I set by hand from the lowest angles of the clip. It is not the rule of the app.

| Clip | Reps with `--baseline 5` | Rep times (s) | Peaks (degrees) |
|---|---|---|---|
| 01 left | 4 | 5.3, 12.0, 18.4, 24.9 | 141, 141, 135, 133 |
| 02 left | 5 | 2.1, 13.2, 17.3, 24.1, 30.3 | 82, 174, 129, 129, 130 |

### What changed and what did not

- Clips 05 and 07 give the same counts as before (2 and 1). The still window ends at 5.6 s and 5.0 s, so the count starts there. No rep in these clips is lost.
- Clips 01 and 02 count 0 reps, with the reason `no-baseline`. With a hand baseline of 5 degrees the count is 4 for clip 01, as before, and 5 for clip 02 (before: 4). The extra rep in clip 02 is at 2.1 s with a peak of 82 degrees. I do not know why the old rule did not count it.
- The eye count for clip 01 is 6 to 7 swings. The tool counts 4 reps of the left leg. The two legs move one after the other, so the eye count can mix both legs. This stays unexplained. No goniometer or manual frame count exists.
- Clip 06 gets a baseline of 101 degrees, because the seated person holds the knee bent. The seated hold does not use the baseline. A resting angle that high is a reason for a clinician to look at the rule.
- Clip 02 has a peak of 174 degrees in one rep. This stays unexplained, as in the first run.
- Clip 08 has no still window. Its angles stay at 92 to 133 degrees, so the tool still does not show a knee angle for this clip.

### Moving-leg check on the saved landmarks

The tool runs the real function of `src/lib/legIdentity.ts` on every window of 6 seconds of the clip. The app uses only the first 3 windows. The table shows all windows, and the first 3 in brackets for the cases that differ.

| Clip | Left | Right | Ambiguous | None | Chosen leg |
|---|---|---|---|---|---|
| 01 | 0 | 0 | 5 (first 3: 3) | 0 | left |
| 02 | 4 (first 3: 2) | 0 | 1 | 0 | left |
| 03 | 0 | 5 (first 3: 3) | 2 | 0 | right |
| 04 | 1 | 0 | 4 | 1 | left |
| 05 | 3 (first 3: 2) | 1 | 0 | 0 | left |
| 06 | 4 (first 3: 3) | 0 | 0 | 0 | left |
| 07 | 0 | 1 | 3 | 2 | right |
| 08 | 1 | 2 | 0 | 1 | right |

There is no trusted ground truth for the leg. Nobody wrote down which leg moved or which side the camera was on. The answers agree with the chosen leg for clips 02, 03, 05, 06 and 08 in most windows. They are ambiguous for clips 01, 04 and 07, where both legs move or neither moves much. The chosen leg is the one with the higher detection. This is not proof that it is the leg that does the exercise.

### Method B check in the real built app

The script `app/scripts/clip-to-webcam.sh` converted 4 clips to MJPEG files (640 x 360, 30 frames each second). A Playwright script loaded the real built app and the file as the fake camera. It loaded the example protocol and chose the leg. It pressed Start camera and Start exercise. It then read the live angle on the Session screen for 45 seconds. Only the numbers were kept.

| Clip | Leg chosen in the app | Live angle range seen | Offline range (Method A) |
|---|---|---|---|
| 01 | left | 4 to 141 degrees (52 different values) | 4 to 141 |
| 03 | right | 0 to 81 degrees (40 values) | 0 to 50 |
| 04 | left | 0 to 130 degrees (39 values) | 1 to 49 |
| 07 | right | 0 to 55 degrees (16 values) | 0 to 59 |

The fake camera shows the clip: the angle changes and the file size reaches the page unchanged (640 x 360). The ranges for clips 01 and 07 match the offline range. The ranges for clips 03 and 04 are larger than the offline range, and I do not know why. Clip 04 has close-up cuts, and real-time detection can differ from the frame-by-frame run. I did not check the restart of the loop.

### Limits of this re-run

- No goniometer data. No angle was compared with a reference.
- One person for each clip. The people are not patients.
- The tool applies only the still rule of the setup check. The app also needs the other setup rules (whole leg in view, side-on).
- This is a plausibility check, not validation.
