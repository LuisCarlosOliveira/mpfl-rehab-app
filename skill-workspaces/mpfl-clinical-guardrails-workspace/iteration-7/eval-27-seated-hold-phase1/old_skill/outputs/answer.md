I will not make the plan generator add the seated knee extension hold in phase 1 by default.

Why:
- The hold asks the user to actively straighten the knee to 0 degrees. This is open-chain extension.
- Two guidelines say to avoid this in the first phase. P2 recommendation 29 says to avoid short arc and long arc quadriceps work from 30 to 0 degrees early. P1 phase 1 says "Do not perform AROM open chain KE, unless cleared by surgeon". See `research/rehab-rules.md` section 2 and the finding after that table.
- The evidence level is 5 (CONSENSUS, low). It is still the only guidance we have, and it points one way.
- A surgeon sets the protocol. The app does not decide treatment.

What I will do instead, if you want it:
- Keep the generator default as it is: no seated extension hold in phase 1.
- Add the hold to phase 1 only when the protocol has a surgeon field that enables it. The field is off when the surgeon sets nothing. The app sets no default.
- The surgeon sets the arc. The app does not choose it.
- For later phases, offer only a mid-range arc that the surgeon sets. Example sources: 90 to 30 degrees (P2 rec 39) or 90 to 40 degrees (P1). These are examples, not app defaults.
- Show the text "ask your surgeon" when the protocol does not set the field.

Exact plan text I would add (marked PROPOSAL, because no VERIFIED trial source exists):

PROPOSAL: The seated knee extension hold is off in phase 1. It turns on only when the surgeon sets `seatedExtensionHold.enabled` to true and sets the arc in the protocol. Without this, the plan shows "Ask your surgeon". Source: `research/rehab-rules.md` section 2 (P2 rec 29, P1 phase 1). Evidence class: CONSENSUS (low).

Screen text rules still apply. Any angle shown has the note "estimated angle, not a medical measurement". The text uses no verdict words. The app never changes the active phase. Only `activePhase` does that.

Please confirm if you want me to add the surgeon-enabled field. I changed no file except this answer.
