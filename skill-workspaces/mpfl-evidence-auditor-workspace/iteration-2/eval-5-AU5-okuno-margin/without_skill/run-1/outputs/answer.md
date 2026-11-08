The claim is correct as a number, but it needs context before the app uses it as an error margin.

Source: Okuno et al., Sensors 2026, 26(18):5890, "Reliability and Validity of AI-Based Pose Estimation Algorithms for Assessing Lower-Limb Flexibility and Joint Range of Motion", https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/. I read the full text (PMC XML through NCBI efetch; the web fetch tool was unavailable).

The number (Table 3, Bland-Altman, MediaPipe vs goniometer):
- AKET (active knee extension test): bias 3.23 (95% CI 1.78 to 4.67), LoA "±8.73" (-5.50, 11.96).
- MTT (modified Thomas test): bias -0.14 (95% CI -1.59 to 1.32), LoA "±8.80" (-8.93, 8.66).
- So "about 8.7 degrees" is the half-width of the 95% limits of agreement for the first test. The second test gives 8.8. Both are about 9 degrees. The AKET interval is not centered on zero: it runs from -5.5 to +12.0 because of the 3.2 degree bias.
- Other models in the same table: OpenPose ±10.02 and ±8.04, HRNet ±10.87 and ±10.18. Manual ImageJ was ±6.69 and ±5.92.
- Reliability: MDC95 for pose models in AKET was 9.8 to 10.8 degrees (MediaPipe about 10.7). In MTT the MediaPipe MDC95 was 5.0 degrees.

Context (what the number is and is not):
- Purpose: hamstring flexibility (AKET) and rectus femoris flexibility (MTT) tests. Not a rehab exercise, not live video, not a patient group.
- The knee angle comes from hip, knee and ankle landmarks. Reference was a goniometer, with the greater trochanter, lateral femoral epicondyle and lateral malleolus as landmarks. The reference itself has human error.
- Data were still photos: iPad Pro 11-inch (2nd gen) rear camera on a tripod, 4032 x 3024 pixels, downscaled to each model's input size. Distance 2.5 m for AKET and MTT. Camera height was knee level for MTT and hip level for AKET and WBLT. Camera perpendicular to the plane of movement. Lab at 25 C, room light, plain white wall.
- Participants: 20 healthy volunteers (10 men, 10 women), age 24.4 ± 2.6 years. 40 limbs, not independent.
- Only successful detections were analyzed. Failures (symmetry error, gross landmark error) were excluded. The authors call this "a best-case estimation". MediaPipe success was 97% in one test (the file tech.md in this project records 94% and 98% for the two knee tests).
- Limitations stated by the authors: no a priori sample size for the Bland-Altman analysis, and post-hoc power was insufficient. Well-lit indoor space only. Young healthy sample, so results may not hold for older adults, children or people with musculoskeletal problems. Test order was not randomized. One rater only.
- Authors' conclusion: AI-derived values should not replace conventional reference values or cutoffs. They call for AI-specific reference values.

What this means for the MPFL app:
- The value is a best case: still photos, high resolution, good light, side view, healthy young adults. A live webcam with a lighter model, an operated knee with swelling or a brace, and a home room will likely be worse. Other project notes cite 10 to 15 degrees for video.
- Do not use 8.7 as a fixed margin. Use it only as a start value, and replace it with an error measured for the app's own setup (the project notes already propose this).
- Use about 9 degrees only for the condition tested: side view, whole leg in frame, about 2.5 m, camera perpendicular to the movement.
- MDC95 of about 10 degrees means a change smaller than this between two measurements is not reliably detectable in the AKET test.
- Wording check: "limits of agreement about 8.7 degrees" should read "plus or minus 8.7 degrees (95% LoA half-width), with a bias of +3.2 degrees, in healthy adults, still photos".
