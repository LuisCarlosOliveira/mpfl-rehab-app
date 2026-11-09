# Live test 2: workflows that need no person in view

Date: 2026-11-08. App: `app/dist` at commit b451206 (built output, served by `vite preview` on port 4302). Tester: an independent agent. The tester changed no file of the app. Evidence is in `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/t2/` (shots, ev, dl, fx, scripts). Paths in the tables are relative to that folder.

Skills loaded with the Skill tool: `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:a11y-debugging`, `owasp-security`, `web-design-guidelines`, `simple-english:simple-english`. All five loaded. The guardrails skill was read with the Read tool. The Chrome DevTools MCP tools were not used for the runs. The runs used Playwright with Chromium, as ordered. The web-design-guidelines rules were not fetched from the web, so no separate guideline review was done.

## 1. Summary

The app passed most checks. 134 checks passed, 3 failed, 5 did not run, and 5 are notes that record an observation without a verdict.

The red flag gate held in every route that was tried. The generator refused every referral case, stored nothing before Confirm, and never stored pain, swelling, red flags or clearance. Patient mode refused the example, the file with no approval, and the generated plan with no approval. Data export, import, erase and the care team view worked as designed. Axe found 0 violations on 37 screens at two sizes. The CSP had 0 violations and the app made 0 requests to another origin.

The test found no HIGH issue. It found five MEDIUM issues and six LOW issues. The first is the number "Target knee bend 18 degrees" on a generated plan (L2-01). The second is the blank screen when a screen chunk cannot load (L2-02). The third is a conflict between the audit and the generator about the start dose (L2-04).

No number on a generated plan is unsupported by the knowledge base, with two points to decide. The 2 sets of 10 repetitions rest on P2 rec 26, which the citation audit allows only as a clinician-set value (L2-04). The value 18 degrees is an engineering value that the screen calls a "Target" (L2-01).

| Area | Name | PASS | FAIL | NOT RUN | NOTE |
|---|---|---|---|---|---|
| A | First launch | 9 | 1 | 0 | 0 |
| B | Red flag gate | 23 | 0 | 0 | 0 |
| C | Protocol generator | 21 | 0 | 0 | 2 |
| D | Patient mode | 11 | 1 | 0 | 0 |
| E | Summary and safety rules | 18 | 0 | 1 | 0 |
| F | Data | 26 | 0 | 0 | 0 |
| G | Error and edge paths | 19 | 1 | 2 | 2 |
| H | Accessibility and security | 7 | 0 | 2 | 1 |

## 2. How the test ran

- Browser: Chromium (Playwright 1.65) with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`. A new browser profile for each flow. One browser at a time.
- Clicks: real Playwright clicks, keyboard presses and file inputs. No synthetic event. No direct state edit. The only script injections are listed here. A probe for `securitypolicyviolation` and `getUserMedia` (all runs). A rejecting `getUserMedia` (G03). A throwing `IDBObjectStore.add` (G12). A fixed page clock (C13 to C15, C23). `page.setOffline` (G09 to G11).
- Sizes: 390 x 844 and 1280 x 800 on every screen. Extra sizes: 320, 640, 195 and 1920 wide.
- Servers: `vite preview --outDir dist` on port 4302 (demo build, the real `app/dist`). The patient build went to a scratch folder `dist-patient` with `VITE_PATIENT_USE_APPROVED=true` and ran on port 4303. Both node processes were stopped by exact PID (618907 and 630914). `app/dist` was not rebuilt. Its file date did not change.
- Fixtures: all in `fx/`. They are copies or edits of the example protocol or of an export file. No repo file was edited. The fixture `fx/pain4.json` is the example with `painPauseThreshold` 4.
- Screens read by eye: A-xss-home, A-load-390, C-home-generated-390, C-update-raise, G-offline-mydata-390, G-w320-summary, G-zoom200-390-FAILED, H-redflag-blocked-emergency-390 and H-summary-pause-390. The other screenshots exist as evidence and were checked by axe and by text scans. The plan page with every rule open is 12961 px tall, so its text was read from the DOM dump in `ev/C-*.json`.
- The Setup and Session screens ran with the fake webcam pattern. No person is in view, so no rep is counted. Live test 1 covers the pose pipeline.

## 3. Factual table of checks

Each row gives the check, what was done, what was seen, the evidence path and the result. B13 appears six times (one for each URL).

| Id | Check | What I did | What I saw | Evidence | Result |
|---|---|---|---|---|---|
| A01 | Privacy shows four points incl. surgery date point | open / | h1=Privacy; four points present=true; banner true | shots/A-privacy-390.png | PASS |
| A02 | Continue goes to Load protocol screen | press I understand | h1=Load protocol file; localStorage keys=mpfl.privacySeen | shots/A-load-390.png | PASS |
| A03 | Bad file invalid-json: refused, nothing stored | set input file fx/invalid.json | alert="File not readable The file is not valid JSON."; stored rows=0; h1=Load protocol file | shots/A-bad-invalid-json.png | PASS |
| A04 | Bad file too-large (5 MB plus 10 bytes): refused, nothing stored | set input file fx/large.json | alert="File too large The file is larger than 5 MB."; stored rows=0; h1=Load protocol file | shots/A-bad-too-large.png | PASS |
| A05 | Bad file unknown-key: refused, nothing stored | set input file fx/unknown-key.json | alert="Protocol not valid The protocol is not valid at "file": Unrecognized key: "unknownKey"."; stored rows=0; h1=Load protocol file | shots/A-bad-unknown-key.png | PASS |
| A06 | Script and link strings in text fields show as plain text, nothing runs | load xss.json (authoredBy, surgeon.*, phase name, source) | h1=Home; __xss=undefined; dialogs=0; script string visible=true; anchors in main=[]; imgs=0 | shots/A-xss-home.png | PASS |
| A07 | Example protocol in demo mode: both banners on every screen visited | visited Home, Progress:Loading, My data, Privacy, after-privacy:Home, RedFlag, Setup guide, Setup camera | Home:ok; Progress:Loading:ok; My data:ok; Privacy:ok; after-privacy:Home:ok; RedFlag:ok; Setup guide:ok; Setup camera:ok | shots/A-home-390.png | PASS |
| A08 | Reload keeps the protocol (FR26) | page.goto(/) again | h1=Home; stored protocol rows=1; example banner=true | shots/A-reload-390.png | PASS |
| A09 | Console, page errors, CSP, foreign requests for flow A | whole flow | console=[]; pageerrors=0; csp=0; foreign=[]; requests=11 | (in run output) | PASS |
| A10 | Long text without spaces in a protocol text field does not overflow the page at 390 px | xss.json (authoredBy 60 chars w/o space, surgeon.brace) | scrollWidth=537 innerWidth=390; clipped dd=["<a href=\"javascript:window.__x"] | shots/A-xss-overflow-390.png | FAIL |
| B01 | Red flag breathless-chest (emergency) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Call emergency services now. General guidance, not verified for MPFL surgery. Go back to Home t"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Call emergency services now" | shots/B-flag-breathless-chest.png | PASS |
| B02 | Red flag kneecap-moved (emergency) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Call emergency services now. General guidance, not verified for MPFL surgery. Go back to Home t"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Call emergency services now" | shots/B-flag-kneecap-moved.png | PASS |
| B03 | Red flag foot-numb-cold (emergency) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Call emergency services now. General guidance, not verified for MPFL surgery. Go back to Home t"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Call emergency services now" | shots/B-flag-foot-numb-cold.png | PASS |
| B04 | Red flag calf (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-calf.png | PASS |
| B05 | Red flag infection (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-infection.png | PASS |
| B06 | Red flag swelling (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-swelling.png | PASS |
| B07 | Red flag giving-way (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-giving-way.png | PASS |
| B08 | Red flag catching-locking (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-catching-locking.png | PASS |
| B09 | Red flag bend-loss (care-team) blocks and stays blocked after untick | Start Heel slide, tick item, read alert, untick | alert="Stop. Do not exercise. Contact your care team. General guidance, not verified for MPFL surgery. Go back to Home to sta"; continue disabled=true; after untick disabled=true, alert still="Stop. Do not exercise. Contact your care team. Ge" | shots/B-flag-bend-loss.png | PASS |
| B10 | Emergency and care-team both ticked: emergency text shows | tick calf and breathless | alert="Stop. Do not exercise. Call emergency services now. General guidance, not verified for MPFL surgery" | - | PASS |
| B11 | Fresh visit after Back to Home is a clean check (no carried block) | Back to Home then Start Heel slide | continue disabled=false; ticked=0 | - | PASS |
| B12 | Browser Back on the red flag screen does not reach Setup | page.goBack() from red flag; url=http://127.0.0.1:4302/ | now (left the app: about:blank) | - | PASS |
| B13 | Direct URL /setup does not reach Setup or Session | goto /setup | status=200; h1=Home | - | PASS |
| B13 | Direct URL /session does not reach Setup or Session | goto /session | status=200; h1=Home | - | PASS |
| B13 | Direct URL /#/setup does not reach Setup or Session | goto /#/setup | status=200; h1=Home | - | PASS |
| B13 | Direct URL /#setup does not reach Setup or Session | goto /#setup | status=undefined; h1=Home | - | PASS |
| B13 | Direct URL /?screen=setup does not reach Setup or Session | goto /?screen=setup | status=200; h1=Home | - | PASS |
| B13 | Direct URL /session?x=1 does not reach Setup or Session | goto /session?x=1 | status=200; h1=Home | - | PASS |
| B14 | Reload during Setup returns to Home, not Setup | reload on Setup | h1=Home | - | PASS |
| B15 | After Cancel, re-entering needs a new red flag check | Cancel from Setup; Start Heel slide again | h1 after Start=Check before you exercise; goBack h1=Home | - | PASS |
| B16 | history.back from Setup does not reach a camera screen | goBack from Setup | now=Home | - | PASS |
| B17 | App uses no router / history entries (so Back leaves the app) | history.length=9 | url=http://127.0.0.1:4302/ | - | PASS |
| B18 | Console/CSP/foreign for flow B | whole flow | console=[]; pageerrors=0; csp=0; foreign=0 | - | PASS |
| C01 | Questionnaire: one question per screen, Back and Next, summary with Change | answered 11 questions; Change limit 60 to 55; Next | summary rows=11; after Change heading=Did your surgeon give a limit for how far you can bend your knee, also with a brace?; returned to Check your answers; shows 55 degrees=true (11 answer rows is correct: 11 questions before the summary; the first FAIL came from a wrong expected count of 10 in t... | shots/C-w3-lim60-summary-390.png | PASS |
| C02 | Nothing stored before Confirm (Your plan screen) | Make my plan | protocol=0; inputs=0; sessions=0; ls=mpfl.privacySeen | - | PASS |
| C03 | Confirm screen: still nothing stored; text lists the new plan | Use this plan | stored protocol=0; text=" You asked the app to make a plan from your answers. The app saves it on this device only when you press Confirm. Your new plan Phase 1 Protection. Straight leg raise. Heel slide, knee-bend limit 55 degrees. Confirm Do not save this plan" | shots/C-confirm-390.png | PASS |
| C04 | Confirm saves: generated field, rule ids, approvedOn empty | real click on Confirm | generated={"on":"2026-11-08","rules":["W1","PH1","SLR","DOSE","HEEL","RANGE_SURGEON","ENG_TARGET","ENG_RETURN","REVIEW"]}; approvedOn=undefined; authoredBy=Generated by the app from published protocols; id=generated-week-3; activePhase=1; surgeon={"concurrentProcedures":"None, as entered by you"} | ev/C-stored-protocol.json | PASS |
| C05 | Stored generator inputs: surgery date and answers kept; red flags, pain, swelling, clearance NOT stored | read IndexedDB generatorInputs | keys=writtenPlan,procedure,ageBand,bothKnees,firstSurgery,specialRules,surgeryDate,side,surgeonLimit; forbidden present=[]; surgeryDate=2026-10-15; limit={"kind":"degrees","degrees":55} | ev/C-stored-inputs.json | PASS |
| C06 | Home shows stored plan with generated banner and prototype banner, no example banner | after Confirm | generated banner=true; proto=true; example=false; approval line="No clinician approval recorded"=true; Update my plan button=1 | shots/C-home-generated-390.png | PASS |
| C07 | Reload keeps the generated plan and banner | reload | banner=true | - | PASS |
| C08 | localStorage after plan flow holds no answers | read localStorage | {"mpfl.privacySeen":"1"} | - | PASS |
| C09 | Update my plan with no change: "No change to your plan today", no Confirm button | Update, answers 2 and No swelling | text has no-change=true; Confirm buttons=0 | shots/C-update-nochange.png | PASS |
| C10 | Keep my plan changes nothing | Keep my plan | stored raw identical=true | - | PASS |
| C11 | Update with a HIGHER limit than stored (60/55 to 95): what the screen offers | Update, limit 95 | h1=Confirm the change; Confirm buttons=0; text="d by the app from published protocols. Not approved by a clinician. MPFL Rehab Confirm the change You asked the app to check your plan again. The app changes nothing until you press Confirm. Ask your care team about the next stage. Keep my plan" | shots/C-update-raise.png | NOTE |
| C12 | Update with a lower limit and Confirm saves it | limit 40, Confirm | change text="blished protocols. Not approved by a clinician. MPFL Rehab Confirm the change You asked the app to check your plan again. The app changes nothing until you press Confirm. What changes Knee-bend limit in your plan: from 55 degrees to 40 degr"; stored maxFlexion=40; stored inputs limit... | - | PASS |
| C13 | B3 review card on the review date; phase stays 1 | clock +28 days (today = surgery+52 days), reload | review card=true; active phase line has "1, Protection"=true; stored raw changed on reload=false | shots/C-home-week7-card.png | PASS |
| C14 | Update at week 7 with clearance Yes: phase change is held, no Confirm (flag off) | clock +28, Update, clearance Yes | clearance asked=true; hold text=true; Confirm buttons=0 | shots/C-update-hold.png | PASS |
| C15 | Phase stays 1 after moving the date until Confirm; stored unchanged | Keep my plan after hold | activePhase=1; raw identical to before clock move=true | - | PASS |
| C16 | Update at week 7 with clearance No | Update clearance No | text="blished protocols. Not approved by a clinician. MPFL Rehab Confirm the change You asked the app to check your plan again. The app changes nothing until you press Confirm. What changes No change to your plan today. Keep my plan" | - | NOTE |
| C17 | Console/CSP/foreign for the plan flow | whole flow | console=[]; pageerrors=0; csp=0; foreign=0 | - | PASS |
| C18 | Approved clinician plan loads: no example banner, approval date shown | load approved.json | approval text="Approved on 2026-10-01"=true; Update my plan button=0 (expected 0: not made by app) | - | PASS |
| C19 | Stored clinician-approved plan is never replaced silently: warning on Confirm screen | Create my plan over approved plan | alert="Your plan would be replaced Your stored plan was approved by a clinician on 2026-10-01. If you confirm, the app replaces it with a plan that no clinician approved." | shots/C-confirm-replace-approved.png | PASS |
| C20 | Keep my plan on that warning leaves the approved plan and writes no answers | Keep my plan | stored raw identical=true; generatorInputs rows=0 | - | PASS |
| C21 | Back on the first question goes to Home when a protocol exists | Back on question 1 | h1=Home | - | PASS |
| C22 | Console/CSP/foreign for the replace flow | - | console=[]; csp=0; foreign=0 | - | PASS |
| C23 | B3 review card shows on the review date, not the day before | plan made at week 3, review date 2026-11-26; clock +17, +18, +19 days | +17d: card=false; +18d: card=true; +19d: card=true | shots/C-review-card-day.png | PASS |
| D01 | Patient build: no prototype banner, no Create my plan button on Load screen | open patient build | prototype banner=false; Create my plan buttons=0; text has "No file from your care team"=false | shots/D-load-390.png | PASS |
| D02 | Patient build refuses example-protocol | set input file | alert="Example not allowed The example protocol cannot be used in patient mode."; stored rows=0; h1=Load protocol file | shots/D-example-protocol.png | PASS |
| D03 | Patient build refuses no-approval | set input file | alert="No approval recorded No clinician approval is recorded in this protocol."; stored rows=0; h1=Load protocol file | shots/D-no-approval.png | PASS |
| D04 | Patient build refuses generated-unapproved | set input file | alert="Plan from the app not allowed A plan that the app made has no clinician approval. It cannot be used in patient mode."; stored rows=0; h1=Load protocol file | shots/D-generated-unapproved.png | PASS |
| D05 | Patient build with a GENERATED plan that also carries approvedOn (a hand-edited file) | set generated plan + approvedOn | The file loaded. Home shows "Approved on" in the Approval line. Patient mode accepts the file. | - | FAIL |
| D06 | Patient build loads an approved file | set approved.json | h1=Home; approval line=true; proto banner=false; example banner=false; Update my plan buttons=0 | shots/D-home-390.png | PASS |
| D07 | Care team view not reachable in patient build (no button on My data) | open My data | Care team card=false; open button=0 | shots/D-data-390.png | PASS |
| D08 | Direct URL /clinician does not show care team view | goto | h1=Home | - | PASS |
| D08 | Direct URL /#clinician does not show care team view | goto | h1=Home | - | PASS |
| D08 | Direct URL /data?care=1 does not show care team view | goto | h1=Home | - | PASS |
| D09 | Reload keeps the approved protocol in patient build | reload | h1=Home | - | PASS |
| D10 | Console/CSP/foreign for patient build | whole flow | console=[]; csp=0; foreign=0 | - | PASS |
| E01 | Reach Summary: fake webcam, Start camera, Start exercise, Stop | real clicks | h1=Summary; text="ehab Summary Exercise: Heel slide Reps counted 0 reps Set 1: 0 reps No repetitions were counted. How much pain do you have now? 0 is no pain. 10 is the worst pain. 0 1 2 3 4 5 6 7 8 9 10 No pain Worst pain Is your knee swollen? No swelling Some swelling More than before" | shots/E-summary-390.png | PASS |
| E02 | Pain 6 and No swelling: no pause | pain 6, No swelling | alerts=""; Save disabled=false | - | PASS |
| E03 | Pain 7: pause message "Pause and contact your care team." above the questions, no Save press | select pain 7 | alert="Pause and contact your care team. You reported pain 7 out of 10. This is a rule of the app. It is not a diagnosis."; alert top=42.328125; first question top=357.578125; Save disabled=false | shots/E-pain7-390.png | PASS |
| E04 | Pain 10 pauses | pain 10 | alert="Pause and contact your care team. You reported pain 10 out of 10. This is a rule of the app. It is not a diagnosis." | - | PASS |
| E05 | Swelling "More than before" pauses (pain 0) | pain 0, More than before | alert="Pause and contact your care team. You reported swelling: more than before. This is a rule of the app. It is not a diagnosis." | shots/E-swelling-more-390.png | PASS |
| E06 | Pause message clears when answers return to no-pause | pain 0, No swelling | alert="" | - | PASS |
| E07 | Some swelling: no pause | Some swelling | alert="" | - | PASS |
| E08 | Do not save with a pause: shows "Session not saved." and Done, nothing stored | pain 7, Do not save | status="true"; sessions stored=0 | shots/E-donotsave-pause-390.png | PASS |
| E09 | Home after a not-saved session shows no contact card | Done | contact card=false | - | PASS |
| E10 | Save with pain 7: saves the answer, shows saved note | Save | rows=1; pain=7; swelling=none; gaveWay=0 | shots/E-saved-pause-390.png | PASS |
| E11 | B1 contact card on Home after a pause (pain 7) | Home after save | card=true; text=" On 2026-11-08 you reported pain 7 out of 10. Dismiss Your exercises Heel slide 3 sets o" | shots/E-home-contact-pain-390.png | PASS |
| E12 | Dismiss hides the card | press Dismiss | card=false | - | PASS |
| E13 | Dismiss survives reload (until next event) | reload | card=false; localStorage={"mpfl.contactDismissed":"1","mpfl.persistAsked":"1","mpfl.privacySeen":"1"} | - | PASS |
| E14 | Knee gave way or hurts ends session; Summary shows care-team message | press Knee gave way or hurts | alert="Stop. Do not exercise. Contact your care team. You pressed "Knee gave way or hurts"." | shots/E-gaveway-summary-390.png | PASS |
| E15 | B1 contact card after a gave-way press; dismiss was only for the earlier event | Save, Done | card=true; text=" On 2026-11-08 you pressed "Knee gave way or hurts". Dismiss Your exercises Heel slide 3 sets of 1" | shots/E-home-contact-gaveway-390.png | PASS |
| E16 | Card reads the last session only: a later clean session hides it | save pain 1 | card=false | - | PASS |
| E17 | Console/CSP/foreign for flow E | whole flow | console=[]; pageerrors=0; csp=0; foreign=0 | - | PASS |
| E18 | Clinician painPauseThreshold 4 (fixture copy): pain 3 no pause, pain 4 pause | Summary with pain4.json | pain 3 alert=""; pain 4 alert="Pause and contact your care team. You reported pain 4 out of 10. This is a rule of the app. It is not a diagnosis." | shots/E-pain4-threshold-390.png | PASS |
| E19 | Pain question between sets and stop at the threshold (live) | needs a counted set; fake webcam shows no person, so no set completes | session screen text has pain mention=false | shots/E-session-pain4-390.png | NOT RUN |
| F01 | Progress with 0 sessions | open Progress | text=" NOT APPROVED MPFL Rehab Progress Back No sessions yet. Do a session and save it. Your charts will show here."; axe=[] | shots/F-progress-0-390.png | PASS |
| F02 | My data with 0 sessions: export buttons disabled, text "No sessions are stored yet." | open My data | export JSON disabled=true; text has no sessions=true | shots/F-data-0-390.png | PASS |
| F03 | Progress with 1 session | save 1 session via UI, open Progress | text=" NOT APPROVED MPFL Rehab Progress Back These numbers are a webcam estimate. Send the file to your care team. They decide any change to your plan. Peak knee bend, heel slide, in degrees (estimated angle, not a medical measurement) No values. 2026-11-08 Date degrees Session (UTC) Value 2026-1... | shots/F-progress-1-390.png | PASS |
| F04 | Progress with many sessions (6) | saved 6 sessions via UI | stored=6; exercises=heel-slide,straight-leg-raise,heel-slide,straight-leg-raise,heel-slide,heel-slide; text=" NOT APPROVED MPFL Rehab Progress Back These numbers are a webcam estimate. Send the file to your care team. They decide any change to your plan. Peak knee bend, heel slide, in degrees (es... | shots/F-progress-many-390.png | PASS |
| F05 | Export JSON and CSV download | press both export buttons | json file=mpfl-sessions-2026-11-08.json; csv file=mpfl-sessions-2026-11-08.csv; last export line=true | dl/export.json, dl/export.csv | PASS |
| F10 | Import: same file again (same id, same dates) | import via file input | message="Some of these sessions are already stored. Nothing was imported."; sessions before=2 after=2 | shots/F-import-same file again (same id, same dates).png | PASS |
| F11 | Import: same id, new dates merges | import via file input | message="Imported 2 sessions."; sessions before=2 after=4 | shots/F-import-same id, new dates merges.png | PASS |
| F12 | Import: different id with data is refused | import via file input | message="This file belongs to another person's record. Nothing was imported. Erase this device first if you want to load it."; sessions before=4 after=4 | shots/F-import-different id with data is refused.png | PASS |
| F13 | Import: old file without the new fields | import via file input | message="Imported 2 sessions."; sessions before=4 after=6 | shots/F-import-old file without the new fields.png | PASS |
| F14 | Import: wrong type (reps is text) | import via file input | message="The file is not valid at "sessions.0.reps": Invalid input: expected number, received string."; sessions before=6 after=6 | shots/F-import-wrong type (reps is text).png | PASS |
| F15 | Import: pain 11 out of range | import via file input | message="The file is not valid at "sessions.0.pain": Too big: expected number to be <=10."; sessions before=6 after=6 | shots/F-import-pain 11 out of range.png | PASS |
| F16 | Import: schemaVersion 2 | import via file input | message="This file has a schema version that this app does not know."; sessions before=6 after=6 | shots/F-import-schemaVersion 2.png | PASS |
| F17 | Import: extra key | import via file input | message="The file is not valid at "file": Unrecognized key: "extra"."; sessions before=6 after=6 | shots/F-import-extra key.png | PASS |
| F18 | Import: not JSON | import via file input | message="The file is not valid JSON."; sessions before=6 after=6 | shots/F-import-not JSON.png | PASS |
| F19 | Import: over 5 MB | import via file input | message="The file is larger than 5 MB."; sessions before=6 after=6 | shots/F-import-over 5 MB.png | PASS |
| F20 | Import: session with a script string in marginSource (plain text only; stays data) | import via file input | message="Imported 2 sessions."; sessions before=6 after=8 | shots/F-import-session with a script string in marginSource (plain ... | PASS |
| F21 | Import: formula-like text in marginSource (for the CSV guard) | import via file input | message="Imported 8 sessions."; sessions before=8 after=16 | shots/F-import-formula-like text in marginSource (for the CSV guard... | PASS |
| F22 | CSV formula guard on stored text field marginSource (formula values imported through JSON) | export CSV after importing 8 values | lines with a leading quote guard=7; lines where a text cell starts with = + - @ unguarded=0 | ev/F-formula-csv-lines.txt | PASS |
| F23 | Care team view: file loaded in memory only; front-view column absent when file has no value | open care team view, load file without front values | h1=Care team view; front column=false; IndexedDB unchanged=true; localStorage unchanged=true | shots/F-clinician-nofront-390.png | PASS |
| F24 | Care team view: front-view column shows when file holds a value; IndexedDB still unchanged | load file with frontChangeDeg 4.5 | front column=true; note=true; shows 4.5=true; IndexedDB unchanged=true | shots/F-clinician-front-390.png | PASS |
| F25 | Care team view: bad file shows an error and no data | load wrong-type file | alerts="Session file not opened The file is not valid at "sessions.0.reps": Invalid input: expected number, received string." | - | PASS |
| F26 | Care team file does not survive reload (memory only) | reload | h1=Home; IDB equals before=true | - | PASS |
| F27 | Erase dialog opens with focus on "Keep my data"; Keep leaves data | open dialog, press Keep | dialog open=true; focus=Keep my data; sessions after Keep=16 | shots/F-erase-dialog-390.png | PASS |
| F28 | Erase: IndexedDB tables, localStorage mpfl. keys, Cache storage, service workers all empty; Privacy shows | Erase my data | sessions=0; protocol=0; inputs=0; databases=[{"name":"mpfl-rehab","version":30}]; mpfl keys=[]; all ls keys=[]; caches=[]; service workers=0; h1=Privacy | shots/F-after-erase-390.png | PASS |
| F29 | After erase and reload the app shows Privacy | reload | h1=Privacy; ls keys=[] | - | PASS |
| F30 | Console/CSP/foreign for flow F | whole flow | console=[]; pageerrors=0; csp=0; foreign=0 | - | PASS |
| G01 | Camera denied: the app shows its text and a way out | Start camera with the permission prompt denied (no fake-ui flag, channel chromium) | alert="Camera access was blocked. Allow the camera in the browser settings for this site, then try again."; buttons=["Cancel","Try again"] | shots/G-camera-denied-390.png | PASS |
| G02 | Camera denied: Cancel returns Home | press Cancel | h1=Home | - | PASS |
| G03 | Camera NotAllowedError (settings-level block simulated by a rejecting getUserMedia) | Start camera | alert="Camera access was blocked. Allow the camera in the browser settings for this site, then try again." | shots/G-camera-notallowed-390.png | PASS |
| G04 | No camera device: the app shows its text and a way out | Start camera, no fake device flag | alert="No camera was found. Connect a camera, then try again."; buttons=["Cancel","Try again"] | shots/G-camera-none-390.png | PASS |
| G05 | Camera lost: track.stop() from the page during a session | stop all tracks via page script | before=["live"]; after 2.5 s h1=Heel slide; text=" NOT APPROVED MPFL Rehab Heel slide Mute sound Set 1 of 3 Reps in this set: 0 of 10 -- degrees Knee bend: estimated angle, not a medical measurement Your limit 90 degrees 0 reps The app has no resting angle. Stop, then start again and hold still i... | shots/G-camera-lost-stop-390.png | NOT RUN |
| G06 | Real hidden tab: window minimized by CDP while Session runs | window minimized + lifecycle frozen | visibilityState stayed "visible" in headless Chromium after a window minimize and after a second tab came to front. Tracks stayed live. Not provable here. | - | NOT RUN |
| G07 | A second tab open on the same origin loads Home with the same stored protocol | second tab goto / | h1=Home; has protocol text=true; first tab still Heel slide | - | PASS |
| G08 | Real pagehide (navigate away): tracks end | navigate to about:blank then back; my own listener was added after the app listener | track states recorded in a later pagehide listener=["ended"]; page after back h1=Home | - | PASS |
| G09 | Offline reload (app is a static page, no service worker) | context.setOffline(true), reload | result=error: page.reload: net::ERR_INTERNET_DISCONNECTED; body="n/a"; service workers=n/a | shots/G-offline-reload-390.png | NOTE |
| G10 | Back online, reload shows Home with the stored protocol | setOffline(false), reload | h1=Home | - | PASS |
| G11 | Offline after load: press My data (a lazy chunk that was not fetched yet) | offline, press My data, wait 3 s | h1=(no h1); body="" | shots/G-offline-mydata-390.png | NOTE |
| G12 | Storage quota error on Save (simulated: IDBObjectStore.add throws QuotaExceededError for sessions) | Save | alert="The session could not be saved. Try again."; still on Summary=true; Save enabled again=true | shots/G-quota-390.png | PASS |
| G13 | Whole app at w320 (320x640 CSS px) | visit 12 screens with real clicks, screenshot, scrollWidth, axe | horizontal overflow on: none; axe violations: none; console errors=0; csp=0; foreign=0 | shots/G-w320-*.png | PASS |
| G14 | Whole app at w1920 (1920x1080 CSS px) | visit 12 screens with real clicks, screenshot, scrollWidth, axe | horizontal overflow on: none; axe violations: none; console errors=0; csp=0; foreign=0 | shots/G-w1920-*.png | PASS |
| G15 | Whole app at zoom200-1280 (640x400 CSS px) | visit 12 screens with real clicks, screenshot, scrollWidth, axe | horizontal overflow on: none; axe violations: none; console errors=0; csp=0; foreign=0 | shots/G-zoom200-1280-*.png | PASS |
| G16 | Whole app at zoom200-390 (195x422 CSS px) | visit 12 screens with real clicks, screenshot, scrollWidth, axe | last step error: locator.check: Timeout 30000ms exceeded.; horizontal overflow on: home(248>195), setup-guide(256>195), setup-camera(214>195), setup-running(243>195), summary(224>195); axe violations: none; console errors=0; csp=0; foreign=0 | shots/G-zoom200-390-*.png | FAIL |
| G17 | Whole app with dark | visit 12 screens | error: none; overflow: none; axe: none; console errors=0 | shots/G-dark-*.png | PASS |
| G18 | Whole app with reduced-motion | visit 12 screens | error: none; overflow: none; axe: none; console errors=0 | shots/G-reduced-motion-*.png | PASS |
| G19 | Keyboard: Privacy Tab order and visible focus | Tab from page start | order=A:Third-party software notices (opens in a new tab) > BUTTON:I understand; every stop has outline or shadow=true; details=["solid 3px rgb(0, 97, 113)","solid 3px rgb(0, 97, 113)"] | - | PASS |
| G20 | Keyboard: Enter on I understand moves focus to the new heading | Enter | focus=H1:Load protocol file | - | PASS |
| G21 | Keyboard: Load screen reaches Create my plan by Tab | Tab | order=INPUT:protocol-file > BUTTON:Create my plan | - | PASS |
| G22 | Keyboard: first 6 questions answered with Tab, Arrow keys, Space, Enter | keyboard only | after 6 answers h1=What was the date of your surgery?; second question was "Which operation did you have?"; focused element=INPUT:surgery-date | - | PASS |
| G23 | Keyboard: erase dialog focuses Keep my data, traps Tab, Escape closes, focus returns to the Erase button | open dialog, Tab x3, Escape | opened=true; first focus=Keep my data; Tab sequence=Erase my data / Prototype. Not for patient use.EXAMPLE, NOT APPROVEDMPFL RehabMy dataBackThis file holds health data. Send it only by the secure channel of your clinic. Do not send it by normal email or chat.ExportNo sessions are stored yet.You ... | - | PASS |
| G24 | Console/CSP/foreign for the keyboard flow | - | console=[]; csp=0; foreign=0 | - | PASS |
| H01 | axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) on 37 screens at 390 x 800 and 1280 x 800, incl. Privacy, Load, 11 questions, referral, plan, confirm, up... | H1.mjs: real clicks, axe on each screen at both sizes | 0 violations on all 74 screen-size pairs; no horizontal scroll | ev/H-screens.json, shots/H-*.png | PASS |
| H02 | axe and overflow at 320 px, 1920 px, 640 px (zoom 200 percent of 1280), dark theme, reduced motion on 12 screens each | G2.mjs and G2b.mjs | 0 axe violations, no overflow in G13 to G15, G17, G18 | shots/G-w320-*.png and others | PASS |
| H03 | CSP: zero violations and zero foreign requests on every screen | securitypolicyviolation listener and request log in every run (A to H) | 0 CSP events, 0 requests outside http://127.0.0.1:4302 (12 to 20 requests per run), 0 console errors, 0 page errors | ev/H-run-summary.json | PASS |
| H04 | Response headers of vite preview | curl -I on 6 paths | CSP, Permissions-Policy camera=(self), Referrer-Policy no-referrer, X-Content-Type-Options nosniff on every path. The CSP in index.html equals public/_headers except frame-ancestors (a meta tag cannot carry it) | ev/H-headers-4302.txt | PASS |
| H05 | No eval | grep of dist chunks and src | 0 eval( and 0 new Function in the app chunks. The word eval in the MediaPipe wasm loader is in two comments. No innerHTML, dangerouslySetInnerHTML, document.write, MediaRecorder, toDataURL, toBlob or ImageCapture in src. The CSP has wasm-unsafe-eval only | (grep output in the session) | PASS |
| H06 | Verdict words in the text of every screen | 21 words (good, bad, correct, incorrect, wrong, great, perfect, pass, passed, fail, failed, mistake, safe, dangerous, score, grade, goal,... | 0 hits. The word target shows on the plan (see L2-01) | ev/H-screens.json, ev/H-screen-texts.json | PASS |
| H07 | Green or red verdict colours on status elements | computed color, background and border on all visible elements of 37 screens, hue test for green and red | No green or red status element. The pause and stop notices are dark navy. The only red-hue hit is the pale tint rgb(241, 224, 220) of the disabled primary button | ev/H-screens.json, shots/H-redflag-blocked-emergency-390.png, shots... | PASS |
| H08 | Console output on camera screens | read all console messages in the full run | 0 errors. 11 log and warning lines from MediaPipe and WebGL (GL version, Graph started, feedback manager, GPU stall on ReadPixels) | ev/H-run-summary.json | NOTE |
| H09 | Cache-Control from public/_headers (assets immutable) | curl -I /assets/index-DSJ9yYJA.js | vite preview sends Cache-Control: no-cache for assets. The _headers rules for /assets/* and /models/* are not applied by the preview server. The real host was not tested | ev/H-headers-4302.txt | NOT RUN |
| H10 | A click that is not trusted (synthetic) on Confirm is refused | not done: the test rules forbid synthetic events | - | - | NOT RUN |

## 4. Generator table

Knowledge base files used: `research/rehab-rules.md`, `research/citation-audit.md`, `docs/design-reconciliation.md`. The plans were made with real clicks. The scraped screen text is in `ev/C-<case>.json` for plans and `ev/C-<case>-case.json` for every case.

### 4.1 Plans

| Case | What the screen showed | What the knowledge base allows | Verdict |
|---|---|---|---|
| Week 0 (today), limit 60 | Phase 1. SLR 2 sets of 10 reps. Heel slide, limit 60, "Target knee bend 18 degrees" | S1 allows SLR from day 0 (OPINION). Heel slide in phase 1 only with a surgeon number (P1 disagrees, so the app waits for the number). 2 x 10 is the lowest bound of P2 rec 26 (OPINION, ages 8 to 25) | Matches, except the target number (L2-01) and the dose rule (L2-04) |
| Week 3, limit 60 | Same as week 0 | Same | Same |
| Week 6 (day 45), limit 60 | Phase 1, same exercises, review date at week 6 | Phase 1 covers weeks 0 to 6 (S1, P1, P3, OPINION) | Matches |
| Week 7, clearance No | Phase 1 stays. Clearance question asked. Same exercises | Time alone never starts phase 2 (S1, P1) | Matches |
| Week 7, clearance Yes, limit 60 | Phase 2 Strengthening. SLR 2 x 10. Heel slide, limit 60. No mini squat, no seated hold | P1 week 7 start. P1 and P2 avoid the seated hold, and no source agrees on the mini squat start (P3, N3) | Matches |
| Week 7, clearance Yes, No limit | Phase 2. SLR 2 x 10. Heel slide with no limit line | Heel slide may be added from week 6 with "no limit" (design D2) | Matches |
| Week 11 (day 80) and day 83, clearance Yes, limit 120 | Phase 2. Limit 120 shown as entered | Plan window ends at week 11 (S1 12 to 16 weeks, P3 12 weeks) | Matches |
| Week 3, No limit | Phase 1. SLR only. Heel slide missing. Text "Before week 6, the app needs the number from your surgeon to add the heel slide." | Heel slide needs a surgeon number before week 6 | Matches |
| Week 3, limit I do not know | SLR only | Same | Matches |
| Week 3, limit 28 | Heel slide, limit 28, target 18 | Schema floor is 3 margins plus 1 degree, so 28 | Matches the rule. No source gives 28 |
| Week 3, limit 27 and 0 | SLR only. Heel slide missing | Same floor | Matches the rule |
| Surgeon limit above stored (95 over 55) | Update screen holds the change and says "Ask your care team about the next stage." | A surgeon number can only lower a limit | Held, but the wording is wrong (L2-03) |
| Any week 0 to 11 plan | No mini squat and no seated hold. Both listed under "Not in your plan, and why" with "Ask your surgeon" | P1, P2 avoid the hold. P3, N3 start the squat at different times | Matches |
| Any plan: range ceiling | No ceiling from the app. Text "The app sets no knee-bend limit of its own." | P2 90 and 120 degrees are passive floors. P1 has no cap. Ceilings are OPINION only (design D1) | Matches |
| Any plan: weight bearing and brace | No default. Listed as "Ask your surgeon" | N1 found no consensus | Matches |
| Any plan: pain stop | No threshold in the plan. App floor of 7 shown as an app rule, with no source | FR12 floor is an app rule | Matches |
| Why this plan, every entry (16 plans, about 27 entries each) | Each entry has Evidence grade, Population and at least one source id. 0 entries miss one of the three | Task rule | Matches. Source "RR: Project knowledge base, 2026" is not a published source (L2-09) |
| Label on Your plan and on Home | "Generated by the app from published protocols. Not approved by a clinician." on every plan screen and on Home | FR3 | Matches |
| Stored plan | generated.on, generated.rules (W1, PH1, SLR, DOSE, HEEL, RANGE_SURGEON, ENG_TARGET, ENG_RETURN, REVIEW), approvedOn empty, authoredBy "Generated by the app from published protocols" | Design | Matches |
| Stored answers | Keys: writtenPlan, procedure, ageBand, bothKnees, firstSurgery, specialRules, surgeryDate, side, surgeonLimit. No pain, swelling, red flags or clearance | Design: these four must NOT be stored | Matches |

### 4.2 Referral cases

Every referral stored nothing. The check was a read of IndexedDB (`protocol`, `generatorInputs`, `sessions`) and of localStorage after each case. Result: 0 rows in each table. The localStorage held only `mpfl.privacySeen`.

| Case | What the screen showed |
|---|---|
| Written plan Yes or I do not know | Early referral, text "Your care team plan comes first. Ask your care team for a plan file to load.", nothing stored |
| Combined or unknown procedure | Early referral, "The app makes plans only after MPFL reconstruction with no other procedure." |
| Under 18 | Early referral, "The app makes plans only for adults." |
| Both knees | Early referral, "The app makes plans only for one knee." |
| Repeat or unknown surgery | Early referral, "The app makes plans only after a first MPFL surgery on this knee." |
| Special surgeon rules Yes or I do not know | Early referral, "Your surgeon gave rules that the app cannot use." |
| No date | The Next button stays disabled. No referral and no plan |
| Future date | The question accepts it. At the end, referral "The app needs the date of your surgery. Ask your care team." (L2-07) |
| Red flag, emergency item | Referral with "Stop. Do not exercise. Call emergency services now." |
| Red flag, care-team item | Referral with "Stop. Do not exercise. Contact your care team." |
| Pain 7 and pain 10 | Referral "Pause and contact your care team." |
| Pain 6 and pain 0 | Plan made |
| Swelling "More than before" | Referral "Pause and contact your care team." |
| Swelling "Some swelling" | Plan made |
| Week 12 (day 84) and day 200 | Referral "The app has no plan after week 11. Contact your care team for your next plan." |
| Day 83 (week 11) | Plan made, phase 2 with clearance |

### 4.3 Numbers on a generated plan, checked against the knowledge base

| Number on screen | Where it comes from | Supported |
|---|---|---|
| Weeks 0 to 11, phase 1 to week 6, phase 2 from week 7 | S1, P1, P3 (OPINION) | Yes, as protective structure |
| SLR, 2 sets of 10 reps | P2 rec 26 "2 sets of 10-15", lowest bound (OPINION, ages 8 to 25) | In `rehab-rules.md` yes. In `citation-audit.md` 4.3 and 6.1 only as a clinician-set value. See L2-04 |
| Heel slide only with a surgeon number of at least 28 degrees | Surgeon entry. 28 is the schema floor (3 margins plus 1) | The surgeon number is entered by the person. The floor has no clinical source |
| "Target knee bend 18 degrees" | ENG_TARGET, twice the 9 degree margin (F1, F3) | No clinical source. The rule text says it is not a range target. See L2-01 |
| "Return within 9 degrees" (Why this plan only) | ENG_RETURN, the camera margin | Engineering value, labelled |
| Review dates at 6 and 12 weeks | S1 (OPINION) | Yes |
| Range ceiling | None generated | Matches `citation-audit.md` V14 and design D1 |
| Mini squat and seated hold | None generated in weeks 0 to 11 | Matches P1, P2 |
| Weight bearing and brace | None generated | Matches N1 |
| Pain pause at 7 | App floor, labelled as an app rule with no source | Matches FR12 |

## 5. Issues

No HIGH issue was found. "App" means the app code, "docs" means a design document, "setup" means the test setup.

### MEDIUM

**L2-01 (app). The number "Target knee bend 18 degrees" shows as a goal.**
- Steps: Create my plan with a limit of 60 (week 3). Open Your plan or Home after Confirm.
- Expected: no goal number. The guardrails skill says "Never show a goal, pass, fail or milestone". The rule ENG_TARGET says the value "is not a range target".
- Actual: the heel slide chip reads "Target knee bend 18 degrees" on Your plan and on Home. The value is twice the camera margin and is a counting threshold. A person can read it as a range goal.
- Evidence: `shots/C-home-generated-390.png`, `ev/C-w3-lim60.json`, `ev/C-stored-protocol.json`.

**L2-02 (app). A screen chunk that cannot load blanks the whole app.**
- Steps: load Home, go offline, press My data. The chunk of My data was not fetched before.
- Expected: a message and a way back to Home.
- Actual: the page is empty. No h1, no text, no button. Only a reload helps. The cause is probably a missing error boundary around the lazy screens. The same can happen on Progress and the care team view. These were not tried.
- Evidence: `shots/G-offline-mydata-390.png`, result G11.

**L2-03 (app). Wrong text when the surgeon limit goes up.**
- Steps: with a stored plan (limit 55 or 60), open Update my plan, enter a limit of 95, press Check my plan.
- Expected: a text that says the app only lowers a limit, or that says the change needs the care team.
- Actual: the screen shows "Ask your care team about the next stage." A higher knee-bend limit is not a next stage. The change is held, which is correct.
- Evidence: `shots/C-update-raise.png`, result C11.

**L2-04 (docs and app). The start dose conflicts with the citation audit.**
- Expected: `citation-audit.md` 4.3 says the dose is "SAFE ONLY AS A CLINICIAN-SET VALUE". Section 6 condition 1 says every number is a clinician field. `design-reconciliation.md` refuses option C (a generated dose).
- Actual: every generated plan gives the SLR "2 sets of 10 reps" with no person entry. `rules.ts` says option C is a decision of the user dated 2026-11-08. The screens show the grade (OPINION), the population (ages 8 to 25) and the label "Not approved by a clinician".
- Action: the main session must record which document wins and update the other.
- Evidence: `ev/C-w7-clear-lim60.json`, `src/lib/protocolGen/rules.ts` (DOSE).

**L2-05 (app, design limit). Patient mode accepts a generated plan that carries `approvedOn`.**
- Steps: take a plan that the app made, add `"approvedOn": "2026-10-01"`, load it in the patient build.
- Expected by the user text: a generated plan without approval is refused. This case passed (D04).
- Actual: with `approvedOn` added by hand, the file loads and Home shows "Approved on 2026-10-01". The field is a claim and has no signature. Any approved file has the same limit.
- Severity is MEDIUM because the patient build is the release build. It can be LOW if the team accepts that approval is a claim.
- Evidence: result D05, `fx/generated-approved.json`.

### LOW

**L2-06 (app). Long text overflows the page.** A protocol field with a long word or link makes the page 537 px wide at 390 px. The fields are authoredBy and the surgeon fields. The text runs off the card and cannot be read without a sideways scroll. The text shows as plain text and runs nothing, which is correct. Evidence: `shots/A-xss-overflow-390.png`, result A10.

**L2-07 (app). A future surgery date is accepted until the end.** The date question lets the person continue with a date in the future. The refusal "The app needs the date of your surgery. Ask your care team." comes only after Make my plan. Evidence: `ev/C-ref-futuredate-case.json`.

**L2-08 (app). Duplicate lines in "Values in your plan".** A phase 2 plan shows lines such as "Straight leg raise, sets: 2" twice. The person cannot tell phase 1 from phase 2. Evidence: `ev/C-w7-clear-lim60.json`.

**L2-09 (app and docs). An internal source shows as a published source.** Six "Not in your plan" entries list the source "RR: Project knowledge base, 2026". This is the project file and not a published source. Evidence: `ev/C-w7-clear-lim60.json`.

**L2-10 (app). The Android Back button leaves the app.** The app has no history entry for its screens. Back on the red flag screen goes to `about:blank` in this test, so the person loses the Setup state. No gate is bypassed (B12, B16). Evidence: result B12.

**L2-11 (app). Below 320 px the layout fails.** At 195 x 422 CSS px (200 percent zoom on a 390 px phone) five screens scroll sideways. The pain scale buttons overlap. The WCAG reflow limit is 320 px, and 320 px passed (G13). Evidence: `shots/G-zoom200-390-FAILED.png`, result G16.

### Not an issue, recorded

- A fresh red flag check after Back to Home starts clean (B11). The block lasts only for that visit. This matches TASKS.md ("fresh visit continues").
- An offline reload shows the browser error page (G09). The app is a static page with no service worker.
- `vite preview` does not apply the Cache-Control rules of `public/_headers` (H09).
- MediaPipe writes 11 log and warning lines to the console (H08). They are not errors.

## 6. What was good

- Every one of the 9 red flag items blocked with the right text and stayed blocked after untick. Emergency text won over care-team text.
- No direct URL, reload, history step or Cancel reached Setup or Session without a new check.
- The pause rule worked at pain 7, pain 10 and swelling "More than before". The message sits above the questions. The contact card shows after a pause and after a gave-way press, and Dismiss hides it until the next event.
- A clinician threshold of 4 lowered the pause point as designed (E18).
- Import refused the file of another person with the exact text and wrote nothing. Every bad import named the field.
- The CSV guard prefixed all seven formula starters (`=`, `+`, `-`, `@`, tab, carriage return and the wide equals sign).
- Erase left no data in tables, localStorage `mpfl.` keys, Cache storage or service workers, and the next load showed Privacy.
- The care team file stayed in memory. IndexedDB and localStorage did not change.
- Keyboard use worked from Privacy to the questions. Focus was visible (3 px outline). Escape closed the erase dialog and focus returned to the Erase button.
- Dark theme, reduced motion, 320 px and 1920 px showed no axe violation and no sideways scroll.
- The screens use dark navy for stop and pause notices. They use no green or red verdict colour.

## 7. What was not tested

- Any rep count, peak angle, hold, set end or the pain question between sets (E19). The fake webcam shows no person. Live test 1 covers this.
- A real camera loss (G05) and a real hidden tab (G06). Headless Chromium never reports "hidden" and a page script `stop()` fires no `ended` event. The pagehide case was tested with a real navigation (G08).
- A click that is not trusted on Confirm (H10). The test rules forbid synthetic events.
- The headers of the real host (H09), WebKit and a real phone.
- Browser zoom itself. The zoom cases use the equivalent CSS pixel widths.
- The second camera pairing.
- The numbers in the review summary of the care team view. The screen was loaded and scanned, but its numbers were not checked.

## 8. Accessibility and security results

| Check | Result |
|---|---|
| axe wcag2a, wcag2aa, wcag21aa, wcag22aa, 37 screens at 390 and 1280 | 0 violations (H01) |
| axe at 320, 640, 1920, dark theme, reduced motion | 0 violations (G13 to G15, G17, G18) |
| Sideways scroll | None at 390, 1280, 320, 640, 1920 |
| CSP violations | 0 in every run |
| Requests to another origin | 0 in every run (12 to 20 requests per run, all on 127.0.0.1) |
| Console errors and page errors | 0 |
| Headers of the preview | CSP, Permissions-Policy, Referrer-Policy and nosniff on every path (H04) |
| eval and dynamic code | None in the app (H05) |
| Verdict words on 37 screens | 0 hits (H06) |
| Green or red verdict colour | None (H07) |
| Script, image and link strings in protocol text | Shown as text. No script ran. No link was made (A06) |
| Camera tracks | Ended on Stop, on gave-way and on pagehide. Hidden tab not proven (G06) |
