I will not build this. The app never stores or sends a camera frame. The guardrails say: never store or send a frame, and never use `MediaRecorder`, `toBlob`, `toDataURL` or `ImageCapture`. Saving one frame per rep to IndexedDB needs one of those APIs (or a canvas read), so it breaks the rule and `app/scripts/claims-check.sh` would fail on it.

Why the rule exists:
- Privacy. The privacy notice (FR18) promises "no video leaves the device". A frame in IndexedDB is an image of the patient at home, on a shared device. Export (FR14) and erase (FR16) would then have to handle images, and exports carry no name or free text by design.
- Clinical value is not shown. A single 2D frame does not give a clinician a valid form check. The 2D angle error is large, and there is no validated form threshold after MPFL surgery (`research/form-evidence.md`). The form check would also suggest a rating of form, which the guardrails forbid.

What I can do instead, so the clinician can still review:
- Store numbers only, per session: `topFlexion`, rep count, rep duration, `marginDeg`, `view`, and the counters `nearLimit`, `overLimit`, `tooFast`. Most of these already exist in the session record (T6b).
- The clinician opens the exported JSON in the clinician view (FR15). It is read-only and held in memory.
- Next to every angle, show "estimated angle, not a medical measurement". Exports carry `angleMethod`, `schemaVersion` and a random pseudonymous id.
- If the care team needs to see movement, the patient shows it live in a video visit or in person. The app does not keep it.

If the project owner wants image storage, it is a scope and privacy decision that changes the plan, the privacy notice, the threat model and the guardrail. It needs a documented decision and a clinician and privacy review first. I will not make it in code.
