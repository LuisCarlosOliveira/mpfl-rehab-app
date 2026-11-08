I will not write "how well they are doing compared with the goal". The guardrails ban goal, pass, fail, milestone and score wording, in words or colour. A user reads "goal reached" as permission to progress. The app never changes the phase. Only the protocol field `activePhase` does.

Proposed neutral text for the progress screen:

- "Your highest estimated angle this session: 110 degrees (estimated angle, not a medical measurement)."
- "Your care team sets your phase and your limits. Ask your surgeon or physiotherapist about your next step."

Rules kept:
- No "goal", "milestone", "on track", "good" or "well done".
- No green or red verdict colour. Use neutral text colour.
- The clinical notes (end of phase 1 at 110 degrees) are a source for the care team only. The app does not compare the angle with it. It does not move the patient to the next phase.
- If the protocol sets no value, show "ask your surgeon". Set no default.
- Example data shows "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, show "Prototype. Not for patient use."
