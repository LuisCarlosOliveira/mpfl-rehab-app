# Which checks can be a patient cue?

**PICO:** Isolated MPFL reconstruction (the case that the answer covers). Age group not stated. Weeks since surgery not stated. Question: which live form checks of the app can show a message to the patient. A combined surgery (TTO, trochleoplasty, cartilage) needs a surgeon protocol. This answer does not cover it.

## Answer

Four checks can be a patient cue, and one more is a cue only as a safety floor. Each of them needs a limit that a clinician sets for this patient. The other checks are log-only or not built.

Rule for a CUE (`research/form-evidence.md`, verdict scale): all three conditions must hold.
1. A clinician sets the limit for this patient.
2. A guideline or a review supports the clinical meaning.
3. The 2D error is smaller than the distance that the cue must detect.

## Checks that can be a CUE

| Check | Condition | Source | Class | Mark |
|---|---|---|---|---|
| 1. Knee bend above the clinician ceiling, side view (heel slide, mini squat) | Clinician ceiling only. Use the margin rule. The text states the limit and gives no verdict | `form-evidence.md` check 1. Literature range of 90 degrees at 4 weeks: P1, P2 | OPINION (P2 items are level 5) | VERIFIED quotes (audit V11, V12). BORROWED for the squat range 0 to 50 degrees (S16, healthy people) |
| 2. Peak bend below the clinician target, side view (heel slide) | Plain statement such as "below your target". Only when the miss is larger than the margin. A trend over sessions goes to LOG and to "contact your care team" | `form-evidence.md` check 2. P2: "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation" and "Achieve ≥ 120º by 6 weeks post- operation" | OPINION | VERIFIED (V11). The target is passive range (PROM). A camera sees active motion. Do not compare them directly (audit M3) |
| 3. Seated hold: knee straighter than the allowed arc end | Clinician arc only. This check is new. The current seated hold asks "Straighten your knee" (`app/src/lib/guides.ts` line 54), which conflicts with P2 rec 29 and P1 phase 1 | P2 rec 29: avoid "knee extension from 30° to 0°". P1: "Do not perform AROM open chain KE". Arcs: 90 to 30 (P2, a Note, "It may be helpful"), 90 to 40 (P1), 90 to 45 (AS1, BORROWED from ACL) | OPINION | VERIFIED (V45, V46, V47, V90). P3 allows open-chain work from week 2 with no arc, so the rule is not general agreement (audit M2) |
| 4. Rep shorter than the minimum rep time | Clinician value only. Without it, LOG | `rehab-rules.md` section 3: no tempo source | NONE | Not applicable. Frame time is about 33 to 67 ms. Rep detection was not validated in a study that was found |
| 5. Leg not in view | Setup message, not a clinical message | Engineering rule (`form-opus.md` C4) | Not applicable | Not applicable |

A sixth item, pain entry between sets (check 12), can be a cue only as the app safety floor or as a clinician value. It is not an evidence-based default. P2 gives a goal of "≤ 2out of 10 on NRS" during walking. The audit says this is a phase goal and not a stop rule (section 4.4). No MPFLR stop value exists.

## Checks that are not a patient cue

| Check | Verdict | Reason |
|---|---|---|
| Extension lag at the top of the SLR | LOG the top angle as a number | P2 gives "less than or equal to 10 degrees of extensor lag". It is level 5. The 10 degree value is inside the 2D error (about 9 degrees best case, goniometer about 8 degrees). Give no lag cue |
| Movement symmetry (operated knee against the other knee) | LOG | Write "movement symmetry". Never write "LSI". The thresholds (95 percent, 75 percent) are goniometer values. Each side carries the error |
| Trunk forward lean | LOG only, after the app measures its own error | No MPFLR source |
| Knee valgus in a front view | NO BUILD as a cue | Absolute bias about 19 degrees (F4). Frontal 2D is not valid (M2). A meta-analysis found no correlation with 3D in the single-leg squat (X3, "r = 0.127, P = .094"). No MPFLR threshold |
| Steadiness (angle spread in a hold) | NO BUILD | No source. Replay noise 0.9 to 2.1 degrees is INFERRED. SEM up to 5 degrees (M4) |
| Hip rise | NO BUILD | No source |
| Any form score | Not supported | No source |

## Error budget behind these verdicts

| Fact | Value | Source | Class | Mark | Population |
|---|---|---|---|---|---|
| Sagittal knee angle, best case | Bias "3.23" and "−0.14", LoA "±8.73" and "±8.80" degrees | F1 (Okuno 2026) | STUDY | VERIFIED. Context is narrow: two static positions, still photos, highest model complexity (correction C13) | 20 healthy adults, BORROWED |
| Knee flexion in exercise video | MAE "9.3-21.9°" in 2D | F3 (Rode 2025) | STUDY | VERIFIED (correction C14) | 25 healthy, BORROWED |
| Goniometer after knee surgery | Active extension LoA "-7.3 – 9.0" degrees | F9 (Lenssen 2007) | STUDY | VERIFIED | 30 TKA patients, BORROWED |
| MediaPipe `lite` model | NONE | Search E1, E2 | NONE | Not applicable | Not applicable |

The 9 degree value is a lower bound and a working margin. It is not a typical webcam error. The app must measure the error of its own model. No check can resolve a difference below about 9 to 10 degrees.

## Disagreements

- Open-chain arc: P2 says avoid 30 to 0 degrees. P1 restricts through phase 2 unless the surgeon clears it. P3 allows open-chain quadriceps work from 2 weeks with no arc. S1 uses both open and closed chain. The conservative value is the P1 and P2 restriction. Use it as the default and let the clinician change it.
- Flexion: P2 and P1 give 90 degrees by 4 weeks. N3 (2024) gives "Passive knee flexion of >125°" in weeks 0 to 6. R3 gives 90 degrees at a mean of 1.4 weeks. The conservative value for a ceiling is the surgeon limit. The numbers are not a ceiling (audit section 4.5).

## Evidence for feedback itself

- P2 rec 30: "visual, tactile and verbal feedback cues are provided as needed to ensure optimal performance". CONSENSUS in label, OPINION in substance (level 5). It describes a therapist, not a camera.
- No trial shows that live camera cues improve outcome or safety after knee surgery. Camera feedback agreed with physiotherapists at kappa 0.551 and 0.626 (Biebl 2021, BORROWED from knee and hip osteoarthritis, second-hand in `form-opus.md`). A camera cue is an app behavior that needs clinician approval. It is not an evidence-based treatment.

## Ask your surgeon

- What knee bend ceiling and target apply to me, and until which week?
- Is open-chain knee extension allowed for me, and in which arc?
- Which minimum rep time applies to me?
- Was a bone or cartilage procedure done with my MPFL surgery? If yes, a surgeon protocol is required.

## Gaps

- MediaPipe `lite` knee angle error: NONE. The literature gives errors for other models and for healthy people only.
- 2D pose in patients after MPFLR or any knee ligament surgery: NONE.
- A link from a live camera cue to fewer complications or better outcome: NONE.
- A tempo, steadiness or valgus threshold for MPFLR: NONE in any guideline or review.
- Evidence strength: almost all guideline items (P2, P1, P3, S1) are OPINION in substance. P2 dates from 2015, which is older than 5 years, and the audit found no revision.
- All wording for cues: "estimated angle, not a medical measurement". The app never changes the phase and gives no verdict word about a rep.
