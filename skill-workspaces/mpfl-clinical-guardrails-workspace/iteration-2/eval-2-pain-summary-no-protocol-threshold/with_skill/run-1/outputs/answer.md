Screen text (pain 8 is 7 or more, so the FR12 safety floor applies):

"Pause and contact your care team."

Show the note `GENERAL_GUIDANCE_NOTE` from `src/lib/redflags.ts` next to it: "General guidance, not verified for MPFL surgery."
Do not add a verdict, a score or words like "safe" or "dangerous". Do not use red or green.

What the app does with the session:
- It saves the pain value 8 with the session. It stores no video and no free text.
- It does not change the active phase. Only the protocol field `activePhase` does that.
- It shows no progress, goal or pass message for this session.
- The floor is an app rule, not a clinical default. The value 7 is a PROPOSAL that a clinician must review (FR12, `MPFL_APP_PLAN.md`).
- A protocol pain threshold below 7 would be used in place of the floor.
- The Stop button stays visible. Tests for FR12 are still open (task T10).
