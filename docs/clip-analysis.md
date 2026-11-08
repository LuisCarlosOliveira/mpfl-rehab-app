# Clip analysis

The script `app/scripts/analyze-clip.mjs` runs the real pose pipeline of the app on a video file. It writes numbers only. It stores no frame and no image. Use it on a consented clip for task T13 ([plan](../MPFL_APP_PLAN.md)).

## What the script does

1. `ffprobe` reads the duration, the frame rate, the size and the rotation of the file.
2. `ffmpeg` converts the file to a WebM file with a long side of at most 640 px. The frame rate stays the same. The sound is removed.
3. `vite build` makes a page in a temporary folder. `vite preview` serves it on port 4185.
4. A Chromium page reads the video frame by frame. It uses the real landmarker (`src/pose`), the visibility gate, the knee angle, the One Euro filter and the counters (`src/lib`). The page has no copy of this code.
5. The script writes a JSON file and a text summary. It then stops the preview server by its process ID and removes the temporary folder.

Only the own preview origin gets network requests. A request to any other origin is blocked and stops the run with exit code 3.

## Commands

Run all commands in the folder `app/`.

```
node scripts/analyze-clip.mjs <video> --leg right --exercise heel-slide
node scripts/analyze-clip.mjs <video> --leg left --exercise mini-squat --target 60 --max-flexion 90
node scripts/analyze-clip.mjs <video> --leg right --exercise heel-slide --reference data/ref.csv
```

| Option | Meaning |
|---|---|
| `--leg left\|right` | The leg to measure. Required. It is the side of the person, not the side of the picture. In an oblique view the near leg can be the left one. |
| `--exercise` | `heel-slide`, `mini-squat`, `straight-leg-raise` or `seated-hold`. Required. |
| `--reference <csv>` | A file with goniometer or tape readings. See below. |
| `--target <deg>` | The target flexion for the rep counter. The default is 60 degrees. This is a PROPOSAL for analysis only. The app sets no default. |
| `--max-flexion <deg>` | The ceiling for the rep counter. No default. |
| `--hold-seconds <s>` | The hold time for `seated-hold`. The default is 5 seconds. |
| `--out <folder>` | The output folder, relative to `app/`. The default is `.clip-out`. Git ignores `.clip-out/`. |

If port 4185 is busy, the script stops with a message. Set `CLIP_PORT=<free port>` and run it again. Do not use a port that the browser blocks, for example 4190.

The script needs `ffmpeg` and `ffprobe` on the path. It adds no package. It exits with code 2 for bad input and code 3 for a foreign request or a run error.

## What to record on the phone

- Record the side view. Keep the whole leg in the frame, from the hip to the foot.
- Put the phone 2 to 2.5 m from the person. Keep the phone still.
- Use good light. Do not use a bright window behind the person.
- Record 30 to 60 seconds of one exercise.
- Get the consent of the person before you record.
- Measure the lowest and the highest knee angle with a tape or a goniometer. Write down the time of each reading in the clip.
- Do not put the clip in the repository.

## Reference file

Use a CSV file with a header, commas and a decimal point. A line that starts with `#` is a comment.

```
# goniometer, one examiner, side view
time_s,angle_deg
4.0,5
12.5,88
```

- `time_s`: the time in seconds from the start of the clip. It is not milliseconds.
- `angle_deg`: the flexion in degrees. 0 is a straight leg. This is the same unit that the app shows.

The script pairs each reading with the nearest frame, if the frame is at most 0.5 s away and has an angle. It then calls the logic of `app/scripts/agreement.mjs`. The difference is camera minus reference. Two pairs are the minimum. The margin stays `null` below 30 pairs ([accuracy](accuracy.md)).

## How to read the output

The text summary shows the main numbers. The JSON file in `.clip-out/` holds more:

- `summary.frames`: the number of frames that the script processed.
- `summary.detectionRate`: the frames with all three joints visible, divided by all frames. A joint is visible when its visibility is at least 0.5.
- `summary.visibilityMean` and `summary.visibilityP5`: the mean and the 5th percentile of the visibility of the three joints. Frames with no pose do not count here.
- `summary.angleMin` and `summary.angleMax`: the lowest and highest filtered flexion, in degrees.
- `summary.reps` and `summary.repPeaks`: the counted reps and the peak angle of each rep.
- `summary.processingFps` and `summary.videoFps`: the speed of the script and the frame rate of the clip.
- `pipeline`: the summary of the app pipeline, for example `holds` or `topFlexion`.
- `agreement`: the result of the reference comparison, if you gave `--reference`.
- `frames`: one record for each frame. It holds the time, the 6 joint points (`x`, `y`, `visibility`), the raw knee angle, the raw flexion, the filtered flexion and the event.

The text summary shows a warning when the other leg is found in more than 25 percentage points more frames than the chosen leg. If both legs move or overlap, run the clip once for each leg. Use the leg that does the exercise.

Count the reps in the clip by eye. Compare this count with `summary.reps`.

## Limits

- One clip is a smoke test. It is not validation. It cannot give a margin.
- The processing speed is an offline value. The script seeks to each frame and then detects. It is not the speed on a phone.
- The estimated angle is not a medical measurement. A 2D view has an error. See [accuracy](accuracy.md).
- The counter thresholds are start values, not clinical values.
- A synthetic clip without a person proves only that the tools work together. It does not show accuracy. A drawn stick figure is not detected by the model.
