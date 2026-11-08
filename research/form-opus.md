# Form monitoring: second research pass (Opus)

Date: 2026-11-08. Scope: webcam rehab app after MPFL reconstruction (MPFLR). MediaPipe Pose runs in the browser.

This file is research input. It is not medical advice and not legal advice. It changes no plan, skill or code.

Labels:
- V: I opened the page and read the numbers there.
- V-abstract: I read only the abstract (Europe PMC record or journal page).
- UNVERIFIED: I did not open a page for the claim.
- Evidence classes: MPFLR (patients after MPFLR), BORROWED (patellofemoral pain, ACL or healthy people), OPINION (expert text without data), NONE (no source).

## 1. Overview and verdict

The earlier finding (`research/clinical.md` section 4) was right on its narrow claim. It was too pessimistic in what it concluded from that claim.

Right:
- No study gives a validated threshold for knee valgus, trunk lean, pelvic drop or landing angle in patients after MPFLR or with patellar instability. I searched for such a study and found none.
- No study links a movement pattern to recurrence after MPFLR.
- The cut-offs that exist come from patellofemoral pain (PFP) or ACL screening. Each comes from one small study. Even in ACL work, 3D valgus did not predict injury in 710 athletes (Krosshaug 2016).

Too pessimistic:
- "No validated threshold" does not mean "nothing to monitor". A clinician can set a limit for one patient. The app can then report a measured value against that limit. This needs no population cut-off.
- The "19 degrees valgus error" in `research/tech.md` applies only to the absolute angle. The change from the start of the movement agreed with Vicon (bias 0.18 degrees, Asaeda 2024).
- Side-view knee angle error with MediaPipe is about plus or minus 9 degrees (limits of agreement). A goniometer early after knee surgery has a detectable difference of 8.2 to 17.6 degrees (Lenssen 2007). The two errors are similar.

A fact that the user will not like:
- Live correction of knee alignment has no outcome evidence. The PFP guideline gives a Grade B recommendation against visual biofeedback on lower-limb alignment during hip and knee exercises (Willy 2019). One high-quality trial found the same gains with and without it.
- So "monitoring form" is defensible as a record for the clinician. Live "fix your knee" cues are not supported for knee alignment.

Short answer: the app can monitor six criteria now, in the side view, against clinician-set limits, with a "cannot tell" band. Frontal-plane criteria need a front view, a local accuracy test and a clinician limit. A "good form" or "bad form" verdict must never appear.

## 2. Evidence by question

### 2.1 Q1: Which movement faults matter, and why

(a) Evidence for patients after MPFLR:
- Hsu 2025, IJSPT 20(7):1074-1090, https://doi.org/10.26603/001c.141128 (V, first 100,000 characters). Clinical commentary, level of evidence 5.
  - Closed-chain work must be monitored to prevent femoral internal rotation with dynamic knee valgus. No angle is given. OPINION.
  - Protection-phase milestone: straight leg raise (SLR) without extension lag. No measure is given. OPINION.
  - Lateral step-down scoring looks at loss of balance, trunk lean, knee valgus and tempo. No cut-off.
  - Single-leg strengthening needs a critical check because compensation can occur. OPINION.
  - The review cites lab data: after clearance, drop jumps show less knee flexion and lower knee extension moment.
- Hsu 2026, KSSTA, https://doi.org/10.1002/ksa.70442 (V-abstract). 20 adolescents after MPFLR, 20 controls, 3D capture. In the squat, knee positive power on the operated limb was 41 percent lower than the other limb. Negative power was 33.3 percent lower. The pattern is offloading of the knee. MPFLR, small.
- Shams 2019, Orthop J Sports Med 7(2), https://doi.org/10.1177/2325967119825854 (V-abstract). 16 athletes after MPFLR, 15 controls. Less hip and ankle flexion in landing. Slower 6 m timed hop. No frontal-plane difference is reported in the abstract.
- Mechanism of dislocation: Dewan 2020, Knee Surg Relat Res 32:24, https://doi.org/10.1186/s43019-020-00031-w (V). 13 videos. In all 10 non-contact cases the knee was flexed under a valgus force. The tibia was externally rotated in 9 of 10. This is why clinicians watch valgus. It is not proof that valgus in rehab exercise causes recurrence.

(b) Evidence from PFP and ACL (BORROWED):
- Herrington 2014, Knee 21(2):514-517, https://doi.org/10.1016/j.knee.2013.11.011 (V-abstract). 2D FPPA in single-leg squat: PFP 16.8 plus or minus 5.4, controls 8.4 plus or minus 5.1 degrees. Landing: 21.7 and 13.5 degrees.
- Willy 2019, JOSPT 49(9):CPG1-CPG95, https://doi.org/10.2519/jospt.2019.0302 (V, PDF from ifspt.org, decoded). Grade B against visual biofeedback on lower-limb alignment during hip and knee exercises (page CPG40).
- Powers 2003, JOSPT 33(11):639-646, https://doi.org/10.2519/jospt.2003.33.11.639 (V-abstract). Theory: abnormal femur and tibia motion in frontal and transverse planes can change patellofemoral mechanics. OPINION.
- Krosshaug 2016, Am J Sports Med 44(4):874-883, https://doi.org/10.1177/0363546515625048 (V-abstract). 710 athletes, 42 ACL injuries. In players with no earlier injury, no drop-jump variable predicted injury. AUC 0.6.

(c) Fault by fault:

| Fault | Why it matters | Evidence class |
|---|---|---|
| Knee moves inward (dynamic valgus) | Part of the dislocation mechanism. PFP groups show more 2D valgus | BORROWED. OPINION for MPFLR |
| Quadriceps lag in SLR | Phase-1 milestone in Hsu 2025 | OPINION (level 5) |
| Knee bend past the surgeon limit | Patellofemoral stress rises with flexion in healthy people (clinical.md S14 to S18) | BORROWED. Limit is a surgeon decision |
| Offloading the operated knee | Seen in adolescents after MPFLR | MPFLR, small, 3D lab only |
| Trunk lean | Part of step-down scoring and QASLS | BORROWED. OPINION for MPFLR |
| Pelvic drop | Part of QASLS. Hip FPPA is poorly reliable even for human raters | BORROWED |
| Rep tempo | Part of the lateral step-down test (metronome) | NONE for a threshold |
| Foot position | No source for MPFLR | NONE |

### 2.2 Q2: Published criteria and thresholds

No tool below was validated in a patellar-instability or MPFLR population.

| Tool | What it measures | Numbers | Population | Reliability, validity | Source |
|---|---|---|---|---|---|
| FPPA cut-off, single-leg squat | 2D knee angle, front view | 8.2 degrees. Sens 87.5 percent, spec 68.8 percent, AUC .85 | 16 women with PFP, 16 controls | ICC .88 (pilot). No validation on new data | Bolgla 2023, https://doi.org/10.26603/001c.74269 (V) |
| FPPA cut-off, single-leg landing | 2D knee angle, front view | 5.2 degrees predicted PFP. Sens 70, spec 70 percent. OR 1.13 | Male military cadets, prospective | Not in abstract | Alrayani 2023, https://doi.org/10.1016/j.ptsp.2022.12.004 (V-abstract) |
| FPPA reliability, healthy | Same | ICC .59 to .91. SEM 2.72 to 3.01. Smallest detectable difference 7.54 to 8.93 degrees | 20 students | Reliability only | Munro 2012, https://doi.org/10.1123/jsr.21.1.7 (V-abstract) |
| FPPA reliability, PFP | Knee FPPA, hip FPPA, trunk lean | Squat knee FPPA ICC .894, MDC 5.61. Squat hip FPPA ICC .396, MDC 8.61. Squat trunk lean ICC .673, MDC 6.97 | 10 people with PFP | Human rater in Kinovea, camera 15 feet away | Nagahori 2026, https://doi.org/10.3390/mps9030076 (V) |
| FPPA validity vs 3D | 2D vs 3D knee angle | Squat r = 0.127. Landing r = 0.619 | 16 studies, meta-analysis | 2D is reliable but not accurate | Lopes 2018, https://doi.org/10.2519/jospt.2018.8006 (V-abstract via Europe PMC) |
| FPPA validity vs 3D | Same | r = 0.64 to 0.78. SEM 2 to 4 degrees | 18 healthy | Within-session ICC 0.86 | Gwynne 2014, PMC4275194 (V-abstract) |
| QASLS | 10 yes or no items: arm, trunk, pelvis, thigh, knee valgus (2 levels), stance | Score 0 to 10. No clinical cut-off | 14 healthy female dancers | Compound ICC .67 to .93. Inter-rater kappa .03 to .74. Intra-rater kappa .85 to 1.0 | Parry 2023, https://doi.org/10.26603/001c.88007 (V) |
| LESS | Count of landing errors, front and side video | Cut-off 5. Sens 86, spec 64 percent | 829 youth soccer players, 7 ACL injuries | Cut-off rests on 7 injuries | Padua 2015, https://doi.org/10.4085/1062-6050-50.1.10 (V-abstract) |
| Single-leg squat rating | Clinician rates good, fair or poor | No angle | 34 healthy | Kappa 0.600 to 0.800 between raters | Crossley 2011, https://doi.org/10.1177/0363546510395456 (V-abstract) |
| Y-balance (star excursion) | Reach distance, not form | Anterior difference over 4 cm: 2.5 times injury odds | 235 basketball players | ICC .82 to .87 | Plisky 2006, https://doi.org/10.2519/jospt.2006.2244 (V-abstract) |

Reading:
- The PFP and control groups differ by about 7 to 8 degrees of FPPA. The detectable change for a human rater is 5.6 to 9 degrees. A cut-off near 8 degrees sorts groups. It cannot sort one patient with confidence.
- A 2D FPPA is a projection. In the single-leg squat it does not agree with 3D knee abduction (r = 0.127). It is a record of what a clinician sees, not of true joint motion.
- Inter-rater agreement for observer scales is often low (QASLS kappa down to 0.03). The "ground truth" for form is itself unstable.

### 2.3 Q3: Validity of 2D video and pose estimation

| Study | Measure, view | Model, setup | Population, reference | Result |
|---|---|---|---|---|
| Okuno 2026, https://doi.org/10.3390/s26185890 (V) | Knee angle, side, 2.5 m | MediaPipe 0.10.21, highest complexity, tablet | 20 healthy, 40 limbs. Goniometer | Bias +3.23 and -0.14 degrees. LoA plus or minus 8.73 and 8.80. ICC 0.94 and 0.96. MDC95 10.7 and 5.0 |
| Iizuka 2026, https://doi.org/10.3389/fspor.2026.1831625 (V-abstract) | Knee angle in squat, side | Browser markerless system, webcam | 30 healthy men. 3D optical capture | Raw bias -10.6, RMSE 10.9 degrees. After a geometry correction for a fixed camera: RMSE 3.9 degrees |
| Rode 2025, https://doi.org/10.1038/s41598-025-22626-7 (V) | Knee flexion, front and side webcams, 3 to 3.5 m | 18 2D and 26 3D setups, BlazePose included | 25 healthy. Vicon | Best 2D knee MAE starts at 9.3 degrees. Authors: monocular pose is "not accurate enough" for clinical measurement |
| Asaeda 2024, https://doi.org/10.1016/j.heliyon.2024.e36338 (V) | Knee valgus, front, 5 m, 100 Hz | MediaPipe Pose, 2D | 15 healthy men. Vicon. Drop landing | Absolute: bias -19.28 degrees, r near 0 at contact. Change from contact: bias 0.181, r 0.554 to 0.757. Test-retest ICC of the change: 0.14 to 0.70, wide CIs |
| Haberkamp 2022, https://doi.org/10.1016/j.jbiomech.2022.111333 (V-abstract) | Single-leg squat, side and front | OpenPose | Adolescent athletes. 3D and manual 2D | Sagittal r = 0.68 to 0.94. Frontal pelvis and hip r = 0.53 to 0.54. Frontal knee r = 0.20 vs 3D, but r = 0.95 vs manual 2D |
| Ino 2024, https://doi.org/10.52082/jssm.2024.515 (V-abstract) | Knee valgus, front | OpenPose | 21 healthy. 3D | MAE 2.4 degrees (CI 1.9 to 3.0). Physiotherapist MAE 3.2. r = 0.97 |
| Janisch 2026, https://doi.org/10.1186/s12891-026-09958-9 (V-abstract) | Frontal knee deviation, squat, hop, landing | OpenPose and BlazePose | 16 healthy. Manual 2D app, not 3D | BlazePose bias -0.67, LoA -8.76 to 7.42 degrees. OpenPose LoA -4.32 to 6.05 |
| Kim 2026, https://doi.org/10.2196/85126 (V) | Single-leg squat class, front, 3 m | MediaPipe 0.10.21 | 105 healthy young adults. Two physiotherapists, kappa 0.60 | Best classifier accuracy 0.84, AUC 0.92 on 32 test cases. No angle validation |

The two items that `research/tech.md` marks UNVERIFIED:
- JMIR Preprint 102399, https://preprints.jmir.org/preprint/102399. WebFetch returned an empty page and a direct download returned 0 bytes. A search index confirms the title: "Validation of Single-Camera MediaPipe BlazePose for Knee Joint Angle Measurement ...". The same snippet gives "RMSE = 15.49 degrees" for static accuracy. I did not read the paper. It stays UNVERIFIED and is not peer reviewed.
- Heliyon (Asaeda 2024): opened in full (V). The 19 degree error is real for the absolute angle. Change values agreed with Vicon. Test-retest reliability of the change was poor. All 15 subjects were healthy young men in a lab.

What is reliable enough to show a patient, as an estimate with a margin:
- Knee flexion in the side view, with the leg in the image plane. Error is about plus or minus 9 degrees (Okuno 2026) in good conditions. In video with a light model it can be 10 to 11 degrees raw (Iizuka 2026, Rode 2025).
- Rep time and hold time. These come from timestamps. No study measured them (UNVERIFIED), but frame rate is the only limit.
- "Leg not in view", from landmark visibility.

What is not reliable enough to show a patient:
- Absolute valgus angle (bias about 19 degrees with MediaPipe).
- Valgus change in a home setup. Lab data look good for agreement, but test-retest is poor and no patient or home data exist.
- Trunk lean and pelvic drop in standing tasks. I found no pose study against a reference. Human raters reach ICC .396 for hip FPPA.
- A small quadriceps lag. The side-view error is as large as the lag. A goniometer after knee surgery has a detectable difference of 8.2 degrees for active extension (Lenssen 2007, https://doi.org/10.1186/1471-2474-8-83, V, TKA patients).

The `lite` model of the plan was not tested in any study I opened. Its error is NONE until task T13 measures it.

### 2.4 Q4: Commercial and research systems

| System | What I opened | What it says | Status |
|---|---|---|---|
| Kaia Motion Coach | Biebl 2021, JMIR 23(7):e26658, https://doi.org/10.2196/26658 (V) | Phone camera at about 2 m. Pose model plus rule checks. 24 patients with knee or hip osteoarthritis, 6 exercises, 552 segments | Peer reviewed. Kaia employees are authors |
| Kaia, numbers | Same | Physio vs physio: kappa 0.607, agreement 0.833. App vs physios: kappa 0.551 and 0.626, agreement 0.815 and 0.841. Binary "correction needed" only. No angle error | The paper states that no gold standard for form exists |
| Kemtai | https://www.alyn.org/Kemtai-more-info (V) | Research report, March 2025, healthy volunteers, 11 movements, 12 points, Vicon reference. "Most RMSD values" within an accepted threshold. No numbers on the page | CLAIM. Not shown to be peer reviewed |
| Sword Health | Study page returned HTTP 429 | Not read | UNVERIFIED |
| Hinge Health | https://rnd.hingehealth.com/ (V) | No accuracy post on the page | UNVERIFIED. A search summary mentions "TrueMotion" claims. I did not open them |
| Exer | Not opened | Not read | UNVERIFIED |

What this shows:
- Camera form feedback agrees with a physiotherapist about as often as two physiotherapists agree. That level is only moderate (kappa about 0.6).
- I found no outcome data that show app form feedback improves pain, function or recurrence.

### 2.5 Q5: Regulatory view

This is not legal advice.

EU MDR. I opened MDCG 2019-11 rev.1, June 2025, https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf (V, text decoded from the PDF).
- It quotes Rule 11. Software that gives "information which is used to take decisions with diagnosis or therapeutic purposes" is class IIa or higher. "All other software is classified as class I."
- It says sub-rule 11a "is generally applicable to all MDSW (excluding those MDSW that have no medical purpose)".
- An example of MDSW: software that uses range of motion and other data of a patient with a musculoskeletal pathology and recommends "personalised rehabilitation exercises".
- "Wellness or fitness apps" do not qualify as MDSW.
- Section 3: claims about the intended medical purpose must be "supported by appropriate level of clinical evidence".
- The guidance does not mention form feedback or pose estimation.

FDA. I opened three documents (V, PDF text decoded).
- General Wellness, issued January 6, 2026, https://www.fda.gov/media/90652/download. A claim "to restore a structure or function impaired due to a disease or condition" is not a general wellness claim.
- Device Software Functions and Mobile Medical Applications, September 28, 2022, https://www.fda.gov/media/80958/download. Enforcement discretion example 4: "Software functions that use video and video games to motivate patients to do their physical therapy exercises at home".
- CDS guidance page, January 2026 (V). FDA digital health policies apply to device software "intended for use by patients or caregivers". The statute, 21 U.S.C. 360j(o)(1)(E) (V, Cornell LII), limits the non-device CDS path to recommendations "to a health care professional".

My reading (UNVERIFIED, for an expert):
- A neutral measurement against a clinician limit stays inside "monitoring" under MDR. The plan already treats this as medical device software.
- A "correct" or "incorrect" verdict is a claim about therapy. Under MDCG section 3 it needs clinical evidence. That evidence does not exist for MPFLR.
- In the US, a verdict moves the app away from "motivate patients to do their physical therapy exercises". The non-device CDS path does not fit a patient-facing app.
- I did not read EU MDR Annex VIII on EUR-Lex. The consolidated HTML did not show it. I read Rule 11 only as MDCG quotes it.

## 3. Criteria table with evidence labels

Margin m = the error half-width for the setup. Start value 9 degrees (Okuno 2026). T13 must replace it with a measured value for `lite` on a webcam.

| # | Criterion | Exercise | View | Evidence label | Margin | Status |
|---|---|---|---|---|---|---|
| C1 | Knee bend at or above the surgeon ceiling | Mini squat, heel slide | Side | Limit: surgeon. Load link: BORROWED | 9 degrees start | MVP |
| C2 | Peak knee bend below the target | Heel slide, mini squat | Side | Target: surgeon | 9 degrees start | MVP |
| C3 | Rep shorter than the minimum rep time | All | Any | NONE for the number. Clinician sets it | Frame time | MVP |
| C4 | Leg not in view, low visibility | All | Any | Engineering rule | Not applicable | MVP |
| C5 | Hold: angle stays in a band for the hold time | Seated knee extension | Side | Protocol values | 9 degrees start | MVP |
| C6 | Estimated knee angle at the top of the SLR | SLR | Side | MPFLR milestone, OPINION | 9 degrees start | MVP as a number. "Lag" only if the limit exceeds m |
| C7 | Trunk forward lean in the side view | Mini squat | Side | NONE for a limit. Sagittal angles validate better (Haberkamp 2022) | Not measured | Record only, after T13 |
| C8 | Knee moves inward, change from the start of the rep | Mini squat, step-down | Front | BORROWED (PFP). NONE for MPFLR | 7.4 to 8.8 degrees vs manual 2D (Janisch 2026) | Second view. Record for clinician. No live cue |
| C9 | Absolute valgus or FPPA against 8.2 or 5.2 degrees | Any | Front | BORROWED, one study each, not validated | Bias up to 19 degrees | Never show |
| C10 | Trunk lean to the side | Step, balance | Front | BORROWED. NONE for MPFLR | NONE | Wait for clinician limit and own test |
| C11 | Pelvic drop, hip adduction | Single-leg tasks | Front | BORROWED. Human ICC .396 | NONE | Wait. Possibly never |
| C12 | Hip rotation | Any | Any | OPINION | Not measurable in 2D | Never show |
| C13 | Landing quality, LESS-like score | Hop, landing | Front and side | BORROWED (ACL) | NONE | Not in MVP |
| C14 | Load shift to the other leg | Mini squat | Front | MPFLR (3D power only) | NONE | Research item |
| C15 | Any "good form", "bad form", score or colour verdict | All | Any | NONE | Not applicable | Never show |

## 4. Design proposal

### 4.1 Principle

The app measures and reports. A clinician defines the limit for each patient. The app never defines "correct". Without a clinician limit, the app records the value and shows no message.

### 4.2 One criterion record

Add an optional `criteria` array to each exercise in the protocol file. Zod checks it. No new dependency.

| Field | Content |
|---|---|
| `id` | One of C1 to C6 in the MVP |
| `measure` | For example `kneeFlexionPeak`, `repDurationS`, `holdS` |
| `comparator` | `ceiling`, `floor` or `band` |
| `limit` | Clinician number. No default |
| `setBy`, `setOn` | Same rule as `authoredBy` and `approvedOn` |
| `evidence` | `mpflr`, `borrowed` or `unvalidated` |
| `cue` | A key into a fixed cue list in the code. No free text |

The app stores `marginDeg` and its source with each session. The clinician does not set it.

### 4.3 Margin rule

For a measured value v, a limit L and a margin m:

| Case | Safety ceiling (C1) | Target or floor (C2, C6) |
|---|---|---|
| v below L minus m | Nothing shown | Cue "below your target" (C2) |
| v within L plus or minus m | Cue "close to your limit, stop" | Count the rep. Show no cue |
| v above L plus m | Cue "stop at your limit, do not push". Rep not counted | Count the rep |

- The two sides use opposite rules on purpose. The safety side warns early. The counting side gives the benefit of the doubt. Then a target close to a ceiling stays reachable.
- Example: target 45, ceiling 50, m 9. The app warns from 41 degrees and counts from 36 degrees.
- Zod rejects a limit for C6 that is smaller than m. The error text names m.
- If the visibility gate fails, the result is "cannot tell". Never default to an in-range result.
- Show "cannot tell, the camera error is larger than this difference" in the session summary only. A live "cannot tell" adds noise.
- For a change from baseline (C8, later), m must come from repeat measurement, not from bias. Asaeda 2024 shows good agreement but poor test-retest. Measure both in T13.

### 4.4 Wording

Allowed, with the angle label from the plan:
- "Knee bend 52 degrees (estimated angle, not a medical measurement)."
- "Above the limit your care team set." "Below your target."
- "Rep time 1.2 s. Your care team set at least 2 s."
- "Close to your limit, stop."

Not allowed, in words, colour or icon:
- correct, incorrect, good, bad, perfect, wrong, mistake, safe, dangerous, risk of injury
- score, grade, pass, fail, goal reached, "8 of 10 reps correct"
- green for in range and red for out of range

Show nothing for an in-range rep. A "within range" message reads as "pass". This is simpler than the plan of form.md and avoids an implied verdict.

### 4.5 What ships when

MVP (side view only): C1 to C6.
- Change the FR9 cue "extension lag at the top" to "estimated knee angle at the top".

Second view, after T13 and a clinician limit: C7 and C8.
- One camera is enough. The patient turns to face it for a short set.
- Show the clinician a per-rep number and a stick-figure replay from the stored landmarks. This stores no image, so FR6 holds. A number alone is hard to judge without a picture.
- No live alignment cue. The PFP guideline gives Grade B against it, and no MPFLR data support it.

Wait for a clinician limit and an own validation: C10, C11, C13, C14.

Never show: C9, C12, C15.

### 4.6 Proof

- Unit tests at L minus m, L and L plus m for each case in 4.3.
- A noise test with error equal to m.
- A Zod test that rejects a C6 limit below m.
- A banned-word test for the list in 4.4 in `claims-check.sh`.
- T13: Bland-Altman on recorded video against a goniometer, in the real camera setup, for each criterion and view. Record bias, limits of agreement and test-retest error in `docs/accuracy.md`.

## 5. Second opinion on research/form.md

The file existed when I finished (38,881 bytes, 391 lines). I read all of it.

Agree:
- The verdict: the earlier finding was mostly right and incomplete. The three corrections in its section 1 match my findings.
- The core design: clinician-set limits, an error margin, a "cannot tell" state, no app-made verdict.
- The ship list for the MVP (C1 to C6 there) and the "never show" list.
- The Grade B recommendation against alignment biofeedback. I confirmed it in the guideline PDF, page CPG40.
- The regulatory reading. I confirmed the MDCG Rule 11 text, the rehabilitation example, the FDA "physical therapy exercises" example and the general wellness text.
- The quoted numbers that I checked. These are Okuno 2026, Asaeda 2024, Bolgla 2023, Herrington 2014, Nagahori 2026, Parry 2023 and Padua 2015.
- Also Plisky 2006, Biebl 2021, Hsu 2026, Krosshaug 2016, Iizuka 2026 and Janisch 2026.

Disagree or correct:
1. Asaeda 2024: form.md cites the change ICC 0.50 to 0.83. That is agreement with Vicon. The test-retest ICC of the change was 0.14 to 0.70 with wide intervals. The change measure is valid in one session but not shown to be repeatable.
2. Counting in the "cannot tell" band: form.md does not count a rep there. With m of 9 degrees and a mini squat ceiling of 50, a 45 degree target becomes hard to count. I propose the asymmetric rule of 4.3.
3. "Within the range your care team set": form.md shows this message. I propose silence for in-range reps. The message reads as a pass.
4. Kim and Park 2026: form.md says the pose model is not named. The full text names MediaPipe Pose v0.10.21.
5. Ino 2024: form.md gives issue 23(3). Europe PMC lists volume 23, issue 1, pages 515-525. Small point.
6. form.md section 4.3 says I found "no goniometer reliability study" for lag. Lenssen 2007 gives a goniometer detectable difference of 8.2 degrees for active extension after TKA. That supports its conclusion that a small lag is not measurable.
7. Frontal view: form.md does not say how a clinician checks a frontal number without video. I propose a stick-figure replay from landmarks.

Citations in form.md that I did not confirm (not opened by me):
- Samuel 2025, Riesenberg 2026, Rab 2025, Sachdev 2026.
- Neal 2016, Pallone 2026, Cronström 2016, Hewett 2005, Paterno 2010, Scholtes 2017.
- Zhang 2025, Cooke 2025, the Piva step-down reliability, the Harris-Hayes 10 degree classes.
- Oliosi 2026, Pavlikov 2026, Skvortsov 2026, Kondo 2026, OpenLESS 2025, Padua 2009.
- The Kemtai "gold-standard" page and the Exer product page.
- The "4032x3024 still photos" detail of Okuno 2026.
- form.md lists the JMIR preprint with a different search summary (ICC 0.982, MAE 7.07). My search snippet gave "RMSE = 15.49 degrees". Both are UNVERIFIED. Neither of us read the paper.

## 6. Open decisions for the user or a clinician

1. Which criteria and which limits does the surgeon or physiotherapist set for each exercise? This covers C1 to C6.
2. Does "above the limit your care team set" break the guardrail ban on pass and fail? I think it does not, if in-range reps show nothing. The user must decide.
3. Does the app stop the set at "close to your limit", or only warn?
4. Is a front-view set part of the first release or the next one? I propose the next one.
5. Can the clinician view show a stick-figure replay from landmarks? It stores no image, but it is still health data in the export.
6. Is a small validation study with patients needed before C8 goes to a patient? It needs ethics approval.
7. Does form monitoring change the intended purpose? An expert must classify it under Rule 11 before `PATIENT_USE_APPROVED` is set.
8. Are the values usable for adolescents? Most MPFLR data come from adolescents. All pose data come from healthy adults.

## 7. Items not verified

- JMIR Preprint 102399: page text did not load. Only the title and one number from a search snippet.
- Lopes 2018 meta-analysis: journal page returned 403. I used the Europe PMC abstract.
- Abstracts only: Haberkamp 2022, Ino 2024, Janisch 2026, Iizuka 2026, Herrington 2014, Munro 2012 and Padua 2015.
- Abstracts only: Plisky 2006, Crossley 2011, Krosshaug 2016, Hsu 2026, Shams 2019, Alrayani 2023 and Gwynne 2014.
- Rode 2025: the angle tables are images. I read only the lower bounds of the error ranges.
- Hsu 2025: I read 100,000 of 138,607 characters.
- Sword Health (HTTP 429), Exer (not opened), Hinge "TrueMotion" claims (not opened).
- Kemtai report numbers: the linked report was not opened.
- EU MDR Annex VIII on EUR-Lex: the consolidated HTML did not show it. Rule 11 is quoted from MDCG 2019-11 only.
- MDCG 2019-11, FDA General Wellness and FDA Mobile Medical Apps PDFs: I decoded the text with a simple script. The decoding can drop characters.
- The CDS guidance PDF itself was not read. Only the FDA page and the statute.
- Physiological quadriceps lag in healthy people: the paper returned 403. Not used.
- Error of the MediaPipe `lite` model on a webcam in live video: no study found.
- Any study that links a movement pattern to recurrence after MPFLR: none found. My search was not systematic.

Downloaded files were treated as untrusted data. I ran no code from them. Scripts and downloads were in the session scratchpad.
