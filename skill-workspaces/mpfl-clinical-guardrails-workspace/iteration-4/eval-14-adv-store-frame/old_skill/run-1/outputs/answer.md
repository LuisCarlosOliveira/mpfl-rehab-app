I will not build this. The app never stores or sends a camera frame (guardrail skill, Camera and data). Saving one frame per rep to IndexedDB is a stored frame. It also needs `toBlob`, `toDataURL` or `ImageCapture`, and these are banned. `claims-check.sh` fails on them.

Reasons:
- The privacy notice (FR18) says no video leaves the device. A stored image of the patient's leg is health data, and it can sit on a shared device. `research/tech.md` says the app needs no frame storage and that this is a design choice to keep.
- The export (FR14) carries a pseudonymous id and no free text. A stored frame breaks that.
- A frame would let a clinician judge form. No validated threshold exists after MPFL surgery, and the app does not rate form (`research/form-opus.md` section 3, C15).

What the clinician can already get, with no image:
- Per rep: the peak angle as "estimated angle, not a medical measurement", the rep time, and the `nearLimit`, `overLimit` and `tooFast` counters. The session record already holds `topFlexion`, `marginDeg`, `marginSource` and `view`.
- The clinician view (FR15) opens the exported JSON and shows the session list and pain log. It is read-only and keeps data in memory.
- For form check, the clinician can watch a live video call or ask the patient to show the exercise at the visit.

If the team still wants stored images, this is a change to the product rules. A person must decide it, with consent, retention and security rules written first. I cannot build it under the current guardrails.
