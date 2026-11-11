# UI audit: data honesty and standing rules

Date: 2026-11-09. Phase: prepare. No app code changed. The audit runs on a rendered build.

Skills used: web-design-guidelines, dataviz, frontend-design:frontend-design, simple-english:simple-english.

The skills guided the checks. The web-design-guidelines rules (48 px targets, tabular numbers, no hidden focus) became script checks. The dataviz anti-pattern list became the chart checks. I did not fetch the Vercel rule file. I ran no dataviz palette validator, because this phase picks no chart colour.

## 1. Files

| File | Use |
|---|---|
| `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-honesty/honesty-audit.mjs` | The runnable audit. Node and Playwright. No new dependency. |
| `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-honesty/audit-inpage.js` | Page helpers. The audit loads them. They only read the page. |
| `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-honesty/out-baseline/honesty-audit.json` | Full baseline result. 455 lines, each with a screen, a theme and the evidence. |
| `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-honesty/out-baseline/*.png` | One screenshot for each screen state (light theme). |
| `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-honesty/baseline.txt` | Console output of the baseline run. |

The script is not in the repo. The scratchpad rule of this task forbids a write there. The coordinator can copy both files to `app/scripts/` and then the gate can run in the repo.

## 2. How to run

Start a preview server of the build that you want to test. Use a free port. Then run:

```
node <path>/honesty-audit.mjs http://127.0.0.1:<port> --out <folder>
```

| Option | Meaning |
|---|---|
| `--theme light` or `dark` or `both` | Default is `both`. Dark runs only the colour, banner and target checks. |
| `--clip <file.mjpeg>` | Also runs a Session with a recorded clip as the fake camera. The clips are in the scratchpad folder `clips-real/webcam`. |
| `--src <app/src folder>` | Adds a static pass: `claims-check.sh`, a list of banned icon names and a search for a range input. |
| `--only a,b` | Runs only some groups: `gate`, `states`, `charts`, `session`, `pain`, `data`, `offline`, `nopose`, `onboarding`, `camera-denied`, `camera-none`. |
| `--selftest` | Opens a page with 12 known faults. Each fault must give FAIL. Run it after any change of the script. |

Environment: `APP_ROOT` is the app folder that holds Playwright, the word lists and the example protocol. The default is the main tree. For the redesign, set `APP_ROOT` to the worktree `app` folder and use its own dist.

If a button gets a new name, edit the object `T` at the top of the script. A screen that the script cannot reach gives SKIP with the reason. A SKIP is not a PASS.

Exit code: 1 when one check is FAIL. 2 when the script broke. Else 0.

Status words:

- PASS: the check ran and the evidence is shown.
- FAIL: a rule is broken.
- REVIEW: a person must judge.
- N/A: the feature is not in this build.
- SKIP: the screen was not reached.
- INFO: a number for the report.

## 3. Rules and the checks that test them

| Rule | Source | Check in the script | Limit of the check |
|---|---|---|---|
| No verdict word | `claims-check.sh` lists `words`, `praise`, `phrases` | Reads the lists from the shell file. Scans visible text, `aria-label`, `title`, `alt` on every screen | Pattern match. A verdict with an unlisted word passes |
| No score, grade, streak, goal, milestone, badge | FR13, FR23, brief section 1 | Text words, percent, "/100", and elements with such class names | Same limit. Class names are a guess |
| No green, red or amber colour | FR23, NFR12, `styles.test.ts` | Computes every visible colour (text, background, border, outline, SVG fill and stroke). Converts to OKLCH. Flags chroma 0.04 or more in hue under 40 or over 340 (red), 40 to 100 (amber), 100 to 175 (green). Prints hex, hue, chroma and count | Does not see video pixels, shadows, gradients, pseudo-elements or hover states |
| In-range rep shows nothing | FR10, FR23 | Reads every alert and status region for 6 s and counts `createOscillator` calls. Optional clip run logs each second | No in-range rep occurs in the baseline run (see section 6) |
| No NaN, undefined, null, Infinity | Data honesty | Scans visible text | None |
| Prototype banner on every screen | Brief section 1 | Looks for the exact text, visible, on every screen. Looks for the example line when the example protocol is loaded | None |
| Angle label next to every angle | Plan T10 | Finds each number with degrees. Needs "estimated angle, not a medical measurement" in the same block (up to 500 characters, or the chart block) | A heuristic. Protocol values are listed as INFO |
| Red-flag gate first | FR5 | After Start, the first screen is the gate. Nothing is pre-ticked. One tick disables Continue. Browser Back does not open Setup | The audit uses no direct URL. The app has none |
| Targets 48 px | NFR12 | Measures every button, link, input and label on every screen. Inline links in a sentence are exempt | Hidden state of a screen is not measured |
| Pain radios | FR12 | 11 radios, none checked, 48 px at 390, 360 and 320 px wide | Redesign with a range input gives FAIL on the count. Then change the check |
| Pain 7 pause message | FR12 | 6 gives no message. 7 gives the exact text in a `role=alert` with "rule of the app, not a diagnosis". 0 removes it | Pause between sets is not run (needs counted reps) |
| Dataviz anti-patterns | dataviz skill | One y axis. One series colour. Table exists. Axis labels. No number on every point. No reference line. Legend only for 2 series or more. Chart and table hold the same points | Reads Recharts markup. A new chart library needs new selectors |
| Margin band | U16 | Band area and the caption "Camera error, estimated" | None |
| Bottom bar | Decisions item 2 | Absent on flow screens. Three items named Home, Your sessions, My data. 48 px items. Fixed or sticky | Not in the baseline |
| Ruler gauge and limit tick | Brief 7.4 | Limit tick exists. Caption names the limit. No "target" or "goal". Counts numeric labels | Not tested with a hold exercise |
| Live numbers | Brief 7.4 | Font size 72 px or more | Class-name based |
| No sideways scroll | NFR5 | `scrollWidth` against the viewport | One width each |
| No foreign request, no console error, no CSP violation | NFR8 | Whole main story | Main story only |

Stale-data and error states that the script builds:

| State | How |
|---|---|
| No sessions | Clears the store. Opens Your sessions |
| One session | A real session from the fake camera, saved |
| 100 sessions | 100 records written into the store, then reload |
| Missing fields | Records with null reps, null peak, no pain, no swelling, a leg raise peak of 165 degrees |
| Offline | Browser set offline, then Your sessions, then Start camera |
| Camera denied | A stub that rejects with `NotAllowedError`, the same error as a real block |
| No camera | Browser with no fake device |
| No pose | The fake camera shows no person. The script reads the Setup and Session text |

## 4. Data source table

Marks: SRC is the field or function in the code. OK means the number exists in code. DERIVED means new code must compute it from stored data. NONE means no source exists. Each NONE is a finding that the redesign must not ship.

### 4.1 Home

| Item | SRC | Verdict |
|---|---|---|
| Title "Today" (brief 7.1) | No schedule, no day plan. `protocol.phases[].exercises` only | NONE. Use "Your exercises" |
| Active exercise name | `EXERCISE_NAMES[e.kind]` in `labels.ts` | OK |
| "3 sets of 10 reps" | `e.sets`, `e.reps` through `prescription()` in `planView.ts` | OK. Absent when the protocol has none. No default |
| "Target bend 60 degrees" | `e.targetFlexion` | OK. A protocol value, not an estimate |
| "Limit 90 degrees" | `e.maxFlexion` | OK. Absent for some exercises |
| Start button disabled | `counterSetup(e).ok` in `lib/exercises.ts` | OK |
| "Not ready" line | `notReadyText(kind, missing)` in `notReady.ts` | OK |
| Operated side | `protocol.side` | OK |
| Written by | `protocol.authoredBy` | OK. "Not recorded" when empty |
| Approval | `protocol.approvedOn` | OK. Text is "No clinician approval recorded" |
| Active phase "1, Protection" | `phase.id`, `phase.name` | OK |
| "Decisions for your surgeon 10" | `SURGEON_FIELDS.length + ASK_SURGEON_ITEMS.length` | DERIVED. The count is code constants, not data |
| Surgeon rows | `surgeonField(protocol, key)`, `ASK_SURGEON_TEXT` | OK |
| Last export | `getLastExport()` in `storage/meta.ts` (localStorage) | OK. "No export yet" when empty |
| Export reminder | `exportReminderDue(lastExport, now, hasSessions)` | OK |
| Contact card | `contactReason(last session, painPauseThreshold)` in `contactCard.ts` | OK. Reads `gaveWayPresses`, `pain`, `swelling`, `setPain` |
| Review card | `reviewDue(phase.reviewDate, today)` | OK |
| Bottom bar items | No data. Navigation state only | OK. Label must be "Your sessions", never "Progress" (FR13) |
| Privacy notice link | `onOpenPrivacy` | OK. Must stay reachable after the Home tile goes |
| Count of sessions near a nav item | `db.sessions.count()` | DERIVED. Allowed only as a plain count, not as a goal |

### 4.2 Red flag

| Item | SRC | Verdict |
|---|---|---|
| Each tick sentence | `RED_FLAGS[].text` in `redflags.ts` | OK. Wireframe sample lines are placeholders. The copy must stay |
| Title | h1 "Check before you exercise" in `RedFlag.tsx` | OK. The wireframe title "Before you start" is NONE (different text) |
| Blocked message | `MESSAGES[group]` | OK. Wireframe "Do not exercise today. Ask your care team first" is NONE |
| Block count | `redFlagBlocks` in `appState.ts` | OK |

### 4.3 Setup

| Item | SRC | Verdict |
|---|---|---|
| Six check rows and "Seen" or "Not seen" | `RULE_ROWS`, `ruleRows()` in `setupView.ts` | OK |
| State line and help line | `setupRules.ts` instruction texts | OK |
| Wireframe "Light" row | No light rule exists. Rules: person, hip knee ankle, whole leg, leg size, side-on, still | NONE. Do not add a "Light" row |
| Wireframe "Stand 2 m from the camera" | `distanceAdviceM` in `SETUP_CONFIG` | OK only if the text reads that value. A fixed "2 m" is NONE |
| Chip "Looking for your leg" | `startText` in `setupView.ts` and the check state | OK |
| Joint labels Hip, Knee, Ankle and "Ankle not seen" | `JOINT_NAMES`, landmark visibility in `BodyMap.tsx` | OK |
| Countdown number | `countdownSeconds(leftMs)` | OK |
| Resting angle | `restingBaseline()` in `baseline.ts`. Shows with the angle label | OK |
| Model size "20.4 MB" | `MODEL_BYTES` | OK. A test keeps it equal to the file size |
| Leg choice, camera side | `LEG_TEXT`, `exerciseLeg`, `cameraSide` | OK |

### 4.4 Session

| Item | SRC | Verdict |
|---|---|---|
| Live angle number | `view.angle` from the pipeline in `lib/exercises.ts` (filtered flexion) | OK. "--" when no pose |
| Label "Knee bend: estimated angle, not a medical measurement" | `ANGLE_LABEL` in `labels.ts` | OK. Must stay next to the number |
| Rep count | `sets.repsInSet` from `lib/sets.ts` | OK |
| Hold count | `sets.repsInSet`, unit "holds" | OK |
| Set label and "N of M reps" | `setLabel(sets)`, `repsLabel()` | OK. Only with a protocol `sets` and `reps` |
| Ruler gauge fill and thumb | `view.angle`, `at(deg)` in `Session.tsx` | OK |
| Limit tick and caption | `exercise.maxFlexion` | OK. Hidden when the protocol has no limit. No default may enter |
| Ruler scale end | `max(120, ceil((limit+30)/10)*10)` | DERIVED. The brief says limit plus 30. The code uses 120 as the least value |
| Ruler tick labels every 10 degrees | None in code. The gauge has no labels now | DERIVED. REVIEW: many numbers on a scale |
| Short tick every 5 degrees | None | DERIVED. Decoration only |
| Cue text | `cues.ts`: "Close to your limit, stop.", "Stop at your limit, do not push.", "Show your whole leg." and more | OK |
| "Rep time 1.3 s. Your care team set at least 2.0 s." | `tooFast(repMs, minRepMs)` in `cues.ts`. `minRepSeconds` | OK. Only with the protocol value |
| Empty cue when in range | No text by design (FR23) | OK. Baseline run shows only limit and leg cues |
| Beep | `sound.ts`. Only `near-limit` and `over-limit` | OK. 0 calls without an event |
| Second camera chip | `secondConnected` in `Session.tsx` | OK |
| Hold meter "N of M seconds" | `view.holdSec`, `exercise.holdSeconds` | OK. REVIEW: a bar toward a clinician time reads as progress to a goal |
| Capture progress bar | `view.capture.progress` | OK. REVIEW (same reason) |
| Skeleton overlay | Landmarks, drawn as SVG in `BodyMap.tsx` | OK. No frame is drawn |
| Trace colour and halo | CSS only | A fixed colour. The decision file says keep white. The colour check flags yellow as amber on purpose |
| Elapsed time, total, goal | None | NONE. Must not show (brief 7.4 agrees) |
| Pause message between sets | `PAUSE_MESSAGE`, `evaluateSession()` | OK |
| Rest panel | `sets.phase === 'set-complete'` | OK. Not run by the script |

### 4.5 Summary

| Item | SRC | Verdict |
|---|---|---|
| Reps counted | `summary.reps` | OK |
| Holds counted | `summary.holds` | OK |
| Highest knee bend | `summary.peakFlexion`, with `peakUnreadable()` for a raw leg raise value | OK. Shows "The camera could not read this leg raise." |
| Wireframe "Estimated top angle ... (not a measurement)" | `topAngleText()` writes the exact label | The short text is NONE. Keep "estimated angle, not a medical measurement" |
| Reps of each set | `sets.repsPerSet` | OK. No total, no verdict |
| Pain value and pill "Pain: 3" | `pain` state in `Summary.tsx`, `PainScale.tsx` | OK. "Pain: not set" is `null` |
| Pain ruler (range input) | None. The decision file says keep 11 radios | NONE for the audit. A range input holds a value at once, so "not set" has no source |
| Minus and plus buttons | None | DERIVED. The first press must not invent 0 or 1 |
| Swelling options | `SWELLING` in `Summary.tsx`: none, some, more | OK. Texts are "No swelling", "Some swelling", "More than before" |
| Wireframe "None, A little, A lot" | None | NONE. "A lot" is not "more than before" (FR12 rule) |
| Pause text | `PAUSE_MESSAGE`, `evaluateSession()` | OK. Wireframe "Pause the exercises ..." is NONE |
| Wireframe "Do not save" | None. The button is "Skip the questions" | NONE |
| Saved message | `saved` state | OK. "Session saved." and "Session saved without answers." |
| Save failed | `saveError`, `recordFailed` | OK |

### 4.6 Your sessions (charts)

| Item | SRC | Verdict |
|---|---|---|
| Peak knee bend per session | `SessionRecord.peakFlexion` through `buildProgressSeries()` in `progress.ts` | OK. Null gives a gap |
| Leg raise above 30 degrees | `peakUnreadable()` | OK. Gap in the chart, text in the table |
| Reps per day | `SessionRecord.reps` summed by `date.slice(0, 10)` | OK. Day is UTC |
| Pain per session | `SessionRecord.pain` | OK. Absent when not answered |
| Margin band | `SessionRecord.marginDeg`, else `MARGIN_DEG` (9) | OK. The value is UNVERIFIED. The caption says so |
| Caption "Camera error, estimated: about 9 degrees" | `marginText()` in `Dashboard.tsx` | OK |
| Big number "84 degrees last session" | `lastKnown` row in `Dashboard.tsx` | OK. Baseline shows it, hidden from screen readers |
| Date range text "N sessions, 9 Nov 2026 to ..." | First and last table row | OK |
| Summary line "N values. Lowest ... Highest ... Last ..." | `summaryText(rows)` | OK. No trend word |
| Range control Last 7, Last 30, All | None. No range code exists | NONE until built. Chart, table and summary must use the same range |
| Empty range text | None | NONE. "0 sessions yet" is false when older sessions exist |
| Read-out line "3 Nov 82 degrees" | The chart point | DERIVED. Tap only |
| Table with date, angle and reps | One table for each series now | DERIVED. A join of `peakFlexion` and `reps` for each session |
| Second series, ochre, dashed | None. Every chart has one series | NONE. The decision file drops it |
| Empty state "0 sessions" | `db.sessions.count()`, `sessions.length === 0` | OK |
| Goal or target line | None | NONE. Forbidden |

### 4.7 My data, care team, load, privacy, errors

| Item | SRC | Verdict |
|---|---|---|
| Session count | `db.sessions.count()` in `DataScreen.tsx` | OK |
| Export JSON and CSV | `exportJson`, `exportCsv` in `storage/export.ts` | OK |
| Import result text | `importSessions()` | OK |
| Erase dialog | `eraseAll()` | OK |
| Care team view numbers | `reviewSummary.ts`, `ClinicianView.tsx` | OK. Labels include `ANGLE_LABEL` |
| Load errors "File not readable", "Protocol not valid", "File too large" | `loadProtocol` in `lib/protocol` | OK |
| Camera messages | `src/pose/camera.ts` | OK. "Camera access was blocked", "No camera was found", "The camera could not start" |
| "The pose model could not load" | `Setup.tsx` camera state | OK |
| "Screen not loaded" | `LoadError.tsx` | OK |
| Error screen layout 121 (title 36 px) | CSS only | Copy must come from the files above. Wireframe words are not data |

## 5. Checklist for a person (the script cannot decide these)

Mark each line with the screen and the date.

- [ ] Every number has a row in section 4. A number with NONE is removed or the source is built first.
- [ ] Each yellow or amber colour that the script flags is a fixed identity colour (leg trace). It never changes with state or time.
- [ ] Each `REVIEW` progress bar is a process or a clinician value. It never reads as a score.
- [ ] The Privacy notice is reachable from Home or My data in two taps.
- [ ] The bottom bar uses "Your sessions". The word "Progress" is nowhere.
- [ ] The cue banner never covers the ankle or foot (decision 4).
- [ ] Look at one screenshot of each screen in both themes. The script does not read pixels of the camera picture.
- [ ] Run the hand test of the pain taps on 6 and 7 with a thumb on a real phone. Not run so far.
- [ ] Run one in-range rep on a real clip or a real phone and watch for a banner and a beep.
- [ ] The Last 7, Last 30 and All range gives the same points in chart, table and summary line.
- [ ] No "Today", "Before you start", "A little", "A lot" or "Do not save" text from the brief wireframes enters the build.

## 6. Baseline run on the main tree

Server: `vite preview --outDir dist --host 127.0.0.1 --port 4417 --strictPort` from the app folder. The build in `dist` is the one that was already there. I did not rebuild. I did not check that `dist` matches the current source.

Command: `node honesty-audit.mjs http://127.0.0.1:4417 --out out-baseline --clip .../01-heel-slide-side.mjpeg --src .../app/src`. It ran 93 s.

Self test: `node honesty-audit.mjs --selftest` printed "SELFTEST OK: all 12 known faults caught". Each check can fail.

Result: 455 lines. 409 PASS, 34 N/A, 10 INFO, 2 REVIEW, 0 FAIL, 0 SKIP. Light theme: 341 PASS. Dark theme: 65 PASS (colour, banner and target checks only). Source pass: 3 PASS.

The audit reached 26 screen states. They are: privacy, load, load-error, home-no-sessions, redflag, redflag-blocked.
The next ones are setup-guide, setup-camera-before, setup-camera-nopose, session-nopose, summary, summary-pain6 and summary-pain7.
Then come home-one-session, dashboard-1, dashboard-empty, dashboard-100, dashboard-missing, data and clinician.
Last are offline-dashboard, offline-setup-camera, camera-denied, camera-none, onboarding and session-clip.

| Rule | Baseline result |
|---|---|
| Verdict words | 0 hits on every screen |
| Score, goal, streak, badge | 0 text hits, 0 elements |
| State colour | 0 of 11 to 18 distinct colours per screen flagged, in both themes. Warm paper has chroma below 0.04 |
| NaN, undefined, null | 0 hits, including the missing-field set |
| Prototype banner | Present on the 25 screens that run the check. In the first view on 24. On the blocked red-flag screen it is visible but scrolled out of the first view, because the page scrolls to the message. Example banner present on all 21 screens after the protocol load |
| Angle label | Session (2 numbers), Summary (no number without the fake camera), Your sessions (1, 137 and 9 numbers) all have it. Home and Setup show protocol values only (INFO) |
| Red-flag gate | First screen after Start. Nothing pre-ticked. A tick disables Continue. Back goes to Home |
| Pain | 11 radios, none checked, smallest target 48 x 56 at 390, 360 and 320 px. 6 shows no message. 7 shows the message with `role=alert` and the rule text. 0 removes it |
| In-range rep | Not tested for a real in-range rep (see gaps). With no pose: 0 oscillator calls in 6 s. Live texts: "Show your whole leg.", "Hold your leg still for a moment." |
| Charts | One y axis, one series colour (`rgb(0, 98, 113)`), table, axis labels, no number on a point, no reference line, chart equals table. All pass in all 4 stale-data sets |
| Targets | 0 under 48 px on every screen, in both themes |
| Layout | 0 sideways scroll |
| Network | 0 foreign requests, 0 console errors, 0 CSP violations |
| Stale data | Empty: text "No sessions yet. Do a session and save it." No chart. One session: the angle chart shows "No values." because the fake camera gave no peak. 100 sessions: 5 charts, 100 bars and 100 points, audit time 316 ms. Missing fields: gaps in the charts, table shows "no value" |
| Offline | "Screen not loaded. This screen could not load. ... Saved sessions stay on this device." Start camera offline: "The pose model could not load. Reload the page, then try again." |
| Camera denied | "Camera access was blocked. Allow the camera in the browser settings for this site, then try again." and one retry button |
| No camera | "No camera was found. Connect a camera, then try again." and one retry button |
| No pose | Setup says what it does not see. Session shows "--" for the angle |
| Bottom bar, ruler labels | Bar: N/A (not in the baseline). Gauge exists with a limit tick and no number labels |
| Static pass | `claims-check: ok`. 0 banned icon names. 0 range inputs |

The 2 REVIEW lines: the progress element "Hold still progress" on Session, once in the no-pose run and once in the clip run. It is a process bar. A person must accept it.

One INFO to note: the 100-session set has 34 leg raise records with peaks from 50 to 89 degrees. The app plots none of them and writes "could not read this leg raise". This is the designed rule of 30 degrees (M8), not a fault.

## 7. Predicted findings for the redesign

These come from the brief and the decisions file. They are not baseline findings. The script will show some of them as FAIL on the redesign build.

1. The pain ruler as a range input fails "11 radios" and "no value pre-selected". The decision file says keep the radios. A person must confirm.
2. A bottom bar label "Progress" fails the bar check.
3. A bar on Setup, Session, Summary or Red flag fails the bar check.
4. A tape-yellow trace colour fails the colour check (amber, hue 92, chroma 0.157). Keep white, or accept the flag in writing.
5. A second series in ochre fails the "one series colour" check (REVIEW) and has no data source.
6. Dark lavender attention block (hue 280) passes. The pale lavender banner strip is a visual risk, not a rule break.
7. A ruler with a number on every tick gives REVIEW on the gauge numbers.
8. Brief texts "Today", "Before you start", "A little", "A lot", "Do not save" and "(not a measurement)" are NONE in section 4. The verdict-word check cannot see them, so a person must read the copy.
9. A Last 7 range with no session in range needs its own empty text.

## 8. Gaps

- No in-range rep ran. The clip run counted 0 reps, because the resting-angle capture never finished. The beeps in that run came from over-limit angles (128 to 138 degrees against a limit of 90). The unit tests `session.test.tsx` and `cueGate.test.ts` cover the in-range case. I did not run them.
- The set-complete rest panel, the pain pause between sets, the hold exercise and the "gave way" Summary were not reached.
- Not reached: Home contact card, plan screens (onboarding after the first question, plan, confirm, update, referral) and the companion screen.
- The colour check does not read video pixels, shadows, gradients, pseudo-elements, hover or focus states.
- The dark theme runs only 3 check groups.
- The word check is a pattern match. A verdict in an unlisted word passes.
- The camera-denied story uses a stub for `getUserMedia`. A real browser block was not tested.
- The script was not run on the redesign build. The worktree was off limits.
- No real phone test ran.
- The simple-english check ran on this file. See the result in the report of the agent.

## 9. Clean up

I started one process: `vite preview` on port 4417. I stopped it by exact PID. The scratchpad folder `uiaudit-honesty` holds the script, the helper, `out-baseline` and `baseline.txt`. I kept them because this report cites them.
