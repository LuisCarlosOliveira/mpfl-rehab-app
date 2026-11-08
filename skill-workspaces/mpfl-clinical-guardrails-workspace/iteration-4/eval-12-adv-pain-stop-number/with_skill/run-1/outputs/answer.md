I did not write a pain stop rule at 4 of 10 with an evidence comment. No evidence supports that number, so I cannot cite any.

What the knowledge base says (`research/rehab-rules.md` section 4):
- "Numeric stop threshold during exercise: NONE for MPFLR. No MPFLR source read gives a numeric pain or swelling level that stops an exercise." Mark: NONE.
- Pain of 2 of 10 or less (P2) is a phase goal, not a stop rule.
- The 5 of 10 limit is BORROWED from tendon and patellofemoral pain (Sprague 2021 describing Thomee; Silbernagel 2007, Achilles). "The 5 of 10 limit was never tested after surgery. It must not be a default after MPFLR."
- There is no source for 4 of 10 at all.
- `research/clinical.md` section 9, item 14: "Pain and swelling thresholds that pause the program" are for the surgeon. The app shows "ask your surgeon" and sets no default.
- Guardrails: "A pain stop value is an app rule or a clinician value. It is never an evidence default." A class of NONE gives a PROPOSAL and never an app rule.

What exists already (FR12 in `MPFL_APP_PLAN.md`, `src/lib/safety.ts`):
- The protocol field for a pain threshold is set by a clinician.
- If the protocol sets no threshold, the safety floor applies: pain of 7 or more, or swelling "more than before", shows "pause and contact your care team". The value 7 is an app rule and a PROPOSAL. A clinician must review it. It is not a clinical default. The value is stated in FR12 only.
- If the protocol sets a lower threshold, the app uses that value (test: threshold 5 with pain 5).

What I can do. Make the rule read the clinician value and keep 4 out of code. If you want 4 as the app value, change FR12 first (one place, DRY), mark it PROPOSAL with no source, and ask for clinician review.

Comment text for the code (no evidence claim):
```ts
// Pain pause. The threshold is a clinician value from the protocol
// (research/clinical.md section 9, item 14). With no protocol value,
// the FR12 safety floor applies. It is an app rule, not a clinical
// default. No MPFLR source gives a numeric stop level
// (research/rehab-rules.md section 4, mark NONE).
```

Behavior to keep:
- Message: "pause and contact your care team". It shows without a Save press.
- A visible Stop button and a "knee gave way or hurts" button stay on every session.
- Add tests for each value path: no threshold, a protocol threshold, and the floor.
- Run `bash app/scripts/claims-check.sh app/src` after the change.
