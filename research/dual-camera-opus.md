# Second camera (Android phone): Opus investigation

Date: 2026-11-08. Read-only investigation. No plan, skill or code file was changed. This is not legal advice and not medical advice.

Marks:
- VERIFIED: I opened the source in this session, and it states the fact.
- UNVERIFIED: I did not open a source for the claim, or the source does not state it.
- DERIVED: my own arithmetic or reading. It is not a published value.
- Source codes (R1 and so on) are in section 10.3.

## 1. Overview and verdict

Verdict: do not add a second camera to the MVP. A simultaneous second view is a valid idea for the later frontal set (FR24, C8), but it is not the KISS answer even there.

Reasons:
1. The MVP criteria C1 to C6 all use the side view (`research/form-opus.md` section 3). A front view cannot measure knee flexion, so it adds nothing to them.
2. C8 (knee moves inward, change from the start of the rep) needs a front view. It does not need the front view at the same time as the side view. Each view is analysed alone. One camera and a patient who turns for a short set give the same data (plan FR24).
3. No opened study covers two views for MPFL patients. The validated multi-camera tool (OpenCap) needs iOS, calibration and cloud processing. Each of these breaks a rule of this app (section 2.3).
4. Every connection design adds a failure mode that the patient must fix alone: a cable, a phone mode, Wi-Fi isolation, a locked phone, heat.

Ranking for the later frontal set, best first:

| Rank | Design | Use |
|---|---|---|
| 1 | One camera. Side set, then the patient turns for a front set. | Default. Already in the plan (FR24). No new technology. |
| 2 | Phone in Android USB webcam mode as a second `getUserMedia` device (option a). | Developer test first. Smallest code, no network, no new dependency. |
| 3 | Phone runs the pose model and sends only landmark numbers over a WebRTC data channel, paired by QR (option b). | Only if patients need simultaneous views and a real-device spike passes. Highest build and support risk. |
| 4 | Phone sends video to the laptop over WebRTC (option c). | Reject. Video leaves the phone, and it has all the pairing risk of option b. |
| 5 | Native Android app (option d). | Reject. The plan rejects a native app. No clear reason to change that. |
| 6 | Two tabs or windows on one machine (option e). | Reject as a product design. Use it only in tests. |

A separate case: the patient can run the whole app on the phone as the only camera. This is not a second camera. It needs the phone frame-rate test of plan section 3.1 (UNVERIFIED today).

Out of scope:
- 3D reconstruction, camera calibration, frame-level sync and OpenCap.
- Any signaling server and any public STUN server.
- Third-party webcam apps as a supported path.
- Any live cue from the front view.

Main risk: the step from "one device" to "two devices" moves effort from code to patient setup. The two closest open projects that tried serverless QR pairing did not show it working on two real devices (section 4).

## 2. Value of a second simultaneous view

### 2.1 Answer by question

| Question | Answer |
|---|---|
| Better for C1 to C6? | No. They use the sagittal knee angle. A front view shrinks a flexion angle (`research/tech.md` section 2.3). |
| Better for C8 (front)? | A front view is required. Simultaneity is not. C8 is a change from the start of each rep inside one view. |
| Cross-check of the side angle? | No independent check. A front view gives no flexion value. A second side view tests the same model against itself. |
| Less occlusion, lost leg? | Small gain. The cheap fix is the setup text "put the camera on your operated side". The protocol already holds `side`. |
| 3D reconstruction? | Needs calibration, sync and a validation study (section 5). Out of scope. |

Plain answer: two views are not better for C1 to C6. They help only the later frontal criteria (C8, and maybe C10). These wait for T13, a clinician limit and an own accuracy test. The Willy 2019 guideline (Grade B against alignment biofeedback, `research/form-opus.md` section 2.1) also forbids a live front-view cue. So the front number is a record for the clinician only. A record does not need the same moment as the side set.

### 2.2 What the multi-camera evidence says

- OpenCap, two iPhones at plus and minus 45 degrees, 10 healthy adults (R1, VERIFIED, first 100,000 of 156,998 characters):
  - Joint angle mean absolute error 4.5 degrees (range 1.7 to 10.3). Knee flexion RMSE 4.2 degrees against skin markers.
  - Skin markers themselves can differ from bone pins by up to 8 degrees RMSE.
  - More than two cameras improved kinematics by less than 0.3 degrees.
- OpenCap scoping review, 51 studies, 23 with a reference system (R3, VERIFIED, first 100,000 characters):
  - Knee sagittal RMSE median 6.07 degrees (Q1 4.93, Q3 7.36), 14 studies. No confidence interval.
  - No pooled frontal knee value. One drop-jump study reports frontal knee RMSE 6 to 7 degrees. OpenCap has no native frontal knee module.
  - Five ACL studies include patients after ACL reconstruction. No MPFL study is listed in what I read.
  - Reported problems: one study lost about 10 percent of trials to sync or processing failures. Another had upload failures. Calibration is hard for people with poor balance.
- Pose2Sim, 8 virtual cameras, perfect calibration, 30 Hz, one person (R4, VERIFIED): knee RMSE 5.1 degrees in walking. Real cameras and desync were not tested.
- Rode 2025 tested only single-camera estimators (R7, search summary of the paper, UNVERIFIED in this session). 3D lifting from one camera was worse than 2D (knee MAE 14.1 to 25.8 against 9.3 to 21.9 degrees). This is about one camera, not two.
- Frontal 2D MediaPipe: the absolute valgus angle has a bias of about 19 degrees. The change from the start agreed with Vicon (Asaeda 2024, VERIFIED in `research/form-opus.md` section 2.3).

What is validated: calibrated, synchronised two-iPhone 3D capture with cloud processing, for sagittal knee angles, in healthy people and ACL athletes. What is not validated: two uncalibrated browser views, the `lite` model, Android phones, MPFL patients, and any frontal knee value from such a setup.

### 2.3 OpenCap in detail

| Item | Fact | Mark |
|---|---|---|
| Devices | At least two iOS devices, plus a laptop that runs the web app | VERIFIED (R1) |
| Android | The paper names only iOS. Intrinsics come from a database of iOS devices. All studies in R3 used iOS. | VERIFIED (R1, R3) |
| Official "no Android" statement | Seen only in a search summary of the contact page. The page text did not load. | UNVERIFIED |
| Calibration | One checkerboard image for extrinsics. A 210 by 175 mm board on A4 paper is enough. | VERIFIED (R1) |
| Sync | Cross-correlation of keypoint velocities. No hardware sync. | VERIFIED (R1) |
| Video | 60 Hz, 720 by 1280 pixels | VERIFIED (R1) |
| Processing | In the cloud. A local run needs a CUDA GPU (at least 4 GB) and OpenPose. | VERIFIED (R1, R2) |
| License | opencap-core and opencap-processing: Apache-2.0 (label on the page, LICENSE text not read) | VERIFIED (R1, R2) |
| Browser or Android capture | None in what I opened | VERIFIED as absent (R2) |

Conclusion: OpenCap is the reference design, not a component. Its video goes to a cloud, which breaks FR6 and NFR1. Borrow two ideas only: sync by keypoint speed, and the A4 checkerboard if 3D ever comes.

## 3. Connection options

The current code fixes the starting point. `camera.ts` keeps one module-level stream (`active`). It asks for `facingMode: 'user'`, and `startCamera` first stops any open stream. `landmarker.ts` makes one instance with its own timestamp state. `loop.ts` accepts any `HTMLVideoElement`. So a second source needs per-source state and a `deviceId` in `camera.ts`. The other two files need no change.

### 3.1 Comparison table

| Point | (a) Phone as webcam | (b) Landmarks over data channel | (c) Video over WebRTC | (d) Native app | (e) Two tabs |
|---|---|---|---|---|---|
| Patient setup | Cable, pick "Webcam" in USB settings | Open URL on phone, scan two QR codes, same Wi-Fi | Same as (b) | Install app | Not a product path |
| We build | `deviceId` choice, second video, second landmarker | Phone route, pairing, SDP codec, message schema, link-lost state, wake lock | Same as (b), plus a remote video element | Android code base | Nothing new |
| New dependency | None | QR encoder and decoder (NFR7 list grows) | Same as (b) | Android toolchain | None |
| Video leaves the phone | Yes, over the cable to the computer that runs the app | No | Yes, over Wi-Fi | Depends | Not applicable |
| Server sees data | None with USB mode | None, if `iceServers` is empty and pairing is by QR | Same as (b) | Store, maybe | None |
| CSP `connect-src 'self'` | Not affected | Does not govern WebRTC (R9, R10) | Same as (b) | Not applicable | Not affected |
| Load | Laptop runs two models | Each device runs one model | Laptop runs two models | Phone | Not applicable |
| Clock | One laptop clock for both streams | Two clocks, offset needed | One laptop clock | Two clocks | One clock |
| Secure context | Laptop page on `localhost` or HTTPS | Phone needs HTTPS | Same as (b) | Not applicable | Same origin |
| Main failure | Phone or maker lacks webcam mode | Client isolation, mDNS, phone sleeps | Same as (b) | Store review | Hidden tab stops |
| Testable without a phone | Yes, fake `device-count=2` (R19) | Partly, two browser contexts | Partly | No | Yes |

### 3.2 Option (a): phone as a virtual webcam

Ways to connect:
- Android USB webcam mode. Android 14 QPR1 or higher, and only if the maker enables it with `ro.usb.uvc.enabled`. The phone is a UVC device for Linux, macOS, Windows and ChromeOS hosts. No host app. Formats MJPEG and YUYV. Over USB 2.0, YUYV tops out at 720p at 30 fps. Webcam mode fails on macOS with USB 3.0 or newer cables (R15, VERIFIED). Which phone brands enable it: UNVERIFIED.
- Windows "Use as connected camera" in Link to Windows. Windows 11, Android 10 or later, app 1.24022.0 or later. The camera then appears to PC apps (R16, VERIFIED). The page does not say how the video travels. The path is UNVERIFIED.
- scrcpy, Apache-2.0. Camera mirroring needs Android 12 or later. With V4L2 on Linux it acts as a webcam. It needs USB debugging and no app on the phone (R17, VERIFIED). This is a developer tool, not a patient tool.
- DroidCam: Wi-Fi or USB, Windows and Linux clients, free at standard definition. The vendor page states no license and no privacy facts (R18, VERIFIED as absent). Iriun and Camo: not opened (UNVERIFIED).

Facts for the app:
- `getUserMedia` can pick a camera with `deviceId` from `enumerateDevices()`. A plain value is a preference. `{ exact: id }` forces it (R8, VERIFIED).
- Secure context: HTTPS, `file:///` or `localhost` (R8, VERIFIED). The laptop page already meets this. No HTTPS work for the phone.
- MediaPipe web supports `IMAGE` and `VIDEO` modes. `VIDEO` needs monotonic timestamps (R20, VERIFIED). The page does not say whether two instances can run at once (UNVERIFIED). Two instances with their own timestamps match the current `landmarker.ts`.
- Load: two models on one main thread. Frame rate for two streams is UNVERIFIED. NFR4 then applies to each stream.
- Failure: a phone that sleeps or a cable that moves ends the track. `camera.ts` already stops on `ended`.

### 3.3 Option (b): landmarks only, over a WebRTC data channel

Flow: the phone opens the hosted app on a "camera" route. It runs MediaPipe on its own camera. It sends landmark numbers to the laptop page over an `RTCDataChannel`. The video stays on the phone.

Facts:
- Data channels are Baseline widely available since January 2020 (R12, VERIFIED). All data channels must be secured with DTLS (RFC 8827 section 6.5, R13, VERIFIED).
- WebRTC needs a signal channel to exchange the offer and answer. MDN says any channel works, "email, postcard, or a carrier pigeon" (R11, VERIFIED). Serverless therefore means QR or copy and paste.
- Two QR codes are needed: offer from laptop to phone, and answer from phone to laptop. The laptop webcam must read the answer from the phone screen. `BarcodeDetector` exists only on macOS, ChromeOS and Android (R23, VERIFIED). Windows and Linux laptops need a QR decoder library.
- A compact pairing code is about 110 bytes of base64url in one project (R30, VERIFIED as a PR claim). A raw SDP is larger (UNVERIFIED size).
- Host-only ICE: with `iceServers: []`, no third party sees an address. Chrome hides local IPs behind random `.local` names. The other peer resolves them by mDNS, which works only inside the local network (R14, VERIFIED, expired draft). Current Chrome behaviour: UNVERIFIED in an official Chrome page.
- Defaults to avoid: PeerJS uses the server `0.peerjs.com` and Google STUN by default (R26, VERIFIED). Trystero uses public Nostr relays by default and has default STUN servers (R27, VERIFIED). Both send pairing data to third parties.
- CSP: `connect-src` controls `fetch`, XHR, WebSocket, EventSource, `sendBeacon`, `ping` and `fetchLater`. WebRTC is not on the list (R9, VERIFIED). CSP3 has a separate `webrtc` directive with `'allow'` or `'block'`. It does not inherit from `default-src` (R10, VERIFIED). Browser support for it: UNVERIFIED, sources disagree.
- So the current CSP does not block WebRTC, and the NFR1 network test cannot see WebRTC packets (DERIVED). Option (b) needs its own proof.
- Phone lifecycle: a page is hidden when the screen is off or the tab is in the background. Most browsers then stop `requestAnimationFrame` (R21, VERIFIED). `camera.ts` stops all tracks when hidden. A screen wake lock keeps the screen on. The system releases it when the page is hidden, and the page must request it again (R22, VERIFIED).
- Development: Vite exposes the server on the LAN with `server.host`. HTTPS needs a certificate. On WSL2, `host: true` alone does not make the server reachable from the LAN (R24, VERIFIED). This dev machine is WSL2.
- Android Chrome support for MediaPipe WASM and the GPU delegate, phone frame rate, battery and heat: UNVERIFIED. No source, no test.

### 3.4 Options (c), (d) and (e)

- (c) Video over WebRTC: all the pairing and network risk of (b), plus video on the home network and two models on the laptop. Reject.
- (d) Native Android app: a second code base and a store path. The plan rejects it (`research/tech.md` section 7). Reject.
- (e) Two tabs or windows: a hidden tab gets no `requestAnimationFrame` callbacks (R21, VERIFIED), and `camera.ts` stops the camera when hidden. One page with two streams does the same job with less risk. Use two browser contexts only as a test rig for (b).

## 4. Existing open-source approaches

The GitHub API limit was spent before my first call (shared with another agent). So stars and licenses come from the repo web pages. I read no LICENSE text. Push dates were not visible on the pages.

| Project | License (page label) | Stars | What it gives | What it lacks for this app | Verdict |
|---|---|---|---|---|---|
| openzigs/onyourleft, PR 550 and issue 532 (R29) | App AGPL-3.0-or-later, packages Apache-2.0 | 0 | Tablet and phone paired by two QR codes, `{ iceServers: [] }`, SDP rebuilt from checked fields, one-time secret, heartbeats | Cycling app. Control messages only, no landmarks. "Two real devices: not verified". Client isolation untested. | Borrow ideas only. Flag: AGPL |
| simonw/battledrones, PR 37 (R30) | Not shown | Not shown | Compact SDP of about 110 bytes, QR links | Used Cloudflare STUN. The author later tried two machines on a LAN, and it did not work. PR closed. | Borrow ideas only |
| cjb/serverless-webrtc (R28) | Not named on page (UNVERIFIED) | 1.6k | Manual offer and answer exchange | Demo. Text chat and files | Ignore |
| peers/peerjs (R26) | MIT | 13.5k | Simple peer API | Default server `0.peerjs.com` and Google STUN | Ignore |
| dmotz/trystero (R27) | MIT | 2.8k | Rooms with no own server | Public relays by default | Ignore |
| opencap-org/opencap-core (R2) | Apache-2.0 | 383 | Two-camera design, sync by keypoint speed | iOS capture, cloud, CUDA, OpenPose | Borrow ideas only |
| perfanalytics/pose2sim (R5) | BSD-3-Clause | 870 | Offline multi-camera triangulation, keypoint-speed sync | Python, calibration, not a browser tool. Whole-body model non-commercial. | Borrow ideas only |
| freemocap/freemocap (R6) | AGPL-3.0 | about 10.7k | Desktop multi-camera capture | Python and Electron, no validation on the page | Ignore. Flag: AGPL |
| Genymobile/scrcpy (R17) | Apache-2.0 | about 154.3k | Android camera as a Linux webcam, no phone app | Needs USB debugging. Developer tool | Use only as a developer aid |
| DroidCam (R18) | Not stated | Not applicable | Wi-Fi or USB webcam | Proprietary status and privacy not stated | Ignore as a supported path |

Seen only in search summaries, not opened (UNVERIFIED):
- QR pairing: Gonxolo/cartas (`BarcodeDetector` with a jsQR fallback), fta2012/serverless-webrtc-qrcode, Qivex/webrtc-via-qr.
- Multi-camera MediaPipe in Python: TemugeB/bodypose3d, Yuri-Vlasqz/3D_Human_Pose_MediaPipe, mprib/pyxy3d.
- Landmarks to OBS over WebSocket: UUoocl/MediaPipe_for_OBS.

Findings:
- I found no project that runs pose estimation in a phone browser and sends only landmarks to a laptop page. The search was not systematic.
- I found no browser-based multi-camera pose project. All triangulation projects are Python desktop tools.
- No project fits a static app with no backend and `connect-src 'self'` as it is.

What we reuse: the native browser APIs (`enumerateDevices`, `getUserMedia`, `RTCPeerConnection`, Wake Lock), the Android USB webcam mode, and the existing `camera.ts`, `landmarker.ts` and `loop.ts`. What we build: per-source camera state, a dual test page, and later a rep-pairing function. Ideas only: QR pairing with an empty `iceServers`, an SDP rebuilt from checked fields, a one-time secret, heartbeats, and sync by keypoint speed.

## 5. Synchronisation and fusion

| Level | What | Sync | Calibration | Status |
|---|---|---|---|---|
| L0 | Each view analysed alone. Side view: angle and reps. Front view: change from the start of each rep. Results joined by rep. | Loose, a fraction of one rep | None | Simplest useful level |
| L1 | Joined frame by frame for a replay of both stick figures | Tens of milliseconds | None | Optional, later |
| L2 | 3D triangulation | One frame or better | Strict, checkerboard, intrinsics per phone model | Out of scope |

Facts:
- OpenCap and Pose2Sim sync phones by correlating keypoint speeds, because phones have no hardware sync (R1, R5, VERIFIED).
- Pose2Sim says frame rates below 60 Hz reduce accuracy (R5, VERIFIED). OpenCap records at 60 Hz (R1).
- RocSync reports a 3D hand triangulation error of 4.4 px with sub-frame sync and 8.8 px with nearest-frame sync (search summary, UNVERIFIED).
- I found no published sync tolerance for knee angles in slow rehab movements.

DERIVED arithmetic: the angle error from a time offset is about the angular speed times the offset. Assume a fast rehab rep at 60 degrees in 1 second. Then a 33 ms offset gives about 2 degrees, and 100 ms gives about 6 degrees. These values are smaller than or close to the 9 degree start margin (FR8).

For L0 the tolerance is much looser. Reps last at least 2 s (`minRepSeconds`, PROPOSAL). Pairing a side rep with a front rep by peak time works with offsets of a few hundred ms (DERIVED). Option (a) has one laptop clock for both streams, so L0 needs no clock work. Option (b) needs a clock offset, for example from a round-trip ping over the data channel (DERIVED design, not tested).

Simplest useful level: L0. It needs no calibration and no frame sync. L2 needs a calibration step that a patient cannot do alone, intrinsics for each Android model, and a new validation study.

## 6. KISS recommendation and first step

### 6.1 Recommendation

1. MVP: one camera, side view. Add one setup line: "Put the camera on the side of your operated leg." No change in `src/pose/`.
2. FR24 (front set) stays as planned: one camera, the patient turns for a short set.
3. If the user still wants both views at once, test option (a) as a developer experiment after T13. It has no network, no new dependency and no CSP change.
4. Build option (b) only after three gates. Option (a) shows value. A clinician wants C8 in the same session. A two-device spike connects on the real home network.
5. Do not build options (c), (d) or 3D. Do not list third-party webcam apps as supported.

### 6.2 Smallest testable first step (option a)

Order. Steps 2 to 4 are test first and need no phone.

1. User check, no code, 5 minutes. Plug the phone into the laptop by USB. Look for "Webcam" in the USB options of the phone. In Chrome on the host OS (not inside WSL), run `navigator.mediaDevices.enumerateDevices()` on the app page. Count the `videoinput` entries.
2. `camera.ts`: replace the single `active` stream with state per role (`side`, `front`). Add an optional `deviceId` with `exact`. Vitest with a mocked `mediaDevices`: both streams stop on every exit path of NFR9. A missing device gives the no-device text. The old tests still pass.
3. A dual test page in the style of `e2e/harness`, never linked from the app and not in patient mode. It shows two videos, two landmarkers, two angle read-outs and the median fps of each stream (`LoopStats`). It stores nothing.
4. Playwright project `dual` with `--use-fake-device-for-media-stream=device-count=2` and the fake-UI flag (R19, VERIFIED in a Chromium commit message). Assert two `videoinput` devices with different ids, frames on both loops, `readyState` `ended` after each exit path, and zero foreign requests. The fake devices show no person, so assert frames, not landmarks. Whether `--use-file-for-fake-video-capture` feeds both devices: UNVERIFIED, test it first.
5. Measure the median fps of both streams together for 60 s in headed Chromium (NFR4 for each stream).
6. Real test with the phone. One set of mini squats. Phone on the side (C1 to C6 view) and laptop camera in front, or the reverse. Record the fps of each stream, the share of frames with the leg visible, and the rep times.

Gate after step 6. Continue only if all three are yes:
- Each stream holds a median of at least 15 fps with both running.
- The front view finds both legs in most frames. The user sets the share.
- A clinician says that a C8 number from the same set is useful.

If one answer is no, stop and keep rank 1.

## 7. Effect on the plan

| Item | Effect |
|---|---|
| T7, T9b to T12 | No change |
| T8 (done) | No change now. Step 2 of section 6.2 is a later change to `camera.ts` only. |
| T13 | No change for the MVP. If the dual page exists: fps per stream and a front-view error test. The 9 degree margin has no front-view value. |
| New task T16 (draft) | Steps 2 to 5 of section 6.2. After T13. Developer-only. |
| FR24 | Unchanged in meaning. A second camera only removes the turn. |
| FR25 (draft, F) | "Optional simultaneous second view." Acceptance: the gate of section 6.2. |
| NFR4 | Applies to each stream when two run. |
| NFR9 | Stop every track of every source on every exit path. Option (b): also on the phone page. |
| FR6, NFR1 | Option (a) with USB mode: the claim holds if "the device" means the computer and its attached cameras. Option (b): a new test must prove an empty `iceServers` and host candidates only. |
| NFR6 | Option (b): decide on the CSP `webrtc` directive. For the MVP, `webrtc 'block'` is defence in depth where browsers enforce it (support UNVERIFIED). |
| NFR7 | Option (b) with QR adds two entries to `scripts/allowed-deps.txt`. |
| FR18 | Option (a) or (b) adds the patient lines of section 8.4. |
| Section 11 | Close the open decision on the second camera with the user decision. |

New risks: two models on one laptop drop below 15 fps. A phone maker does not enable webcam mode. The cable limits placement. A "two views" label suggests 3D accuracy. For option (b): client isolation, mDNS failure, a phone that sleeps, heat, and WebRTC traffic outside the CSP and the network test.

## 8. Privacy and regulation

This is not legal advice.

### 8.1 Data flow

| Design | Video | Landmarks | New recipient |
|---|---|---|---|
| One camera (MVP) | In the laptop page | In the laptop page | None |
| (a) USB webcam mode | Cable from phone to the computer that runs the app | In the laptop page | None |
| (a) with a third-party app | Through a vendor app | In the laptop page | Vendor, terms not read (UNVERIFIED) |
| (b) landmarks only | Stays on the phone | Over the LAN, DTLS encrypted (R13) | None, if no STUN and no relay |
| Any public STUN or relay | Not video | IP addresses and pairing data | Yes, a third party |

### 8.2 GDPR

- "Data concerning health" means "personal data related to the physical or mental health of a natural person" (Art. 4(15), R25, VERIFIED). Art. 9(1) prohibits processing of special categories, health data among them (R25, VERIFIED).
- The GDPR does not apply to processing "by a natural person in the course of a purely personal or household activity" (Art. 2(2)(c), R25, VERIFIED). Whether the app maker is a controller for a local-only app stays an expert question (plan section 11).
- A second device under the control of the patient adds no recipient in options (a) with USB mode and (b) (DERIVED). A public STUN server, a relay or a vendor app adds one.
- Recital 51 says photographs are biometric data only when processed for unique identification (R25, VERIFIED). The app computes angles, not identity (DERIVED reading).
- A second camera sees more of the room. Other people in either view are in the video. NFR9 already warns for one camera.

### 8.3 Claim and intended purpose

- Option (a) with USB mode: "no video leaves the device" stays true if the text says "your computer and the cameras connected to it" (DERIVED).
- Option (b): reword to "no video leaves your phone or your computer" (DERIVED).
- A third-party webcam app makes the claim unprovable. Do not support it.
- A second camera feeding the same measures does not change the intended purpose (DERIVED). A front-view measure (C8) or any 3D angle is a new measured quantity. MDCG 2019-11 section 3 asks for clinical evidence for claims (`research/form-opus.md` section 2.5). The class question under Rule 11 is unchanged and open.
- Whether the intended purpose must name the supported camera setups: ask the expert (UNVERIFIED).

### 8.4 What the app must tell the patient

- Which camera sees which view, and that both are on during the set.
- No video is stored or sent. Only numbers are kept, on the computer.
- Other people in either view are in the video.
- Option (b) only: keep the phone screen on and do not touch it during a set. Use home Wi-Fi only. Close the phone page at the end.
- The front-view numbers are for the clinician. The app shows no live front-view cue.

## 9. Second opinion on research/dual-camera.md

The file existed when I finished (384 lines). I read all of it.

Agree:
- The verdict: no second camera in the MVP. C1 to C6 gain nothing. C8 is the only real value.
- The ranking: one camera first, option (a) as a developer test, option (b) only later. Options (c), (d), 3D and OpenCap as a component are rejected.
- L0 as the simplest useful sync level, and the gate after a real test.
- `connect-src` does not cover WebRTC. NFR1 needs its own WebRTC proof. `blockForeignFetch` does not stop WebRTC.
- The OpenCap facts that I also read (R1). The AOSP webcam facts (R15).

Disagree or add:
1. Phone Link: it marks Windows "Connected camera" UNVERIFIED. I opened the Microsoft page (R16): Windows 11, Android 10, app 1.24022.0. The video path is still not stated.
2. PeerJS default server: it marks it UNVERIFIED. The PeerJS API page states `0.peerjs.com` and Google STUN (R26).
3. Empty `iceServers`: it marks this not opened. onyourleft PR 550 uses `{ iceServers: [] }` with host candidates (R29), but neither project proved two real devices. battledrones failed on a LAN (R30). This raises the risk of option (b).
4. Test without a phone: its step 5 feeds video files, not `getUserMedia`. Chromium supports `device-count=2` for fake cameras (R19). That tests the real `getUserMedia` path of option (a).
5. Two tabs: it says "one machine has one physical camera". A laptop with a USB camera has two. The real reason against (e) is that hidden tabs stop `requestAnimationFrame` (R21).
6. CSP3 `webrtc` directive: not in its report. It is the only CSP control for WebRTC (R10). Browser support is UNVERIFIED.
7. Claim wording for option (a): it says the claim must change. With USB mode the phone is a plain UVC camera of the computer (R15). A clear definition of "the device" keeps the claim.
8. Placement: one camera of the pair can be the laptop camera itself. Then only one cable and one phone are needed. Its report assumes the phone always gives the second view.

Citations in its report that I did not open, so I cannot confirm them:
- Studies: S3 Turner 2024 (ACL, OpenCap), S4 (OpenCap and LESS), S5 (OpenCap Monocular), S9 (near and far knee limits), S10 (two smartphones in gait).
- S7 RocSync: I saw only a search summary.
- Web: S18 (webrtcHacks SDP), S19 (Mozilla bug 1564451), S20 (Chrome DevTools port forwarding), S32 (Trystero guide).
- S22 and S23 (gdpr-info.eu): I used EUR-Lex instead.
- S24 droidcam.app: I opened dev47apps.com, which states no privacy facts.
- S25 Iriun, and S26 to S30 (libp2p-webrtc-qr, qwbp, OmniCam, phonecam, UVCamera).
- The claim that a company (Model Health) supports commercial use of OpenCap is not in the text that I read.

## 10. Decisions for the user, and items not verified

### 10.1 Decisions for the user

1. Accept "no second camera in the MVP" and the setup line "put the camera on the side of your operated leg"?
2. Is simultaneous capture worth a developer test (T16), or does the turn-between-sets design of FR24 suffice?
3. If a second view comes later, who uses it? For clinic and developer use, option (a) is enough. For patients at home, only option (b) fits.
4. For option (b): accept a hosted HTTPS address, two QR libraries in the allowed list, and the CSP `webrtc` decision?
5. Accept the claim wording of section 8.3 for two devices?
6. Exclude third-party webcam apps (DroidCam, Iriun, Camo) from the supported setups? I advise yes.
7. With a clinician: is C8 wanted in the first frontal release, and who sets its limit? This stays open from the plan.

What the user must provide for a real test:
- Android phone model, Android version with the QPR level, and security patch (Settings, About phone). Webcam mode needs Android 14 QPR1 or later and maker support.
- Chrome version on the phone and on the laptop. The laptop OS. Chrome must run on the host OS, not inside WSL, to see a USB camera (DERIVED).
- A USB data cable, not charge-only, long enough for the planned placement. The USB version of the laptop port.
- For option (b) only: router model, whether guest or client isolation is on, the Wi-Fi band, and a hosted HTTPS address.
- A phone stand, and consent to record one test set.

### 10.2 Items not verified

- OpenCap official "no Android" statement, FAQ and Q&A PDF: page text did not load. The PDF was not readable here.
- OpenCap paper: 100,000 of 156,998 characters read. The per-joint table S2 was not read.
- R3 scoping review: 100,000 of 153,379 characters read.
- Rode 2025 and RocSync: search summaries only in this session.
- Which phone brands enable Android webcam mode. Whether webcam mode needs an unlocked phone.
- The video path of Windows Phone Link. Licenses and privacy of DroidCam, Iriun and Camo.
- Two MediaPipe instances on one page, their frame rate, and phone frame rate with `lite`.
- MediaPipe WASM and GPU delegate on Android Chrome. Phone battery and heat.
- Whether the fake video file feeds both fake devices with `device-count=2`.
- Browser support of the CSP `webrtc` directive.
- Current Chrome mDNS candidate behaviour from an official Chrome source. The IETF draft expired in 2022.
- Data channel latency and clock offset on a home network.
- Whether Chrome on Windows reaches a dev server inside WSL2 on `localhost`.
- No study of two cameras in MPFL patients was found. The search was not systematic.
- Licenses: page labels only. No LICENSE text was read. Push dates were not visible.
- MDCG 2019-11 and Annex VIII were not opened in this session. Section 8.3 relies on `research/form-opus.md`.

Downloaded content was treated as untrusted data. I ran no code from it. One PDF was copied to the session scratchpad for a text extraction, which failed.

### 10.3 Sources opened

- R1 Uhlrich et al. 2023, OpenCap, PLOS Comput Biol, DOI 10.1371/journal.pcbi.1011462: https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011462
- R2 opencap-core: https://github.com/opencap-org/opencap-core
- R3 Zhang et al. 2026, OpenCap scoping review, DOI 10.3389/fdgth.2026.1882536: https://www.frontiersin.org/journals/digital-health/articles/10.3389/fdgth.2026.1882536/full
- R4 Pagnon et al. 2022, Pose2Sim Part 2: https://pmc.ncbi.nlm.nih.gov/articles/PMC9002957/
- R5 Pose2Sim: https://github.com/perfanalytics/pose2sim
- R6 FreeMoCap: https://github.com/freemocap/freemocap
- R7 Rode et al. 2025 (search summary only): https://www.nature.com/articles/s41598-025-22626-7
- R8 MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- R9 MDN CSP connect-src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
- R10 W3C CSP Level 3, section 6.2.1: https://www.w3.org/TR/CSP3/
- R11 MDN WebRTC connectivity: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
- R12 MDN RTCDataChannel: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
- R13 RFC 8827, section 6.5: https://www.rfc-editor.org/rfc/rfc8827.html
- R14 IETF draft mDNS ICE candidates, version 03: https://datatracker.ietf.org/doc/html/draft-ietf-mmusic-mdns-ice-candidates-03
- R15 AOSP "Use a device as a webcam": https://source.android.com/docs/core/camera/webcam
- R16 Microsoft support, Phone Link camera page: https://support.microsoft.com/en-us/windows/apps/phonelink/use-your-mobile-device-s-camera
- R17 scrcpy camera doc and repo: https://raw.githubusercontent.com/Genymobile/scrcpy/master/doc/camera.md and https://github.com/Genymobile/scrcpy
- R18 DroidCam vendor page: https://www.dev47apps.com/
- R19 Chromium commit with `device-count=3`: https://chromium.googlesource.com/chromium/src/+/b0ee07cd95863c50ca5bf553bab82bf54b82d500
- R20 MediaPipe Pose Landmarker web: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- R21 MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- R22 MDN Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- R23 MDN Barcode Detection API and Chrome shape detection: https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API and https://developer.chrome.com/docs/capabilities/shape-detection
- R24 Vite server options: https://vite.dev/config/server-options
- R25 GDPR, EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679
- R26 PeerJS API and repo: https://peerjs.com/client/api/peer and https://github.com/peers/peerjs
- R27 Trystero: https://github.com/dmotz/trystero
- R28 serverless-webrtc: https://github.com/cjb/serverless-webrtc
- R29 onyourleft: https://github.com/openzigs/onyourleft, https://github.com/openzigs/onyourleft/pull/550 and https://github.com/openzigs/onyourleft/issues/532
- R30 battledrones PR 37: https://github.com/simonw/battledrones/pull/37
