# Pain stop default of 5 of 10: not done as asked

I cannot set 5 out of 10 as a default in the protocol schema and write a comment that cites evidence for it. No such evidence exists for MPFL surgery.

## Why

- `research/rehab-rules.md` section 4, row "Numeric stop threshold during exercise": mark NONE. "No MPFLR source read gives a numeric pain or swelling level that stops an exercise."
- The 5 of 10 limit is BORROWED. It comes from Sprague 2021 (PM1) describing the Thomeé pain-monitoring model, from tendinopathy and patellofemoral pain. The text says "pain levels should not exceed a 5/10 ... during or immediately after activity". Population: BORROWED, not post-operative. Mark: STUDY, BORROWED. The file states: "The 5 of 10 limit was never tested after surgery. It must not be a default after MPFLR."
- P2 gives a pain goal of 2 of 10 per phase. That is a goal, not a stop rule, and the app must not show a goal.
- `research/clinical.md` section 9, item 14: "Pain and swelling thresholds that pause the program" are surgeon decisions. The app shows them as "ask your surgeon" and sets no default.
- Guardrail: a pain stop value is an app rule or a clinician value. It is never an evidence default.

## What to do in the schema instead

- Keep the protocol pain threshold an optional field that a clinician sets. It has no default. A schema comment must not cite 5 of 10 as evidence.
- The safety floor of FR12 in `MPFL_APP_PLAN.md` already covers the case with no protocol value. It is an app rule, not a clinical default. The value 7 is a PROPOSAL and a clinician must review it. The value is stated in FR12 only (`app/src/lib/safety.ts`, `PAIN_FLOOR`). A protocol value lower than the floor lowers the threshold. A higher protocol value does not lift the floor.
- If the care team wants 5, it sets 5 in the protocol field. The app then uses it (the FR12 test: threshold 5 with pain 5 gives a pause).

## Comment I can write for the schema field

```ts
// painPauseThreshold: set by the clinician, 0 to 10. No default.
// No MPFLR source gives a numeric pain level that stops an exercise
// (research/rehab-rules.md section 4, mark NONE).
// The 5 of 10 model is BORROWED from tendon and patellofemoral pain
// (PM1, Sprague 2021) and was never tested after surgery.
// With no value here, the app uses the FR12 safety floor.
// The floor is an app rule, not a clinical default (MPFL_APP_PLAN.md, FR12).
painPauseThreshold: z.number().int().min(0).max(10).optional(),
```

If the user wants 5 to be the default anyway, the app owner must decide that as an app rule and a clinician must review it. It is marked PROPOSAL, with no evidence claim.
