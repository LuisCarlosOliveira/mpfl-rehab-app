# Role: rehab protocol author

Job: give the protocol generator (`docs/protocol-generator-design.md`) the phase templates, the inputs that change them and the fields that only a surgeon can set.

## Files to read

- `research/rehab-rules.md` sections 1 (phases, ROM, weight-bearing, brace), 2 (the four exercises), 3 (dose), 5 (phase exits) and 8 (special groups).
- `research/clinical.md` section 9 (what the app leaves to the surgeon) and section 3 (disagreements).
- `research/clinical-update.md` section 3.1 (protocols).
- `research/source-audit.md`: corrections C1, C2, C4, C5, C17 and C18.
- `research/citation-audit.md`: rows V11 to V14, V37, V46, V47 and sections 3, 4 and 6.

## Questions and where the answer is

| Question | Where |
|---|---|
| Which phases and weeks can a template hold | `rehab-rules.md` section 1, "Phase names and weeks" and "Progression method" |
| Weight-bearing and brace default | `rehab-rules.md` section 1. N1 says no consensus. S10 gives practice counts |
| Which exercise in which phase | `rehab-rules.md` section 2 |
| Sets, reps, frequency, tempo | `rehab-rules.md` section 3. Frequency and tempo are NONE |
| Which inputs change the template | Combined surgery, age, bilateral, revision: `rehab-rules.md` section 8 |
| Which fields stay "ask your surgeon" | `clinical.md` section 9 |

## Traps

- Weight-bearing as tolerated is practice (S10, REVIEW). It is not a consensus (N1). Do not present it as the default.
- S1 is not consistent with itself on weight-bearing and brace (C1). Cite it for the range of practice only.
- S10 abstract and S10 table give two different brace numbers (C4). Name which one you quote.
- The seated knee extension hold to 0 degrees conflicts with P1 and P2 in phase 1. The generator does not offer it in phase 1 unless the surgeon enables it.
- P2 excludes realignment surgery. Never apply an isolated template to combined surgery.
- The audit marks V37 WRONG. P1 does not put heel slides in phase 1. In P1, heel slides start in phase 2 "once KF >120". S1 and P3 put heel slides in phase 1.
- The P2 flexion targets (90 degrees by 4 weeks, 120 degrees by 6 weeks) are passive range (PROM). A camera sees active motion. Never compare the two as one quantity.
- P1 has no explicit 90 degree cap in weeks 0 to 4. P1 says "Avoid KF ROM beyond surgeon guidelines". Other sources widen the range. P3 allows open-chain quadriceps work from 2 weeks. N3 (read in the audit) gives passive flexion of more than 125 degrees in weeks 0 to 6. It also gives mini squats of 0 to 50 degrees.
- The audit grades P2 items as OPINION in substance (level 5, "It is recommended", from 2015). Every number is a clinician-set protocol field. The app enforces only protective defaults and referrals.
- The N1 Delphi statements (early motion, full ROM by 6 weeks) are read second-hand through S10. The primary text is NOT READABLE.
- BASK 2021 (G1) was not read. It is UNVERIFIED and cannot support a rule.
- No frequency source and no tempo source exist. Write NONE.
- A flexion target is a range with sources, and the surgeon sets the value. Never give one number alone.

## Format and refusals

Follow the output format and the refusal rules of `../SKILL.md`. In short:
- Each number has a source id, a class (CONSENSUS, REVIEW, STUDY, OPINION or NONE) and VERIFIED or UNVERIFIED.
- If no file gives a number, write NONE and say what the literature says instead. Never invent one.
- An unread source is UNVERIFIED and cannot support an app rule. A level 5 item of a guideline is OPINION in substance.
- A row that `research/citation-audit.md` marks WRONG or NOT READABLE is not usable. For a PARAPHRASED row, use the true wording of the audit.
