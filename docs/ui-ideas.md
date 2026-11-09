# UI ideas from the designeer.xyz collection

Date: 2026-11-09. Status: design document. No code changed. This file judges the UI ideas that designeer.xyz collects, and keeps the ideas that make this app better. It does not judge the layout of the designeer.xyz site.

Inputs read before the verdicts: `docs/ui-design.md`, `research/ux-flow.md`, `docs/design-reconciliation.md` section 4, the guardrails skill, `docs/live-test/*.md`, `docs/audit-2.md` and `docs/accuracy.md`. I looked at 16 screens of the current app. They are Home, Red flag, the Setup guide, the Setup camera, the countdown and four Session states. The rest are hold, Summary with pain 7, Summary saved, Progress, My data and two generator screens.

Skills loaded with the Skill tool: `frontend-design:frontend-design`, `emil-design-eng`, `apple-design`, `animate`, `animation-performance`, `wada-ui-palettes`, `dataviz`, `web-design-guidelines`, `owasp-security`, `simple-english:simple-english`, `anti-slop-code:anti-slop-code`. The `web-design-guidelines` skill wants a fetch of its rules for a code review. This file reviews no code, so I did not fetch them.

## 1. What I collected

Scratch folder (not in the repo): `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/designeer2/`. It holds `index.tsv`, `raw/details.json`, 163 posters, 14 contact sheets, 24 videos with frame sheets, and 23 screenshots of linked sites.

How the site pages the list: the page `/finds` loads 24 finds. More come from the public JSON endpoint `/api/catalog?finds=1&limit=24&cursor=<nextCursor>`. The endpoint `/api/catalog?find=<slug>` gives the detail of one find. I paged with 0.8 s pauses until `nextCursor` was empty. The result is 163 finds in 7 pages. That is the whole collection on 2026-11-09, not a first page.

| Item | Count |
|---|---|
| Finds collected (title, caption, author, tags, palette, source link) | 163 |
| Posters downloaded and viewed on contact sheets | 163 (150 video posters, 13 still images) |
| Videos downloaded, 6 frames each read by eye | 24 |
| Inspiration items listed by name | 138 |
| Resources items listed by name | 206 |
| Tools items listed by name | 161 |
| Linked sites rendered with Playwright Chromium and read by eye | 14 pages on 11 sites |

Category tags of the 163 finds. One find can have more than one tag. 9 finds have no tag.

| Tag | Finds | Tag | Finds |
|---|---|---|---|
| Motion | 149 | Typography | 3 |
| Interface | 19 | Branding | 3 |
| Landing page | 15 | Icons | 2 |
| Logo | 6 | Prototype | 2 |
| Illustration | 5 | Dashboard, Generative, Game UI, 3D | 1 each |
| Mobile app | 4 | | |

What the collection holds: mostly motion studies of single components (buttons, cards, loaders, uploads, 404 pages), art and posters, and landing pages. It holds no health or exercise app. About 30 finds carry a pattern that this app can use. The rest is art, branding or decoration.

Find key. The table in section 2 cites a find as F plus its index in `index.tsv`.

| Key | Author | URL |
|---|---|---|
| F004 | Nitish Khagwal | https://designeer.xyz/finds/nitishkmrk-2118623968630620318 |
| F007 | Damir Sokolovsky | https://designeer.xyz/finds/heydamir-2115063463063998736 |
| F019 | Amelia | https://designeer.xyz/finds/ameliascomputer-2111515301594419598 |
| F033 | Juliette | https://designeer.xyz/finds/shedsgns-2112046080510591293 |
| F037 | Emil Kowalski | https://designeer.xyz/finds/emilkowalski-2112146246299259017 |
| F047 | sucodee | https://designeer.xyz/finds/sucodeee-2111410340995199367 |
| F072 | sanyam | https://designeer.xyz/finds/sanyampunia-2111045581410046405 |
| F075 | Flo | https://designeer.xyz/finds/flohoeller-2110693194384163100 |
| F092 | Irfan Ali | https://designeer.xyz/finds/irfannnnali-2109792475241972179 |
| F098 | Lorenzo Cabra | https://designeer.xyz/finds/cabralorenzo-2111060860508483671 |
| F118 | Cole | https://designeer.xyz/finds/colderoshay-2101679582734872751 |
| F121 | Aniket Pawar | https://designeer.xyz/finds/alaymanguy-2108897388635242916 |
| F144 | Shahid | https://designeer.xyz/finds/shahidux-2107353315973665239 |
| F149 | sanyam | https://designeer.xyz/finds/sanyampunia-2107751843409580105 |
| F152 | Hosein | https://designeer.xyz/finds/hoseinbagh3ri-2107761492292477428 |
| F156 | Elia | https://designeer.xyz/finds/eliakuratli-2107743325294068148 |
| F157 | Tenor | https://designeer.xyz/finds/tenordesign-2108631946985386115 |
| F159 | Dhruv | https://designeer.xyz/finds/dhruvtwt-2108468660788691370 |

Linked sites used: microinteractions.dev (Juan Di Nella), https://evilcharts.com/, https://inclusive-components.design/tooltips-toggletips/, https://component.gallery/components/empty-state/, https://www.tremor.so/docs/visualizations/tracker, https://number-flow.barvian.me/, https://60fps.design/apps/runmo, https://easingwizard.com/, https://lawsofux.com/. The sound libraries `@web-kits/audio`, soundcn and cuelume are named in the Tools and Resources lists. I did not open them.

The posters and videos are the work of other people. They stay in the scratch folder. No file of them enters the repo. Every idea below is a pattern in my own words, not a copy of artwork.

## 2. Ideas to adopt or to test

Verdict A means ADOPT. Verdict E means ADOPT AS AN EXPERIMENT. The gate of an E idea is a measurable test, and the idea ships only when the gate passes. Costs are estimates of new source code, not measured.

| Id | Source | Pattern | Screen | Problem it solves | Cost | Risk | Verdict | Gate |
|---|---|---|---|---|---|---|---|---|
| U1 | User reference apps (drawing only), F152 Hosein, F144 Shahid | Body map: a line drawing of both legs on the camera picture. The chosen leg is bold, the other leg is thin and dashed. Section 4 | Setup camera step, Session | Wrong leg gave 0 reps on clip 01 and 4 on the other leg (`docs/accuracy.md`). The person cannot see which leg the app follows | About 3 kB source, SVG, no package | Frame rate. Visual noise for an anxious person | E | Section 4, gates G1 and G2 |
| U2 | F152 Hosein (numbered labels on thin leader lines) | A lost joint gets a label with a leader line, for example "Ankle not seen", at its last known place | Setup camera step | Setup says "not seen" but not where (brief, L1-05) | Part of U1 | Label covers the leg | E | Same as U1 |
| U3 | F098 Lorenzo Cabra (one large number, small label, one card) | Session at 390 x 844 shows the camera, the rep count and the angle in the first view | Session | On a phone the camera frame is below the fold, so a wrong leg stays unseen (current `s2-live` shot) | CSS grid, about 60 lines | Numbers get smaller | E | Playwright at 390 x 844: camera frame, count and angle all inside the viewport, and both numbers at 72 px or more |
| U4 | F098 Lorenzo Cabra, `apple-design` type rules | Live numbers use tabular figures and a fixed width of 3 ch, right aligned. The unit sits on the baseline and does not move | Session, Summary | The unit "degrees" jumps left and right as the angle goes from 0 to 107. The shot also shows "1 reps" | About 15 lines CSS and one plural fix | None found | A | |
| U5 | F149 sanyam (abacus count) | One row of pips, one pip for each prescribed rep of the set. A counted rep fills a pip | Session | The person stands side-on and cannot read "Reps in this set: 2 of 10" in small text | About 40 lines | Reads as a goal | E | Guardrail review passes. In a test with 5 people at 2 m, 4 or more read the reps left in 2 s. 0 of 5 call the row a goal, score or target |
| U6 | F004 Nitish Khagwal (progress inside a pill), F152 Hosein (segmented meter) | Hold meter: "3 of 5 seconds" in large text and one segment for each second of the clinician hold time | Session, seated hold | The hold screen shows only "0 holds". The person cannot see when to lower the foot | About 50 lines, plus elapsed hold time from `counters.ts` | Reads as a goal | E | Same guardrail review and 5-person test as U5. The hold restart cue clears the meter in the same frame |
| U7 | Tools and Resources lists (`@web-kits/audio`, soundcn, cuelume), F118 Cole (button with sound) | A short soft tone for each counted rep, through the existing Web Audio code | Session | A counted rep makes no sound (live test 1, row 28). `research/ux-flow.md` 8.3 asks for "A short tone" | About 20 lines in `sound.ts`, no package | Confused with the alert beeps | E | 5 of 5 people tell the rep tone, the near-limit beeps and the over-limit beep apart after one listen. Mute stops all three |
| U8 | F156 Elia (the result replaces the panel content) | Between sets a rest panel replaces the live card: "Set 1 of 3 finished. 10 reps." The pain question and "Start next set" follow | Session | In `s5-set-complete` the live angle card stays under the notice, so the screen mixes rest and live data | About 40 lines | None found | A | |
| U9 | microinteractions.dev "Text swap button" (220 ms, ease-out-quint), F019 Amelia (loading state) | A button keeps its width and swaps its label: "Start camera" to "Starting the camera" | Setup, Summary, My data | The camera takes 1.0 to 2.2 s to start (live test 1, row 9). No feedback shows in that time | About 30 lines, one CSS class | A label that changes and confuses | A | |
| U10 | F047 sucodee (the label names the step), F157 Tenor | A status line names the current start step: "Asking for the camera", "Starting the camera", "Loading the pose model", "Looking for your leg" | Setup, Session | Session shows "Waiting for the camera." with no reason when the start is slow | About 30 lines | None found | A | |
| U11 | F159 Dhruv, F121 Aniket Pawar (line drawing, title, one sentence, one button) | An error screen for a screen that does not load: icon, title, one sentence, "Try again" and "Back to Home" | All lazy screens | A chunk that does not load blanks the whole app (L2-02) | About 50 lines, one error boundary | None found | A | |
| U12 | F072 sanyam (a drop area that shows each step) | Drop area states: idle, file over the area, refused with the accepted type, read with the file name and size | Load plan, Import, Care team file | Errors show apart from the drop area, and a file over the area gives no sign | About 60 lines CSS and state | None found | A | |
| U13 | F092 Irfan Ali (one drawing, numbered steps, back and next) | The position guide becomes one drawing and six steps. Each step marks one part of the drawing | Setup guide step | The guide is a long scroll of two drawings and six cards. The sticky bar covers content on a short phone (`ui-design.md` section 10) | About 120 lines | A step that the person does not open | E | At 390 x 844 the guide fits in 1.2 viewports. "Show all steps" lists all six texts. 4 of 5 people say where the camera goes after the guide |
| U14 | F152 Hosein (numbered callouts) | Labels in the guide drawing become numbers on thin leader lines. The numbers match the steps of U13. The leg label reads "Chosen leg" | Setup guide, Home hero | Labels float near the shapes. The label says "Operated leg" when the person chose the other leg (L1-06) | About 40 lines in `GuideFigure.tsx` | None found | A | |
| U15 | F098 Lorenzo Cabra (range subtitle, first and last date only, focus shows one column), F007 Damir Sokolovsky (plain labels, no decoration) | Chart cards: title, range line, x axis with the first and last date only, 3 y ticks. Focus or tap on a point shows "6 Nov, 80 degrees" | Progress, Care team view | Date labels crowd and overlap at 390 px (`08-progress-many`). The chart has no hover layer (`dataviz` skill) | About 80 lines | None found | A | |
| U16 | Evil Charts (hatched and dashed marks, encoding without colour) | A light band of the camera margin around the peak-angle line, with the text "Camera error about 9 degrees (start value, not verified)" | Progress, Care team view | A rise from 49 to 91 reads as steady gain. `ux-flow.md` 3.4 says a change smaller than the error is not a change | About 30 lines, uses `MARGIN_DEG` | The band reads as a target range | A | |
| U17 | F033 Juliette (ease against spring), F037 Emil Kowalski (sheet), microinteractions.dev timings, `animate` skill | One set of motion tokens. No bounce. Reduced motion keeps short opacity changes and drops every movement | All | Durations sit in many places. The current reduced-motion rule turns all motion off, including fades that help | About 25 lines CSS | None found | A | |
| U18 | F156 Elia ("Send to 2 people", then a result panel with Done) | The button names the count: "Export 3 sessions". After the action the panel says what happened, with the file name | My data, Summary | Export and Save confirm with a small chip only | About 30 lines | None found | A | |
| U19 | F075 Flo (the group that needs action comes first, then the rest) | Setup rules: rules that are not seen come first. Seen rules join one line | Setup camera step | The rule "Leg held still: not seen" sits under the sticky bar in `phone-heel-slide-camera-running` | About 25 lines | Rule order jumps | A | |

### 2.1 Build specs

Tokens are the ones of `docs/ui-design.md` section 4. New tokens are named below.

U3. Phone portrait under 600 px: the camera frame is first, at `height: 42svh`, with `object-fit: contain`. Under it is one card with two columns: count on the left, angle on the right. Each column has a small label above the number ("Reps", "Knee bend") and the number at `--step-hero`. The angle label line "estimated angle, not a medical measurement" stays under the angle in `--step-m1`. The gauge moves under the card. The cue banner and the fixed bar do not change. Laptop: the camera stays left and the card stays right.

U4. `.live-number { font-variant-numeric: tabular-nums; min-width: 3ch; text-align: end; line-height: 1; letter-spacing: -0.02em }`. The unit is a separate span with `align-self: baseline`. Fix the plural: "1 rep", "2 reps", "1 hold".

U5. The row holds `repsPerSet` pips. Each pip is a 14 px circle with a 2 px `--edge` ring. A counted pip fills with `--primary`. Fill change: background-color 120 ms `--ease-out`. More than 15 prescribed reps: no pips, text only. The last pip has the same style as the others. No word, colour or sound changes when the set ends, except the existing set notice. `aria-hidden="true"`, because the text "Reps in this set" stays.

U6. Text "3 of 5 seconds" at `--step-3`, tabular. Under it, one segment for each second of `holdSeconds`. A segment is 24 x 10 px, gap 4 px, `--sunken` empty, `--primary` filled. A segment fills at each whole second. No smooth sweep. The hold restart cue empties all segments at once. Over 10 seconds of hold: text only. The counter must expose the elapsed hold time. Today the screen has no such value.

U7. One sine tone at 523 Hz, 90 ms, gain 0.12, attack 5 ms, release 60 ms. The near-limit cue stays two 330 Hz beeps. The over-limit cue stays one 660 Hz beep. The rep tone is quieter and shorter than both. No AudioContext before a press, as today.

U8. States: live, rest, all sets finished. Rest panel content: title "Set 1 of 3 finished", line "10 reps", the existing pain question, primary "Start next set". Stop and "Knee gave way or hurts" stay in the fixed bar in every state. The panel swaps with an opacity change of 160 ms. Focus moves to the panel title.

U9. A `.btn-swap` class keeps `min-width` at the widest label. Old label out and new label in: opacity 160 ms `--ease-out`. Labels: "Start camera" to "Starting the camera". "Save" to "Saving" to "Saved". "Export 3 sessions" to "File saved". The button is disabled while it works. A polite live region repeats the new label.

U10. One line under the camera frame, `role="status"`, a static Lucide icon (`camera` or `scan`) and the text of the step. The text changes when the step changes. No animated dots and no spinner. After 8 s on one step, add one sentence: "This takes longer than usual. Keep this page open."

U11. A React error boundary around each lazy screen. Content: Lucide `cloud-off` icon at 48 px, `h1` "This screen did not load.", the sentence "Check the internet connection, then try again. Your saved sessions stay on this device.", primary "Try again", secondary "Back to Home". Focus goes to the `h1`. No motion.

U12. States and text. Idle: dashed 2 px `--edge`, "Drop the plan file here, or choose a file". File over the area: solid 2 px `--primary`, `--primary-soft` fill, "Drop to open". Reading: "Reading plan.json". Refused: strong indigo notice in the area, "The app opens JSON plan files only." Read: "plan.json, 4 KB" and the next action. The change between states is background-color and border-color, 120 ms. No green and no red.

U13. Steps for each exercise: 1 Camera place, 2 Body position, 3 Leg position, 4 Movement, 5 Your limit, 6 What the camera must see. Layout from the top: the drawing, then "Step 2 of 6" with its title, then two or three sentences. Under them are Back and Next buttons of 48 px and a row of six labelled step buttons. The current step marks its part of the drawing with a 3 px `--primary` stroke. The other parts stay at 50 percent opacity. No autoplay. A text button "Show all steps" lists all six. The step texts are the texts of today, unchanged.

U14. Callout numbers in 22 px circles, 1 px leader lines in `--muted`. The leg label reads "Chosen leg" from the leg answer, not from the protocol side. The `title` and `desc` of the SVG keep the step sentences.

U15. Card: title, then the range in `--muted` ("7 sessions, 1 Nov to 8 Nov"). X axis: first and last date only, format "1 Nov". Y axis: 3 ticks. One series in `--chart`. Tap, hover or arrow keys select a point. The selected point gets a 2 px ring. A tooltip shows date, value and "estimate". The other points fade to 40 percent opacity. The table under the chart stays.

U16. Band from value minus `MARGIN_DEG` to value plus `MARGIN_DEG` in `--chart` at 12 percent opacity. No border. Legend line under the chart. The band never carries the words "range", "target" or "normal".

U17. Tokens: `--dur-press: 120ms`, `--dur-swap: 160ms`, `--dur-dialog: 200ms`, `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`. Press: `scale(0.98)` on `:active`. Dialog: opacity and `scale(0.97)` to 1. No keyframes, no bounce, nothing over 300 ms. Under `prefers-reduced-motion: reduce`: no transform, opacity only, at most 120 ms. Hover effects only under `@media (hover: hover) and (pointer: fine)`.

U18. Export button label carries the count from the database. After the download starts, the export card shows "File saved: mpfl-export-2026-11-09.json" and the date of this export. After Save, the Summary card shows "Session saved" and the Done button. It does not show a celebration.

U19. Order: not seen, then seen. The seen rules join one row: "Seen: person, hip, knee and ankle, whole leg, side-on". The order changes at most once each 1 s, the same limit as the rule text, so the list does not flicker.

The generator screens already meet the questionnaire pattern, so they do not change. They have one question for each screen, "Question 2 of 11", and "Check your answers" before Make my plan.

## 3. Ideas rejected

| Source | Idea | Reason (limit broken) |
|---|---|---|
| User reference physiotherapy apps | A score and the text "perfect form" | No score or grade of form. No verdict words |
| 60fps, Runmo "Distance Wheel Fill" | Ring toward a total with "101% of goal" and "Milestones" | No goals and no milestones |
| 60fps, Runmo ECG screen | Ranges named "Untrained" to "Elite" in red | A grade and a verdict colour |
| Tremor Tracker | A row of day cells for the patient | Streak pressure: an empty cell reads as a missed day |
| F023 Deanmaj | Icon set with flame, trophy and rosette | Streak and badge symbols |
| NumberFlow, Rolling Number | Digits that roll to the new value | Motion that is not needed. At 15 to 30 fps a rolling digit is unreadable. A new package |
| F005 Manik, F008 Cristian Javier, F055 Basit A. Khan | Liquid glass and blur | Blur costs frame time next to the pose loop. Contrast changes with the background. Decoration |
| F158 Ann Nguyen, F162 David Haz, F111 Ashish | Holo cards, shader fills | Decoration. Shader code breaks the own-origin, no-script-from-elsewhere rule if taken from the library |
| F076 shawn., F085 Rajz, F131 jake.farmer | Text that scales, blurs or moves on scroll | Motion that is not needed |
| F105 Afnizar Nur Ghifari, F107 Ramin Nasibov, F128 Damir Sokolovsky | Celebration on dismiss, basketball upload, cookie games | Reward feel. The person can be in pain |
| F143 Nick "Squish switch" | Segmented control that bounces, green "On" | Bounce, and green as a state colour. Native radios already work |
| F053 daniel petho | Options as icons, label only on the selected one | Hidden words for an anxious person |
| F112 Adi | Tick ruler slider with a value bubble | Pain has no default value. A written surgeon limit needs exact typing |
| 60fps, Runmo "Days Counter" | Big minus and plus stepper | The limit is a written number. Typing is exact, 90 taps are not |
| microinteractions.dev | Hold to confirm | Stop and "Knee gave way or hurts" must act at once. A hold is hard in pain. The erase dialog exists |
| F067 sucodee | Six-box code input | The pairing code is a long pasted offer, not six digits |
| Inclusive Components toggletip | Hide "estimated angle, not a medical measurement" behind an info button | The guardrail asks for the label next to every angle |
| F047 sucodee, F157 Tenor | Animated dot icon, moving halftone | Motion that is not needed. U10 keeps the text only |
| F072 sanyam | Green tick and red edge on the drop area | Verdict colours. U12 keeps the states with neutral tokens |
| F092 Irfan Ali | "Play" that steps through the guide by itself | Motion that the person did not start |
| F079 withAnimation, F098 Lorenzo Cabra | Green, yellow, orange status dots, many-colour stacked bars | Verdict-like colours. One hue for each chart |
| F039 raw | A row of the last values on each card | It turns Home into a gain display. Progress already has the charts |
| 21st.dev, Motion Primitives, React Bits, Magic UI, Fontshare | Ready components and fonts from a library or a CDN | Content policy: everything from the own origin. No new package. Patterns only |

## 4. Body map

Verdict: E. It improves the leg check and the setup check, so it meets the condition of the user. It ships in Setup first, and in Session only after gate G1 passes.

What it must fix, with evidence:
- Wrong leg. Clip 01 gives 0 reps for the right leg and 4 for the left leg (`docs/accuracy.md`). Live test 1 issue L1-08 shows the note "The camera sees your other leg move more" on three clips. A bold line on a still leg while a dashed line moves shows this at a glance.
- Lost joint. The rule list says "not seen" and does not say which joint or where. Clip 08 gives angles of 92 to 134 that are not a knee angle. Lines that land on the wrong person show the cause.

The best examples are the physiotherapy apps of the user, F152 and F144. They use thin lines, round joints and one part drawn heavier than the rest. They add an arc at the measured joint and labels on thin leader lines. I take the drawing. I reject their score, their verdict text and their green and red joints.

Design:
- Technique: one inline SVG over the video, `aria-hidden="true"`, in a new component `PoseOverlay.tsx`. No canvas, so no pixel can be read back. The pose callback writes `x1`, `y1`, `cx` and `cy` attributes through refs. It does not set React state for each frame (`animation-performance` skill).
- Fit: the SVG has the same box as the video. Its `viewBox` is the video width and height. Its `preserveAspectRatio` matches the `object-fit` of the video (`xMidYMid meet` for `contain`). Not mirrored, as the preview.
- Bones drawn: hip to knee to ankle to foot of each leg, and hip to shoulder on the camera side for body direction. No face, no hands, no arms.
- Chosen leg: core stroke 4 px `#ffffff` over a halo stroke 10 px `rgba(18, 11, 10, 0.7)`. The halo keeps the line visible on any picture. One label "Chosen leg" at the middle of the thigh, `--step-m1`, white on a dark pill.
- Other leg: core 2 px white, dashed 6 4, over a halo of 6 px, at 70 percent opacity.
- Joints: circles of r 6 px at hip and ankle, r 9 px at the knee, with the same halo. The knee of the chosen leg has a `--primary` fill.
- Angle arc: at the chosen knee, radius 34 px, 3 px white with halo. It spans from the thigh line to the shank line. A short tick in `--accent-ink` on the halo marks the clinician limit when the protocol has one. The arc never changes colour. The over-limit alert stays the existing banner and beep.
- Low confidence: a joint below `MIN_VISIBILITY` (0.5) becomes a hollow dashed circle at its last place. Its two bones become dashed. After 1 s it goes away. In Setup, U2 adds a label on a 1 px leader line: "Ankle not seen", "Knee not seen" or "Hip not seen". The label sits on the inner side of the frame, away from the edge.
- No pose: nothing is drawn. The existing text "Step into the view." carries the state.
- Motion: points move with the data and have no transition. A CSS transition on a point lags behind the leg, so it is wrong here. No other motion.
- Control: a switch "Show leg lines" on Setup and Session, on by default, stored on the device. Reduced motion does not hide the map, because the map is data.
- Text: the rule list and the live region stay the main channel. The map adds where, not what.

Gates. Both must pass before Session uses the map.
- G1, frame rate. Use `app/scripts/clip-to-webcam.sh` on clips 01, 05 and 06. Run 60 s for each clip with the map on and with the map off. Run 3 pairs for each clip and change the order of each pair. Measure with the `requestVideoFrameCallback` wrapper of live test 1 (`T1/tools/fps.py`), with no polling and no screenshots. Pass: for each clip, the median fps with the map is at most 1 fps lower than without it. The p95 interval is at most 10 ms longer.
- G2, visible fault. Make 30 stills from the same runs. 10 stills have the right leg chosen on clip 01, which is the wrong leg. 10 stills have a lost ankle or knee, from the close-ups of clips 02 and 05. 10 stills are correct frames. Three people who did not build the map answer two questions for each still. The questions are "Is the bold line on the leg that moves?" and "Is a joint missing, and which one?". Pass: each fault is found in 90 percent or more of the answers. Also, fewer than 10 percent of the answers on correct frames name a fault.
- Unit tests first: a frame with knee visibility 0.3 gives a dashed knee and dashed bones. A frame with no pose draws nothing. The overlay never calls a frame API (`claims-check.sh` stays clean).

## 5. Build order

Other agents edit `src/ui` now. Each build agent starts from the current branch and checks for conflicts in its files before it starts. Write the tests first for each idea. Run only the test files of the changed screens, as `docs/ui-design.md` section 9 says.

| Step | Ideas | Files | Parallel | Tests first |
|---|---|---|---|---|
| 1 | U17 | `src/ui/styles.css` | Alone, first. Every later step reads its tokens | `tests/ui/styles.test.ts`: the tokens exist, no duration over 300 ms, reduced motion has no transform |
| 2a | U4, U8, U3, U5, U6, U7, U10 (Session part) | `Session.tsx`, `sound.ts`, `lib/counters.ts` (elapsed hold time), `styles.css` (session block only) | One agent, in this order. Parallel with 2b and 2c | `session.test.tsx`, `sessionSets.test.tsx`, `sessionSeatedHold.test.tsx`, `sound.test.ts`, `counters.test.ts`, `noVerdict.test.tsx` |
| 2b | U19, U10 (Setup part), U14, then U13 | `Setup.tsx`, `setupView.ts`, `GuideFigure.tsx`, `figures.css` | One agent. Parallel with 2a and 2c | `setup.test.tsx`, `setupView.test.ts`, `guideFigure.test.tsx`, `legChoice.test.tsx` |
| 2c | U11, U12, U15, U16, U18, U9 | `App.tsx` (boundary), `LoadProtocol.tsx`, `DataScreen.tsx`, `ClinicianView.tsx`, `Dashboard.tsx`, `dashboard.css`, `Summary.tsx` | One agent. Parallel with 2a and 2b | `appLoadError.test.tsx`, `load.test.tsx`, `dataScreen.test.tsx`, `dashboard.test.tsx`, `clinicianView.test.tsx` |
| 3 | U1, U2 in Setup | New `PoseOverlay.tsx`, `Setup.tsx` | After 2b | New `poseOverlay.test.tsx` (section 4) |
| 4 | U1 in Session | `Session.tsx` | After 2a, and only after G1 passes | Same test, Session case |
| 5 | Measurements | none in `src` | After 3 and 4 | Gates of U1, U3, U5, U6, U7, U13 |

Measurements that decide each experiment:

| Id | Measurement | Who runs it |
|---|---|---|
| U1, U2 | G1 and G2 of section 4 | Build agent (G1), three outside readers (G2) |
| U3 | Playwright bounding boxes at 390 x 844 for camera, count and angle, and computed font size of both numbers | Build agent |
| U5, U6 | Guardrail review of the screen, then the 5-person reading test at 2 m | Main session with the user |
| U7 | 5-person listening test of the three sounds, and the mute test | Main session with the user |
| U13 | Page height at 390 x 844 with Playwright, axe at 0, and the 5-person camera-place question | Build agent, then the user |

After each step, run `bash app/scripts/claims-check.sh app/src`, the type check and the lint. The pipeline runs the full suites.

## 6. Sources not reached

| Source | What happened |
|---|---|
| Mobbin | The search page for fitness apps gave "Page not found" without login. App screens need an account. Not used |
| 60fps.design | The Health and Runmo pages show 3 shot titles each, then "Unlock with PRO". I used only the visible titles and stills |
| GoodUI | A name and email wall. Not used |
| Pttrns | A consent dialog and an account wall. Not used |
| loading.dev | The designeer item page had no outbound link |
| The other section items | 505 items are listed by name. I opened 16 item pages and 11 sites, chosen for a health, tracking or dashboard app |
| Sound libraries | `@web-kits/audio`, soundcn and cuelume were not opened. U7 uses the existing Web Audio code |
| Videos | 24 of 150 videos were opened. The other 126 were judged from the poster, title and caption |
