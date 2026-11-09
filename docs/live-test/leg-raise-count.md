# Camera count of the straight leg raise

Date: 2026-11-09. Task T39. This file records the change and the proof. The live test of the user showed 0 reps for a person who lifted the leg. The cause is in `docs/live-test/count-diagnosis.md`. The straight leg raise had no camera count.

## What the app does now

- A lift counts one rep when the ankle is above the hip by more than `RAISE_MIN_HEIGHT` for `RAISE_SETTLE_MS` without a break. Both values existed before. They are 0.05 of the picture height and 500 ms. Both are PROPOSAL values with no source.
- A lift ends when the leg stays below the start height for `LIFT_END_MS`. This value is new. It is 300 ms and ENGINEERING. It is not a clinical value. In clip 03 the shortest real return to rest lasts about 0.4 s. A one-frame dip lasts 0.1 s or less.
- A one-frame spike counts none, because the lift must hold the settle time. A reading of 172 degrees for one frame is such a spike. The test pins it.
- When the leg leaves the view, a lift that is not yet settled starts its settle time again. A lift that is already counted stays counted, so a short loss of the leg does not give a second rep.
- The button "Count this rep" stays. The line on the screen is "The camera counts leg raises as an estimate. If a lift is missed, press Count this rep."
- The camera count and the hand count can mix. `repsBy` is `hand` when any counted rep came from the button.
- The 30 degree limit for the stored top angle is unchanged. The count does not depend on the knee angle.

## Why there is no resting height

The request said to use the rest logic of the other exercises where it applies. A first try ended a lift near the lowest height seen before it. On clip 04 the first frames are a close-up with a height of -0.24. Then no lift ended, and the clip gave 1 rep for 3 lifts. Setup does not measure a resting height for this exercise. So the end rule has no baseline and uses the start height with a dwell time. This is a decision with evidence, and the first try is recorded here.

## Proof on saved landmarks of real clips

Method: the real `createPipeline` ran on the saved landmarks of each clip (`clips-real/results/*.json`, 30 fps). I counted lifts by eye on stills with one frame each second (`ffmpeg`, a contact sheet for each clip, read with the Read tool). The eye count has one observer and no reference.

| Clip | Leg of the model | Camera count | Eye count | Note |
|---|---|---|---|---|
| 03 side view, lying | right (the lifting leg) | 6 | 7 | The person lifts, lowers to about 0.13 of the height without rest, and lifts again at 26 s. This is one lift by the rule and two by eye. |
| 03 | left | 1 | 0 | One false rep at 37.5 s. The model puts the lifted leg on the other leg for a moment. |
| 04 side view, on a table | left (the lifting leg) | 3 | 3 | Lifts at 15.4 s, 24.7 s and 33.2 s. |
| 04 | right | 0 | 0 | |
| 08 oblique view from the foot side | both | 0 | 2 to 3 | NOT RELIABLE. The ankle never rises above the hip in this view. |

An earlier version of the rule gave false reps on the leg that does not move. It gave 5 on clip 04 (right) and 3 on clip 03 (left). The tests `tests/legRaiseCounter.test.ts` pin both cases.

The first 18 seconds of clips 03 and 04 are in `tests/fixtures/clipSeries.ts`. The test pins 2 reps for clip 03 (right leg) and 1 for clip 04 (left leg). The other leg of each clip gives 0.

## Tests that failed first

- `tests/legRaiseCounter.test.ts`: 8 of 12 failed before the code (no event, no count).
- `tests/ui/sessionF4a.test.tsx`: the new line, the camera count, `repsBy` camera and hand. The old two tests that pinned "The camera does not count leg raises" now pin the new line.
- One old test said the screen must not show the text "camera count" next to the count. The new line says "The camera counts leg raises". The test now allows exactly this line. Its purpose is the same: no marker text for `repsBy`.

## What stays unproven

- The check needs a true side view of a person who lies down. It did not fire on the oblique clip 08. A front view and a standing leg raise are untested.
- The unmoving leg can still give a false rep when the model swaps the legs (clip 03, left, one rep).
- The count is an estimate. No clinician has reviewed the heights and the times.
- A real phone, and the real camera of the user, were not used for this proof.
