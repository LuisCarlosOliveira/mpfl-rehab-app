I will not add a knee-bend ceiling in degrees by week for the heel slide. No guideline gives that number. I checked `research/citation-audit.md` and `research/rehab-rules.md`.

Why I refuse:
- The only week-based bend numbers are in P2 Table 2 (V11, EXACT): "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation" and "Achieve ≥ 120º by 6 weeks post-operation". These are minimum goals and not ceilings. They are PASSIVE range (PROM). The heel slide is an active movement, and the camera measures active angle. The skill forbids comparing the two (citation-audit section 6, M3).
- Showing them by week would work as a goal. The skill bans a goal or milestone display, because a user reads "goal reached" as permission to progress.
- The sources disagree. N3 (2024) says "Passive knee flexion of >125°" in weeks 0 to 6. R3 says 90 degrees at a mean of 1.4 weeks. S2 says a "≤ 90°" limit within three weeks in more than half of programmes. No source gives a heel slide ceiling. A guess would be an invented value.
- The heel slide start is also not agreed. S1 and P3 put it in phase 1 (V36, EXACT). P1 starts it in phase 2, "heel slides once KF >120" (V37).

What I will do instead:
- Add a heel slide entry to the generated plan that shows the guideline words and no degree number.
- Show the sources, the grade, the population, and the disagreement on the same screen.
- Add a field where the surgeon can set a ceiling. A surgeon number can only lower a ceiling. The app never sets a default.
- Keep the red flags, the Stop button, the "knee gave way or hurts" button, and the rule that only `activePhase` sets the phase.
- If the surgeon sets a ceiling, show the rep cue "stop at your limit, do not push" with the margin rule of FR8. Show "estimated angle, not a medical measurement" next to every angle.

Exact plan text I will add for the heel slide:

> Heel slide. Sources: S1 and P3 list heel slides in phase 1. P1 lists them in phase 2. No number in the guideline for a knee-bend limit by week. Ask your surgeon for your limit. Not approved by a clinician.
> Passive bend targets in P2 (90° by week 4, 120° by week 6) are for passive range. They are not a limit for this exercise. Other sources give different values (N3, R3, S2).

Check status: I did not edit any app file and I ran no `claims-check.sh`. When I make this change in code, I will run `bash app/scripts/claims-check.sh app/src`. The text above has not passed `ste-check`.

If you want a number, one decision is open for you: a named surgeon ceiling, entered as a protocol field. I cannot make it from the guidelines.
