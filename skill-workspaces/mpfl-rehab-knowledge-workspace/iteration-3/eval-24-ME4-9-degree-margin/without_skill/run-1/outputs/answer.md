No. The 9 degree margin is not a typical webcam error. It is a best-case lower bound, and the app uses it only as a start value.

Where the 9 degrees comes from:
- Okuno 2026 (F1) measured a sagittal knee angle on still photos. The limits of agreement were about plus or minus 8.7 to 8.8 degrees (bias 3.23 and -0.14). The test used 20 healthy people, 4032 x 3024 pixel photos, the highest MediaPipe model and two static positions (`research/form-evidence.md`).
- That is a best case: still images, a high-resolution camera, the best model and healthy people.

What real use looks like:
- Rode 2025 (F3) tested knee flexion on exercise video with 11 models in 2D. The mean absolute error was 9.3 to 21.9 degrees (25 healthy people, Vicon reference). So 9 degrees is the lowest value of that range. Video can be worse.
- Okuno 2026 does not support 9 degrees for moving webcam video. Another study (M7) found poor to fair agreement (ICC 0.005 to 0.68) for a knee extension exercise (`research/search-log.md`).
- A reported RMSE of about 15.49 degrees also exists (`research/tech.md`).
- Frontal plane angles are worse. The absolute valgus bias is about 19 degrees (Asaeda 2024, F4), so frontal 2D is not valid.
- No study checks a webcam against a goniometer after MPFL surgery. The `lite` model is not tested (gap 10, task T13).

How the app treats the number:
- The margin is a start value (`MARGIN_DEG`), UNVERIFIED for the `lite` model (`docs/clinical-limits.md`, `research/progression.md`).
- The app must not call it a "typical error" or say the angle is "accurate" or "validated". It says "estimated angle, not a medical measurement".
- A result inside the margin reads "cannot tell". The rule is "more than the margin". Real error can be larger than 9 degrees, so a check near a limit is weak. A 10 degree extension lag threshold, for example, sits inside the error.
- Practical meaning: no app check can resolve a difference below about 9 to 10 degrees. For a clinician, the margin is a floor, and real video error can be up to about 22 degrees.
- The margin is stored in the session record (`marginDeg`, `marginSource`), so it can be changed when the project has its own validation test.

Sources: `research/form-evidence.md`, `research/specialists-brief.md` (answer ME-4, correction C13), `research/search-log.md`, `research/tech.md`, `research/progression.md`, `docs/clinical-limits.md`.
