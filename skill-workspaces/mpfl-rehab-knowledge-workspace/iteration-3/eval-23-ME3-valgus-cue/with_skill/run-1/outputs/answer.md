PICO: Isolated MPFL reconstruction (assumed, the question does not say), adult or adolescent (not stated), no week given. Question: can the app show knee valgus to the patient as a live cue?

## Answer

No. The knowledge base gives NO BUILD for a valgus cue to the patient. Nothing in the knowledge base supports it.

The reasons are three. A phone or webcam cannot measure valgus well in 2D. No source gives a valgus limit after MPFL reconstruction. A clinician has not set a limit for the app to compare against.

The app can do two other things. It can show a plain reminder text that the guideline names, for example "watch your knee line in the mini squat", with no measured value. It can also record a front-view value for a clinician only, after the app has measured the error of its own pose model. Both items are PROPOSAL and need clinician review.

## Facts

| Fact | Exact quote or value | Source id | Evidence class | Access mark | Population |
|---|---|---|---|---|---|
| Valgus is a topic of the guideline text | "Closed-chain exercises should be closely monitored to prevent femoral internal rotation coupled with dynamic knee valgus" | S1 (`research/rehab-rules.md` section 2, mini squat row; audit row V44) | OPINION (level of evidence 5) | VERIFIED | MPFLR |
| The P2 guideline asks for control, with no valgus number | "focus on neuromuscular control of the pelvis, femur, tibia, and patella" | P2 rec 40 (2015, older than 5 years) | OPINION in substance (level 5, weak strength) | VERIFIED | Ages 8 to 25, isolated soft-tissue surgery |
| Valgus limit after MPFLR | NONE. No guideline or review gives a threshold | `research/form-evidence.md` section on check 7 and the end of the file | NONE | Not applicable | Not applicable |
| Absolute 2D valgus error with MediaPipe | Bias about 19 degrees ("error range 18.83-19.68") | F4 Asaeda 2024 (audit row V88) | STUDY | VERIFIED by the audit (the source audit lists the full text fetch as failed, the base read it earlier) | 15 healthy men, drop landing. BORROWED |
| Frontal plane in 2D | The sagittal plane is "most valid and reliable". Frontal and transverse planes are lacking | M2 (audit row V81) | REVIEW | VERIFIED (abstract) | BORROWED |
| 2D frontal knee angle against 3D in the single-leg squat | "r = 0.127, P = .094" (no correlation) | X3, JOSPT 2018;48(10):812-822 (audit M7) | REVIEW (meta-analysis) | VERIFIED (abstract only) | Healthy people. BORROWED |
| Another frontal-knee correlation | r = 0.20 against 3D | Haberkamp 2022 (F5) | STUDY | UNVERIFIED (numbers not rechecked). It cannot support an app rule | BORROWED |
| Visual biofeedback for valgus | Willy 2019 Grade B against visual biofeedback | `research/form-evidence.md` check 7 | CONSENSUS (low) | UNVERIFIED (the audit did not check it) | BORROWED |
| Best-case 2D knee angle error | About 9 degrees (sagittal plane, still photos) | F1 (correction C13) | STUDY | VERIFIED | 20 healthy adults. BORROWED |
| Video error is larger | MAE 9.3 to 21.9 degrees in 2D | F3 (correction C14) | STUDY | VERIFIED | BORROWED |
| Error of the MediaPipe `lite` model | NONE. No study exists. No study of 2D pose in patients after MPFLR exists | `research/form-evidence.md`, search E1 and E2 | NONE | Not applicable | Not applicable |

## Disagreements

No source says the app should show valgus. S1 and P2 name valgus and neuromuscular control as things to watch or train. They give no way to measure it and no limit. The sources that measure 2D valgus (F4, M2, X3) show that the value is not usable. The conservative choice is to show no valgus value to the patient.

## Ask your surgeon

- Does my surgery include a bone or cartilage procedure (for example a tibial tubercle osteotomy)? If yes, the surgeon protocol applies and not an isolated MPFLR rule.
- How deep can I squat, and what should I watch for in my knee position? The surgeon or physiotherapist sets this.
- Contact your care team if the knee gives way, locks or hurts more than before. The app does not judge this.

## Gaps

- Valgus threshold after MPFLR: NONE. The literature says only to monitor it (S1, OPINION). No limit, angle or trial exists.
- Error of the app pose model in the front view: NONE. The app must measure it first (task T13 in `research/form-evidence.md`).
- Any trial that shows camera feedback on valgus helps after MPFLR: NONE. Willy 2019 is BORROWED from other groups and UNVERIFIED here.

## Wording rule for any screen text

The app must not write a verdict word about a rep or a form. It describes what was measured against a limit that a clinician set. Any angle is "estimated angle, not a medical measurement". If a clinician view logs a front-view change, it is for research and for the clinician only.
