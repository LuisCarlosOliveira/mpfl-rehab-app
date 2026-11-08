# Progress screen text

I did not write a "how well you are doing against your phase goal" text. The app rules do not allow it. This is the reason, followed by text that is allowed.

## Why the requested text is not written

1. The app never shows a goal, pass, fail or milestone, in words or in colour (skill `mpfl-clinical-guardrails`, Wording). A patient reads "goal reached" or "end of phase 1" as permission to progress. Only the surgeon decides that.
2. The app never changes the phase. Only the protocol field `activePhase` sets it. A progress text must not say or imply that the patient is at the end of phase 1.
3. The 110 degrees is an estimate from a 2D webcam. It is an active angle. The phase flexion targets in the sources are passive range (PROM), for example P2 "at least 90 degrees PROM by 4 weeks" and "at least 120 degrees by 6 weeks" (`research/citation-audit.md` section 6, V11). The app must never compare a passive target with an active camera angle. The two are different quantities.
4. The clinical notes list 110 degrees as the end of phase 1, but no VERIFIED source id supports it. The sources show other values (P2: 90 degrees at 4 weeks. N3: passive flexion above 125 degrees in weeks 0 to 6). Surgeons differ, and a bone procedure can restrict the range. Without a verified source, the value is a PROPOSAL and never an app rule. Every clinical number is a field that a clinician sets in the protocol.
5. The words "doing well", "good", "goal", "milestone" and "reached" in a verdict sense are banned in patient text. A green verdict colour is banned too.

## Allowed text

Use a neutral record of what was measured. Show it with the required note.

Example data banner: "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, the screen also reads "Prototype. Not for patient use."

**Your knee bend**

Highest estimated angle this session: 110 degrees
Estimated angle, not a medical measurement.

Earlier sessions: show the same value for each date, as plain numbers or a plain grey line. Use no colour that means good or bad.

When the protocol sets a limit (`maxFlexion`), show only a plain measured fact:

"Your care team set a limit of [protocol value] degrees. Your highest estimated angle was 110 degrees."

When the protocol sets no limit or no phase target, show:

"Ask your surgeon what knee bend is right for your phase."

Footer, always:

"This app counts reps and estimates angles. It does not decide your treatment. Your surgeon decides when you move to the next phase. Ask your surgeon or physiotherapist about your progress."

If the patient reports pain, swelling or a knee that gave way, the red-flag text of `src/lib/redflags.ts` applies and carries the note `GENERAL_GUIDANCE_NOTE`: "General guidance, not verified for MPFL surgery."

## Notes for the developer

- The 110 degrees must not be a hard-coded constant. If a phase target is shown at all, it comes from a protocol field that a clinician sets. It then shows as a plain number with no verdict.
- No comparison, percentage, progress bar toward the phase end, or "almost there" text. Each one is a goal in other words.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
- Needs a decision from the care team: whether the progress screen shows a phase target at all, and which value. This is a surgeon decision (`research/clinical.md` section 9).
