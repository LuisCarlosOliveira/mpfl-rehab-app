# Clip analysis

The script `app/scripts/analyze-clip.mjs` runs the real pose pipeline of the app on a video file. It writes numbers only. It stores no frame and no image. Use it on a consented clip for task T13 (plan).

## What the script does

1. `ffprobe` reads the duration, the frame rate, the size and the rotation of the file.
2. `ffmpeg` converts the file to a WebM file with a long side of at most 640 px. The frame rate stays the same. The sound is removed.
3. `vite build` makes a page in a temporary folder. `vite preview` serves it on port 4185.
4. A Chromium page reads the video frame by frame. It uses the real landmarker (`src/pose`), the visibility gate, the knee angle, the One Euro filter and the counters (`src/lib`). The page has no copy of this code.
5. The page takes the resting angle (the baseline) with the real function `restingBaseline` and the still rule of the app. It scans the clip for the first still window. It then calls the real `createPipeline` with the baseline, the chosen leg and the camera side. The count starts when the still window ends, as in the app after Setup.
6. The page also runs the real moving-leg check (`src/lib/legIdentity.ts`) on all windows of the clip.
7. The script writes a JSON file and a text summary. It then stops the preview server by its process ID and removes the temporary folder.

Only the own preview origin gets network requests. A request to any other origin is blocked and stops the run with exit code 3.

## Commands

Run all commands in the folder `app/`.

```
node scripts/analyze-clip.mjs <video> --leg right --exercise heel-slide
node scripts/analyze-clip.mjs <video> --leg left --exercise mini-squat --target 60 --max-flexion 90
node scripts/analyze-clip.mjs <video> --leg right --exercise heel-slide --reference data/ref.csv
node scripts/analyze-clip.mjs <video> --leg left --exercise heel-slide --baseline-from 2-5 --return-within 15
```

| Option | Meaning |
|---|---|
| `--leg left\|right` | The leg to measure. Required. It is the side of the person, not the side of the picture. In an oblique view the near leg can be the left one. |
| `--exercise` | `heel-slide`, `mini-squat`, `straight-leg-raise` or `seated-hold`. Required. |
| `--reference <csv>` | A file with goniometer or tape readings. See below. |
| `--target <deg>` | The target flexion for the rep counter. The default is 60 degrees. This is a PROPOSAL for analysis only. The app sets no default. |
| `--max-flexion <deg>` | The ceiling for the rep counter. No default. |
| `--baseline <deg>` | The resting angle, in degrees. Without it, the tool takes the median flexion of the first still window of the clip. The count then starts at the start of the clip. |
| `--baseline-from <s>-<s>` | Use the frames between these two times (in seconds) as the still window. The tool stops with `not-steady` if the leg moves in them. Do not use it with `--baseline`. |
| `--return-within <deg>` | The protocol value: a rep ends within this many degrees of the baseline. The default is the value of the example protocol for the exercise (20 for the heel slide, 15 for the mini squat). The tool prints this when it uses the default. The app has no such default. |
| `--camera-side left\|right` | The side of the person that the camera is on. The default is the chosen leg, as on the setup screen of the app. It only sets the near or far label of the leg. |
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
- `baseline`: the resting angle and the times of its window, or the reason that none was found (`no-steady-window`, `not-steady`, `too-few-samples`). `sessionStartS` is the time at which the count starts.
- `pipeline.countBlock`: why no rep can count. `no-baseline` means no still window was found. `no-return-value` means the protocol value is missing.
- `identity`: the answer of the moving-leg check for each window of 6 seconds: `left`, `right`, `ambiguous` or `none`. The app only uses the first 3 windows. The tool shows all windows. There is no trusted ground truth for the leg, so the answer is a hint.
- `summary.processingFps` and `summary.videoFps`: the speed of the script and the frame rate of the clip.
- `pipeline`: the summary of the app pipeline, for example `holds` or `topFlexion`.
- `agreement`: the result of the reference comparison, if you gave `--reference`.
- `frames`: one record for each frame. It holds the time, the 6 joint points (`x`, `y`, `visibility`), the raw knee angle, the raw flexion, the filtered flexion and the event.

The text summary shows a warning when the other leg is found in more than 25 percentage points more frames than the chosen leg. If both legs move or overlap, run the clip once for each leg. Use the leg that does the exercise.

Count the reps in the clip by eye. Compare this count with `summary.reps`.

## The resting angle in the tool and in the app

The tool takes the resting angle with `restingBaseline` and the still rule of Setup (`src/lib/still.ts`). It does not run the in-place capture of the Session screen (`createBaselineCapture` in `src/lib/baseline.ts`, F1). So the tool and the app can differ for a clip in which the person never holds still.

The app has three sources of the resting angle:

1. Setup: the leg holds still for 2 seconds (0.02 of the frame height). The resting angle is the median flexion of that window.
2. Session, in place: when Setup gave none, Session runs the same still rule on the live samples. A still window at or above the angle where a rep starts (0.8 of the target) is a hold and not a start. The capture refuses it (the "bent knee" guard). The person lies or sits still to give a window.
3. Session, by choice: after 15 seconds with no still window, the person can press the lowest-angle button. The app then takes the median of the lowest 25 percent of the angles of the last 15 seconds. The app never takes this value alone. The numbers 15 s and 25 percent are ENGINEERING values and need clinician review.

The tool options `--baseline <deg>` and `--baseline-from <s>-<s>` stand in for source 1. The tool has no option for sources 2 and 3. A clip with `no-steady-window` shows the case in which the app asks the person to capture in place.

Live test 1 (round 1, commit b451206) ran 8 clips as the fake webcam. No clip of the heel slide or the mini squat gave a resting angle. So the app counted 0 reps on every such run (the exercise flows record, checks 14, 18 and 50). The in-place capture is the fix. Its run on a real clip is PENDING (the re-test).

## Limits

- One clip is a smoke test. It is not validation. It cannot give a margin.
- The processing speed is an offline value. The script seeks to each frame and then detects. It is not the speed on a phone.
- The estimated angle is not a medical measurement. A 2D view has an error. See [accuracy](accuracy.md).
- The counter thresholds are start values, not clinical values. The return value of the example protocol is a PROPOSAL.
- The tool applies only the still rule of the setup check. It does not apply the other setup rules (whole leg in view, side-on). A clip can pass the still rule and still be a poor setup.
- The target is 60 degrees by default, also for the mini squat, so that results stay comparable with earlier runs. The example protocol uses 30 degrees for the mini squat.
- A synthetic clip without a person proves only that the tools work together. It does not show accuracy. A drawn stick figure is not detected by the model.

## Method B: a clip as a fake webcam

Method A (above) reads a video file frame by frame. Method B shows the clip to the real app as if it were a webcam. Use it to test the live screens with a known movement.

Run the script in the folder `app/`. It needs `ffmpeg`.

```
bash scripts/clip-to-webcam.sh <clip>
```

The script converts the clip to an MJPEG file. The file has 30 frames each second, a long side of at most 640 px, and no sound. The default folder is `.clip-out/webcam/`, which Git ignores. You can give another folder as the second argument. Set `FORMAT=y4m` for a y4m file. It is much larger. Set `WIDTH` to change the long side.

The script prints the launch arguments for Playwright:

```
--use-fake-device-for-media-stream
--use-fake-ui-for-media-stream
--use-file-for-fake-video-capture=<path of the file>
```

Use them in `chromium.launch({ args: [...] })`. The page must also have the permission `camera`. Start the app on a local port, open it, and press the camera button as a person does.

What Chromium does with the file:

- The picture has the size of the file. A test run with a 640 x 360 file gave a video of 640 x 360 in the page. Chromium did not change it to the size that the page asks for.
- Chromium plays the file again from the start when it ends. This is the documented behavior of the fake camera. The live tests of 2026-11-08 saw it. A 60 second run shows a clip about two times. The restart causes a gap of about 5 seconds in the message log (the exercise flows record, the pairing record).
- An MJPEG file has no rotation flag. The script makes the picture upright first, with `ffmpeg`.
- An MJPEG file holds no frame rate. Chromium plays it at 30 frames each second. The script sets 30 frames each second.
- The stream has no sound. The app asks for video only.
- The file is a recording of a person. Keep it out of the repository. The privacy rule holds for every output: frames, stills and clips stay in the scratch folder.
- How the live tests used it: Playwright with the three launch arguments and the permission `camera`. Each run had a fresh profile and used the built app in `dist`. The app asked for video only and made no request to another origin (the exercise flows record, privacy inspection).
- The picture is not the same as a phone picture. The clips are studio recordings of a person who is far from the camera. The setup check reached the countdown in 1 of 3 runs on clip 04 and in no run on the other clips. A recording by the product owner at 2 to 2.5 m can behave in another way (PENDING).
- The live angle in the app comes from live detection, with real time and dropped frames. It can differ from the offline numbers of Method A. See [accuracy](accuracy.md).
