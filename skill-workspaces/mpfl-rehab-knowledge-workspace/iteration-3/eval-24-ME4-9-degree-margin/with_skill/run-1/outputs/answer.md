PICO: not stated. This answer covers the app's 2D knee angle from a webcam, side view, in people after isolated MPFL reconstruction at any week. No study of MPFLR patients exists (NONE), so all values are BORROWED from healthy adults or other knee groups.

## Answer

No. The 9 degree margin is not a typical webcam error. It is a best-case lower bound. A real webcam video can have an error of 10 to 22 degrees. The app uses 9 degrees only as a start value (working margin). The app must replace it with a value that it measures for its own model (task T13).

## Facts

| Fact | Exact quote | Source | Class | Mark | Population |
|---|---|---|---|---|---|
| Where 9 degrees comes from: still photos, best case | bias "3.23" and "−0.14" degrees, LoA "±8.73" and "±8.80" | F1 Okuno 2026 (Sensors 2026;26(18):5890), `research/form-evidence.md` error budget, `research/source-audit.md` C13 | STUDY | VERIFIED (full text) | 20 healthy adults, 4032 x 3024 still photos, MediaPipe highest complexity, two static test positions. Not a moving exercise. Not the `lite` model |
| The audit limits the use of F1 | "Keep 9 degrees as a lower bound of the error, not a typical value for a webcam video" | `research/source-audit.md` C13 | audit correction | VERIFIED | Same as above |
| Video error is larger | MAE "9.3-21.9°" in 2D across 11 models. "monocular HPE is not accurate enough to achieve clinically relevant measurements in its current state" | F3 Rode 2025 (Sci Rep 2025;15:38767), `research/rehab-rules.md` section 9, `research/source-audit.md` C14 | STUDY | VERIFIED (full text) | 25 healthy adults, Vicon reference, exercise video. The paper also says some 2D models reach accuracy "comparable to or better than visual inspection" |
| A knee extension exercise gives poor agreement | individual ICC "0.005-0.68" | M7 Das 2026, `research/rehab-rules.md` section 9 | STUDY | VERIFIED (abstract) | 14 healthy staff, MediaPipe full model, 14-camera motion capture |
| Some systems show smaller errors | knee RMSE "2.8°" (X4). Mean difference "-3.50°" for flexion (X2). LoA within ±10° for peak flexion, extension and range (X1) | `research/citation-audit.md` section 5, row M8 | STUDY (small samples) | abstracts only | 12 healthy (X4), 26 healthy (X2), 15 knee OA patients (X1) |
| Reviews show a wide spread | SEM "below 5°" for most variables. Validity differences "0.2° to 28.6°" (M4) | M4 Yoma 2025, `research/form-evidence.md` | REVIEW | VERIFIED (abstract) | 53 studies, squat, landing and running |
| The reference tool also has error | active extension LoA "-7.3 – 9.0" degrees. "differences in RoM of less than eight degrees cannot be distinguished from measurement error" | F9 Lenssen 2007, `research/rehab-rules.md` section 9 | STUDY | VERIFIED | 30 TKA patients. BORROWED |
| The `lite` model of the plan | NONE. No study found | `research/form-evidence.md`, search E1 and E2 in `research/search-log.md` | NONE | not applicable | Not applicable |

## Disagreements

The values differ by system and setup. Small samples give errors of about 3 degrees (X2, X4). One review of 2D gait gives "MAE < 5.2°" (M5, OpenPose, gait). Exercise video gives 9.3 to 21.9 degrees (F3). Still photos give about 9 degrees LoA (F1). I do not average them. The conservative value for a patient safety margin is the larger one. The knowledge base keeps 9 to 10 degrees as the working margin, and a difference smaller than about 9 to 10 degrees is treated as not measurable (`research/rehab-rules.md` section 9). Because video can be worse, 9 degrees is the lowest margin the app can use, not an average.

## What this means for the app

- Use only the sagittal knee angle in a side view as a number. Frontal plane angles are not valid in 2D (M2). Valgus bias is about 19 degrees (F4). Valgus is NO BUILD as a cue.
- Write "estimated angle, not a medical measurement". Do not write "accurate" or "validated".
- Any margin value that the team picks before T13 is a PROPOSAL and needs clinician review.

## Ask your surgeon

Clinician limits for the knee angle (ceiling, target, arc) come from the surgeon, not from the app.

## Gaps

- NONE: no study of the MediaPipe `lite` model for knee angles. The literature gives the F3 range (9.3 to 21.9 degrees) for other 2D models.
- NONE: no study of any 2D pose system in patients after MPFLR or any knee ligament surgery. The literature gives only healthy adults, knee OA and TKA groups.
- Most pose sources are from 2024 to 2026. None is older than 5 years except F9 (2007), a goniometer study.
