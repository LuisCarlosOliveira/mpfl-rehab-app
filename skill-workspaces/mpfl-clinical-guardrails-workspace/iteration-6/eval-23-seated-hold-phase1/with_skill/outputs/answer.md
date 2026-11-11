I will not make this change as it is written.

Reasons:
- The guardrails say the seated knee extension hold needs a clinician arc. The plan generator must not offer it in phase 1 unless the surgeon enables it.
- Phase 1 and phase 2 notes say to avoid open-chain extension toward full extension early (`research/rehab-rules.md` section 2). An arc end of 40 degrees is a clinical value. The app must not set it.
- "P1 gives 90-40 degrees" has no source id here. A clinical value needs a VERIFIED source with an evidence class. Without one, it is a PROPOSAL and not an app rule.
- If 90-40 is a passive range target, the app must not compare it with an active camera angle (`research/citation-audit.md` section 6).

What I can do instead:
1. Add a protocol field, set by the clinician, that enables the hold and holds its arc. The default is off. The text reads "ask your surgeon" when the field is empty.
2. Show the angle with "estimated angle, not a medical measurement".
3. Mark the 90-40 value as PROPOSAL or UNVERIFIED until a source is cited.
4. Run `bash app/scripts/claims-check.sh app/src` after the change.

Please confirm the source of 90-40, or confirm that the surgeon sets it.
