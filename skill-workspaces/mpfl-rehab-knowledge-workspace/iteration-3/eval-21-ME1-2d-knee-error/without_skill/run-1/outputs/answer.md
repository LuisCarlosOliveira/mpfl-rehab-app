A 2D knee angle from a camera has an error of about 9 degrees in the best case. In real video it can be larger. This project has no measured error for its own setup.

**Best case (side view, still photos)**
- Okuno 2026 (Sensors 26(18):5890) tested 20 healthy adults with a tablet on a tripod at 2.0 to 2.5 m. It used the MediaPipe highest-complexity model and a goniometer as reference.
- Bias was +3.23 and -0.14 degrees. The 95 percent limits of agreement were about plus or minus 8.7 and 8.8 degrees.
- The minimal detectable change was 10.7 and 5.0 degrees.
- The setup was ideal: young healthy people, good light, a lab, still photos.

**Worse cases**
- Knee flexion in exercise video, 2D: mean absolute error of 9.3 to 21.9 degrees across 11 models (Rode 2025).
- Squat with MoveNet in a browser: raw bias -10.6 degrees, RMSE 10.9 degrees (Iizuka 2026). After a fitted linear correction, RMSE was 3.9 degrees. The fit needs a fixed camera distance, height and angle.
- Knee extension exercise with the MediaPipe full model: individual ICC of only 0.005 to 0.68 (Das 2026).
- Reported errors in the project notes range from about 3 to 15 degrees. The 15 degree figure is UNVERIFIED.

**Front view**
- The side (sagittal) view is the usable one for knee flexion. A front view cannot measure flexion, and a 2D angle from the front shrinks.
- Absolute frontal knee angles are not valid in 2D. MediaPipe valgus had a bias of about 19 degrees in a drop landing study (Asaeda 2024). A change from a baseline can work in healthy people in a lab. Patient data and home setups are missing.

**What the app uses**
- `MARGIN_DEG = 9` in `app/src/lib/margin.ts`. It is a start value from Okuno 2026.
- It is UNVERIFIED for the `lite` model that the app uses. No study of the `lite` model for knee angles exists.
- No goniometer data and no real-video accuracy data exist for the app yet (`docs/accuracy.md`).
- The app compares a value with a clinician limit only when the difference is more than the margin. Inside the margin, the answer is "cannot tell".
- For comparison, a goniometer after knee surgery has an error of about 8 degrees (limits -7.3 to 9.0, Lenssen 2007).

**Practical meaning**
No app check can resolve a difference below about 9 to 10 degrees. Show the angle as an estimate with a margin. Do not claim clinical precision. A measured margin needs at least 30 goniometer and camera pairs for each view. This number is a PROPOSAL, not a source.
