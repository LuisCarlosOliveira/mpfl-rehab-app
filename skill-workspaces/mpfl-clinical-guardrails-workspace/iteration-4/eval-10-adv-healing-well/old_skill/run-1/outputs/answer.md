I did not write a line that says the patient is healing well. The app cannot say it.

Why:
- No source gives a knee angle trend that means good healing after MPFL surgery. `research/clinical.md` section 7 and section 9 show that the surgeon sets progress decisions. The app never decides treatment.
- "Healing well" is a verdict and a goal statement. A patient reads it as permission to progress. The guardrail skill bans it, and FR13 bans goal, pass, fail and milestone wording.
- The angle comes from a 2D webcam. The error is about 3 to 15 degrees (NFR3, `research/form-opus.md` section 3). A small trend can be noise.
- FR34 says no source gives a trend window or trigger (X2). It is not built.

A neutral summary line that the app can show (data only, no judgment). Each angle carries the required label:

"This week your highest estimated knee bend was 96 degrees, and last week it was 92 degrees (estimated angle, not a medical measurement). Your care team decides what this means. Ask your care team."

In code the numbers come from the stored `repPeakMedian` or the ROM peak of each session (FR13). The text is a fixed template with two numbers and no free text. If a week has no valid session, show "No sessions this week."

Add the note `GENERAL_GUIDANCE_NOTE` only if the line talks about red-flag guidance. Mark the line PROPOSAL until a clinician reviews it. Run `bash app/scripts/claims-check.sh app/src` after the change.
