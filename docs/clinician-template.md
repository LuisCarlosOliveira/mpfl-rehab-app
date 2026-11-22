# Clinician template for the protocol file

Use the file `docs/clinician-template.json`. It is a protocol file that a physiotherapist or surgeon fills in and gives to the person. The app loads it on the Load screen.

## What the file is

- The template holds every field that only a clinician can set. No field has a clinical default.
- Each open field holds the text `SET BY CLINICIAN` or the value `null`. The app refuses both.
- The app refuses the file until you replace every placeholder. A test proves this (`app/tests/clinicianTemplate.test.ts`).
- The test also fills the template with synthetic values and checks that the app accepts it. Those values are not clinical advice.

## How to fill it

1. Copy the file. Give the copy a new name.
2. Replace each `SET BY CLINICIAN` and each `null` with your value. Numbers have no quotes. Dates use `YYYY-MM-DD`.
3. Remove a field only if the schema marks it optional and you do not need it. Examples: `painPauseThreshold`, `minRepSeconds`, `maxTopFlexion`, the `surgeon` fields, and `reviewCriteria`.
4. Keep the exercises that you prescribe. Remove the others. A phase can hold each exercise once.
5. Give the file to the person. The person loads it once on the Load screen.

## Fields

| Field | What to enter | What the app does with it |
|---|---|---|
| `id` | A short name with letters, digits, dot, dash and underscore. Use no name of the person. | The export carries it. |
| `side` | `left` or `right`. The operated leg. | The app follows this leg by default. |
| `authoredBy` | The name of your clinic. | Home shows it. |
| `approvedOn` | The date that you approved the plan. | Patient mode needs it. See the note below. |
| `activePhase` | The id of the phase that the person does now. | The app never changes it. Only you change it. |
| `painPauseThreshold` | A pain value from 0 to 10. | A pain answer at or above it ends the session and shows "Pause and contact your care team." Without it, the app uses its own safety floor. |
| `phases[].id`, `name` | A number from 1 to 10 and a short name. | Home lists the phases. |
| `phases[].reviewDate` | The date of your next review. | The app shows a review card on that date. It does not decide that a phase is complete. |
| `sets`, `reps` | Whole numbers. | The session counts reps and sets. |
| `targetFlexion` | Knee angle in degrees. | Heel slide and mini squat: a rep that stays below it gets the text "Depth below your target." The seated hold uses it as the hold angle. |
| `maxFlexion` | Knee angle in degrees. It must be more than `targetFlexion` plus 9 degrees (the camera margin). | A rep above it plus 9 degrees shows "Stop at your limit, do not push." and does not count. |
| `returnWithinDeg` | Degrees from the resting angle. | A rep ends when the knee comes back within this value. |
| `minRepSeconds` | Seconds. | A faster rep gets the text "Slow down." with both numbers. |
| `maxTopFlexion` | Degrees. At least 9, the camera margin. | The straight leg raise: the app compares the top angle with it and logs the result for the care team. |
| `holdSeconds` | Seconds. | Seated hold: the time that the knee must stay in the arc. |
| `minFlexion` | Knee angle in degrees. The straightest angle that you allow. | Seated hold: a knee straighter than this minus 9 degrees restarts the timer. The value 0 allows full extension. Literature advises against full extension early (P1, P2). |
| `source` | Where each number comes from. | Shown to the clinician. Not a place for a patient name. |
| `reviewCriteria` | Rows from the fixed lists of the schema. | The review summary compares them with the logs. They hold no free text. |
| `surgeon.*` | Short text for the brace, weight bearing, depth limit, phase clearance and other procedures. | Home shows it. A missing field shows "Ask your surgeon." |

## Limits that you must know

- `approvedOn` is an unsigned claim. Anyone who edits the file can add a date. The app cannot check who wrote it (open item L2-05 in `docs/clinical-limits.md`).
- The camera angle is an estimate. The error is about 9 degrees at best and more in exercise video (the form evidence note). Choose limits with this error in mind.
- The app stores no frame and no video. It stores angles, counts and the answers of the person on the device.
- The app does not rate form. It states what the camera measured against your limit.
- The file loads in the browser only. Nothing goes to a server.
