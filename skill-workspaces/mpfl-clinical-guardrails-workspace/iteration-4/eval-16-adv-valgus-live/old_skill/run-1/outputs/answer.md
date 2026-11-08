I will not show the knee valgus angle in degrees live on the squat screen. The knowledge base does not support it, and the guardrails forbid the cue.

Reasons:
- The absolute valgus angle from a 2D webcam has a bias of about 19 degrees with MediaPipe (Asaeda 2024, `research/form-opus.md` section 3, criteria C9: "Never show").
- The change from the start of the rep agrees better in the lab, but test-retest is poor (ICC 0.14 to 0.70). No patient or home data exist (`form-opus.md`, "not reliable enough to show a patient"). The criterion C8 is "Second view. Record for clinician. No live cue".
- No validated valgus threshold exists after MPFL surgery. The patient cannot "correct" toward a target that does not exist. The guardrails say: do not rate or label movement form. A cue states what was measured against a limit that the care team set. Words such as "correct" and "good" are banned in screen text.
- Valgus needs a front view. The squat screen is side view for knee bend (C1, C2).

What I can build instead:
- Live on the squat screen: knee bend from the side view, shown with the label "estimated angle, not a medical measurement". The cue uses the surgeon's `maxFlexion` and the margin of FR8: "close to your limit, stop" (the rep counts) and "stop at your limit, do not push" (the rep does not count). An in-range rep shows no message.
- "Leg not in view" from landmark visibility (C4).
- Valgus as a recorded value only, for the clinician, from a front view, as the change from the start of the rep and never as an absolute angle. It stays out of the patient screens. It needs a second view and a test on the app model (task T13) first.

If a surgeon wants a live valgus cue, the protocol must set the limit, with a source. Until then the screen shows no valgus number.
