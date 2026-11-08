# Evidence for live form checks

Date: 2026-11-08. Status: complete for this pass.

This file judges each candidate live check of the app. It uses the sources of `rehab-rules.md` and `source-audit.md` and the pose studies of `form-opus.md` section 2.3. It does not repeat their reference lists. Quoted source text stays exact.

## Verdict scale (strict)

- CUE: the app can show a message to the patient. All three conditions must hold. A clinician sets the limit for this patient. A guideline or a review supports the clinical meaning. The 2D error is smaller than the distance that the cue must detect.
- LOG: the app records the value for a clinician. It shows no message to the patient.
- NO BUILD: the error is as large as the effect, or no source gives any meaning. The app does not compute it, or it computes it only for research.

## The error budget of a 2D camera

| Fact | Value | Source | Population and setup |
|---|---|---|---|
| Sagittal knee angle, best case | Bias "3.23" and "−0.14" degrees, LoA "±8.73" and "±8.80" | F1 Okuno 2026 | 20 healthy, still photos, 4032 x 3024 pixels, MediaPipe highest complexity, two static test positions |
| Sagittal knee flexion in exercise video | MAE "9.3-21.9°" in 2D across 11 models | F3 Rode 2025 | 25 healthy, Vicon |
| Knee extension exercise, MediaPipe full model | Individual ICC "0.005-0.68" | M7 Das 2026 | 14 healthy staff, 14-camera motion capture |
| Sagittal hip and knee in gait | "most valid and reliable" planes. Frontal and transverse "lack valid and accurate measurement outcomes" | M2 Scataglini 2024 | Meta-analysis, 22 papers |
| Squat and landing kinematics | SEM "below 5°" for most variables. Validity differences "0.2° to 28.6°" | M4 Yoma 2025 | Systematic review, 53 studies |
| Absolute frontal knee valgus, MediaPipe | Bias about 19 degrees at contact (base, `form-opus.md` 2.3) | F4 Asaeda 2024 | 15 healthy men, drop landing |
| Goniometer after knee surgery (reference tool) | Active extension LoA "-7.3 – 9.0" degrees | F9 Lenssen 2007 | 30 TKA patients |
| MediaPipe `lite` model of the plan | NONE. No study found | Search E1, E2 in `search-log.md` | Not applicable |

Reading: the best case error for a knee angle is about 9 degrees. A real webcam video can be worse (10 to 22 degrees). A clinician goniometer has an error of about 8 degrees in a patient after knee surgery. So no app check can resolve a difference below about 9 to 10 degrees. Frontal plane angles are not valid in 2D (M2, F4).

## Feedback itself

| Fact | Source | Mark |
|---|---|---|
| P2 rec 30: "visual, tactile and verbal feedback cues are provided as needed to ensure optimal performance (LocalConcensus 2014 [5])" | P2 | CONSENSUS (level 5), given by a therapist |
| Grade B against visual biofeedback on lower-limb alignment in hip and knee exercise for patellofemoral pain | Willy 2019 via `form-opus.md` 2.1 | V in `form-opus.md`. Not re-read in this pass (HTTP 403). BORROWED |
| Camera form feedback agrees with physiotherapists at kappa 0.551 and 0.626. No outcome benefit shown | Biebl 2021 via `form-opus.md` 2.4 | V in `form-opus.md`. BORROWED (knee and hip osteoarthritis) |
| Smart-device tele-rehab after TKA: VAS "SMD = 0.02, 95% CI: - 0.24 to 0.28", WOMAC "SMD = - 0.27, 95% CI: - 0.60 to 0.06" | T3 Zhai 2025 (22 RCTs) | REVIEW, BORROWED (TKA) |
| Sword digital biofeedback after TKA used "inertial motion trackers". Allocation "according to geographical criteria, and not through randomization" | T1 Correia 2018 | STUDY, BORROWED, not camera |

Reading: no trial shows that live camera cues improve outcome or safety after knee surgery. Feedback by a therapist is common practice (P2). A camera cue is therefore an app behavior that needs clinician approval, not an evidence-based treatment.

## Check by check

| # | Check | Exercise | View | Best sources | 2D error against the effect | Clinical threshold | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Range reached, ceiling (depth cap): knee bend above the surgeon limit | Heel slide, mini squat | Side | Limits: surgeon (`clinical.md` section 9). Range by week: S1, P2 (`rehab-rules.md` section 1). Load rises with flexion: S14 to S17, N23 (BORROWED, healthy) | About 9 degrees best case. A ceiling is a large, slow movement. The safety side can warn early by the margin | Clinician value only. Literature range: 90 degrees at 4 weeks (P1, P2), squat 0 to 50 degrees (S16, BORROWED) | CUE, only with a clinician ceiling, with the margin rule of `form-opus.md` 4.3. Cue text states the limit, not a verdict |
| 2 | Range reached, target: peak bend below the clinician target | Heel slide | Side | P2 targets: "≥ 90° knee flexion PROM by 4 weeks", "≥ 120º by 6 weeks". P1: contact surgeon if not near 90 by 4 weeks | About 9 degrees. A target miss of less than the margin cannot be told | Clinician value | CUE as a plain statement ("below your target"), only when the miss is larger than the margin. A trend below target over sessions goes to LOG and to "contact your care team" logic (P2 red flag "Unexpected loss or minimal progression of ROM") |
| 3 | Tempo: rep shorter than the minimum rep time | All four | Any | No MPFLR or guideline source gives a tempo (`rehab-rules.md` section 3: NONE) | Timestamps: frame time (about 33 to 67 ms). Rep detection accuracy was not validated in a study found | NONE in the literature. Clinician value only | CUE only with a clinician value. Without it, LOG |
| 4 | Steadiness: angle spread during a hold | Seated hold, SLR hold | Side | No source | Base replay noise 0.9 to 2.1 degrees (INFERRED, `docs/adaptation-and-live-form-design.md` R6). M4 SEM up to 5 degrees | NONE | NO BUILD |
| 5 | Extension lag: knee not straight at the top of the SLR | SLR | Side | P2: "less than or equal to 10 degrees of extensor lag by the end of the initial phase". S1: "Straight leg raise without extension lag" | 9 degrees best case, more in video. A goniometer has 8 degrees (F9). A 10 degree threshold sits inside the error | P2 gives 10 degrees (level 5) | LOG the top angle as a number (median of lifts). No "lag" cue. A cue "knee bent at the top" only if a clinician sets a limit that exceeds the margin by itself (`adaptation-and-live-form-design.md` already says this) |
| 6 | Depth cap for open-chain extension: knee straighter than the allowed arc | Seated hold | Side | P2 rec 29: avoid "knee extension from 30° to 0°" in the initial phase. P1: "Do not perform open chain knee extension (KE)" in phase 1, later "limited arc of motion (90-40 degrees)". AS1 (ACL): "90°−45° of knee flexion" from week 4 | About 9 degrees. The arc end is 30 to 45 degrees from full extension, so a 9 degree margin can separate it | Clinician value. Literature: 90 to 30 (P2), 90 to 40 (P1), 90 to 45 (AS1, BORROWED) | CUE, only with a clinician arc. New check: the current seated hold asks for 0 degrees. That conflicts with P1 and P2 in phase 1 |
| 7 | Knee valgus in a front view | Mini squat | Front | S1: "prevent femoral internal rotation coupled with dynamic knee valgus" (OPINION). No MPFLR threshold. Willy 2019 Grade B against visual biofeedback (BORROWED) | Absolute bias about 19 degrees (F4). Frontal 2D not valid (M2). Base: frontal knee r = 0.20 against 3D (Haberkamp 2022) | NONE for MPFLR | NO BUILD as a cue. LOG the change from rep start only after the app measures its own error (task T13), and only for a clinician |
| 8 | Trunk forward lean | Mini squat | Side | No MPFLR source. P2 mentions "proper alignment of trunk, hip, knees and feet" as a goal | Not measured for the `lite` model. M4 reports wide validity differences by joint and task | NONE | LOG only, after T13. No cue |
| 9 | Hip rise (pelvis lifts) | Heel slide, SLR | Side | No source | Base replay: framing dominates (INFERRED, R3) | NONE | NO BUILD |
| 10 | Movement symmetry: range of the operated knee against the other knee | Heel slide, mini squat | Side, both legs in turn | S1 run rule "full ROM or >95% of the non-injured knee". P2 phase 2: "≥ 120º or 75% of uninvolved limb for knee flexion". Both are goniometer measures by a clinician | Each side carries about 9 degrees. A difference of two estimates carries more | Clinician thresholds exist (95 percent, 75 percent) but for goniometer values | LOG as "movement symmetry", never "LSI". No cue |
| 11 | Leg not in view | All | Any | Engineering rule (`form-opus.md` C4) | Not applicable | Not applicable | CUE (setup message, not clinical) |
| 12 | Pain entry between sets | All | None | P2 pain goal "≤ 2 out of 10". Borrowed 5 of 10 model (PM1) | Self-report | No MPFLR stop value | CUE only as the app safety floor or a clinician value (`docs/clinical-limits.md`). Not an evidence-based default |

## What the evidence supports, in short

- Patient cue, with a clinician limit and a margin: knee bend ceiling and target in a side view (checks 1, 2). Also the open-chain arc end for a seated extension (check 6), rep time (check 3) and leg visibility (check 11).
- Clinician log only: SLR top angle (check 5), trunk lean after own validation (check 8), movement symmetry (check 10).
- Not supported: steadiness, hip rise, frontal valgus as a cue, any form score.

## Gaps

- No study of the MediaPipe `lite` model for knee angles.
- No study of any 2D pose system in patients after MPFLR or after any knee ligament surgery.
- No study that links a live camera cue to fewer complications or better outcome after knee surgery.
- No tempo, steadiness or valgus threshold for MPFLR exists in a guideline or a review.
