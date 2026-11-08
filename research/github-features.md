# GitHub repos as reference for the features of the MPFL app

Date of survey: 2026-11-08.

## How to read this file

- Repo data (stars, license, language, last push) came from the GitHub REST API on 2026-11-08. I used plain `curl` GET calls. The `gh` tool was not installed.
- The API allows 60 calls each hour without a token. I used about 51 of them. The limit reduced the number of repos that I opened.
- I read files through `raw.githubusercontent.com`. I did not clone and did not run any code.
- "License (API)" is the `license` field of the API. I did not open the LICENSE text unless the file says so. A value of "none" means that the API found no license file.
- A repo with no license is "all rights reserved". Use the idea only.
- UNVERIFIED means that I did not open the primary source. Some items came only from web search results.
- Verdicts: ADOPT (use the code), BORROW (use the pattern or idea), IGNORE.
- Stars are a snapshot. Almost every repo is new and small. Few have real users. I say so in each row.
- I did not re-open any repo from `research/apps.md`.
- A clinical accuracy figure in a repo is a claim, not a fact. Section 5 lists them.

## 1. Feature table

| # | Feature | Best repos found | Coverage |
|---|---|---|---|
| 1 | Rep counting and state machines | pose-rep-counter, repstate, repcount | Good for squat and lunge. No heel slide or leg raise in a working app. |
| 2 | Form cues from angles | pose-rep-counter, repcount | Good pattern. No project cites evidence for its thresholds. |
| 3 | Browser pose pipeline | repstate, pose-rep-counter, mediapipe-samples-web, goniocam | Good. Worker code exists only as an official sample. |
| 4 | Program and protocol data model | Stride-frontend | Partial. No phase or progression rule schema found. |
| 5 | Patient and clinician dashboards | Stride-frontend, pose-rep-counter | Partial. No read-only view of an exported file. |
| 6 | Local-first and privacy | health-tracker, almanac, repcount | Partial. No encrypted export found. |
| 7 | Test patterns for camera apps | pose-rep-counter, repstate, hjsblogger repo | Good for landmark replay. Fake webcam only in examples. |
| 8 | Accessibility | repcount, Stride-frontend | Partial. Live region and AA colour checks exist. |
| 9 | Validation and datasets | openkick, 3D-HPE-MediaPipe-Pose, KneE-PAD | Partial. Few data have a clear license. |

## 2. Kept repos

### 2.1 Rep counting, cues and pose pipeline (features 1, 2, 3, 7)

#### leonardo-carnevalli/pose-rep-counter
- URL: https://github.com/leonardo-carnevalli/pose-rep-counter
- License (API): MIT. Stars: 0. Last push: 2026-10-13. Language: TypeScript.
- Feature: a pure rep engine with rest and peak thresholds and hysteresis. Files: `src/lib/exercises/rep-engine.ts`, `catalog.ts`, `cues.ts`.
- Cues are data: `{ feature, aggregate: "min" | "max", op, threshold, message }`. The app checks them once for each finished rep.
- Gates: no person, wrong view, joint visibility below 0.5. Each gate shows a hint. A One Euro filter smooths each feature.
- Tests: Vitest files next to the code (`rep-engine.test.ts`, `cues.test.ts`, `summary.test.ts`). Playwright replay test `e2e/replay.spec.ts` plays recorded landmark files. `scripts/accuracy.ts` runs a noise sweep on synthetic sets.
- Its README says that the numbers test the counting logic, not MediaPipe. This is honest and useful.
- Squat cue "min knee > 100: Sink deeper" has no cited source. The wording judges the user ("Sink deeper"). The MPFL app must not copy this wording (FR23).
- Reuse: pattern, and code under MIT. Keep the copyright notice.
- Risk: new repo, one author, no users. Quality looks high from the file list and the README. I did not run the tests.
- Verdict: ADOPT the engine pattern. Rewrite the cue wording. Read first.

#### montasim/repstate
- URL: https://github.com/montasim/repstate
- License (API): MIT. Stars: 1. Last push: 2026-10-10. Language: TypeScript.
- Feature: a deterministic state machine in `src/features/rep-counter/domain/rep-engine.ts`. States are IDLE, READY, LOST and more. Time comes only from `frame.t`.
- Exercise as data (`domain/exercises.ts`): joint triplets, `downAngle`, `upAngle`, `minDwellMs` (200), `minVisibility` (0.6), and a hint for lost tracking.
- Smoothing: EMA with alpha 0.5. The engine goes to LOST after 3 frames of low visibility.
- Architecture: `ui -> application -> domain`. ESLint blocks browser imports in `domain`. Ports for `PoseDetector`, `FrameSource` and `FrameScheduler` allow a fake clock and fake detector in tests.
- Tests: recorded landmark fixtures `fixtures/landmarks/*.json` with ground-truth counts in CI. Script `scripts/record-fixtures.mjs` records them. A benchmark JSON in `benchmarks/` holds inference time (p50 12.4 ms, p95 13.8 ms on one laptop with GPU). This is a claim for one device.
- Adaptive inference budget: `application/inference-budget.ts`. GPU to CPU fallback and first-frame warm-up in `infrastructure/`.
- Risk: the demo clips are third-party footage with an unconfirmed license (README). Do not copy the clips.
- Verdict: BORROW the ports and fixtures pattern. Code is MIT. Read first.

#### SAMARTHJAISWAL/repcount
- URL: https://github.com/SAMARTHJAISWAL/repcount
- License (API): MIT. Stars: 0. Last push: 2026-11-04. Language: TypeScript (Vite).
- Feature: `src/core/repCounter.ts`, `smoothing.ts` (EMA), `geometry.ts`, `feedback.ts`, `csv.ts`, `session.ts`. Tests in `tests/`.
- Angle math: the README says it converts normalized x and y back to pixels before it measures an angle. A test covers this. This is a real pitfall for a knee angle.
- State machine with a dead band and 3 dwell frames. It goes to Idle after 15 frames without the joint. Events "go deeper" and "lock out" mark partial reps.
- Cues carry stable ids so the UI does not announce one cue on every frame (`feedback.ts`).
- Accessibility: `index.html` has a `role="status"` element and a visually hidden `aria-live="polite"` announcer. The rep value uses `aria-live="off"`. The README lists keyboard keys and reduced-motion support. I did not test them.
- CSV export is protected against spreadsheet formula injection (README claim). I did not read the code of `csv.ts`.
- Risk: new, one author, no users.
- Verdict: BORROW. The CSV guard and the announcer pattern are the main gains. Code is MIT.

#### z4zaheer/goniocam
- URL: https://github.com/z4zaheer/goniocam
- License (API): none. Stars: 1. Last push: 2026-11-02. Language: HTML (one file, `index.html`).
- Feature: knee flexion shown as `180 - interior angle`, with left and right, a One Euro filter class, and a visibility gate (`VIS_MIN`). The README says "Not a validated replacement for a universal goniometer".
- Reuse: idea only. The `180 - interior` definition matches the clinical flexion value that the MPFL app needs.
- Verdict: BORROW the idea. Do not copy code.

#### M7maxSelim/heel-slides-rehab-system
- URL: https://github.com/M7maxSelim/heel-slides-rehab-system
- License (API): none. Stars: 0. Last push: 2026-04-28. Language: JavaScript.
- Feature: the only repo that I found with a heel slide. Files: `angleCalculator.js`, `feedbackEngine.js`, `videoProcessor.js`. I read only two files.
- `feedbackEngine.js` speaks a cue with `speechSynthesis` and a 3000 ms cooldown for the same message. The angle code uses 2D `acos`.
- README is empty. I did not find thresholds, tests or evidence.
- Verdict: BORROW the idea of a speech cooldown. IGNORE the rest.

#### google-ai-edge/mediapipe-samples-web
- URL: https://github.com/google-ai-edge/mediapipe-samples-web
- License (API): Apache-2.0. Stars: 109. Last push: 2026-11-08. Language: TypeScript.
- Feature: `src/workers/pose-landmarker.worker.ts`. A web search result says that it calls `detectForVideo(bitmap, timestampMs)` in a worker. I did not open the file. UNVERIFIED.
- Reuse: pattern for a Web Worker. Capture `createImageBitmap(video)` on the main thread. Send it to the worker. Send landmarks back.
- No React plus worker plus fake-camera example exists in my results.
- Verdict: ADOPT as a pattern when the main-thread loop is too slow. The plan does not need a worker for the MVP.

#### pmagnomuller/posture-tracker
- URL: https://github.com/pmagnomuller/posture-tracker
- License (API): none. Stars: 0. Last push: 2026-04-23. Language: TypeScript (Vite, plus Tauri).
- Feature: a Vite app with Pose Landmarker. It calibrates a baseline, then warns with a beep, a notification and a banner after sustained bad posture (README). I did not open the code.
- Verdict: BORROW the idea of "sustained for N seconds before a cue". This reduces false cues.

#### casiez/OneEuroFilter
- URL: https://github.com/casiez/OneEuroFilter
- License (API): none (UNVERIFIED: I did not open the repo files). Stars: 267. Last push: 2026-08-05. Language: C++.
- Feature: the reference of the One Euro filter from the authors. The plan has its own 30 line filter.
- Verdict: BORROW the algorithm description only. Check the license before any copy.

### 2.2 Data model, dashboards and clinician view (features 4, 5, 8)

#### julienjave/Stride-frontend
- URL: https://github.com/julienjave/Stride-frontend
- License (API): Apache-2.0. A `LICENSE` and a `LICENSE-CLDR.txt` exist. Stars: 0. Last push: 2026-11-07. Language: TypeScript (React 19, Vite, TanStack Query, shadcn/ui).
- Feature: a physiotherapy app. A practitioner builds a program, assigns it, and sees alerts "For review". The patient does sessions. The README says the app shows hand-drawn charts of pain and mobility over time, and range-of-motion assessments.
- Files: `src/alerts/`, `src/assigned-programs/`, `src/range-of-motion/`, `e2e/range-of-motion.e2e.ts`, `e2e/timer.e2e.ts`. Many `*.test.ts(x)` files test text and rules.
- Design rule in the README: "The screen arranges and words; it never judges". This matches FR23 and NFR2 of the plan.
- The README says every colour pair is checked against WCAG AA. I did not run the check.
- Limits: it needs the separate `Stride-backend` repo (not checked). It uses accounts and a server. The MPFL app has neither. The data model for phases and progression is not in this repo. I did not find it.
- Verdict: BORROW the screen structure, the text tests and the "never judges" rule. Code is Apache-2.0 but coupled to its API.

#### jayrodgalaus/health-tracker
- URL: https://github.com/jayrodgalaus/health-tracker
- License (API): none. Stars: 0. Last push: 2026-11-08. Language: TypeScript (React, Vite, Dexie).
- Feature: `src/data/backupRepository.ts`. The export has `formatVersion`, `exportedAt`, `app.schemaVersion` and all tables. `validateBackup` runs before and after. The import validates first, then runs `clear` and `bulkAdd` in one transaction. Failure rolls back all stores.
- A web search result says the README states that the file is not encrypted. UNVERIFIED.
- Tests: `backupRepository.test.ts` and more in `src/data/`.
- Verdict: BORROW the export envelope and the all-or-nothing import. Idea only.

#### chaya2025/almanac
- URL: https://github.com/chaya2025/almanac
- License (API): none. Stars: 0. Last push: 2026-10-04. Language: TypeScript (React, Dexie, Recharts, Zod, PWA).
- Feature: `src/db/schema.ts`, `src/lib/backup.ts`, `src/lib/autobackup.ts`. I read only the file list and the search summary. Content UNVERIFIED.
- Same stack as the MPFL plan. A useful example of Dexie plus Recharts plus Zod together.
- Verdict: BORROW the idea. Read the code before relying on it.

### 2.3 Fake webcam tests (feature 7)

#### hjsblogger/audio-video-mocking-with-playwright
- URL: https://github.com/hjsblogger/audio-video-mocking-with-playwright
- License (API): none. Stars: 0. Last push: 2026-10-15. Language: JavaScript.
- Feature: Chrome launch flags `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream` and `--use-file-for-fake-video-capture`. A search result says it checks a 352x240 frame size from a `.y4m` file. I did not open the files. UNVERIFIED.
- Search results say that Chrome accepts `.y4m` (4:2:0 only) and `.mjpeg`. This works in Chromium only. These facts are UNVERIFIED. Test them in T0.
- Verdict: BORROW the idea. The Playwright docs and Chrome flags are the real source. IGNORE the repo as code.

### 2.4 Validation and datasets (feature 9)

#### SlightlyDazed/openkick
- URL: https://github.com/SlightlyDazed/openkick
- License (API): GPL-3.0. **Flag: do not copy code.** Stars: 0. Last push: 2026-11-05. Language: Python.
- Feature: `validation/` and `docs/VALIDATION.md` compare MediaPipe angles with the public OpenCap dataset (marker-based lab, OpenSim angles). Command: `python -m validation.opencap --engine mediapipe --trials squats1 --plots`.
- Claim in the README: with one camera in 2D, the knee mean absolute error is 7 to 10 degrees. The knee reads 4 to 9 degrees less flexion than the lab in squats, sit-to-stand and jumps. The side cameras were 30 to 40 degrees off a true side view.
- Claim: the elbow is not valid. The README lists limits. This is a good model of how to report accuracy.
- Risk: the numbers are the claim of one author. The study has 9 participants and healthy movements. It has no seated knee extension or heel slide.
- Verdict: BORROW the method and the report layout (idea only, GPL). Read first.

#### carolinaclemente00/3D-HPE-MediaPipe-Pose
- URL: https://github.com/carolinaclemente00/3D-HPE-MediaPipe-Pose
- License (API): BSD-3-Clause. Stars: 0. Last push: 2024-01-04. This is about 2.8 years ago. I keep it because the idea is unique.
- Feature: Qualisys motion capture (truth) against MediaPipe Pose for 8 physiotherapy exercises. The list includes seated knee flexion and extension. Data are on Zenodo, DOI 10.5281/zenodo.10408307. The license of the data is UNVERIFIED.
- Claim in the README: MAPE 14.9 to 25.0 percent for the best exercises. Seated knee extension was hard (occlusion, unusual pose).
- Verdict: BORROW. Open the Zenodo record and read its license before any use of the data.

#### ounospanas/KneE-PAD
- URL: https://github.com/ounospanas/KneE-PAD
- License (API): none. Stars: 6. Last push: 2024-10-23. This is about 2.0 years ago. I keep it because it is a knee dataset.
- Feature: code to load a knee rehabilitation dataset (seated leg extension and squat). A search result says the data come from wearables, not video, and has a paper in Scientific Data. UNVERIFIED. The license of the data is UNVERIFIED.
- Verdict: BORROW ideas. It cannot test a camera angle.

#### Sports2D (davidpagnon/Sports2D)
- URL: https://github.com/davidpagnon/Sports2D
- License (API): BSD-3-Clause. Stars: 345. Last push: 2026-11-06. Language: Python.
- Feature: joint angles from video or webcam in 2D. I grepped the README only. I did not verify its accuracy claims. UNVERIFIED.
- Verdict: BORROW for offline comparison of angles. Not for the browser.

#### eyyoibo/CSE396-Group11-Knee-Goniometer
- URL: https://github.com/eyyoibo/CSE396-Group11-Knee-Goniometer
- License (API): none. Stars: 1. Last push: 2026-10-28. Language: Python.
- Feature: a search result says that it pairs a wearable knee goniometer with a MediaPipe knee angle for cross-checks. I did not open it. UNVERIFIED.
- Verdict: BORROW the idea of a cheap reference device for T13.

## 3. Datasets (not repos)

All license values in this section come from search results. I did not open the records. UNVERIFIED.

| Dataset | License (search result) | Knee? | Verdict |
|---|---|---|---|
| IntelliRehabDS (Zenodo 4610859) | CC BY 4.0 | Mostly elbow and shoulder | IGNORE for knee tests |
| REHAB24-6 (Zenodo 13305826) | CC BY-NC 4.0, non-commercial | Squat, lunge, leg abduction | **Flag.** Do not use in a product. |
| KIMORE | No clear license found | Not checked | IGNORE until the license is known |

## 4. Checked and ignored

- brunobedo/mediapipe2dangle: GPL-3.0, 4 stars, push 2026-04-14. Hip and knee angles in a notebook. Do not copy.
- Gautham495/react-native-nitro-pose-exercises: MIT, 10 stars, push 2026-07-14. React Native, not a browser. Not opened.
- pmagnomuller and other new repos in the search with 0 stars and no license: idea only.
- Search for a heel slide and for a straight leg raise counter found one repo (section 2.1). No leg raise lag counter exists in my results.
- I found no repo with Web Worker plus React plus PoseLandmarker. I found no encrypted export for a Dexie app. A search result says MBombeck/HealthLog has AES-256-GCM, but it is a server app and source-available. UNVERIFIED.

## 5. Clinical accuracy claims (claims, not facts)

| Source | Claim | Note |
|---|---|---|
| openkick README | 2D knee mean absolute error 7 to 10 degrees. 4 to 9 degrees less flexion than the lab. | One author. 9 healthy participants. Squats, jumps and walking. |
| 3D-HPE-MediaPipe-Pose README | MAPE 14.9 to 25.0 percent for the best exercises. | Seated knee extension was poor. |
| repstate README | Inference p50 12.4 ms on one laptop. 9 of 9 lunges counted. | One device, two clips. |
| pose-rep-counter README | Exact counts up to landmark noise of 2 percent of frame height. | Synthetic sets, not real video. The README says so. |
| goniocam README | "Not a validated replacement for a universal goniometer". | A claim of limit. Copy the wording idea. |

None of these repos validates MediaPipe on MPFL patients. The plan value of 3 to 15 degrees stays UNVERIFIED.

## 6. Answers to the three questions

### (a) Five repos to read first

1. leonardo-carnevalli/pose-rep-counter. It has the engine, cues as data, replay e2e test and accuracy script in one MIT repo.
2. montasim/repstate. It has the ports, fake clock and recorded landmark fixtures with ground-truth counts.
3. SAMARTHJAISWAL/repcount. It has the pixel-aspect angle test, the live region and the CSV formula guard.
4. julienjave/Stride-frontend. It has the program, patient and clinician screens, the pain and mobility charts, and the "never judges" rule.
5. SlightlyDazed/openkick. It has the best accuracy report method. Read it for ideas only because it is GPL.

### (b) Features that no repo covers

- A protocol file with phases, targets, surgeon fields and a schema, in the style of this plan.
- A red-flag check before a session.
- A hold timer and a straight leg raise lag counter. Only one heel slide repo exists and it has no tests.
- A pain and swelling log tied to a session.
- A read-only clinician view that opens an exported file and holds it in memory.
- An encrypted export for a Dexie app.
- A fake webcam test that feeds a video through real MediaPipe and checks the angle. Existing repos replay landmarks or use a plain test pattern.
- A knee angle accuracy test on rehab poses (seated extension, heel slide, leg raise) with an open license.
- A WCAG 2.2 AA audit of a camera exercise screen with screen-reader cues.
- Evidence-based cue thresholds. No repo cites a source.

### (c) Licenses to watch

- GPL-3.0: openkick, mediapipe2dangle. Idea only.
- CC BY-NC 4.0 (search result): REHAB24-6. Non-commercial.
- No license (all rights reserved): goniocam, heel-slides-rehab-system, posture-tracker, health-tracker, almanac, hjsblogger repo, KneE-PAD, the knee goniometer repo.
- MIT or Apache-2.0 (code can be copied with a notice): pose-rep-counter, repstate, repcount, Stride-frontend, mediapipe-samples-web.

## 7. Limits of this survey

- Most repos are new (2026), small, and have one author. None has real users. Stars say little.
- I did not run any test or any code from these repos.
- I did not read the LICENSE text of any repo in this file. I used the API field.
- The API limit stopped deeper reads of almanac, Sports2D, the worker sample and the Playwright examples.
