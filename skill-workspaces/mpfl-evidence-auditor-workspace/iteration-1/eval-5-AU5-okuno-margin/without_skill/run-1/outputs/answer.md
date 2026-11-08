# Okuno 2026 (PMC13611076): knee angle limits of agreement

Source: Okuno et al., Sensors 2026;26(18):5890, https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/ (read via WebFetch, Table 3).

## The claim is correct, with a narrow scope
The figure is real. For MediaPipe the 95% limits of agreement (LoA) half-width is:

| Test | Bias (95% CI) | LoA half-width | LoA range |
|---|---|---|---|
| Active knee extension test (AKET) | 3.23 deg (1.78, 4.67) | +/-8.73 deg | -5.50 to 11.96 |
| Modified Thomas test (MTT) | -0.14 deg (-1.59, 1.32) | +/-8.80 deg | -8.93 to 8.66 |

So "about 8.7" matches the AKET value only. The MTT value is 8.80. "About 9 degrees" covers both.

## Context
- Measure: knee joint angle (thigh and shank segments) from hip, knee and ankle landmarks.
- Task: two static flexibility test positions (AKET for hamstrings, MTT). It is not a moving exercise.
- Plane and camera: sagittal view. iPad Pro 11 on a tripod, 2.5 m away, at hip height for AKET. 2D still images, 4032 x 3024 px, downscaled to model input.
- Model: MediaPipe BlazePose v0.10.21, highest complexity, confidence 0.5. This is not the `lite` model.
- Reference: goniometer, one experienced physiotherapist. LoA are goniometer minus MediaPipe differences.
- Sample: 20 healthy adults (10 M, 10 F, age 24.4 +/- 2.6), 40 limbs, 4 trials per test with the first discarded (3 per limb, 120 trials per test).
- Only successful detections were analysed. MediaPipe success: AKET 113/120, MTT 117/120. The paper calls the result a best-case estimate.
- Fixed bias: significant for MediaPipe in AKET (about 3.2 deg). Not in MTT. Authors advise caution when swapping methods.
- The LoA half-width (about 9 deg) is close to the AKET minimal detectable change (MDC95, 9.8 to 10.8 deg for AI models). Smaller changes can be measurement error.

## Limitations
- Small sample, limbs from one person are not independent, no a priori power calculation for Bland-Altman.
- Young, healthy people in a controlled, well-lit lab. Limited generalisation.
- Fixed test order (AKET, MTT, WBLT). One examiner, no inter-rater check. The goniometer has its own error.
- Failed detections excluded.

## Implication for the app
Do not use 8.7 deg as a typical error for live webcam video or the `lite` model. It is a best-case figure for high-resolution still photos with the heaviest model. Treat about 9 deg as a lower bound for the error margin. The project files (research/source-audit.md C13, research/form-opus.md) reach the same conclusion: numbers exact, context narrower than the plan implies.
