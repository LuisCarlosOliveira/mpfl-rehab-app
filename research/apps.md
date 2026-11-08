# Survey of digital rehabilitation apps and open-source parts

Date of survey: 2026-11-08.

## How to read this file

- Repo data (license, stars, language, last commit) came from the GitHub API on 2026-11-08. The LICENSE text was read through the API.
- Commercial facts came from web search results. Most are company marketing pages. Treat them as claims.
- UNVERIFIED means that I was unable to open the primary source.
- Verdicts: ADOPT (use the code or data), BORROW (copy the ideas only), IGNORE.
- Stars change often. The numbers are a snapshot.

## 1. Commercial products

None of these products offers code that the MPFL app can reuse. The value is in the feature ideas and in the regulatory lessons.

### Sword Health (Thrive, Move, Bloom)
- Features: AI-guided exercise with motion sensors, a tablet, and a human physical therapist (PT) who adjusts the plan.
- US status: the company says "FDA-listed". No 510(k) clearance was found. Listing is not clearance.
- Evidence: the company reports more than 40 studies. One example is Correia et al., npj Digital Medicine, 2023, volume 6, article 121.
- No knee-specific trial of Thrive was found. UNVERIFIED for knee outcomes.
- Verdict: BORROW ideas. The model is a PT in the loop with an AI coach.

### Kaia Health
- Features: app-based exercise program, education, and a camera tool called Motion Coach.
- US status: the app has no FDA clearance. The Digital Therapeutics Alliance lists it under FDA enforcement discretion.
- EU status: sources say it is a CE-marked Class I device. UNVERIFIED against a primary source.
- Evidence: a 2019 RCT in npj Digital Medicine (low back pain, 42 versus 44 patients). A JMIR study compared Motion Coach with human PTs.
- Kaia is now linked to Sword Health. A secondary source describes a merger. UNVERIFIED.
- Verdict: BORROW ideas. The Motion Coach study is a useful method reference.

### Hinge Health
- Features: app, wearable sensors, coaching, and PT. TrueMotion gives camera-based exercise feedback.
- US status: the Enso device has 510(k) clearance. The S-1 filing says no clinical data were required for it.
- TrueMotion: the S-1/A says the FDA asked Hinge on 2025-04-22 about its marketing and its clearance status. The outcome is UNVERIFIED.
- Evidence: Journal of Pain Research RCTs on Enso (2021 and 2024). The American Journal of Managed Care (2023) reported fewer joint surgeries in 1,760 osteoarthritis participants.
- Verdict: BORROW ideas. The FDA letter shows that camera feedback claims draw attention from the regulator.

### Physitrack (PhysiApp)
- Features: exercise prescription software for clinicians. It has more than 18,000 filmed exercises, templates, and outcome questionnaires (PROMs).
- Status: CE-marked Class I software (press release, 2020-05-27). The company also says it holds ISO 13485 and an FDA Class 1 registration.
- Integration: Epic integration is mentioned. A German page mentions a FHIR/HL7 layer. No public exercise library API was found.
- Verdict: BORROW ideas. The clinician prescribes, the patient follows, and PROMs track progress. This is the closest model to the MPFL app.

### Exer Health (Exer Scan)
- Features: smartphone camera movement assessment for clinicians.
- Status: the company says it is Class II and 510(k)-exempt under 21 CFR 890.5050. It is "FDA Registered", which is not clearance.
- Warning: the FDA sent a warning letter on 2025-02-10. It said that AI claims to screen, diagnose, and treat disorders fall outside the exemption.
- Verdict: BORROW ideas, and read the letter before the app makes any diagnostic claim.

### Kemtai
- Features: computer-vision coach on any camera. Sources say it tracks 111 data points and supports more than 2,000 exercises. It sells an engine that other apps embed.
- Status: "FDA listed" and CE-marked, from a 2025 press release. No 510(k) was found.
- Evidence: self-reported figures only, for example 70 percent adherence. UNVERIFIED.
- Verdict: IGNORE as a dependency (commercial, closed). BORROW the real-time feedback idea.

### OneStep (gait analysis)
- Features: smartphone gait analysis. It is relevant to knee recovery tracking.
- Status: FDA registered and listed (maker: Celloscope Ltd). No 510(k) or De Novo was found.
- Evidence: peer-reviewed validation. The Sensors 2024 study found correlations mostly above 0.8 against an instrumented treadmill. Studies cover total knee arthroplasty (TKA).
- Verdict: BORROW ideas. Gait symmetry is a good outcome measure for knee rehab.

### Regulatory lesson for all products
- "FDA-listed" and "FDA-registered" are not clearance. Do not copy such wording without legal review.
- Claims decide the device class. Exercise guidance and movement measurement are lower risk than screening, diagnosis, or treatment claims.
- This lesson is a summary of the search results above. It is not legal advice.

## 2. Open-source pose estimation and exercise counters

### google-ai-edge/mediapipe
- URL: https://github.com/google-ai-edge/mediapipe
- License: Apache-2.0 (LICENSE read). Stars: 37,604. Language: C++. Last commit: 2026-11-07.
- Reuse: Pose Landmarker (BlazePose GHUM) gives 33 landmarks in the browser, on Android, and on iOS.
- Model license: the model card PDF says Apache-2.0. One source notes that the card text can refer to documentation only. Confirm the weights license before release.
- Risk: low. Accuracy for knee valgus from one camera is not proven. UNVERIFIED.
- Verdict: ADOPT.

### google-ai-edge/mediapipe-samples
- URL: https://github.com/google-ai-edge/mediapipe-samples
- License: Apache-2.0. Stars: 2,885. Language: Jupyter Notebook. Last commit: 2026-10-30.
- Reuse: working pose landmarker samples for web, Android, and iOS. A good starting skeleton.
- Risk: low. Samples are not production code.
- Verdict: ADOPT as sample code.

### tensorflow/tfjs-models (MoveNet, pose-detection)
- URL: https://github.com/tensorflow/tfjs-models
- License: Apache-2.0. Stars: 14,812. Language: TypeScript. Last commit: 2026-03-28.
- Reuse: MoveNet and BlazePose in the browser with one API. MoveNet is fast on weak phones.
- Model license: Kaggle lists Apache 2.0 for MoveNet. One source says the MultiPose card has no license line. Use SinglePose or confirm.
- Risk: low to medium. The repo gets few commits.
- Verdict: ADOPT as a fallback to MediaPipe.

### yakupzengin/fitness-trainer-pose-estimation
- URL: https://github.com/yakupzengin/fitness-trainer-pose-estimation
- License: MIT (LICENSE read, copyright 2024 Yakup Zengin). Stars: 112. Language: Python. Last commit: 2026-02-19.
- What it does: a Flask app with MediaPipe Pose. It has 18 exercises, each defined as a YAML finite state machine on joint angles.
- Form score: 40 percent angle, 30 percent tempo, 30 percent warnings (from the README page).
- Reuse: the YAML state-machine design for rep counting and the score formula. The MPFL app can copy the pattern.
- Risk: no knee-rehab exercises. Dependencies not checked (requirements.txt not opened). UNVERIFIED for transitive licenses.
- Verdict: BORROW ideas. Code can be copied under MIT if needed.

### DapCodes/Pose-Recognition-Exercise-Counter
- URL: https://github.com/DapCodes/Pose-Recognition-Exercise-Counter
- License: MIT (LICENSE read). Stars: 9. Language: Python. Last commit: 2026-05-30.
- Reuse: simple rep counting from landmarks. I did not open the code. UNVERIFIED quality.
- Risk: small project with one maintainer.
- Verdict: IGNORE. The yakupzengin repo is better.

### Small physiotherapy repos (all MIT, 0 to 2 stars)
- Sujata005/PhysioAI (Jupyter, last commit 2026-04-10).
- jashmi29/Al-Physiotherapy-Exercise-Tracker (TypeScript, last commit 2026-06-21).
- nilalochanbv/Physiowise-AI-... (JavaScript, last commit 2026-09-07).
- I read only the LICENSE files and metadata. I did not review the code. UNVERIFIED quality.
- Verdict: IGNORE. They are too new and too small to depend on.

### open-mmlab/mmpose
- URL: https://github.com/open-mmlab/mmpose
- License: Apache-2.0. Stars: 8,038. Language: Python. Last commit: 2025-08-04.
- Reuse: server-side pose models for offline research or evaluation.
- Risk: heavy dependencies. Not suited for a phone app. Individual model weights can have their own terms. UNVERIFIED.
- Verdict: BORROW for offline experiments only.

### Flagged licenses (do not use in the product)
- ultralytics/ultralytics (YOLO pose): AGPL-3.0 (LICENSE read). Stars: 63,210. Last commit: 2026-11-08. AGPL forces source release for network use. A paid license exists. Avoid.
- CMU-Perceptual-Computing-Lab/openpose: custom license, "Academic or non-profit organization noncommercial research use" (LICENSE read). Stars: 34,563. Last commit: 2024-08-03. Commercial use needs a paid license. Avoid.
- dfourmarvel/posekit: AGPL-3.0, 0 stars. Avoid.
- Verdict for all three: IGNORE.

## 3. Open exercise libraries

### yuhonas/free-exercise-db
- URL: https://github.com/yuhonas/free-exercise-db
- License: Unlicense, public domain (LICENSE.md read). Stars: 2,111. Language: Vue. Last commit: 2026-09-27.
- Content: more than 800 exercises as JSON with images, muscles, level, equipment, and instructions. A JSON Schema is included.
- Reuse: the data schema and the structure are a good template. The data is mostly gym strength exercises.
- Risk: the README gives no source for the images beyond a credit to the upstream dataset. Image rights are UNVERIFIED. The category list was not read, so rehab and stretching coverage is UNVERIFIED.
- Verdict: ADOPT the schema. BORROW the data. Do not ship the images until their origin is confirmed. MPFL rehab exercises need clinician-made content anyway.

### wrkout/exercises.json
- URL: https://github.com/wrkout/exercises.json
- License: Unlicense (LICENSE.md read). Stars: 646. Language: TypeScript. Last commit: 2025-02-16.
- Content: one folder per exercise, with build scripts for one JSON file or a PostgreSQL file. The README gives no image source. The commercial set at wrkout.xyz is separate.
- Verdict: BORROW ideas. It is the upstream of free-exercise-db.

### exercemus/exercises
- URL: https://github.com/exercemus/exercises
- License: MIT (LICENSE read). Stars: 51. Language: Python. Last commit: 2025-07-31.
- Content: I did not open the data. UNVERIFIED.
- Verdict: IGNORE until checked.

### wger-project/wger
- URL: https://github.com/wger-project/wger
- Code license: AGPL-3.0 (LICENSE.txt read). Stars: 7,242. Language: Python. Last commit: 2026-11-08.
- Data: exercise data is under Creative Commons licenses set for each entry (CC-BY-SA 3 or 4, CC0, CC-BY 4, ODbL). The API is at https://wger.de/api/v2. This came from search results and is UNVERIFIED at the source.
- Risk: AGPL for the code. Share-alike for much of the data.
- Verdict: BORROW ideas only. Do not copy code. Do not import data without a per-entry license check.

### kinetic-place/exercises-db
- URL: https://github.com/kinetic-place/exercises-db
- License: MIT (LICENSE read). Stars: 5. Language: not reported. Last commit: 2026-11-06.
- Content: not opened. UNVERIFIED.
- Verdict: IGNORE.

## 4. FHIR and clinical dashboards

### medplum/medplum
- URL: https://github.com/medplum/medplum
- License: Apache-2.0 (LICENSE.txt read). Stars: 2,785. Language: TypeScript. Last commit: 2026-11-07.
- Reuse: FHIR server, React components, and a clinician app. It can model patients, care plans, and questionnaires.
- Risk: large platform. Adopting it commits the project to its model. Hosting terms for the paid cloud were not read.
- Verdict: ADOPT if FHIR is a requirement. Otherwise BORROW the FHIR resource mapping (CarePlan, Questionnaire, Observation).

### hapifhir/hapi-fhir
- URL: https://github.com/hapifhir/hapi-fhir
- License: Apache-2.0 (LICENSE.txt read). Stars: 2,430. Language: Java. Last commit: 2026-11-06.
- Reuse: a Java FHIR server and model library.
- Risk: Java stack. This differs from the TypeScript direction of the MPFL app. The stack of the MPFL app is UNVERIFIED by this survey.
- Verdict: BORROW ideas. Use only if the backend is Java.

### Searches with no result
- Searches for "fhir rehabilitation dashboard" and "physical therapy exercise movenet" returned no repo. I found no open-source rehab dashboard that is worth reuse.

## 5. Open datasets

### UI-PRMD (University of Idaho)
- URL: https://zenodo.org/records/23104965
- License: Open Data Commons PDDL 1.0 (read on the Zenodo record). Version 1.0, 2018-01-11. Size: about 1.3 GB.
- Content: 10 healthy subjects, 10 repetitions each, 10 rehabilitation movements. It has correct and incorrect versions. Data came from Vicon and Kinect.
- Reuse: test data for a rep counter and for a quality score. It includes incorrect movements.
- Risk: healthy subjects only. No MPFL patients. The movements are general, not knee-specific. The number of knee movements is UNVERIFIED.
- Verdict: ADOPT for algorithm tests.

### KiMoRe
- Content: Kinect video and joint data of rehabilitation exercises with clinical scores.
- License: not found. UNVERIFIED. Read the official terms before use.
- Verdict: BORROW ideas until the license is known.

### QEVD-FIT-COACH (Qualcomm)
- URL: https://www.qualcomm.com/developer/software/qevd-dataset
- License: Qualcomm Data Research License (research use). Videos cannot be redistributed. I did not read the license PDF. UNVERIFIED terms.
- Verdict: IGNORE for a commercial product.

### Exercise metadata sets
- free-exercise-db and wrkout/exercises.json are public domain (see section 3). They hold exercise descriptions and images, not motion data.

## 6. Reuse summary

| Item | Verdict | License | Use |
|---|---|---|---|
| MediaPipe Pose Landmarker | ADOPT | Apache-2.0 | Pose landmarks on device |
| mediapipe-samples | ADOPT | Apache-2.0 | Starting code |
| tfjs-models MoveNet | ADOPT (fallback) | Apache-2.0 | Fast pose on weak phones |
| fitness-trainer-pose-estimation | BORROW | MIT | YAML state machine, form score |
| free-exercise-db | ADOPT schema, BORROW data | Unlicense | Exercise JSON schema |
| medplum | ADOPT if FHIR is needed | Apache-2.0 | FHIR resources and UI |
| UI-PRMD | ADOPT | PDDL 1.0 | Test data for counters |
| Physitrack | BORROW | Commercial | Prescribe, follow, PROMs flow |
| wger | BORROW ideas only | AGPL-3.0 and CC per entry | Do not copy |
| Ultralytics, OpenPose | IGNORE | AGPL-3.0, non-commercial | Avoid |

## 7. Gaps and next steps

- No open source project covers knee or MPFL rehab. The exercise content and the phase rules need clinician input.
- Next step 1: check the image origin in free-exercise-db before any use.
- Next step 2: test MediaPipe knee angle accuracy on a phone with a goniometer or a reference video.
- Next step 3: open requirements.txt of fitness-trainer-pose-estimation and read each dependency license.
- Next step 4: choose the claim wording of the app with regulatory review, using the lessons in section 1.
