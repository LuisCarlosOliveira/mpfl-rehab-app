I did not make this change. I can not write a comment that cites evidence for a default of 5 out of 10, because no such evidence exists for this app. I changed no file.

## Why I stopped

1. No MPFL source gives a numeric pain stop. `research/rehab-rules.md` section 4, row "Numeric stop threshold during exercise", says "NONE for MPFLR". It says no MPFLR source gives a numeric pain or swelling level that stops an exercise.
2. The 5 of 10 value is BORROWED. It comes from the Thomeé pain-monitoring model, described in Sprague 2021 (PM1, a pilot RCT on patellar tendinopathy, full text read). Silbernagel 2007 (N25) tested it in Achilles tendinopathy. `rehab-rules.md` section 4 says: "The 5 of 10 limit was never tested after surgery. It must not be a default after MPFLR". The Smith 2017 review (SM1) covers chronic musculoskeletal pain and "does not transfer to a healing graft".
3. The only MPFL pain figure is the P2 goal of 2 of 10 or less. It is a phase goal and not a stop rule.
4. The guardrail skill says: "A pain stop value is an app rule or a clinician value. It is never an evidence default." A class of NONE gives a PROPOSAL and never an app rule (NFR11). Every surgeon decision stays "ask your surgeon" when the protocol does not set it, and the app sets no default (`research/clinical.md` section 9, item 14).
5. The schema already does this right. In `app/src/lib/protocol/schema.ts`, `painPauseThreshold` is `z.number().int().min(0).max(10).optional()` with no default. A default of 5 would break the rule that every clinical number is a clinician field.
6. A comment that cites evidence for 5 would imply a clinical basis that does not exist. That is a false clinical claim.

## What already covers pain safety

FR12 in `MPFL_APP_PLAN.md` sets a safety floor. If pain is 7 or more, or swelling is "more than before", the app shows "pause and contact your care team". The value 7 is stated only in FR12. It is an app rule and a PROPOSAL that a clinician must review. It is not a clinical default. A protocol can set a lower value. `app/src/lib/safety.ts` uses `Math.min(PAIN_FLOOR, painPauseThreshold ?? PAIN_FLOOR)`. A threshold of 5 set by a clinician in the protocol already works and has a test in FR12.

## Options

- Keep the field optional with no default. This is the current state and the recommended one.
- If you want a lower floor than 7, change the FR12 value. Mark it PROPOSAL and ENGINEERING. Say that a clinician must review it. State it only in FR12.
- If you want a comment in the schema, this text is accurate:

```ts
// painPauseThreshold: a number that the surgeon or care team sets. No default.
// If it is missing, the app safety floor in FR12 applies (an app rule, not a clinical default).
// No MPFL source gives a numeric pain stop (research/rehab-rules.md section 4).
// The 5 of 10 model is BORROWED from tendon and patellofemoral pain and was never tested after surgery.
```

- Put 5 of 10 in an example protocol only. It must carry the banner "EXAMPLE, NOT APPROVED". It is then a clinician-style value in an example and not an app default.
