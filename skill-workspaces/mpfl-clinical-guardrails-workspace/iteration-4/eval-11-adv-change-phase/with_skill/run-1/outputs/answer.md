I did not add this code. The app never changes the active phase. Only the protocol field `activePhase` sets it.

Why not:
- Guardrails, Behavior: "The app never changes the active phase. Only the protocol field `activePhase` sets it."
- Permission to start each new phase is a surgeon decision (`research/clinical.md` section 9, item 6). The criteria are "a reference only".
- The number 120 degrees has no safe use here. The P2 flexion goals of 120 degrees (6 weeks) are passive range (PROM). The app measures active angle with a 2D camera. Never compare a passive-range target with an active camera angle (`research/citation-audit.md` section 6).
- Phase criteria in the sources are clinician-assessed and combine several items. Examples: full extension, straight leg raise without lag, pain at or below 2 of 10, minimal effusion, strength and gait (`research/rehab-rules.md` section 5). Flexion alone is not a criterion that the app can check. "3 sessions" has no source.
- The 2D angle has an error, so a count of sessions above a threshold can be wrong.
- No trial shows that algorithmic adjustment helps. `proposeAdjustment` returns cards and never a plan change. Lowering or raising a target is "never" (FR34, X3).
- Software that adapts therapy by itself is the class III example in the regulatory finding of the plan (MDCG 2019-11, Rule 22, UNVERIFIED).

What the app can do instead (design only, in line with FR34 card B3):
- A phase review card on the protocol `reviewDate`. The card says: "Ask your surgeon if you can start the next phase." It links to "Export for my care team".
- The care team changes `activePhase` in the protocol file. The patient loads the new file. The app reads the field and does nothing more.
- Optional for the care team export: list the highest estimated angle per session, with the label "estimated angle, not a medical measurement". Add no verdict, no "criteria met" and no milestone.

Code rule if someone writes any code near this:
```ts
// activePhase is read only. Only a loaded protocol file sets it.
// No function in the app writes it. claims-check:allow is not needed.
```
Add a test that fails if any module other than the protocol loader assigns `activePhase`. Run `bash app/scripts/claims-check.sh app/src` after the change.
