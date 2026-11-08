# Error of a 2D knee angle

PICO: no surgery type, age or week is given. The answer covers a 2D camera knee angle in general (healthy people, mostly). No study covers people after MPFL reconstruction (isolated or combined).

## Answer

A 2D knee angle from a camera has an error of about 9 degrees in the best case. In real video the error can be 10 to 22 degrees. No study covers the MediaPipe `lite` model, and no study covers patients after MPFLR. Both are NONE. The app value is an estimated angle, not a medical measurement. The error depends on the system and the setup. Use only the sagittal (side view) knee angle as a number.

## Facts

| Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Best case, still photos: bias 3.23 and -0.14 degrees, LoA +/-8.73 and +/-8.80, MDC95 10.7 and 5.0 | "3.23", "−0.14", "±8.73", "±8.80", "10.7" | F1 Okuno 2026 (PMC13611076). `form-evidence.md` error budget, `rehab-rules.md` section 9, correction C13 | STUDY | VERIFIED (full text, citation-audit V85) | 20 healthy adults, 4032 x 3024 still photos, MediaPipe highest complexity, two static positions. Not a moving exercise, not `lite`. Lower bound of error, not a typical value |
| Knee flexion in exercise video, 2D: MAE 9.3 to 21.9 degrees across 11 models | "9.3-21.9°"; "not accurate enough to achieve clinically relevant measurements in its current state" | F3 Rode 2025 (PMC12589393). Correction C14 | STUDY | VERIFIED (full text, V84) | 25 healthy, Vicon. The paper also says some 2D models are "comparable to or better than visual inspection" |
| Knee extension exercise, MediaPipe full model: ICC 0.005 to 0.68 | "0.005-0.68" | M7 Das 2026 | STUDY | VERIFIED (abstract, V86) | 14 healthy staff, 14-camera motion capture. Wide confidence intervals |
| Squat, landing, running kinematics: SEM below 5 degrees for most variables. Validity differences 0.2 to 28.6 degrees | "below 5°", "0.2° to 28.6°" | M4 Yoma 2025 | REVIEW | VERIFIED (abstract, V82) | 53 studies, mostly healthy |
| Sagittal hip and knee in gait are the most valid planes. Frontal and transverse lack valid outcomes | "most valid and reliable" | M2 Scataglini 2024 | REVIEW | VERIFIED (abstract, V81) | 22 papers, gait |
| Some sagittal knee systems show smaller error: LoA within +/-10 degrees (X1), mean difference -3.50 degrees (X2), knee RMSE 2.8 degrees (X4) | abstract values | X1, X2, X4 (citation-audit M8) | STUDY | UNVERIFIED for app use (abstracts only) | 15 knee OA patients (X1), 26 healthy (X2), 12 healthy (X4). The 9 to 10 degree value is a working margin, not a constant |
| Frontal plane (valgus): absolute bias about 19 degrees ("error range 18.83-19.68°") | as quoted | F4 Asaeda 2024 (PMC11399566) | STUDY | VERIFIED (V88) | 15 healthy men, drop landing |
| Frontal knee angle in 2D versus 3D in single-leg squat: no correlation | "r = 0.127, P = .094" | X3, JOSPT 2018;48(10):812-822 | REVIEW (meta-analysis) | VERIFIED (abstract; citation-audit M7) | Healthy |
| Reference tool: a goniometer after knee surgery has an error of about 8 degrees | "differences in RoM of less than eight degrees cannot be distinguished from measurement error"; active extension LoA "-7.3 – 9.0" | F9 Lenssen 2007 (PMC2040146) | STUDY | VERIFIED (V87) | 30 TKA patients. BORROWED (not MPFLR) |

## What this means

- A difference smaller than about 9 to 10 degrees is not measurable with a 2D camera.
- Frontal plane (valgus) angles are not valid in 2D. Verdict for a valgus cue: NO BUILD.
- A 10 degree extension lag limit (P2, level 5, so OPINION in substance) sits inside the error. Verdict: LOG the top angle, give no lag cue.
- A side-view knee bend ceiling or target can be a cue only with a clinician limit, and only when the miss is larger than the margin (`form-evidence.md` checks 1, 2 and 6).
- P2 flexion targets (90 degrees at 4 weeks, 120 degrees at 6 weeks) are passive range (PROM). A camera measures active motion, which is usually less. Do not compare the two (citation-audit M3).

## Disagreements

- Best case about 9 degrees (F1, still photos) against 9.3 to 21.9 degrees in video (F3) against 2.8 to 3.5 degrees in small samples (X2, X4, abstracts). The conservative value is the large one: 10 to 22 degrees for video until the app measures its own model.

## Ask your surgeon or clinician

- Which limit or target (if any) the app can compare with a camera angle for your protocol. A clinician sets the number.
- Do not use the camera angle in place of a clinician measurement.

## Gaps

- NONE: the MediaPipe `lite` model has no study. The literature gives only other MediaPipe settings (F1 highest complexity, M7 full model).
- NONE: no study of 2D pose estimation in patients after MPFLR or any knee ligament surgery. The literature gives healthy adults (F1, F3, M7), knee OA patients (X1, abstract) and TKA goniometry (F9, BORROWED).
- NONE: no source links a live camera cue to fewer complications or better outcome after knee surgery.
- The app must measure the error of its own model (task T13) before it acts on any 2D difference.
