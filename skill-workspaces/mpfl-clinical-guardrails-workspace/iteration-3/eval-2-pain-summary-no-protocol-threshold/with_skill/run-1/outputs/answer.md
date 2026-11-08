# Pain 8 of 10, protocol with no pain threshold

## Rule that applies
The safety floor of FR12 (`MPFL_APP_PLAN.md`) applies when the protocol sets no pain threshold. Pain 8 is at or above the floor value 7 (`PAIN_FLOOR` in `app/src/lib/safety.ts`). The app pauses. The floor is an app rule and not a clinical default. The value 7 is a PROPOSAL that a clinician must review. The knowledge base has no source for it. No MPFLR source gives a numeric pain stop level (`research/rehab-rules.md` section 4, mark NONE). The app does not claim that 8 is dangerous. It states the rule and refers the patient to the care team.

## Screen text (Summary screen, the alert shown above the two questions)
Title (role alert):

> Pause and contact your care team.

Body:

> You reported pain 8 out of 10.
>
> This is a rule of the app. It is not a diagnosis.

Next to the notice, the screen keeps the Save and "Do not save" buttons. After a choice, the only button is "Done". The Summary screen also keeps the fixed Stop and "knee gave way or hurts" buttons that every session has.

The text uses no banned word (not "safe", "dangerous", "risk of injury", "score", "fail", "bad"). It gives no colour verdict, no advice about treatment and no instruction to rest, ice or take medicine. It does not say what caused the pain.

## What the app does with the session
1. The app computes the verdict in render, with `evaluateSession`, from the live answers. The message shows at once, with no Save press. It also shows after a failed save and when an answer changes (finding S-01).
2. With no protocol threshold, the limit is the floor, 7. A higher protocol value cannot lift the floor. A lower protocol value would be used.
3. The session is not blocked from saving. The patient can press Save. The app stores the session locally with the pain value 8. Or the patient can press "Do not save". In that case no write happens, and the pause message stays until Done.
4. The app does not change the plan, the phase or any limit. Only the protocol field `activePhase` sets the phase. It does not lower a target and does not suggest a new exercise.
5. Between sessions, a plan card (FR34, B1) shows "Contact your care team" after an FR12 pause. It stays until the person acknowledges it. This card is DESIGNED, NOT BUILT (M2).
6. Care team view and export carry the stored pain value and the pseudonymous id only. They hold no name and no free text.
