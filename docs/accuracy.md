# Accuracy record

This file records the angle error and the frame rate of the app. It follows [plan NFR3 and NFR4](../MPFL_APP_PLAN.md) and task T13.

## Status

No reference data exists. No goniometer data and no real-video clip have been collected. No frame rate has been measured on a real device. This file holds no measured number.

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

## Frame rate (NFR4)

The target is a median of at least 15 frames per second. Measure it over 60 seconds in headed Chromium, with the `lite` model, on the development machine. Record the median in the table. Phone speed is UNVERIFIED until a phone test.

| Device | Browser | Median fps | Date |
|---|---|---|---|
| Development machine | Headed Chromium | not measured | not measured |
| Phone | Chrome | not measured | not measured |
| Phone | Safari | not measured | not measured |

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

The straight leg raise has no rep counter. The counter kind is `lag`. It reports the estimated angle at the top ([plan FR9](../MPFL_APP_PLAN.md)).

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
