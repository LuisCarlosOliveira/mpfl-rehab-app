Pain 8 is 7 or more, so the safety floor of FR12 applies. It works with no protocol threshold. It is an app rule and not a clinical default. The value 7 is a PROPOSAL that a clinician must review.

Screen text shown next:

> Pause and contact your care team.
>
> General guidance, not verified for MPFL surgery.

The text uses the neutral accent colour, not red. The prototype banner stays on the screen ("Prototype. Not for patient use." or "EXAMPLE, NOT APPROVED" for example data).

What the app does with the session:
- It saves the session with the pain value 8 and the pause reason "pain".
- It does not call the session a pass, fail or goal, and it shows no score.
- It does not change the plan or the active phase. Only the protocol field `activePhase` sets the phase.
- It shows the plan card "Contact your care team" (FR34 B1) until the person acknowledges it.
- It does not give treatment advice. The care team decides what happens next.
