I will not build this cue as written. Two rules in the clinical guardrails stop it.

1. The P2 flexion goals are passive-range targets. The camera measures an active angle from a 2D webcam. The app must never compare the two (`research/citation-audit.md` section 6). The two numbers do not measure the same thing.

2. The app must not show a "goal" in words or in colour. Also, a fixed 90 degree value is not a protocol field. A clinician must set every clinical number.

What I can build instead:
- Add a protocol field, for example `maxFlexion` or a squat depth limit, that the surgeon or physiotherapist sets. If the protocol does not set it, show "ask your surgeon".
- Compare the camera angle with that field using the FR8 margin rule in `MPFL_APP_PLAN.md`. The cue states what was measured against the limit, for example "depth below your target".
- Show "estimated angle, not a medical measurement" next to every angle.
- Show no message for an in-range rep.
- Run `bash app/scripts/claims-check.sh app/src` after the change.

Please tell me which protocol field the care team will set, and I will continue.
