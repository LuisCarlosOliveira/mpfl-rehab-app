# UI redesign v2: the plan that makes the change visible

Date: 2026-11-09. Status: plan only. No app code changed. Author: UI/UX design lead.

Skills used: frontend-design:frontend-design, apple-design, modern-web-guidance, dataviz, web-design-guidelines, simple-english:simple-english, break-ui.

How the skills were used. The skills were loaded and applied as rules. The `modern-web-guidance` search was not run, because the sandbox has no network. The guides that the brief already read (`responsive-design`, `dialog`, `motion`) are reused. The `dataviz` validator was not run, because v2 adds no new chart colour. The `break-ui` method was applied by reading the screens with worst-case text (the clipped angle label, the raw number, the raw rule code). `web-design-guidelines` was applied to the plan, not to code.

Source marks: READ means the value comes from code or from a measurement in a browser. SEEN means the value comes from a screenshot. OWN means a decision of this plan.

## 1. Why the user sees no change

The user is right. Pass 1 to 4 changed the tokens (pink paper became grey, teal became blue) and flattened some cards. The layout of almost every screen is the same as before.

I took 344 screenshots with Playwright. The OLD app (port 4380) and the NEW build (port 4630) were shot at 390 x 844 and 1280 x 800, in light and dark. I looked at the phone light set for every screen as side-by-side sheets. I looked at the dark set for Home, Session, Summary with pain 7 and Setup camera. I looked at the laptop set for Session. The files are in the scratchpad folder `uiv2/`. The names are `<old|new>-<phone|desk>-<light|dark>-<NN-screen>.png`. The sheets are in `uiv2/sheets/`.

What really changed (SEEN and READ):
- Colour and type: pink to cool grey, teal to blue, Figtree weights. This is the only change on Privacy, Load, Setup guide camera card, Update plan, My data, pairing and the error screen.
- Flat rows: Home, Red flag and the generator questions lost their card borders. The order and the content of the rows are the same.
- New parts: the bottom bar (Home, Your sessions, My data) and the ruler gauge on Session. Also the ink fill of the chosen pain pill, the error screen with Try again, and the pale band on charts.

What did not change:
- Every screen has the same order of blocks as before. The Setup guide is still one long scroll of two drawings and six text cards.
- Setup camera is still an empty grey box, then a heading, then a notice, then six dashed chips.
- Session on a phone is still camera, then a stats block, then the buttons. Only the card border went away.
- Nothing on screen has a new shape. No screen has a step flow, a new component, or a new hierarchy.

Defects that the screenshots and a measurement showed (these are not taste):

| Id | Where | Fact | Source |
|---|---|---|---|
| D1 | Session, 390 x 844 | The cue box starts at y 868. The fixed bar starts at y 747. The over-limit text is below the bottom of the screen. The ruler (y 737 to 848) is under the bar. The page height is 1167. | READ, Playwright |
| D2 | Session, 360 x 640 | The camera is 64 px high. The page height is 950. The cue box starts at y 651 and the bar at y 543. | READ, Playwright |
| D3 | Session, phone | The label on the picture is cut at the right edge: "126° estimated ang". | SEEN |
| D4 | Your sessions, table | One cell shows a raw number: "126.199999". | SEEN |
| D5 | Confirm the change | The text shows an internal rule code: "(RANGE_SURGEON)". | SEEN, READ in `src/lib/planView.ts` line 125 |
| D6 | Red flag | A tick at the top makes a block appear at the page bottom. The person sees only that Continue is grey. | SEEN |
| D7 | Session, laptop | The camera is a small picture on the right (330 px). The brief asked for the picture to lead. | SEEN |

D1 and D2 are the main reason to rebuild the Session layout. The test `e2e/app-session-layout.spec.ts` checks the video, the angle, the count and one button. It does not check the cue or the ruler. So the tests pass while the cue is off screen.

## 2. Hard limits (every item below keeps them)

Source: `MPFL_APP_PLAN.md` (FR12, FR13, FR23, NFR2, NFR12), `docs/ui-redesign-brief.md` section 1, `docs/ui-audit-honesty-plan.md`.

1. No verdict word, no score, no goal, no streak. No green or red state colour.
2. An in-range rep shows nothing and plays no sound.
3. The prototype banner stays with its two lines.
4. Every clinical value needs clinician review. No default value enters.
5. No frame or video is stored. Everything comes from the own origin. No new dependency. The CSP stays.
6. Touch targets are 48 px or more.
7. Pain stays 11 radios, with none pre-selected.
8. The leg trace stays white with a dark halo.
9. No "Today" block, no range filter, no text of the brief that has no data source (the list is in `docs/ui-audit-honesty-plan.md` section 4 and 7).
10. A number or label on screen needs a real data source in code.
11. Nothing moves unless a person acts. The live angle and the skeleton follow the body.

## 3. Gap table

"Brief" is the wireframe in `docs/ui-redesign-brief.md` section 7 (or the mapping in section 5). "Borrows from" is the catalog entry. The id in the last column is the punch list item.

| Screen | Brief promised | Build shows (SEEN) | Gap | Item |
|---|---|---|---|---|
| Privacy | Not in the brief. Note moves to My data. | Same four cards, same order, new colours. | Same as before. | C8 |
| Load | Not in the brief. | Same dropzone and two cards. Colour only. | Same as before. | C8 |
| Home | Tinted active card, plain rows with Start at the right, facts as a list, bottom bar (064). | Tinted card, plain rows with a full-width Start each, facts as a list, bottom bar. Second camera card remains. | About 60 percent built. Every row still has a full-width button. Two headings say the same ("Home", "Your exercises"). | B1 |
| Red flag | Whole-row tick, solid heavy block when blocked (072). | Flat rows. The block shows at the page bottom. | Rows built. The state change is off screen (D6). | B2 |
| Setup guide | One drawing, steps (U13), leg labels with leader lines (152). | Two drawings and six cards in a long scroll. Numbered dots on the drawing exist. | Content same as before. No steps. | B3 |
| Setup camera, before start | A step card with state line and help line (072), chip (079). | A grey empty box 300 px high, then a card of text, then the sticky button. | Not built. | A3 |
| Setup camera, running | Camera, chip, leg labels, one state line, rows in two groups. | Camera with a white arc and one label, "Hide body map" button, heading, notice, six dashed chips. | Chips are the old chips. No leg labels. No state card. | A3, A4 |
| Session, phone | Camera on top, numbers side by side with unit on the baseline, ruler, cue slot, bar. | Camera on top. Numbers side by side, unit under the number. Ruler and cue are under the bar. | Camera moved up and the card went away. The first view is still wrong (D1, D2). | A1, A2 |
| Session, laptop | Camera left (7fr), readings right. | Readings left, small camera right. | Opposite of the brief (D7). | A7 |
| Session, rest panel | Panel replaces the live card (U8). | Built in code. Not seen by me. | Needs a screenshot. | A1 |
| Summary | Two stat lines (007), pain ruler (112), segmented swelling. | Two white cards, a set line, pain pills in two rows, swelling as three full rows. | Cards are the old cards. The pain pill fill is new. | B4, B5, B6 |
| Summary, pain 6 and 7 | Pain value pill, block above the bar at 7. | Ink pill on 6. Indigo block at 7 inside the page. | Works. The block is the same as before. | B5 |
| Your sessions | Big number, range line, one chart, read-out (098, 117). | Three chart cards with a table each. Pale band built. | Layout same as before. No stat strip, no legend list, no read-out. Table cell with a raw number (D4). | C3 |
| My data | Not in the brief. | Four cards, same order, new colours. | Same as before. | C4 |
| Generator question | Not in the brief. | Radio rows with borders instead of cards. | Almost the same. | C1 |
| Plan result | Not in the brief. | List of cards with a dose chip. | Same as before. | C2 |
| Confirm, Update plan | Not in the brief. | Same text blocks and the same radio groups. Raw rule code (D5). | Same as before. | C5 |
| Pairing, host and companion | Not in the brief. | Same long scroll with two QR blocks. New colours. | Same as before. | C6 |
| Error screen | Layout of 121: 36 px title, one cause line, two buttons (156, 121). | Icon, title, a bordered notice, Try again and Back to Home. | About half built. Left aligned and small. | C7 |
| Dark theme | Blue-black ground, pale lavender block. | Works on the four screens I looked at. | No gap. | none |

Honest summary. Two things are really new: the bottom bar and the Session ruler. The rest is a recolour and a flattening. Seven of the 20 rows above have no layout change at all.

## 4. Verdicts

BUILT means the code has it and I saw it or read it. TO BUILD names the item. REJECTED names the rule.

### 4.1 Catalog entries

| Entry | Verdict | Where or what | Part rejected |
|---|---|---|---|
| 156 error state | TO BUILD | C7 error screen layout. A6 camera error in the same shape. A small version is built in `LoadError.tsx`. | None |
| 072 step card with a state line | TO BUILD | A3 (Setup camera), C6 (pairing steps) | Green tick, drag and drop (colour and verdict rule) |
| 098 big number, small unit | TO BUILD | A2 (Session), B4 (Summary), C3 (Your sessions) | Digit roll on the live angle (brief section 4) |
| 117 legend list | TO BUILD | C3, a list of exercises with a session count and a rep count, no percent | The grid of squares and the percent (the percent is a score look) |
| 112 ruler | TO BUILD | B5 (pain read-out), B6 (swelling as a segmented control). The Session ruler is BUILT but hidden by D1, so A1 fixes it. | Pain as a ruler input. Rule: 11 radios, none pre-selected, 48 px (FR12, `docs/ui-redesign-decisions.md` section 3) |
| 079 status shape and label swap | TO BUILD | A4 chip and banner enter | Green, yellow and orange fills |
| 064 bottom tab bar | BUILT | `BottomNav.tsx`, three items, hidden on flow screens | None |
| L4 recording bar | BUILT | `.session-bar` has Stop and Knee gave way. A5 sharpens it. | Pause and the running time. Pause must not mute the limit cue, and a pause that keeps the cue has no job. Time is a timer with no data source (limit 1 and 10). |
| 152 labels with leader lines | TO BUILD | A3 labels Hip, Knee and Ankle with elbow lines. A8 fixes the clipped label. The body map is BUILT. | Score and battery look |
| 121 empty and error layout | TO BUILD | C7 (error), C3 (empty) | Joke text, loop animation |
| 075 empty state and "needs you first" | TO BUILD | C3 empty block. The "not seen first" order is BUILT (U19). | Dense board, green Done column |
| 007 remove the decoration | TO BUILD | B4 and C3 stat lines. The rules (no gradient, no glow) are kept. | Rainbow lines |

Also dropped in the brief and still dropped: 084 dot-matrix (legibility at 2 m), 088 pull to confirm (drag only, hard for shaking hands).

Count for the 12 entries: BUILT 2, TO BUILD 10, REJECTED 0 as a whole entry (four parts are rejected, see the last column).

### 4.2 Ideas U1 to U19

| Id | Idea | Verdict | Where or rule |
|---|---|---|---|
| U1 | Body map on the picture | BUILT | `BodyMap.tsx`. Gates G1 and G2 of `docs/ui-ideas.md` section 4 were not checked by me. |
| U2 | "Ankle not seen" label at the last place | TO BUILD | A3 |
| U3 | Camera, count and angle in the first view | TO BUILD | A1. The current build fails it for the cue and the ruler (D1, D2). |
| U4 | Tabular numbers, unit on the baseline | TO BUILD | A2. Tabular width is BUILT. The unit still sits under the number. |
| U5 | Pips for each rep | REJECTED | A row that fills toward the set size reads as a goal bar. Brief section 10 and FR23. The text "Reps in this set: 0 of 10" stays. |
| U6 | Hold meter | BUILT | `.hold-bar` and the text "N of M seconds". See section 8 for the rule. |
| U7 | A tone for each counted rep | REJECTED | An in-range rep plays no sound (FR23, hard limit 2). |
| U8 | Rest panel replaces the live card | BUILT | `.rest-panel` in `Session.tsx`. Needs a screenshot (A1). |
| U9 | Button label swap | TO BUILD | "Start camera" is BUILT. B7 adds Save, Saving, Saved. C4 adds the export label. |
| U10 | Status line names the start step | BUILT | `.session-start`, `startText`. A1 moves it off the camera. |
| U11 | Error boundary and error screen | BUILT | `LoadError.tsx`. C7 restyles it. |
| U12 | Drop area states | BUILT | Dashed drop area in `LoadProtocol.tsx` and `DataScreen.tsx`. File-over and refused states were not seen by me. C4 checks them. |
| U13 | Guide as one drawing and six steps | TO BUILD | B3 |
| U14 | Numbered callouts, "Chosen leg" label | BUILT | Numbers 1 to 6 on `GuideFigure.tsx`. The legend still reads "Operated leg". B3 checks that the text follows the leg answer. |
| U15 | Chart card with range line and tap read-out | TO BUILD | C3 adds the read-out. Range line and two date labels are BUILT. |
| U16 | Camera error band | BUILT | `Dashboard.tsx` band and the legend line "Camera error range" |
| U17 | One set of motion tokens | BUILT | `styles.css` W1 block |
| U18 | Button names the count, panel says what happened | TO BUILD | C4 |
| U19 | "Not seen" rules first | BUILT | `setupView.ts` order. A3 keeps it. |

Count for the 19 ideas: BUILT 10 (U1, U6, U8, U10, U11, U12, U14, U16, U17, U19). TO BUILD 7 (U2, U3, U4, U9, U13, U15, U18). REJECTED 2 (U5, U7).

Neither U5 nor U7 stays unbuilt because it is hard. Both break a hard limit.

## 5. The cue banner problem

Decision 4 says the cue banner must not cover the camera. The brief puts the cue over the lower 72 px of the camera (brief section 7.4, last arithmetic line). That covers the ankle and the foot. The current build shows the opposite problem: the cue is under the fixed bar (D1).

Resolution: a reserved status slot directly under the camera. It is never on the picture. It is inside the first view. Nothing moves when it fills, because its height is reserved.

Layout rules (OWN):
1. On Session, hide the brand bar. Title and Mute sound share one 48 px row. This saves 94 px. Use `body:has(.v2-session) .topbar { display: none }` in the new CSS file.
2. The camera is full width. Its height is `min(75vw, 300px)`, and less on a short screen.
3. The slot comes right after the camera. It holds, with this priority: the alert, then the capture line with its thin progress, then the start step, then the cue. The slot is 80 px high on a phone. The alert replaces the cue while it shows.
4. The button "Use my lowest steady angle as the start" sits in the same slot. Text 24 px, gap 8 px, button 48 px.
5. The cue text uses `--step-1` on a phone (21 px or more, weight 700). The alert keeps its indigo block and the triangle.

Arithmetic at 390 x 844 (the bar is 97 px, so its top is y 747):

| Part | From | To | Height |
|---|---|---|---|
| Prototype banner | 0 | 56 | 56 |
| Title row and Mute | 56 | 104 | 48 |
| Gap | 104 | 112 | 8 |
| Camera 390 x 292 (4:3) | 112 | 404 | 292 |
| Status slot | 412 | 492 | 80 |
| Set label row | 500 | 524 | 24 |
| Numbers row (label 20, number 72, gap 12) | 524 | 628 | 104 |
| Angle caption (2 lines) | 628 | 668 | 40 |
| Ruler with limit caption | 668 | 732 | 64 |
| Free | 732 | 747 | 15 |

All parts end above y 747. The camera can be 300 px high with 7 px to spare.

Arithmetic at 360 x 640 (short phone). At a height of 41 rem or less, the bar buttons use `min-height: 3.5rem`. The bar is then 80 px and its top is y 560.

| Part | Height |
|---|---|
| Banner 56 and title row 48 | 104 |
| Gaps (4 times 4) | 16 |
| Status slot | 80 |
| Set label row | 24 |
| Numbers row | 104 |
| Angle caption | 40 |
| Sum without the camera | 368 |
| Room above the bar (560 minus 4) | 556 |
| Camera 360 x 188 | 188 |

The camera is 188 px high. Today it is 64 px (D2). The ruler moves below the numbers and can sit under the bar until the person scrolls. The ruler is not a safety item.

Which test pins stay true:
- `e2e/app-session-layout.spec.ts` R3-02 at both sizes: video, angle, count and the lowest-angle button all end above the bar. True in both tables.
- R3-03 at 390 x 844: during a rest the panel comes first. The slot is empty then. True.
- `styles.test.ts` rule that `.readout-number` uses `--step-hero` (72 px or more). True. The number stays 72 px.

Which pin changes:
- `tests/ui/styles.test.ts` lines 174 and 175 pin `.capture-line { position: absolute }` in the F3 block. The new layout uses a new element class `.status-line`, so the old rule is dead and the pin stays green. The cleanup is a task for the lead after the merge (remove the dead rule and the pin together). This is not a safety pin. Its purpose (R2-04) is that the count and the angle stay above the fixed bar. The new e2e test keeps that purpose.
- Builders must not edit `styles.css`.

New tests that prove it (written first, package A):
1. At 390 x 844 and at 360 x 640, in the first view: the box of `.status-line` does not overlap the box of `video.preview`. It ends above the bar.
2. At 390 x 844: the ruler ends above the bar.
3. With a forced over-limit cue (seeded pose), the alert text is inside `window.innerHeight`.
4. The camera is 150 px high or more at 360 x 640.

## 6. Work packages

Rule for all three: each package edits only its own files. No package edits `styles.css`. Each package puts its styles in its own new CSS file, imported by its component. Scope every new rule under one root class (`.v2-session`, `.v2-flow`, `.v2-screens`) so it wins over `styles.css` without `!important`. Keep the existing class names that tests read.

Frozen shared files (nobody edits): `Notice.tsx`, `Icon.tsx`, `answerControls.tsx`, `Banners.tsx`, `Shell.tsx`, `styles.css`, `figures.css` (owned by B), `dashboard.css` (owned by C). Restyle a frozen component through the root class of the package.

Step 0 is a mechanical commit by the lead or package B, with no visual change. It runs before the packages start. Move the `step === 'guide'` branch of `Setup.tsx` (lines 273 to 398) into a new file `SetupGuide.tsx`. Move the constants `START_MARKS`, `END_MARKS`, `CAMERA_MARKS` and the leg state with it. After step 0, package A edits `Setup.tsx` (camera and pair steps only) and package B edits `SetupGuide.tsx`. Without step 0 the two packages edit the same file. Run `tests/ui/setup*.test.tsx` before and after.

| Package | Screens | Files it edits | New files |
|---|---|---|---|
| A | Session, Setup camera, cue area | `Session.tsx`, `Setup.tsx` (camera and pair branches), `BodyMap.tsx`, `setupView.ts`, `tests/ui/styles.test.ts` (the one pin), `e2e/app-session-layout.spec.ts` | `sessionV2.css`, `StatusLine.tsx`, `SetupStateCard.tsx` |
| B | Home, Setup guide, Red flag, Summary, pain | `Home.tsx`, `HomeExercises.tsx`, `RedFlag.tsx`, `SetupGuide.tsx`, `Summary.tsx`, `PainScale.tsx`, `BottomNav.tsx`, `GuideFigure.tsx`, `figures.css` | `flowV2.css`, `StepGuide.tsx`, `Segmented.tsx` |
| C | Generator, pairing, Your sessions, My data, error, Load, Privacy | `Onboarding.tsx`, `PlanResult.tsx`, `ConfirmPlan.tsx`, `UpdatePlan.tsx`, `PairHost.tsx`, `PairCompanion.tsx`, `PairSteps.tsx`, `CompanionEntry.tsx`, `Dashboard.tsx`, `dashboard.css`, `DataScreen.tsx`, `ClinicianView.tsx`, `LoadError.tsx`, `LoadProtocol.tsx`, `Privacy.tsx`, `Referral.tsx`, `App.tsx` (error boundary only), `src/lib/planView.ts` (D5 only) | `screensV2.css`, `StateScreen.tsx`, `StepTrack.tsx` |

Overlap check: A and B both use `PainScale` (the rest panel in Session). B owns it. A must keep its props. A and C both use `Notice`: frozen. B and C both use `answerControls.tsx`: frozen. `App.tsx` is C only. `BottomNav.tsx` is B only.

Order of work inside a package is the order of the items below. Each item is one commit with its test first. Run `npm run precheck`. The pipeline runs the full suites (rule `ci-pipeline-testing.md`).

## 7. Punch list

Wireframes are 38 characters wide, about 390 px. The prototype banner (56 px) is above every phone wireframe and is not drawn.

### Package A: Session, Setup camera, cue area

#### A1. Session: the viewfinder layout
- Screen: Session, phone.
- Before: camera, then a stats block, then the bar. Cue and ruler are under the bar (D1).
- After: title row, camera, status slot, one numbers row, ruler, bar. All in the first view. Arithmetic is in section 5.
- Borrows from: brief 7.4, U3, 098.
- Files: `Session.tsx` (move `.cue-area` and `.session-start` out of `.stack` as siblings of `.frame`, order -1), new `sessionV2.css`.
- Proof: the four tests of section 5 and a screenshot at 390 x 844, 360 x 640 and 1280 x 800, light and dark. Also a screenshot of the rest panel (U8).
- Limits: 1, 2, 6, 10, 11. Cue text has no new words. Keep `.counters`, `.readout-line`, `.cue`, `.cue-alert`, `.session-start`, `.hold-bar`, `.session-bar`.

```
+--------------------------------------+
| Heel slide               [Mute sound]|  48
+--------------------------------------+
|                                      |
|   CAMERA 390 x 292, no card, no text |
|   over it. White trace, one label.   |
|                                      |  292
+--------------------------------------+
| Stop at your limit, do not push.     |  slot 80
| (empty while in range)               |
+--------------------------------------+
| Set 1 of 3          0 of 10 reps     |  24
| Knee bend           Reps             |
| 126 degrees         0 reps           |  104
| estimated angle, not a medical       |
| measurement                          |  40
| 0 |.|.|.|.|.|.|.|^|.|.|.| 120        |
| Your limit 90 degrees                |  64
+--------------------------------------+
| [ Stop ]  [Knee gave way or hurts]   |  97
+--------------------------------------+
```

#### A2. Session numbers: big number, small unit on the baseline
- Screen: Session and (later) Summary.
- Before: unit "degrees" under the number. Label "Angle".
- After: the number at 72 px weight 800 and the unit at `--step-0` on the same baseline. Label "Knee bend" (the existing text `Knee bend:` stays inside the caption). Angle left, reps right, one hairline between.
- Borrows from: 098, 152 (name above, value below).
- Files: `Session.tsx` (markup of `.readout`), `sessionV2.css`.
- Proof: `session.test.tsx` and `sessionSets.test.tsx` pass. A Playwright check that the unit and the number share a baseline (their bottoms differ by 4 px or less). `noVerdict.test.tsx` passes. Fix the plural: "1 rep", "1 hold".
- Limits: 10 (the caption "estimated angle, not a medical measurement" stays in the same block as the number), tabular figures, 72 px.

```
| Knee bend            Reps            |
| 126 degrees          0 reps          |
| (72 px)  (21 px)     (72)  (21)      |
```

#### A3. Setup camera: the step card and the leg labels
- Screen: Setup camera, before start and running.
- Before start, before: a grey empty box, 300 px high, "Your camera view shows here."
- Before start, after: the step card of 072. The frame area holds the first state line and one help line. Example: line 1 "Camera is off" and line 2 "Press Start camera. The app asks for the camera." The text comes from `setupView.ts`. New keys use only state words that exist today: "Asking for the camera", "Starting the camera", "Loading the pose model", "Looking for your leg".
- Running, before: heading, notice, six dashed chips.
- Running, after: the camera with the status chip (A4). The labels Hip, Knee and Ankle sit on the picture with elbow leader lines (152). Under it are one state card with a state line and a help line, and two groups. The "Not seen" rows come first, then one "Seen" row (U19 order stays). A lost joint gets "Ankle not seen" at its last place (U2).
- Borrows from: 072, 152, 079, U2, U19.
- Files: `Setup.tsx` (camera branch), `BodyMap.tsx` (labels and leader lines drawn in the SVG), `setupView.ts`, `SetupStateCard.tsx`, `sessionV2.css`.
- Proof: `setup*.test.tsx`, `bodyMap*.test.tsx` pass. New test: a frame with ankle visibility 0.3 gives the label "Ankle not seen" and a dashed ankle. Screenshots before and after Start camera.
- Limits: 4 (no new clinical text), 5 (the overlay is SVG, no canvas, no pixel read), hard limit 8 (white trace, dark halo), 6, 10. Label text is 18 px weight 700 on a dark chip. Labels show on Setup only. Session shows one label.

```
+--------------------------------------+
| Set up the camera            [Cancel]|
+--------------------------------------+
| CAMERA 390 x 292                     |
|    o hip ---- Hip                    |
|     \                                |
|      o knee --- Knee                 |
|       \                              |
|        . ankle ---- Ankle not seen   |
| (o) Looking for your leg    chip     |
+--------------------------------------+
| Whole leg not in the frame           |  state line
| Step back until hip to foot shows.   |  help, muted
+--------------------------------------+
| Not seen                             |
|  - Leg big enough in the frame       |
|  - Side-on to the camera             |
| Seen: person, hip, knee, ankle       |
+--------------------------------------+
| [        Start exercise        ]     |
+--------------------------------------+
```

#### A4. Status chip with a label swap
- Screen: Setup camera, Session start step.
- Before: dashed pills and a plain line.
- After: one chip with a shape and one word. The word swaps with a 180 ms opacity and 2 px blur, only when the check changes (`--t-swap`). Reduced motion: opacity only.
- Borrows from: 079, 072, U10.
- Files: `StatusLine.tsx`, `Setup.tsx`, `Session.tsx`, `sessionV2.css`.
- Proof: a unit test that the chip text equals the first failed rule of `ruleRows`. A reduced-motion test (no transform, no filter). The `role="status"` stays.
- Limits: 2 (no sound), 11. The chip never uses colour as the only signal. The shape is an icon.

#### A5. Recording bar
- Screen: Session.
- Before: Stop (dark) and Knee gave way or hurts in a 97 px bar. The third button "Count this rep" makes a second row.
- After: Stop is a wide dark pill with the square icon. "Knee gave way or hurts" has an indigo outline and an icon. "Count this rep" sits on top as a full row only for the leg raise. At a height of 41 rem or less the buttons are 56 px high.
- Borrows from: L4, 071.
- Files: `Session.tsx`, `sessionV2.css`.
- Proof: R3-03 passes. A screenshot of Straight leg raise at 390 x 844 shows the bar and the numbers in the first view. The bar is 97 + 72 + 12 = 181 px, so its top is y 663. The numbers row ends at y 628.
- Limits: 6, 10. No Pause button (see section 4.1).

#### A6. Camera error in the frame
- Screen: Setup camera and Session.
- Before: a notice and a button above the picture.
- After: the frame shows an icon, a title that says what happened, one sentence with the fix, and one retry button. The words are the existing strings ("Camera access was blocked", "No camera was found").
- Borrows from: 156, 121.
- Files: `Setup.tsx`, `Session.tsx`, `sessionV2.css`.
- Proof: `camera-denied.spec.ts` and `camera-none.spec.ts` pass. A screenshot of both states.
- Limits: 1 (no red), 6, 10.

#### A7. Session on a laptop
- Screen: Session, 1280 x 800.
- Before: readings left, camera 330 px right.
- After: camera left at `minmax(0, 7fr)`, readings right at `minmax(18rem, 5fr)`. The status slot is under the camera. The bar buttons sit at the bottom of the right column.
- Borrows from: brief 7.5.
- Files: `Session.tsx` (grid classes), `sessionV2.css`.
- Proof: screenshot at 1280 x 800 and 1024 x 768. No sideways scroll at 320 px.
- Limits: line length under 60 characters.

#### A8. Clipped angle label on the picture
- Screen: Session and Setup camera, phone.
- Before: "126° estimated ang" is cut (D3).
- After: the label wraps to two lines and stays inside the frame. It keeps the words "estimated angle".
- Files: `BodyMap.tsx`.
- Proof: `bodyMap*.test.tsx` pass. A Playwright check that the label box is inside the video box at 360 and 390 px.
- Limits: 10.

### Package B: Home, Setup guide, Red flag, Summary, pain

#### B1. Home
- Screen: Home.
- Before: tinted card, rows with a full-width Start, a second camera card, facts, decisions.
- After: one tinted card for the first exercise. Other exercises are list rows with the dose and a 48 px Start pill at the right. Facts are one definition list. The second camera card becomes one row "Use this phone as the second camera" in the facts list. The page has one heading level under "Home" ("Your exercises" stays as the list title, and the duplicate is removed).
- Borrows from: 064, 007, brief 7.1.
- Files: `Home.tsx`, `HomeExercises.tsx`, `flowV2.css`.
- Proof: `home*.test.tsx` pass. A screenshot at 390 x 844. Home is shorter by 200 px or more (READ today: 1.35 screens at 390 wide).
- Limits: 9 (no "Today" title), 6. Button names stay ("Start Heel slide").

```
+--------------------------------------+
| Home                                 |
| +----------------------------------+ |
| | Heel slide                       | |
| | 3 sets of 10 reps                | |
| | Limit 90 degrees                 | |
| | [          Start          ]      | |
| +----------------------------------+ |
| Straight leg raise  3 x 10  [Start]  |
| ------------------------------------ |
| Your protocol                        |
| Operated side ................ Left  |
| Active phase ..... 1, Protection     |
| Use this phone as second camera  >   |
| Decisions for your surgeon  10     v |
+--------------------------------------+
| [Home]    [Your sessions]  [My data] |
+--------------------------------------+
```

#### B2. Red flag: the state is always in view
- Screen: Red flag.
- Before: the block appears at the page bottom (D6).
- After: when a box is ticked, the sticky bar becomes the block: the triangle, "Stop. Do not exercise. Call emergency services now." and the button "Back to Home". The rows keep the whole-row tick of 56 px or more. The two group titles stay.
- Borrows from: 072 (state change of the box), brief 7.2.
- Files: `RedFlag.tsx`, `flowV2.css`.
- Proof: `redflag.test.tsx` passes. The e2e check at 390 x 844: after one tick, the block box is inside `window.innerHeight`. The "no tick is pre-set" check stays. Browser Back never opens Setup.
- Limits: 1 (indigo, not red), 6, 4. All strings stay as in `RedFlag.tsx`. The block text is not shortened.

```
| [x] Sudden shortness of breath ...   |
| [ ] Your kneecap moved out ...       |
+--------------------------------------+
| (!) Stop. Do not exercise. Call      |
|     emergency services now.          |
| [ Back to Home ]                     |
+--------------------------------------+
```

#### B3. Setup guide: one drawing, six steps
- Screen: Setup guide.
- Before: two question blocks, two drawings and six text cards in a long scroll.
- After: the two leg questions are two segmented controls side by side (Left, Right). Then one drawing and "Step 2 of 6" with its title and its text. Back and Next buttons, and a row of six numbered step buttons. The part of the drawing for the current step has a 3 px primary stroke. The rest is at 50 percent. A text button "Show all steps" lists all six texts. "Next: set up the camera" stays as the last action.
- Borrows from: U13, U14, 092.
- Files: `SetupGuide.tsx`, `StepGuide.tsx`, `GuideFigure.tsx`, `figures.css`, `flowV2.css`.
- Proof: `setupGuide.test.tsx`, `guideFigure.test.tsx`, `legChoice.test.tsx` pass. The step texts are the texts of today with no change (a test compares them). The page is 1.3 screens or less at 390 x 844 (today 3.1). axe shows 0 violations. The legend text follows the leg answer.
- Limits: 4 (texts unchanged), 6, 11 (no autoplay).

```
+--------------------------------------+
| Set up the camera            [Cancel]|
| Which leg      [ Left ][ Right ]     |
| Camera side    [ Left ][ Right ]     |
| +----------------------------------+ |
| |  drawing, part 2 in a bold line  | |
| +----------------------------------+ |
| Step 2 of 6: Leg and camera          |
| Your operated leg is the leg ...     |
| [ Back ]  (1)(2)(3)(4)(5)(6) [ Next ]|
| Show all steps                       |
+--------------------------------------+
| [   Next: set up the camera   >  ]   |
+--------------------------------------+
```

The Back and Next pair is 48 px each. The six step buttons are 48 px wide at 390 px only if they sit in a second row. Use two rows.

#### B4. Summary: stat lines
- Screen: Summary.
- Before: two white cards, a set line, a note.
- After: two stat lines side by side. A small grey label above, the number at `--step-4` weight 800 and the unit small on the baseline. Under them the sets as grey rows with the count at the right. The note "No repetitions were counted." stays as a plain line.
- Borrows from: 007, 098.
- Files: `Summary.tsx`, `flowV2.css`.
- Proof: `summary*.test.tsx` pass. `summaryUnits.test.tsx` passes. "estimated angle, not a medical measurement" stays next to the angle.
- Limits: 10, 9 (the brief text "(not a measurement)" is NOT used).

```
| Summary                              |
| Reps counted      Highest knee bend  |
| 10 reps           135 degrees        |
|                   estimated angle ...|
| Set 1 ............................ 10|
```

#### B5. Pain: a big read-out above the 11 pills
- Screen: Summary, Session rest panel.
- Before: 11 pills in two rows, the chosen one in ink.
- After: the same 11 radios. Above them a read-out shows the chosen value at `--step-4` with "out of 10", or the words "Not answered" before a choice. The pills keep 48 px or more. The chosen pill has an ink fill and a 3 px edge. "No pain" and "Worst pain" stay under the ends.
- Borrows from: 098, 112 (value pill only).
- Files: `PainScale.tsx`, `flowV2.css`.
- Proof: `summaryPain.test.tsx` (11 radios), `sessionPain.test.tsx` and `summaryPersist.test.tsx` pass with no change. The e2e R3-03 passes. A new test: no radio is checked at the start and the read-out says "Not answered".
- Limits: 7 (11 radios, none pre-selected), 6, FR12 (pain 7 pauses, the floor of 7 is a proposal that needs clinician review). A range input is rejected (section 4.1).

```
| How much pain do you have now?       |
| 6 out of 10                          |
| [0][1][2][3][4][5]                   |
| [6][7][8][9][10]                     |
| No pain                   Worst pain |
```

#### B6. Swelling as a segmented control
- Screen: Summary.
- Before: three full-width rows.
- After: one segmented control of three radios. The chosen segment is filled with ink. The cells are 64 px high and can wrap to two lines. The names stay ("No swelling", "Some swelling", "More than before").
- Borrows from: 112, 053.
- Files: `Segmented.tsx` (a wrapper that styles the radios of `SwellingChoice` through the root class), `Summary.tsx`, `flowV2.css`.
- Proof: `summary.test.tsx` passes. Radios keep the same names and the same group. axe shows 0 violations.
- Limits: 6, 7 (no pre-selected value), 1 (no colour on the options).

#### B7. Save, Saving, Saved
- Screen: Summary.
- Before: "Save" and a chip "Session saved."
- After: the button keeps its width and swaps its label: Save, Saving, Saved. A polite status repeats it. Then Done.
- Borrows from: U9, microinteractions text swap.
- Files: `Summary.tsx`, `flowV2.css`.
- Proof: `summaryPersist.test.tsx` passes. A test for the three labels.
- Limits: 2, 11 (the swap happens after a press), no celebration.

### Package C: generator, pairing, Your sessions, My data, error, Load, Privacy

#### C1. Generator questions
- Screen: Onboarding.
- Before: small radio rows under a small title.
- After: the question at `--step-3`. Answers are full-width rows of 64 px, with the radio at the left and an ink edge when chosen. A step track of 11 short marks shows the position, with the text "Question 7 of 11". The sticky bar has Back and Next.
- Borrows from: 112 (segmented look), 007.
- Files: `Onboarding.tsx`, `StepTrack.tsx`, `screensV2.css`.
- Proof: `onboarding.test.tsx` and `e2e/generator.spec.ts` pass. The question strings are unchanged.
- Limits: 1, 6. The track shows the position in a form. It has no fill colour that changes and no percent (see section 8, the same rule).

```
| Question 7 of 11                     |
| [|][|][|][|][|][|][#][ ][ ][ ][ ]    |
| What was the date                    |
| of your surgery?                     |
| [ Date of surgery  mm/dd/yyyy ]      |
+--------------------------------------+
| [ Back ]              [ Next  > ]    |
```

#### C2. Plan result
- Screen: Plan result.
- Before: a stack of cards with a dose chip.
- After: one list for each phase. Each row has the exercise name at the left and the dose at the right ("2 x 10") at `--step-1`. The notes are grey lines under the row. "Why this plan" stays an accordion. The banner "Generated by the app from published protocols. Not approved by a clinician." stays at the top.
- Borrows from: 007, 064 rows.
- Files: `PlanResult.tsx`, `screensV2.css`.
- Proof: `planResult*.test.tsx` and `generator.spec.ts` pass.
- Limits: 4, 3.

#### C3. Your sessions
- Screen: Your sessions.
- Before: three chart cards, a table in each, no summary.
- After: a stat strip: label "Last peak knee bend", `135.2` big, "degrees" small, and the range line "1 session, 9 Nov 2026". A legend list of exercises with a session count and a rep count, no percent (117). Charts have no card and a tap sets one read-out line above the chart: date, value and the word "estimated". The empty state is a flat sunken block. It says "0 sessions" and "Start an exercise on Home". The raw number in the table cell is fixed (D4).
- Borrows from: 098, 117, 007, 075, 121.
- Files: `Dashboard.tsx`, `dashboard.css`.
- Proof: `dashboard*.test.tsx` pass. A test that no table cell has more than one decimal. Keep the table under each chart. Keep the camera error band and its legend.
- Limits: 9 (no range filter, no "Today"), 10 (the only source is the stored sessions). One series colour. No goal line. No up or down text.

```
| Your sessions                        |
| Last peak knee bend                  |
| 135.2 degrees                        |
| 1 session, 9 Nov 2026                |
| Heel slide .............. 1 session  |
| Straight leg raise ...... 0          |
| [ chart: thin line, band ]           |
| 9 Nov  135 degrees (estimated)       |
| table: date | angle                  |
```

#### C4. My data
- Screen: My data.
- Before: four bordered cards.
- After: three plain sections with one heading each: Export, Import, Erase. The Export button names the count ("Export 1 session"). After a download, the section says "File saved: <file name>" and the date. The Import drop area shows its states (idle, over, refused, read). Privacy notice and the care team file are rows at the end. The Erase section keeps its dialog.
- Borrows from: U18, U12, 156.
- Files: `DataScreen.tsx`, `ClinicianView.tsx`, `screensV2.css`.
- Proof: `dataScreen*.test.tsx`, `importOwnership.test.tsx`, `clinicianView.test.tsx` and `e2e/app-data.spec.ts` pass.
- Limits: 4 (the warning that the file holds health data stays), 5, 6.

#### C5. Confirm the plan and Update my plan
- Screen: Confirm plan, Update plan, Confirm the change.
- Before: text blocks. The text shows "(RANGE_SURGEON)" (D5).
- After: Confirm shows a "Before" and "After" row for each changed value, from `planView.ts`. The raw rule code is removed from the patient text. Update my plan uses the same compact questions as C1.
- Borrows from: 007.
- Files: `ConfirmPlan.tsx`, `UpdatePlan.tsx`, `src/lib/planView.ts` (line 125 only), `screensV2.css`.
- Proof: `confirmPlan.test.tsx`, `updatePlan*.test.tsx` pass. The pin for the old text is updated in the same commit. A test that no patient text matches `/[A-Z]{3,}_[A-Z]{3,}/`.
- Limits: 4, 10.

#### C6. Pairing, host and companion
- Screen: Pair host, Pair companion.
- Before: a long scroll with both QR blocks and a stepper of small dots.
- After: the host shows one step at a time. Step 1 shows the QR at 260 px and one line. A button "Next: scan the phone code" opens step 2. A status chip shows "Waiting for the phone". The companion has the same shape. The step list is a track of three marks with the current one named.
- Borrows from: 072, 079, 156.
- Files: `PairHost.tsx`, `PairCompanion.tsx`, `PairSteps.tsx`, `CompanionEntry.tsx`, `StepTrack.tsx`, `screensV2.css`.
- Proof: `e2e/pairing-app.spec.ts`, `setupSecond.test.tsx` and the pairing tests pass. No new network call (CSP unchanged).
- Limits: 5 (body points only, no video), 6.

#### C7. Error screen
- Screen: Error screen ("Screen not loaded"), also used for other state screens.
- Before: icon, title, a bordered notice, two small buttons, left aligned.
- After: one column, max width 28 rem, padding 24 px. The title is `--step-3`. The gap between title and text is 12 px and 40 px before the buttons. The title says what happened. The text says the fix. Try again is the primary button. Back to Home is the secondary.
- Borrows from: 121 (READ layout), 156, 075.
- Files: `LoadError.tsx`, `StateScreen.tsx`, `screensV2.css`.
- Proof: `loadError.test.tsx`, `appLoadError.test.tsx` pass. A screenshot at 390 and 1280 px.
- Limits: 1 (no red), 6. The strings stay as in `LoadError.tsx`.

#### C8. Privacy and Load
- Screen: Privacy, Load.
- Before: four cards (Privacy). A dropzone and two cards (Load).
- After: Privacy is four rows with an icon, one bold line and one grey line each. Load is three equal action rows: "Choose a file from your care team", "Create my plan", "Use this phone as the second camera". The dropzone opens when the first row is chosen, and a drop on the page still works.
- Borrows from: 064 file card, 007.
- Files: `Privacy.tsx`, `LoadProtocol.tsx`, `screensV2.css`.
- Proof: `privacy.test.tsx`, `load.test.tsx` pass. Button names stay ("I understand", "Create my plan", "Use this phone as the second camera").
- Limits: 4, 5, 6.

## 8. The "Hold still progress" bar

Question: the data-honesty audit marked `progress.capture-progress` ("Hold still progress") as REVIEW. Is it allowed?

Decision: it is a process indicator. It is allowed. It stays, with five conditions.

Why:
- The value is `view.capture.progress` from `src/lib/baseline.ts`. It is the fraction of the still time that the app needs to find the starting angle. The engineering time is a value of the app, not a clinical value and not a target of the person.
- It shows the state of the measurement that the app makes. It does not rate the person. It has no number, no percent and no goal.
- The rules do not forbid it. The ban is on a score, a goal, a streak and "a bar toward a goal" (brief section 10, FR23, NFR12). The app already has one bar of this kind that the user did not object to: the load of the pose model in Setup.
- The audit asks that "each REVIEW progress bar is a process or a clinician value. It never reads as a score" (`docs/ui-audit-honesty-plan.md` section 5). This bar passes the first half.

Conditions (each one is a test):
1. The label is a process name: "Hold still progress" (`CAPTURE_TEXT.progress`). No percent text.
2. The bar uses the ink and the primary token. It never changes colour when it is full.
3. When it is full, nothing happens except that the starting angle appears as text (`CAPTURE_TEXT.startingAngle`). No sound, no "done", no check mark.
4. It shows only while the app looks for the starting angle (`captureOn`). It lives in the status slot (A1), not on the picture.
5. It is thin (6 px) and under the line of text, so the text carries the meaning.

The hold meter of the seated hold (`.hold-bar` with "N of M seconds") follows the same rule. Its value is the clinician hold time. Condition 3 applies: when the time is full, only the existing cue changes. A person must still accept this bar in the checklist of `docs/ui-audit-honesty-plan.md` section 5. That is the user decision, and my advice is to accept it.

The step track of the generator (C1) and the pairing steps (C6) are position marks of a form. They are not progress toward a goal. They have no fill that changes colour and no percent.

## 9. Order of the build

1. Step 0 (extract `SetupGuide.tsx`). It takes less than one hour.
2. A, B and C in parallel. Each starts with its first item. A1 first (it fixes D1 and D2), B3 and B1 next, then C3 and C1.
3. Each package ends with screenshots at 390 x 844 and 1280 x 800, light and dark, for each changed screen, into `uiv2/after/`.
4. The lead retires the dead `.capture-line` rule and its pin, and the two other dead rules, in one cleanup commit. No other task edits `styles.css`.
5. Gates of the brief section 12 apply: G1 and G2 (viewport), G3 (axe, 48 px, CSP), G4 (`claims-check.sh` and unit tests), G6 (a real phone). G6 is still not run.

## 10. Gaps in this plan

- I looked at 25 side-by-side sheets. I did not open every dark and laptop image. The dark theme and the laptop layout are checked for 4 and 1 screens.
- The rest panel (U8), the drop area states (U12) and the camera denied states were not screenshotted in this round. The audit baseline has the last two.
- The numbers in section 5 use the measured heights of the current build (banner 56, bar 97, title row 48). The 80 px slot, the 104 px numbers row and the 64 px ruler are OWN estimates. The tests of section 5 decide.
- The camera height at 360 x 640 is 188 px. No real leg was tested at this size. Gate G6 stays open.
- The `modern-web-guidance` search was not run. `:has()` is used in two rules. It is Baseline since 2023. If the user needs older browsers, the Session title row moves into `Session.tsx` instead.
- Clinical values in this plan: none. Every value on screen comes from the protocol, the stored sessions or the pose pipeline.
