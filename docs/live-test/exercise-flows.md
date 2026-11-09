# Live test 1: exercise flows with a person in view

Date: 2026-11-08. App: commit b451206, built app in `app/dist`, served by `vite preview` on port 4301. Browser: Playwright Chromium with the fake camera flags. A fresh profile for each run. Machine: Intel i5-9400H, 8 threads, WSL2, no GPU (software rendering).

Evidence folder (never in the repo): `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/t1/`. Below it is called `T1`. Each run has its own folder `T1/<run>/`. It holds screenshots (`-m.png` is 390 x 844, `-d.png` is 1280 x 800). It also holds `log.json` and text dumps. The log has the console, page errors, every request, probes and timed snapshots. The scripts are in `T1/tools/`. The clip stills are in `T1/stills/`.

Skills really loaded: `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:a11y-debugging`, `owasp-security`, `simple-english:simple-english`. I read the guardrails skill with the Read tool. I used Playwright scripts and not the DevTools MCP tools. I ran no axe or Lighthouse audit, so the a11y skill gave no measured result here.

## Summary

The flows run end to end on all four exercises. Stop, "Knee gave way or hurts", the Summary questions, Save, Do not save, Progress, export, import, the Care team view and erase all work. The app made no request to another origin in 16 runs (139 requests). It had 0 CSP violations and 0 page errors. It stored and sent no frame.

The main limit of this test is the clips. The setup check wants a person who holds still for 2 seconds. Only the straight leg raise clip 04 reached the 5 second countdown (1 of 3 runs on that clip, and 0 of all other runs). Without a resting angle the app counts no rep for the heel slide and the mini squat. So the app counted 0 reps on every heel slide and mini squat run. The rep counts cannot be compared with the eye counts. This is a clip fact, and the app told the person why (see L1-03).

One safety defect: pain 7 alone gives no pause message (L1-01). The message appears only after the swelling question is also answered.

The median frame rate on this machine is 20.0 on clip 01, 29.9 on clip 06 and 14.99 on clip 05. I measured with no polling. Clip 05 is at the edge of NFR4 (15). Repeat runs with polling gave 12.0 on clip 05 and 15.0 on clip 06. This machine has no GPU, so the numbers do not show a phone.

Counts for the 50 numbered checks: PASS 41, FAIL 5, NOT RUN 4. The list at the end names more items that I did not test.

## Clips and what the app asked

| Clip | Shows | Leg that the clip shows | Exercise run | Match with what the app asked |
|---|---|---|---|---|
| 01 | Heel slide, supine, wide room, leg is small in the frame | Right (manifest). Earlier tool results say left has the better detection | Heel slide | Leg is too small: "Move closer." No still window. |
| 02 | Heel slide with overhead and close-up cuts | Mixed | Heel slide | Framing changes. App says "Step into the view." and "Move closer." |
| 03 | Straight leg raise, supine, side | Left (manifest) | Straight leg raise | Never ready. Alternates "Turn so your chosen leg faces the camera." and "Move closer." |
| 04 | Straight leg raise on a table, with close-up cuts | Right (manifest). Earlier tool results say left | Straight leg raise | Reached ready once (countdown). Close-up cuts break the check at times. |
| 05 | Mini squat, side, with close-up cuts | Not stated | Mini squat (phase 2) | Close-ups hide the leg: "Move closer.", "Show your whole leg." |
| 06 | Seated knee extension, side, with close-up cuts | Right (manifest) | Seated hold (phase 2) | Tracked the leg. Counted 1 hold. |
| 07 | Mini squat, FRONT view, standing | Not applicable | Mini squat (phase 2) | Wrong view on purpose. Feet at the frame edge: "Move back. Show your whole leg." |
| 08 | Straight leg raise, oblique, therapist in frame | Right (manifest) | Straight leg raise | Never ready. The angle (132) is not a knee angle. |

Clips 01 and 02 have no still window of 2 seconds. This is a clip fact and not an app defect.

## Table of checks

Run names. `R1` = `T1/run1-heel-01`, `R2` = `T1/run2-slr-03`, `R3` = `T1/run3-squat-07`, `R4` = `T1/run4-squat-05`, `R5` = `T1/run5-slr-03-right`, `R6` = `T1/run6-hold-06`, `R7` = `T1/run7-slr-04`, `R8` = `T1/run8-setup-04-repeat`, `R9` = `T1/run9-squat-05b`, `R10` = `T1/run10-slr-04-full`, `R11` = `T1/run11-heel-02`, `R12` = `T1/run12-slr-08`, `R13` = `T1/run13-heel-01-left`, `R14` = `T1/run14-data-import`, `R15` = `T1/run15-fps-01`, `-05`, `-06`, `R16` = `T1/run16-sets-finish`, `R17` = `T1/run17-pain7-donotsave`.

| # | Check | What I did | What I saw | Evidence | Result |
|---|---|---|---|---|---|
| 1 | Home, Start | Loaded the example protocol through the file input, pressed Start on each exercise | Home shows the exercise cards, banners "Prototype. Not for patient use." and "EXAMPLE, NOT APPROVED" | R1 `01-home-m.png` | PASS |
| 2 | Red-flag check | Pressed Start, read the screen, pressed "None of these apply. Continue" | Two groups (emergency services, care team) and the note "General guidance, not verified for MPFL surgery." Continue goes to Setup | R1 `02-redflag-m.png`, `redflag-text.txt` | PASS |
| 3 | Leg question, plan leg | Left the plan leg (left) selected in R2, R4, R7, R10, R11, R13 | Next button enabled at once, no note | R2 `log.json` | PASS |
| 4 | Leg question, other leg and confirm note | Chose the other leg in R1, R5, R6, R12 | Note: "Your plan names the other leg. The app will follow the leg that you chose. It does not change your plan. Continue?" Next is disabled until "Continue with this leg". After it: "The app follows the leg that you chose. It does not change your plan." | R1 `04-other-leg-note-m.png` | PASS |
| 5 | Camera side question | Left the default, then chose left camera with right leg (R5) | Default follows the leg. With a different side the note reads "The camera is on the other side. The estimated angle can be less exact." | R5 `guide-text-chosen.txt` | PASS |
| 6 | Position guide figure, heel slide | Read the full page at 390 px | Start and End drawings show the lying leg, the 60 degree bend and a side view with the camera at knee height, 2 to 2.5 m. Text is clear and nothing is clipped | R1 `05-guide-full-m.png` | PASS |
| 7 | Position guide figure, seated hold | Read the screen | Chair figure with start, end and side view. "Your limit: Ask your surgeon." because the example protocol has no maxFlexion for this exercise | R6 `05-guide-chosen-m.png`, `guide-text-chosen.txt` | PASS |
| 8 | Guide text names the chosen leg | Chose the non-operated leg (R5) | The text and the figure label still say "Operated leg" and "Your operated leg is the leg nearest the camera" | R5 `05-guide-full-m.png` | FAIL (L1-06) |
| 9 | Start camera, no audio, after press | Counted AudioContext and getUserMedia before the press | 0 and 0 before the press. After: one getUserMedia with `{"video":{"facingMode":"user"},"audio":false}`. Camera running in 1.0 to 2.2 s | R1 `log.json` (`meta.beforeCam`, `probes.gum`) | PASS |
| 10 | Setup rules change from not seen to seen | Polled the six rule rows each 0.3 s on clip 04 (R8) | At 1.2 s all "not seen". 2.7 s: 3 seen. 6.4 s: 5 seen. 10.9 s: 6 seen and "Starting in 5 seconds." | R8 `log.json` (`series`), `08-countdown-d.png` | PASS |
| 11 | Rule texts when a rule fails: clip 02 and 05 (bad framing) | Read the large line | "Step into the view.", "Move closer.", "Move back. Show your whole leg.", "Turn so your chosen leg faces the camera." Each tells the person what to fix | R11, R9, R4 `log.json` | PASS |
| 12 | Rule texts make sense for a person who lies down | Read the text on clips 01 and 03 | "Turn so your chosen leg faces the camera." shows to a person who lies on a mat | R2 `07-setup-live-1-m.png` | FAIL (L1-05) |
| 13 | Rule flicker | Read the series for clip 03 and 05 | The text changes at most about every 1 to 4 s. No flicker per frame | R2, R9 `log.json` | PASS |
| 14 | Baseline: setup gets a resting angle | Clip 04 reached "ready" at 10.9 s (R8) | The resting text line shows only for exercises that count reps. For clip 04 (straight leg raise) it does not show by design | R8 `log.json` | NOT RUN (no heel slide or squat clip held still) |
| 15 | No still window (clips 01, 02): what the app says, can the person proceed | Waited 28 s (R1) and 30 s (R11), then pressed "Start exercise" | Setup never showed the countdown. "Start exercise" and "More time" stay available. In Session the notice reads "The app has no resting angle. Stop, then start again and hold still in Setup." and "The app counts no rep until it has one." | R1 `09-session-1-m.png` | PASS (see L1-03 for a wording gap) |
| 16 | 5 second countdown | Waited for it in every setup run | Seen once (R8, clip 04). Not seen in the other runs, because the leg or the framing failed a rule or the person moved | R8 `08-countdown-d.png` | PASS (works when the clip allows it: 1 run) |
| 17 | Session: live angle follows the leg | Read 0.4 s snapshots and compared with stills | Clip 01: angle swings 43 to 140 as the leg bends and straightens. Clip 06: 54 to 68 in the hold, 109 and 10 at moves. Values match the picture in direction. No reference angle exists | R1, R6 `log.json` (`series`), `T1/stills/` | PASS |
| 18 | Rep or hold counter, heel slide and mini squat | Ran clips 01, 02, 05, 07 | 0 reps in every run, because no resting angle exists | R1, R4, R9, R11, R13 `log.json` | NOT RUN (no baseline) |
| 19 | Hold counter, seated hold | Ran clip 06 for 60 s (R6) | 1 hold counted at 52.2 s | R6 `log.json` | PASS |
| 20 | Hold restart cue | Clip 06 | Cue: "The knee left the hold angle. The hold timer starts again." at 21.3 s of the session | R6 `09-session-5-m.png`, `log.json` | PASS |
| 21 | Leg lost cue | Clips 01, 05, 06 | Cue "Show your whole leg." when the angle shows "--". It clears when the leg is back | R6 `log.json` | PASS |
| 22 | Near-limit cue | Clips 01, 05, 06 | "Close to your limit, stop." | R1 `09-session-3-m.png`, R9 | PASS |
| 23 | Over-limit cue | Clips 01, 05, 06 | "Stop at your limit, do not push." It stays while the knee is past the limit plus the margin, then 4 s | R1 `09-session-1-m.png` | PASS |
| 24 | Too fast cue "Slow down." | No rep counted in any run | Not triggered | none | NOT RUN (no counted rep) |
| 25 | Sets: Set 1 of N, Start next set, Finish | Pressed Count this rep 10 times on clip 03 (R2, R16) | "Set 1 of 3", "Reps in this set: 10 of 10", notice "Set complete. Rest when you are ready.", pain scale, "Start next set". After set 3: "All prescribed sets are complete." and Finish. Count button is disabled between sets | R2 `10-set-complete-m.png`, R16 `03-set3-done-m.png` | PASS |
| 26 | Set pain answer between sets | Chose 3 after set 1 | Saved as `setPain: [3]` in the export | R2 `export.json` | PASS |
| 27 | Sound: AudioContext only after a press | Probe on the constructor | 1 context in each run, created at the Start camera press (user activation true). 0 before | R1 `log.json` (`probes.audio`) | PASS |
| 28 | Sound events | Counted oscillator starts | Near-limit = two 330 Hz beeps, over-limit = one 660 Hz beep. 54 starts in R1 (18 events). A counted rep made no sound | R1 `probes.beepLog` | PASS |
| 29 | Stop ends the camera | Pressed Stop, read track state | `video:ended` in every run. Summary opens | R1 `log.json` | PASS |
| 30 | Cancel in Setup ends the camera | Pressed Cancel after the camera ran (R8) | `video:ended`, Home shows | R8 `log.json` | PASS |
| 31 | "Knee gave way or hurts" | Pressed it in R7 and R13 | Summary starts with "Stop. Do not exercise. Contact your care team." and "You pressed "Knee gave way or hurts"." Camera ended | R7 `10-summary-initial-m.png` | PASS |
| 32 | Summary: pause message at pain 7, both answers set | Pain 7, then "No swelling" (R1, R2) | Notice "Pause and contact your care team. You reported pain 7 out of 10. This is a rule of the app. It is not a diagnosis." sits above the questions, with no Save press. It goes away when pain changes to 3 | R1 `12-summary-both-m.png`, `13-summary-pain-changed-m.png` | PASS |
| 33 | Summary: pause message with pain 7 only | Pain 7, swelling not answered (R1, R17) | No message. "Do not save" then goes straight to Home with no message | R17 `01-pain7-only-m.png`, `02-after-A-m.png` | FAIL (L1-01) |
| 34 | Summary: pain 8 and swelling, Do not save | R17 | The pause message stays and "Session not saved." shows | R17 `03-after-B-m.png` | PASS |
| 35 | Save | Saved in R1, R2, R7 | "Session saved." then Done to Home | R1 `14-summary-saved-m.png` | PASS |
| 36 | Home afterwards: B1 contact card | After pain 7 (R2) and after a gave-way press (R7) | Card "Contact your care team" with "On 2026-11-08 you reported pain 7 out of 10." and "On 2026-11-08 you pressed "Knee gave way or hurts"." and a Dismiss button | R2 `16-home-contact-m.png`, R7 `home-after.txt` | PASS |
| 37 | Progress with saved sessions | Opened Progress after one saved session | Three charts with data tables. Text says "These numbers are a webcam estimate." Each chart title has the angle label | R2 `17-progress-m.png`, `progress-text.txt` | PASS |
| 38 | Export JSON | Pressed Export JSON file, parsed it | Fields: `schemaVersion` 1, `angleMethod`, `pseudonymId`, and per session `legTracked`, `cameraSide`, `setsPrescribed`, `repsPrescribed`, `repsPerSet` [10,3], `setPain`. No name, no free text, no image data | R2 `export.json` | PASS |
| 39 | Export CSV | Pressed Export CSV file, parsed it | Header has `leg_tracked`, `camera_side`, `reps_per_set`, `set_pain`. Text cells are quoted. Row matches the JSON | R2 `export.csv` | PASS |
| 40 | Import into a fresh profile | Imported the JSON into a new profile (R14) | "Imported 1 session." The session equals the original. Progress and Home show it | R14 `02-imported-m.png`, `re-export.json` | PASS |
| 41 | Import identity | Compared the id and imported the same file again | The new profile keeps its own `pseudonymId` (5d5d645e) and not the file id (9e6971c3). A second import of the same file says "This file belongs to another person's record." | R14 `03-import-dup-m.png`, `re-export.json` | FAIL (L1-02) |
| 42 | Import of a bad file | Imported `{"a":1}` | "The file is not valid at "schemaVersion": Invalid input: expected 1." Nothing added | R14 `log.json` | PASS |
| 43 | Care team view | Opened the exported file in the Care team view | Session list, three charts, the text "Patient file, unsigned, self-reported." and "This file stays in memory." Storage unchanged | R2 `20-careteam-m.png`, `careteam-text.txt` | PASS |
| 44 | Erase | Erase dialog, then "Erase my data" (R14) | Dialog text is clear. Privacy shows. `localStorage` has 0 keys, Cache storage 0, service workers 0. The IndexedDB database `mpfl-rehab` stays as an empty database name | R14 `07-after-erase-m.png`, `log.json` (`afterErase`) | PASS |
| 45 | Straight leg raise: Count this rep and no angle verdict | R2, R16 | The button is in the bar and counts one rep each press. The screen shows "Estimated angle at the top: 23 degrees (estimated angle, not a medical measurement)." and no verdict word or colour | R2 `09-slr-watch-1-d.png`, `10-set-complete-m.png` | PASS |
| 46 | Straight leg raise: sensible top angle | Clip 04 close-up cuts (R7) | Summary shows "Highest knee bend 154 degrees" for a straight leg raise | R7 `summary-initial.txt` | FAIL (L1-07) |
| 47 | Frame rate over 60 seconds | See the frame rate table | Median 20.0, 29.9 and 14.99 fps | `T1/tools/fps.py`, R15 `log.json` | PASS for 01 and 06, borderline for 05 (L1-04) |
| 48 | Console, page errors, CSP, foreign requests | Read all `log.json` files | 0 CSP violations, 0 page errors, 0 foreign requests. One console error in R3: "The AudioContext encountered an error from the audio device or the WebAudio renderer" (this machine has no audio device) | all `log.json` | PASS |
| 49 | Privacy inspection (frames) | See the privacy section | No frame, Blob of an image, data URL or video byte stored or sent | R2 `storage.json`, all `log.json` | PASS |
| 50 | Rep counts versus the eye | See the comparison table | Heel slide and mini squat: 0 counted. Straight leg raise: by hand. Seated hold: 1 of about 6 | comparison table | NOT RUN for heel slide and mini squat |

Items with no row are all NOT RUN. They are an angle check against a goniometer (none exists), the second camera, the real phone, WebKit and a screen reader.

## Issues

| Id | Severity | Where | Steps | Expected | Actual | Evidence | Cause |
|---|---|---|---|---|---|---|---|
| L1-01 | HIGH | Summary | Finish a session. Choose pain 7 or more. Leave the swelling question open. Press "Do not save" | The pause message shows when pain is 7 or more (FR12), with no other answer needed | No message shows until swelling is answered. "Do not save" goes to Home with no message and no contact card | R17 `01-pain7-only-m.png`, `02-after-A-m.png`, R1 `11-summary-pain-only-m.png` | App (verdict is null while one answer is missing) |
| L1-02 | MEDIUM | My data, Import | Export a file. Import it into an empty profile. Export again. Import the first file again | The restored profile keeps the id of the file, or the text names the real cause | The profile keeps its own id. The second import says "This file belongs to another person's record." The care team sees two different ids for one person | R14 `03-import-dup-m.png`, `re-export.json` | App |
| L1-03 | LOW | Setup | Press "Start exercise" while the check shows "Leg held still" as "not seen" | The person learns before the session that no rep will count | Setup does not say it. The notice "The app has no resting angle. Stop, then start again and hold still in Setup." shows only in Session. The text gives a way forward | R1 `07-setup-live-1-m.png`, `09-session-1-m.png` | App (wording and order). The missing still window is a clip fact |
| L1-04 | MEDIUM | Pose loop speed | Run 60 s of clip 05 on this machine | At least 15 fps (NFR4) | Median 14.99 fps clean, 12.0 fps with polling and screenshots. Clip 06 was 14.99 in one run and 29.9 in another | R15 `-05`, R9, R6 `log.json` | Test setup (no GPU, software WebGL). Not proof for a phone, but no run proves NFR4 either |
| L1-05 | LOW | Setup text | Lie supine on clip 01 or 03 | Text fits a lying person | "Turn so your chosen leg faces the camera." shows. It fits a standing person | R2 `07-setup-live-1-m.png`, R1 | App |
| L1-06 | LOW | Position guide | Choose the leg that is not the operated leg | The text and figure follow the chosen leg | Figure label "Operated leg" and the text "Your operated leg is the leg nearest the camera" stay | R5 `05-guide-full-m.png`, `guide-text-chosen.txt` | App |
| L1-07 | LOW | Summary of a straight leg raise | Close-up cuts in clip 04 | A plausible value, or none | "Highest knee bend 154 degrees" shows for a leg that stays straight. The value comes from cut-in pictures | R7 `summary-initial.txt` | Clip effect, and the app has no plausibility check |
| L1-08 | LOW | Session note | Clips 03, 06 and 07 with the leg that the clip shows | The note appears only when the other leg moves more | "The camera sees your other leg move more. Make sure that the chosen leg is the one that moves." shows on all three. Earlier tool results also name the other leg as the better leg for clips 03 and 04. The truth for clip 06 is not known | R2, R6, R3 `log.json` | Open: app or clip. Needs a manual frame check |
| L1-09 | LOW | Front view (clip 07) | Run the mini squat on a front view | The person learns that the view is front | Setup says only "Move back. Show your whole leg." Session counts nothing and says nothing about the view, only the note of L1-08 | R3 `log.json` | App (no front-view text). The clip is a negative test on purpose |

I found no HIGH issue other than L1-01 and no MEDIUM issue other than L1-02 and L1-04.

## Rep counts: clip against app

How I counted by eye: I extracted stills with ffmpeg. Each clip has a sheet of 24 stills. Clip 01 also has 34 stills at 0.8 s. I counted each full cycle (extended to bent to extended) or each lift. The stills are coarse, so each count has a range. The clip loops when it ends, so a 60 s run shows the clip about two times.

| Clip | Exercise | Eye count in one pass of the clip | App count | Note |
|---|---|---|---|---|
| 01 | Heel slide | 7 to 8 cycles (8 straight phases in 34 stills) | 0 (R1, R13) | No resting angle, so no rep counts. Angle swings 43 to 140. Earlier tool run: 4 reps for the left leg with a hand baseline |
| 02 | Heel slide | 4 to 5 cycles, with cuts | 0 (R11) | No resting angle |
| 03 | Straight leg raise | 8 to 10 lifts | by hand only | There is no automatic count. I pressed the button 10 times and 3 times. Top angle 23 |
| 04 | Straight leg raise | 5 to 6 lifts | by hand only | Top angle 4 and 16 in two runs |
| 05 | Mini squat | 3 to 4 squats (2 close-up) | 0 (R4, R9) | No resting angle. "Close to your limit, stop." and "Stop at your limit, do not push." show with the angle up to 67 against a limit of 50 |
| 06 | Seated hold | about 3 holds in one pass, so about 6 in 60 s | 1 hold | One hold counted. The hold angle band is narrow, so the restart cue appeared |
| 07 | Mini squat, front | 1 squat in 40 s | 0 (R3) | Angle 0 to 18. Negative test |
| 08 | Straight leg raise, oblique | 5 lifts | by hand only | Angle 92 to 132, not a knee angle (R12) |

## Frame rate

Measured in the page. A wrapper around `requestVideoFrameCallback` records the time of each callback of the pose loop (the loop of `src/pose/loop.ts` registers its tick there). I took the last 60 s of the session. The median is 1000 divided by the median interval of the callbacks. The clean runs had no polling and no screenshot during the window.

| Run | Clip | Callbacks in 60 s | Mean fps | Median fps | p95 interval (ms) | Share of the 1800 video frames used |
|---|---|---|---|---|---|---|
| R15 `-01` (clean) | 01 | 1041 | 17.4 | 20.0 | 83.4 | 58 percent |
| R15 `-06` (clean) | 06 | 1463 | 24.4 | 29.9 | 50.1 | 81 percent |
| R15 `-05` (clean) | 05 | 822 | 13.7 | 14.99 | 116.6 | 46 percent |
| R1 (polling each 1 s) | 01 | 1106 | 18.4 | 20.0 | 83.3 | 62 percent |
| R6 (polling each 0.4 s) | 06 | 834 | 13.9 | 14.99 | 100.0 | 46 percent |
| R9 (polling each 0.4 s, screenshots) | 05 | 737 | 12.3 | 12.0 | 100.1 | 41 percent |

The rate depends on the clip (the picture content) and on other load. It is below 30 fps because each detection takes longer than one video frame on a CPU. NFR4 asks for at least 15. This machine meets it on two of three clips, with polling off. It is not a phone number.

## Privacy inspection

- IndexedDB after the runs: one database `mpfl-rehab`. Store `generatorInputs` is empty. Store `protocol` holds the protocol text. Store `sessions` holds 579 characters of numbers and short text for one session. I searched `T1/run2-slr-03/storage.json` and the two exports for `data:image`, `blob:`, `base64`, `JFIF` and `PNG`. 0 hits.
- `localStorage`: `mpfl.privacySeen`, `mpfl.persistAsked`, `mpfl.lastExport` and `mpfl.pseudoId`. No other key.
- Cache storage: 0 caches. Service workers: 0.
- Network: 139 requests in 16 runs. All went to `127.0.0.1:4301`. Each run had the same 8: page, script, style, font, landmarker script, WASM script, WASM file and the model file `pose_landmarker_lite.task`. 0 foreign requests, 0 `data:` or `blob:` requests.
- Frame APIs: I wrapped `toBlob`, `toDataURL`, `convertToBlob`, `MediaRecorder`, `ImageCapture` and `createImageBitmap`. No call in any run. The only `URL.createObjectURL` calls were the two downloads (JSON 1100 bytes, CSV 684 bytes) that I started by a press.
- Camera: `audio:false` in every `getUserMedia` call. All tracks ended after Stop, Cancel, Finish and the gave-way press.
- Limit: MediaPipe prints a driver message "GPU stall due to ReadPixels". This is inside the model runtime and not in the app code. I did not trace it further.
- The clips and every frame stayed in the scratchpad. No clip or still is in the repo.

## What was good

- The red-flag screen, the leg confirm note and the "ask your surgeon" texts are clear on a phone width.
- The Summary pause message sits above the questions and the text says that it is a rule of the app, not a diagnosis.
- The cues for near-limit, over-limit, leg lost and hold restart use the exact fixed texts. No verdict word or colour appeared.
- The camera ends on every exit that I tried. Sound starts only after a press.
- Export, import, Care team view and erase work and leave no image data.

## Not tested

- Rep counting for the heel slide and the mini squat against the eye (no clip gave a resting angle).
- The "Slow down." cue (no counted rep).
- The 5 second countdown on clips 01, 02, 03, 05, 06, 07 and 08, and a session that starts from a baseline.
- Accuracy of the angle (no goniometer).
- The second camera, the real phone, WebKit, a screen reader and the hidden tab exit. The repo e2e covers some of these, and I ran no repo e2e.
- axe and Lighthouse (not in my scope).

## Cleanup

I stopped my preview server (PIDs 618875 and 663481, by exact PID) and the one Chromium that a failed run left (PID 657738). I did not touch the preview on port 4305 (PID 620855), which another session owns. Evidence stays in `T1`. I changed no file of the repo except this one.
