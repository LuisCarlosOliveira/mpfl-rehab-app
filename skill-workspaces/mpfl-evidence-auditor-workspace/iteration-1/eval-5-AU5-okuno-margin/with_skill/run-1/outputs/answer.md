# Audit: Okuno 2026, claim "2D knee angle limits of agreement about 8.7 degrees"

## 1. Verdict

Claim: the 2D knee angle has limits of agreement of about 8.7 degrees.

Verdict: VERIFIED-FULL for the number. The context is narrower than the claim. The number is a best-case value, not a typical value.

- The number 8.73 is in Table 3 for MediaPipe in the Active Knee Extension Test (AKET): "MediaPipe 3.23 (1.78, 4.67) ±8.73 (−5.50, 11.96) 0.99". It is a half-width of the limits of agreement. The bias is 3.23 degrees.
- The Modified Thomas Test (MTT) gives a similar value for MediaPipe: "MediaPipe −0.14 (−1.59, 1.32) ±8.80 (−8.93, 8.66) 0.48". The knowledge base uses both values (±8.73 and ±8.80).
- The real limits for the AKET are −5.50 and 11.96 degrees. Because of the bias, they are not symmetric. The full width is about 17.5 degrees. "About 8.7" is the half-width only.
- The Discussion says: "The half-widths of the LOA were approximately 10°" (AKET, all AI models). For the MTT it says: "The LOA half-widths in the AI-based methods were approximately 8–10°". The authors call the limits "relatively wide".
- Source problem: the abstract writes the limits in cm ("±8.04–10.87 cm for the AKET and MTT"). The Results and Discussion use degrees. The unit "cm" in the abstract looks like an error of the paper. Use the degree value from the text and the table.

Access note: I read the PMC full text page through WebFetch. The tool returns an extract, not the raw page. Quotes above are short fragments that the tool returned. Table 3 has no units column. A raw-text check of Table 3 by a person is still advised, but the same numbers match the earlier audit (see section 4).

## 2. Context (what the number means)

- Reference: Okuno H, Ishida T, Koshino Y, Kasahara S, Tohyama H, Samukawa M. "Reliability and Validity of AI-Based Pose Estimation Algorithms for Assessing Lower-Limb Flexibility and Joint Range of Motion". Sensors (Basel) 2026;26(18):5890.
- Design: reliability and concurrent-validity study, 20 healthy volunteers (40 lower limbs), age 24.4 ± 2.6 years. Limbs are not independent.
- Reference method: a goniometer, measured by one physiotherapist. The text says goniometer knee angles "were used as reference measurements". Landmarks: greater trochanter, lateral femoral epicondyle, lateral malleolus. No 3D motion capture was used.
- Images: "standard two-dimensional RGB still images", 4032 x 3024 pixels, then "downscaled to each model's default input resolution".
- Model: "MediaPipe (v0.10.21; BlazePose) ... configured to the highest complexity setting". This is not the `lite` model of the app plan.
- Camera: 2.5 m from the participant for the AKET and the MTT. The camera was perpendicular to the participant and parallel to the plane of movement.
- Movements: two static end-range flexibility test positions (AKET and MTT). No dynamic movement, no video and no exercise was assessed. The only exercise was a warm-up on an ergometer, and it was not analysed.
- Limitations that the authors state: only trials with successful detection were analysed (the authors call this a best-case estimate, so error can be understated). No power calculation for the Bland-Altman analysis, and a post-hoc check found the power not sufficient. One examiner, no inter-rater check. Young, healthy sample. Lab with good light. Fixed test order.
- The authors advise caution about using AI methods and conventional methods in place of each other.
- Population for the app: healthy adults. This is BORROWED for MPFL reconstruction patients. No study of this kind exists in patients after MPFL reconstruction (see `research/form-evidence.md`, section "Gaps").

## 3. Row for the knowledge base

This row already exists as F1. Do not add a second copy. Proposed wording for the existing F1 row only if it needs a context note:

| Field | Content |
|---|---|
| Id | F1 (existing) |
| Reference | Okuno H et al. Sensors 2026;26(18):5890 |
| URL opened | https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/ |
| Access mark | VERIFIED (full text page, read through WebFetch extract) |
| Exact quote | "MediaPipe 3.23 (1.78, 4.67) ±8.73 (−5.50, 11.96) 0.99" (AKET). "MediaPipe −0.14 (−1.59, 1.32) ±8.80 (−8.93, 8.66) 0.48" (MTT). "The half-widths of the LOA were approximately 10°" |
| Design | Reliability and concurrent-validity study, 20 healthy adults, 40 limbs, two static test positions, still photos, goniometer reference |
| Population | BORROWED (healthy adults, not MPFLR) |
| Evidence class | STUDY |

## 4. Where the row belongs and conflicts

- File and section: `research/form-evidence.md`, section "The error budget of a 2D camera", first row (F1). The correction C13 in `research/source-audit.md` already states the narrower context. The independent check V85 in `research/citation-audit.md` marks the numbers EXACT. My reading agrees with C13 and V85. No new row is needed.
- No conflict in the numbers. The values 3.23, −0.14, 8.73 and 8.80 match the knowledge base.
- Context conflicts with other rows (keep both values):
  - F3 Rode 2025: knee flexion MAE "9.3-21.9°" in 2D video across 11 models. The error in moving video is larger than the Okuno best case.
  - F9 Lenssen 2007: the goniometer reference itself has LoA "-7.3 – 9.0" degrees after knee surgery. The Okuno reference is also a goniometer, so reference error is part of the 8.7 degrees.
  - `research/citation-audit.md` M8: X1 (LoA within ±10 degrees in knee OA patients), X2 (mean difference −3.50 degrees) and X4 (RMSE 2.8 degrees) show that error depends on system and setup. The 9 degree value is a working margin, not a constant.
- Wording in the knowledge base to check: the margin start value of 9 degrees (`form-opus.md` section 2.3 and `MPFL_APP_PLAN.md`) must read "lower bound of the error for a best case", as C13 says. It is not a typical value for a webcam video.

## 5. What this means for the margin rule

- Treat about 8.7 degrees as a lower bound of the half-width error. The error in the app (`lite` model, live video, side view, patients) can be larger.
- A difference smaller than about 9 to 10 degrees cannot be told from error. The app must not act on it. The app must measure the error of its own model before it relies on any margin.
- The app does not call the webcam angle a measurement. A clinician sets the limit. This is not treatment advice.

## 6. Sources not opened

- None of the sources cited in the conflicts list were reopened by me in this audit. F3, F9 and X1 to X4 are cited from `research/source-audit.md` and `research/citation-audit.md`. They are SECOND-HAND in this answer.
- The raw HTML or PDF of the Okuno paper was not read. I used the WebFetch extract only.

Style check (`ste-check.py`) was not run. I have no Bash tool in this audit. Quotes and table text stay exact, and they may hold long sentences or banned modals.
