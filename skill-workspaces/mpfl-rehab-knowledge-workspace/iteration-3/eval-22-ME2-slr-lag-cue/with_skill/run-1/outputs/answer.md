PICO: Isolated MPFL reconstruction (the case this answer covers). Age group: P2 covers ages 8 to 25. For adults, only guidance of OPINION grade applies. Time: end of the initial phase (P2 Table 2). Question: can the app cue an SLR extension lag of 10 degrees?

Answer

No. The app must not give a patient cue for a 10 degree SLR extension lag. The verdict is LOG. The app can record the top angle of the SLR for a clinician. It shows no "lag" message to the patient.

The reason is that the 10 degree threshold lies inside the error of a 2D camera. A cue needs three things: a clinician limit for this patient, a supporting source, and a 2D error smaller than the effect. The third condition fails here.

Facts

| Fact | Exact quote or value | Source id | Class | Mark | Population |
|---|---|---|---|---|---|
| The 10 degree value | "performing a straight leg raise with less than or equal to 10 degrees of extensor lag by the end of the initial phase" (P2 Table 2) | P2 (Cincinnati Guideline 46, January 2015, older than 5 years, not revised) | CONSENSUS label, OPINION in substance (level 5, "LocalConcensus 2014 [5]", weak strength). It is a phase goal, not a stop rule | VERIFIED (citation-audit V39) | ISO, ADOL, ages 8 to 25 |
| Later phase goal | "Maintain an unassisted straight leg raise without an extensor lag for 10 seconds" (P2 Table 3) | P2 | OPINION in substance | VERIFIED (V39) | ISO, ADOL |
| Phase 1 exit in the other source | "Straight leg raise without extension lag" (zero lag, no number) | S1 Table 1 | OPINION (LoE 5) | VERIFIED (V39) | ISO |
| Brace link | P1: "Able to SLR pain-free without quadriceps lag". P3: "Discontinue knee brace when quadriceps control is regained" | P1, P3 | OPINION | VERIFIED (P1 audit section 4.2) | ISO |
| Time to SLR without lag | "41 days" unbraced versus "44 days" braced | S8 | STUDY (retrospective) | VERIFIED (V40) | ISO, ADOL |
| 2D error, best case | Bias "3.23" and "-0.14" degrees, LoA "±8.73" and "±8.80", MDC95 10.7. About 9 degrees | F1 Okuno 2026 | STUDY | VERIFIED (full text, correction C13). 20 healthy adults, still photos, MediaPipe highest complexity, two static positions. It is a lower bound, not a typical webcam value | Healthy, BORROWED |
| 2D error in exercise video | MAE "9.3-21.9°" in 2D across 11 models | F3 Rode 2025 | STUDY | VERIFIED (correction C14) | 25 healthy, BORROWED |
| Goniometer after knee surgery | Active extension LoA "-7.3 - 9.0" degrees. A difference of less than about 8 degrees cannot be told | F9 Lenssen 2007 | STUDY | VERIFIED | 30 TKA patients, BORROWED |
| MediaPipe `lite` model | NONE. No study exists | search-log E1, E2 | NONE | Not applicable | Not applicable |
| 2D pose in patients after MPFLR or any knee ligament surgery | NONE | form-evidence.md, Gaps | NONE | Not applicable | Not applicable |

Verdict for the check (form-evidence.md, check 5, and citation-audit section 4.2): "LOG the top angle as a number (median of lifts). No 'lag' cue." The audit rates the 10 degree value "SAFE ONLY AS A CLINICIAN-SET VALUE, and LOG only. The app must not use it as a progression gate."

Why a false result is a safety risk: P1 uses SLR without lag to decide on brace unlock. A false "no lag" from the app can lead to early walking without the brace (citation-audit 4.2). A false "lag" can cause worry or a session stop for no reason.

Disagreements and caveats

- Threshold: P2 gives 10 degrees. S1 gives no lag (0 degrees). P1 gives "without quadriceps lag" with no number. The conservative value is zero lag, but the camera cannot measure it. Do not average these values.
- The error depends on the system and the setup. Some sagittal knee systems show smaller errors in small samples (audit M8: X1, X2, X4, abstracts only, UNVERIFIED for app use). The 9 to 10 degree value is a working margin. The app must measure the error of its own model before it acts on any 2D difference.
- The knee angle at the top of an SLR is an active angle. P2 lag is a clinical sign that a therapist reads. Camera angle and clinical lag may not be the same quantity.

What the app can do

- LOG the SLR top angle as "estimated angle, not a medical measurement". Show it to the clinician only.
- A cue such as "knee bent at the top" is allowed only if a clinician sets a limit for this patient that exceeds the measured margin by itself. This is a PROPOSAL and needs clinician review. The knowledge base gives no such limit.
- Never write a verdict word about the lift (good, bad, correct, wrong, safe, pass, fail, goal reached). Describe the measured angle against the clinician limit.
- The app never changes the phase or unlocks the brace. Those are surgeon decisions.

Ask your surgeon

- What SLR lag limit applies to me, and when can my brace be unlocked?
- Who checks my SLR: a therapist in person or the app log?
- If I had a bone or cartilage procedure (TTO, trochleoplasty), what protocol applies? The isolated MPFLR values do not apply to combined surgery. A surgeon protocol is required.

Gaps

- NONE: any study of the MediaPipe `lite` model for knee angles.
- NONE: any study of 2D pose in patients after MPFLR or after any knee ligament surgery.
- NONE: any study that links a live camera cue to fewer complications or better outcome after knee surgery.
- NONE: any lag cue threshold for a camera in a guideline or review. The literature gives only the P2 phase goal of 10 degrees (level 5) and goniometer error of about 8 degrees after TKA (F9, BORROWED).
- Not in the knowledge base: the full BASK 2021 and Hurley 2023 texts (paywall, NOT READABLE per the audit).

If you have a symptom now, contact your care team.
