I will not add a knee-bend ceiling in degrees by week for the heel slide. I checked the knowledge base (`research/INDEX-v2.md`, `rehab-rules.md`, `citation-audit.md`). The guidelines do not give a ceiling that the app can use.

Why I refuse:

1. The ceiling is a surgeon value. `rehab-rules.md` (Heel slide row) says: "Range ceiling from the surgeon". The guidelines only say that heel slides are allowed in the first phase (S1, P3). The mark is CONSENSUS (low).
2. The "90 degrees in weeks 0 to 4" cap has no verified source. `citation-audit.md` V14 says P1 has "No explicit 90 cap". P5 and P11 were not checked. P1 only says "Avoid KF ROM beyond surgeon guidelines".
3. The old claim "P1: heel slides in the AROM progression" is WRONG (V37). In P1, heel slides start in phase 2, "once KF >120".
4. The numbers that exist are targets, not ceilings. P2 says "Achieve ≥ 90° knee flexion PROM by 4 weeks" and "≥ 120º by 6 weeks". The audit verdict (section 4.5) is "NOT SUPPORTED as a ceiling". S1 gives a pace ("0°-30° in the first or second week", "progress by 20°- 30° per week"). This pace is OPINION, and it is a typical start, not a limit.
5. The targets are passive range (PROM). A camera measures active angle. The app must not compare the two (`citation-audit.md` M3).
6. Sources disagree. N3 (2024) allows "Passive knee flexion of >125°" in weeks 0 to 6. R3 says 90 degrees at a mean of 1.4 weeks. A weekly table would hide this.
7. A ceiling that is wrong in the low direction can cause stiffness (S1, N22). A ceiling that is wrong in the high direction can stress the graft after a bone procedure.
8. A weekly degree table also looks like a goal or milestone. The guardrails ban that. The camera angle has an error of about 9 to 10 degrees (F3). It is an estimate only.

What I will do instead (this is what the plan will add):

- The heel slide has a protocol field `maxFlexion` that the surgeon sets. A flexion limit can also be set by week, as a surgeon field. The generator does not fill it from the guidelines.
- If the surgeon sets no value, the screen shows: "Knee-bend limit: ask your surgeon". There is no default number.
- The generator can show, as a note with a source and no number to compare, that heel slides are allowed in the first phase (S1 Table 1, P3 phase 1, CONSENSUS low).
- When `maxFlexion` is set, the app uses the margin rule in `MPFL_APP_PLAN.md` (FR8). A rep above `maxFlexion` plus the margin shows an alert and does not count. The cue is "stop at your limit, do not push". From the limit minus the margin, the cue is "close to your limit, stop", and the rep still counts.
- A rep in range shows no message.
- Next to every angle the screen shows: "estimated angle, not a medical measurement".

Exact plan text to add:

> PROPOSAL, not a rule. Heel slide knee-bend limit. The surgeon sets this value in the protocol field `maxFlexion`, by week if the surgeon wants. The guidelines give no verified ceiling (rehab-rules.md, Heel slide: "Range ceiling from the surgeon"). The generator sets no default. If the field is empty, the screen shows "Knee-bend limit: ask your surgeon". The 90 and 120 degree values of P2 are passive-range targets. The app does not use them as a ceiling and does not compare them with the camera angle. The app compares the estimated angle only with the limit of the surgeon, with the margin rule of FR8.

If you want a prefilled example, I can add it as example data only, with the banner "EXAMPLE, NOT APPROVED". I need a surgeon value from you or from a protocol file for that.

I did not edit any file except this answer. I ran no npm, test or server command. I ran no claims check, because I changed no source. This text was not run through `ste-check`.
