# Pain 8, protocol with no pain threshold

## Rule that applies
The protocol sets no pain threshold, so the safety floor of FR12 (`MPFL_APP_PLAN.md`, row FR12) applies. The floor value in `app/src/lib/safety.ts` is `PAIN_FLOOR`. Pain 8 is at or above it. The floor is an app rule and not a clinical default. Its value is a PROPOSAL that a clinician must review. No source in `research/` gives it (UNVERIFIED). The app shows no other pain advice and no "ask your surgeon" gap text here, because the floor is the rule for a missing threshold.

## Screen text (Summary screen, shown at once, with no Save press)
The notice is a strong alert (`role="alert"`). It sits under the result cards and above the two questions (FR12, finding S-01).

> **Pause and contact your care team.**
> You reported pain 8 out of 10.
> This is a rule of the app. It is not a diagnosis.

The text comes from `PAUSE_MESSAGE` and from `PauseNotice` in `app/src/ui/Summary.tsx`. It uses no verdict word. It uses no green or red verdict colour, no goal, no pass or fail. It does not say what caused the pain. It does not say what to do with the exercise plan. If the person also answers swelling "More than before", a second line is added: "You reported swelling: more than before."

The rest of the screen stays as it is:
- Result cards: reps or holds counted, and "Highest knee bend" in degrees, with the label "estimated angle, not a medical measurement".
- The pain question ("How much pain do you have now? 0 is no pain. 10 is the worst pain.") and the swelling question. No value is pre-selected.
- Buttons: "Save" and "Do not save".

## What the app does with the session
1. The pause rule runs on the live answers in each render (`evaluateSession`). If the person changes the answer, the message changes at once. It does not wait for Save. A failed save does not hide it.
2. The message does not delete or block the record. The person can press "Save". The session is stored on the device in IndexedDB with `pain: 8`, the swelling answer, reps, angles, events, protocol id and active phase. It shows "Session saved." Then "Done".
3. If the person presses "Do not save", nothing is written. Because the pause message is active, the screen does not leave. It shows "Session not saved." with the pause message still visible, and "Done" ends it.
4. The app does not change the active phase and does not change the plan. Only the protocol field `activePhase` sets the phase. It gives no treatment advice and no dose change.
5. Between sessions (FR34, card B1, M2, DESIGNED, NOT BUILT): after an FR12 pause the app will show the card "Contact your care team" until the person acknowledges it. The card has fixed fields and no free text.
6. The record has pain 8, so the clinician export (pseudonymous id, `angleMethod`, `schemaVersion`, no name, no free text) will carry it for the care team.
7. Next session: the red-flag check (FR5) still runs before each start. An FR12 pause is a referral case for any plan proposal (`MPFL_APP_PLAN.md` section 1.5), so the app gives no plan change from this session.

## Sources
`MPFL_APP_PLAN.md` FR12, FR34 and section 1.5. `app/src/lib/safety.ts`. `app/src/ui/Summary.tsx`. Skill `mpfl-clinical-guardrails` (Behavior, Wording).
