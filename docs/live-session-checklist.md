# Live session checklist

Use this checklist for the first live session on a real person (the tester). The app is a prototype. No clinician has reviewed any value ([docs/clinician-first-review.md](clinician-first-review.md)).

The default build runs in demo mode and shows the banner "Prototype. Not for patient use." (`lib/mode.ts`). The extended exercises are on by default in demo mode (`VITE_GENERATOR_EXTENDED`, `generatorExtendedOn`). The numbers below come from the example plan in `lib/protocol/example-protocol.json`.

## Before

- [ ] A clinician is present: Yes / No. If No, do not start.
- [ ] The clinician knows the surgeon knee-bend limit of the tester: Yes / No.
- [ ] The plan is a loaded approved file, or phase 1 only. Use no plan from onboarding.
- [ ] Device and browser written down: ______________________
- [ ] The camera placement guide of the app (Setup screen) is read and followed.
- [ ] Text size is readable at arm length. The app has no text size control (not traced). Use the browser zoom.
- [ ] Battery is above half, or the charger is connected.
- [ ] The tester heard these 5 sentences:
  1. This is a prototype test of an app. It is not treatment.
  2. The app can count wrong and can show a wrong angle.
  3. Stop when you feel pain, and tell the clinician at once.
  4. Press "Knee gave way or hurts" if the knee gives way or hurts.
  5. The clinician can stop the test at any time.

## Exercises that this build can show

| Exercise | Phase | Example plan numbers | Count by |
|---|---|---|---|
| Heel slide | 1 | 3 sets of 10, target 60 degrees, limit 90 degrees | camera |
| Straight leg raise | 1 | 3 sets of 10 | camera, and the button "Count this rep" |
| Mini squat | 2 | 2 sets of 10, target 30 degrees, limit 50 degrees | camera |
| Seated knee extension hold | 2 | 2 sets of 10, hold 5 seconds, 40 to 60 degrees | camera |
| Ankle pump | 1 | no dose, minimum amplitude 30 degrees (CV-41) | camera |
| Leg raise to the side | 1 and 2 | no dose in the example plan | camera |

Phase 2 exercises need a plan with `activePhase` 2. Use them only when the clinician decides so.

## During

- [ ] Each screen shows the prototype banner.
- [ ] Both safety buttons are in view: "Stop" and "Knee gave way or hurts".
- [ ] The angle number matches the real knee. Compare it with a goniometer or a phone level app in 3 positions. Write both numbers in the results table.
- [ ] The rep count matches the real reps. Count the reps by eye.
- [ ] The cues match what happened ("Close to your limit, stop." and "Stop at your limit, do not push.").
- [ ] The phase on Home does not change.
- [ ] No request leaves the page. Open the browser network tab and look for any request to another origin.

## Stop at once

Stop the session if one of these happens:

- Pain is 7 or more.
- Swelling is more than before.
- The tester presses or says "Knee gave way or hurts".
- The knee feels unstable.
- A safety button does not respond.
- The phase changes and nobody chose it.

## After

- [ ] Export the session file from the Data screen. Keep it.
- [ ] Note the numbers in the results table.
- [ ] Note the open points: skeleton jumps, left and right swapped, lost pose, GPU or CPU, frame rate. The known rate is about 15 detections each second on a laptop with no GPU (`docs/clinical-limits.md`).

## Results

| Exercise | Reps counted | Reps real | Angle shown | Angle measured | Difference |
|---|---|---|---|---|---|
| Heel slide | | | | | |
| Straight leg raise | | | | | |
| Mini squat | | | | | |
| Seated hold | | | | | |
| Ankle pump | | | | | |
| Leg raise to the side | | | | | |

Notes: ______________________

Tester initials, clinician initials and date: ______________________
