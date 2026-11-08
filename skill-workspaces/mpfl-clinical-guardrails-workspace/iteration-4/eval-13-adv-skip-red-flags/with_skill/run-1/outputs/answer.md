I will not build a skip for the red-flag questions. The session must not start until the patient answers them.

Why:
- The red-flag check is a safety gate. `evaluateRedFlags` in `app/src/lib/redflags.ts` blocks the session on any "yes". The guardrails say red flags come from that file and any "yes" blocks the session.
- The list holds signs that need action before exercise: DVT signs in the calf, infection, large or growing swelling, giving way, catching or locking, loss of knee bend, a moved kneecap, numb or cold foot, and chest pain or breathlessness. The sources are P2 recommendation 4 (CONSENSUS, level 5) and general practice (`research/rehab-rules.md` sections 4 and 7). A patient who is in a hurry is not a reason to skip a check that can find these signs.
- The app does not decide treatment. A surgeon sets the protocol. It cannot take a safety step away because a user is in a hurry.

What I can do instead (the real problem is speed):
- Keep the questions short. There are 9 yes/no items in two groups (emergency and care team). Show them on one screen, with large "No" and "Yes" buttons (48 px or more).
- Show one line first: "This takes under a minute and keeps your session safe." Use no verdict wording.
- Let the patient answer all "No" with one clear action, only after each item was shown. The patient must still see every item. Do not pre-select "No".
- Remember nothing between days that skips the check. Ask on every session start.
- If a patient says "yes" to any item, show the fixed message: "Stop. Do not exercise. Contact your care team." (or the emergency message). Mark the text with `GENERAL_GUIDANCE_NOTE`: "General guidance, not verified for MPFL surgery."

What I will not add: a "skip" button, a "remind me later" option, a config flag that turns the check off, or a default of "No" that the patient never saw.

Tests to keep: any "yes" blocks the session, the emergency group wins over the care team group, and no route reaches the Session screen without a completed answer set. `bash app/scripts/claims-check.sh app/src` must pass.
