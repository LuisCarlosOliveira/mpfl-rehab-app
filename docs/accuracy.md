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
