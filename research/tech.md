# Technology research: webcam knee rehabilitation app

Date of research: 2026-11-08. This text is not legal advice. It is not a medical device assessment. Ask a regulatory expert before you make a medical claim.

Marks used in this file:
- VERIFIED: I opened the source in this session.
- UNVERIFIED: I did not confirm the item. Check it before you rely on it.

## 1. Recommendation

| Layer | Choice | Version (npm, 2026-11-08) | License |
|---|---|---|---|
| Pose model | MediaPipe Pose Landmarker, model `lite` first, `full` as an option | `@mediapipe/tasks-vision` 1.2.2 | Apache-2.0 (package) |
| Front end | Vite + React + TypeScript | Vite 8.3.6, React 19.3.1, TypeScript 7.0.2 | MIT, MIT, Apache-2.0 (TypeScript: UNVERIFIED) |
| Charts | Recharts | 3.10.1 | MIT |
| Local storage (MVP 0) | IndexedDB through Dexie | 4.4.7 | Apache-2.0 |
| Shared data (MVP 1) | Supabase (hosted Postgres, Auth, row level security), EU region | `@supabase/supabase-js` 2.119.0 | MIT |
| Unit tests | Vitest | 5.1.0 | MIT |
| Browser tests | Playwright with a fake webcam video | `@playwright/test` 1.65.0 | Apache-2.0 |

All versions come from `npm view <package> version` and `npm view <package> license` on 2026-11-08. They are VERIFIED. The TypeScript license was not queried (UNVERIFIED).

Reasons:
1. All video processing runs in the browser. No video leaves the device. This lowers the privacy risk the most.
2. MediaPipe gives 33 landmarks and a ready browser API. It needs no model conversion.
3. A hip-knee-ankle angle needs only three landmarks. The math is 10 lines of code.
4. A static front end has no server to patch. The first release can ship with no back end.
5. A clinician dashboard needs data from many patients. Local storage cannot do this. Supabase adds this with the least code.

Biggest risk: the knee angle from a 2D webcam is not a clinical measurement. Published errors range from about 3 degrees to about 15 degrees depending on the study and the setup. See section 3.

## 2. Pose estimation in the browser

### 2.1 Options compared

| Option | Keypoints | Source facts | Verdict |
|---|---|---|---|
| MediaPipe Pose Landmarker (Tasks Vision) | 33, with 3D world landmarks in meters | VERIFIED on the official page | Choose |
| TensorFlow.js MoveNet | 17 | README says "50+ fps on modern laptops and phones" (VERIFIED, vendor claim) | Reject |
| TensorFlow.js BlazePose (`@tensorflow-models/pose-detection` 2.1.3, Apache-2.0) | 33 | Package has a peer dependency on `@mediapipe/pose ~0.5.0` (VERIFIED). Whether the old package is maintained: UNVERIFIED | Reject |
| TensorFlow.js PoseNet | 17 | Older model. Supports many people | Reject |
| Other (OpenPose, HRNet, ViTPose) | varies | Server-side or heavy. Not tested for browser use | Reject |

Why MediaPipe wins:
- The 33 landmarks include hip, knee, ankle, heel and foot index. MoveNet has no heel and no foot index. Heel and foot index help to find the lower-leg direction.
- Tasks Vision is the current MediaPipe web API. The old `@mediapipe/pose` solution is legacy. The MediaPipe docs page states that support for some legacy solutions ended on 2023-03-01 (VERIFIED).
- One package gives both the WASM runtime and the API. TensorFlow.js adds a second runtime and a backend choice.

I did not measure FPS on a laptop or a phone. The official page gives no latency number (VERIFIED, "not stated"). Measure FPS on the target phones before you commit. Frame rate: UNVERIFIED.

### 2.2 MediaPipe facts (VERIFIED on official pages)

Source: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker and https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js

- Install: `npm install @mediapipe/tasks-vision`.
- The web API supports only `IMAGE` and `VIDEO` running modes. For a webcam, use `runningMode: "VIDEO"` and call `detectForVideo(video, performance.now())` in a `requestAnimationFrame` loop.
- Defaults: `numPoses` is 1. The three confidence thresholds are 0.5.
- Output per pose: 33 `landmarks` with normalized `x` and `y` in 0 to 1, plus `z`, `visibility` and `presence`.
- `worldLandmarks` are in meters. The origin is the hip midpoint.
- The page lists model input sizes: detector 224 x 224 x 3 and landmarker 256 x 256 x 3, float16.
- Model URL pattern: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_{lite|full|heavy}/float16/latest/pose_landmarker_{lite|full|heavy}.task`

Model download size (measured with `curl -I` on 2026-11-08, header `content-length`):

| Model | Size |
|---|---|
| lite | 5,777,746 bytes (about 5.8 MB) |
| full | 9,398,198 bytes (about 9.4 MB) |
| heavy | 30,664,242 bytes (about 30.7 MB) |

The WASM files add more. The npm tarball unpacked size is about 31.3 MB (VERIFIED), but the browser loads only the WASM files it needs. The real WASM download size: UNVERIFIED.

Hosting rule: copy the `.task` file and the WASM folder to your own host. Do not use `@latest` and do not load from a CDN in production. A pinned self-hosted copy gives repeatable results and removes a third party from the privacy story. The official example uses jsDelivr with `@latest` (VERIFIED).

Model license: UNVERIFIED. The package is Apache-2.0 (VERIFIED). The official page names a model card "BlazePose GHUM 3D" and gives no license text. I cannot read the PDF text. Read the model card before release.

### 2.3 Accuracy for knee flexion from a 2D webcam

Evidence I opened:

1. Sensors 2026, 26(18):5890, "Reliability and Validity of AI-Based Pose Estimation Algorithms for Assessing Lower-Limb Flexibility and Joint Range of Motion". DOI 10.3390/s26185890. Page: https://pmc.ncbi.nlm.nih.gov/articles/PMC13611076/ (VERIFIED).
   - 20 healthy adults, 40 limbs. Tablet on a tripod, side view, 2.0 m to 2.5 m away.
   - Knee angle from hip, knee and ankle landmarks. Reference: goniometer.
   - MediaPipe, active knee extension test: bias +3.23 degrees, limits of agreement about plus or minus 8.7 degrees.
   - MediaPipe, second knee test (MTT): bias -0.14 degrees, limits of agreement about plus or minus 8.8 degrees.
   - Minimal detectable change (95%): 10.7 and 5.0 degrees for the two knee tests.
   - Success rate 94% and 98%. The authors analyzed only the successful trials.
   - The authors say the values are not interchangeable with goniometer values.
   - Limits: young healthy people, good light, a lab, and a small sample.

2. JMIR Preprints #102399, "Validation of Single-Camera MediaPipe BlazePose for Knee Joint Angle Measurement". URL: https://preprints.jmir.org/preprint/102399. I cannot open the page text. The facts below come from a search summary only (UNVERIFIED, preprint, maybe not peer reviewed).
   - Heavy model. Static knee angles at 30, 60, 90 and 120 degrees.
   - Reported RMSE about 15.49 degrees. The model overestimated at shallow flexion and underestimated at deep flexion.

3. Heliyon, knee valgus at single-leg landing, https://www.cell.com/heliyon/fulltext/S2405-8440(24)12369-9. I did not open it. Only the search summary is known (UNVERIFIED). It reports a large valgus error (about 19 degrees) and advises use for change over time, not for absolute angle.

Reading of the evidence:
- Best case with a side view: errors of about 3 to 9 degrees. This is enough for rep counting and for trend lines.
- Worse case: errors up to about 15 degrees at fixed angles. This is not enough for a clinical range-of-motion record.
- Studies disagree. Do not claim goniometer accuracy in the app.
- Show the angle as "estimated". Track change over time for each patient on one setup.

Known limits (design rules):
- Camera angle: put the camera at the side, at knee height, with the leg in the image plane. A front view hides flexion. The 2D angle then shrinks.
- Distance: keep the whole leg in the frame. The study above used 2.0 m to 2.5 m.
- Occlusion: the other leg, loose clothes, a chair or a blanket hide landmarks. Use the `visibility` value. Skip frames with low visibility (below 0.5 as a start, UNVERIFIED value).
- 2D versus 3D: use the 2D `landmarks` for the angle in the image plane. `worldLandmarks` come from a model estimate, not from a depth sensor. Do not treat `z` as measured depth. A test on your own recordings must decide which set is better.

### 2.4 Privacy of on-device inference

- The model runs in the browser. The app never needs to send video frames to a server. This is a design choice that you must keep. It is not a guarantee of the library.
- Send only numbers (angle samples, rep counts, timestamps). Never send images.
- Self-host the model and the WASM files. Then no third party sees the page load.
- Prove it: a Playwright test can list all network requests during a session and fail on any media upload.

## 3. Angle computation and rep counting

Keep it simple. Three steps.

### 3.1 Angle

Use the hip (landmark 23 or 24), the knee (25 or 26) and the ankle (27 or 28). The numbers come from the MediaPipe landmark list (VERIFIED: IDs 0 to 32).

```ts
// Interior angle at the knee, in degrees. 180 means a straight leg.
export function kneeAngle(hip: P, knee: P, ankle: P): number {
  const ux = hip.x - knee.x, uy = hip.y - knee.y;
  const vx = ankle.x - knee.x, vy = ankle.y - knee.y;
  const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
}
```

Flexion is `180 - kneeAngle`. Scale `x` by the video aspect ratio before the math. The landmarks are normalized to the image width and height. Without this, the angle is wrong on a non-square video.

### 3.2 Smoothing: One Euro filter

- Paper: Casiez, Roussel and Vogel, "1 euro filter", CHI 2012, pages 2527 to 2530. DOI 10.1145/2207676.2208639 (confirmed by search, https://dl.acm.org/doi/10.1145/2207676.2208639).
- It is a first-order low-pass filter with a cutoff that adapts to the speed. It keeps lag low in fast moves and removes jitter in slow moves.
- Tuning advice from the authors library: set `beta` to 0 and `mincutoff` to about 1 Hz. Then raise `beta` until lag is low.
- Reference code: https://github.com/casiez/OneEuroFilter. The code is about 30 lines. Write it in the repo. An npm package `1eurofilter` 1.3.0 exists (version VERIFIED, quality UNVERIFIED). Prefer your own 30 lines. Fewer dependencies.
- Filter the angle, not each landmark. One filter, fewer parameters.

A simpler fallback is an exponential moving average. Use it only if the One Euro filter gives no gain on your recordings.

### 3.3 Rep counting: hysteresis state machine

Two thresholds and two states. The gap between the thresholds stops false counts from noise.

```
state = EXTENDED
if state == EXTENDED and flexion >= FLEX_ENTER:  state = FLEXED
if state == FLEXED  and flexion <= FLEX_EXIT:    state = EXTENDED, reps += 1
```

- Start values (not from a source, you must tune them): `FLEX_ENTER` = 60 degrees and `FLEX_EXIT` = 30 degrees. Let the clinician set the target for each exercise.
- Add a minimum time in each state, for example 300 ms. This removes spikes.
- Add a minimum range check: count a rep only if the peak flexion reached the target of the exercise.
- Pause counting when the leg is not visible. Show a message to the patient.
- Keep the logic as a pure function: `(state, sample) -> (state, event)`. A pure function is easy to test with Vitest.

## 4. App stack for an MVP

### 4.1 Two stages

| Stage | What | Backend |
|---|---|---|
| MVP 0 | Patient app only. Camera, angle, reps, history chart. Data in IndexedDB. Export a CSV or a PDF to show the clinician. | None |
| MVP 1 | Add accounts, clinician dashboard, shared data. | Supabase |

Build MVP 0 first. It tests the one risky part (pose quality) with no server cost and no health data in the cloud. A clinician can still review an exported file.

### 4.2 Front end

- Vite + React + TypeScript. The skill and docs for it are common. A static build runs on any static host.
- Alternative rejected: Next.js or another server-side framework. The app needs no server rendering. Camera and WASM code run only in the browser.
- Run the pose loop in the main thread at first. Move it to a Web Worker only if the UI drops frames. (A video element cannot go to a worker directly. This adds code. Measure first.)
- The camera needs HTTPS or `localhost` for `getUserMedia`. This browser rule is UNVERIFIED in this session, but it is widely documented. Check MDN.
- PWA: `vite-plugin-pwa` 1.3.0 is an option for offline use (version VERIFIED, behavior UNVERIFIED). Add it only after MVP 0 works.

### 4.3 Charts

- Recharts 3.10.1, MIT. Line chart for flexion per session and bar chart for reps per day.
- Alternatives rejected: Chart.js and D3. They work, but Recharts fits React with less code. Not a strong preference.
- Accessibility: add a data table next to each chart. See section 6.

### 4.4 Back end and database (MVP 1)

| Option | For | Against |
|---|---|---|
| Supabase | Postgres, Auth and row level security in one service. Little code. | A vendor service. Check data region, contract and cost (UNVERIFIED). |
| Node (Fastify or NestJS) + Postgres | Full control | You write auth, sessions and access rules. More code and more upkeep. |
| Python FastAPI + Postgres | Good if the team knows Python | Same cost as the Node route. No gain for a browser app. |
| SQLite on a small server | Very simple | Single writer. You still write auth. Harder to host in a safe way. |

Choice: Supabase, in an EU region, for MVP 1.

Facts I opened (context7, Supabase docs):
- Row level security is a Postgres feature that Supabase documents. The docs show a policy that limits a user to rows where `auth.uid() = user_id`. Source: https://supabase.com/docs/guides/database/postgres/row-level-security (VERIFIED through the docs tool).
- The docs recommend `to authenticated` and `(select auth.uid())` in the policy (VERIFIED).

Data model (small):
- `profiles(id, role)` where role is `patient` or `clinician`.
- `care_links(patient_id, clinician_id)` gives a clinician read access.
- `sessions(id, patient_id, exercise, started_at, reps, peak_flexion, avg_flexion)`.
- `samples` (optional): raw angle samples. Store only if the clinician needs them. Less data is less risk.

Rules:
- A patient reads and writes only their own rows. A clinician reads only linked patients. Write both as row level security policies and test both.
- Do not put any health data in URLs, logs or analytics.
- Enable no third-party analytics in the first release.
- Supabase Auth plans, MFA support and EU hosting: UNVERIFIED. Check the current docs and the data processing agreement before you store real patient data.

Alternatives rejected:
- Own auth code: a security risk with no benefit.
- Peer-to-peer or file sync only: a clinician dashboard needs manual file exchange.

### 4.5 Hosting

- Front end: any static host with HTTPS. A host in the EU is easiest for the GDPR story. Provider choice: UNVERIFIED, no pricing checked.
- Back end: Supabase project in an EU region.
- Self-host the `.task` model and the WASM files with the static site. Set long cache headers and a pinned file name, for example `pose_landmarker_lite.task` copied into `/models/`.

## 5. Testing

### 5.1 Layers

| Layer | Tool | What it tests |
|---|---|---|
| Unit | Vitest 5.1.0 | `kneeAngle`, One Euro filter, rep state machine, with synthetic angle series |
| Component | Vitest + Testing Library | Charts and tables render. Dashboard rules. |
| Browser | Playwright 1.65.0 | Full flow with a fake webcam video |
| Pose accuracy | A script on recorded video | Angle error against a reference |
| Security | Playwright network check | No video upload, row level security rules |

### 5.2 Playwright with a fake webcam

Chromium flags (confirmed by several tool guides in a web search, UNVERIFIED in the official Chromium source):
- `--use-fake-device-for-media-stream` replaces the camera with a fake device.
- `--use-fake-ui-for-media-stream` skips the permission prompt.
- `--use-file-for-fake-video-capture=<path>` takes a `.y4m` or `.mjpeg` file. It needs the first flag.
- Make a file with `ffmpeg -i clip.mp4 -pix_fmt yuv420p clip.y4m` or `ffmpeg -i clip.mp4 clip.mjpeg`. Y4M must be 4:2:0. MJPEG files are smaller.

Playwright config (the `launchOptions.args` and `permissions` options are VERIFIED in the Playwright docs. The fake-media flags are extrapolated from them):

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  projects: [{
    name: 'chromium-fake-cam',
    use: {
      ...devices['Desktop Chrome'],
      permissions: ['camera'],
      launchOptions: { args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--use-file-for-fake-video-capture=tests/fixtures/squat-side.mjpeg',
      ] },
    },
  }],
});
```

Notes:
- Playwright warns that custom browser args are at your own risk (VERIFIED).
- Use Chromium for these tests. The flags are Chromium flags. Firefox and WebKit need another method.
- The video loop: one source says the file loops. Count reps with a known clip length and assert the exact count. Loop behavior: UNVERIFIED.
- Headless GPU: MediaPipe `delegate: "GPU"` can fail in headless CI. Allow `delegate: "CPU"` through a config flag for tests (UNVERIFIED, test it).
- Test clip rules: use a clip with a known number of reps. Record it yourself, with consent. Do not use clips of other people from the internet without a license.

### 5.3 Pose accuracy test on recorded video

1. Record 5 to 10 short side-view clips with known knee angles. Use a goniometer at fixed angles (for example 0, 30, 60, 90 and 120 degrees), or a tape marker on the leg.
2. Run the pose model offline on each frame (`runningMode: "VIDEO"` with fixed timestamps) in a Node or browser script.
3. Compute the angle with `kneeAngle`. Compare to the reference. Report bias, RMSE and the 95% limits of agreement (Bland-Altman).
4. Fail the test if RMSE rises above the limit that you set. Pick the limit from the evidence. The Sensors 2026 study shows limits of agreement of about plus or minus 9 degrees (VERIFIED).
5. Repeat for each model size (`lite`, `full`) and for each phone. Keep the clips out of git if they show faces. Store them in a private place.

## 6. Regulatory, privacy and accessibility notes

This is not legal advice. It lists the questions to ask an expert.

### 6.1 EU MDR (Regulation (EU) 2017/745)

- Definition (VERIFIED, consolidated text dated 2025-01-10, https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02017R0745-20250110): software is a medical device if the maker intends it for a medical purpose. The purposes include diagnosis, prevention, monitoring, prediction, prognosis, treatment or alleviation of disease, and monitoring or treatment of an injury or disability.
- Knee rehabilitation after an MPFL injury is treatment or monitoring of an injury. An app that claims this likely counts as medical device software. This is my reading, not a ruling (UNVERIFIED).
- Official guidance: MDCG 2019-11 rev.1, "Qualification and classification of software", June 2025. The Commission page lists it: https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en. PDF: https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf (I did not read the PDF, because the first guess at a link returned 404. The link comes from the Commission page.)
- Classification (Annex VIII, Rule 11): I cannot read the Rule 11 text in this session (UNVERIFIED). Software that gives information for treatment decisions can be class IIa or higher. Software that recommends exercise progression can fall in this group. Ask an expert.
- Secondary sources disagree on whether rev.1 raises or lowers the class of some software (Emergo by UL and Specculo, as seen in a search). Read the official PDF.
- A narrow intended purpose changes the result. Examples: "log the exercise and count reps" is different from "decide when the patient can progress". Write the intended purpose before you write features.

Design choices that reduce regulatory risk (the engineering side only):
- MVP 0: count reps, show angles, export data. The clinician decides the plan and the progression. The app makes no recommendation.
- Do not add an automatic progression rule in the first release.
- Keep the label "estimated angle, not a medical measurement".
- Even with this choice, the classification is not settled. An expert must confirm.

### 6.2 FDA (United States)

- Clinical decision support guidance, January 2026, final, docket FDA-2017-D-6569 (VERIFIED on the FDA page): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software. The page says the FDA digital health policies still apply to patient-facing software that meets the device definition. The four criteria are in the full PDF, which I did not read (UNVERIFIED).
- General wellness policy, January 2026, final (VERIFIED on the FDA page): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices. It covers low-risk products for a healthy lifestyle that are unrelated to the diagnosis, treatment or prevention of a disease. A rehabilitation claim after an injury is likely outside this scope (my reading, UNVERIFIED).
- Whether a U.S. launch needs a clearance, a De Novo request or none: UNVERIFIED. Ask an expert.

### 6.3 GDPR (Regulation (EU) 2016/679)

- Official text: OJ L 119/1, 2016-05-04 (VERIFIED): https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679. I read only the recitals there. The Article 9 facts below come from https://gdpr-info.eu/art-9-gdpr/ (VERIFIED, an unofficial copy).
- Article 9(1): processing of special categories of data is prohibited. "Data concerning health" is in the list. Rehabilitation data is health data.
- Article 9(2)(a): explicit consent for one or more specified purposes lifts the ban. Other bases exist, for example Article 9(2)(h) for care. I did not verify the text of (h) in this session (UNVERIFIED).
- Article 25 (data protection by design and by default) and Article 35 (impact assessment): I did not read the articles (UNVERIFIED). Recitals 78 and 91 relate to them (VERIFIED as topics). Plan a data protection impact assessment for MVP 1.
- Camera video of a person can be biometric or health data. On-device processing with no upload avoids most of this risk. Keep that rule.
- Basic list for MVP 1:
  - Explicit consent screen, export of user data, and erase of user data.
  - EU hosting and a data processing agreement with each vendor.
  - No raw video in storage. Access logs for clinician reads.

### 6.4 WCAG

- WCAG 2.2 is a W3C Recommendation, published 2024-12-12 (VERIFIED): https://www.w3.org/TR/WCAG22/. Levels are A, AA and AAA. Aim for AA.
- Contrast 1.4.3 (AA): at least 4.5:1 for normal text and 3:1 for large text (VERIFIED).
- Timing 2.2.1 (A): a time limit must be turned off, adjusted or extended, unless an exception applies (VERIFIED). A rest timer or a session timeout can hit this rule.
- 2.5.8 Target Size (Minimum) is a new AA criterion in 2.2 (VERIFIED as present). I did not read the minimum size (UNVERIFIED, check the text). Patients with a sore knee press buttons from a distance. Make buttons large.
- Camera pages are visual. Give audio or text cues for rep count and for "move into the frame". Keep the page usable with a keyboard.
- Charts need a table alternative. Test with Lighthouse and a screen reader.
- EU law that requires accessibility for private apps (European Accessibility Act): UNVERIFIED. Check scope and date.

## 7. Alternatives rejected (summary)

| Item | Reason |
|---|---|
| MoveNet | 17 keypoints, no heel or foot index |
| TF.js BlazePose | Same model family as MediaPipe, with an extra runtime and an old peer dependency |
| Server-side pose (OpenPose, HRNet) | Sends video to a server. More cost, more privacy risk |
| MediaPipe `heavy` model | 30.7 MB download. Slower. The one study that I cannot open used it and reported a large error (UNVERIFIED) |
| Next.js or another server framework | No need for server rendering |
| NestJS or FastAPI for MVP 1 | You write auth and access rules that Supabase gives |
| SQLite server | Single writer and you still write auth |
| Native mobile app | Two code bases or a cross-platform tool. The browser is the stated target |
| Automatic exercise progression | Raises the medical device class risk |

## 8. Open items before you build

1. Read the MediaPipe model card for the license. Model license: UNVERIFIED.
2. Measure FPS and angle error on the real target phones. No number was verified here.
3. Open the JMIR preprint and the Heliyon paper in full. Update section 2.3.
4. Read MDCG 2019-11 rev.1 and Annex VIII Rule 11. Get an expert opinion on the intended purpose.
5. Check Supabase EU hosting, MFA, data processing agreement and price.
6. Check the camera permission rules on iOS Safari and Android Chrome.

Sources: the links are inline in each section above.
