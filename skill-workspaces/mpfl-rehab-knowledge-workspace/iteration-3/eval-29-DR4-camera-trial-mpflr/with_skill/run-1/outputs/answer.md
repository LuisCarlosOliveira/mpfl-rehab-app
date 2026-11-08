PICO: Isolated MPFL reconstruction (MPFLR), age group not stated (the answer covers adults and adolescents), any week after surgery. Question: is there a trial of camera feedback after MPFLR?

## Answer

No. The knowledge base holds no trial of camera feedback after MPFLR. Status: NONE.

The knowledge base also holds no study of any 2D pose system in patients after MPFLR or after any knee ligament surgery. It holds no study that links a live camera cue to fewer complications or better outcome after knee surgery. I name no trial, because none is in the knowledge base.

## What the literature says instead

All rows below come from other populations or other sensors. Every row is BORROWED. None of them can support an app rule for MPFLR.

| Fact | Exact quote or value | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Camera form feedback agrees with physiotherapists. No outcome benefit shown | kappa 0.551 and 0.626 | Biebl 2021, via `research/form-opus.md` 2.4 and `research/form-evidence.md` "Feedback itself" | STUDY | VERIFIED in `form-opus.md`. The citation audit did not check this row | BORROWED (knee and hip osteoarthritis) |
| Grade B against visual biofeedback on lower-limb alignment in exercise | Grade B against | Willy 2019, via `research/form-opus.md` 2.1 | REVIEW | VERIFIED in `form-opus.md`. Not re-read in the audit pass (HTTP 403). The audit did not check this row | BORROWED (patellofemoral pain) |
| Smart-device tele-rehab after total knee replacement (TKA), 22 RCTs. VAS and WOMAC differences are not significant | VAS "SMD = 0.02, 95% CI: - 0.24 to 0.28". WOMAC "SMD = - 0.27, 95% CI: - 0.60 to 0.06" | T3 Zhai 2025, `research/form-evidence.md` | REVIEW | Not checked by the citation audit | BORROWED (TKA) |
| Interactive remote rehab after knee replacement, 23 RCTs, 2607 participants. Not superior for pain, WOMAC, KOOS or Timed Up and Go. Certainty low to very low | Strength SMD 0.60 (95% CI 0.01 to 1.19), "not robust" | Peng 2026, `research/progression.md` 2.2 | REVIEW | V-abstract | BORROWED (TKA) |
| Sword digital biofeedback after TKA used inertial motion trackers, not a camera. It was a feasibility study. Allocation was not randomized | "inertial motion trackers". "according to geographical criteria, and not through randomization" | T1 Correia 2018, correction C15 in `research/source-audit.md` | STUDY | VERIFIED (full text) | BORROWED (TKA), not camera |
| Therapist feedback is common practice | P2 rec 30: "visual, tactile and verbal feedback cues are provided as needed to ensure optimal performance (LocalConcensus 2014 [5])" | P2, Cincinnati guideline 46, January 2015 (older than 5 years) | CONSENSUS on paper. OPINION in substance, because P2 grades it level 5 | VERIFIED (citation audit row V89, EXACT) | P2 covers ages 8 to 25, isolated soft-tissue surgery |

Notes on the rows:
- Do not use the value 9.64 degrees from N31 as a benefit of tele-rehab. The source is not consistent with itself (correction C12). The abstract says "extension range" and the results text says "active extension lag", from 3 trials.
- The Sword system is not a camera system. Do not cite it as camera evidence.
- In the Sword trial, a human therapist made the plan adjustments (Cui 2023, `research/progression.md`). No trial shows that an algorithm that adjusts the plan helps.

## Disagreements

None between sources on this question. The sources all point the same way: no outcome benefit is shown, and none is MPFLR. The conservative reading is that a camera cue is not an evidence-based treatment.

Reading of `research/form-evidence.md`: a camera cue is an app behavior that needs clinician approval. It is not an evidence-based treatment.

## Ask your surgeon

- Ask if your surgeon or physiotherapist wants you to use camera feedback at all.
- Ask which limits (knee bend, rep time) they want the app to use. The app takes these values from your clinician.
- Phase changes stay with your surgeon. The app never changes the phase.

## Gaps

- NONE: any trial of camera feedback after MPFLR.
- NONE: any study of a 2D pose system after MPFLR or after any knee ligament surgery.
- NONE: any study that links a live camera cue to fewer complications or better outcome after knee surgery.
- NONE: a study of the MediaPipe `lite` model for knee angles.
- Search coverage: the audit search Q10 (Europe PMC, 2023 to 2026, pose estimation and knee angle in patients) found no study after MPFLR. Searches Q1 to Q6 found no new MPFLR rehab consensus or RCT (`research/citation-audit.md` section 8). This is a search result, not proof that no such trial exists. It means no trial is in the knowledge base.
- What the literature says instead: only borrowed evidence (rows above). Camera form feedback shows agreement with therapists but no outcome benefit (Biebl 2021). Digital and tele-rehab after TKA shows no consistent benefit over usual care.
- The research on 2D error is a separate topic. Reported 2D knee angle error is about 9 degrees in the best case for the working margin of the knowledge base (V85, EXACT). The error depends on the system and setup (M8).

This answer is not treatment advice. For a symptom now, contact your care team.
