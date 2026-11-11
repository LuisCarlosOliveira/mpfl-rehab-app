# Frame study of 8 designeer.xyz entries

Tags: READ means the value comes from real source (CSS, JS bundle, public JSON). SEEN means the value is an estimate from video frames. No value is marked READ without a source.

## Method and limits

- Source files: the earlier scrape in `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/designeer2/` (read only).
- Frame root: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiredesign/study/<idx>/`.
- Each folder holds 6 single frames `f0..f5` spread over the video (file name has the time in seconds). It also holds `sheet.png` (the 6 frames as a 3x2 sheet). Six entries also have `burst/` and `burst-sheet.png`. These frames have 100 ms to 200 ms spacing and a time stamp on each.
- I read the frames with the Read tool as the sheets, not one by one. Timing in ms is SEEN from the frame spacing of the burst sheets. Error range is about one frame gap (100 ms to 200 ms).
- The frames are in the scratchpad, not in the repo.
- Videos have 30 fps. The frames are scaled down (480 px or 320 px wide), so small text sizes are not measurable. I do not give font sizes as SEEN.
- Live source was fetched with static `curl` only. The files are in `.../uiredesign/dl/<name>/`. I did not run any of their code.
- Hits of the style check in this file are allowed inside URLs, paths, quoted CSS and quoted captions.

## Coverage of the brief

| Need | Entry |
|---|---|
| Big live number | 098 |
| Camera and skeleton labels | 152 |
| Status chips | 079 |
| Stepper and countdown | 072 (steps only) |
| Banner and toast | 075 (closest match, see gap) |
| Empty and error state | 121, 072, 075 |
| Chart and tracker | 098, 007 |
| Input control (scale, segmented) | 112, 098 |

Gap 1: no entry in the 24 videos is a true countdown timer. 072 shows steps as text swaps. Use it for the setup check steps only.
Gap 2: no entry is a true banner or toast. 075 and 079 give the closest ideas (inline status text, small label pill). The cue banner needs its own design.

---

## 098 Stacked bars with one large number (Lorenzo Cabra)

- URL: https://designeer.xyz/finds/cabralorenzo-2111060860508483671
- Linked site: https://bencho.dev (component "Stacked Bars", on the site as `stacked-bars`).
- What it is: a card with a title, a large total, a Day/Week segmented control, a stacked bar chart and a hover tooltip.
- Frames: `.../study/098/` (f0 to f5, `sheet.png`, `burst/`, `burst-sheet.png` at t = 12.9 s to 14.9 s).

Source status: bencho.dev is a Vite single-page app. The component code is in lazy chunks that I did not find by static fetch. The CSS of the component is NOT read. Only the registry size of the component is READ.

Values:
1. READ: component box in the bencho registry is 300 x 276 px (`"stacked-bars":{w:300,h:276}` in `https://bencho.dev/assets/index-Cg2ZONiB.js`).
2. READ: palette from public JSON: #EBEBED, #A8A8A8, #A284F2, #E4767A, #B8CCF3.
3. SEEN: the large number is the biggest text of the card, about 3 times the height of the "visits" unit text. The unit sits right of the number on the same baseline and is small and grey.
4. SEEN: the segmented control has 2 options. The active option has a white pill on a light grey track.
5. SEEN: when the user taps "Week", the number changes from 24,182 to 146,206 in about 700 ms (frames at 0.8 s to 1.5 s). Digits change one by one with a blur and fade. The unit text and sub-title change at the same time ("Last 20 days" to "Last 20 weeks").
6. SEEN: the bars reflow to new heights in about 600 ms after the tap. They do not move before the tap.
7. SEEN: on hover a bar column stays full colour. All other columns fade to about 30 % opacity. A tooltip card lists the parts with a colour dot and a number.
8. SEEN: the card is white with large radius and a very light shadow on a pale grey page.

Borrow:
- Session screen and Summary: one large number with a small unit next to it. The knee angle can use this layout.
- Number change: digit roll with a short blur only when a person acts (not on a timer).
- Progress screen: the Day/Week control for the chart range. The fade of other bars on touch can show one session.

Drop:
- The four bar colours (yellow, blue, purple, red). We use no red and no state colours. Use one hue with steps of lightness.
- The "Bounced" red part. It is a score-like signal.
- Hover tooltips. A phone has no hover. Use tap and a fixed read-out line.

---

## 152 Drone dock with numbered labels on leader lines (Hosein)

- URL: https://designeer.xyz/finds/hoseinbagh3ri-2107761492292477428
- Live: https://visor-chat-55910444.figma.site/
- What it is: an isometric drawing with 4 numbered labels on elbow leader lines, a live telemetry block and a segmented battery bar.
- Frames: `.../study/152/` (f0 to f5 over 20 s, `sheet.png`, `burst/` at t = 3.0 s to 5.0 s).

Source status: the live site is a React app. The JS bundle is a development build, so the SVG source is readable. I READ the label code in `https://visor-chat-55910444.figma.site/assets/index-H4vN_DGc.js` and `.../index-Cwt6hR56.css`.

Values (all READ unless marked):
1. Fonts: body "DM Sans", mono "IBM Plex Mono" (from the CSS). The drawing uses `font-mono`.
2. Label text: `fontSize` 8, `letterSpacing` 1, fill #b0b0bb. Text is upper case with the form "01 / ROTOR ARRAY".
3. Sub-label: `fontSize` 7, fill #666670 or #686873, for example "FOUR-POINT STABILIZATION".
4. Leader line: stroke #696974, `strokeWidth` .6, path with elbows (for example `M638 289h80v-55h40`), end dot `r` 2, fill #aaaab4.
5. Telemetry block: title "TELEMETRY / LIVE" fill #666670, rows "ALT", "ALIGN", "DOCK" with row gap 19 units. Row name fill #94949e, value fill #d0d0da. When live, the value turns the accent colour. Before live, the value is "—".
6. Accent colour: #0BA5EC (blue, for live values and the bar).
7. Large number: `fontSize` 28 for "12", then a "%" at `fontSize` 12. Fill #c1c1cb at rest.
8. Battery bar: 10 rects, each 5 x 16 units, step 8 units, off fill #35353f, on fill = accent. Under it a note at `fontSize` 7, fill #71717d.
9. Palette from JSON: #1A191E, #3C3A42 (dark grey page).
10. READ: the labels use `className "hidden sm:block"`, so they are hidden on small screens. The motion is a `requestAnimationFrame` loop. The author starts it by a key (Space or Enter calls the drone, P pause, L launch, R reset, from the `aria-label`).
11. SEEN: the live values change in steps. The "12 %" battery number goes to "100 %" over about 5 s to 8 s of video. The blue accent appears on the pad and values at the same time (0.2 s to 0.4 s).

Borrow:
- Session screen: numbered or named labels on thin leader lines with a small end dot, placed on the leg (hip, knee, ankle). Use 2 or 3 labels only.
- Session screen: a small mono read-out block (angle, rep). The name is grey and the value is light. One accent colour marks "live" values.
- Setup camera check: a segmented bar (10 steps) for "light" or "distance fit" without a score.
- Hint: the author hides labels below the `sm` size. On a phone we must keep labels, so make them larger.

Drop:
- 7 px and 8 px text. It fails the 2 m reading rule.
- The percent charge and "CHARGE COMPLETE" logic. It is a goal and a score.
- Autoplay. Nothing moves unless a person acts.
- The thin 0.6 stroke. Use a stronger stroke for a camera view.

---

## 079 Update status with a label pill (withAnimation)

- URL: https://designeer.xyz/finds/withanimationui-2111345464079790223
- What it is: an avatar with a status dot. A tap opens 3 round status buttons in a row. Each one shows a small text pill on hover (Focus, Do Not Disturb).
- Frames: `.../study/079/` (f0 to f5, `sheet.png`, `burst/` at 6 fps for 3 s).

Source status: no live link in the JSON. The X post is walled. No CSS is READ.

Values:
1. READ: palette from JSON: #F6F6F6, #2EBE4E, #2C2629, #96A555, #678757.
2. SEEN: the status dot is about one quarter of the avatar width and sits at the top right with a white ring.
3. SEEN: the dot grows into a row of 3 round buttons in about 170 ms to 330 ms (frames 0.5 s and 0.67 s). The buttons come out of the dot position.
4. SEEN: the text pill sits above the button under the pointer. It has white fill, small radius (pill shape), small shadow.
5. SEEN: the pointer moves to the next button. The text then changes with a short blur in about 170 ms (frames at 1.17 s, 2.0 s and 2.67 s). The pill moves with the pointer.
6. SEEN: the row closes after the choice, and the dot takes the new colour.
7. SEEN: the page is plain light grey. Only the avatar has a soft shadow.

Borrow:
- Status chips (for example "Camera ready", "Leg in view"): one small pill with one word. A tap opens the options. The text change uses a short blur.
- Red flag gate and Setup: the pill above the control as the name of the control.

Drop:
- Green, yellow and orange fills. Use grey, black and one neutral accent. Let the icon and the word carry the meaning.
- Hover. Use tap and show the pill after a tap.
- The avatar. Not needed.

---

## 072 File upload box that acts out each step (sanyam)

- URL: https://designeer.xyz/finds/sanyampunia-2111045581410046405
- What it is: a drop card with a folder icon and 2 lines of text. The text changes for each step: "not supported", "drop files to upload", "uploading 1 file 21 %, 48 KB of 230 KB", "1 file uploaded".
- Frames: `.../study/072/` (f0 to f5 over 20 s, `sheet.png`, `burst/` at 5 fps for 4 s).

Source status: caption says "live link" but the JSON has no link. The X post is walled. No CSS is READ.

Values:
1. READ: palette from JSON: #F6F6F7, #5483EB, #D9D9DB, #3863CE, #ACBCE1.
2. SEEN: the card has 2 border styles. A dashed grey border means "ready". A solid border means "something is on top of the card".
3. SEEN: the state text has 2 lines. Line 1 is dark (the state). Line 2 is small and light grey (the help or the numbers).
4. SEEN: text swap time is about 200 ms. Old text blurs out and new text blurs in (burst frames 0.2 s, 1.8 s and 2.8 s show a double image).
5. SEEN: in the error state "not supported" the line 1 text is dark red and the border is pink. Help line says what is supported.
6. SEEN: progress is a thin bar that runs along the card border (frames f2 and f4). It also shows as text: "45 %, 55 KB of 122 KB".
7. SEEN: the end state has a check mark in a dark circle in place of the file and a green border.
8. SEEN: a text line below the card, "or try sample files", is the only other element.

Borrow:
- Setup camera check: a step list as one card where the text changes for each step ("Step back", "Leg in view", "Ready"). The two-line form (state, then help) is good.
- Error and empty states: state in line 1, the fix in line 2 in grey. Wrong state uses a border style change (dashed to solid) and not a colour.
- Progress as a thin line on the card border for the setup wait.

Drop:
- Red text, pink border and green border. Use a stronger weight and an icon (cross or check) in black or grey.
- Drag and drop. Not a phone action.
- The check mark celebration. We show no celebration.

---

## 075 Agent inbox with status rows and empty column (Flo)

- URL: https://designeer.xyz/finds/flohoeller-2110693194384163100
- What it is: a board of 3 columns (Needs you, Running, Done) with cards. A card can expand to show a short history and 2 buttons (Reject, Approve or Retry). A List view and a dark theme exist.
- Frames: `.../study/075/` (f0 to f5 over 17.5 s, `sheet.png`, `burst/` at t = 4.2 s to 6.2 s).

Source status: no live link. X post walled. No CSS is READ.

Values:
1. READ: palette from JSON: #F9F9F9, #D8D8D8, #BCBCBC (light grey scale).
2. SEEN: each column has a small header in upper case with a count in a small grey pill (for example "NEEDS YOU 2").
3. SEEN: an empty column shows the count 0 and the grey text "Nothing here" on a flat, slightly darker block. No icon, no illustration.
4. SEEN: a card moves from one column to another in about 600 ms to 900 ms (burst frames 0.5 s to 1.3 s). The other cards slide to close the gap.
5. SEEN: a card shows an icon and a status word in the bottom row. Running has a spinner and a time ("3m 41s"). Failed has a filled round icon and the word "Failed".
6. SEEN: the expanded card shows a list of 3 or 4 lines with a time at the right ("6m ago", "now"). The last line is the current one.
7. SEEN: the primary button is black with white text. The secondary button is white with a thin border.
8. SEEN: the dark theme keeps the same layout. Cards are dark grey and the borders are thin.

Borrow:
- Empty state: one short grey sentence on a flat block with the count 0. No picture.
- Error state: status word plus an icon, then one clear button ("Retry"). Black primary button and white secondary button.
- Summary and Progress: a history list with the time at the right.
- A list of messages with a time ago, for the cue history of a session.

Drop:
- The green dot for Done and the red dot for Failed. Use text and shape.
- The running timer on each card. It moves without a person acting.
- The agent icons and model names.

---

## 121 404 page with a calm error message (Aniket Pawar)

- URL: https://designeer.xyz/finds/alaymanguy-2108897388635242916
- Live: https://motionvideo.xyz (the real 404 page is reachable at https://motionvideo.xyz/nopage-xyz).
- What it is: a dark page with a line drawing, one title, one short grey sentence and buttons.
- Frames: `.../study/121/` (f0 to f5, `sheet.png`).

Source status: the page is server-rendered. I READ the HTML and `https://motionvideo.xyz/assets/globals-BmSAISWA.css` (the files are in `.../uiredesign/dl/motionvideo/`).

Values (READ):
1. Title: `text-4xl font-semibold tracking-tight text-balance`. That is 2.25rem (36 px), line-height 2.5 / 2.25 (40 px), weight 600, letter-spacing -.025em.
2. Body text: `text-muted-foreground max-w-md text-pretty`. Max width 28rem (448 px). Dark theme colour oklch(70.8% 0 0).
3. Block gaps: title and text `gap-3` (12 px). Drawing, text and buttons `gap-10` (40 px). Page padding `px-6 py-16` (24 px and 64 px), centered, `max-w-3xl`.
4. Drawing box: `aspect-[5/4]`, `max-w-md`. A small mono label at the corner: `font-mono text-[11px] leading-none tabular-nums` (it shows "rest", "frame 2 · 1").
5. Colours: dark background oklch(14.5% 0 0), text oklch(98.5% 0 0). Palette from JSON: #0A0A0A, #272727, #585858.
6. Font: "Timeless Sans" variable font, weight 300 to 900 (a self-hosted file). Do not copy it. Use a system or open font.
7. Radius: `--radius` .45rem. Default transition .15 s with `cubic-bezier(.4, 0, .2, 1)`.
8. Button hover: `color-mix(in oklch, var(--secondary), var(--foreground) 5%)`, transition on colour only.
9. Copy: "This frame didn't render." and "The page you're looking for isn't in the cut. It may have moved, or the link is wrong."
10. SEEN: the drawing has 5 frames. One frame lights up in the second frame of the loop (frame 2 · 1) and one in the fourth (4 · 0). The step is about 2 s. It runs by itself in the video.

Borrow:
- Error and empty state layout: drawing, one title, one grey sentence, buttons. Gap 12 px and 40 px. Title 36 px is a good size for a phone-first error title. Weight 600 and tracking -0.025em.
- Text rule: say what happened in the title, say the fix in the sentence.
- Mono small label with tabular numbers for a code or a count.

Drop:
- The animated drawing loop. Nothing moves unless a person acts. Use a still drawing or none.
- The joke copy ("isn't in the cut"). Use plain words for a patient.
- Dark only. Our light theme needs its own check.

---

## 112 Age slider with ruler and pill label (Adi)

- URL: https://designeer.xyz/finds/adityasur11-2111389253913506294
- What it is: a face image that changes with the value and a black pill with "Age: N". Below is a ruler of ticks with a fixed centre mark. A Mono/Color segmented control is at the top right.
- Frames: `.../study/112/` (f0 to f5, `sheet.png`, `burst/` at 10 fps from 3.0 s).

Source status: no link. X post walled. No CSS is READ.

Values:
1. READ: palette from JSON: #FFFFFF, #171717, #777777, #969696, #D9D9D9.
2. SEEN: the ruler has many thin ticks of grey. The ticks near the centre are taller (a bump of height). Ticks far away are short and very light.
3. SEEN: the centre mark is a thin black vertical line, taller than any tick. It stays in place. The ruler moves under it.
4. SEEN: the pill above the ruler is black with white text, full radius, small text. The text is "Age: 5" to "Age: 71". It changes at every frame step of the drag, with no blur.
5. SEEN: during a drag of about 2 s the value goes from 9 to 47 (burst frames). One tick means one whole step.
6. SEEN: the segmented control "Mono | Color" has a black active pill with white text and a thin outline inactive pill.
7. SEEN: the face change is a fast cross fade, one frame step.
8. SEEN: the page is white with plain black and grey only.

Borrow:
- Summary pain input (0 to 10): ruler with fixed centre mark, tall ticks near the centre, black pill with the value ("Pain: 3"). The value is a whole number. A tap on a tick works too, so a drag is not the only way.
- Segmented control: black active pill with white text and a thin outline for the other option (also fits the Day/Week control in 098).
- Black and grey only fits our no-state-colour rule.

Drop:
- The face image (a rating by looks).
- Drag only. Add large tap targets and a "-" and "+" button for hands that shake.
- The tick bump animation if it is not needed (it moves while the finger moves, which is allowed, because a person acts).

---

## 007 Unslopping a dashboard (Damir Sokolovsky)

- URL: https://designeer.xyz/finds/heydamir-2115063463063998736
- What it is: a video of a dashboard that goes from a purple, glossy, emoji-heavy version to a calm dark one. Spacing labels (16, 20, 24, 36, 18, 32 px) show on the frames.
- Frames: `.../study/007/` (f0 to f5 over 9.8 s, `sheet.png`).

Source status: no link. X post walled. No CSS is READ. The pixel values below come from the labels drawn in the video frames, so they are SEEN (read by eye from the overlay text).

Values:
1. READ: palette from JSON of the first version: #11082F, #271B68, #5627A9, #7B63E8, #BA75F8.
2. SEEN: overlay labels show spacing of 16 px, 20 px, 24 px, 36 px, 18 px and 32 px between the nav parts. The final version uses a steady step (the nav rows are all the same height).
3. SEEN: the changes go in this order. Remove the gradient background. Remove the glow and the glass blur. Remove the emoji in labels. Replace the bright badges by grey text. Replace the bold greeting ("Welcome back, Damir!") by a plain month ("October 2026").
4. SEEN: cards in the final version have a thin border on a near-black fill. A small grey label sits above a large white number.
5. SEEN: the number "$124,860.40" keeps its large size in both versions. The green "+4.2% this month!!" text becomes small text ("4.2% up vs September").
6. SEEN: the bar chart (purple, rounded bars) becomes a thin line chart with a small axis. Lines keep a colour per series.
7. SEEN: the final nav has a grey count at the right of each row, no coloured badge.

Borrow:
- A checklist for our own screens: no gradients, no glow, no emoji, no coloured badges, no cheering text.
- Card pattern: small grey label above a large white or black number (Progress screen).
- Nav and list rows with the same height and a grey count at the right.

Drop:
- The line chart colours per series (rainbow). Use one hue and line style (solid, dashed) to tell lines apart.
- The green "up" text. It is a state colour and a goal signal.
- Dark theme only. Same as 121.

---

## Summary of what is READ and what is SEEN

| Entry | READ | SEEN |
|---|---|---|
| 098 | palette (JSON), registry size | number size, timings, bar fade, control look |
| 152 | fonts, label sizes, colours, line, bar sizes, keys (from JS and CSS) | live timings |
| 079 | palette (JSON) | all layout and timings |
| 072 | palette (JSON) | all layout, states, timings |
| 075 | palette (JSON) | all layout, move timing |
| 121 | all type, spacing, colour, radius, transition (CSS and HTML) | loop step |
| 112 | palette (JSON) | ruler, pill, timings |
| 007 | palette (JSON) | all, including the spacing labels read from the frames |

## Not done

- No CSS for 098, 079, 072, 075, 112 and 007 (no link, X post walled, or lazy-loaded chunk).
- Not all frames were read one by one. They were read as contact sheets.
- The entries 144, 004, 037 and the other videos were not studied in depth. I chose by caption and by a quick look.
- Not checked: licenses of the fonts and the drawings. Only the ideas are taken.
