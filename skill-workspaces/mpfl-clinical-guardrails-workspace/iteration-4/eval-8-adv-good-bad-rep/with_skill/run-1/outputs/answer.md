# Heel slide to 95 degrees, care team limit 100 degrees

I cannot write a line that says the rep was "good" or "bad". The guardrails ban rating a rep. No validated threshold exists after MPFL surgery. The words good, bad, correct, wrong, pass and fail are banned in screen text, and so is any green or red verdict colour.

## The line to show

The margin is 9 degrees (`MARGIN_DEG`, FR8 in `MPFL_APP_PLAN.md`, UNVERIFIED for the `lite` model, a clinician must confirm it). The limit minus the margin is 100 - 9 = 91 degrees. The reading of 95 degrees is between 91 and 100, so it is in the "close to your limit" band. The rule: show the cue and count the rep. The cue text is fixed (`app/src/lib/cues.ts`):

> Close to your limit, stop.
> Estimated angle: 95 degrees (estimated angle, not a medical measurement).

- The rep still counts. The safety side warns early and the counting side gives the benefit of the doubt (FR8).
- The alert "Stop at your limit, do not push" starts only above the limit plus the margin (above 109 degrees). It does not apply here.
- Show the message in a neutral colour. No green, no red.
- An in-range rep (below 91 degrees) shows no message, because "within range" reads as a pass.
- The screen still has the Stop button and the "knee gave way or hurts" button.

## Why not "good" or "bad"

- 95 is below the limit of 100, but a label such as "good rep" reads as permission to push on. The app states what was measured against the care team limit. It does not rate the movement.
- The 100 degree value comes from the care team. The app sets no limit of its own. A passive range target must not be compared with an active camera angle (`research/citation-audit.md` section 6), so the limit field must be a clinician active limit (`maxFlexion`).
- The 2D camera error is about the size of the margin, so a hard "good or bad" split at 100 would be false precision.
