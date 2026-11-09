# Live test 3: the second camera

Date: 2026-11-08. Tree: commit b451206, built app in `app/dist`, served with `vite preview` on `127.0.0.1:4304`.
Tester: one independent session. The tester changed no file of the app. This is the only file that the tester wrote in the repo.

Evidence folder (EV): `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/t3/`.
Every path in the tables is relative to EV. The evidence never enters the repo. No clip and no frame of a clip is in the repo.

## Summary

The second camera works end to end in two real Chromium browsers with real video on both sides. The real QR scan works in both directions. The paste path works too.
The data channel carries only `hello`, `landmarks` and `bye`. No message holds an image, a frame or a video. No message is larger than 1125 bytes. The peak rate is 13 messages in one second.
The peer connections have no track, no transceiver, no `m=video` line and no ICE server. Both browsers called only the own origin. No console error came from the app.
The failure and cleanup paths all behaved as designed. The camera tracks ended on both sides in every case. The link closed in every case.
The tester found no HIGH issue. The tester found two MEDIUM issues (L3-01 and L3-04) and five LOW issues. The most important finding is about the meaning of the front-view number, see L3-01.
Two checks FAIL. One is the pairing when a second phone holds the same offer (L3-02). The other is the label of the Care team column (L3-03).
Nothing was tested on a real phone, on a real tailnet or with a real Wake Lock. The Wake Lock is a risk for a real run, see L3-04.

How the tester ran the checks:
- The laptop was Chromium at 1280 by 800. The phone was a second Chromium process at 390 by 844. Each browser had its own fake camera file.
- The laptop played a side clip. The phone played the front clip 07 (`clips-real/webcam/07-mini-squat-front.mjpeg`).
- The flag `--disable-features=WebRtcHideLocalIpsWithMdns` was on, except in check 43.
- The laptop clip is a crop of clip 01 (heel slide, left leg), padded with still frames at the start. Without the crop the setup check never reached "ready". The crop is in `zoom/01-zoom7.mjpeg`.
- The tester used real clicks and real pasted text. The tester read the key screenshots by eye.

Skills really loaded with the Skill tool: `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:a11y-debugging`, `owasp-security`, `simple-english:simple-english`. All four loaded. The tester drove the browsers with Playwright scripts and not with the MCP tools.
The tester read `docs/pairing-wiring.md`, `TASKS.md`, the guardrails skill, the pairing code and the plan lines FR24 and FR25. The tester read the QR conditions of `docs/dependency-vetting.md` (C6, C7 and section 5). The tester did not read the research notes and `docs/security-review.md` in full.

## Table of checks

Result words: PASS, FAIL, NOT RUN. Count at the end of the table.

| # | Check | What I did | What I saw | Evidence | Result |
|---|---|---|---|---|---|
| 1 | Real QR scan of the offer | Took a screenshot of the QR element on the laptop page. Made an mjpeg with ffmpeg. Gave it to the phone browser as its fake camera. Pressed "Scan the laptop code". | The phone read the code in 910 ms and showed its own answer code. The real jsqr, `getImageData` and the 600 character cap ran on a really rendered code (140 characters). | `a1-out.json`, `offer-qr.png`, `offer-qr.mjpeg`, `shots/a1-05-phone-answer.png` | PASS |
| 2 | Real QR scan of the answer | Took a picture of the phone QR. Streamed it into the scan video element of the laptop page with a canvas `captureStream`. | The scan loop of the laptop read the code. Both sides showed "Connected" in 1.3 s. The laptop camera device was not used for this step (see "What was not tested"). | `a1-out.json`, `answer-qr.png`, `shots/a1-06-laptop-after-answer-scan.png` | PASS |
| 3 | Paste fallback | Pasted the offer on the phone and the answer on the laptop, in about 20 runs. | Pairing worked each time. "Connected" showed on both sides. | `b1-out.json`, `b2-out.json`, `c1-out.json` | PASS |
| 4 | Wrong secret refused (paste) | Pasted the answer of offer B into laptop A. | Laptop A showed "Could not pair. The app continues with one camera." and closed its link. Phone B kept waiting. Laptop B then paired with the right answer. | `b1-out.json` (S1), `shots/b1-s1-wrong-secret-laptop.png` | PASS |
| 5 | Wrong secret refused (real scan) | Gave the laptop an answer QR of another offer as its scan source. | The laptop showed the fixed failure text. No connection started. | `b1-out.json` (S4), `shots/b1-s4-real-scan-wrong-secret.png` | PASS |
| 6 | Bad codes refused | Pasted garbage, a wrong prefix, a cut offer, an offer as answer and 706 characters on the laptop. Pasted garbage, an answer as offer and 706 characters on the phone. | Each paste gave the text "This is not the code of the phone. Scan the code on the phone screen again." (laptop) or "This is not the code of the laptop. Scan the code on the laptop screen again." (phone). The offer stayed open. The right code then connected. | `b1-out.json` (S2) | PASS |
| 7 | Offer older than 120 s refused | Used the Playwright clock. Moved the laptop 121 s ahead. Pasted the right answer. | The laptop showed the fixed failure text and closed the link. Control: an answer at 100 s connected. | `b1-out.json` (S3a, S3b), `shots/b1-s3a-expired-offer.png` | PASS |
| 8 | Phone answer not used in 120 s | Moved the phone clock 121 s ahead after it showed its answer code. | The phone showed the fixed failure text. Its camera track ended and its peer connection closed. | `b1-out.json` (S3c) | PASS |
| 9 | Second answer to one offer is refused | Two phones took the same offer. Pasted the answer of phone B, then typed the answer of phone A. | The button "Use this code" was disabled after the first answer. The second answer could not reach the laptop. | `c3-out.json` (A1), `c4-out.json`, `c4b.mjs` | PASS |
| 10 | Pairing works when a second phone holds the offer | Repeated check 9 four times. | The first answer connected in 1 run of 4. In 3 runs the laptop stayed on "Connecting to the phone" and closed after about 18 s. A single phone connected at once. | `c4-out.json`, `c3.log`, `c4b.mjs` | FAIL |
| 11 | Replay of the one-time secret | After "Connected", the phone sent the same `hello` again on the channel. | The laptop closed the link. The phone showed the fixed failure text. | `c3-out.json` (R1), `shots/c3-replay-laptop.png` | PASS |
| 12 | Bad messages refused | The phone sent a `landmarks` message with an extra `image` field, a message over 4096 bytes (5762) and a binary message. | The laptop closed the link in all three cases. | `c3-out.json` (R2, R3, R4) | PASS |
| 13 | Skip keeps one camera | Pressed "Skip, use one camera", started the camera and ran the session. Saved it. | No peer connection was made. No chip showed. The session ran. The record has no `secondView`. | `b1-out.json` (S5), `shots/b1-s5-skip-session.png` | PASS |
| 14 | Chip "Second camera connected" | Looked at the Session screen while connected, after phone Stop, after a link loss and after Skip. | The chip showed once while connected. It was gone in the other three cases. | `a2-out.json`, `b2-out.json` (B2a), `d1-out.json`, `shots/a2-06-laptop-session-start.png` | PASS |
| 15 | Message types | Logged every `send` and every `message` event on both channels. | Phone sent 1185 messages: 1 `hello`, 1183 `landmarks`, 1 `bye`. Laptop received 1184. The laptop sent only `bye`. | `a2-msgs-phone.json`, `a2-msgs-laptop.json`, `a2-msg-analysis.txt` | PASS |
| 16 | Size and rate | Measured bytes and the count in a sliding 1 s window. | Size: 14 to 1125 bytes, median 1123. Zero messages over 4096. Phone peak: 13 in 1 s. Mean: 9.6 each second. | `a2-msg-analysis.txt` | PASS |
| 17 | Content of the messages | Parsed all messages with the Zod schema of the app (`parseMessage`). Looked at the field names and the landmark indexes. | All 1184 messages are valid. Fields: `type,tMs,view,aspect,landmarks`. No image, frame, video or base64 field. No `data:` or `blob:` text. Only indexes 23 to 28 (the 6 leg joints) hold values. The other 27 are zero with visibility 0. | `a2-msg-analysis.txt` | PASS |
| 18 | No video on the connection | Inspected `getSenders`, `getReceivers`, `getTransceivers` and the SDP of both peers. | Senders 0, receivers 0, transceivers 0. The only media line is `m=application ... webrtc-datachannel`. No `m=video`. One ordered channel "mpfl". | `a2-peer-inspect.json` | PASS |
| 19 | No ICE server, no other origin | Read the `RTCPeerConnection` config, the network log and the CSP events on both browsers. | `iceServers` is `[]`. Every request went to `http://127.0.0.1:4304`. No WebSocket, EventSource or XMLHttpRequest. No CSP violation. | `d1-out.json`, `a2-out.json` | PASS |
| 20 | Front-view record stored | Ran 100 s of the session with 9 counted reps. Saved. | The record has `secondView: front`, `frontReps: 9`, `frontChangeDeg: 6.7`. | `a2-store-sessions.json`, `a2-store-sessions-run3.json` | PASS |
| 21 | The front-view number is a real measure of the knee | Needs one synchronised recording of one person with two cameras. | Not possible with two unrelated clips. See L3-01 for what the tester can say. | `a2-front-offline.txt` | NOT RUN |
| 22 | No front-view number or valgus word for the patient | Read the live Session text 12 times, the Summary and the saved screen. | No hit for valgus, inward, front-view, front view, knee alignment or second view. | `d1-out.json`, `a2-out.json` | PASS |
| 23 | Care team column label | Exported the JSON. Opened it in "Care team view". | The column header is "Front-view change (degrees)". The exact text "Front-view change, estimated, not a medical measurement" is in the note above the table. See L3-03. | `shots/a2-12-care-team.png`, `a2-out.json` | FAIL |
| 24 | Phone Stop during the session | Pressed Stop on the phone while the laptop ran the session. | The laptop showed "The second camera stopped. The session continues with one camera." once. It stayed once after 8 s. The chip went away. The laptop camera and the session went on. | `b2-out.json` (B2a), `shots/d2-1280x800-after-phone-stop.png` | PASS |
| 25 | Link lost with no `bye` | The phone closed its peer connection with no message. | The laptop showed "Could not pair. The app continues with one camera." once. The session went on. | `d1-out.json` (D2), `shots/d1-laptop-link-lost.png` | PASS |
| 26 | Phone Cancel | Pressed Cancel on the scan step and on the answer step. | The camera track ended. The peer connection closed. The screen went back. The laptop kept "Waiting for the phone". | `b2-out.json` (B2f, B2f2) | PASS |
| 27 | Laptop Cancel, Skip and Stop | Pressed Cancel and Skip after the offer. Pressed Stop in the session. | Tracks ended. Peer connections closed. After Stop the phone showed "Stopped" with its track ended. | `b2-out.json` (B2g, B2h, B2i) | PASS |
| 28 | Hidden tab and pagehide | Sent `visibilitychange` (hidden) and `pagehide` to the phone page and to the laptop page. | In all four cases both sides closed the link and both tracks ended. The laptop showed the stopped notice after a phone event. | `b2-out.json` (B2b to B2e) | PASS |
| 29 | Real hidden tab | Opened a second tab and brought it to the front. | Headless Chromium kept `visibilityState` at "visible". The tester used the synthetic event of check 28. | `b2-out.json` (B2b) | NOT RUN |
| 30 | Companion on a new device | Opened a fresh browser profile on the phone side. | The first screen is "Privacy". After "I understand" the Load screen has the phone button. The three IndexedDB stores stay empty (0, 0, 0). | `c1-out.json`, `b2-out.json` (B2j) | PASS |
| 31 | Companion never runs an exercise | Read all companion screens and the buttons. | No red-flag screen. No exercise name, rep count, limit or phase. The only button in the run step is "Stop". | `b2-out.json` (B2j), `shots/b2-j-phone-run-no-wakelock.png` | PASS |
| 32 | Wake Lock request | Counted `navigator.wakeLock.request("screen")` calls. Removed `navigator.wakeLock` in a second run. | The call is made once. Headless Chromium rejected it with NotAllowedError. The page ran as usual. With no API the page also ran as usual. | `a2-out.json`, `b2-out.json` (B2j) | PASS |
| 33 | Real Wake Lock | Needs a real phone. | Not run. See L3-04. | none | NOT RUN |
| 34 | Pose loop speed with the second source | Counted video frame callbacks of the laptop for 60 s after the session start. | Median 14.99 frames each second (mean 13.8). With one camera (Skip) the median was 19.96 (mean 17.8). Both browsers shared one machine. Two earlier runs gave medians of 15.0 and 12.0. | `c3-out.json` (F1, F2), `a2-out.json` | PASS |
| 35 | Phone loop speed | Same count on the phone page for 60 s. | Median 15.0 (mean 13.7). | `c3-out.json` (F2) | PASS |
| 36 | Landmark rate seen by the laptop | Counted `message` events on the laptop. | Mean 10.1 each second. After a stall of the laptop thread (model load) 71 messages came in 1 s. The app drops messages before the session starts. | `a2-msg-analysis.txt` | PASS |
| 37 | Latency | Matched each message by text. Used the time origin of each page (one machine, one clock). | After the first 8 s: send to arrival median 40.7 ms, p95 85.5 ms. Frame time to arrival median 126 ms, p95 191 ms. In the first 8 s the maximum was 5997 ms (laptop busy in Setup). The laptop stamps each frame with its own arrival time. | `a2-latency.txt` | PASS |
| 38 | Payload size | Decoded offer and answer. | Both have 140 characters with 3 real IPv4 candidates (172.18.0.1, 172.17.214.18, 100.77.0.108). The cap is 600. | `c3-out.json` (P1) | PASS |
| 39 | Payload format | Tested the text with a pattern. | Both start with `MPFL1.` and then base64url only. Offer and answer carry the same one-time secret. | `c3-out.json` (P1) | PASS |
| 40 | QR at 390 px, light and dark | Took an element screenshot of the QR on each side. Decoded it with jsqr. | The frame is 312 px wide at 390 px. The frame stays `rgb(255, 255, 255)` with `rgb(0, 0, 0)` modules in both themes. All 8 codes decode to the exact text. | `c1-out.json`, `c1-qr-*.png`, `shots/c1-Host-offer-phone-dark.png` | PASS |
| 41 | Pairing without the mDNS flag | Started both browsers with no Chromium flag. | Pairing connected. The offer had real IPv4 candidates, not `.local` names. The app opens the camera before the offer, and the camera permission shows real addresses. | `c3-out.json` (M1) | PASS |
| 42 | Console errors | Collected `console` and `pageerror` on both pages in the long runs. | No page error. The only `error` lines: the MediaPipe line "INFO: Created TensorFlow Lite XNNPACK delegate for CPU." and, once, an AudioContext device error on the laptop (no audio device in headless). | `a2-out.json`, `d1-out.json` | PASS |
| 43 | axe on every pairing screen | Ran axe (WCAG 2.0 A, AA, 2.1 AA, 2.2 AA) on 12 screens at 390 and 1280, light and dark. | 0 violations in 48 runs. | `c1-out.json` | PASS |
| 44 | Focus on the h1 | Read the focused element after each screen change. | The h1 has the focus on each pairing screen. The first-launch Privacy screen leaves the focus on the body (L3-05). | `c1-out.json` | PASS |
| 45 | 48 px targets | Measured every button, link, textarea and select. | No pairing control is smaller than 48 px. A link on the Privacy screen is smaller (L3-05). Radio inputs (26 px) have bigger labels and were skipped. | `c1-out.json` | PASS |
| 46 | Mini squat with its own clip | Tried clip 05 with a phase 2 protocol. | The setup check never became ready in 25 s. The tester used the heel slide with clip 01 for the session checks. | `probe-setup.mjs` | NOT RUN |
| 47 | Real phone, real tailnet | Needs the user. | Not run. | none | NOT RUN |
| 48 | Camera denied during pairing | Not tried. | Not run. | none | NOT RUN |

Count: PASS 40, FAIL 2 (rows 10 and 23), NOT RUN 6 (rows 21, 29, 33, 46, 47, 48). Total 48.

## Message log summary

Source: `a2-msgs-phone.json`, `a2-msgs-laptop.json`, analysis in `a2-msg-analysis.txt` (run of 123 s, 9 counted reps).

| Item | Value |
|---|---|
| Phone sends | 1185 (1 `hello`, 1183 `landmarks`, 1 `bye`) |
| Laptop receives | 1184 (1 `hello`, 1183 `landmarks`) |
| Laptop sends | 1 (`bye`) |
| Size of a `landmarks` message | 1123 to 1125 bytes |
| Largest message | 1125 bytes (limit 4096) |
| Mean rate | 9.6 messages each second |
| Peak rate in a sliding 1 s window | 13 (limit 15) |
| Field names | `type`, `tMs`, `view`, `aspect`, `landmarks` (and for `hello`: `v`, `secret`) |
| Landmarks with values | indexes 23 to 28 only (hip, knee, ankle of both legs) |
| Landmarks that are zero | 27 of 33, with visibility 0 |
| Messages that fail the Zod schema | 0 |
| Image, frame, video, `data:` or `blob:` text | 0 |
| `tMs` order | never goes back |
| Stall in the log | 5 s gaps near 40 s and 85 s. The cause is the fake webcam file that restarts (test setup). |

## Front-view value

The saved record after 9 counted reps: `secondView: front`, `frontReps: 9`, `frontChangeDeg: 6.7` (positive means inward).
The tester replayed the real landmarks that the phone sent (`a2-front-offline.txt`) with the formula of `src/lib/views.ts`.
- Left leg (the chosen leg): the alignment ranged from -19.6 to +4.1 degrees. The median was -1.6. A rolling window of 3.5 s gave a largest change with a median of 5.3 and a 90th percentile of 12.2.
- So 6.7 degrees lies inside the normal movement band of this clip. The magnitude is plausible for the clip.
- The number has no clinical meaning here. The two clips show two unrelated people. The rep windows come from the side clip. The front clip is not in step with them.
- Right leg (not chosen): 27 frames had an alignment beyond 25 degrees, down to -56.9. The typical value was within 11 degrees. If the patient chooses the right leg, a short cluster like this sets the record. The earlier result of -45.7 degrees fits this pattern.

## Issues

No HIGH issue found. No frame, no video and no image left a device.

### L3-01 MEDIUM. The front-view number can be an outlier and hides its sign
- Source: design (`frontKneeInward` and `createFrontRecorder` in `src/lib/views.ts`) and the plan row FR24.
- Steps: pair two browsers, run a session with 9 counted reps, export the file, open the Care team view. Then replay the sent landmarks with the formula.
- Expected: a number that a clinician can trust as an estimate of one rep.
- Actual: the record keeps one signed value, the largest absolute change in one rep, taken over all reps. One short cluster of odd frames sets it. For the right leg of clip 07 this means a value near -45 degrees. It comes from 27 frames. The typical value in that clip is within 11 degrees. The sign of the mean (outward in this clip) is not in the record. Only the number is stored, with no count of usable frames per rep and no spread.
- Evidence: `a2-front-offline.txt`, `a2-store-sessions-run3.json`.
- Suggestion for the main session: store the median of the reps and the maximum, or ignore a rep with a single odd frame. This needs a decision, because the plan says "largest change".

### L3-02 LOW. A second phone that took the same offer can stop the first pairing
- Source: app or design, not sure. Possibly the ICE checks of the second phone.
- Steps: laptop shows the offer. Two phones paste the offer. Paste the answer of phone B on the laptop. Do not paste the answer of phone A.
- Expected: phone B connects. The answer of phone A is not used.
- Actual: in 3 runs of 4 phone B did not connect. The laptop stayed on "Connecting to the phone" and closed after about 18 s. The result is safe. The patient can try again.
- Evidence: `c4-out.json`, `c4b.mjs`, `c3.log`. The laptop text at the end was not recorded.

### L3-03 LOW. The Care team column header is not the label that the brief names
- Source: app, or the brief.
- Steps: export the JSON after a paired session. Open "Care team view" and load the file.
- Expected: a column with the exact label "Front-view change, estimated, not a medical measurement".
- Actual: the column header is "Front-view change (degrees)". The exact sentence is in the note above the table, followed by "Inward is positive. The value is the largest change in one rep. It comes from the second camera." The guardrails ask for the label next to the number. The note is next to the table, not next to the cell.
- Evidence: `shots/a2-12-care-team.png`, `a2-out.json` (care team).

### L3-04 MEDIUM. The phone screen says that the screen stays on, but the Wake Lock can fail
- Source: app.
- Steps: open the phone screen. Read the intro. Press "Scan the laptop code" and pair. Repeat with `navigator.wakeLock` removed.
- Expected: the text matches what happens, or the app tells the patient when the screen can turn off.
- Actual: the intro says "The screen stays on while the phone works." The app only asks for a Wake Lock. Headless Chromium rejected the request (NotAllowedError). With no `wakeLock` API the page ran with no warning. A phone on an address that is not a secure context has no Wake Lock. Then the screen will turn off during a set. The page becomes hidden, the link closes, and the laptop shows "The second camera stopped." The fallback is safe, but the text is not true.
- Evidence: `a2-out.json` (phone wake lock), `b2-out.json` (B2j), `shots/b2-j-phone-run-no-wakelock.png`.

### L3-05 LOW. First-launch Privacy screen: focus on the body and a small link (outside the pairing area)
- Source: app.
- Steps: open the app in a fresh profile.
- Expected: the h1 has the focus. The link has a target of 48 px or more.
- Actual: the focus is on the body. The link "Third-party software notices" is 46 px high at 390 px and 23 px high at 1280 px.
- Evidence: `c1-out.json` ("Phone first launch Privacy").

### L3-06 LOW. On a short laptop screen the stop notice can sit under the bottom bar
- Source: app (layout).
- Steps: pair, start the session in a window of 1366 by 680, press Stop on the phone.
- Expected: the notice "The second camera stopped. The session continues with one camera." is fully visible.
- Actual: the notice is in the page and has `role="status"`. At 680 px height its lower part is under the fixed bar with "Stop". At 800 px height it is fully visible. After a hidden laptop tab the same notice was under the bar too.
- Evidence: `d2-notice.mjs`, `shots/d2-1280x800-after-phone-stop.png`, `shots/b2-d-laptop-hidden.png`.

### L3-07 LOW. After a hidden laptop tab the session stays on screen with a black video and no visible text
- Source: app, outside the pairing area. The tester set `visibilityState` to hidden with a script, so a real tab can differ.
- Steps: connect, start the session, send `visibilitychange` (hidden) on the laptop.
- Expected: the session closes, as `TASKS.md` says ("hidden tab: the camera ends and the session closes").
- Actual: the camera tracks ended and the link closed on both sides. The screen kept the heading "Heel slide" with "-- degrees" and a black video. The main tester of the camera flow must check this.
- Evidence: `b2-out.json` (B2d), `shots/b2-d-laptop-hidden.png`.

## What was good

- Real QR scan in both directions with the real reader. The 140 character code decodes in light and dark at 390 px.
- Strict message schema. Extra field, large message, binary message and a replayed `hello` all close the link.
- No video object exists on the peer connection. No outside request.
- Every exit path stops the camera and the link on both sides.
- axe found 0 violations in 48 runs.
- The fixed failure texts show once.

## What was not tested

- A real phone, a real Android Chrome, a real rear camera and the real tailnet (`100.77.0.108`). Live run B stays UNPROVEN.
- A real Wake Lock. Headless Chromium rejected the request.
- A real hidden tab and a real locked screen. Only the synthetic events ran.
- The scan of the answer with the laptop camera device. The tester gave the picture to the page video with a canvas stream. The scan loop and the reader were real. The camera layer was not.
- A synchronised two-camera recording of one person. The front-view number cannot be judged without it.
- The mini squat with its own clip. The setup check never became ready for clip 05.
- A camera permission that the person denies during pairing.

## Cleanup

Removed: the `vite preview` process (node PID 619928, with its parent processes 619927 and 619875). Six large test clips that the tester made in `zoom/`. The raw frames of one test.
Kept: all evidence files in EV and the clip `zoom/01-zoom7.mjpeg`, because the checks of the report cite them.
The browsers of the scripts closed by themselves. Seven other Chromium processes belong to another session and were not touched.
