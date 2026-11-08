I did not make this change, and I did not write the comment. Two rules block it, and the evidence for 5 out of 10 does not exist in the knowledge base.

## Why I stopped

1. **No default is allowed.** The guardrail skill says: show every surgeon decision as "ask your surgeon" when the protocol does not set it, and set no default. Pain and swelling thresholds that pause the program are surgeon decision 14 (`research/clinical.md` section 9). FR2 in `MPFL_APP_PLAN.md` says the same: a missing surgeon field shows "ask your surgeon", and no default value appears. Today `painPauseThreshold` in `app/src/lib/protocol/schema.ts` (line 126) is `z.number().int().min(0).max(10).optional()`. That is correct. A `.default(5)` would break FR2.

2. **No source supports 5.** A comment that cites evidence for 5 would invent a citation.
   - `research/clinical.md` section on thresholds: "No source gives a stop threshold for other exercises. UNVERIFIED." The only pain value is "pain below 2 of 10" (S1). It is a gate for starting a run, not a stop rule, and it has a single source.
   - `research/clinical-update.md`: "No source gives a numeric effusion or pain threshold that pauses rehab after MPFLR." Also "No validated pain or effusion threshold pauses rehab."
   - `MPFL_APP_PLAN.md` open items: a borrowed knee osteoarthritis study calls pain above 5 "high-risk". That is UNVERIFIED, it is a borrowed population (not MPFL reconstruction), and it is an unopened source. It cannot back a patient-facing default.
   - There is no guideline for rehab after MPFL reconstruction. Pain limits rest on expert agreement only.

3. **The app already has a rule for the no-threshold case.** FR12 is the safety floor. If the protocol sets no threshold, the app shows "pause and contact your care team" at pain 7 or more, or swelling "more than before". It is an app rule and not a clinical default. The value 7 is itself a PROPOSAL that a clinician must review. If the protocol sets a lower threshold, that value is used. Setting a schema default of 5 would hide the floor, add a second unsourced number, and make the app look like it decides a clinical limit. It would also break the FR33 property test: a missing clinician value never gets a default and never fires a rule.

## What I can do instead

- Leave the schema as it is: optional, no default.
- Add a code comment above `painPauseThreshold` that states the truth. Example text: "Set by the surgeon only. No default. No source gives a stop value after MPFL reconstruction (research/clinical-update.md). The app floor is in FR12 (MPFL_APP_PLAN.md)." This points to the plan and does not copy the value 7 (DRY, the plan states it once).
- If you want 5 to be a protocol value, a clinician must supply it in the protocol file. Then the field carries `authoredBy` and `approvedOn`, and the app uses it as a lower threshold under FR12. Example protocol files must keep the banner "EXAMPLE, NOT APPROVED".
- If you want a different floor than 7, change FR12 in the plan. Mark it PROPOSAL, state it once there, and ask a clinician to review it.

Decision needed from you: do you want the comment-only change, or do you have a clinician source for 5? I made no file change and I did not run `claims-check.sh`, because nothing changed.
