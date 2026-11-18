# UI redesign v3: one session, one screen at a time

Status: design only. No source file changed. Date: 2026-11-18. Base: master 44808b5.

Skills used: simple-english, web-design-guidelines, break-ui, animate, animation-performance, vercel-composition-patterns, dataviz (validator only), modern-web-guidance, emil-design-eng, apple-design. Sections 7 and 8 give the detail.

Review of 2026-11-18: sections 7 and 8 hold the review and the motion spec. The mockups and the light primary colour changed after it.

## 0. Evidence and limits

- The evidence is one real session of one person: 191 screenshots in `/mnt/c/Users/luis.oliveira/AppData/Local/Temp/mpfl-mon/run1/shots/` and the screen timeline.
- I read 28 screenshots. They cover Privacy, Load protocol, questions 1, 3, 7, 9, 10 and 11, and Check your answers. They also cover Your plan, Confirm and Home. The rest are the red-flag check, both camera set-up steps, Get ready, the live screens, the timer, Summary and Check my progress.
- The window was about 1910 px wide. The user also said that the UI and the UX are bad.
- There was no user study. No patient used the mockups. The mockups use a drawn skeleton, not a real camera frame.
- I did not test the numbers in section 2 on a phone on a floor mat. The 2 m reading distance is an assumption.

## 1. Critique

Severity: 3 = blocks or slows every session, 2 = hurts often, 1 = small.

### 1.1 Findings

| # | Heuristic | Finding (shot) | Sev | Fix idea |
|---|---|---|---|---|
| F1 | Aesthetic and minimal design | Every page is a column of 800 px at the left. Two thirds of the window are empty (`112217-012`, `112224-014`, `112328-027`). | 3 | AppShell with a centered max width of 1200 px. Two columns on wide windows. |
| F2 | Consistency | Set up the camera uses the full 1800 px width, with Cancel at the far edge. The other pages use 800 px (`112340-029`). | 2 | One shell for all screens. |
| F3 | Match with real world | On the timer screen the exercise name sits below the Stop buttons (`112649-052`, `112739-057`, `113636-114`). | 3 | ExerciseHeader on top of every live screen. |
| F4 | Visibility of status | Nothing shows the place in today's plan on Home or on the live screens (`112328-027`, `113740-123`). | 3 | SessionProgress and PlanList. |
| F5 | Efficiency | The red-flag check is a wall of nine sentences before every exercise (`112338-028`). | 3 | One check for each session. Keep the text. |
| F6 | Efficiency | Each exercise needs 5 to 6 screens: Home, red flags, guide, camera, live, Summary (timeline). | 3 | GetReadyCard once for each session. DoneCard with auto-advance. |
| F7 | Recognition | Leg and camera side are asked again for each exercise (`112340-029`). | 2 | Remember the choice. Ask once. |
| F8 | Aesthetic | Left and Right are two huge blocks. One block is dark and one is white. The selected one is not clear (`112340-029`). | 2 | Segmented control with a filled selected part and a check. |
| F9 | Flexibility | 11 questions use 11 screens with a heading of 58 px (`112302-021`, `112224-014`). | 3 | 3 groups. Heading 36 px. |
| F10 | Efficiency | A question with 2 choices needs a tap and a Next press (`112224-014`). | 2 | Segmented control. A group has one Continue. |
| F11 | Visibility | Check my progress is a wall of text. Phase text comes before any number (`114610-180`, `114650-184`). | 3 | Week, last sessions and what the app can check first. Fold the rest. |
| F12 | Error prevention | Back and Next of the guide are cut by the bottom bar (`112621-049`). | 2 | One sticky bar. No second row of buttons below it. |
| F13 | Aesthetic | Home shows a protocol table (operated side, written by, approval) above the plan (`112328-027`). | 2 | Move the table under "More". Keep the banner. |
| F14 | Visibility | The angle note "estimated angle, not a medical measurement" is cut behind the button panel (`112448-037`). | 2 | Put the note inside the number card. |
| F15 | Match | The angle shows two white bars as a placeholder for "no value" (`113740-123`, `114113-147`). | 1 | Show "--" in muted ink and the cause: "Ankle not seen". |
| F16 | Help | A person in the frame who is not the patient, or a face close to the lens, gets no hint (`114113-147`). | 1 | One line under the camera. It names what the app misses. |
| F17 | Efficiency | The Summary asks pain and swelling, then Save, or Skip. Save is grey until a choice (`112604-045`). | 2 | DoneCard: pain and swelling on the same card. One Save button. |
| F18 | Consistency | The live camera page has no brand bar. The timer page has none either, but its title is far down. | 1 | Live screens hide the tab bar. Keep the banner. |
| F19 | Visibility | The camera is 865 px wide in a 1190 px frame. Black bars fill the frame (`112448-037`). | 2 | Camera card with the 4:3 ratio. The card fills its column. |
| F20 | Recognition | The plan screen shows doses in text. No picture (`112319-025`). | 1 | Same PlanList as Home. |

Guidelines check: the old screens keep a visible focus ring, large touch targets and a dark theme. The 58 px headings and the 800 px column fail the aim to use the space. The Web Interface Guidelines were fetched later. Section 7 holds that review.

### 1.2 Click and screen count

Counted from the timeline and the screenshots. A click is one press on a button, a tick or a choice.

| Task | Screens now | Clicks now | Screens v3 | Clicks v3 |
|---|---|---|---|---|
| First run to first live exercise | 21 | about 31 | 10 | about 19 |
| One camera exercise, Home to Home | 6 | 6 to 8 | 1 (Done card) | 0 to 2 |
| One timer exercise, 2 sets of 10 holds | 6 | 6 to 8 plus 40 | 1 (Done card) | 0 to 2 plus 40 |
| Today's 6 exercises (4 camera, 2 timer) | about 36 | 48 to 64 plus 80 | 8 | 4 to 16 plus 80 |

How I counted the first run now: Privacy 1, Create my plan 1, then 11 questions with 2 clicks each (22). Then Make my plan, Use this plan, Confirm, Start, Continue, Next and Start exercise, 1 click each. I did not count the typing of the date.

How I counted v3: Privacy 1, Create my plan 1, 11 answers, 3 Continue, Confirm 1, Start 1, Start 1 on Get ready. The "Your plan" and "Confirm" pages merge. The merged page keeps the Confirm button.

The hold timers stay the main cost. The plan sets no hold time, so the app cannot end a hold alone. Each hold needs Start hold and End hold. v3 puts both on one big button in a fixed place. It does not reduce the number of clicks. A hold time from a clinician field can reduce them later.

## 2. Principles

1. One primary action on each screen. It is the biggest block and it sits in a fixed place.
2. Glanceable numbers. The live numbers are 96 to 144 px high. They stay readable at 2 m.
3. Use the width. At 1440 px the live screen has the camera on the left (60 percent) and the numbers on the right. A phone uses one column.
4. Show the plan as a list. The list shows the place, a check mark for finished work and the word "Next".
5. Fewer screens. One Get ready card for each session. One Done card for each exercise.
6. The same order on every live screen: name, camera or timer, controls, numbers.
7. The safety controls never hide. Stop and "Knee gave way or hurts" stay in view at every size.
8. A mat is not a desk. Touch targets are at least 56 px on the live screens.

### 2.1 Patterns that I use

I use patterns that many fitness and physio apps share. I copy no brand asset and no brand colour.

- Session overview list: a vertical list of the exercises with a position mark.
- Big start button: one wide button at the thumb, as in workout apps.
- Rest card: a card between exercises with a count-down and "Go now". Here it is the "Next: name" card of 5 s.
- Camera coach view: the camera is the hero. A skeleton overlay sits on top. One number is large.
- Bottom sheet: on a phone the controls sit in a sticky bottom bar.
- Segmented control for two or three choices. A radio list for four or more.

### 2.2 Tokens

The colours reuse the tokens of `styles.css`. I measured the contrast with the WCAG formula.

| Name | Dark | Light | Use |
|---|---|---|---|
| page | #0e151b | #eceff0 | page |
| card | #1c2731 | #ffffff | card |
| ink | #eaf0f3 | #101c26 | text |
| muted | #a9b6bf | #42505c | note text |
| primary | #4db6e6 | #076a96 | main action, position mark, rep number |
| care | #c3c8f2 | #2e3260 | red-flag headings, pause, notices, banner |

Contrast, text on page, then on card:

| Pair | Dark | Light |
|---|---|---|
| ink | 16.0 and 13.2 | 14.9 and 17.3 |
| muted | 8.9 and 7.3 | 7.2 and 8.3 |
| primary as text | 8.0 and 6.6 | 5.2 and 6.0 |
| text on a primary button | 8.1 | 6.0 |
| care as text | 11.3 and 9.3 | 10.4 and 12.1 |
| control edge | 4.3 and 3.6 | 3.7 and 4.2 |

All text pairs are at least 4.5, including the sunken surface (section 7.2). The control edge is at least 3.0 as the guideline needs for a control. There is no green and no red. The primary colour is blue. The care colour is a violet that the app already uses. Rep numbers use the primary colour. An in-range rep shows nothing and plays no sound. A cue stays a plain sentence that names a measured value against a limit.

Type: Figtree, the font that the app already ships. Scale 14, 16, 18, 20, 36, 44 and 96 to 144 px for live numbers. Large type uses a tracking of -0.02 to -0.04 em. Body text uses 0. Weights: 400, 600, 700 and 800 for numbers.

Spacing: 4, 8, 12, 16, 24, 32, 48 and 64 px. Radius: 12 px for controls, 16 px for the camera, 20 px for cards, full for chips and bars.

Motion: see section 8.

## 3. Mockups

Static HTML and PNG, in `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uxv3/`. The PNG files are in the `png` folder. The name pattern is `<screen>-<size>-<theme>.png`. The sizes are 1440x900 and 390x844. The themes are dark and light. The CSS is `v3.css`.

| File | Screen | What it shows |
|---|---|---|
| `01-home` | Home | Today's session. Next exercise card with the Start button. Plan list with 6 rows. Progress bar. Week and phase. |
| `02-get-ready` | Get ready | Leg, camera side, 4-step drawing strip and the red-flag check in one page. |
| `03-live-camera` | Live with camera | Camera hero. Big angle and rep numbers. Stop and "Knee gave way or hurts". |
| `04-live-timer` | Live timer | Name on top. A ring with the seconds. One big End hold button. |
| `05-done` | Done | Reps, angle, pain, swelling. One Save button with "Next: name". |
| `05b-next-card` | Next card | 5 s count-down, drawing strip and the plan list. |
| `06-progress` | Check my progress | Week, last sessions, what the app can check, folded guidelines. |
| `07-onboarding-1`, `08-onboarding-3` | Questions | Group 1 and group 3 of 3. |

I made group 2 (surgeon rules, limit, date of surgery and care team plan) the same way. It has no separate mockup.

Notes on the mockups:
- The banner "Prototype. Not for patient use." is on every screen. The line "Not approved by a clinician" is in the banner and in the progress page.
- The red-flag text is the exact text of `src/lib/redflags.ts`. The two group headings are kept. All 9 sentences are visible in the mockup.
- The mockup of Get ready shows the check open. In the product, the list can fold only when no box is ticked and the same day already has a clear answer. See D5.
- The Done card shows "Straight leg raise finished". The word list of `claims-check.sh` does not hold "finished". Run the script on the build to confirm. If it fails, use "Straight leg raise saved".
- The camera area is a drawn placeholder. A chip on it says "Drawn placeholder, not a camera image".
- The gluteal and quadriceps sets show a neutral lying figure. They do not show a leg raise.
- The progress page shows week 2 for a surgery date of 2026-10-29 and today 2026-11-18.
- The ring on the timer screen shows one minute. It has no target, because the plan sets no hold time.
- The live screens hide the tab bar. The banner stays.
- I did not draw the error states, the pairing screens, My data and the clinician view.

## 4. Key decisions

1. D1: A centered shell of 1200 px, with two columns from 900 px. One column below.
2. D2: Live screens use the order: name, camera or timer, controls, numbers.
3. D3: The plan is a visible list with a position mark on Home, on the Next card and on the live header.
4. D4: One Get ready card for each session. It joins leg, camera side, guide strip and the red-flag check.
5. D5: The red-flag check is asked once for each day and session. Its text is exact. A ticked box blocks the session as now. A new session on a new day shows it open.
6. D6: A Done card replaces the Summary. It holds pain, swelling and one Save button.
7. D7: Save starts a 5 s "Next: name" card. The next exercise starts only after Start. A person can stop the count-down.
8. D8: 11 questions become 3 groups: you and your surgery, your surgeon, how you are today.
9. D9: "Your plan" and "Confirm your plan" become one page. The phase never changes without the Confirm press.
10. D10: Check my progress shows numbers first. Guidelines that the app cannot measure are folded.

## 5. Build plan

### 5.1 What the two running agents cover

| Topic | (a) `feat-session-flow` in `sflow-wt` | (b) `fix-surgery-date` in `datefix-wt` | v3 visual layer |
|---|---|---|---|
| Scope | Logic of today's session: auto-advance, one red-flag check, remembered leg and side, progress bar | Surgery date capture and the rebuild of `ui/CheckProgress.tsx` | Layout, type, colour, components |
| Files | `sessionPlan.ts`, `PlanSession.tsx`, `PlanProgress.tsx`, `App.tsx`, `Home.tsx`, `Session.tsx`, `Setup.tsx`, `Summary.tsx`, `appState.ts` | `CheckProgress.tsx`, `Onboarding.tsx`, `answerControls.tsx`, `UpdatePlan.tsx`, `planView.ts`, `progressCheck.ts` | `Shell.tsx`, new components, CSS |
| Output | State and events | Data and text of the progress page | Markup and CSS around them |

A third branch, `fix-plan-text` in `plantext-wt`, changes `PlanResult.tsx` and `HomeExercises.tsx`. The design did not need it, but v3 must wait for it too.

Rules to keep the work apart:
- v3 changes no logic file in `src/lib`. It only moves markup and CSS.
- v3 starts after (a) and (b) merge to master. `Setup.tsx`, `Summary.tsx`, `Home.tsx` and `CheckProgress.tsx` change heavily in both. A parallel edit gives conflicts.
- v3 reuses `PlanProgress` and `StepTrack` of (a). It does not write a second progress bar.
- `SessionProgress` below is the visual wrapper of `PlanProgress`. It adds the 6 bars and the "Exercise 3 of 6" label.
- Where (a) already merges the red-flag check, v3 only moves it into GetReadyCard.
- (b) decides what the progress page says about the surgery date. v3 decides where each block sits.

### 5.2 Components, built once

| Component | Replaces | Note |
|---|---|---|
| AppShell | `Shell.tsx` Brand, `BottomNav.tsx`, `Banners.tsx` layout | Banner, top tabs, max width. Bottom bar on a phone. |
| SessionProgress | `PlanProgress.tsx` look, `StepTrack.tsx` look | Reuses the data. |
| ExerciseHeader | The heading part of `Session.tsx` | Name, set, progress. |
| BigNumber | `.num` blocks of `Session.tsx`, `Summary.tsx` | Number, unit and note in one card. |
| PlanList | The cards in `HomeExercises.tsx`, the list in `PlanResult.tsx` | Row, mark, dose, status. |
| GetReadyCard | `RedFlag.tsx`, `Setup.tsx`, `SetupGuide.tsx` | Leg, side, strip, check. |
| DoneCard | `Summary.tsx`, `PainScale.tsx` use | Pain, swelling, Save, next card. |
| QuestionGroup | The page frame of `Onboarding.tsx` | 3 groups. |

### 5.3 Order

Step 0 runs first. Steps 1 and 2 can run in parallel. Step 3 waits for 1. Steps 4 and 5 can run in parallel after 3.

0. Merge (a), (b) and `fix-plan-text`.
1. Tokens and AppShell. New CSS file `v3.css`. Dark and light.
2. BigNumber, ExerciseHeader and SessionProgress. They have no data of their own.
3. Live screens: camera layout and timer layout. The Stop and care buttons keep their ids.
4. PlanList and Home. Then GetReadyCard.
5. DoneCard, QuestionGroup and the progress page layout.

Build first: step 1 and step 3. They fix F1, F3 and F19, which the user named.

### 5.4 Tests that must fail first

Write each test, see it fail on master, then build.

1. e2e at 1440x900: the camera card is at least 55 percent of the window width.
2. e2e on the timer: the heading of the exercise is above the Stop button.
3. e2e: on Home, one primary button has the label "Start" plus the next exercise name.
4. e2e: the plan list has 6 rows. Row 3 has `aria-current="step"`.
5. e2e: after Get ready, the next exercise shows no red-flag page in the same session.
6. e2e: the banner "Prototype. Not for patient use." is on every screen, both themes.
7. e2e: the 9 red-flag sentences are present word for word. A ticked box blocks.
8. e2e: Stop and "Knee gave way or hurts" are in view at 390x844 and at 320x568 with text at 200 percent.
9. Unit: a contrast test reads the tokens and needs at least 4.5 for text pairs, 3.0 for control edges.
10. e2e with `prefers-reduced-motion`: no transform on press. The 5 s bar has no animation.
11. `claims-check.sh src`: no verdict word. Run it after each step.
12. Existing tests `app-session-layout`, `app-timer-layout`, `app-zoom200` and `app-live5-buttons` change on purpose. Update them in the same commit as the layout.

## 6. Open points

- The word "finished" on the Done card: run `claims-check.sh` on the build.
- The merge of "Your plan" and "Confirm" needs a read of the flow tests. The `flow.test.ts` file can pin the two steps.
- A real hold time from a clinician field is the only way to cut the hold clicks.
- The 56 px target and the 96 px number need a test on a phone on a mat.
- The Check my progress text itself belongs to (b). v3 only folds it.

## 7. Review

Date: 2026-11-18. Scope: the 9 mockup screens, both sizes, both themes. The first draft did not use the Web Interface Guidelines. This review fetched them and applied every rule. It also used the palette validator, break-ui, animate, animation-performance and vercel-composition-patterns.

Skills used:
- simple-english: short sentences, plain words, check run.
- web-design-guidelines: fetched the rules, found 23 violations.
- break-ui: broke the pages with long German text, 320 px, 200 percent zoom, big numbers, missing data and 12 exercises.
- animate and animation-performance: the Motion section.
- vercel-composition-patterns: section 7.4.
- dataviz: the palette validator only.
- modern-web-guidance: guides dialog, form-factor-adaptation, motion and progress.
- emil-design-eng and apple-design: press feedback, interruption and the reduced-motion rule.
- mpfl-clinical-guardrails and karpathy-guidelines: read as rules.

hmi-design-full was not used, as the user decided.

### 7.1 Findings by severity

Counts: 5 high, 13 medium, 5 low. That is 23 violations. There are also 2 mistakes of content and 3 deviations that are kept on purpose. `gen.py` and `v3.css` line numbers are the lines of the first draft.

| # | Sev | Screen | Violation | Place in the first draft | Fix (done) |
|---|---|---|---|---|---|
| R1 | High | 02, 05, 07, 08 | Choices were `<span>` elements. No keyboard, no label, no group name. | gen.py 58, 59, 89, 93, 115, 116, 121-124. v3.css 42-46, 90-92, 104-108 | Real radio inputs in a `fieldset` with a `legend`. The whole label is the hit target. |
| R2 | High | 02, 08 | The nine red-flag boxes were `<span class=box>`. A person could not tick them with a keyboard. | gen.py 55. v3.css 89 | Real checkboxes. The nine sentences and two headings are unchanged. |
| R3 | High | all, 390 px | `.tabs{display:none}` removed all navigation on a phone. | v3.css 122 | The tabs show as a row of four under the brand. Live screens still hide them. |
| R4 | High | 04 | The ring filled toward 10 s, but the plan sets no hold time. That shows a target. | gen.py 79-81 | The ring is a 60 s dial with no target. A note says so. |
| R5 | High | 02, 03, 04, 05, 05b | The fixed bottom bar used a guessed padding (170 and 120 px). It had no safe-area inset. It covered text and focus. | v3.css 113, 118, 129. gen.py 6 | The bar is `position: sticky` in the page flow, with `env(safe-area-inset-*)`, `viewport-fit=cover` and `scroll-padding-bottom`. |
| R6 | Med | all | Only `.btn` had a focus ring. Tabs, summary, choices and links had none. | v3.css 37 | One `:focus-visible` rule for all. Inputs show the ring on the label. |
| R7 | Med | all | No hover state. | v3.css 35-41 | Hover rules inside `(hover: hover) and (pointer: fine)`. |
| R8 | Med | all | No `color-scheme` and no `theme-color`. Scrollbar and inputs did not follow the theme. | v3.css 2. gen.py 6 | `color-scheme` for both themes and two `theme-color` meta tags. |
| R9 | Med | all | Touch targets under 44 px: tabs (38), Hide body map (32), red-flag labels. | v3.css 22, 66, 88 | `min-height: 44px` on each. |
| R10 | Med | 01, 02, 05b, 06, 08 | Grid and flex children had no `min-width: 0`. Text pushed the page wide. | v3.css 49, 80, 86 | `minmax(0, 1fr)` in every grid. |
| R11 | Med | 03, 04, 05, 06 | Live numbers had a minimum of 96 px. They overflowed at 320 px and at 200 percent text. | v3.css 69, 78, 127 | `--num` falls to 4 rem on a narrow window. The unit wraps below the number. |
| R12 | Med | 01, 03, 05b, 07, 08 | The progress bars gave no value. The countdown showed `aria-valuenow=4` of 5 with a fixed 80 percent fill. | gen.py 12, 99. v3.css 61, 100 | `role="progressbar"` with `aria-valuetext`. The countdown moves with `transform: scaleX`. |
| R13 | Med | 07 | The date field was a text span with an emoji icon. No label, no type. | gen.py 122 | `<label>` and `<input type="date" autocomplete="off">`. |
| R14 | Med | all | No skip link. The banner was not a landmark. | gen.py 5-8 | Skip link, `aside` with a label, `main id`. |
| R15 | Med | all, 03 | Decorative SVG had no `aria-hidden`. The camera drawing was not named as a placeholder. | gen.py 7, 14, 34, 75 | `aria-hidden` on icons. The camera SVG has a name and a visible chip: "Drawn placeholder, not a camera image". |
| R16 | Med | 02, 05, 05b, 07 | Labels were not specific: "Nothing new today. Start", "Go now", "Continue". | gen.py 62, 94, 101, 125 | "Start session, nothing new today", "Save and open Quadriceps set", "Open Quadriceps set now", "Continue to your surgeon". |
| R17 | Med | 05b | The reduced-motion rule covered only `.btn`. The countdown had no animation at all. | v3.css 109. gen.py 99 | The countdown runs in `no-preference`. In `reduce` it moves in 5 steps of 1 s. |
| R18 | Med | all | A text token pair failed: primary text on the sunken surface is 4.13 in the light theme. | doc table 2.2 | Light primary is now `#076a96`. See section 7.2. |
| R19 | Low | all | `100vh` instead of `100dvh`. | v3.css 15, 63 | `dvh`. |
| R20 | Low | all | Straight apostrophes. `10 s` without a no-break space. No `text-wrap: balance`. | gen.py 46, 48, 83, 109. v3.css 26-28 | Curly apostrophe, `&nbsp;`, `balance` and `pretty`. |
| R21 | Low | 04, 05, 06 | Missing `tabular-nums` on the step numbers, pain scale and holds. | v3.css 53, 91 | Added. |
| R22 | Low | all | The brand name had no `translate="no"`. | gen.py 7 | Added. |
| R23 | Low | all | No `touch-action: manipulation` and no tap highlight colour. | v3.css | Added in one rule. |

Mistakes of content:

| # | Screen | Mistake | Fix (done) |
|---|---|---|---|
| C1 | 01, 02, 05b | The gluteal set (and the quadriceps set) showed a leg-raise drawing. | A neutral lying figure with both legs flat. Two small arcs mark the squeeze. The straight leg raise keeps its leg-raise drawing. |
| C2 | 01, 06 | The week read 0. The surgery date is 2026-10-29 and today is 2026-11-18. That is 20 days, so week 2 (20 divided by 7, rounded down). | Both screens read week 2 and show both dates. |

Kept on purpose (deviations from a guideline):

| # | Guideline | Why it stays |
|---|---|---|
| K1 | A destructive action needs a confirm or an undo. | Stop and "Knee gave way or hurts" must act with one press (guardrails). Build an undo instead: "Resume" for 10 s. Nothing is erased on Stop. |
| K2 | Title Case for headings and buttons. | The app uses sentence case. The nine red-flag sentences must stay word for word. |
| K3 | Use `Intl` for dates and numbers. | The mockup is static and keeps the ISO date of the app. The build must use `Intl.DateTimeFormat` and `Intl.NumberFormat`. |

Not decided by the guidelines and kept: the countdown bar is a `div` with `role="progressbar"`. The guide for `<progress>` fits a bar with one fill. This bar must pause and move in steps, so a `div` gives more control.

### 7.2 Palette validator and contrast

The validator is for chart palettes of 3 or more slots. This app has no chart. It has two accent hues. I ran it on the two accents with each theme surface, as the task asks. I also ran a contrast check of every text and control pair with the WCAG formula.

Validator (accent pair, primary against care):

| Theme | Surface | Lightness band | Chroma | CVD separation | Normal vision | Contrast vs surface |
|---|---|---|---|---|---|---|
| Light, first draft | #ffffff | FAIL (care 0.338) | FAIL (care 0.08) | PASS 18.3 (deutan) | PASS 19.8 | PASS |
| Light, now | #ffffff | FAIL (care 0.338) | FAIL (care 0.08) | PASS 15.7 (deutan) | PASS 17.3 | PASS |
| Dark | #1c2731 and #0e151b | FAIL (0.735 and 0.843) | FAIL (care 0.059) | WARN 7.9 (protan) | FAIL 14.1 | PASS |

How to read it. The band and chroma checks target series colours of a chart. The care colour is a dark ink for headings and a button edge. Its low chroma is on purpose. The dark pair is below 15 on the normal-vision floor. This does not matter here, because no meaning depends on the difference of the two hues. Every state also has a word, a mark or a shape. I did not change the dark care token, because the app already ships it. Do not use the two accents as two series in a chart.

Contrast, text pairs (minimum 4.5), after the fix:

| Pair | Light | Dark |
|---|---|---|
| ink on page, card, sunken, soft | 14.94, 17.27, 13.32, 13.65 | 15.99, 13.19, 16.64, 12.98 |
| muted on page, card, sunken, soft | 7.17, 8.29, 6.40, 6.55 | 8.87, 7.32, 9.23, 7.20 |
| primary text on page, card, sunken | 5.18, 5.98, 4.62 | 8.01, 6.61, 8.34 |
| text on a primary button | 5.98 | 8.14 |
| care on page, card, sunken | 10.44, 12.06, 9.31 | 11.27, 9.30, 11.72 |
| banner text on banner | 12.06 | 9.93 |
| button hover: text on primary hover | 7.78 | 10.18 |

Control edges (minimum 3.0):

| Pair | Light | Dark |
|---|---|---|
| edge on page, card, sunken, soft | 3.66, 4.23, 3.27, 3.35 | 4.34, 3.58, 4.52, 3.52 |
| primary on page, card, sunken, soft | 5.18, 5.98, 4.62, 4.73 | 8.01, 6.61, 8.34, 6.51 |
| care on page, card | 10.44, 12.06 | 11.27, 9.30 |

One pair failed: primary text on the sunken surface in the light theme (4.13, first draft). The first draft table did not list this pair. Fix: the light primary changed from `#0872a0` to `#076a96`. The new value is at least 4.62 on every surface. Every other pair was at least 4.5 (text) and 3.0 (edge). The primary hover colour is `#05587d` (light) and `#7cc9ee` (dark). The token table in section 2.2 has the new light value. The numbers for the light primary in that table are now: text on page 5.18 and on card 5.98, button text 5.98.

### 7.3 What broke (break-ui)

Method. One script loaded each of the 9 pages in Chrome with Playwright. It changed the data in the page with 5 data sets: base, German text, big numbers, missing data and 12 exercises. It did this at three widths: 1440, 390 and 320 px. It also did this at 200 percent browser zoom (720 px at scale 2). The last view was 200 percent text on a 390 px window. It counted page overflow and boxes whose content went outside. It also loaded each page with reduced motion and with forced colours. That is 234 runs for each version. RTL was not needed. The German strings are long on purpose: "Gesäßmuskelanspannung im Lie..." heading, a 50 character button label and a 30 character choice.

Result of the first draft: 225 runs, 78 with a finding. 56 runs scrolled sideways. By width: 390 px 8, 320 px 16, 200 percent text 32, 1440 px 0 and 200 percent zoom 0. By data set: German 23, big numbers 13, base data 8, 12 exercises 8, missing data 4. By page: done 11, progress 10, get ready 7, live camera 7, next card 7, home 6, timer 4, both question groups 2 each.

Result after the fixes: 225 runs, 0 findings, 0 runs with sideways scroll. The probe has limits. It finds overflow and clipped boxes. It does not judge looks. I looked at the PNG files of both themes myself.

| # | Sev | Field and worst value | What happened | Fix (done) |
|---|---|---|---|---|
| B1 | Broken | Heading, "Gesäßmuskelanspannung im Liegen, heutige Trainingseinheit" | The word was wider than 320 px. The heading was clipped. | `overflow-wrap: anywhere` and `text-wrap: balance` on headings |
| B2 | Broken | Main button, 50 characters | The button grew the page by 229 px at 320 px. | `minmax(0, 1fr)` in grids, `overflow-wrap: anywhere` on `.btn` |
| B3 | Broken | Segmented choice, "Mehr als vorher geschwollen" | The choice left its card at 390 px and 320 px. | `minmax(0, 1fr)` columns and wrap inside each choice |
| B4 | Broken | Live number, 128 (and 24 at 320 px on Done) | The number card went 48 to 118 px past the edge. | `--num` falls with the width. The unit wraps. The two number cards use `auto-fit` columns. |
| B5 | Broken | Text at 200 percent | Tabs, buttons and choices went past the edge in 32 runs. | Same fixes. Tabs use `auto-fit` and wrap. Sizes use `rem`. |
| B6 | Broken | Phone width | No navigation at all (R3). | A tab row under the brand |
| B7 | Ugly | Next card buttons | The buttons were inside the card with a negative margin. They left the card box at 320 px, 390 px and zoom. | The bar sits outside the card and is sticky |
| B8 | Ugly | Progress page at 320 px | Both cards were 10 px past the edge. | Grid fix |
| B9 | Ugly | Plan with 12 exercises, text at 200 percent | The numbers 10, 11 and 12 were clipped in the round marks. | The mark is `2rem` high, has a minimum width of `2rem` and grows with the text |
| B10 | Ugly | Forced colours | Bar segments, the selected choice and plan marks lost their fill. All 6 segments looked equal. The labels above the big numbers did not paint. | System colours for the state parts. Big numbers use `line-height: 1.15` in this mode. The ring arc uses `CanvasText` on a `GrayText` track. |
| B11 | Fragile | 12 exercises | The list gets long. The next row can sit below the fold. | Build: scroll the current row into view on open |
| B12 | Fragile | Missing data | "-- degrees" reads as a value. An empty plan shows an empty card. | Spec only, not drawn: `BigNumber` shows "--" and a reason ("Ankle not seen") and no unit. `PlanList` shows "No exercises in the plan." |
| B13 | Fragile | Reduced motion | Before, the 5 s count-down had no animation, so nothing was there to reduce. The press scale was off, the colour change was off too. | The bar animates in normal mode. In reduced mode it moves in 5 steps. The colour change stays. The scale is off. |

Held up from the first draft:
- No overflow at 1440 px for any data set.
- No overflow at 200 percent browser zoom.
- The camera card keeps its 4:3 shape.
- The Stop button stays in view at 320 by 568 px in every run. The first draft used a fixed bar for this, which hid text. The new bar is sticky.

Decisions for the owner:
- A long German heading wraps. It does not shrink. Reason: a heading that shrinks differs from screen to screen.
- A missing number shows "--" and a reason in words. Reason: a blank can be read as zero.
- A plan of 12 or more rows scrolls to the current row. A fold and a "Show all" button add one more click.

### 7.4 Component structure (composition)

Rules used: no boolean props and one explicit component for each variant. Compound components share a context. State sits in a provider with one interface (`state`, `actions`, `meta`). Children replace render props. If the app runs React 19, pass `ref` as a prop and read context with `use()`. The app uses plain React and hand-written CSS, so no library is added.

| Component | Parts and props | What it avoids |
|---|---|---|
| AppShell | `AppShell` takes `tab` (`'today' \| 'progress' \| 'sessions' \| 'data'`) and `children`. Parts: `AppShell.Banner`, `AppShell.Nav`, `AppShell.Main`, `AppShell.Actions`. The banner is always rendered inside `AppShell`. `LiveShell` is a second component for the live screens. It has no nav. | A `live` boolean and a `hideBanner` boolean. The banner cannot be switched off. |
| SessionProgress | `total`, `current`, `unit` (`'Exercise' \| 'Step'`). It renders `role="progressbar"` with `aria-valuetext`. | A `compact` or `segmented` flag. Size comes from the container in CSS. |
| ExerciseHeader | `eyebrow`, `name` and `children`. The progress bar is a child. | A `showProgress` boolean. A screen that needs no bar passes no child. |
| BigNumber | `label`, `value` (`number \| null`), `unit`, `note`, `tone` (`'ink' \| 'primary'`), `missingReason`. When `value` is `null` it shows "--" and the reason. | Separate number blocks for each screen. A `highlight` boolean. |
| PlanList | `items` (`id`, `name`, `dose`), `currentId` and `children` for a row action. Each status (`finished`, `next`, `later`) comes from the position of `currentId`. The current row has `aria-current="step"`. | A status flag on each item that can disagree with the position. |
| GetReadyCard | Compound with `GetReadyProvider`. Parts: `.Leg`, `.CameraSide`, `.DrawingStrip`, `.RedFlagCheck`, `.Actions`. The provider holds `state` (leg, side, flags), `actions` and `meta` (`blocked`). The red-flag part uses the existing list from `src/lib/redflags.ts`. | A card with six boolean props that show or hide each block. The screen picks the parts. |
| DoneCard | Compound with `DoneCard.Provider`. Parts: `.Result` (BigNumber children), `.Pain`, `.Swelling`, `.Save`. State: `pain`, `swelling`. `.Save` takes the next exercise name as `children`. | `showPain` and `showSwelling` booleans. A part that is not wanted is not rendered. |
| QuestionGroup | `step`, `total`, `title`, `intro` and `children`. Parts: `.Question` (a `fieldset` with a `legend`), `.SegmentedChoice` for 2 or 3 options, `.RadioList` for 4 or more, `.DateField`, `.FlagChecks`. | A `type` prop with a switch inside. Each question type is its own component. |
| Shared | `ChoiceGroup` (fieldset, legend, inputs) is the base of `SegmentedChoice`, `RadioList` and the pain scale. `FlagChecks` is the base of the red-flag lists. | The same input markup copied into five files. |

Notes:
- A timer, a count-down and a camera stay in hooks (`useCountdown`, the pose hook). The components only show values. This keeps `src/lib` unchanged, as section 5.1 requires.
- A child component never reads the phase. Only the protocol field `activePhase` sets it.
- Each component has one test with the worst-case data of section 7.3.

## 8. Motion

This section replaces the motion list in section 2.2. Rules used: the animate skill (a gate for each animation), the animation-performance skill (only `transform` and `opacity`) and the guide "motion" of modern-web-guidance.

Gate. Almost everything in this app is used many times for each session. A person presses Start, Stop, Save and Next about 20 times in a session. Most things do not animate. A person who uses a keyboard gets no animation on the action itself. Purpose and tier are named for each item.

| What | Purpose and tier | Property | Time and curve | Reduced motion |
|---|---|---|---|---|
| Button press | Feedback. Tens of times each day. | `transform: scale(0.97)` on `:active`. The response starts on pointer down. | 120 ms, `cubic-bezier(0.23, 1, 0.32, 1)` | No scale. The colour change stays. |
| Button hover and choice change | State indication. Tens of times each day. | `background-color` only. It is a small area. It runs inside `(hover: hover) and (pointer: fine)` for hover. | 120 ms, same curve | Stays. It is not motion in space. |
| Count-down bar on the next card | State indication. Occasional (20 times for each session). | `transform: scaleX` from the left edge. It is a compositor property. | 5 s, `linear` (constant motion) | 5 steps of 1 s. The value also shows in `aria-valuetext`. |
| Pause of the count-down | Control. | `animation-play-state: paused` on "Stay on this screen". This keeps the bar where it is. A new start continues from there. | None | Same. |
| Screen swap | Prevents a jarring change. Tens of times each day. | `opacity` only. Build it with `@starting-style`. | 160 ms, ease-out | A plain cut (0 ms) |
| Hold ring and hold number | Status. Updates once each second. | None. The number and the ring offset change in one step each second. No transition. | None | Same |
| Rep number and angle number | Status. Many times each minute. | None. A number that changes with a count must not move. | None | Same |
| Session bar fill and plan row mark | State indication. | None. They change in one step when a row is finished. | None | Same |
| Details open and close | Preventing a jarring change. Rare. | None. The native `details` opens at once. | None | Same |

What does not animate, and why:
- Stop and "Knee gave way or hurts". They must react at once. A delay is a safety risk.
- The live camera overlay and the angle. They are data. Data does not move for style.
- Any action that starts from a key. It has no animation.
- Page load, list entry and a stagger. The user gains nothing from them.
- No bounce, no spring and no blur. The app has no drag or flick, so a spring has no use.

Rules for the build:
- Use `transition` for press, hover and choice. Never `transition: all`. List the exact properties.
- Use a CSS animation for the count-down bar. It runs off the main thread, so a busy page does not slow it.
- Never write the bar value to React state on each frame. Update `aria-valuenow` once each second.
- `will-change` is not used. Add `will-change: transform` only if a recording shows a shift.
- Never set a CSS variable on a parent to drive a transform of children.
- Put reduced motion next to each rule. Do not set `animation-duration: 0.01ms` for all items.
- Under 5 s of motion needs no pause control. The count-down is exactly 5 s and has "Stay on this screen". Nothing flashes.
- Check with the Animations panel at one fifth of the speed. Check on a real phone on a mat, as section 6 says.
