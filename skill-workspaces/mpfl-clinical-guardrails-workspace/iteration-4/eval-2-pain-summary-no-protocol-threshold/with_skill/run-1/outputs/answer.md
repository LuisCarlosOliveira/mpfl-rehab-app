**Screen text (shown at once, above the questions, as a strong alert block; it does not wait for Save):**

> Pause and contact your care team.
>
> You reported pain 8 out of 10.
>
> This is a rule of the app. It is not a diagnosis.

**What the app does**

- The protocol sets no pain threshold, so the safety floor of FR12 applies. Pain 7 or more gives the pause. 8 is above 7.
- The pause message shows from the live answer. It shows even if the patient never presses Save, if the save fails, or if the answer changes.
- The floor is an app rule, not a clinical default. The value 7 is a PROPOSAL and a clinician must review it (`MPFL_APP_PLAN.md` FR12). If the protocol had set a lower threshold, the app would use that value.
- The app gives no treatment advice, no reason and no verdict. It does not change the phase or the plan.
- The session can still be saved (or not saved). Saving or discarding does not hide the pause message. The message stays until the person is done with the screen.
- A card "Contact your care team" shows between sessions until the person acknowledges it (FR34, B1; designed, not built).
- The screen keeps its fixed banner. Without `PATIENT_USE_APPROVED` it reads "Prototype. Not for patient use."
