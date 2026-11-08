# WebRTC pairing: video review, options and test environment

Date: 2026-11-08. This file supports task T12b (second device). It adds to `dual-camera.md` and `dual-camera-opus.md`. Marks: V (read in this session), INFERRED (my reading), UNVERIFIED (not opened).

## 1. The video the user shared

Source: https://www.youtube.com/watch?v=g42yNO_dxWQ, "Want to make a video chat app? Watch this video for WebRTC!", presenter "Rob", 82 minutes. I did not watch it. I read its full transcript (2,196 lines, fetched with a throwaway Python package in a scratch folder). I did not read the code repository that the description links to.

What the video builds (V, transcript):
- A Node server with Express and Socket.IO. It serves the page and acts as the signaling server (about 25:00 to 31:00).
- HTTPS with a local certificate made by a tool called mkcert, because the camera API works only on HTTPS (about 35:54 to 36:13). A phone shows a certificate warning and the user taps "Advanced" and "Proceed" (41:36 to 42:00).
- A phone test on the same Wi-Fi. The author puts the PC address (192.168.x.x, port 8181) into two places in the code. The author opens the same address on the phone. Then the two devices call each other (39:47 to 42:20).
- Public STUN servers from Google, to find public addresses (17:03 to 19:25).
- Video and audio streams. The transcript never mentions a data channel (INFERRED: the video does not use one).
- A dummy user name and password only to name the clients (45:28 to 50:55).

The user said that the video creates a link that anyone can open to join the session. The transcript does not show that:
- The link is only the address of the page on the PC. There is no invite link, room code or session id (the words "room" and "share" do not appear).
- The devices pair because both connect to the same signaling server. One client clicks Call. The server keeps the offer. The other client sees a green Answer button for each offer (43:56).
- The author says the signaling channel is not part of WebRTC. Any channel works, even copy and paste (24:00 to 24:25).

## 2. What we reuse and what we leave out

| Item in the video | Our decision |
|---|---|
| WebRTC basics: offer, answer, ICE candidates | Reuse the concepts. Use the browser API directly. |
| Signaling by a Socket.IO server | Leave out for the patient app. A patient cannot run a Node server. A hosted relay is a back end, which this plan avoids. |
| Public Google STUN servers | Leave out. They send address data to a third party. Use `iceServers: []` on a local network. |
| Video streams between peers | Leave out. Our phone sends landmark numbers only, over a data channel. No video leaves the phone. |
| mkcert certificate with a warning on the phone | Good for a developer test. Not for patients. A hosted HTTPS address has a normal certificate. |
| LAN address typed into the code | Leave out. It is fragile. A hosted address or a name works better. |
| The repository code | Not read. Its license is UNVERIFIED. Write our own code. |

## 3. Pairing options for T12b

All three keep landmarks only on the data channel. They differ in how the two pages exchange the connection messages (offer and answer).

| Option | Steps for the patient | Server | Privacy | Cost to build | Main risk |
|---|---|---|---|---|---|
| A. Serverless, two QR codes | The laptop shows a QR code. The phone scans it with its camera app and opens the page. The phone shows a QR code. The laptop scans it with its webcam. | None (a hosted static page only) | Best. No third party sees any data. | Medium. QR encoder and decoder. The offer must be small. | The offer must fit a QR code. Scanning in poor light. |
| B. Link and code, no relay | The laptop shows a link. The patient sends it to the phone with their own messaging app. The phone sends an answer code back the same way. | None | Good. The message app sees the code. | Low | More manual steps. A patient can mistype. |
| C. Link with a relay (the video's pattern) | The laptop shows one QR code or link. The phone opens it. Pairing is automatic. | A small hosted relay | The relay sees address data and the offer, not video or landmarks. | Medium, and a service to run | A back end to host and secure. A new data processor to review. |

Ranking for this app: A first, then B as a fallback. Choose C only if the real-phone test shows that A and B are too fiddly. This agrees with `dual-camera-opus.md`. The video shows the pattern of C. It is the usual way, and it is also the easiest for a patient.

## 4. Test environment (this PC, read-only checks)

Facts read on 2026-11-08 (V):
- Linux runs in WSL2 behind Windows, on an internal network (172.17.x.x). The Windows Wi-Fi address is 192.168.1.239 with mask 255.255.255.0. The IPv4 gateway is 192.168.1.254.
- Only the gateway is in the ARP table. No other device has talked to this PC, so client isolation cannot be tested from here. The router setting needs the router page or a phone test.
- Windows did not give the Wi-Fi band and signal. It needs location permission and admin rights. The Chrome version was not readable.
- Tailscale is installed. The tailnet lists the PC (two nodes) and an Android device named `redmi-a3`, offline for 12 days. The user confirmed on 2026-11-08 that this is the phone. It is a low-end Xiaomi Redmi A3 (the model class is INFERRED from the name). A low-end phone makes the 15 frames per second target harder.
- `ffmpeg` is not installed and `sudo` asks for a password. The user must run the install command.

What this means for the test:
- A phone on the Wi-Fi cannot reach a dev server inside WSL2 by the LAN address (V in `dual-camera-opus.md`, R24). Options: a Tailscale address, WSL mirrored networking, or a server on the Windows side.
- Tailscale can remove two problems at once: client isolation, and HTTPS with a valid certificate. This is UNVERIFIED. It comes from my knowledge of `tailscale serve` and was not opened here. It needs the Tailscale app on the phone. It is a developer test route and not a patient route.
- Chrome hides local addresses behind random names. A page that has camera permission shows real addresses (UNVERIFIED in an official Chrome source). This matters for a connection over the tailnet, where such names do not resolve.

## 5. Decisions made and needed

Decided by the user, 2026-11-08: a hosted HTTPS address is acceptable. One QR library can join the allowed list. The phone is the `redmi-a3` (confirmed).
Needed from the user: the Android and Chrome versions of the phone and the router model. Also whether Tailscale on the phone is acceptable for the developer test. Also whether the pairing for patients can use a hosted relay (option C) or must stay serverless (A and B).
