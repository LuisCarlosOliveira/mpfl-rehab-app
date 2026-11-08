**PICO:** The question does not say the surgery type, age or week. This answer covers isolated MPFL reconstruction (ISO), adults and adolescents, any week after surgery. Question: can the app measure quadriceps LSI?

## Answer

No. The app cannot measure quadriceps LSI. LSI of the quadriceps is a strength ratio of the operated leg to the other leg. It needs a strength test (isometric dynamometer, isokinetic test or manual muscle test). A phone camera does not measure force. The knowledge base says: "The app cannot measure strength LSI, hops, Y-Balance, gait or effusion grade. Those stay clinician inputs." (`research/rehab-rules.md` section 5).

The app can do two related things:
- It can store a quadriceps LSI value that a clinician enters. The app only shows it. It does not decide anything from it.
- It can record "movement symmetry". This is the knee range of the operated leg compared with the other leg, from a side-view camera. It is not LSI. It is not strength. The app must never call it "LSI" (`research/form-evidence.md` check 10).

## Facts

| Fact | Value and quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Strength LSI is not measurable by the app | "The app cannot measure strength LSI, hops, Y-Balance, gait or effusion grade." | `rehab-rules.md` section 5 | NONE (a design statement, not a source) | Not applicable | Not applicable |
| Movement symmetry is a log only | Verdict LOG. "LOG as 'movement symmetry', never 'LSI'. No cue." Each side carries about 9 degrees of error, and a difference of two estimates carries more | `form-evidence.md` check 10, F1 | STUDY (F1, best case) | VERIFIED (F1 full text, PMC13611076) | Healthy adults, still photos. BORROWED |
| Best-case 2D knee angle error | Bias "3.23" and "-0.14" degrees, LoA "±8.73" and "±8.80". Treat a difference below about 9 to 10 degrees as not measurable | F1 (Okuno 2026) | STUDY | VERIFIED | 20 healthy adults, two static positions, highest-complexity MediaPipe. BORROWED. A lower bound, not a typical webcam value (`source-audit.md` C13) |
| Video error is larger | MAE "9.3-21.9°" in 2D across 11 models. "monocular HPE is not accurate enough to achieve clinically relevant measurements in its current state" | F3 (Rode 2025) | STUDY | VERIFIED | 25 healthy, Vicon. BORROWED |
| No study of the `lite` model, and none after MPFLR | NONE | `form-evidence.md` Gaps | NONE | Not applicable | Not applicable |
| Clinician quad strength thresholds exist (for reference only) | S1 phase 2 exit: "Quadriceps strength greater than 60% of the non-surgical side". S1 phase 3 exit: "greater than 80%". P2 Table 4: MMT "at least 85% of dynamometer comparison". P3: "Strength should be 90% of the unaffected side prior to commencing plyometric and jogging/running drills" | S1, P2, P3 | OPINION (S1), CONSENSUS low, level 5 (P2), CONSENSUS low (P3) | VERIFIED | S1 and P3 ISO. P2 ages 8 to 25, isolated surgery |
| Quad LSI before running | S1: "limb symmetry index of quadriceps >70%" (from an ACL review, C3) | S1 | OPINION | VERIFIED | BORROWED (ACL) |
| Quad LSI before running, ACL guideline | AS1: "LSI>80% for quadriceps strength" (audit wording: "Limb symmetry index (LSI)>80% for quadriceps strength.") | AS1 (Aspetar 2023) | CONSENSUS | VERIFIED | BORROWED (ACL) |
| Return-to-sport strength | ME1: "nearly symmetrical strength (85-90 %)", and "LSI of at least 90 %" for high-demand sports. S1: "≥ 90% on isometric peak torque for knee extension, knee flexion, and hip abduction" | ME1, S1 | OPINION | VERIFIED | ME1 mixed instability. S1 ISO |
| Real-world quad LSI at about 7 months | N20: quadriceps LSI "85.3%" at "a mean 7.4 months" | N20 | STUDY | Abstract level (case series) | 10 of 28 had TTO, so mixed (COMB and ISO) |
| No validated RTS battery after MPFLR | S1: "RTS criteria following MPFL reconstruction have not been well established". N4: "there is no consensus for the appropriate timing or functional evaluation" | S1, N4 | REVIEW | VERIFIED | ISO and COMB |

## Disagreements

The quad strength thresholds disagree.
- Before running: 70 percent (S1, borrowed from ACL), 80 percent (AS1, ACL), 90 percent (P3).
- Return to sport and later phases: 80 percent (S1 phase 3 exit), 85 percent (P2, ISAKOS 2013 for hops), 90 percent or more (S1, ME1).

The conservative value is 90 percent or more (P3, S1, ME1). Do not average the values. Every one of these values is a level 5 or opinion item, so a clinician sets the value for each patient. The app does not set a gate (`research/citation-audit.md` section 3 and section 6).

## Ask your surgeon or physiotherapist

- Ask for a strength test of both quadriceps with a dynamometer or an isokinetic test.
- Ask which LSI value you must reach for each next step. The value comes from your care team, not from the app.
- Ask them to enter the result in the app if the app has a field for it.
- If both knees have surgery, ask what to compare with. LSI does not work when both knees are affected (N3, OPINION).
- If you had a bone or cartilage procedure with the MPFL surgery (for example TTO), a surgeon protocol is required. Do not use the isolated values above.

## Gaps

- NONE: the app has no way to measure quadriceps force or LSI. The literature says that strength LSI needs a dynamometer or an isokinetic test, read by a clinician (S1, P2, P3, ME1).
- NONE: no study of the MediaPipe `lite` model, and no study of any 2D pose system in patients after MPFLR or any knee ligament surgery.
- NONE: no validated RTS battery after MPFLR (S1, N4, S6). S6 reports that "only 14% to 40% of patients met all study-specific RTS criteria" (REVIEW, mixed population, 41 percent had a bone procedure, C9).
- NONE: the threshold for quad LSI before running has no MPFLR-specific source. The values 70 and 80 percent are BORROWED from ACL.
- The camera values are "estimated angle, not a medical measurement". The app shows movement symmetry as a log for the clinician and gives no cue and no goal message.

## Note on the checks

The audit rows V62 (AS1 wording) and V70 (ME1) are used with the true wording from `research/citation-audit.md`. No audited-WRONG or NOT READABLE row supports any value above. The style check (`ste-check.py`) was not run on this file.
