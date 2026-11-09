# Live test round 2: re-test of the round 1 fixes

Date: 2026-11-09. Commit under test: 939d096. Tester: one agent, with real clicks in Playwright Chromium and clips as the fake camera.
Evidence folder (outside the repo): `E` = `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/r2/`.
Every evidence path below starts at `E`. The folders are `runs/`, `g/`, `p/`, `lh/`, `ev/` and `stills/`. `runs/` holds one folder per browser run, with screenshots at 390 x 844 and 1280 x 800 and `log.json`. `g/` holds the generator and size checks. `p/` holds pairing. `lh/` holds Lighthouse. `ev/` holds result files. `stills/` holds ffmpeg stills.
Build: the app was built into `E/dist` and served by `vite preview` on port 4341. The patient build (`VITE_PATIENT_USE_APPROVED=true`) was built into `E/dist-patient` and served on port 4342. Both servers are stopped.
Skills loaded: `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:a11y-debugging`, `owasp-security`, `simple-english:simple-english`. The guardrails skill was not read again. The Chrome DevTools MCP tools were not used. Lighthouse ran as `npx lighthouse`, as `docs/lighthouse.md` says.

## Summary

Of the round 1 fixes, 18 are verified, 3 failed and 1 is partly fixed. No new HIGH issue was found.
The user report is fixed in place. A heel slide with a real clip as the camera now finds a starting angle and counts reps.
Setup shows "The app has no resting angle yet." with a way forward. Session shows no dead-end text.

What failed:
- The Android Back button still leaves the app (L2-10).
- Long text and the whole app still overflow sideways at 195 px (L2-06 and L2-11). They pass at 390 px and 320 px.
- The Summary shows "1 reps" (new, LOW).

What is new or open:
- While the app looks for the starting angle, the angle and the rep count sit under the bottom bar. This holds at 390 x 844 and at 360 x 640. They show when a starting angle exists.
- A generated plan with a hand-added `approvedOn` still loads in the patient build (L2-05, unchanged design limit).

Pairing worked in 10 of 10 runs (it failed 1 in 3 before the fixes). Lighthouse mobile Home is 99 to 100. The first-load JavaScript is 172,551 bytes gzip.

What stays UNPROVEN: a real Redmi A3, real Android Chrome, the real tailnet, a real Wake Lock, and accuracy against a goniometer. A clip is a smoke test and not a validation.

Tester note: one clean-up command (`pkill -f chrom`) ended more processes than mine. The MCP server of Chrome DevTools in this session stopped. No repo file changed. The user must restart that MCP server if needed.

## Round 1 issue, fix, verified or not

| Round 1 issue | Fix | Verified | Evidence |
|---|---|---|---|
| L1-01 (HIGH) pain 7 with swelling open gave no pause message | Message above the questions at once | YES. Pain 7 alone: message at once, before the questions. Swelling "More than before" alone: message. Pain 6 alone: none. "Do not save" with pain 7 only: message stays, Summary stays, Done goes to Home | `ev/l101.json`, `runs/l101-*/` |
| User report: heel slide on a clip showed "Reps in this set: 0 of 10" and "The app has no resting angle." | In-place capture of the starting angle, no dead-end text | YES, with caveats (see clip table) | `runs/c01-heel-01/`, `c02-heel-02/`, `c05b-squat-05/`, `c07-squat-07/` |
| L1-02 import gave another person id, second import said "another person" | Import takes the id of the file | YES. Second import says "Some of these sessions are already stored. Nothing was imported." The re-export has the same `pseudonymId` as file A | `ev/l102.json`, `ev/A.json`, `ev/A-reexport.json` |
| L1-03 Setup did not say that no rep will count | Setup text "The app has no resting angle yet." | YES (clips 01, 02, 07) | `runs/c01-heel-01/setup-end-text.txt` |
| L1-05 lying person saw "Turn so your chosen leg faces the camera." | Text follows the pose | YES. Clips 01, 03 and 04 gave "Move closer.", "Hold still for 2 seconds." and "The camera sees your hip, knee and ankle." The text "Turn so" never showed | `runs/m03-*/log.json`, `m04-*`, `c01-*` |
| L1-06 guide label stayed "Operated leg" for the other leg | Label "Your chosen leg" | YES. Chosen leg right with a left plan: label "Your chosen leg" in the figure and the text, plus the note "Your plan names the other leg." | `runs/m03-slr-03-right/guide-text-chosen.txt` |
| L1-08 the other-leg note showed on every clip | The note is rare | YES. No note on clips 03 (right), 04 (left), 06 (left) and 07 (right) | `runs/m03-*`, `m04-*`, `m06-*`, `c07-*` |
| L1-07 "Highest knee bend" for a straight leg raise | Not in the fix list | STILL SEEN. Clip 04 shows 165 degrees and clip 03 shows 85 degrees. The app has no plausibility check | `runs/m04-slr-04-left/summary-initial.txt` |
| L2-01 "Target knee bend 18 degrees" on a generated plan | Count text | YES. No "Target knee bend". Text: "The app starts counting a rep at 18 degrees (set by the app, not by a clinician)." Home shows "Limit 60 degrees" only | `g/ev/l2b.json`, `g/ev/r2-home-text.txt` |
| L2-02 a lazy chunk that cannot load blanks the app | Error screen | YES. "Screen not loaded" with "Try again" and "Back to Home". "Try again" with the chunk blocked keeps the screen. After unblock, "Try again" opens My data. A blocked Dashboard chunk gives the same screen and Back to Home reaches Home | `g/ev/l2a.json`, `g/shots/L202-error-390.png` |
| L2-03 wrong text for a higher limit | New text | YES. "A higher limit needs your care team. The app keeps your current limit." | `g/ev/l2b.json` |
| L2-06 long text overflows | Wrap | PARTLY. No overflow at 390 and 320 px. At 195 px the Setup guide overflows (256 px wide) | `g/results.jsonl` (R2-L2-06-*) |
| L2-07 future date accepted until the end | Refuse at the question | YES. A date 10 days ahead disables Next and shows "The date of your surgery cannot be in the future." Yesterday and today pass | `g/ev/l2a.json`, `g/shots/L207-future-390.png` |
| L2-08 duplicate lines in "Values in your plan" | Fix | YES. No duplicate fact line in the week 3 plan. (The phase 2 plan was not generated again.) | `g/ev/l2b.json` |
| L2-09 internal source shown as published source | Label | YES. The six entries read "RR: Project knowledge base summary (not a published source)" | `g/ev/r2-plan-body.txt` |
| L2-10 Android Back leaves the app | Not fixed | NO. `page.goBack()` from the red flag screen goes to `about:blank`. History length is 2 and the state is null | `g/ev/l2c.json` |
| L2-11 layout fails below 320 px | Reflow | NO at 195 px. Four screens scroll sideways (setup 214, setup running 243, summary 224, My data 261 px wide). 390 and 320 px pass with zero axe violations | `g/ev/l2c.json`, `g/shots/L211-195-*.png` |
| L2-05 patient mode accepts `approvedOn` on a generated plan | Not in the fix list | UNCHANGED. The patient build loads a generated file with a hand-added `approvedOn` and shows Home | `g/ev/l2d.json` |
| L3-01 front-view number was an outlier | Median of per-rep signed changes, none below 3 reps | YES. With 0 reps the cell says "Not enough front-view data". With 13 front reps the cell says "-6.7 (13 reps)". The note says "Median of N reps, inward positive" | `p/a2.log`, `p/a3.log` |
| L3-03 column header label | Exact label | YES. Header: "Front-view change, estimated, not a medical measurement" | `p/a3.log` |
| L3-04 Wake Lock text | Text only when granted | YES. Granted (a test double): "The screen stays on while the phone works." Denied (real headless): "Your screen could turn off. Turn off the screen timeout in your phone settings while the phone works as the second camera." and no "stays on" line | `p/wake.json` |
| Pairing failed 1 in 3 | Clock and ready fixes | YES. 10 of 10 pasted pairings connected. Two real QR scans connected | `p/pair10.json`, `p/a2.log`, `p/a3.log` |
| L4-02 Home mobile Performance 92 | First-load split | YES. 100, 99, 100 | `lh/home-mobile-*.json` |
| L4-03 and L4-04 pose loop speed with the map | Body map and frame guard | YES for the median (see fps). The mean with the map is 0.9 fps lower | `runs/fps-*/fps.json` |
| L4-05 no load progress | Progress text | YES. "Loading the pose model, 0.2 of 20.4 MB" counting up, the setup check at 86 s | `ev/slow4g.json` |
| L4-08 Setup rule rarely passes | Size rule for standing legs | PARTLY. Clip 05 reaches "The camera sees your hip, knee and ankle." with six rules "seen". Clip 07 does not (see R2-07) | `runs/s05-setup-left/`, `runs/s07-setup-*/` |
| L4-01 SEO 63 | Dropped on purpose | NOT A DEFECT. SEO is 63 in all runs because of `Disallow: /` | `lh/*.json` |
| L3-02, L3-05, L3-06, L3-07, L1-04 (phone speed), L1-09, L4-06, L4-07, L4-09, L4-10, L2-04 | Not in the fix list or not testable here | NOT RUN | none |

## Clip table

Protocol copies in `E`: `p-heel.json` (heel slide `maxFlexion` 150) and `p-squat.json` (phase 2, mini squat `maxFlexion` 100). They are fixtures only. The chosen leg is the leg with the best detection in `docs/accuracy.md` (01 left, 02 left, 05 left, 07 right). Time to baseline counts from the opening of Session (about 2 s before my timer started).

| Clip | Baseline source | Time to baseline | Reps by the app in 90 s | Reps by eye | Notes |
|---|---|---|---|---|---|
| 01 heel slide (32 s clip) | lowest steady angle, 46 degrees, after my click | button enabled at about 15 s, angle set at about 19 s | 11 (set 1: 10, set 2: 1). About 4 for each pass | 6 to 10 flexions in 60 stills at 2 per second. I could not separate the two legs that alternate. NOT comparable | `runs/c01-heel-01/` |
| 01 repeat, run b | click gave no start. The text changed to "Your knee stays bent. Straighten your leg as far as your care team allows, then hold still." and stayed so for 45 s | none | 0 | not applicable | `runs/c01b-heel-01/` |
| 01 repeat, run c | lowest steady angle, 41 degrees | same as run a | 4 in the first 40 s | not applicable | `runs/c01c-heel-01/` |
| 02 heel slide mixed framing (30 s) | lowest steady angle, 4 degrees, after my click | button at about 15 s, angle at about 18 s | 11 (set 1: 10, set 2: 1). About 3.6 for each pass. Highest bend 175 degrees (the known outlier) | not counted. The stills were not read | `runs/c02-heel-02/` |
| 05 mini squat (27.4 s) | still window, 2 degrees ("Resting angle: 2 degrees") | about 15 s after Session opened | 11 (set 1: 10, set 2: 1). About 3.6 for each pass | 4 to 5 squats for each pass (27 stills at 1 per second, squats near 5, 9 to 11, 15, 20 and 24 to 26 s) | `runs/c05b-squat-05/` |
| 07 mini squat front (40 s) | still window, 6 degrees | about 2 s | 2 in 90 s. About 1 for each pass | 1 clear squat (7 to 9 s) and 1 to 2 shallow dips for each pass (40 stills) | `runs/c07-squat-07/` |

Counts differ between runs of the same clip because the click moment sets the starting angle (R2-06). The clip is a loop, so the count covers 2.2 to 3.0 passes.
Sets: "Set 1 of 3" showed with "Reps in this set: N of 10". At 10 reps the rest panel showed "Set 1 done. Rest when you are ready.", the pain question, "Start next set" and the starting angle. "Start next set" opened "Set 2 of 3" with "Reps in this set: 0 of 10". "Stop" opened the Summary with "Set 1: 10 reps". The button "Finish" was not reached because it needs all sets. The "Finish" check is NOT RUN.
Notice texts: clips 01, 02 and 07 showed only these notices in Session. They were "Show your whole leg.", "Close to your limit, stop.", "Stop at your limit, do not push." and the slow-rep text. The text "The app has no resting angle." and any text about stopping and starting again never showed in Session.

## Factual table of the checks

| Check | What I did | What I saw | Evidence | Result |
|---|---|---|---|---|
| New (b) the confirmation age | Playwright clock installed. At Confirm I moved the clock 15 s (`performance.now` 4,805 to 19,807 ms). Then a real click on Confirm | The plan saved and Home showed. No error text | `g/ev/l2b.json` | PASS |
| New (b) a stale click is refused 10 s after the click | Not possible with a real click. The age test runs in the same task as the click handler (`accept.ts`) | none | none | NOT RUN (unit test only) |
| New (c) generator, end to end | Week 3, limit 60: summary, Make my plan, Use this plan, Confirm, Home, Update my plan (limit 95, then Keep my plan), Update my plan (limit 50, Confirm), My data, Erase | Each screen as expected. Limit 95: "A higher limit needs your care team." Limit 50: "from 60 degrees to 50 degrees" and Home. Erase gave Privacy with empty stores, empty localStorage and no cache | `g/ev/l2b.json` | PASS |
| New (d) patient build, example file | Real file input | "Example not allowed. The example protocol cannot be used in patient mode." No protocol stored | `g/ev/l2d.json` | PASS |
| New (d) patient build, unapproved file | Real file input | "No approval recorded." Nothing stored | same | PASS |
| New (d) patient build, approved file | Real file input | Home | same | PASS |
| New (d) patient build, generated plan | Load screen | The button "Create my plan" is not offered. A generated file with a hand-added `approvedOn` loads (L2-05) | same | PASS for the app output, FAIL for the hand-added claim |
| New (e) privacy: storage | Run, save, then read IndexedDB, localStorage, sessionStorage, caches, service workers, cookies | IndexedDB holds `protocol`, `sessions` (554 bytes, 26 numeric and text fields) and `generatorInputs`. No data URL, no Blob. localStorage holds only `mpfl.persistAsked` and `mpfl.privacySeen`. No cache, no service worker, no cookie | `ev/privacy-storage.json` | PASS |
| New (e) privacy: network | 25 browser runs, 590 requests (document, script, stylesheet, font, fetch) | Zero foreign origins. Zero frame APIs (`toDataURL`, `toBlob`, `createImageBitmap`, `MediaRecorder`). Two `createObjectURL` calls with `application/json` (the export). Zero CSP violations, zero console errors, zero page errors | `runs/*/log.json` | PASS |
| Pairing message log | Real QR scan, session of 78 s and 116 s | The phone sent `hello` (1), `landmarks` (779 and 1,349) and `bye` (1). The laptop sent `ready` and `bye`. Largest message 1,125 bytes (limit 4,096). Only landmark indexes 23 to 28 hold values. Zero image or video text. Every message passed the schema. `tMs` never goes back | `p/a2.log`, `p/a3.log` | PASS |
| Pairing connection | Same runs | One `m=application` line. No `m=video`. No senders, no receivers. `iceServers` empty. Host candidates only. No foreign request. Both tracks ended after Stop | `p/a3-peer-inspect.json` | PASS |
| Pairing in one browser pair, paste fallback, 10 times | `p/pair10.mjs`, fresh browsers for each run | 10 of 10 connected in 1.3 to 2.0 s. Each run stayed Connected for 4 s. The phone then showed "Sending" | `p/pair10.json` | PASS |
| Pairing with a real QR scan | The offer QR as the fake camera of the phone. The answer QR on the video of the laptop | Both sides "Connected" in 2 runs | `p/a2.log`, `p/a3.log` | PASS |
| L3-01 front-view value | Paired session with 10 counted reps | Cell "-6.7 (13 reps)". With no counted front reps: "Not enough front-view data". The case of 1 or 2 reps was not run | `p/a3.log` | PASS (the case "under 3 reps" is NOT RUN) |
| Session first view, with a starting angle | Clip 05, 390 x 844 and 360 x 640 | Camera, angle and count all above the bar | `ev/layout05.json`, `runs/layout05-*/session-first.png` | PASS |
| Session first view, while the app looks for the angle | Clip 01, same sizes | Camera and the card "Find your starting angle" show. The angle and the count start at 755 px (bar at 747 px) and at 618 px (bar at 543 px) | `ev/layout.json`, `runs/layout-360x640/session-first.png` | FAIL (R2-04) |
| Hold meter | Seated hold, clip 06, phase 2 copy (`minFlexion` 40, `targetFlexion` 60) | "Holds 0 holds", "2 of 5 seconds" and a bar. The label "Holds in this set: 0 of 10". No hold finished because the clip has 24 percent detection | `runs/m06-hold-06-left/` | PASS |
| "1 rep" and "2 reps" wording | Session and Summary | Session: "2 reps" and "6 reps" seen, "1 rep" not captured. Summary: "Set 2: 1 reps" | `runs/c05b-squat-05/summary` text in `result.json` | FAIL for the Summary (R2-03) |
| Body map in Setup | Clips 01, 05 and 07 at 390 and 1280 px | The map sits on the leg. The chosen leg is a bold line. A joint that is not seen shows a label only (knee label on clip 07). The switch "Hide body map" removes the map (0 SVG nodes) and the box stays checked | `runs/fps-map-on-01/setup-map-1-d.png`, `runs/s07-setup-right/09-setup-end-m.png` | PASS |
| Body map, the other leg dashed | The other leg was not in the frame of the clips that I read | none | none | NOT RUN |
| Setup size rule, clip 05 | 40 s of Setup | Six rules "seen". Text "The camera sees your hip, knee and ankle." and "Starting in 5 seconds." | `runs/s05-setup-left/` | PASS |
| Setup size rule, clip 07 | 40 s of Setup, right leg and left leg | "Move back. Show your whole leg." The whole leg, leg size, side-on and held still stay "not seen". The ankle is at the lower edge of the picture | `runs/s07-setup-*/` | FAIL against the brief (R2-07) |
| Model load on Slow 4G | CDP 1.6 Mbit/s down, 150 ms | "Loading the pose model, 20.4 MB", then "0.2 of 20.4 MB" up to the end. "This takes longer than usual. Keep this page open." after 8 s. Ready at 86 s | `ev/slow4g.json` | PASS |
| First-load JavaScript | gzip level 9 of `index.html` scripts and module preloads (10 files) | 172,551 bytes. The W3 figure is 172,736 bytes. The CSS is 7,523 bytes gzip (34,238 raw) | computed from `dist/` | PASS (verified) |
| Lighthouse | `lh/run.sh`, 3 runs for each cell | see the table below | `lh/*.json` | see below |

Frame rate of the pose loop in Setup on clip 01 (60 s each, 4 pairs, software WebGL, no GPU). The numbers come from `requestVideoFrameCallback` and are not proof for a phone.

| Pair | Map on: median fps | Map on: mean fps | Map off: median fps | Map off: mean fps |
|---|---|---|---|---|
| 1 | 29.94 | 24.80 | 29.94 | 26.13 |
| 2 | 20.04 | 23.96 | 29.94 | 25.42 |
| 3 | 29.94 | 24.79 | 29.94 | 25.35 |
| 4 | 29.94 | 24.71 | 29.94 | 25.10 |

The median of the four medians is 29.94 fps with the map on and with the map off. This is within 1 fps. One run with the map on had a median of 20 fps (pair 2). The mean is 24.6 fps with the map on and 25.5 fps with the map off, so the difference is 0.9 fps. Evidence: `runs/fps-map-*/fps.json`.

## Lighthouse (3 runs for each cell, Lighthouse 13.6.0, Chrome 1254)

| Screen | Form factor | Performance (runs) | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| Load | mobile | 100 (100, 100, 100) | 100 | 100 | 63 |
| Load | desktop | 100 (100, 100, 100) | 100 | 100 | 63 |
| Home | mobile | 100 (100, 99, 100) | 100 | 100 | 63 |
| Home | desktop | 100 (100, 100, 100) | 100 | 100 | 63 |

Home mobile Total Blocking Time was 64, 92 and 81 ms. The plan targets are met: accessibility 100, best practices 100 and performance 95 or more on mobile Home. SEO is dropped on purpose because `robots.txt` says `Disallow: /`. The machine ran only this test during the audits.

## Issues

| Id | Severity | Title | Class |
|---|---|---|---|
| R2-01 | LOW | The Back button of the browser leaves the app (L2-10) | Fix that did not work (no fix) |
| R2-02 | LOW | Overflow at 195 px: whole app and long protocol text (L2-06, L2-11) | Fix that did not work at 195 px |
| R2-03 | LOW | Summary shows "1 reps" | New defect |
| R2-04 | LOW | Angle and rep count sit under the bottom bar while the app looks for the starting angle | New defect |
| R2-05 | MEDIUM | Patient build loads a generated plan with a hand-added `approvedOn` (L2-05) | Unchanged design limit |
| R2-06 | LOW | The lowest steady angle depends on the click moment | New observation |
| R2-07 | LOW | Clip 07 never reaches "The camera sees your hip, knee and ankle." | Clip, or the size rule |
| R2-08 | LOW | "Highest knee bend" for a straight leg raise (L1-07) | Unchanged |

**R2-01.** Steps: open Home, press "Start Heel slide", then press Back in the browser. Expected: the app stays and shows Home. Actual: the page goes to `about:blank`. History length is 2 and `history.state` is null. No gate is bypassed. Evidence: `g/ev/l2c.json`.

**R2-02.** Steps: load `xss.json` (long text without spaces) at 195 px, open Setup. Also visit 12 screens at 195 px. Expected: no sideways scroll (WCAG reflow). Actual: Setup is 256 px wide (list item `.step`, `.guide-note`, a `dt` and a `dd`). The whole app overflows on setup (214 px), setup running (243 px), summary (224 px) and My data (261 px). 390 px and 320 px pass. Evidence: `g/ev/l2c.json`, `g/shots/L211-195-*.png`. Round 1 counted five screens, now four.

**R2-03.** Steps: finish a set of 1 rep, press Stop. Expected: "1 rep". Actual: "Set 2: 1 reps" in the set list (`src/ui/Summary.tsx` writes `{unit}` with no plural rule). The stat card also writes "reps" after any number. Evidence: `runs/c01-heel-01/result.json` (field `summary`), `runs/c05b-squat-05/result.json`.

**R2-04.** Steps: clip 01 as the camera, protocol with a return value, press Start exercise without a still moment. Expected (brief): camera, count and angle above the bar at 390 x 844 and 360 x 640. Actual: the card "Find your starting angle" takes the space. The numbers start under the bar. The person scrolls to see the angle. With a starting angle (clip 05) the layout passes. Evidence: `ev/layout.json`, `runs/layout-360x640/session-first.png`.

**R2-05.** Steps: build with `VITE_PATIENT_USE_APPROVED=true`. Load a generated plan and add `"approvedOn": "2026-10-01"`. Expected by a strict reader: refuse. Actual: Home shows the plan. The field is a claim without a signature. Any approved file has the same limit. Evidence: `g/ev/l2d.json`, `g/shots/patient-generated-with-approvedOn.png`.

**R2-06.** Steps: clip 01, press the button "Use my lowest steady angle as the start" about 3 s after it is enabled. Actual: the start was 46, 41 and 20 degrees in three runs. In one run the text became "Your knee stays bent. Straighten your leg as far as your care team allows, then hold still." and no start was set in 45 s. With 20 degrees and the example limit of 90 the clip gave 0 reps in 116 s. The clip bends past the limit, so this is a fixture effect. The text gives a way forward, so this is not a dead end. Evidence: `runs/c01*/`, `p/a3.log`.

**R2-07.** Steps: clip 07 as the camera, Setup for 40 s, with each leg. Actual: "Move back. Show your whole leg." for the whole time. The ankle sits at the lower edge of the picture and the view is front, so "Side-on" is not seen. The brief expects the six rules to reach the final text. Class: the clip (a front view and cut feet), not shown to be an app fault. The app still found a resting angle of 6 degrees in Session. Evidence: `runs/s07-setup-right/09-setup-end-m.png`.

**R2-08.** Clip 04 gave "Highest knee bend 165 degrees" and clip 03 gave 85 degrees for a leg that stays straight. The value comes from cut-in pictures. The app has no plausibility check. Evidence: `runs/m04-slr-04-left/summary-initial.txt`, `runs/m03-slr-03-right/summary-initial.txt`.

## Fixed and verified, and what stays unproven

Fixed and verified (18) are these items.
The items are L1-01, the user report (in place baseline), L1-02, L1-03, L1-05, L1-06 and L1-08. Also L2-01, L2-02, L2-03, L2-07, L2-08 and L2-09. Also L3-01, L3-03, L3-04, the pairing fix, L4-02 and L4-05. The body map frame rate is also within 1 fps by median.
Fixed in part (1): L4-08 (clip 05 yes, clip 07 no).
Failed (3): L2-10, L2-06 at 195 px, L2-11 at 195 px.
Not run: L3-02 (two phones, one offer), L3-05 to L3-07, L4-06, L4-07, L4-09 and L4-10. Also not run: the other leg as a dashed line, the Finish button at the rest panel, and the case of under 3 front reps.

UNPROVEN: a real Redmi A3, real Android Chrome, the real tailnet and a real Wake Lock (a test double granted it). Also unproven: the clip counts against a goniometer and the frame rate on a phone. The clip counts are a smoke test. The eye counts are rough, with one observer and no reference.

## Clean-up

Removed: the two `vite preview` processes (PID 972921 and 972922) and the Lighthouse Chrome profile `E/lh/profile`. Each script closed its own browser. Kept: all evidence in `E`, which holds the clips' stills, so it stays outside the repo. The repo has one new file: this report. `app/dist` was not rebuilt.
