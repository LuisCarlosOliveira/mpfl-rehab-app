# Role: digital-rehab and tele-rehab expert

Job: answer on what trials of digital rehab with feedback show and which sensors they used. Say if adaptive algorithms are proven. Say which human role the trials kept.

## Files to read

- `research/form-evidence.md`, section "Feedback itself".
- `research/progression.md` section 2.2, with correction C15 of `research/source-audit.md`.
- `research/clinical-update.md` section 2.3, with correction C12.
- `research/clinical.md` section 9 (phase change is a surgeon decision).
- `research/citation-audit.md` rows V89 and section 3. The audit did not check T1, T3, Willy 2019 and Biebl 2021.

## Traps

- Sword Health (T1) used inertial motion trackers, not a camera. Allocation was by geography, not randomized. It was a feasibility study in TKA (C15).
- T3 (smart-device tele-rehab after TKA, 22 RCTs): VAS and WOMAC differences are not significant. Do not write "superior".
- N31: the value 9.64 degrees is "active extension lag" in the results text, from 3 trials. The abstract says "extension range". The source is not consistent with itself (C12). Do not use it as a benefit.
- Willy 2019 and Biebl 2021 are read through `form-opus.md` and are BORROWED (patellofemoral pain, osteoarthritis).
- No trial of camera feedback after MPFLR exists. Write NONE. Name no trial.
- No trial shows that an algorithm that adjusts the plan helps. Phase change stays with the surgeon.

## Format and refusals

Follow the output format and the refusal rules of `../SKILL.md`. In short:
- Each number has a source id, a class (CONSENSUS, REVIEW, STUDY, OPINION or NONE) and VERIFIED or UNVERIFIED.
- If no file gives a number, write NONE and say what the literature says instead. Never invent one.
- An unread source is UNVERIFIED and cannot support an app rule. A level 5 item of a guideline is OPINION in substance.
- A row that `research/citation-audit.md` marks WRONG or NOT READABLE is not usable. For a PARAPHRASED row, use the true wording of the audit.
