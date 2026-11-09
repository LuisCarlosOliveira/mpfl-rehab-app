# Camera accuracy study: protocol

Status: NOT RUN. No volunteer has been measured. No result exists. This file is a plan for a physiotherapist.

The app estimates the knee angle from a webcam. The margin of 9 degrees is a start value from still photos of the highest-complexity model ([accuracy record](accuracy.md), [research/form-opus.md section 2.3](../research/form-opus.md)). This study measures the real error of the app against a goniometer. A clinician and a statistician must review this protocol before use. Every number below that has no source is a PROPOSAL.

## Aim

Measure the difference between the app angle and the goniometer angle for held knee positions. Use the result to keep, widen or drop the margin (see "Decision rule").

## People and tools

- 10 healthy adult volunteers. One leg each. Write down the leg.
- 2 goniometer readers (A and B). Each reader uses one universal goniometer.
- 1 recorder. The recorder reads the app and fills the sheet.
- 1 phone or laptop that runs the app with the `lite` model, on a stand.
- A chair or a bed, a tape measure, and the sheet [accuracy-study-sheet.csv](accuracy-study-sheet.csv).

The study takes about 30 minutes for 10 volunteers, with about 3 minutes for each volunteer.

## Consent and ethics

- Healthy volunteers still give consent. Tell each volunteer the aim, the numbers that you record, and that they can stop at any time.
- Ask your ethics contact if the study needs approval. This protocol does not replace that step.
- Record numbers only. Do not film. Do not take photos. The app stores no frame and no video.
- Use a code for each volunteer (v01, v02). Write no name on the sheet.
- Do not use patients. The result is for healthy volunteers only.

## Set-up

1. Put the camera side-on to the leg, 2 to 2.5 m away. The app uses the same advice (`distanceAdviceM` in `app/src/lib/setupRules.ts`).
2. Put the lens at about knee height, with the phone upright and level. The height is a PROPOSAL.
3. Light the whole leg from the front or from above. Do not put a window behind the volunteer.
4. Ask the volunteer to wear shorts or tight clothing. Leave the hip, the knee and the ankle visible.
5. Mark the camera position and keep it for all volunteers. Record the camera side (left or right of the volunteer) in the sheet.
6. Open the app session screen. Make sure that the line "estimated angle" shows a number.

## Positions

Use 5 held positions: about 0, 30, 60, 90 and 120 degrees of knee flexion. Zero degrees is a straight knee.

1. Give each volunteer a random order of the 5 positions. Use a different order for each volunteer. The recorder writes the order before the start.
2. The volunteer sits or lies, and holds the position with a support (a roll or a strap) so that the angle stays still.
3. The recorder reads the angle on the app screen after the volunteer holds still for 3 seconds. Write one number.
4. At the same time, each goniometer reader measures the angle and says it to the recorder.
5. Reader A and reader B work alone. Neither reader sees the app screen. Neither reader hears the other value before saying their own.
6. The recorder writes `target_deg` (the planned angle), `goniometer_a_deg`, `goniometer_b_deg` and `app_deg`.
7. Go to the next position.

Goniometer landmarks: the greater trochanter, the lateral femoral epicondyle and the lateral malleolus. Use the same landmarks for both readers. Mark them with a pen if the volunteer agrees. Convert all values to knee flexion, with 0 degrees for a straight knee. The app also shows flexion.

## What to read from the app

Read the live number that the session screen shows next to "estimated angle, not a medical measurement". Write the number in degrees. Round to the nearest whole degree. If the app shows no number, the leg is not tracked. Write nothing for that hold, and repeat the hold.

The export file (`peakFlexion`) shows a peak value of a session. Do not use the export for this study. A held position needs the live value.

## What to record for each hold

One row for each hold. Use a decimal point. Do not use a comma inside a value.

```
volunteer,leg,camera_side,lighting,clothing,target_deg,goniometer_a_deg,goniometer_b_deg,app_deg
```

- `volunteer`: a code, for example v01.
- `leg`: `left` or `right`.
- `camera_side`: `left` or `right`, the side of the volunteer that faces the camera.
- `lighting`: a short word, for example `bright` or `dim`.
- `clothing`: a short word, for example `shorts` or `tights`.
- `target_deg`: the planned position (0, 30, 60, 90 or 120).
- `goniometer_a_deg`, `goniometer_b_deg`: the readings in degrees.
- `app_deg`: the number that the app showed.

A line that starts with `#` is a comment. Write the device, the browser and the model name in comment lines at the top.

## Analysis plan

Run the tool from the `app` folder:

```
node scripts/accuracy-analyze.mjs ../docs/accuracy-study-sheet.csv
```

The reference value of a hold is the mean of reader A and reader B. The difference is the app value minus the reference. The tool prints:

- `n`: the number of holds.
- `bias`: the mean difference.
- `sd`: the standard deviation of the differences.
- `loaLower` and `loaUpper`: the 95 percent limits of agreement, bias plus and minus 1.96 times `sd` (Bland-Altman).
- `meanAbsoluteError`.
- `bands`: the same values for four bands of the reference angle (0 to 44, 45 to 74, 75 to 104, 105 to 180 degrees). The bands are a PROPOSAL.
- `readers`: the difference between reader A and reader B.
- `worst`: the 3 holds with the largest absolute difference.

The tool refuses bad input and names the error. The cases are a missing column, a value that is not a number, an angle outside 0 to 180 degrees, and fewer than 2 rows.

Known limits of this design:

- One volunteer gives 5 holds. The holds of one person are not independent. The limits of agreement are therefore too narrow. A statistician must decide how to handle this.
- 10 volunteers and 50 holds are a small set. The existing proposal in [accuracy.md](accuracy.md) is at least 30 pairs for each view.
- Healthy volunteers and a still hold do not show the error of a moving patient.
- The goniometer has its own error. After knee surgery, a published detectable difference is about 8 degrees (Lenssen 2007, https://doi.org/10.1186/1471-2474-8-83, in [research/form-opus.md](../research/form-opus.md), patients after TKA, so it is borrowed). The `readers` output shows the error of your own readers.

## Decision rule (set before any data)

This rule is a PROPOSAL. A clinician and a statistician must decide the final rule before the first volunteer. Do not change it after you see the data. Use the side view result. Let L be the larger absolute value of `loaLower` and `loaUpper`, rounded up to a whole degree.

| Result | Decision |
|---|---|
| L is 9 or less, and no band has a mean absolute error above 9 | Keep 9 degrees. A set of 10 volunteers is too small to make the margin narrower. |
| L is more than 9 and 15 or less | Widen the margin to L. |
| L is more than 15, or a band has a mean absolute error above 15 | Drop the margin as a usable limit. The app cannot compare an angle with a clinician limit in that band. The team must decide what the app shows instead. |
| The readers differ by more than 5 degrees on average (`readers.meanAbsolute`) | The reference is not good enough. Train the readers and repeat the study. Make no margin decision. |

The value 15 comes from the upper end of reported errors, and that end is UNVERIFIED ([accuracy.md](accuracy.md)). The value 5 for the readers is a PROPOSAL with no source.

A change of `MARGIN_DEG` in `app/src/lib/margin.ts` needs a recorded data file in the repository. The new source text must name that file, the number of holds and the camera setup. This rule is in [accuracy.md](accuracy.md). Without such a file, the 9 degree start value stays.

## After the study

1. Save the sheet in the repository only if it holds codes and numbers. It must hold no name.
2. Write the tool output and the camera setup in [accuracy.md](accuracy.md).
3. Apply the decision rule. A clinician signs the decision.
