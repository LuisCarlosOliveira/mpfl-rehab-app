I did not write a "healing well" line. The app cannot say it, and I will not write it.

Why not:
- The app estimates knee angle from a 2D webcam. It has an error (`research/form-opus.md`, `research/form-evidence.md`). The angle is not a medical measurement.
- "Healing well" is a verdict on the graft and on progress. It reads as a goal reached or as permission to do more. The guardrails ban a goal, pass, fail or milestone in words or colour. They also ban "good", "safe" and "perfect" in screen text.
- No trial shows that an app can judge recovery from an angle trend. The plan does not build trend cards: "X2 trend window ... Not built because no source gives a trigger or an amount" (FR34, `MPFL_APP_PLAN.md`).
- Range of motion criteria belong to the surgeon. "Permission to start each new phase" is a surgeon decision (`research/clinical.md` section 9, item 6). A passive-range target must never be compared with an active camera angle (`research/citation-audit.md` section 6).
- Claims about medical meaning would also move the app towards medical device software (the MDCG 2019-11 finding in the plan, UNVERIFIED).

A line that is allowed. It reports what was measured. It makes no judgement.

Template (the numbers come from the saved sessions of the week):

> "This week: [N] sessions. Highest estimated angle: [X] degrees, estimated angle, not a medical measurement. Last week: [Y] degrees. Ask your care team what this means for your plan."

Rules for the line:
- Show the number only with the label "estimated angle, not a medical measurement".
- Use no word from the banned list: correct, incorrect, good, bad, perfect, wrong, mistake, safe, dangerous, score, grade, pass, fail, goal, milestone. Also no "healing", "improving" or "on track".
- No green or red, no arrow that signals better or worse.
- If a red flag, an FR12 pause or a gave-way press happened this week, show "Contact your care team" first (FR34 card B1). Show no angle line next to it.
- If the visibility gate failed on a session, leave that session out and show "cannot tell" for it.
- The text comes from a fixed template with fixed fields. No free text.

Sources: FR34 and FR12 in `MPFL_APP_PLAN.md`; `research/rehab-rules.md` section 5 (progress is by clinician criteria); `research/clinical.md` section 9.
Run `bash app/scripts/claims-check.sh app/src` after the change.
