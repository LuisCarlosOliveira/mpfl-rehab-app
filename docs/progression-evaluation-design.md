# Progression evaluation: design

Date: 2026-11-13. Status: design only. No source file changed. Master 863a37c.

Marks: R = read in a file (path in brackets). UNVERIFIED = not read, or not checked. Source ids (S1, P1, P2, P3) and audit rows (V3 and more) are the ids of `research/citation-audit.md` and `app/src/lib/protocolGen/sources.ts`.

Skills used: `simple-english`, `mpfl-clinical-guardrails` (read as a file).

## 1. Short answer

- The user asks for an evaluation of progress. It uses the sessions and the weeks since surgery. It then proposes a plan update. The app must not start new in each run.
- The app already saves the sessions, the plan and the answers in IndexedDB. R: `app/src/lib/storage/db.ts` (tables `sessions`, `protocol`, `generatorInputs`).
- Why the user sees a fresh start is UNVERIFIED. Possible causes: a private window, a new origin or port, or "Erase". Step 6 adds a reload test.
- The app already proposes a plan from the date of today and the stored answers. R: `app/src/ui/UpdatePlan.tsx`. It is a screen that the person must open.
- Missing today: a screen that shows the measured numbers next to the guideline, and a prompt on Home. The new screen is "Check my progress".
- The evaluation is a pure function. It never saves and never sets the phase. The save path stays `acceptProposal` after a click on Confirm. R: `app/src/lib/protocol/accept.ts`.
- Result of the evidence check: few published criteria can be measured by the camera app. Section 4 lists them. The app shows numbers. It gives no pass, fail or score.
- The flag `VITE_SELF_PROGRESSION` turns on by default. The confirm step stays. A safety event still holds every forward move. Section 6 has the detail.

## 2. Inputs

### 2.1 Stored data that feeds the evaluation

| Data | Where | Mark |
|---|---|---|
| Session date (UTC ISO text) | `sessionSchema.date` in `storage/db.ts` | R |
| Reps, sets prescribed, reps prescribed, reps per set | `reps`, `setsPrescribed`, `repsPrescribed`, `repsPerSet` | R |
| Peak knee bend, top angle, hold seconds, exercise, view | `peakFlexion`, `topFlexion`, `holdSeconds`, `exercise`, `view` | R |
| Camera margin of the session | `marginDeg`, `marginSource` | R |
| Pain and swelling at the end, pain after each set | `pain`, `swelling`, `setPain` | R |
| Safety events | `gaveWayPresses`, `redFlagBlocks`, `nearLimit`, `overLimit` | R |
| Plan date, plan phase, session phase | `protocol.generated.on`, `protocol.activePhase`, `sessionSchema.phase`, `protocolId` | R |
| Date of surgery | `generatorInputs.inputs.surgeryDate` (`StoredInputs`) | R |
| Weeks since surgery | `weeksSince` in `lib/planView.ts` | R |
| Pain pause value | `protocol.painPauseThreshold`, or the floor of 7 (`PAIN_FLOOR` in `lib/safety.ts`) | R |
| Safety events since the plan date | `eventsSince`, `gaveWaySince` in `lib/planView.ts` | R |
| Margin rule, three states | `classifyAgainstLimit` in `lib/margin.ts`, `STATE` in `lib/reviewSummary.ts` | R |

### 2.2 What is missing from storage

- No missing field blocks the evaluation. The design adds no table (YAGNI).
- The plan date is `generated.on`. The app keeps no log of earlier plans. "Since your plan date" is the only window. A change log is not needed now.
- The answers for clearance, walking and leg raise are not stored. This is by design. `Update my plan` asks them again. R: comment above `storedInputsSchema` in `storage/db.ts`.
- `eventsSince` compares the UTC day of a session with a local date. A session near midnight can fall on the wrong day. R: `lib/planView.ts`. The new code must use one rule. Step 1 pins it with a test.
- No stored count of planned sessions. No source gives a session frequency (rule `NONE_FREQ` in `protocolGen/rules.ts`). The app computes no adherence rate.
- Walking pain is not asked. Only pain after a session is stored. Section 4 shows why this matters.
- The app stores no frame and no video. Nothing in this design changes that.

## 3. Time progression

The app reuses the generator rules. It adds no number. R: `app/src/lib/protocolGen/rules.ts`.

| Window | Rule id | Source and quote | Audit row | Note |
|---|---|---|---|---|
| Phase 1: weeks 0 to 6 | `PH1` | S1 Table 1 "0 to 6 weeks". P3 "Immediate post-op to 2 weeks" | V3, V4 EXACT | The app keeps one phase. P3 splits at week 2 |
| Phase 2: from week 7 | `PH2` | S1 Table 1 "6-12 weeks". P3 "2 weeks to 12 weeks approximately" | V3, V4 EXACT | Week 7 has no number in the guideline. It is the own boundary of the app (`appOwn`) |
| Start of phase 2 | `PH2` | S1 "progress through phases based on meeting clinical criteria" (`research/rehab-rules.md` section 1) | Row not named in `rules.ts`. UNVERIFIED | Time alone never starts phase 2. The person must report the clearance |
| End of the plan: week 11 | `W1`, `R10` | S1 "12-16 weeks". P3 "12 weeks to discharge" | V3, V4 EXACT | After week 11 the app makes no plan. Home shows `NO_PLAN_AFTER_WEEK` |
| Review dates: week 6 and week 12 | `REVIEW` | Derived from the windows above | V3, V4 EXACT | Home shows a card on the date. R: `ui/Home.tsx` |
| Check of knee bend at week 4 | `ROM_CHECK` | P1 "Contact surgeon if ROM not trending towards 90° by 4 weeks" | V12 EXACT | A text line. The app does not measure it |
| Knee bend by week | `RANGE_NONE` | S1 "Typically, patients start 0°-30° ... progress by 20°- 30° per week" | V10 EXACT | No number in the guideline. S1 describes practice. It is no limit |

- P2 gives "≥ 90°" at 4 weeks and "≥ 120º" at 6 weeks (V11 EXACT). These are passive range values. The app never compares them with an active camera angle. R: guardrails skill, section Behavior.
- Time rule of the evaluation: the week sets which text shows. It does not set a phase. The generator sets a phase only after an answer and a Confirm.
- R: the generator already uses the week. `generate.ts` sets `phase2` only when `week >= 7` and `phaseClearance === 'yes'`.

## 4. Execution progression

Types: M = measured by the app. S = reported by the person. N = the app cannot measure it.

| # | Published criterion | Source, audit row | Type | What the screen shows |
|---|---|---|---|---|
| E1 | Knee flexion greater than 110° (end of phase 1) | S1, V100 EXACT | M, with limits | Peak of the heel slide, last session, with the camera margin and the three states. S1 does not say passive or active. UNVERIFIED. The row says so. If the surgeon limit is below 110, the row says the limit is lower |
| E2 | Full knee extension | S1, V19 EXACT | N | "The app cannot measure this." The error of the camera is larger than a small deficit (`research/progression.md` section 2.1) |
| E3 | Straight leg raise without extension lag | S1, V100 and V39 EXACT | S | The answer in Update my plan (`legRaiseStraight`). The camera error is about 9 degrees. P2 gives 10 degrees (V39). The app cannot read a lag |
| E4 | Walking without crutches | S1, V101 EXACT | S | The answer in Update my plan (`walksWithoutCrutches`) |
| E5 | Pain: "minimal swelling, resolution of pain" | P3 (`research/rehab-rules.md` section 1). Audit row UNVERIFIED | S | The pain numbers after each session since the plan date. No number in the guideline for pain after a session |
| E6 | Pain 2 or less out of 10 | P2 Table 2, V52 EXACT | S, context differs | P2 means pain during walking. P2 is a phase goal for ages 8 to 25. The app asks pain after a session. The row shows the P2 words and the difference. It compares no number |
| E7 | Effusion "Minimal to none" | P2 Table 2, rehab-rules section 4. Audit row UNVERIFIED | S | Swelling answers since the plan date: counts of none, some and more than before. P2 means a clinician grade. The app asks the person |
| E8 | No new safety event | P2 rec 4, V55 EXACT. Pause value: app rule FR12 | M | Count of events since the plan date, by type. See section 5 |
| E9 | Dose: 2 sets of 10-15 | P2 rec 26, V49 EXACT | M, as information | Reps and sets of the last session next to the plan dose. P2 gives a dose and no rule to move on. No number in the guideline for a minimum |
| E10 | Hold time | P2 "10 seconds", V39 | N | No number in the guideline. The 10 seconds of P2 is a test of the leg raise, not a dose (`NONE_HOLDTIME`) |
| E11 | Range reached against the surgeon limit | Surgeon number, as entered | M | Peak against `maxFlexion`, with the margin and the three states. `classifyAgainstLimit` |
| E12 | Phase 2 exit: full ROM, quadriceps strength, gait | S1 (`research/rehab-rules.md` section 5). Audit row UNVERIFIED | N | The plan ends at week 11. The app shows these as "check with your care team". It does not store the answer |

Rules for every row:
- Show the measured number, then the criterion words, then the source id. Show no pass, fail, score, total or count such as "3 of 5".
- Use the three states of `STATE` only for a row with a limit (E1, E11). Never use "met", "reached" or a colour.
- No window size (for example "last 5 sessions") and no minimum session count. No source gives one. The window is "since your plan date". The row shows "n sessions".
- With no data the row reads "Not enough data" (`STATE.notEnough`).
- Next to every angle: "estimated angle, not a medical measurement".

What the evaluation changes in the proposal: nothing new. The generator still reads time, the answers E3 and E4, the clearance report, and the gave-way press (`kneeGaveWay`). Measured angles and reps are shown. They do not set a phase. Reason: no source gives a rule that links a camera number to a phase change (E1 and E11 only compare with a limit). The app never invents one.

## 5. Output

### 5.1 Flow

Home row or card "Check my progress" → screen "Check my progress" (read only) → "Update my plan" (exists) → "Confirm" screen (exists). Nothing saves before Confirm.

### 5.2 Home

Shows when a plan made by the app is stored and the week is 0 to 11. The row is quiet. It becomes a `Notice` card when a window opened: week 7 or later with phase 1 active, or the review date passed.

- Title: `Check my progress`
- Text: `You are in week 8 after your surgery. The app compares your sessions with published guidelines. The app changes nothing.`
- Button: `Check my progress`

The text "You are in week N" shows the real week. After week 11 the card shows `NO_PLAN_AFTER_WEEK` and no button. R: `ui/Home.tsx`.

### 5.3 Screen texts

- Heading: `Check my progress`
- Lede: `This page shows your numbers next to published guidelines. The app changes nothing until you press Confirm on a plan.`
- Line under the lede: `Not approved by a clinician.`
- Section "Time": `You are in week 8 after your surgery. Phase 1 covers weeks 0 to 6 (S1, P3). Phase 2 starts from week 7. Week 7 is the own boundary of the app. You must report that your care team said you can start phase 2.`
- Type labels: `Measured by the app`, `Reported by you`, `The app cannot measure this`.
- Row E1: `Knee bend, heel slide, last session: 84 degrees (estimated angle, not a medical measurement). Camera error: plus or minus 9 degrees. S1 lists knee flexion greater than 110 degrees. Cannot tell, the difference is smaller than the camera error.`
- Row E5: `Pain after each session since your plan date: 2, 3, 2 (0 to 10). No number in the guideline for pain after a session.`
- Row E7: `Swelling since your plan date: none 3 times, some 1 time, more than before 0 times.`
- Row E9: `Reps, straight leg raise, last session: 2 sets of 8. Your plan: 2 sets of 10. No number in the guideline for a minimum.`
- Row E2: `Full knee extension (S1): The app cannot measure this. Ask your care team.`
- Row E10: `Hold time: No number in the guideline.`
- Bottom: button `Update my plan`, button `Back to Home`, line `The app checks your plan again from today's date and your answers. You confirm the change or keep your plan.`
- Every plan screen keeps the prototype banner, and the generated plan banner `Generated by the app from published protocols. Not approved by a clinician.` R: `lib/mode.ts`.

### 5.4 Safety event or pain above the pause value

- Safety events: a red-flag block, a "Knee gave way or hurts" press, pain at or above the pause value, swelling "more than before". R: `lib/contactCard.ts`, `eventsSince`.
- The existing card `Contact your care team` stays first on Home. R: `CONTACT_TITLE`.
- The Check my progress card shows `HOLD_EVENT`: `Contact your care team before the next stage. The app recorded a safety event after the date of your plan.` R: `ui/UpdatePlan.tsx`.
- The screen lists each event with its date first, then the rows. It shows no "Update" prompt for a forward move.
- `Update my plan` stays open for a lower limit. `UpdatePlan` holds every forward move while an event exists since the plan date.
- A pain answer at or above the pause value gives `Pause and contact your care team.` (`PAUSE_MESSAGE`). The generator returns referral `R9` and no plan.

## 6. The flag VITE_SELF_PROGRESSION

R today: `selfProgressionOn()` in `lib/protocol/accept.ts` is true only for the text "true". Without it, `acceptProposal` refuses a forward move with `progression-off`, and `UpdatePlan` shows `HOLD_NEXT_STAGE`.

Decision (user rule: no human-decision blockers, the standards decide): turn it on by default. Only the exact text "false" or "0" turns it off. Same pattern as `generatorExtendedOn` in `lib/mode.ts`. The person-confirm step stays.

What stays the same:
- Only `acceptProposal` saves. It needs a `PersonConfirmation` that only a trusted click creates. R: `accept.ts`, `trustedClick.ts`.
- The phase changes only after the person answers the clearance question and presses Confirm.
- A safety event since the plan date holds every forward move (`HOLD_EVENT`).
- The patient-mode build still refuses a generated plan. The prototype banner stays. R: `lib/mode.ts`. UNVERIFIED: the full list of what patient mode refuses.

Consequences:
1. A forward move can save after Confirm: phase 2, a higher or removed knee limit, a new mini squat or seated hold. The surgeon number can only lower a ceiling. R: `generate.ts`.
2. A stored clinician pain limit must not disappear. A generated plan has no `painPauseThreshold`, so `raisesKneeLimit` is true. The hold `HOLD_PAIN_LIMIT` must stay on whatever the flag says. This is a rule for stored clinician numbers, not a decision blocker. Test it.
3. Tests that assume the flag is off must change: `app/tests/ui/updatePlanV2.test.tsx`, `app/tests/ui/confirmPlan.test.tsx`, `app/tests/protocolAccept.test.ts`, and `app/e2e/generator.spec.ts` (the test at line 225).
4. Texts change: plan FR31 says "off by default". The plan section 11 item 3 recommends off. The user must approve the edit of these two lines and of the guardrails skill. R: `MPFL_APP_PLAN.md`.
5. The regulatory class is not settled. A patient-facing proposal is a device function in the FDA view (`research/progression.md` section 2.4). Expert review is UNVERIFIED. The prototype banner stays until then.

The one test that proves the phase never changes without Confirm: an e2e test in `app/e2e/progress.spec.ts`, with the flag at its default.
1. Store a phase 1 plan and a surgery date. Move the clock to week 8 with `page.clock.setFixedTime`. Reload.
2. Open Check my progress, then Update my plan. Answer clearance yes. Press "Check my plan".
3. Read the stored plan bytes. `activePhase` is still 1.
4. Press "Keep my current plan". The bytes are identical.
5. Repeat and press Confirm. Only now `activePhase` is 2.

Support tests: `acceptProposal` without a trusted click returns `no-confirmation` and the store stays equal. An import-graph test shows that the new module imports no save function. R: `tests/importGraph.test.ts` exists.

## 7. Build plan

Order: steps 1 and 5 start together. Steps 2, 3 and 4 follow step 1. Step 6 follows 1 to 5. Step 7 can run at any time.

| Step | Files | Test that must fail first | Parallel |
|---|---|---|---|
| 1. Pure evaluation | new `app/src/lib/progressCheck.ts` | `app/tests/progressCheck.test.ts`: week 6 and week 7 text. Three states at limit minus margin, at the limit and at limit plus margin. Row types M, S, N. "Not enough data" with no session. Events listed first. No total and no "n of N". A UTC midnight session lands on one rule. Texts hold no banned word (`claims-check.sh`) | Starts with 5 |
| 2. Texts | in `progressCheck.ts`, one place for each sentence | `allProgressTexts()` goes through the banned-word check and `ste-check` | After 1, with 3 and 4 |
| 3. Screen | new `app/src/ui/CheckProgress.tsx`, `screensV2.css` | `app/tests/ui/checkProgress.test.tsx`: rows show type labels, the banner, no verdict class, and the hold text with an event. The page saves nothing (spy on `db.protocol.put`) | After 1 |
| 4. Home and route | `app/src/ui/Home.tsx`, `app/src/ui/App.tsx`, `app/src/ui/appState.ts` | `app/tests/ui/home.test.tsx`: the row shows with a generated plan, is a card in week 8, and is gone after week 11 | After 1 |
| 5. Flag default | `app/src/lib/protocol/accept.ts`, `app/src/lib/planView.ts`, `app/src/ui/ConfirmPlan.tsx`, `app/src/ui/UpdatePlan.tsx` | `protocolAccept.test.ts`: with no env value, a forward move saves after a trusted click. With "false" it is refused. A lost pain limit is refused with the flag on. An event holds it | Starts with 1 |
| 6. End to end | new `app/e2e/progress.spec.ts` | The test of section 6. A second test: save a session, reload, the screen shows it (checks the "starts new" report) | After 1 to 5 |
| 7. Documents | `MPFL_APP_PLAN.md` (FR31 text, new FR for the screen), guardrails skill (one line) | `plan-skills-check.sh` | Any time. Needs approval of the user |

Gates before each commit: `npm run precheck` in `app`. It includes `claims-check.sh`, `phase-check.sh` and the unit tests. The new module reads `protocol.activePhase` only as a property. The text `activePhase` in quotes outside `src/lib/protocol/` fails `phase-check.sh`. R: `app/scripts/phase-check.sh` header.

## 8. Not verified

- Why the user sees a fresh start in each run.
- Whether S1 means active or passive flexion in "knee flexion greater than 110°".
- Audit rows for P3 criteria words, P2 effusion, and the S1 criteria of phase 2.
- Class of the app under EU MDR and FDA after this change.
- Changes of `ui-redesign` after master 863a37c. `MPFL_APP_PLAN.md` says the generator no longer puts a dose, a squat depth or a hold arc in a plan. `rules.ts` on master still has them. This design uses no such number.
