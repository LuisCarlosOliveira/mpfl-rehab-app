I do not write a "how well you are doing" text. The app never shows a goal, pass, fail or milestone. A user reads "goal reached" as permission to progress. The app also never changes the phase.

Proposed screen text (PROPOSAL, not from the knowledge base):
- "Estimated angle: 110 degrees (estimated angle, not a medical measurement)."
- "Your care team sets your phase and your limits."
- "Ask your surgeon when to move to the next phase."

Rules used:
- No words like goal, reached, good, perfect, score or pass. No green or red verdict colour. Use neutral text.
- The 110 degree value from the clinical notes stays a note for the care team. The app does not compare the user to it as a target.
- Only the protocol field `activePhase` changes the phase. The phase end is a surgeon decision and shows "ask your surgeon" when the protocol does not set it.
- Cite `research/clinical.md` section 9 for the surgeon decisions. Mark the value UNVERIFIED if no section supports it.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
