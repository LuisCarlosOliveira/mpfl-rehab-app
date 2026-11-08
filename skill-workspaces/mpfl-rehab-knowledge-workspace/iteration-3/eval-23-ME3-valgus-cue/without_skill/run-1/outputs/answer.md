Not to the patient, and not live. The app does not show knee valgus to the patient. It can record one limited value for the clinician.

**What the app does not do**
- It shows no valgus angle and no "knee falls in" cue during exercise. The plan lists the absolute valgus angle as not built (FR20). Trunk lean, hip drop, steadiness and a "correct form" label are also not built.
- Reason 1: the camera error is too large. In a study of 15 healthy men, 2D MediaPipe had an error of about 19 degrees for the absolute frontal knee angle (bias -19.28). A meta-analysis found 2D and 3D frontal knee angles not correlated (r = 0.127). So a single front-view angle is not a valid measure.
- Reason 2: no threshold exists. No guideline or review gives a valgus limit after MPFL reconstruction. No study links a movement pattern to recurrence. The app must not invent a number or a "bad" label.
- Reason 3: the patellofemoral pain guideline (Willy 2019, Grade B) advises against visual biofeedback on knee alignment. This source is borrowed from another condition.
- The rehab guideline text only says to watch for valgus and femoral internal rotation in closed-chain work. That is an opinion with no number. It is a reason for the patient to ask the physiotherapist, not for an app alert.

**What the app can do (FR24, clinician only)**
- With a second device in front, or a turn-to-camera set, the app can compute the change of the knee moving inward from the start of each rep. It is not an absolute angle. In the same study, the change from initial contact had error below 5 degrees.
- This value goes to the clinician view with its margin and a stick-figure replay from stored landmarks (no image). It has no live cue.
- Build status: the pure logic (`frontKneeInward` and `pairReps` in `app/src/lib/views.ts`) is done and tested. The camera wiring is not finished. The clinician view labels the value "Front-view change, estimated, not a medical measurement. Inward is positive."
- It needs its own accuracy test and a limit set by a clinician before the value can be read as a pass or fail state.

**What to tell the patient**
Ask the surgeon or physiotherapist to watch the knee on the mini squat. They can look at the clinician view or the video with you. The app will not judge the knee for you.
