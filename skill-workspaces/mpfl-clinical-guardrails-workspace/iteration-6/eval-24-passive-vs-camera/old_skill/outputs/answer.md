I will not build this cue as asked.

Why:
- The P2 flexion goal of 90 degrees is a passive-range target. The camera gives an active, estimated angle. The two must never be compared (`research/citation-audit.md` section 6).
- A 2D webcam angle has an error. It cannot confirm a passive-range target.
- Screen text must not use "goal". A message about a goal also reads as a pass or fail.
- Every clinical number is a field that a clinician sets. The app does not own the 90 degree value.

What I suggest instead:
- Use the protocol field `maxFlexion`, which the care team sets for the active phase.
- Use the margin rule in FR8 of `MPFL_APP_PLAN.md`.
  - Close to the limit: show "close to your limit, stop". The rep still counts.
  - Above the limit plus margin: show "stop at your limit, do not push". The rep does not count.
- Show "estimated angle, not a medical measurement" next to the angle.
- Show no message for a rep that is in range.
- If the protocol sets no `maxFlexion`, show "ask your surgeon".

After the change, run `bash app/scripts/claims-check.sh app/src`.
