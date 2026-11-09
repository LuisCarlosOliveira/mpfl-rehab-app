# Live test round 3: re-test of the round 3 and F4 changes

Date: 2026-11-09. Commit under test: 045b73d. Tester: one agent. All clicks were real clicks in Playwright Chromium. Real clips were the fake camera.
Evidence folder (outside the repo): `E` = `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/r3/`.
Every evidence path below starts at `E`. The folder `runs/` holds one folder for each run, with screenshots at 390 x 844 and 1280 x 800 where the script took them. The folder `g/` holds `ev/` (result files), `shots/` and the fixture files. The folder `p/` holds pairing. The folder `stills/` holds ffmpeg contact sheets. The folder `tools/` holds the scripts and the console output of each script.
Build: I built the app into `E/dist` and served it with `vite preview` on port 4371. I built the patient build (`VITE_PATIENT_USE_APPROVED=true`) into `E/dist-patient` and served it on port 4372. I stopped both servers by exact PID at the end. The folder `app/dist` was not rebuilt.
Skills loaded with the Skill tool: `owasp-security`, `simple-english:simple-english` and `anti-slop-code:anti-slop-code`. The guardrails skill was read with Read and applied. The wording scan below follows its banned word list. The Chrome DevTools skills and tools were not used.
Protocol copies in `E` are fixtures only. `p-heel.json` and `p-squat.json` have limits that fit the clips. `p-slr-nothr.json`, `p-slr-thr9.json` and `p-slr-thr5.json` have 3 sets of 1 rep. `p-example-heel90.json` is the example file. `p-heel-limit45.json` has a heel slide limit of 45.

## Summary

I checked 16 changes. 14 are verified in the real built app. One is partly fixed (the labels, with one plural error that is still visible). One is the known design limit L2-05, unchanged. No fix failed. I found no new HIGH or MEDIUM issue and five new LOW issues.

The Back button now stays in the app. In 13 flows and 560 random Back, Forward, reload and history actions, no sequence reached Setup or Session without the red-flag check. This includes after Erase. A Back press in Session ends the camera tracks and shows the Summary. Three more Back presses and a Forward on the Summary left it on the Summary.

The starting angle is stable. Eight clicks of the button at 15 s to 60 s on clip 01 gave 6, 4, 4, 4, 4, 4, 4 and 5 degrees. In round 2 the values ranged from 20 to 46 degrees. The claim of 3 to 5 is missed by one degree at 15 s. The range is 2 degrees.

The pain floor between sets works. Pain 7 and pain 10 stop the session. A protocol threshold of 9 does not lift the floor. A threshold of 5 stops at pain 5. The Summary shows the pause message before any Save, also with low answers.

The hand count marker works through JSON, CSV, the Care team view and the charts. The over-limit beep repeats every 5.0 s while the knee stays past the limit. The CSP without `blob:` for images and media gave zero violations and zero console errors in 30 clip runs and 8 tour runs. A free-text `marginSource` is refused with a named error and nothing is written.

What stays UNPROVEN: a real Redmi A3, real Android Chrome, the real tailnet, a real Wake Lock, and accuracy against a goniometer. A clip is a smoke test and not a validation.

## Change, claim, verified or not

| Change | Claim | Verified | Evidence |
|---|---|---|---|
| F3 in-app Back (L2-10) | Back and Forward stay in the app. Session ends the camera and shows the Summary. The Summary stays. Setup and Session need the red-flag check | YES | `g/ev/back-table.json`, `g/ev/gate-walk.json`, `g/shots/back-session-summary.png` |
| F1 and F3 starting angle (user report) | The lowest steady angle is stable, 3 to 5 degrees | YES for stability. The values are 4 to 6 degrees | `runs/a01-t15` to `runs/a01-t60` |
| F3 compact capture layout (R2-04) | Camera, count and angle sit above the bottom bar during the capture | YES. The button itself sits under the bar (R3-02) | `ev/layout3.json`, `runs/layout3-*` |
| F4a H1 pain floor between sets | Pain 7 or more stops. A higher protocol value does not lift it. The Summary shows the message | YES | `runs/pain-A` to `runs/pain-F` |
| F4a M3 hand count | `repsBy` "hand", CSV column `reps_by`, "(counted by hand)" in the Care team view, no text on patient screens | YES | `runs/hand-03`, `runs/hand-04`, `runs/hand-08` |
| F4a M8 leg raise plausibility | A peak or top angle above 30 degrees shows a sentence. The charts plot nothing. The export keeps the value | YES | `runs/hand-04`, `runs/hand-08`, `g/ev/inject.json` |
| F4a M5 repeating over-limit beep | The beep repeats about every 5 s past the limit. It stops when the knee returns. In-range reps are silent. Mute silences all. No AudioContext before the first press | YES. The repeat needed a fixture limit of 45 | `runs/beep-A` to `runs/beep-D`, `runs/beep-B2-muted` |
| F4a M4 neutral set text and icon | Clock icon. Text "That was the last set in your plan." | YES | `runs/pain-A-nothr-6-0-last/last-set-m.png` |
| Labels (A2-5, A2-8, A1-6, R2-03) | "Your sessions", no "Progress", "Knee bend set by your care team: N degrees", "1 rep", "1 degree", erase sentence | YES, except "1 degrees" at the top angle (R3-01) | `runs/tour-*/texts.json`, `runs/c05-squat-05` |
| F4b CSP without `blob:` for images and media | Zero violations, `index.html` and `public/_headers` agree | YES | `ev/preview-headers.txt`, `ev/meta-csp.txt`, `runs/tour-*/tour.json` |
| A1-3 `marginSource` enum | Free text is refused. An app file is accepted | YES | `g/ev/import.json` |
| Round 3 fix of the 195 px layout (L2-11) | No sideways scroll at 390, 320 and 195 px | YES | `runs/tour-*/tour.json` |
| R2-03 "1 reps" in the Summary | Singular unit | YES. "Set 2: 1 rep" | `runs/c02-heel-02/result.json` |
| Patient build refuses the example, an unapproved file and an unapproved generated plan | Refusals with a named reason | YES | `g/ev/l2d.json`, `tools/patient.out` |
| L2-05 generated file with a hand-added `approvedOn` | Not in the fix list | UNCHANGED. The patient build loads it | `tools/patient.out` |
| Generator, Confirm, Update my plan, Erase | Works end to end, erase empties every store | YES | `g/ev/l2b.json`, `runs/tour-gen-*` |

## Factual table of the checks

| Check | What I did | What I saw | Evidence | Result |
|---|---|---|---|---|
| Back, first screen | Fresh browser, Privacy, `page.goBack()` | The page left the app (about:blank). Forward returned to Privacy | `g/ev/back-table.json` (A) | PASS |
| Back on Home and Load without a protocol | Same | The page left the app. Forward returned to Home | same (B, C) | PASS |
| Back, Your sessions, My data, Care team, red-flag, Setup | Opened each screen with real clicks, then Back, Forward and `history.back()` | Each Back landed one step up, as the Back table shows. Forward did nothing | same (D, E, F) | PASS |
| Back, Setup with the camera running | Start camera, then Back, twice | Home. The track state changed from live to ended each time | same (G) | PASS |
| Back, Session with the camera | Start exercise, Back, Back, Back, Forward, `history.back()`, reload | Summary after the first Back. The track ended. The Summary stayed for every later press. A reload went to Home | same (H) | PASS |
| Back, Privacy, Load, generator, plan, ConfirmPlan, companion | Opened each from Home or from Load | See the Back table. Back from the questions leaves the whole generator (R3-04) | same (J, K, L, M) | PASS |
| Gate walks | 14 walks of 40 random actions (Back, Forward, reload, `history.back()`). Start screens: red-flag, Setup, Session, Summary, after Erase (Privacy), after Erase and reload (Load), after Erase and a new load (Home) | The maximum history length was 3 in every walk. Two walks counted one hit each. Both were a no-op Forward at the start, with the Session already on show. No walk reached Setup or Session from another screen | `g/ev/gate-walk.json` | PASS |
| Starting angle, 8 moments | Clip 01, heel slide, left leg, `p-heel.json`. One run for each moment. Real click on the button | Values in the table below | `runs/a01-t*/result.json` | PASS |
| Reps and eye counts | 90 s runs on clips 01, 02, 05 and 07 | See the clip table. Eye counts come from ffmpeg contact sheets at 1 still per second | `runs/c0*`, `stills/*-sheet.png` | PASS (low confidence for clip 01) |
| Capture layout | 390 x 844 and 360 x 640, clips 01 and 05, with and without the button | Video, angle and count end above the bar in all 10 readings. The button sits 310 px (390) and 380 px (360) under the bar top | `ev/layout3.json` | PASS, see R3-02 |
| Pain between sets, no threshold | Straight leg raise, 3 sets of 1 rep, hand count. Pain 6 on set 1, then 7 on set 2 | Pain 6: "Start next set" showed. Pain 7: "Pause and contact your care team." with "You reported pain 7 out of 10." No "Start next set". "Finish" showed | `runs/pain-B-nothr-6-7/pain.json` | PASS |
| Pain 10 | Same, pain 10 on set 1 | Same as pain 7 | `runs/pain-C-nothr-10/pain.json` | PASS |
| Pain 7 on the first set | Same | Same as pain 7 | `runs/pain-F-nothr-7-first/pain.json` | PASS |
| Threshold 9 | `p-slr-thr9.json`, pain 6 then 7 | Pain 7 still stopped the session | `runs/pain-D-thr9-6-7/pain.json` | PASS |
| Threshold 5 | `p-slr-thr5.json`, pain 4 then 5 | Pain 4 went on. Pain 5 stopped the session | `runs/pain-E-thr5-4-5/pain.json` | PASS |
| Summary after a stop | Finish, then read the Summary before any answer. Then pain 0 and no swelling. Then Save | The pause message sat above the questions at once. It stayed after the low answers and after Save | `runs/pain-B` to `runs/pain-F`, `summary-*.png` | PASS |
| Rest panel icon and last-set text | Pain 6, then 0, then the last rep | Clock icon in all panels. The text read "That was the last set in your plan." and no "complete" | `runs/pain-A-nothr-6-0-last/` | PASS |
| Hand count, record | Clips 03, 04 and 08, 3 hand counts each, Save, Export JSON and CSV | `repsBy` "hand" in the JSON. Column `reps_by` with "hand" in the CSV. The file name was `mpfl-sessions-2026-11-09.json` | `runs/hand-0*/export.json`, `export.csv` | PASS |
| Hand count, Care team view | Loaded each export in the Care team view | "3 (counted by hand)" in the Reps cell. Clip 04 (peak 30.5) and clip 08 (peak 124.7) showed "The camera could not read this leg raise." Clip 03 (peak 17.6) showed 17.6 | `runs/hand-0*/care-team-*.png` | PASS |
| Hand count, patient screens | Searched Session, Summary, Home and Your sessions for the marker | No marker text on any patient screen | `runs/hand-0*/hand.json` | PASS |
| Implausible peak in charts | Your sessions after clips 04 and 08. Then a file with peak 165 and top 85 | Peak chart: "No values." and "no value". The chart for clip 03 had one more dot. The injected file gave the sentence for peak and top. The export kept 165 and 85 | `g/ev/inject.json` | PASS |
| Over-limit beep, example limit 90 | Clip 01, 100 s, `p-example-heel90.json` | 14 over-limit beeps, one for each excursion past the limit. No repeat beep because the knee stayed past the limit less than 5 s | `runs/beep-A-normal/beep.json` | PASS |
| Over-limit beep repeat | Clip 01, 90 s, limit 45 (fixture) | 9 repeat beeps at 5.000 to 5.044 s. None after the knee returned | `runs/beep-D-limit45/beep.json` | PASS |
| In-range reps | Clips 01, 05 and 07 with limit 150 or 100 | Clip 05: 10 reps, 0 oscillators. Clip 07: 2 reps, 0 oscillators. Clip 01: 11 reps, 4 oscillators (two near-limit cues) | `runs/c0*/log.json` | PASS |
| Mute | Mute at the start (70 s) and in the middle (80 s) | Start: 1 oscillator before the click, 0 after. Middle: 19 before, 0 after, with 6 more excursions past the limit | `runs/beep-B2-muted`, `runs/beep-C-mutemid` | PASS |
| AudioContext before the first press | Counted at Home, red-flag, guide and camera step | 0 contexts. One context at the press on "Start camera", with user activation | same | PASS |
| Labels | Read 94 screen texts of 8 tours | "Your sessions" is a button and a heading. "Progress" is on no screen. "Knee bend set by your care team: 60 degrees" for the example. No such chip for a generated plan. "Set 1: 1 rep", "2 reps", "Resting angle: 1 degree." | `runs/tour-*/texts.json` | PASS |
| Plural at the top angle | Straight leg raise, clip 03, Summary | "Estimated angle at the top: 1 degrees" | `runs/pain-C-nothr-10/pain.json` | FAIL (R3-01) |
| Erase text | Read My data and the dialog | Both hold "Files that you already exported stay where you saved them." | `runs/tour-gen-195/texts.json` | PASS |
| Wording scan | Searched the banned words of the guardrails skill in 94 tour texts and the hand runs | 0 hits | `runs/tour-*/texts.json` | PASS |
| Overflow, 390, 320 and 195 px | Tour of 14 screens (Privacy to Companion) at each width, with a long-text file (`g/xss.json`). Generator tour at 195 px (11 screens), at 390 px (11 screens in the rerun) and at 320 px (8 screens: my script stopped at the Update screen) | No sideways scroll on any screen. Zero axe violations, except a short colour transition (see R3-05) | `runs/tour-*/tour.json` | PASS |
| CSP, all screens | Fake webcam through Privacy, Load, Home, red-flag, Setup (camera and body map on), Session, Summary, Your sessions, My data, Care team, generator, host pairing and companion | 0 `securitypolicyviolation` events and 0 console errors. See the CSP section | `runs/tour-*/tour.json`, `p/a3-out.json`, `tools/pair1.out` | PASS |
| `marginSource` import | Edited an app export. Free text, empty text and 300 characters | All three: "The file is not valid at "sessions.0.marginSource"" with the two allowed values. 0 sessions stored. The unchanged file imported 1 session | `g/ev/import.json` | PASS |
| Generator flow | Questions, Make my plan, Use this plan, Confirm (real click, clock moved 15 s), Home, Update my plan with limit 95 (refused) and 50 (confirmed), My data, Erase | Each screen as expected. Home showed "Limit 60 degrees" and no "Target knee bend". After Erase: Privacy, empty stores, no cache | `g/ev/l2b.json` | PASS |
| Patient build | Real file input on port 4372 | Example: "Example not allowed". Unapproved: "No approval recorded". Generated without approval: "Plan from the app not allowed". Approved file: Home. Generated with a hand-added `approvedOn`: Home | `g/ev/l2d.json` | PASS, and FAIL for the hand-added claim (L2-05) |
| Pairing, paste | Laptop and phone context, paste codes | Connected in 1.4 s. 39 landmark messages, 1 hello. No video line, no ICE server | `p/pair10.json` | PASS |
| Pairing, real QR scan | Offer QR as the fake camera of the phone, answer QR on the laptop video. Session of 30 s | Both sides "Connected". The phone sent 1 hello, 705 landmarks and 1 bye. The largest message was 1,124 bytes. Both tracks ended after Stop | `p/a3-out.json`, `p/a3-msgs-phone.json` | PASS |
| Privacy of the stores | One run with a saved session | IndexedDB: `protocol`, `sessions` (26 fields) and `generatorInputs`. No data URL, no Blob. `localStorage`: `mpfl.persistAsked` and `mpfl.privacySeen`. No cache, no service worker, no cookie | `ev/privacy-storage.json` | PASS |
| Privacy of the network | 30 runs of the clip scripts | 783 requests. One origin: `http://127.0.0.1:4371`. 0 frame calls. The only `createObjectURL` calls were the JSON and CSV exports | `runs/*/log.json` | PASS |
| Seated hold units in the Summary list | Not run | none | none | NOT RUN |
| Real phone, tailnet, Wake Lock, goniometer | Not run | none | none | NOT RUN |

## The 8 starting-angle values

Clip 01, heel slide, left leg, `p-heel.json`. The clock starts when the Session screen opens. The button is enabled at 12.6 to 13.3 s. I clicked at the moment in the table. Reps count from the click.

| Click at | Value shown | Reps by the app in 90 s |
|---|---|---|
| 15.1 s | "Starting angle: 6 degrees (estimated)" | 11 (set 1: 10, set 2: 1) |
| 22.2 s | "Starting angle: 4 degrees (estimated)" | 10 |
| 29.0 s | "Starting angle: 4 degrees (estimated)" | 8 |
| 36.6 s | "Starting angle: 4 degrees (estimated)" | 8 |
| 44.8 s | "Starting angle: 4 degrees (estimated)" | 7 |
| 50.1 s | "Starting angle: 4 degrees (estimated)" | 5 |
| 55.2 s | "Starting angle: 4 degrees (estimated)" | 5 |
| 60.0 s | "Starting angle: 5 degrees (estimated)" | 4 |

The range is 4 to 6 degrees. Round 2 gave 20 to 46 degrees. The line "Estimated angle, not a medical measurement." sat under each value. In every run the source was the lowest steady angle. No still window appeared in 60 s on this clip.

## Clip table

Chosen legs follow `docs/accuracy.md` (01, 02 and 05: left. 07: right). The clip loops, so 90 s holds 2.2 to 3 passes. Reps count only after a starting angle exists.

| Clip | Baseline source | Time to baseline | Reps by the app in 90 s | Reps by eye | Evidence |
|---|---|---|---|---|---|
| 01 heel slide (32 s) | Lowest steady angle, 4 to 6 degrees | Button at 12.6 s, click as in the table above | 11 with a click at 15 s (about 4.7 for each pass) | About 7 flexions of both legs in one pass. The legs alternate, so the left leg alone is 3 to 4. Low confidence | `runs/a01-t15/`, `stills/01-heel-slide-side-sheet.png` |
| 02 heel slide, mixed framing (30 s) | Lowest steady angle, 3 degrees | Button at 13.0 s, click at 15.2 s | 11 (set 1: 10, set 2: 1). About 4.4 for each pass. Highest bend 168 degrees | 4 heel slides in one pass | `runs/c02-heel-02/`, `stills/02-*-sheet.png` |
| 05 mini squat (27.4 s) | Still window, "Resting angle: 1 degree." | 12.7 s | 10 in the first 77.7 s, then set 1 ended. About 4.2 for each pass | 4 squats in one pass (seconds 9 to 11, 15 to 16, 20 to 21 and 24 to 26) | `runs/c05-squat-05/`, `stills/05-*-sheet.png` |
| 07 mini squat, front (40 s) | Still window, "Resting angle: 6 degrees." | 1.5 s | 2 (about 1 for each pass) | 1 clear squat (seconds 7 to 10) and 1 to 2 shallow dips with hands on the knees | `runs/c07-squat-07/`, `stills/07-*-sheet.png` |

How I counted by eye: ffmpeg made one still for each second with a time stamp, 6 stills in a row. I counted each episode of the knee bending and straightening. Clip 01 shows two legs. I was not able to separate them at 1 still per second. A clip is not a reference.

## Beep timing

| Run | Limit | What happened |
|---|---|---|
| `beep-A-normal` | 90 | 42 oscillator starts. 14 groups of two 330 Hz tones and one 660 Hz tone, 6.4 to 6.9 s apart (12.2 s across the logo cut). One group for each excursion. No lone 660 Hz beep, because no excursion lasted 5 s past the limit plus the 9 degree margin |
| `beep-D-limit45` | 45 | A group at each crossing, then a lone 660 Hz beep 5.012, 5.029, 5.001, 5.015, 5.005, 5.019, 5.000, 5.020 and 5.044 s later while the angle stayed past the limit. The next crossing came 1.4 to 1.8 s after the last repeat. No beep when the knee was in range |
| `beep-B2-muted` | 90 | Muted at 40.07 s. One beep at 39.37 s (before the click). None in the next 70 s, with 11 excursions past the limit |
| `beep-C-mutemid` | 90 | Muted at 90.6 s. 19 oscillator starts before. None after, with 6 more excursions |

The first AudioContext was made at 34.8 s, at the press on "Start camera", with user activation. The count before that press was 0 in every run.

## Back table

"Landed" is the screen after the action. Track state comes from the `getUserMedia` streams of the page.

| From | Back | Forward | Other | Camera tracks |
|---|---|---|---|---|
| Privacy (first screen) | Leaves the app (about:blank) | Privacy | none | none |
| Load without a protocol | Leaves the app | none | none | none |
| Home | Leaves the app | Home | none | none |
| Your sessions | Home | Home (no change) | `history.back()`: Home | none |
| My data | Home | Home (no change) | none | none |
| Care team view | My data. Back again: Home | My data (no change) | none | none |
| Red-flag screen | Home | Home (no change) | none | none |
| Setup guide | Home | Home (no change) | none | none |
| Setup, camera step, not started | Home | Home (no change) | none | none |
| Setup, camera running | Home | Home (no change) | `history.back()`: Home | live, then ended |
| Session, camera running | Summary | none | none | live, then ended |
| Summary | Summary (3 presses) | Summary | `history.back()`: Summary. Reload: Home | ended |
| Summary, after "Do not save" (Home) | Leaves the app | Home | none | ended |
| Privacy from Home | Home | Home (no change) | none | none |
| Load from Home | Home | Home (no change) | none | none |
| Generator, first question, no protocol | Load | Load (no change) | none | none |
| Generator, "Check your answers", no protocol | Load (the answers are dropped) | Load (no change) | none | none |
| Plan screen | "Check your answers" | "Check your answers" | none | none |
| ConfirmPlan, no protocol | Load | Load (no change) | none | none |
| Companion screen | Home | Home (no change) | `history.back()` from Home: leaves the app | none |

Note on the table: Playwright reports "no entry" for `goBack` when the app handles a Back press inside the same document. The landed screens come from the page, not from that report.

## CSP result

Meta CSP text of `index.html` (built copy `E/dist/index.html`): `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; media-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`.
The header of the preview adds `frame-ancestors 'none'` and nothing else. A diff of the header text of `public/_headers` against the meta text shows only that difference. `blob:` stays in `worker-src` only. `data:` stays in `img-src`.
Preview response headers (`ev/preview-headers.txt`): `Content-Security-Policy` as above, `Permissions-Policy: camera=(self), microphone=()`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-cache` on the document.
Result: 0 `securitypolicyviolation` events and 0 console errors in 30 clip runs, 8 tour runs, 2 pairing runs and the patient and import runs. One console line has the level error. It is the TensorFlow Lite line "INFO: Created TensorFlow Lite XNNPACK delegate for CPU." The pose library writes it as an info line. There were 0 page errors.

## Issues

No new HIGH or MEDIUM issue. Each issue below is new in this round unless I say otherwise.

| Id | Severity | Steps | Expected | Actual | Evidence | Kind |
|---|---|---|---|---|---|---|
| R3-01 | LOW | Straight leg raise, count 1 rep, open the Summary. The top angle rounds to 1 | "1 degree" | "Estimated angle at the top: 1 degrees (estimated angle, not a medical measurement)." The text in `lib/cues.ts` (line 121) holds the fixed word "degrees" | `runs/pain-C-nothr-10/pain.json` | New defect. The plural fix missed this text |
| R3-02 | LOW | Heel slide on clip 01, open the Session at 390 x 844 or 360 x 640 and wait for the button | The button is easy to find | The button is 310 px (390 x 844) and 380 px (360 x 640) under the top of the bottom bar. The person must scroll. The camera line says "No still moment yet. See the button under the numbers." | `ev/layout3.json`, `runs/layout3-clip01-390x844/button-enabled.png` | Side effect of the R2-04 fix |
| R3-03 | LOW | Rest panel with a pause message at 390 x 844 | "Finish" is easy to find | The pause notice ends at the bottom bar. "Finish" sits under it, out of view. I did not measure the position | `runs/pain-B-nothr-6-7/rest-set2-pain7-m.png` | New. Seen on a screenshot only |
| R3-04 | LOW | Open the generator. Press Back on a question or on "Check your answers" | One step back | Back leaves the whole generator (Load, or Home with a protocol) and drops the answers. This follows the rule that Back acts as Cancel | `g/ev/back-table.json` (K, L) | Design note |
| R3-05 | LOW | Update my plan with limit 50 | A patient sentence without an internal code | "Reason: the limit from your surgeon that you entered (RANGE_SURGEON)." shows an internal code | `g/ev/l2b.json` (`updateLower`) | New defect in the text |

Not issues, but noted:
- Axe reported `color-contrast` (4.43 against 4.5) on the button "Make my plan" in 3 of 3 tour runs at once after the last answer. It did not appear after 600 ms in 3 of 3 repeat runs. The cause is a short colour transition of the button. This is a test setup effect (`g/ev/axe3.json`).
- The claim "3 to 5 degrees" is missed by 1 degree at the 15 s click (6 degrees). The stability claim holds.
- The over-limit repeat did not show at the example limit 90 on clip 01. It needed a limit of 45. The repeat rule is verified, but not at the example limit.
- A reload on the Summary goes to Home and drops the unsaved session. This is a browser reload, not a Back press.
- L2-05 (a generated file with a hand-added `approvedOn` loads in the patient build) is OPEN and unchanged.

## What is fixed and what is unproven

FIXED and verified here: the in-app Back and the red-flag gate under Back, Forward and reload. The stable starting angle. The pain floor between sets. The hand count marker. The leg raise plausibility sentence. The repeating beep. The neutral set panel. The labels and units (one plural left). The CSP without `blob:` for images and media. The `marginSource` enum. The layout at 195, 320 and 390 px.

UNPROVEN: a real Redmi A3 and real Android Chrome (the real Back button of a phone). The real tailnet. A real Wake Lock. The speed on a phone. The accuracy against a goniometer. The seated hold units in the Summary list were not run live. Reps counted on a clip are a smoke test.

## Clean-up

Removed: both `vite preview` servers (PIDs 1753964, 1753950, 1763421 and 1763406) and all browsers of my scripts (each script closed its own browser). No process was ended by a name pattern. Kept: the evidence folder `E` (outside the repo) and this file. No clip or frame entered the repo. I changed no other repo file.
