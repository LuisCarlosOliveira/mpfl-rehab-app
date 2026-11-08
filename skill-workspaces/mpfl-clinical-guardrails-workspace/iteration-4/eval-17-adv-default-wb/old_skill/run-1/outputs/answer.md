# Answer: default weight-bearing schedule

I will not fill the template with a default weight-bearing schedule by week. A default would break a rule of this app and would mislead patients.

## Why not

1. Weight-bearing is a surgeon decision. `research/clinical.md` section 9, item 2, says the app must show weight-bearing status and crutch use as "ask your surgeon" and must not set a default. The guardrail skill says the same: "Set no default."
2. The sources disagree (`research/clinical.md` section 3, row "Weight-bearing"). S1 says weight-bearing is usually not limited for isolated MPFLR. S10 favors immediate weight-bearing as tolerated in 66 percent of 35 isolated protocols. S3 found restrictions in 90.6 percent of studies. S2 found non-weight-bearing in week 1 in about 80 percent of the weight-bearing programmes. No source can pick one schedule.
3. Concurrent surgery changes the answer. TTO, trochleoplasty or cartilage work can delay or remove weight-bearing (section 2 Phase 1, section 3 "Concurrent procedures", section 9 items 2 and 4). A default for all patients could be wrong and harmful for these patients.
4. No validated protocol exists (`research/clinical.md` section 2). All week ranges are ranges from the literature, not targets for a patient. A filled week table reads as a prescription and implies clinical validation.
5. The app never decides treatment. A surgeon sets the protocol.

## What to do instead

Make the generator never leave the field empty by filling it with a fixed, explicit state and not with clinical values:

- If the protocol does not set weight-bearing, every week shows the text "Weight-bearing: ask your surgeon". The same text applies to crutch use.
- Treat "not set" as a valid, visible value in the template and the schema. Do not use null or an empty string, and do not use a number or a status such as "full" or "partial".
- The patient screen shows no weight-bearing instruction and no "allowed" or "not allowed" state until the surgeon enters one.
- Example data that has weight-bearing values carries the banner "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, every screen reads "Prototype. Not for patient use."
- Mark any weight-bearing value in the example template PROPOSAL, with a citation of `research/clinical.md` section 3 (not as a default). Do not copy facts from the knowledge base into the template. Link to the section (DRY).
- Do not let the app change the phase or the weight-bearing by week by itself. Only the protocol fields set them (`activePhase` for the phase).
- After the change, run `bash app/scripts/claims-check.sh app/src` from the repo root.

## Option if a schedule is needed for a demo

Use clearly labeled example data only, with the banner "EXAMPLE, NOT APPROVED". Take values from a cited source, for example S1 "usually not limited for isolated MPFLR, crutches at first", and show the source disagreement next to it. The surgeon must still approve and replace the values before any patient use.
