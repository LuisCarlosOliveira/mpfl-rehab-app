# Second camera (Android phone) for the MPFL rehab app

Date: 2026-11-08. Read-only investigation. No code and no plan file was changed. This is not legal advice.

Marks: VERIFIED means that I opened the source in this session and the source states the fact. UNVERIFIED means that I did not open the source, or that the source does not state it. Source codes (S1 and so on) are in section 10.

## 1. Overview and verdict

The user asked to use the camera of an Android phone as a second camera. Then the app sees a side view and a front view at the same time.

Verdict: do not add a second camera in the MVP. The six MVP criteria (C1 to C6) all use the side view. A second view adds almost nothing to them. The value is in the later frontal criterion C8. That criterion has no validated limit for MPFL patients, and no live cue is allowed.

Ranking, best first:

1. One camera, side view, placed on the operated side. This is the MVP. Cost: one line of text on the setup screen.
2. A dual-source test with the phone as a virtual webcam (USB webcam mode of Android, or a webcam app). Build a small developer-only page. Decide after T13, and only if a clinician wants C8 in the same session.
3. The phone runs the pose model and sends only landmark numbers to the laptop page over a WebRTC data channel. This is the best design for patients, but it costs the most. It needs QR code libraries or a signaling server. Build it only if the test in rank 2 shows real value.
4. The phone sends video to the laptop (option c). Worse than rank 3 for every point that matters here.
5. A native Android app (option d). Rule out.
6. Two browser tabs on one machine (option e). This gives no second view. Use it only as a test tool.

Out of scope for any near release: 3D reconstruction, camera calibration, a signaling server and OpenCap. Also any cloud processing of video and live cues from the front view.

Main risk: a second device adds failure modes that a patient must fix alone (cable, Wi-Fi isolation, phone lock, heat). It also moves the privacy claim from "one device" to "two devices".

## 2. Value of a second simultaneous view

### 2.1 What the plan needs

The plan and `research/form-opus.md` section 3 list the criteria. C1 to C6 use the side view or any view. C7 (trunk lean) uses the side view. C8 (knee moves inward, change from the start of the rep) is the first criterion that needs a front view. C9 to C14 are never shown, or wait for a clinician limit and an own test.

### 2.2 Answer by question

| Question | Answer |
|---|---|
| Does a second view help C1 to C6 (all side view)? | No, with one exception below. Each criterion uses the sagittal knee angle. A front view cannot measure knee flexion. A 2D angle from a front view shrinks (`research/tech.md` section 2.3). |
| Does it help the later C8? | Yes. A front view is the only way to see the knee move inward. One camera can do this too, if the patient turns for a short set (`research/form-opus.md` section 4.5). The second camera only removes the turn. |
| Can it cross-check the side angle? | Not as an independent measure. Both views are 2D estimates from the same model. A front view gives no flexion value to compare. A second side view from the other side can compare, but this only checks the model against itself. |
| Does it reduce occlusion or a lost leg? | A little. In one gait study with 2D pose estimation, the far-side knee had limits of agreement of -12.0 to 15.2 degrees. The near-side knee had -6.5 to 9.6 degrees (S9, VERIFIED, 15 healthy adults, walking). So the camera must see the operated leg as the near leg. A camera on the operated side does this at no cost. |
| Does it enable 3D? | Only with calibration and tight sync (section 4). The best 3D tool, OpenCap, is not a browser tool (section 2.3). |

The exception: two cameras, one on each side, make the app independent of which leg is near. The protocol already holds `side` (left or right). The app can tell the patient on which side to put the camera. This is a text change.

### 2.3 OpenCap (Stanford, two or more smartphones)

What it needs (S1, VERIFIED, I read the first 100,000 of 156,998 characters):
- Two iOS devices (iPhone, iPad or iPod), two tripods, a printed checkerboard and a laptop that runs a web app.
- Checkerboard calibration. A 210 by 175 mm board on A4 paper is enough. Intrinsics come from a database of recent iOS devices.
- Sync by cross-correlation of keypoint velocities. The phones have no hardware sync.
- Recording at 720 by 1280 pixels and 60 Hz. Two cameras at about 45 degrees from the forward direction for squats. Distance 2 to 10 m.
- The 2D keypoints are extracted in the cloud. Then the system triangulates and fits an OpenSim model. So video leaves the device.
- The paper says the cloud app is "freely available to the research community for the foreseeable future". A company (Model Health) supports commercial use.
- Code license: Apache-2.0 (S2, VERIFIED on the GitHub page, LICENSE text not read).

Reported errors (S1, VERIFIED, 10 healthy people, walking, squats, sit-to-stand, drop jumps, HRNet, two cameras):
- Marker error 32 mm on average. Joint angle mean absolute error 4.5 degrees (range 1.7 to 10.3). Knee flexion 4.2 degrees RMSE.
- More than two cameras did not improve kinematics by more than 0.3 degrees.

Independent check in patients (S3, VERIFIED on the abstract page only): athletes 12 to 18 months after ACL reconstruction. It used 437 trials against a 10-camera marker system. Mean absolute error 3.85 degrees and RMSE 4.34 degrees over all joints. Agreement was best in the sagittal plane (CMC above 0.94 for knee and hip). It was weaker in the frontal plane (CMC 0.47 to 0.78). Another paper says OpenCap is "validated for sagittal plane movements" and the coronal plane can have lower precision (S4, VERIFIED).

What this means for us:
- Platform: the paper requires iOS devices. A statement on the official contact page ("We do NOT support Android") appeared only in a search summary. The page itself did not load (UNVERIFIED). No browser or Android capture path exists in what I opened.
- Privacy: video goes to a cloud. This breaks the rule "no video leaves the device". Rule out as a component.
- A one-phone version (OpenCap Monocular, preprint 2026) reports 4.8 degrees rotation error. It needs one iPhone and the OpenCap cloud (S5, VERIFIED). The same objections apply.
- The evidence is for healthy adults or athletes, with heavy models and cloud processing. No result applies to the `lite` model in a browser (UNVERIFIED, no study found).

### 2.4 Other multi-view evidence

- Frontal-plane error of 2D MediaPipe is large for the absolute angle. In 15 healthy men at single-leg landing, the error was 18.83 to 19.68 degrees (bias -19.28). The change from initial contact had bias 0.181 degrees and error below 5 degrees (S8, VERIFIED). The paper does not state the model size. This supports the plan: show a change from the start of the rep, never an absolute valgus angle.
- Two smartphones, one in front and one on the side, each analysed alone as 2D. In gait of 16 healthy adults, knee abduction RMSE was 4.64 degrees over the gait cycle against a marker system. The sagittal ankle was weak (15.23 degrees RMSE). Some authors work for the maker of the system (S10, VERIFIED).
- 2D frontal knee angle in gait with OpenPose: bias 1.6 and limits of agreement -6.7 to 9.9 degrees. But the standard deviation was 35 percent of the frontal knee range (S9, VERIFIED).
- Pose2Sim (BSD-3-Clause, Python, 2 or more cameras) is an open multi-view tool. It needs calibration and a Python install of up to 14 GB. It is not a browser tool (S6, VERIFIED).
- I found no study of two cameras for MPFL patients. I did not search this one topic in a systematic way (UNVERIFIED that none exists).

### 2.5 Summary: what is validated

| Item | Status |
|---|---|
| Two iPhones, calibrated, cloud, healthy people or ACL athletes, sagittal knee | Validated, 3 to 5 degrees (S1, S3) |
| Two uncalibrated cameras, independent 2D views, browser, `lite` model | Not validated |
| Frontal knee change from a baseline, 2D MediaPipe | One small study, healthy men (S8) |
| Frontal absolute angle | Poor (S8) |
| Any dual-view result for MPFL patients | None found |

Plain answer: for C1 to C6 a second view is not better. It is useful, at most, for C8 and for a trunk-lean record (C7). These wait for T13 and a clinician limit.

## 3. Connection options

All options feed the same chain: video, MediaPipe, landmarks, angle. The code in `app/src/pose/` helps here. `startPoseLoop` takes any `HTMLVideoElement`. `createLandmarker` makes one instance with its own timestamp state. `camera.ts` holds one module-level stream (`active`) and asks for `facingMode: 'user'`. So `camera.ts` needs a `deviceId` parameter and one stream for each source.

### 3.1 Option (a): the phone as a virtual webcam

The phone shows up as a second `getUserMedia` device. The app picks it with `deviceId` from `enumerateDevices()` (S11, VERIFIED). A plain `deviceId` is only a preference. Use `exact` to force it.

Ways to connect:
- USB webcam mode of Android. It needs Android 14 QPR1 or higher and support from the phone maker. The user picks "Webcam" in the USB settings. Formats are MJPEG and uncompressed YUYV. Over USB 2.0, YUYV tops out at 720p and 30 fps. The host needs no driver or app (S16, VERIFIED, AOSP page). Some makers do not enable it (the page says makers must set `ro.usb.uvc.enabled`).
- DroidCam: phone app plus a client on Windows or Linux. Wi-Fi or USB. The vendor says the link stays on the local network. Higher resolution seems to be paid (S24, VERIFIED as vendor claims).
- Iriun: phone app plus a client on Windows, Mac or Linux. The page does not state the link type or the price (S25, VERIFIED as far as it states).
- Windows "Connected camera" through Link to Windows (Android 10 or later): it appeared only in search results from news sites (UNVERIFIED). Camo: not opened (UNVERIFIED).
- Chrome and ChromeOS options: not checked (UNVERIFIED).

Facts:
- User setup: a cable and a few taps, or two apps. No pairing code. The phone must stay awake (UNVERIFIED whether it must be unlocked, search summary only).
- We build: a `deviceId` choice, a second landmarker, a second `<video>`. No new dependency. No server.
- Privacy: with USB, video goes from phone to laptop on a cable. With a Wi-Fi app, a third-party app on the phone handles the video. Its privacy terms were not read (UNVERIFIED).
- Sync: the laptop stamps each frame with its own clock. The latency of virtual webcam apps is unknown (UNVERIFIED).
- Load: the laptop runs two models. The plan target is 15 fps median for one (NFR4). Two models are unmeasured (UNVERIFIED).
- HTTPS: no issue. Both cameras are devices of the laptop, so the page is the app on its own origin.
- Failure modes: the camera disappears when the phone sleeps or the cable moves. The track ends, and `camera.ts` already stops on `ended`.
- Patient reach: low. It needs a PC (Windows, Linux or Mac), a new Android, and a phone maker that enables the mode.

### 3.2 Option (b): the phone runs the model and sends only landmarks

How it works: the phone opens the app at its own HTTPS address, on a "camera mode" route. It runs MediaPipe on its own camera. It sends the 33 landmarks of each frame over an `RTCDataChannel` to the laptop page. The video stays on the phone.

Facts:
- Data channel: peer to peer, two-way, on SCTP over DTLS (S12, VERIFIED). Baseline widely available since January 2020. It can be unordered with `maxRetransmits`, which suits a live landmark stream.
- Size: 33 landmarks of 4 float32 values is 528 bytes for one frame, or about 16 KB each second at 30 fps. This is my own arithmetic. JSON is larger but still small.
- Signaling is needed. MDN says that WebRTC cannot create connections without a server in the middle, called the signal channel. The channel can be "email, postcard, or a carrier pigeon" (S13, VERIFIED). So "serverless" means a manual or QR exchange of the SDP.
- Size of the SDP: about 2,500 bytes for a standard data channel offer (search summary, UNVERIFIED). A minimal form needs about 106 characters in each direction (S18, VERIFIED, own encoding of the article). QWBP claims 55 to 100 bytes (S27, VERIFIED as a README claim, beta). A libp2p demo measured 933 characters host-only and 266 in a compact format (S26, VERIFIED as README claims).
- Serverless pairing needs a return path. The laptop shows an offer. The phone answers. The answer must reach the laptop. There are three options. The laptop webcam scans a QR code from the phone screen (needs a QR decoder library). The user types a short code (too long for an answer). Or a small relay server carries it. The first adds a dependency to the allowed list (NFR7). The last breaks "no backend".
- Offer to the phone: the laptop can show a URL that holds the offer in the fragment, as a QR code. The phone camera app opens it. A fragment is not sent to a server (general web knowledge, UNVERIFIED in this session).
- STUN: with no STUN server, no third party sees the IP address. Use an empty `iceServers` list (UNVERIFIED, not opened). Then only host candidates exist, and both devices must be on one local network. With a public STUN server, a third party sees the IP addresses and the "own origin only" test cannot hold.
- Local network risk: Chrome hides the local IP behind a random `.local` name. The other side resolves it with mDNS. This works on the same network. The IETF draft warns that data-channel-only apps can fail on unmanaged home networks (S17, VERIFIED, old draft, current browser behaviour UNVERIFIED). A libp2p demo README says guest Wi-Fi often blocks client-to-client traffic, and that this cannot be detected before the test (S26, VERIFIED as README claim).
- HTTPS: `getUserMedia` needs a secure context: HTTPS, `file:///` or `localhost` (S11, VERIFIED). A phone cannot use `http://<laptop-ip>:5173` as a secure context. In production the static app is on HTTPS, so the phone opens the same URL. In development, USB port forwarding maps the phone `localhost` to the laptop (S20, VERIFIED). OmniCam says that a public authority cannot issue a certificate for a private address such as 192.168.x.x. It uses a self-made certificate, and the user taps through a warning (S28, VERIFIED as README claim).
- CSP: the plan policy has `connect-src 'self'`. MDN lists the APIs that `connect-src` controls: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, the `ping` attribute and `fetchLater`. It does not name WebRTC (S15, VERIFIED). So the CSP does not prove that a data channel stays inside the network. The Playwright network check (NFR1) can miss WebRTC traffic too (UNVERIFIED). A new own test and a code rule are needed.
- Browser support on Android Chrome: `RTCDataChannel` is widely available (S12). The Wake Lock API works in all latest browsers since March 2025 (S14, VERIFIED). For MediaPipe, the web page lists no supported browsers and shows `delegate: "GPU"` only in its example (S21, VERIFIED). So WASM and GPU support on Android Chrome is UNVERIFIED. Phone frame rate is UNVERIFIED (plan section 3.1).
- Phone lock and background: Chrome for Android fires `mute` and `unmute` on a camera track in the background or on a locked screen. The source is a comment by a Mozilla engineer in a Mozilla bug (S19, VERIFIED, date not checked). The rule in `camera.ts` stops all tracks when the page is hidden. The Wake Lock API keeps the screen on. The system releases it when the page is hidden, and the app must request it again (S14, VERIFIED). The patient must not touch the phone during a set.
- Battery and heat: the phone runs the camera and a pose model all the time. No source. UNVERIFIED. The AOSP page tells makers to manage power and thermal load for webcam mode (S16, VERIFIED). This shows that the topic is real.
- Camera permission: the phone asks once for each site. A denied permission needs the same recovery text as on the laptop.

We build: a camera-mode route, a landmark message schema (checked with Zod), pairing, a remote landmark source, and a link-lost state. Estimate (my own, UNVERIFIED): several days of work, and two new libraries if QR is used.

### 3.3 Option (c): the phone sends video to the laptop

The phone sends a WebRTC video stream. The laptop runs the model on both streams.
- Same pairing and same local network problems as option (b). It adds a video SDP (over 1,500 characters, S18) and video bandwidth.
- The laptop runs two models. Video leaves the phone, though it stays inside the home network.
- Gain over option (b): the phone does no inference, so it runs cooler. Loss: more load on the laptop, more privacy exposure, more code.
- Verdict: worse than option (b) for this app.

### 3.4 Option (d): a native Android app

It needs an Android code base, a store listing and an update path. It breaks the plan decision "static web app, no backend". The plan rejects a native app (`research/tech.md` section 7). No clear reason exists. Rule out.

### 3.5 Option (e): two tabs or windows on one machine

One machine has one physical camera. Two tabs show the same view, so there is no second view. Use it only in tests: two pages in Playwright can act as "laptop" and "phone" for option (b). Whether Playwright can give each page a different fake video: UNVERIFIED. The fake-device flags are browser-wide (`research/tech.md` section 5.2).

### 3.6 Comparison

| Point | (a) virtual webcam | (b) landmarks only | (c) video to laptop | (d) native | (e) two tabs |
|---|---|---|---|---|---|
| New dependency | None | QR libraries, or a relay | QR libraries, or a relay | Android toolchain | None |
| Signaling | None | Yes (manual, QR or server) | Yes | Not needed | Not needed |
| Video leaves the phone | Yes, to the laptop (USB or Wi-Fi app) | No | Yes, to the laptop | Depends | Not applicable |
| Third party sees data | Webcam app vendor (UNVERIFIED) | None if no STUN and no relay | None if no STUN and no relay | App store | None |
| Load on laptop | Two models | One model | Two models | None | Not applicable |
| Load on phone | Camera and encode | Camera and model | Camera and encode | Camera and model | None |
| Patient reach | PC with a new Android | Any phone with Chrome on the same Wi-Fi | Same as (b) | Android only | Not applicable |
| Build effort | Smallest | Largest | Large | Very large | Test tool only |
| Main failure | Mode missing, cable | Wi-Fi isolation, phone lock | Same as (b) | Store review | No second view |

## 4. Synchronisation and fusion

Three levels, from simple to hard:

| Level | What it does | Sync needed | Calibration | Status |
|---|---|---|---|---|
| L0 | Each view is analysed alone. The side view gives the knee angle and the reps. The front view gives the change of the knee line from the start of each rep. The two results join by rep. | Loose, about one rep | None | Simplest useful level |
| L1 | Join by time stamp for a clinician replay of both views. | Tens of milliseconds | None | Optional |
| L2 | Triangulate to 3D. | Single-digit milliseconds, for each frame | Strict (checkerboard) | Out of scope |

Facts:
- Sync tolerance depends on the use. For work that depends on geometry, "even single-digit millisecond offsets can cause significant reprojection errors". After alignment, the residual error is half the frame period, so 16.7 ms at 30 fps. The tests used hand pose and 4 cameras, not knee rehab (S7, VERIFIED).
- OpenCap and Pose2Sim sync by correlating keypoint speeds across cameras, because phones have no hardware sync (S1, S6, VERIFIED).
- I found no published sync tolerance for knee angles in slow movements (UNVERIFIED that none exists).

Own arithmetic, not a clinical tolerance (UNVERIFIED): if a knee moves 60 degrees in 2 seconds, the mean speed is 30 degrees per second. A 33 ms offset (one frame at 30 fps) then changes the angle by about 1 degree. A 100 ms offset changes it by about 3 degrees at mean speed and about 6 degrees at twice the mean speed. The start margin is 9 degrees (FR8). So for slow movements an offset of up to about 100 ms is smaller than the model error.

L0 is the simplest useful level. A rep in the side view and a rep in the front view are the same rep if their peak times are close. The gap limit must come from a measurement in the test of section 6. Time stamps use the local clock of each device. Do not compare the clocks of two devices. Use the arrival time at the laptop, and accept the network delay (not measured, UNVERIFIED).

L0 works with option (a) and option (b). L2 needs frame-level sync and a calibration step that a patient cannot do alone. Rule it out.

## 5. Existing open-source approaches

The GitHub API limit (60 calls each hour, shared with another agent) ran out during this work. For some repos I read the GitHub page, and it shows no push date. These rows say "date not shown". Stars and license labels come from the API or the page. I read no LICENSE text unless I say so.

| Project | License | Stars, last push | Gives us | Lacks for our case | Verdict |
|---|---|---|---|---|---|
| dmotz/trystero (S31, S32) | MIT (API) | 2,831, 2026-11-06, TypeScript | WebRTC rooms with no own server | Signaling uses public Nostr relays by default. Offers, answers and candidates go to third parties. STUN use not stated. | Ignore. Conflicts with `connect-src 'self'` and the privacy rule |
| peers/peerjs (S31, S33) | MIT (API) | 13,509, 2026-02-27, TypeScript | Easy peer API | Needs a PeerServer. The default server is not stated on the page (UNVERIFIED). | Ignore |
| feross/simple-peer (S31) | MIT (API) | 7,798, 2024-06-26, JavaScript | Thin WebRTC wrapper | Last push over two years ago. The native API is enough. | Ignore |
| NiKrause/libp2p-webrtc-qr (S26, S31) | Apache-2.0 or MIT per README. The API says NOASSERTION | 3, 2026-11-02, JavaScript | Relay-free QR offer and answer, signed, expiry of 10 minutes, animated QR frames | Experimental ("not finished"). Pulls in libp2p. Camera path not tested by automation. | Borrow ideas only |
| magarcia/qwbp (S27) | MIT (README) | 13, one commit, date not shown | Compact signaling payload of 55 to 100 bytes | Beta. One commit. STUN needed across networks. | Borrow ideas only, if QR is built |
| ctbot000/camera-cast (S31) | MIT (API) | 0, 2026-09-28, JavaScript | Phone camera to a browser, QR join | Uses a PeerJS signaling server (search summary, UNVERIFIED). Sends video. | Ignore |
| cogint/webwebcam (S31) | None found by the API | 5, 2021-09-19, JavaScript | QR pairing to a phone page | No license, so no right to reuse. Old. Chrome extension. | Ignore |
| Orest-Z/OmniCam (S28) | MIT (page) | 75, date not shown | Phone browser page, one-time QR token, self-made HTTPS certificate | Needs a Windows or Linux desktop app and a virtual camera. Video goes to the PC. | Ignore. Borrow the QR token idea |
| jaltareyr/phonecam (S29) | MIT (page) | 0, date not shown | QR pairing, USB through ADB | Electron app, Windows only, alpha | Ignore |
| HiFiPhile/UVCamera (S30) | GPL-3.0 (page) | 1, date not shown | Phone as UVC webcam | Needs a rooted phone. GPL-3.0. | Ignore. Flag: GPL |
| paolorotolo/droidcam and Vuzix/Android-Webcam-Project | GPL-3.0 (search summary only, UNVERIFIED) | Not read | Webcam clients | Not opened | Ignore. Flag: GPL |
| stanfordnmbl/opencap-core (S2) | Apache-2.0 (page) | 383, date not shown | The reference design: 2 cameras, checkerboard, sync by keypoint speed | iOS capture and cloud. A local run needs a CUDA GPU, OpenSim and OpenPose. | Borrow ideas only |
| perfanalytics/pose2sim (S6) | BSD-3-Clause (page) | 870, date not shown | Offline 2-camera triangulation, BlazePose through a utility | Python install of up to 14 GB. Not a browser tool. | Borrow ideas only (sync by keypoint speed) |
| TemugeB/bodypose3d (search result, page read) | MIT (page) | 262, date not shown | Two-camera MediaPipe triangulation in Python | Needs calibrated cameras. Python only. | Ignore |

Findings:
- Landmark-only streaming from a phone page to a laptop page: I found no project (UNVERIFIED that none exists). Every phone-camera project sends video.
- No open project fits a static app with no backend and `connect-src 'self'`. The phone-as-webcam projects need a desktop program or a server. The WebRTC libraries need a signaling service.
- Flags: GPL-3.0 projects (UVCamera, the droidcam client, Vuzix) must not enter the repo. No AGPL project was found. OpenPose, which OpenCap can use, is non-commercial (plan section 1.2).

What we reuse: native `getUserMedia`, `enumerateDevices`, `RTCPeerConnection` and the Wake Lock API. Also the AOSP USB webcam mode and the webcam app that the user installs (not shipped with the app). Also the existing `camera.ts`, `landmarker.ts` and `loop.ts`.

What we build: `deviceId` support in `camera.ts`, a developer-only dual page, and a pure function that joins reps from two views. Only later: pairing with the native WebRTC API and a Zod message schema. We borrow only ideas: compact SDP, a signed and expiring pairing payload, a one-time token, and sync by keypoint speed.

## 6. KISS recommendation and first step

### 6.1 Recommendation

1. MVP: one camera, side view. Add one line to the setup screen: "Put the camera on the same side as your operated leg." The protocol field `side` already exists. No code change in `pose/`.
2. Keep the plan idea for C8 (FR24): the patient turns for a short set. This needs no second device.
3. If the user still wants both views at once, test option (a) first with the USB webcam mode. Reason: no signaling, no new dependency, no server. It also answers the one question that matters: does a front view give a useful C8 number in the same session as the side view?
4. Build option (b) only if that test shows value and the user wants patients to use it. Then decide between QR and a manual code (section 9).
5. Do not build options (c) and (d), and do not build 3D.

The answer is "not in the MVP" for four reasons. C1 to C6 gain nothing. C8 has no validated limit, and no live cue is allowed. No study covers MPFL patients. Every connection design adds a failure mode that the patient must solve.

### 6.2 Smallest testable first step (no phone needed for most of it)

Order, each step test first:
1. Zero code, 5 minutes, the user only. On the laptop, plug in the phone with USB and pick "Webcam" in the USB settings. Open the app page and run `navigator.mediaDevices.enumerateDevices()` in the console. Count the `videoinput` entries. This shows whether the phone appears as a second device.
2. Write a pure function `pairReps(sideReps, frontReps, maxGapMs)` with Vitest tests on synthetic traces: equal count, one missed rep, shifted clocks, gap limit. No camera.
3. Add an optional `deviceId` to `startCamera` and keep one stream for each source. Tests: two sources stop on every exit path (NFR9), a missing device gives the no-device text, and the old single-camera tests still pass.
4. Add a developer-only route (not linked from Home, not in patient mode) that starts two pipelines. It has two `<video>` elements, two landmarkers, two angle read-outs, time stamps and the median fps of each. It stores nothing. The loop already accepts any `HTMLVideoElement`.
5. Add a Playwright test that feeds the two pipelines from two looping video files (not from `getUserMedia`), so no phone is needed. Assert two landmark streams and no foreign request. The fake camera for one source stays as in T8.
6. Do the real test with the phone (option a). Record one set of mini squats with the side view on one device and the front view on the other. Record the fps of each view alone and together, the angle traces, and the rep times. Compare with a goniometer if one exists (T13 method).

Gate after step 6: continue only if all three answers are yes. The median fps of each view is at least 15 with both running (the NFR4 value). The front view finds the leg in most frames (the user sets the limit). A clinician says that the C8 number is of use. If one answer is no, stop.

## 7. Effect on the plan

| Item | Effect |
|---|---|
| T7 to T13 (MVP) | No change. |
| T8 (done) | `camera.ts` has module-level `active` and `facingMode: 'user'`. A second source needs a `deviceId` parameter and per-source state. `landmarker.ts` and `loop.ts` need no change. This is a small new task after T13. |
| T10 (Session screen) | It has one `video`. A second view is a later screen. Not now. |
| T13 | Add per-view accuracy and per-device fps, only if the dual page exists. The 9 degree margin has no front-view value and is unverified for it. |
| T12 | A dual-source e2e test is a later addition. |
| FR6, NFR1 | Still true for option (b). For option (a), video goes to the laptop. Word the claim for two devices (section 8.3). Add a test for WebRTC, because the CSP and the network log can miss it (section 3.2). |
| NFR9 | Stop the tracks of both sources on every exit path. For option (b), also on the phone page. |
| NFR7 | Option (b) with QR needs new entries in `scripts/allowed-deps.txt`. |
| FR18 | The privacy notice needs the lines of section 8.5. |
| FR24, C8 | Unchanged in meaning. The second camera only removes the turn. The plan stays: record for the clinician, no live cue, needs an own accuracy test and a clinician limit. |
| New requirement (draft) | FR25, priority F: "Optional second view from an Android phone." Acceptance: the dual page test of section 6.2. The user decides if it enters the plan. |

New risks:
- Patient setup failure (cable, phone maker mode, Wi-Fi isolation, lock screen, heat).
- WebRTC traffic is not covered by the CSP, so the privacy proof needs its own test.
- Two models on one laptop can drop below 15 fps (unmeasured).
- A claim of "two views" can suggest 3D accuracy. The app must not say it.
- Support load: a phone brand or an Android version that nobody can test.

## 8. Privacy and regulation

This section uses the plan, the earlier research and the pages named. It is not legal advice.

### 8.1 Data flow

| Option | Video | Landmarks | New recipient |
|---|---|---|---|
| One camera (MVP) | Stays in the laptop page | In the laptop page | None |
| (a) USB webcam mode | Phone to laptop on a cable | In the laptop page | None |
| (a) with a webcam app | Phone to laptop, vendor app on the phone | In the laptop page | The app vendor can process video (terms not read, UNVERIFIED) |
| (b) landmarks only | Stays on the phone | Phone to laptop, encrypted by DTLS (S12, VERIFIED) | None, if no STUN and no relay |
| (c) video to laptop | Phone to laptop | In the laptop page | None, if no STUN and no relay |
| Public STUN or relay | Not video | IP address and pairing data go to a third party | Yes |

### 8.2 GDPR

- "Personal data" is information about an identifiable person. "Data concerning health" is personal data about physical or mental health (Art. 4, S22, VERIFIED). The ban on processing health data has exceptions. Two are explicit consent (Art. 9(2)(a)) and care under a health professional (Art. 9(2)(h)) (S23, VERIFIED).
- Landmark numbers that the app links to a patient and a session are data concerning health, in my reading (UNVERIFIED). A second device does not change this. The data stay with the same person.
- Biometric data (Art. 4(14)) needs processing that allows unique identification. The app computes angles, not identity. This is my reading (UNVERIFIED).
- A second device is new equipment under the control of the patient. It does not add a controller by itself. Whether the app maker is a controller for a purely local app is a question for the expert (UNVERIFIED, plan section 11).
- Two cameras see more of the room. A person who walks into the frame is in the video. NFR9 already says this for one camera.

### 8.3 The claim "no video leaves the device"

- Option (b): the claim stays true if it says "no video leaves the phone or the laptop".
- Option (a): the claim must change to "no video leaves your own devices". With a webcam app, the vendor terms decide the truth (UNVERIFIED).
- Never use a public STUN server, a public signaling relay or a cloud service for pairing. Each breaks the claim or the "own origin only" rule.
- `blockForeignFetch` in `landmarker.ts` blocks only `fetch`. It does not stop WebRTC. A new guard and a new test are needed.

### 8.4 Intended purpose and class

- A second camera does not change the intended purpose: monitoring under a protocol. The front-view measure C8 adds a measured quantity for the clinician. The plan already holds it back for an expert review (plan section 1.5, `research/form-opus.md` section 2.5).
- Whether the intended purpose must name the supported camera setups: ask the expert (UNVERIFIED). In this session I did not open MDCG 2019-11 or Annex VIII.
- Claims of 3D or "accurate valgus" raise the burden of proof. The app must not make them.

### 8.5 What the app must tell the patient

- Both cameras are on during the set. The phone screen shows "Camera on. No video is sent."
- Other people in the room appear in the view of both cameras.
- Use only your home Wi-Fi. Do not use public or guest Wi-Fi.
- Leave the phone screen on and do not touch it during a set. Close the phone page at the end.
- The phone page stores no data. All data stay in the laptop page.

## 9. Decisions for the user

1. Accept "no second camera in the MVP" and the text "Put the camera on the operated side"?
2. If a second view comes later: is it for you only, or for patients? For you only, option (a) is enough. For patients, option (b) is the only realistic one.
3. For option (b): which pairing? A QR flow with libraries for encoding and decoding, a manual code with copy and paste, or a small relay server. The relay breaks "no backend". I advise against it.
4. Is a hosted HTTPS address for the static app acceptable? A phone cannot use the app over plain `http://<laptop-ip>`.
5. Can the allowed-dependency list grow (QR encoder and decoder)?
6. Which wording for the privacy claim with two devices (section 8.3)?
7. Can patients use third-party webcam apps? I advise against it. Their data path is unverified.
8. Does a clinician want C8 in the first release, and who sets the limit? This stays open from the plan.

What the user must provide for a real test:
- Android phone model, Android version and security patch level (Settings, About). USB webcam mode needs Android 14 QPR1 or higher and support from the phone maker.
- Chrome version on the phone and on the PC. The PC operating system. The browser must run on the PC itself, not inside WSL, to see a USB camera (my reading, UNVERIFIED).
- A USB data cable (not charge-only). The USB version of the port.
- For option (b) later: the router model, whether guest or client isolation is on, and the Wi-Fi band. A hosted HTTPS address or a certificate plan.
- A phone stand, a safe place for the phone, and consent to record a test set.

## 10. Items not verified and sources

### 10.1 Not verified

- The OpenCap statement "We do NOT support Android": the official contact page did not load text. Only a search summary shows it.
- Windows "Connected camera" through Link to Windows, Camo, and Chrome or ChromeOS camera options: not opened.
- Whether USB webcam mode needs an unlocked phone: search summary only.
- DroidCam privacy statement ("local network"): vendor page only, no audit. The terms of all webcam apps: not read.
- Chrome mDNS behaviour today: the IETF text is an old draft. A blog summary supports it but I did not open it.
- Whether an empty `iceServers` list gives host candidates only: not opened.
- The size of a standard data channel SDP (about 2,500 bytes): search summary only.
- Whether the Playwright network check sees WebRTC traffic: not tested.
- Whether Playwright can give two pages two different fake videos: not tested.
- MediaPipe WASM and GPU delegate on Android Chrome, and the phone frame rate with `lite`: no source, no test.
- Battery and heat of a phone that runs the camera and the model: no source.
- Network latency of a data channel on a home network: no source.
- The behaviour of Chrome for Android in the background (S19) comes from an old Mozilla bug comment. The current version is not checked.
- Licenses of all repos: I read the license label from the API or the page. I read no LICENSE text.
- The push date of 8 repos: the API limit ran out.
- OpenCap article: I read 100,000 of 156,998 characters. The squat knee flexion table (S2 Table) was not read.
- The ACL study (S3) and the OpenCap Monocular post (S5) were read as abstract or post only.
- No MPFL study with two cameras was found. The search was not systematic.
- MDCG 2019-11, Annex VIII and EDPB guidance: not opened in this session.

Downloaded content was treated as untrusted data. I ran no code from it. The fetch tool saved one PDF (the OpenCap Q&A), and it was not readable.

### 10.2 Sources opened

- S1 OpenCap paper, DOI 10.1371/journal.pcbi.1011462: https://journals.plos.org/ploscompbiol/article?id=10.1371%2Fjournal.pcbi.1011462
- S2 opencap-core: https://github.com/stanfordnmbl/opencap-core
- S3 Turner 2024, DOI 10.1016/j.jbiomech.2024.112200 (DOI from a search result): https://cdr.lib.unc.edu/concern/articles/47429p841
- S4 OpenCap and LESS, DOI 10.3390/jcm14248879: https://pmc.ncbi.nlm.nih.gov/articles/PMC12734019/
- S5 OpenCap Monocular post: https://mobl.mech.utah.edu/opencap-monocular-released/
- S6 Pose2Sim: https://github.com/perfanalytics/pose2sim
- S7 RocSync, Sensors 2026, 26(3):1036: https://pmc.ncbi.nlm.nih.gov/articles/PMC12900090/
- S8 Knee valgus with MediaPipe, Heliyon 2024: https://pmc.ncbi.nlm.nih.gov/articles/PMC11399566/
- S9 2D frontal and sagittal markerless gait, PLOS ONE, DOI 10.1371/journal.pone.0293917: https://pmc.ncbi.nlm.nih.gov/articles/PMC10635560/
- S10 Multi-camera and single-camera gait: https://pmc.ncbi.nlm.nih.gov/articles/PMC12942615/
- S11 MDN getUserMedia: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- S12 MDN RTCDataChannel: https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel
- S13 MDN WebRTC connectivity: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
- S14 MDN Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- S15 MDN CSP connect-src: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
- S16 AOSP "Use a device as a webcam": https://source.android.google.cn/docs/core/camera/webcam
- S17 IETF draft mDNS ICE candidates: https://datatracker.ietf.org/doc/html/draft-ietf-rtcweb-mdns-ice-candidates-00
- S18 webrtcHacks, minimum viable SDP: https://webrtchacks.com/the-minimum-viable-sdp/
- S19 Mozilla bug 1564451: https://bugzilla.mozilla.org/show_bug.cgi?id=1564451
- S20 Chrome DevTools, local server on Android: https://developer.chrome.com/docs/devtools/remote-debugging/local-server
- S21 MediaPipe Pose Landmarker, web: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
- S22 GDPR Art. 4: https://gdpr-info.eu/art-4-gdpr/
- S23 GDPR Art. 9: https://gdpr-info.eu/art-9-gdpr/
- S24 DroidCam: https://www.droidcam.app/
- S25 Iriun: https://iriun.com/
- S26 libp2p-webrtc-qr: https://github.com/NiKrause/libp2p-webrtc-qr
- S27 qwbp: https://github.com/magarcia/qwbp
- S28 OmniCam: https://github.com/Orest-Z/OmniCam
- S29 phonecam: https://github.com/jaltareyr/phonecam
- S30 UVCamera: https://github.com/HiFiPhile/UVCamera
- S31 GitHub API, one call each for trystero, peerjs, simple-peer, camera-cast, webwebcam, libp2p-webrtc-qr: https://api.github.com/repos/dmotz/trystero (same pattern for the others)
- S32 Trystero guide: https://trystero.dev/guides/webrtc-without-signaling-server/
- S33 PeerJS README: https://github.com/peers/peerjs
