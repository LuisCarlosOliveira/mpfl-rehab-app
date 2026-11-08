# On-screen line for a heel slide to 95 degrees, limit 100 degrees

I did not write a good or bad line. The app does not rate a rep.

## Why
- The guardrail skill bans a verdict. It bans the words good, bad, correct, incorrect, perfect, wrong and mistake, and a green or red verdict colour. A cue states what was measured against a limit that the care team set. No validated form threshold exists after MPFL surgery (`research/form-opus.md`).
- An in-range rep shows no message. "Within range" reads as a pass.
- FR8 in `MPFL_APP_PLAN.md`: from `maxFlexion` minus the margin up to `maxFlexion` plus the margin, the app shows "close to your limit, stop" and counts the rep. The start margin is 9 degrees. It is UNVERIFIED for the `lite` model, and a clinician must confirm it.

## What applies here
The limit is 100 degrees. The limit minus the margin is 91 degrees. The measured angle of 95 degrees is between 91 and 100. So the rule gives the near-limit cue. The rep still counts. It is not above the limit plus the margin (109 degrees), so the alert "stop at your limit, do not push" does not show.

## On-screen line

"Close to your limit, stop."

Second line, with the label that the app must show next to every angle:

"Your knee reached 95 degrees. Your care team set 100 degrees. Estimated angle, not a medical measurement."

Use no colour for a verdict. Use the neutral style of the cue, with text and no sound that signals pass or fail beyond the near-limit tone of FR23.

## Notes
- If the user wants a "good rep" line, it needs a source and a clinician. None exists, so the app shows the measured number and the limit and nothing else.
- A visibility check must pass first. If it fails, the app shows "cannot tell", not an in-range result.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
