# Audit: Okuno 2026 (PMC13611076), limits of agreement of about 8.7 degrees

## 1. Verdict

Claim: "The 2D knee angle has limits of agreement of about 8.7 degrees."

Verdict: VERIFIED-FULL for the paper and the context, with one number gap. I opened https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/ in this run. A second read to get the exact MediaPipe table cells failed (tool rate limit). So the exact values ±8.73 and ±8.80 come from the repo files (`research/form-opus.md` line 93, `research/form-evidence.md` line 17). They are second-hand in this run. The paper range that I did read is "±8.04–10.87", which holds the value 8.7. Re-open the results table to close the gap.

The claim is true only in a narrow context. It is not a typical error for webcam video.

## 2. What I read in the paper

- Reference: Okuno H, Ishida T, Koshino Y, Kasahara S, Tohyama H, Samukawa M. Reliability and Validity of AI-Based Pose Estimation Algorithms for Assessing Lower-Limb Flexibility and Joint Range of Motion. Sensors (Basel) 2026;26(18):5890. DOI in repo: https://doi.org/10.3390/s26185890.
- Abstract limit of agreement: "The limits of agreement ranged from ±8.04–10.87 cm". The unit "cm" is a printing error in the abstract. The tables and text use degrees.
- Discussion: for the active knee extension test (AKET) the half-widths were about 10 degrees. For the modified Thomas test (MTT) the AI half-widths were about 8 to 10 degrees.
- Bias (AKET): small fixed biases of 1.9 to 3.2 degrees for ImageJ, MediaPipe and OpenPose.
- MDC95: 9.8 to 10.8 degrees for the pose models in AKET. MediaPipe in MTT: 5.0 degrees. Goniometer 4.5 degrees.
- The paper tells clinicians to consider the measurement error, "particularly the MDC95 for the AKET".

Values from the repo files, not re-read in this run: MediaPipe bias 3.23 and -0.14 degrees, LoA ±8.73 and ±8.80, MDC95 10.7 and 5.0. They fit inside the ranges that I read.

## 3. Context (the claim needs all of it)

- Tests: two static flexibility test positions, AKET (hamstring) and MTT (rectus femoris). The third test (weight-bearing lunge, ankle) is not a knee angle. The two values 8.73 and 8.80 are one for each test, not one pooled value.
- Images: still photos, not video. iPad Pro 11-inch rear camera on a tripod, 4032 x 3024 pixels. Camera perpendicular to the movement plane, 2.5 m away, at hip level (AKET) or knee level (MTT).
- Model: MediaPipe 0.10.21 (BlazePose) at the highest complexity, confidence threshold 0.5. It is not the `lite` model.
- Participants: 20 healthy adults (10 male, 10 female, 40 limbs), age 24.4 ± 2.6 years. No knee surgery population. Population mark: BORROWED for MPFL patients.
- Reference: clinician goniometer with three landmarks. One examiner. No inter-rater check.
- Design: agreement study (Bland-Altman) in a controlled, well-lit indoor lab.

## 4. Limits that the paper states

- Small sample: 40 limbs from 20 people, not independent. Post-hoc power was not enough.
- Only successful detections were analyzed. So the numbers are best case.
- Young healthy sample, lab conditions. Poor generalization.
- Fixed test order. One examiner.
- The pose values are not interchangeable with goniometer values. There was fixed bias.

## 5. Row for the knowledge base

| Field | Value |
|---|---|
| Id proposal | none. The row exists as F1 |
| Reference | Okuno 2026, Sensors 26(18):5890 |
| URL opened | https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/ |
| Access mark | VERIFIED (full text) for context and ranges. Exact MediaPipe cells ±8.73 and ±8.80 are second-hand in this run |
| Quote | "The limits of agreement ranged from ±8.04–10.87 cm" (abstract, unit error in source) |
| Design | Agreement study, 20 healthy adults, 40 limbs, still photos |
| Population | Healthy adults (BORROWED) |
| Evidence class | STUDY |

## 6. Placement and conflicts

- Place: no new row. F1 is in `research/source-audit.md` correction C13 and in `research/form-evidence.md` (best-case row) and `research/form-opus.md` (section 2.3). Do not make a second copy.
- Existing rows agree with the paper. Correction C13 already limits the context. Keep it.
- Related, not a conflict: Rode 2025 (F3) gives knee flexion MAE "9.3-21.9°" in 2D across 11 models. Janisch 2026 gives BlazePose LoA -8.76 to 7.42 degrees for frontal knee deviation. Keep all values. The margin start value of 9 degrees is a lower bound, not a typical value for moving webcam video.

## 7. Not opened or not re-read

- The exact table cells for MediaPipe (second read failed). Values come from the repo.
- F3 (Rode 2025) and Janisch 2026 were not opened in this run.
