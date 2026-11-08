I did not write a message that compares 110 degrees with a phase goal. The guardrails forbid goal, pass, fail and milestone wording in words or colour. A patient reads "goal reached" or "end of phase 1" as permission to progress. The app never changes the phase. Only the protocol field `activePhase` does that. The webcam angle is also an estimate.

Progress screen text:

> Peak knee bend this session: 110 degrees (estimated angle, not a medical measurement).
>
> Your phase stays the same until your care team changes it. Ask your care team about the next stage.

Rules for this screen:
- The text colour is neutral (`--ink`). No green and no verdict colour.
- No words such as goal, milestone, good, pass or on track.
- The clinical notes value (110 degrees, end of phase 1) is not shown to the patient. It can appear only in the clinician view, as a measured value against a criterion that the clinician wrote, with the margin. It has no "met" state.
- If the example data is on screen, show "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, show "Prototype. Not for patient use."
- Any red-flag text on the screen carries "General guidance, not verified for MPFL surgery."
