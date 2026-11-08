# Form monitoring: what the evidence supports

Date: 2026-11-08. Scope: a webcam rehab app for MPFL reconstruction (MPFLR). The app uses MediaPipe Pose in the browser.

This file is research input. It is not medical advice and not legal advice. The plan, the skill and the code are not changed by this file.

Evidence labels in this file:
- MPFLR: data from patients after MPFL reconstruction.
- BORROWED: data from another group (patellofemoral pain, ACL, healthy people).
- OPINION: expert text with no data behind the claim.
- NONE: no source found.
- UNVERIFIED: no page was opened. The fact comes from a search summary or from an earlier file.

## 1. Overview

The user wrote on 2026-11-08: "it is important to monitor the correctness of the form when executing any rehab exercise".

Was our earlier finding right? Mostly yes. It was incomplete in three places.

What stays true:
- No validated threshold exists for knee valgus, trunk lean, pelvic drop or landing angle in patients after MPFLR.
- I also found no study that links any movement pattern to recurrence after MPFLR or patellar instability.
- The valgus cut-offs that exist come from patellofemoral pain (PFP) or ACL work. Most come from one small study.
- Even in ACL work, valgus is a weak predictor. A cohort of 710 athletes found no link (Krosshaug 2016).

What was too pessimistic or wrong:
1. "No validated threshold" does not mean "no way to monitor form". Observer tools exist. They use yes or no items, for example "the patella moves past the inside of the foot". They have reliability data. They have no cut-off for patients after MPFLR.
2. The "about 19 degrees valgus error" in `research/tech.md` is the error of the absolute angle. The same study found a bias of 0.18 degrees for the change from the start of landing. A within-person change is much more reliable than an absolute value.
3. I cannot confirm the "about 15 degrees RMSE" from the JMIR preprint. A search summary of the preprint describes different tasks and different numbers. Treat the 15 degree figure as unverified.

What the earlier files missed:
- The plan uses the `lite` model. All verified accuracy studies used other models or other setups. The error of `lite` in live video is NONE.
- The PFP clinical practice guideline gives a Grade B recommendation against visual biofeedback on lower-limb alignment during hip and knee exercises. One good trial found no added benefit. This is not harm. It does mean that live valgus correction has no outcome evidence.
- Commercial apps claim form feedback. The only peer-reviewed test that I opened (Kaia, 24 patients) found agreement with physiotherapists of 0.83. The two physiotherapists agreed with each other at 0.83. Kappa was only 0.55 to 0.63.

Main answer to the user: the app can monitor a short list of criteria in a defensible way. The criteria are knee bend in the side view, rep time and "leg in view". Each criterion needs a clinician-set limit and an error margin. The app must show "cannot tell" inside the margin. The app must not decide what "correct" means. The clinician sets that, per patient.

Frontal-plane criteria (knee inward, trunk lean, pelvic drop) are not safe to judge now. They can be recorded as a within-person change for the clinician, after a front-view test. See sections 5 and 6.

## 2. Q1: Which movement faults matter

### 2.1 Evidence for patients after MPFLR

- Hsu 2025 (IJSPT 20(7):1074-1090, https://doi.org/10.26603/001c.141128, level of evidence 5). I opened the first 100,000 of 138,607 characters of the HTML page.
  - The review says few studies examine biomechanics after MPFLR. Current studies "predominantly focus on sagittal plane biomechanics".
  - Walking at 3 months shows lower knee flexion and extension moment on the operated side. Values match controls at 1 year (cited studies 62 and 63).
  - After clearance (6 to 19 months), drop jump and single-leg landing show less knee flexion, less ankle dorsiflexion and lower extension moments (cited study 64).
  - The authors cite one source (46) for "prevent femoral internal rotation coupled with dynamic knee valgus" in closed-chain work. They give no angle.
  - A milestone is "straight leg raise without extension lag" (cited studies 29, 31, 34 and Table 1). The review gives no way to measure the lag.
  - Lateral step-down scoring (Table 3) covers "significant trunk lean or knee valgus". The review gives no cut-off.
  - Text with no citation: keep "proper lower extremity alignment and symmetrical loading". Future work must study hip internal rotation and adduction. This is OPINION.
- Hsu 2026 (Knee Surg Sports Traumatol Arthrosc, https://doi.org/10.1002/ksa.70442). Abstract only, via Europe PMC. Case-control, 20 adolescents after MPFLR and 20 controls. 3D motion capture.
  - In the squat, the operated limb had 41 percent lower knee positive power than the other limb (p < 0.001). Knee negative power was 33.3 percent lower.
  - The pattern is offloading of the knee. The study did not report frontal-plane angles.
- Samuel 2025 (Orthop J Sports Med, https://doi.org/10.1177/23259671251383076). Abstract only. 17 adolescents, about 200 days after MPFLR, drop vertical jump.
  - Dynamic knee valgus correlated with trochlear width (r = 0.483, P = .049).
  - The study links anatomy to movement. It did not study recurrence.
- Riesenberg 2026 (Orthop J Sports Med, https://doi.org/10.1177/23259671261466476). Abstract only. At return to sport, vastus medialis peak activity was 73 percent lower on the operated side (16 patients).
- Rab 2025 (Arch Orthop Trauma Surg, https://doi.org/10.1007/s00402-025-05788-x). Abstract only. 23 patients with patellofemoral instability, 61 percent with femoral osteotomy.
  - Dynamic valgus in a single-leg squat on video was seen less often after surgery (p = 0.041).
  - This is not an isolated MPFLR group.
- Sachdev 2026 (Arthrosc Sports Med Rehabil, https://doi.org/10.1002/ars2.70012). Abstract only. Patients were grouped as "normal SLR", "SLR with extensor lag" or "unable to SLR". Group sizes are not in the abstract.

Result: the only MPFLR data are small, mostly adolescent, and sagittal or power-based. No MPFLR study gives a valgus, trunk or pelvis threshold. No study links a pattern to recurrence.

### 2.2 Evidence for PFP, ACL and healthy people (BORROWED)

- PFP guideline, Willy 2019 (JOSPT 49(9), https://doi.org/10.2519/jospt.2019.0302). I opened the PDF at orthodiv.org and read the text.
  - A subcategory of PFP has "movement coordination deficits". The guideline diagnoses it "with a fair level of certainty" when the patient shows "excessive or poorly controlled knee valgus during a dynamic task". It gives no angle.
  - It says clinicians must test lower-limb movement coordination with squats, step-downs and the single-leg squat (Grade B).
  - It reports a video method that sorts FPPA into valgus (more than 10 degrees), varus or no change. Kappa was 0.75 to 0.90 between raters (athletes, N = 30, a cited study).
  - Grade B recommendation against visual biofeedback on lower-limb alignment during hip and knee exercises. The basis is one high-quality trial. Pain, function and step-down mechanics did not differ between groups.
- Neal 2016 (Gait Posture, https://doi.org/10.1016/j.gaitpost.2015.11.018). Abstract only. 28 studies in runners with PFP. Moderate evidence links PFP to more peak hip adduction and more contralateral pelvic drop.
- Pallone 2026 (J Exp Orthop, https://doi.org/10.1002/jeo2.70880). Abstract only. In the single-leg squat, females with PFP had 4.93 degrees more peak hip adduction and 5.74 degrees more knee abduction than males. Pelvic drop did not differ.
- Cronström 2016 (Sports Med, https://doi.org/10.1007/s40279-016-0519-8). Abstract only. In healthy people, less trunk strength, less ankle motion and less gluteus maximus activity link to more knee abduction (r of -0.34 or more).
- ACL, Hewett 2005 (Am J Sports Med, https://doi.org/10.1177/0363546504269591). 205 female athletes, 9 ruptures. Knee abduction angle at landing was 8 degrees greater in injured athletes. This is a lab study with 3D motion capture.
- ACL, Krosshaug 2016 (Am J Sports Med, https://doi.org/10.1177/0363546515625048). 710 players analysed, 42 ACL injuries. Knee valgus angle and abduction moment were not associated with injury. The authors call the drop jump a poor screening test.
- ACL re-injury, Paterno 2010 (https://doi.org/10.1177/0363546510376053). 56 athletes, 13 second injuries. A model of hip, knee and balance measures gave a C statistic of 0.94. The sample is small.
- Valgus can change with a cue. In 20 women with PFP, a 2D dynamic valgus index fell from 31.14 to 19.04 degrees. They had a cue to keep the knee over the foot (Scholtes 2017, https://pmc.ncbi.nlm.nih.gov/articles/PMC5455183/). Women without PFP did not change.

Conflict: Hewett 2005 supports a valgus risk link. Krosshaug 2016 does not. Both are ACL studies with 3D data.

### 2.3 Fault by fault

| Fault | Why it matters | Evidence label |
|---|---|---|
| Knee moves inward (valgus) in squat, step, landing | Theory: more patellofemoral stress. PFP studies show more valgus than controls. No MPFLR recurrence link. | BORROWED (PFP). OPINION for MPFLR |
| Quadriceps lag in SLR | Hsu 2025 lists SLR without lag as a protection-phase milestone. No measurement method or reliability found. | OPINION, level 5 review |
| Trunk lean | Part of QASLS and of lateral step-down scoring. Linked to knee abduction in healthy people through trunk strength. | BORROWED. OPINION for MPFLR |
| Pelvic drop | Moderate evidence in runners with PFP. No MPFLR data. | BORROWED (PFP) |
| Rep tempo | No source found. Rep time is a design proposal of the plan. | NONE |
| ROM compensation | Knee bend beyond the surgeon limit is a protocol matter. Loading rises with flexion in healthy people (S14 to S18). | BORROWED. The limit is set by the surgeon |
| Foot position | No source found for MPFLR. | NONE |
| Offloading of the operated knee | Seen in 3D lab studies of adolescents after MPFLR. Not visible in a 2D webcam. | MPFLR (small) |

## 3. Q2: Published criteria and thresholds

No tool below was validated in a patella-instability population. Every cut-off below was derived in another group.

### 3.1 FPPA (frontal plane projection angle)

What it measures: a 2D angle in a front view. Knee FPPA is 180 degrees minus the angle between the lines hip to knee and knee to ankle. A positive value means the knee moves inward.

| Item | Numbers | Source and population |
|---|---|---|
| Group means, single-leg squat | Controls 8.4 +/- 5.1. PFP 16.8 +/- 5.4 degrees | Herrington 2014, https://doi.org/10.1016/j.knee.2013.11.011. 12 women with PFP, 30 controls |
| Group means, hop landing | Controls 13.5 +/- 5.7. PFP 21.7 +/- 3.6 degrees | Same study |
| Cut-off, single-leg squat | 8.2 degrees. Sensitivity 87.5 percent, specificity 68.8 percent, AUC .85 | Bolgla 2023 (IJSPT 18(3):619-625, https://pmc.ncbi.nlm.nih.gov/articles/PMC10324282/). 16 women with PFP, 16 controls. One study. The cut-off was not validated on new data. Not instability |
| Cut-off, video classes | More than 10 degrees valgus, less than 10 degrees varus | Harris-Hayes, as reported by Willy 2019. Athletes, N = 30 |
| Reliability, PFP | Knee FPPA ICC 0.894 (single-leg squat). MDC 5.61 degrees. Landing ICC 0.614, MDC 11.90 degrees. Hip FPPA squat ICC 0.396, MDC 8.61 degrees | Nagahori 2026 (Methods Protoc 9(3):76, https://pmc.ncbi.nlm.nih.gov/articles/PMC13214613/). N = 10, front camera at 4.6 m, Kinovea, one rater |
| Validity against 3D | 2D dynamic valgus index with 3D index: r = 0.635 | Scholtes 2017 (PMC5455183). 36 women. Trial-to-trial ICC of the knee FPPA was 0.68 |
| Validity against 3D, review | r = 0.127 for the single-leg squat, 0.619 for landing | JOSPT 2018 review. UNVERIFIED: page returned 403, search summary only |

Reading: the difference between PFP and controls is about 5 to 8 degrees. The MDC of a human rater on video is 5 to 12 degrees. A cut-off near 8 degrees cannot sort one patient with confidence. It is a group tool. It has no validation in instability. It depends on squat depth.

### 3.2 QASLS (Qualitative Analysis of Single Leg Loading)

- Measures: 10 yes or no items on arm, trunk, pelvis, hip, knee and foot. The score is 0 to 10. A higher score means more suboptimal strategies. Source: Parry 2023 (IJSPT 18(5):1136-1146, https://ijspt.scholasticahq.com/article/88007-reliability-and-measurement-error-of-the-qualitative-analysis-of-single-leg-loading-qasls-tool-for-unilateral-tasks). I opened the abstract and results.
- Items include these:
  - "trunk leaning in any direction"
  - "loss of horizontal pelvic plane"
  - "weight-bearing thigh moves into hip adduction"
  - "noticeable valgus (patella toward 2nd toe)"
  - "significant valgus (patella past inside of foot)"
- Population: 14 healthy female dancers. Video scoring, three raters.
- Within-session ICC for the squat: 0.82 to 0.86. Between-session ICC for the squat: 0.69 to 0.87.
- Inter-rater kappa for the squat was 0.13 to 0.74. For landing it was 0.03 to 0.17. Intra-rater kappa was 0.85 to 1.00. The abstract and the tables disagree in places.
- Smallest detectable difference: 1.0 to 2.5 points.
- Cut-off: none. The paper gives only the detectable difference. The authors ask for rater training and clearer valgus definitions.
- Criterion validity with 3D (kappa 0.97 squat, 0.90 landing): UNVERIFIED, search summary only.
- Instability population: no.

### 3.3 LESS (Landing Error Scoring System)

- Measures: a count of landing errors in a jump-landing task, scored from front and side video.
- Padua 2009 (Am J Sports Med, https://doi.org/10.1177/0363546509343200). 2691 subjects. Reliability was "good to excellent" (the abstract gives no number). High scores matched different 3D kinematics.
- Padua 2015 (J Athl Train 50(6):589-595, https://doi.org/10.4085/1062-6050-50.1.10). 829 elite-youth soccer players, 7 ACL injuries. Injured players scored 6.24. Uninjured players scored 4.43. Cut-off 5. Sensitivity 86 percent. Specificity 64 percent.
- Seven injuries is a very small base for a cut-off. The cut-off is ACL screening, not rehab quality.
- OpenLESS (J Athl Train 2025, https://doi.org/10.4085/1062-6050-0666.24). Abstract only. Automated scoring agreed with expert raters at ICC 0.79 (healthy) and 0.88 (after ACL reconstruction). N = 92.
- Instability population: no. Landing is a later-phase task, not in the MVP.

### 3.4 Clinical rating of dynamic knee valgus and single-leg squat rating

- Zhang 2025 (PeerJ, https://doi.org/10.7717/peerj.20218). Abstract only. 58 people with lower-limb injury. Overall kappa for 2, 3 and 4 category scales: intra-rater 0.60, 0.35, 0.20. Inter-rater 0.60, 0.61, 0.33. More categories gave worse agreement.
- Cooke 2025 (BMJ Open Sport Exerc Med, https://doi.org/10.1136/bmjsem-2024-002389). Abstract only. 59 studies in athletes. The single-leg squat has moderate-certainty evidence for reliability and criterion validity. No test reached high certainty.
- Piva lateral step-down test (reported by Willy 2019): inter-rater reliability 0.67 to 0.81, rater agreement 80 percent. It was made for PFP.
- No rating scale has a validated cut-off for patients after MPFLR.

### 3.5 Y-balance and star excursion

- Plisky 2006 (JOSPT 36(12):911-919, https://doi.org/10.2519/jospt.2006.2244). 235 high school basketball players. ICC 0.82 to 0.87.
- Anterior reach difference of more than 4 cm: odds ratio 2.5 for injury. Girls with a composite reach below 94.0 percent of limb length: odds ratio 6.5.
- It measures reach and balance, not form. It needs a measured floor reach. In MPFLR it is a return-to-sport item (Hsu 2025, Kang 2026). Kang 2026 (https://doi.org/10.1002/ars2.70110) found it in 2 of 6 studies. Reported cut-offs are borrowed.
- It is out of scope for a webcam in the MVP.

Summary: for form, the best-supported tools are observer scales (QASLS, LESS, Piva). They use yes or no items. They have no cut-off for MPFLR. No tool replaces a clinician-set rule.

## 4. Q3: Validity of 2D video and pose estimation

### 4.1 Studies with numbers

| Study | Measure and view | Model and setup | Population and reference | Result |
|---|---|---|---|---|
| Okuno 2026, Sensors 26(18):5890, https://doi.org/10.3390/s26185890 | Knee angle, side view, 2.5 m | MediaPipe highest complexity, 4032x3024 still photos, tablet on tripod | 20 healthy adults, 40 limbs. Goniometer | Bias +3.23 and -0.14 degrees. Limits of agreement +/-8.7 and +/-8.8. ICC 0.94 and 0.96. MDC 10.7 and 5.0. Success 94 and 98 percent |
| Iizuka 2026, https://doi.org/10.3389/fspor.2026.1831625 | Knee angle in squat, side view, 2.0 m | MoveNet Lightning in the browser, VGA webcam | 30 healthy men. 3D optical motion capture | Raw bias -10.6, RMSE 10.9 +/- 3.3 degrees. After a fitted linear correction: RMSE 3.9, limits about +/-8.1. The fit needs fixed camera distance, height and angle |
| Asaeda 2024, Heliyon 10(17):e36338, https://doi.org/10.1016/j.heliyon.2024.e36338 | Knee valgus, front view, 5 m, 100 Hz | MediaPipe Pose, 2D, Python | 15 healthy young men. Vicon. Drop landing from 20 cm | Absolute angle: bias -19.28 degrees. Change from first contact: bias 0.181 degrees, r 0.554 to 0.757. Absolute inter-rater ICC 0.02 to 0.32 early in landing. Change ICC 0.50 to 0.83 |
| Ino 2024, J Sports Sci Med 23(3):515-525, https://doi.org/10.52082/jssm.2024.515 | Knee valgus, front view, 3 m, 120 Hz lab camera | OpenPose v1.7.0 | 21 healthy young adults. 3D motion capture. Drop vertical jump | Mean absolute error 2.4 degrees (CI 1.9 to 3.0). By event 3.4 to 5.2 degrees. r 0.85 to 0.97. Bias and limits of agreement not reported |
| Janisch 2026, BMC Musculoskelet Disord, https://doi.org/10.1186/s12891-026-09958-9 | Frontal knee deviation, single-leg squat, hop, landing | OpenPose and BlazePose | 16 healthy adults. Reference was a manual app, not 3D. Abstract only | OpenPose bias 0.87, limits -4.32 to 6.05. BlazePose bias -0.67, limits -8.76 to 7.42 degrees |
| Oliosi 2026, JMIR Mhealth Uhealth, https://doi.org/10.2196/82412 | Squat rep detection by camera angle and distance | Model not named in abstract | 44 students. Abstract only | Squat detection 61.5 percent overall. Best: diagonal view at 200 cm, 95.5 percent. Worst: side view at 90 cm, 0 percent |
| Pavlikov 2026, Sensors, https://doi.org/10.3390/s26165054 | Seated arm abduction, front view | BlazePose | 18 volunteers. IMU. Abstract only | Angle MAE 2.18 degrees. Compensation detection macro-F1 0.75 and 0.72 against two clinicians |

Other abstracts: Skvortsov 2026 (https://doi.org/10.3390/s26206651) found that rule-based MediaPipe cues for arm abduction were specific but "missed most simulated compensations". Kondo 2026 (PMC13268710) reports ICC 0.80 for lateral trunk flexion after calibration in 14 people with Parkinson disease. Neither is a standing leg task.

### 4.2 The two items that tech.md marks UNVERIFIED

- JMIR Preprint 102399 (https://preprints.jmir.org/preprint/102399). I cannot open the page text. Two fetches returned empty content. A direct download returned no content.
  - A search summary says: BlazePose Heavy, squat, sit-to-stand and single-leg stance, 15 healthy adults, lateral view. Dynamic ICC 0.982, mean absolute error 7.07 degrees, bias -5.12 degrees. Single-leg stance ICC 0.136.
  - That summary does not match the `tech.md` text (static angles of 30, 60, 90 and 120 degrees, RMSE about 15.49 degrees). I cannot confirm either text. UNVERIFIED. Do not quote the 15 degree figure.
  - The status is "submitted" and not peer reviewed.
- Heliyon (Asaeda 2024). I opened the full text at PMC11399566. It says:
  - 15 healthy men, 10 drop landings from 20 cm, front camera 5 m away, Vicon reference.
  - The absolute angle had an error of 18.83 to 19.68 degrees and no concurrent validity. For example, r was 0.016 at first contact.
  - The change from first contact had no significant difference from Vicon (bias 0.181 degrees) and correlated at r 0.554 to 0.757.
  - The authors conclude that absolute valgus has low validity and that the change from a reference time point must be reported.
  - So "19 degrees error" is true for the absolute angle only. The study supports within-person change.

### 4.3 What the numbers mean

- Knee bend in the side view: the error is about 9 degrees (limits of agreement) with a heavy model on still photos. With a light model in video it is 11 degrees raw. A fitted correction can reach about 4 degrees RMSE in one fixed setup. The error of `lite` in this app is NONE until T13 measures it.
- Frontal knee angle: the absolute value is not usable. A change from a baseline is usable in healthy people in a lab (error 2 to 5 degrees with OpenPose, 0.18 degrees bias with MediaPipe). Patient data and home setups are missing.
- Trunk lean, pelvic drop, hip adduction: no study with a standing leg task and a reference. Hip landmarks hide under clothes. Hip FPPA is the least reliable even for a human rater (ICC 0.396).
- Quadriceps lag: I found no pose study and no goniometer reliability study. The side-view error (9 degrees) is as large as a typical lag. I found no source for a clinical lag size. The size is UNVERIFIED.
- Rep timing: only frame rate limits it. I found no study. UNVERIFIED.
- Camera setup matters. In one study, a side view at 90 cm gave 0 percent squat detection (Oliosi 2026). The plan puts the camera at the side.

Reliable enough to show a patient, as an estimate with a margin: knee bend in the side view, rep time and "leg in view".
Not reliable enough: absolute valgus, trunk lean, pelvic drop, hip angles, small lag, any combined score.

## 5. Q4: Commercial and research systems

| System | What I opened | What it says | Label |
|---|---|---|---|
| Kaia Motion Coach | JMIR study (PMC8317029), press release | Front camera of a phone or tablet at about 2 m. A neural net finds pose. A rule-based expert system checks "spatiotemporal constraints" and triggers audio and visual corrections. Study: 24 patients with knee or hip osteoarthritis, 552 exercise sets, 6 exercises | Study is peer reviewed |
| Kaia, study numbers | Same | Two physiotherapists: kappa 0.607, 83.3 percent agreement. App with physiotherapist 1: kappa 0.551, 81.5 percent. With physiotherapist 2: kappa 0.626, 84.1 percent. The paper reports no joint-angle error. Authors work for Kaia | Study. Press release is a claim |
| Kemtai | kemtai.com/gold-standard | Claims 111 tracked points, per-rep score, FDA listed class II 510(k) exempt device. Page gives no accuracy figure and no study | CLAIM |
| Exer Health | exer.ai/product/health | Claims "AI-powered form correction", FDA registered class II software, validated. No numbers on the page | CLAIM |
| Sword Health | Not opened (HTTP 429) | A search summary says the system uses sensors and vision and gives feedback on form. UNVERIFIED | UNVERIFIED |
| Hinge Health | Not opened (404) | Nothing read | UNVERIFIED |

Research prototypes (abstracts only): Kim and Park 2026 (https://doi.org/10.2196/85126) trained a classifier on front-view single-leg squat videos. Physiotherapists labelled them "good, moderate, poor". Accuracy was 0.84 and AUC 0.92. The pose model is not named. Pavlikov 2026 and Skvortsov 2026 are in section 4.

What this shows:
- Form feedback from a camera is technically possible and agrees with physiotherapists at about the level that physiotherapists agree with each other.
- The ground truth is an opinion of a physiotherapist. No outcome data (pain, recurrence, function) show that app form feedback helps.
- "FDA listed" and "FDA registered" are not clearance. I did not check the FDA database.

## 6. Q5: Regulatory view

This is not legal advice. I list what the pages say.

### 6.1 EU MDR

I opened MDCG 2019-11 rev.1 (June 2025): https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf. The PDF text is compressed. I decoded the text streams to read it.

- Rule 11 text, as the guidance quotes it: software that gives information used for decisions with diagnosis or therapeutic purposes is class IIa. Class IIb or III apply if a wrong decision can cause serious or irreversible harm. Software that monitors physiological processes is class IIa. "All other software is classified as class I."
- The guidance says sub-rule 11a "is generally applicable to all MDSW" that has a medical purpose. Class I is the exception.
- If several sub-rules apply, the strictest applies (implementing rule 3.5).
- The guidance lists one example of medical device software. The software uses range of motion and other data of a patient with a musculoskeletal pathology. It recommends personalised rehabilitation exercises. The guidance says wellness or fitness apps do not qualify.
- The text does not mention form feedback, exercise correction or pose estimation. It does not say whether a "correct or incorrect" message changes the class.

My reading, UNVERIFIED: the class follows the intended purpose and the effect of a wrong output. A message that tells a post-surgery patient how to change an exercise is information for a therapeutic decision. It cannot lower the class. It can move the app toward 11a. The plan already says the class is not settled. Form feedback makes this question more pressing and not less.

I did not read Annex VIII on EUR-Lex in this session. I did not read MDCG 2021-24. An expert must set the class.

### 6.2 FDA

I downloaded and read three FDA PDFs. The text is compressed. I decoded it.

- Policy for Device Software Functions and Mobile Medical Applications, September 2022 (https://www.fda.gov/media/80958/download).
  - Enforcement discretion list item 4: "Software functions that use video and video games to motivate patients to do their physical therapy exercises at home".
  - Enforcement discretion also covers software that coaches or prompts patients to manage their health. The text excludes "specific treatment or treatment suggestions".
  - The list of regulated functions includes sensor software that measures parameters during CPR and gives "feedback about the quality of CPR". This is a loose analogy for feedback on the quality of an action. It is not about exercise.
- CDS guidance, 29 January 2026 (https://www.fda.gov/media/109618/download). Software that gives recommendations to patients or caregivers and not to health care professionals "meet the definition of a device". The non-device path needs a clinician user. Criterion 1 excludes software that processes "a pattern or signal from a signal acquisition system". I did not find a statement on camera video.
- General wellness, January 2026 (https://www.fda.gov/media/90652/download). The policy covers software "unrelated to" a disease or condition. Rehab after surgery relates to a condition. I read no text that places rehab inside this policy.

Reading, UNVERIFIED: neutral cues (depth, ceiling, rep time) sit nearer the coaching and prompting category. A statement that a movement is outside a range sits nearer a judgement of performance. The FDA text gives no line between the two. Ask an expert.

## 7. Table of criteria with evidence labels

Pose error is the starting margin. It comes from section 4 and is UNVERIFIED for `lite` in live video until T13.

| # | Criterion | Exercise | View | Evidence label | Pose error | Status |
|---|---|---|---|---|---|---|
| C1 | Knee bend above the surgeon ceiling (`maxFlexion`) | Mini squat, heel slide | Side | Limit: surgeon set. Loading link: BORROWED (S14 to S18) | About 9 degrees | Ship in MVP with margin and "cannot tell" |
| C2 | Depth below the target | Mini squat, heel slide | Side | Target: surgeon set | About 9 degrees | Ship in MVP with margin |
| C3 | Rep faster than the minimum time | All | Any | NONE for the number. Clinician sets it | Frame rate only (UNVERIFIED) | Ship in MVP |
| C4 | Leg not in view, or landmark visibility low | All | Any | Engineering rule | Not applicable | Ship in MVP |
| C5 | Hold time at a set angle | Seated knee extension | Side | Hold time: protocol. Angle: BORROWED | About 9 degrees | Ship with margin |
| C6 | Estimated knee angle at the top of the SLR | SLR | Side | MPFLR milestone (OPINION, level 5) | About 9 degrees. Larger than a small lag | Ship as a number with margin. Do not show "lag present" |
| C7 | Left and right symmetry of knee bend | Heel slide, squat | Side, two sets | BORROWED. Label "movement symmetry" | About 9 degrees for each side | Later. Plan item FR19 |
| C8 | Knee moves inward, change from the start position | Mini squat, step-down | Front | BORROWED (PFP). NONE for MPFLR | 2 to 5 degrees in a lab (OpenPose). 0.18 degrees bias (MediaPipe). Not tested at home | Needs a front view. Needs a clinician threshold. Record only |
| C9 | Knee moves inward, absolute angle | Any | Front | Cut-offs 8.2 and 10 degrees: BORROWED, one study, not validated | 19 degrees bias | Never show |
| C10 | "Patella past the inside of the foot" (QASLS item) | Squat, step-down | Front | BORROWED (QASLS, healthy dancers, no cut-off) | Not tested for pose | Needs a front view and a test. Wait |
| C11 | Trunk lean to the side | Squat, step, balance | Front | BORROWED. NONE for MPFLR | NONE for standing tasks | Wait for clinician threshold and a test |
| C12 | Pelvic drop | Single-leg tasks | Front | BORROWED (PFP runners) | Hip landmarks poor. Hip FPPA ICC 0.396 | Wait. Likely never in a webcam |
| C13 | Hip rotation, hip adduction angle | Any | Front | OPINION (Hsu 2025) | Not measurable in 2D (tech.md) | Never show |
| C14 | Landing mechanics, LESS score | Hop, landing | Front and side | BORROWED (ACL, cut-off 5, 7 injuries) | NONE | Not in MVP. Later phases need surgeon approval |
| C15 | Single-leg balance sway | Balance | Front | NONE. Single-leg stance ICC 0.136 (UNVERIFIED) | Poor | Wait |
| C16 | Any "good form" or "bad form" label, score, grade or colour verdict | All | Any | NONE | Not applicable | Never show |

## 8. Q6: Design proposal

### 8.1 Position

The app measures. The clinician defines what is acceptable. The app never defines "correct". A criterion has no meaning without a clinician-set limit. This keeps the guardrail intent: no validated threshold, so no app-made verdict.

### 8.2 The form-criteria layer

Each criterion is one record in the protocol file, checked by Zod.

| Field | Content |
|---|---|
| `id` | A fixed id from the list in section 7 (C1 to C6 in the MVP) |
| `exercise` | Exercise id |
| `view` | `side` or `front` |
| `measure` | Name of the measure, for example `kneeFlexionPeak` |
| `comparator` | `ceiling`, `floor`, `range` or `changeFromBaseline` |
| `limit` | The clinician-set number. No default. Absent means "record only" |
| `setBy` | Clinician name or role. Same rule as `authoredBy` |
| `evidence` | `mpflr`, `borrowed` or `unvalidated`, plus a source id |
| `marginDeg` | Error margin. Filled by the app, not by the clinician |
| `cueText` | Neutral text from a fixed list in the code. No free text |

Rules:
- A missing `limit` means the app records the value and shows "ask your care team". It shows no verdict.
- The Zod check rejects a protocol where `limit` is within the margin of the criterion. The message names the margin.
- `marginDeg` is the larger of two values. One is the 95 percent half-width of the error that T13 measures for the setup. The other is 9 degrees as a start value (Okuno 2026, UNVERIFIED for `lite`). Store the value and its source in the session record.
- A frontal criterion uses the change from a baseline taken in the first seconds of the set. It does not use the absolute angle.

### 8.3 Three result states and the margin rule

For a value `v`, a limit `L` and a margin `m`:

| State | Condition for a ceiling | What the screen shows |
|---|---|---|
| Within | `v` is at or below `L` minus `m` | The measured value and "within the range your care team set" |
| Cannot tell | `v` is between `L` minus `m` and `L` plus `m` | "Cannot tell. The camera error is larger than this difference" |
| Outside | `v` is at or above `L` plus `m` | "Outside the range your care team set" |

- Safety ceilings (C1) are different. A reading in the "cannot tell" band shows "close to your limit, stop". This accepts a false alarm to avoid a missed one. The plan cue "stop at your limit, do not push" stays.
- Do not count a rep for the target in the "cannot tell" band. Show the reason.
- If the visibility gate fails, or the camera view is wrong, the state is "cannot tell". Never default to "within".
- "Within" is not "safe". Show the fixed line "An in-range reading does not replace advice from your care team".

### 8.4 Allowed and banned wording

Allowed:
- "Measured: knee bend 52 degrees (estimated angle, not a medical measurement)."
- "Your care team set a limit of 50 degrees."
- "Outside the range your care team set."
- "Within the range your care team set."
- "Cannot tell. The camera error is larger than this difference."
- "Rep time 1.2 s. The minimum your care team set is 2 s."
- "Ask your care team" when there is no limit.

Banned, in words and in colour:
- correct, incorrect, good, bad, perfect, wrong, mistake, fault, error (as a verdict on the patient)
- score, grade, pass, fail, goal reached, risk of injury, dangerous, safe
- red and green as a verdict. Use one neutral colour for all states. Use an icon and text.
- A combined "form score" or a count that reads as a result, such as "8 of 10 reps correct". Show one line for each rep with its value.

The guardrail skill now bans "judge form" and the words "pass" and "fail". "Within" and "outside" a clinician-set range are a decision for the user. See section 9.

### 8.5 What ships and what waits

Ship in the MVP, as a measurement with a margin and a "cannot tell" state (C1 to C6):
- knee bend above the ceiling, depth below the target, rep time, leg in view, hold time and the SLR angle at the top.
- The plan item FR9 says "extension lag at the top". Change the cue to "estimated knee angle at the top". Show "lag" only if a clinician sets a limit that is larger than the margin.

Needs a second view (front), a test and a clinician threshold (C8, C10):
- knee inward as a change from the start position.
- Use a short front-view set. The patient turns to face the camera. One camera is enough. No new library.
- Record the value for the clinician. Do not show a live verdict. The PFP guideline gives a Grade B against visual alignment biofeedback. No MPFLR evidence supports live cues.

Must wait for a clinician-set threshold and its own validation (C11, C12, C15):
- trunk lean, pelvic drop, balance sway. No pose study exists for standing leg tasks.

Never show (C9, C13, C16):
- absolute valgus angle, hip rotation or adduction angle, any "good form" label or score.

### 8.6 Tests that prove the layer works

- Unit tests on synthetic landmarks for each state and each boundary (`L - m`, `L + m`).
- A noise test: a trace with error equal to `m` must give "cannot tell" for values inside the band.
- A Zod test: a limit smaller than the margin is rejected.
- A mutation check: remove the margin and the boundary tests must fail.
- T13: a Bland-Altman test for each criterion and each view on recorded video with a reference. The reference is a goniometer reading or a clinician. Record the limits of agreement in `docs/accuracy.md`.
- Update `claims-check.sh` for the banned words in 8.4 and for the new allowed phrases.
- No new dependency is needed.

## 9. Q7: Decisions for the user or a clinician

1. Does "within" or "outside" the range that a clinician set count as a verdict under the guardrail skill? The skill bans "pass" and "fail". If yes, the layer must show raw values only. If no, change the skill, FR20 and FR23.
2. Which criteria and which numbers does the surgeon or physiotherapist set for each exercise? This covers ceiling, target, minimum rep time, hold tolerance and the SLR tolerance.
3. Which clinician approves a limit? The protocol needs `setBy` and a date, the same as `approvedOn`.
4. Does a "cannot tell" band near a safety ceiling stop the rep (conservative), or only warn? I propose "close to your limit, stop".
5. Do frontal criteria give a live cue or only a record for the clinician? The evidence supports a record. I propose a record.
6. Does the clinician see per-rep values only, or also counts of reps outside the range? The patient sees per-rep values only.
7. Is a second-view (front) set part of the first release or the next one? I propose the next one.
8. Is a small validation study with patients needed before form criteria go to a patient? It needs a goniometer or clinician reference and ethics approval.
9. Does the intended purpose statement change? An expert must read Rule 11 and set the class with form feedback included. Until then, form criteria stay behind the `PATIENT_USE_APPROVED` flag, or a second flag.
10. Are the values valid for adolescents? Most MPFLR data are from adolescents. Most pose data are from healthy young adults.

## 10. Items not verified

- JMIR Preprint 102399: the page text did not open. Both the `tech.md` summary and my search summary are UNVERIFIED and they disagree.
- JOSPT 2018 review on 2D frontal-plane kinematics (r = 0.127 and 0.619): HTTP 403. Search summary only.
- QASLS criterion validity with 3D (kappa 0.97 and 0.90): search summary only.
- Original LESS reliability numbers: the Padua 2009 abstract gives no number. The full text was not read.
- Sword Health (HTTP 429) and Hinge Health (404): no page was read.
- Janisch 2026, Oliosi 2026, Pavlikov 2026, Skvortsov 2026, Kondo 2026 and Kim and Park 2026: abstracts via Europe PMC only. Full texts were not read.
- Hsu 2025: I read 100,000 of 138,607 characters of the HTML page. I did not read the last 38,607 characters.
- Hsu 2026, Samuel 2025, Rab 2025, Riesenberg 2026, Sachdev 2026, Neal 2016, Pallone 2026, Cronström 2016, Zhang 2025 and Cooke 2025: abstracts through Europe PMC. A small model summarised the pages, so the numbers carry that risk.
- FDA and EU regulator PDFs: I decoded compressed text myself. The decoding is rough. I did not read EU MDR Annex VIII on EUR-Lex, MDCG 2021-24 or the FDA database for Kemtai and Exer.
- A clinical size for quadriceps lag, and any pose study on quadriceps lag: not found.
- Any study that links a movement pattern to recurrence after MPFLR: not found. The search was not systematic.
- Error of the `lite` model in live video on a webcam: no study found.
- All Europe PMC searches show only the first page of results. The searches are not exhaustive.

Downloaded files were treated as untrusted data. I decoded text from PDFs with a script that I kept outside the download folders. I ran nothing from the files.
