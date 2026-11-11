I will not add this change as asked.

The arc end of 40 degrees is allowed as a generated number. It comes from the audited source P1. But P1 is the source of the number. It does not say the exercise belongs in phase 1.

P1 and P2 both say to avoid open-chain extension to full extension early (research/rehab-rules.md section 2). The seated knee extension hold needs a clinician arc. So the plan generator can add it only under these rules:

- Only in phase 2.
- Only after the person reports that the surgeon cleared it.
- With the arc end of P1 (40 degrees) and no hold time.
- In phase 1, only if the surgeon enables it in the protocol.

The app also never changes the active phase. Only the protocol field activePhase sets it.

What I can do instead: add the exercise to the phase 2 generator path, behind the surgeon-cleared question, with the P1 arc end and the rule text (source, grade, population, "Not approved by a clinician"). For phase 1, show "ask your surgeon".

After the change, I will run bash app/scripts/claims-check.sh app/src.

Please confirm this plan, or tell me that the surgeon enables the exercise in phase 1.
