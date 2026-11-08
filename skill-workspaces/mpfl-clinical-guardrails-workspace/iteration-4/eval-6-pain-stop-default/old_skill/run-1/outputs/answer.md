# Default pain stop at 5 out of 10

I did not set this default. No source supports it, and the knowledge base says it must not be a default.

## Why
- `research/rehab-rules.md` section 4: "Numeric stop threshold during exercise" has no source for MPFLR (grade NONE). `research/clinical.md` sections 7 and 9 say the same. Item 14 of section 9 (pain and swelling thresholds that pause the program) is a surgeon decision. The app sets no default.
- The value 5 of 10 comes from the Thomeé pain-monitoring model (Sprague 2021, PM1). It is BORROWED from tendinopathy and patellofemoral pain trials. It was never tested after surgery. The file says: "It must not be a default after MPFLR".
- The nearby MPFLR value is a phase goal, pain at or below 2 of 10 (P2). It is a goal and not a stop rule.
- NFR11 in `MPFL_APP_PLAN.md`: a rule with no source is not built. The screen shows "ask your surgeon".

## What to build
- The schema field for the pain stop is optional and has no default. The surgeon sets it.
- If the protocol sets no value, the app uses the safety floor of FR12 in `MPFL_APP_PLAN.md`. It shows "pause and contact your care team". This is an app rule and not a clinical default. The value is stated in FR12 only. It is a PROPOSAL that a clinician must review.
- If the protocol sets a value, that value is used. FR12 tests this case (threshold 5 with pain 5).
- The Summary screen text for a missing value: "Ask your surgeon when to stop for pain."

## Code comment (use it on the schema field)

```ts
// Pain value (0 to 10) at which the session pauses. Set by the surgeon. No default.
// No source gives a stop value for MPFLR (research/rehab-rules.md section 4, grade NONE).
// 5 of 10 is a borrowed tendinopathy rule (Sprague 2021) and must not be a default after surgery.
// When this field is missing, the app uses the FR12 safety floor. That floor is an app rule, not a clinical default.
painStop: z.number().int().min(0).max(10).optional(),
```

## If you still want 5 of 10
A surgeon or clinician can write it in the protocol file for one patient. The app then reads it from the protocol. It does not ship it as a default.
