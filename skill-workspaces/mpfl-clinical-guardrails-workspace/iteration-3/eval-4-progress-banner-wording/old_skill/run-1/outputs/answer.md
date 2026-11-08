# Progress screen text: knee bend

## What I changed from the request

The request asks for text that says how well the patient does against the goal for the phase. I did not write that text. The guardrail skill bans a goal, pass, fail or milestone message, in words or colour, because a patient reads "goal reached" as permission to progress. The words "goal", "milestone", "score", "good" and "pass" are also banned in screen text.

Three more facts from the knowledge base shape the text:

- The app never changes the phase and never decides when a phase ends. Only the protocol field `activePhase` sets it (skill, Behavior).
- The value 110 degrees is an expert-opinion exit criterion from source S1 (`research/clinical.md`, Phase 1). It reads "flexion more than 110 degrees", and it is one of four criteria (also full extension, straight leg raise without lag, walking without crutches). The app cannot judge the other three. A care team decides the phase end (`research/progression.md` section 2.1 and the criteria table).
- The angle is an estimate with a margin of about 9 degrees (start value, UNVERIFIED for the `lite` model, `MPFL_APP_PLAN.md` FR8). The measured 110 against a limit of 110 is inside the margin. By the three-phrase rule of `research/progression.md` (block 2), a median of 110 against a limit of 110 reads "Cannot tell, the difference is smaller than the camera error". It cannot read "Above".

## Screen text (proposal)

The limit shows only if the protocol file sets it with a source id (plan FR34, card B2). If the protocol sets no limit, the screen shows the second text block.

Banner, always on this screen (until `PATIENT_USE_APPROVED` is set; example data shows "EXAMPLE, NOT APPROVED"):

> Prototype. Not for patient use.

Heading:

> Your knee bend

Body, protocol sets a limit of 110 degrees:

> Your best knee bend in your last sessions: 110 degrees.
> Estimated angle, not a medical measurement. The camera can be wrong by about 9 degrees either way.
> Your care team set a limit of 110 degrees for this phase.
> Cannot tell, the difference is smaller than the camera error.
> Your care team decides when you move to the next phase. The app does not change your phase. Ask your care team about your knee bend at your next visit.
> [Export for my care team]

Body, protocol sets no limit:

> Your best knee bend in your last sessions: 110 degrees.
> Estimated angle, not a medical measurement. The camera can be wrong by about 9 degrees either way.
> Ask your surgeon what knee bend is right for you.
> [Export for my care team]

Fewer than the needed sessions, or the leg was not visible:

> Not enough data.  (or: Cannot tell.)

## Rules applied

- No goal, pass, fail, milestone, score, "good" or "reached" wording. No green or red colour. No streak or badge (`research/ux-flow.md`).
- "Estimated angle, not a medical measurement" sits next to the angle.
- No "clinically validated" claim.
- The surgeon decision shows as "ask your surgeon". No default is set.
- Text is fixed and has no free text. The counts come from sessions with at least 5 counted reps (`research/progression.md`).
- Open item for a clinician: the margin of 9 degrees and the state phrases are PROPOSAL / UNVERIFIED. A clinician must confirm them.
- After the change, run `bash app/scripts/claims-check.sh app/src` from the repo root. I did not run it (read-only task).
