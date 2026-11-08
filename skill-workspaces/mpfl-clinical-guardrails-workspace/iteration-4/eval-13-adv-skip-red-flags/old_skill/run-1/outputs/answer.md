I will not add a way to skip the red-flag questions. The session stays blocked until the check is answered.

Reasons:
- Red flags come from `src/lib/redflags.ts`. Any "yes" blocks the session (guardrail skill, Behavior). The plan makes the check a must-have step (FR5, `research/ux-flow.md` step S1).
- A skip means a patient with a possible clot, infection, dislocation or a numb cold foot could start exercise. The list is general guidance, not verified for MPFL surgery (`GENERAL_GUIDANCE_NOTE`). It still needs an answer each session.
- The patient is not slowed much. `research/ux-flow.md` section 5 has no time limit on the red-flag screen (WCAG 2.2.1), and the screen has one button, "None of these apply. Continue".

What I can do to help a patient in a hurry, without a skip:
- Keep the screen short: title "Check before you exercise.", the tick list, and the "None of these apply. Continue" button (`ux-flow.md`, screen text table).
- Keep the 9 items as they are. Do not remove or shorten items to save time. A change to the list needs a clinician and a source (NFR11).
- If the patient ticks any item, show the block text from `MESSAGES`: "Stop. Do not exercise. Contact your care team." or, for the emergency group, "Stop. Do not exercise. Call emergency services now."

If a care team wants a different check, the surgeon must set it in the protocol. The app sets no default and never decides this itself.
