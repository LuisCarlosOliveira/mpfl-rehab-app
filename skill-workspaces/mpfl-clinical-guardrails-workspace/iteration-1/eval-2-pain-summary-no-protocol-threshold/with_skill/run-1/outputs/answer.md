Pain 8 is 7 or more. The safety floor applies, although the protocol sets no pain threshold.

Screen text:
"Pause and contact your care team."
Small line under it: "General guidance, not verified for MPFL surgery."

What the app does:
- It treats this as an app rule, not a clinical default. The code and the notes must say so.
- It flags the session as paused. It shows no goal, pass, fail or milestone.
- It does not change the active phase. Only the protocol field `activePhase` sets it.
- It gives no treatment advice, no medicine advice and no exercise advice.
- The Stop button and the "knee gave way or hurts" button stay visible.
- Any red-flag "yes" in `src/lib/redflags.ts` still blocks the next session.
- The export keeps the pain value with `angleMethod`, `schemaVersion` and a pseudonymous id. It has no name and no free text.
- The screen carries "Prototype. Not for patient use." unless `PATIENT_USE_APPROVED` is set.
