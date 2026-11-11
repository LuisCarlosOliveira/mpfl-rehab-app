# UI redesign brief

Date: 2026-11-09. Status: brief only. No app code changed. The coordinator shows the picks to the user before any build.

This file answers one question. How must the MPFL rehab app look and move? A patient must use it on a phone, in pain, from 2 m away. It uses ideas from the catalog designeer.xyz. It never copies the look of that site.

Read first: `MPFL_APP_PLAN.md`, `docs/ui-design.md` (the design now in `app/src/ui/styles.css`), `docs/ui-ideas.md`. Evidence for this brief is in `docs/ui-redesign-survey/survey-log.md` (53 pages opened) and `docs/ui-redesign-survey/frame-study.md` (8 entries studied frame by frame). Screenshots and frames stay outside the repo, in the scratchpad folder `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiredesign/`.

Source marks used in this file:
- READ: the value comes from real CSS, source code, JSON or the app files.
- SEEN: the value is an estimate from a screenshot or a video frame.
- OWN: the value is a decision of this brief. It has no outside source.

## 0. What is wrong with the current design

I looked at the screens of the current design (`ui2/shots/b/phone/04-home.png` and `22-session-live.png`, in the scratchpad). The palette and the tokens work. The layout does not.

- Every screen is a stack of equal white cards with one radius. This is the SaaS card kit.
- On the live Session at 390 x 844, the camera frame starts below the fold, under the angle card and the cue text. The person cannot see which leg the app follows.
- The Home screen is a long scroll. The facts, the data tools and the surgeon list all weigh the same as the exercise.
- The warm pink paper background reads as pink to some people (`docs/ui-design.md` section 10).

Keep these parts: Figtree with tabular figures, the fluid type steps and the 48 px targets. Keep the strong indigo attention block, the native `dialog`, the banners and the no-state-colour rule.

## 1. Hard limits (the design must keep them)

Read from `MPFL_APP_PLAN.md` (FR23, NFR12, the banner rule) and `docs/ui-design.md`.

- No verdict words, no score, no goal, no streak, no celebration. No green and no red state colour.
- An in-range rep shows nothing and plays no sound.
- The app never changes the active phase silently.
- The prototype banner stays on every screen. Its two lines stay: "Prototype. Not for patient use." and "EXAMPLE, NOT APPROVED".
- Every clinical value needs clinician review. The app stores or sends no frame and no video.
- Everything loads from the own origin. No CDN font. No new package without vetting. The CSP stays as it is.
- The guard scripts (`app/scripts/claims-check.sh`), the axe tests and the unit tests keep passing.
- Touch targets are 48 px or more. Text contrast is 4.5 to 1 or more. Control edges are 3 to 1 or more.
- Nothing moves unless a person acts. Data that follows the body (the live angle, the skeleton) is the one exception, and it never animates by itself.

## 2. Survey summary

- 53 pages opened with a real browser (Playwright): 47 catalog entries and 6 live sites that entries link to. 53 screenshots saved. No entry was walled. 24 kept, 29 dropped (see the log).
- The catalog holds mostly motion studies of single parts. It holds no health or exercise app, no camera view with a body, no live counter and no true banner.
- 10 entries on the shortlist. 8 studied frame by frame (6 frames each, and burst frames for timing on 6 of them). Live CSS READ for only 2 sites (entry 152 and entry 121).

Shortlist of 10 (from the survey log):

| Rank | Entry | Idea |
|---|---|---|
| 1 | 156 | Error state with a plain failure line and one retry button. SEEN only. |
| 2 | 072 | Setup card that acts out each step. Two lines: state, then help. |
| 3 | 098 | Card with one large number, a small unit and a range control. |
| 4 | 117 | Legend list with a toggle for Progress. SEEN only. |
| 5 | 112 | Ruler with a fixed centre mark and a value pill. Pain input. |
| 6 | 084 | Dot-matrix numbers. SEEN only. Dropped, see the change list in section 4. |
| 7 | 079 | A status shape that opens and a label that swaps with a short blur. |
| 8 | 088 | Pull gesture to confirm. SEEN only. Dropped, see section 4. |
| 9 | 064 | Bottom tab bar on Home. SEEN only. |
| 10 | L4 (ocelli.app) | Recording bar with Pause, Stop and time. SEEN only. |

Studied frame by frame: 098, 152, 079, 072, 075, 121, 112 and 007. Two of the studied entries (075 and 007) are not on the shortlist of 10. The study agent picked them because they cover the empty state and the "remove the decoration" checklist. Entries 156, 117, 084, 088, 064 and L4 are SEEN from one screenshot only. This file marks them so.

## 3. Design plan (first pass)

Subject: a patient with a knee reconstruction does a guided exercise in front of a phone, 2 m away, side-on, sometimes in pain. The world of this app is the physiotherapy clinic. Its objects are the goniometer (a clear plastic protractor with a ruler arm) and the joint angle in degrees. Its other objects are a ruled paper chart and the pencil line of an anatomy drawing.

Colour (6 named values):
- Plaster `#ECEFF0`: the page. A cool light grey, like a clinic wall.
- Ink `#101C26`: text and drawing lines. A blue-black.
- Goniometer blue `#0872A0`: main action and chart mark 1.
- Night indigo `#2E3260`: attention, pause, emergency. A block with an icon and words.
- Ochre `#B07A00`: chart mark 2 only.
- Tape yellow `#FFD54A`: the line that traces the chosen leg on the camera picture. Always with a dark halo. It is a fixed colour and never a state.

Type (roles):
- One family: Figtree variable, self-hosted (READ: `app/src/ui/fonts/figtree-latin-wght.woff2`, OFL). Tabular figures for every number.
- Titles: weight 650 to 700, tracking -0.025em (READ from entry 121: weight 600, tracking -0.025em).
- Numbers: weight 800, tracking -0.03em (OWN), tabular, the unit small and on the baseline.
- Body: weight 500, tracking 0, line-height 1.5, line length under 60 characters.

Layout concept: "The viewfinder first". On Session, the camera fills the full width at the top, with no card around it. The two live numbers sit directly under it, side by side, on one ruled strip like the arm of a goniometer. The cue banner and the Stop bar come last. Other screens use one column of plain rows with thin dividers, not stacks of cards. Text is left aligned. Numbers align on their baseline. Wide screens use two columns: the picture left, the readings right.

Principles:
1. The live reading is the hero. Nothing sits between the camera and the numbers.
2. Structure shows meaning. A ruler appears only where the content is a scale: the knee angle, the pain value and the chart axis. It appears nowhere else.
3. Quiet by default. A rep in range shows nothing. Colour is rare, so the indigo block and the yellow trace stay readable.
4. Words and shapes carry state. Colour never carries it alone.
5. Four radii by rank, not one radius for everything.

## 4. Review of the plan against generic defaults

I tested the first pass against the five default clusters of the skill `frontend-design:frontend-design`, and I asked one more question. Is this the plan that I make for any health app?

| Check | Finding | Change and reason |
|---|---|---|
| Cream, serif, terracotta | Not present. But the current pink paper (`#fcf3ef`) is close to the cream default. | Plaster `#ECEFF0` replaces the paper. It is cool and neutral, and it fits a clinic. This is a decision for the user (section 11). |
| Near-black plus acid accent | The dark theme was near-black with one bright blue. Close to the default. | The dark theme keeps a blue-black ground (`#0E151B`) but uses a lighter blue mark for actions (`#4DB6E6`) and a pale lavender attention block. The ground is the same family as the light theme. No acid colour. |
| SaaS card kit | First pass kept one card for each Home row. This is the card kit. | Home becomes a list of rows with thin dividers. Only the active exercise gets a tinted panel. Session has no card around the camera. |
| Tracked all-caps eyebrow and mono labels | Entry 152 uses small upper-case mono labels. The first pass copied "name grey, value light". | Labels are sentence case in Figtree. No all-caps. No mono. The label sits above the number in grey (muted). |
| Numbered markers and ruler motif everywhere | The first pass put ticks on the step indicator, the chart and every control. | The ruler stays on three scales only (angle, pain, chart axis). The Setup list is not a sequence, so it has no numbers. |
| One radius for everything, same soft shadow | The first pass used 14 px on every part. | Four radii by rank (section 6). One shadow level only, under the dialog and the sticky bar. Cards have no shadow. |
| Centre-aligned text, pill on every chip | Not present. Chips were all pills. | Chips use the small radius (6 px). Only the Start button and the segmented thumb are fully round. |
| Gradient wash, glow, glass | Not present. Entry 007 confirms the rule: remove them. | The checklist of entry 007 is part of the review in section 9. |

Changes made after other reviews:
- Catalog entry 084 (dot-matrix numbers) is dropped. A dotted glyph is harder to read at 2 m and to read side-on. Figtree at 72 px or more, tabular and weight 800, reads better. This is SEEN reasoning only. I did not test it.
- Entry 088 (pull to confirm) is dropped. A drag gesture is hard for shaking hands and it has no keyboard form. The Red flag gate keeps a plain tick row and a large button.
- Entry 152 (10-step bar for "fit") is dropped for Setup. A bar that fills reads as a score.
- Entry 098 digit roll is dropped for the live angle. A blur while the number changes hurts reading. It stays only for the Progress range change, which a person causes.

## 5. Mapping: part of the app, source entry, exact thing to borrow

Marks: R = READ, S = SEEN. Entries with "S only" have one screenshot and no frame study.

| Part of the app | Entry | The exact thing to borrow | What stays out |
|---|---|---|---|
| App shell, all screens | 007 (S) | The checklist: no gradient, no glow, no glass, no emoji, no coloured badge, no greeting text. A grey count at the right of a list row, same row height. | Its dark-only theme. Its rainbow lines. |
| Banners | OWN | The two prototype lines stay. Slim indigo strip, icon and text, as now. | Any change of the text. |
| Home: list | 007 (S) | Rows of equal height with a grey value or count at the right. | Cards for each row. |
| Home: bottom bar | 064 (S only) | A bottom bar with 3 destinations (Home, Progress, My data) at 56 px height, labels always visible. It shows only on Home, Progress and My data. | It hides on Setup, Session, Summary and Red flag. Privacy notice moves into My data. |
| Red flag: tick rows | OWN, with 112 (S) | The tick row is the whole 56 px row. The segmented thumb of entry 112 (black active pill, thin outline) is not used here. | Pull to confirm (088). |
| Red flag: blocked state | 072 (S) | The dashed border turns solid and heavier when the state changes. One state line, one help line in grey. The block uses the indigo block, not red. | Red text, pink border (seen in 072). |
| Setup: step card | 072 (S) | One card with two lines for each check: line 1 is the state ("Leg in view"), line 2 is the help in muted grey. The text swaps with a short blur of about 200 ms (SEEN, burst frames). | Drag and drop. The check mark in a circle. The green border. |
| Setup: status chip | 079 (S) | One small chip with one word and an icon. The word swaps with a blur of about 170 ms (SEEN, 5 burst frames). | Hover. Green, yellow, orange fills. |
| Setup and Session: leg labels | 152 (R) | Labels with a thin elbow leader line and a round end dot. READ: label letter-spacing 1, stroke #696974 width .6, end dot radius 2, elbow path style `M638 289h80v-55h40`. | READ sizes (7 and 8 px text, .6 stroke) fail the 2 m rule. Own values in section 6. Labels hidden below `sm` (READ in the code). |
| Session: numbers | 098 (S) and 152 (R) | One large number with a small unit on the same baseline (098). A grey name above and a light value below (152, READ: name #94949e, value #d0d0da). | Digit roll on the live angle. The percent bar. Dot-matrix (084). |
| Session: ruler gauge | 112 (S) | Thin ticks, with taller ticks near the index mark and a fixed index line taller than any tick. Here the index is the live angle and the ruler stays still. | Moving the ruler. The face image. |
| Session: cue banner | 079 (S), 033 (R) | The banner opens from its own place at the bottom of the camera, about 200 ms, critically damped (no bounce). 033 caption: a spring, not a hard stop. | Any timer. Any bounce. Any sound on in-range. |
| Session: control bar | L4 (S only) | A bar with Stop and one more button, at the bottom. The time is not shown (no goal). | The running time. |
| Summary: stat lines | 007 (S) | A small grey label above a large number. | Up or down text, a green delta. |
| Summary: pain input | 112 (S) | A ruler with a fixed index and a black value pill ("Pain: 3"). Whole numbers. Add a minus and a plus button of 48 px. Nothing is set until the person acts. | The face image. Drag only. |
| Summary: swelling and range choices | 112 (S) | A segmented control with a filled ink thumb and a thin outline for the others. | Colour on the options. |
| Progress: header | 098 (S) and 007 (S) | A grey label, one large number, a small unit, and a range control (Last 7, Last 30, All). | The four bar colours. The "Bounced" red part. |
| Progress: chart | 007 (S) | Thin line, small axis, one hue. A second line uses dash and ochre. | A colour for each series by default. Hover tooltips. |
| Progress: read-out | 098 (S) | The other bars fade to about 30 percent when one is chosen. On a phone, a tap sets a fixed read-out line above the chart. | Hover. |
| Empty state | 075 (S) and 121 (R) | A short sentence on a flat sunken block, with the count 0 (075). Layout from 121. | A picture. The joke text. |
| Error state | 121 (R), 072 (S), 075 (S) | Layout from 121: title 36 px weight 600 tracking -0.025em, gap 12 px between title and text, gap 40 px between parts, max width 28 rem, padding 24 px (all READ). Title says what happened, text says the fix. Black primary button and a white secondary button (075). | The loop animation. Red. |
| Dialog (erase, etc.) | OWN | Native `dialog`, fade and scale from 0.97 in 180 ms (READ in `docs/ui-design.md`). | Radix. |
| Motion rules | 033 (R), apple-design | Critically damped spring where a person drags. Plain ease-out for a state change. | Bounce on any state. |

Gaps. No catalog entry is a true countdown, a true toast or banner, a camera overlay, or a live counter. The cue banner, the setup countdown and the skeleton overlay are own design (section 6 and 7).

## 6. Token set

The tokens extend `app/src/ui/styles.css`. Token names stay the same, so the migration is a value change plus a few new tokens. Light and dark values for every colour are below.

### 6.1 Colour

| Token | Light | Dark | Use | Source |
|---|---|---|---|---|
| `--bg` | `#ECEFF0` | `#0E151B` | page | OWN |
| `--surface` | `#F6F8F8` | `#151E26` | quiet panels | OWN |
| `--raised` | `#FFFFFF` | `#1C2731` | cards, sheets | OWN |
| `--sunken` | `#DDE3E6` | `#091016` | chips, tracks, empty block | OWN |
| `--ink` | `#101C26` | `#EAF0F3` | text, drawing lines | OWN |
| `--muted` | `#42505C` | `#A9B6BF` | secondary text | OWN |
| `--subtle` | `#566570` | `#93A1AB` | hints, large text | OWN |
| `--line` | `#C9D1D6` | `#2A3742` | quiet divider, no meaning | OWN |
| `--edge` | `#76848E` | `#6E7D89` | control edge | OWN |
| `--primary` | `#0872A0` | `#4DB6E6` | main action | OWN |
| `--on-primary` | `#FFFFFF` | `#06141C` | text on primary | OWN |
| `--primary-soft` | `#D3E8F2` | `#0B2A3A` | active exercise panel | OWN |
| `--accent` | `#2E3260` | `#C3C8F2` | attention block fill | OWN, hue from the current app (READ: `--accent #40456a`) |
| `--on-accent` | `#FFFFFF` | `#14183A` | text on the block | OWN |
| `--accent-ink` | `#2E3260` | `#C3C8F2` | attention text, icon | OWN |
| `--accent-soft` | `#E2E5F6` | `#1A1E3C` | quiet notice | OWN |
| `--link` | `#075E86` | `#8CCBEF` | links | OWN |
| `--focus` | `#054E6E` | `#8CCBEF` | focus ring | OWN |
| `--chart` | `#0B72A8` | `#2C8CC6` | chart mark 1 | OWN, checked by the validator |
| `--chart-2` | `#B07A00` | `#B98A18` | chart mark 2, with dash | OWN, checked by the validator |
| `--trace` | `#FFD54A` | `#FFD54A` | leg line on camera, with `#0E151B` halo | OWN |
| `--scrim` | `#0E151Ba6` | `#060A0Dcc` | dialog scrim, camera frame ground | OWN |

No token is green or red. Hues: blue, indigo, yellow, ochre, and a cool neutral. Yellow and ochre are not state colours here. They mark a fixed thing (the traced leg, the second series).

### 6.2 Contrast of every text and background pair (WCAG 2.x)

Computed with `uiredesign/tokens/contrast.py` (scratchpad). I re-computed three pairs by hand with a second formula (node, one-line script): `--ink` on `--bg` light 14.94, `--on-primary` on `--primary` light 5.35, dark 8.14. They match.

| Pair | Need | Light | Dark |
|---|---|---|---|
| Body text on page: `--ink` on `--bg` | 4.5 | 14.94 | 15.99 |
| Body text on card: `--ink` on `--raised` | 4.5 | 17.27 | 13.19 |
| Secondary text on page: `--muted` on `--bg` | 4.5 | 7.17 | 8.87 |
| Secondary text on card: `--muted` on `--raised` | 4.5 | 8.29 | 7.32 |
| Hint text on page: `--subtle` on `--bg` | 4.5 | 5.21 | 6.94 |
| Hint text on card: `--subtle` on `--raised` | 4.5 | 6.02 | 5.73 |
| Text on sunken chip or track: `--ink` on `--sunken` | 4.5 | 13.32 | 16.64 |
| Secondary text on sunken chip: `--muted` on `--sunken` | 4.5 | 6.40 | 9.23 |
| Text on primary-soft panel: `--ink` on `--psoft` | 4.5 | 13.65 | 12.98 |
| Text on accent-soft panel: `--ink` on `--asoft` | 4.5 | 13.79 | 14.10 |
| Text on primary button: `--onprimary` on `--primary` | 4.5 | 5.35 | 8.14 |
| Text on attention block: `--onaccent` on `--accent` | 4.5 | 12.06 | 10.53 |
| Attention text or icon on card: `--accentink` on `--raised` | 4.5 | 12.06 | 9.30 |
| Attention text or icon on page: `--accentink` on `--bg` | 4.5 | 10.44 | 11.27 |
| Link on page: `--link` on `--bg` | 4.5 | 6.15 | 10.43 |
| Link on card: `--link` on `--raised` | 4.5 | 7.11 | 8.60 |
| Primary mark on page (non-text): `--primary` on `--bg` | 3 | 4.63 | 8.01 |
| Control edge on page (non-text): `--edge` on `--bg` | 3 | 3.33 | 4.34 |
| Control edge on card (non-text): `--edge` on `--raised` | 3 | 3.85 | 3.58 |
| Focus ring on page (non-text): `--focus` on `--bg` | 3 | 7.83 | 10.43 |
| Focus ring on card (non-text): `--focus` on `--raised` | 3 | 9.05 | 8.60 |
| Chart mark 1 on card (non-text): `--chart` on `--raised` | 3 | 5.27 | 4.10 |
| Chart mark 2 on card (non-text): `--chart2` on `--raised` | 3 | 3.73 | 4.85 |

Trace colour `--trace` #FFD54A against the camera scrim #0E151B: 13.02. The camera picture is not a token surface, so the trace always carries a 3 px halo in #0E151B.


All 23 pairs pass in both themes. The lowest text value is 5.21 (hint text on the page, light). The lowest text-on-fill value is 5.35. The lowest non-text value is 3.33 (control edge on the page, light, need 3).

### 6.3 Chart palette, validated with the dataviz validator

Command: `node <dataviz skill>/scripts/validate_palette.js "<hex,hex>" --mode <light|dark> --surface "<card>"`.

| Mode | Palette | Surface | Lightness band | Chroma floor | CVD separation (adjacent) | Normal-vision floor | Contrast vs surface |
|---|---|---|---|---|---|---|---|
| Light | `#0B72A8`, `#B07A00` | `#FFFFFF` | PASS (L 0.43 to 0.77) | PASS (>= 0.10) | PASS, worst delta E 21.4 (protan), tritan 21.7 | PASS, 26.1 | PASS, all >= 3 (5.27 and 3.73) |
| Dark | `#2C8CC6`, `#B98A18` | `#1C2731` | PASS (L 0.48 to 0.67) | PASS | PASS, worst delta E 22.6 (protan), tritan 20.9 | PASS, 25.3 | PASS, all >= 3 (4.10 and 4.85) |

What failed first, and what I changed:
- Teal `#00606C` with indigo `#2E3260`: FAIL on lightness band, chroma floor (0.077 and 0.08) and normal-vision floor (14.1).
- Blue with violet (`#0A78A0`, `#6A4FC0`): FAIL normal-vision floor (14.8). Other blue and violet pairs fail the CVD check.
- Dark `#3DA5E0` and `#D9A42B` fail the dark lightness band (L 0.69 and 0.75). I stepped them down.

Rules for charts: one series uses `--chart` only. A second series uses `--chart-2`, a dashed line and a direct label. A legend is always present for two series. Every chart has a table under it. The label text uses text tokens, never the series colour. There is no goal line, no up or down colour and no "best" marker.

Not run: the dataviz validator does not test the trace yellow. The trace is not a chart colour. It sits on the camera picture and uses a halo for contrast.

### 6.4 Type scale

All steps are READ from `app/src/ui/styles.css` (fluid, 360 to 1280 px). I keep them and change the hero and the weights.

| Token | Value | Use | Source |
|---|---|---|---|
| `--step-m1` | `clamp(0.8854rem, 0.8601rem + 0.1123vw, 0.95rem)` | hints, units | READ |
| `--step-0` | `clamp(1.0625rem, 1.0136rem + 0.2174vw, 1.1875rem)` | body | READ |
| `--step-1` | `clamp(1.275rem, 1.1931rem + 0.3641vw, 1.4844rem)` | row title | READ |
| `--step-2` | `clamp(1.53rem, 1.4026rem + 0.566vw, 1.8555rem)` | cue text | READ |
| `--step-3` | `clamp(1.836rem, 1.6469rem + 0.8406vw, 2.3193rem)` | page title, error title (about 29 to 37 px) | READ |
| `--step-4` | `clamp(2.2032rem, 1.9309rem + 1.2104vw, 2.8992rem)` | stat number on Progress | READ |
| `--step-hero` | `clamp(4.5rem, 3.6rem + 3.4vw, 6.5rem)` | live angle and rep count (72 to 104 px) | READ |

New: title weight 650, tracking -0.025em (READ from entry 121: weight 600, tracking -0.025em. Weight 650 is OWN). Number weight 800, tracking -0.03em, `font-variant-numeric: tabular-nums` (OWN). Body weight 500, tracking 0, line-height 1.5 (OWN). Headings use `text-wrap: balance`. Units use a non-breaking space (READ: web-design-guidelines).

### 6.5 Space

READ from the app, in rem: `--s-1` 0.25, `--s-2` 0.5, `--s-3` 0.75, `--s-4` 1. The steps `--s-5` to `--s-7` are fluid: clamp(1.25, 1.1 + .5vw, 1.5), clamp(1.5, 1.2 + 1vw, 2) and clamp(2, 1.5 + 1.8vw, 3). `--gutter` clamp(1, .5 + 2.6vw, 2) rem. `--touch` 3 rem.

New, OWN: `--row` 3.5 rem (56 px) for tick rows and the bottom bar. Gap of 12 px between a title and its text, and 40 px between parts, on error and empty screens (READ from entry 121).

### 6.6 Radius and shadow

| Token | Value | Use | Source |
|---|---|---|---|
| `--r-xs` | 0.375rem (6 px) | chips, tick marks | OWN |
| `--r-s` | 0.75rem (12 px) | inputs, rows, buttons | OWN |
| `--r-m` | 1.25rem (20 px) | camera frame, panels, sheets | OWN |
| `--r-full` | 999px | Start button, segmented thumb | OWN |

The old tokens `--r-l` and `--r-xl` go away. The alias `--radius` stays for `figures.css`, `pair.css` and `qr.css` (READ in `docs/ui-design.md`). Shadow: use `--shadow-3` (READ from the app) for the dialog only. The sticky bar has a 1 px `--line` top edge. Cards have no shadow.

### 6.7 Motion

Nothing moves unless a person acts. The live angle follows the body and has no tween longer than one frame.

| Token | Value | Use | Source |
|---|---|---|---|
| `--t-press` | 120 ms ease-out, scale 0.98 | press on a button | OWN, close to READ app (140 ms) |
| `--t-swap` | 180 ms, opacity and `blur(2px)` | text swap in a step card or chip, only after a person acts or a check changes | SEEN: about 170 to 200 ms in entries 072 and 079 |
| `--t-banner` | 200 ms, `cubic-bezier(.2, 0, 0, 1)`, translate Y 8 px and opacity | cue banner enter and leave | OWN, with 033 (R: use a spring, no hard stop) and apple-design (damping 1.0) |
| `--t-dialog` | 180 ms, `@starting-style`, `transition-behavior: allow-discrete`, scale from 0.97 | native dialog | READ in `docs/ui-design.md`, and READ in the modern-web-guidance guide `motion` |
| `--t-chart` | 600 ms ease-out | bars or line reflow after a range tap | SEEN: about 600 ms in entry 098 |

Reduced motion (`prefers-reduced-motion: reduce`): no transform, no blur. Opacity only, 120 ms. The chart reflow becomes a cross-fade. The existing reduced-motion rule stays. `prefers-contrast: more`: `--edge` and `--line` use `--ink`. `prefers-reduced-transparency`: no case, because the design uses no blur or glass. Animate only `transform` and `opacity`. Never write `transition: all` (READ: web-design-guidelines).

Interruptible: a banner that leaves while it enters reverses from its current value. CSS transitions do this. No drag gesture exists, so no spring library is needed.

### 6.8 Camera overlay (own design)

- The traced leg: hip, knee and ankle joints joined by a 4 px line in `--trace` with a 3 px halo in `#0E151B`. Joint dots have a radius of 7 px.
- The other leg: 2 px, dashed, `--trace` at 60 percent, same halo. The line is dashed so that it is not read by colour alone.
- Labels: "Hip", "Knee" and "Ankle" use 18 px weight 700 on a `--scrim` chip. Each has an elbow leader line of 2 px and an end dot of 4 px. A lost joint gets "Ankle not seen" at its last place.
- Hip, knee and ankle labels show on Setup. On Session only "Knee" shows, with the angle. This keeps the picture quiet.

## 7. Wireframes

Scale: phone is 390 x 844 CSS px. The prototype banner is two lines and 56 px. All tap areas are 48 px or more. Heights in the margin are OWN estimates for the layout check.

Safe area: the sticky bar adds `env(safe-area-inset-bottom)`. Height uses `dvh`, not `vh` (READ: modern-web-guidance guide `responsive-design`). The page never disables zoom.

### 7.1 Home (phone)

```
+--------------------------------------+
| (i) Prototype. Not for patient use.  |  56
| (i) EXAMPLE, NOT APPROVED            |
+--------------------------------------+
| [logo] MPFL Rehab                    |  56
+--------------------------------------+
| Today                                |  title, step-3
|                                      |
| +----------------------------------+ |  tinted --primary-soft, r-m
| | [icon] Heel slide                | |
| | 3 sets of 10 reps                | |
| | Target bend 60 degrees           | |
| | Limit 90 degrees                 | |
| | [      Start      ]  56 px full  | |
| +----------------------------------+ |
|                                      |
| Straight leg raise     3 sets of 10  |  row 64 px, divider
| ------------------------------------ |
|   [Start] at the right, 48 px        |
|                                      |
| Your protocol                        |
| Operated side ................ Left  |  definition list,
| Approval ......... Not recorded      |  dividers, no card
| Active phase ..... 1, Protection     |
| [Load a new protocol file]           |
|                                      |
| v Decisions for your surgeon  10     |  details, 56 px
+--------------------------------------+
| [Home]    [Progress]    [My data]    |  bottom bar 56 px + inset
+--------------------------------------+
```

Notes: only the active exercise has a tinted panel. Facts become a list. The bottom bar shows on Home, Progress and My data only.

### 7.2 Red flag (phone)

```
+--------------------------------------+
| banner (2 lines)                     |  56
+--------------------------------------+
| Before you start                     |  title
| Tick each sentence that is true      |
| today.                               |
|                                      |
| [ ] Sentence one ...                 |  whole row 56+ px
| ------------------------------------ |
| [ ] Sentence two ...                 |
| ------------------------------------ |
| [ ] Sentence three ...               |
|                                      |
| (state: blocked)                     |
| +----------------------------------+ |  --accent block, icon,
| | (!) Do not exercise today.       | |  heading in words
| |     Ask your care team first.    | |  copy stays as in app
| +----------------------------------+ |
+--------------------------------------+
| [ Continue ]        [ Cancel ]       |  sticky bar 72 px
+--------------------------------------+
```

Copy: all strings stay as in `app/src/ui/RedFlag.tsx`. The sample lines above are placeholders. The blocked block uses a solid heavy border and an icon (from entry 072: the border style changes with the state).

### 7.3 Setup camera (phone)

```
+--------------------------------------+
| banner (2 lines)                     |  56
+--------------------------------------+
| Check your camera                    |  title 48
+--------------------------------------+
| CAMERA 390 x 300 full width, r-m top |
|                                      |
|    . hip                             |
|     \___ "Hip"                       |
|      o knee ---- "Knee"              |
|      |                               |
|      o ankle ---- "Ankle not seen"   |
|                                      |
| [ Looking for your leg ]  chip       |  079 chip, word swaps
+--------------------------------------+
| Leg in view                          |  line 1: state (072)
| Stand 2 m from the camera, side-on.  |  line 2: help, muted
| ------------------------------------ |
| Light                         Seen   |  six rows from the app
| Whole leg                 Not seen   |  icon + word, no colour
| ...                                  |
+--------------------------------------+
| [        Start exercise        ]     |  sticky 72 px, disabled
+--------------------------------------+       until ready (as now)
```

Countdown (own design): the 3-2-1 count is a large number (`--step-hero`) in the centre of the camera frame on a `--scrim` chip. It changes each second. It is a person-triggered action, since the person pressed Start. It never repeats.

### 7.4 Session (phone 390 x 844)

```
+--------------------------------------+ 0
| (i) Prototype. Not for patient use.  |
| (i) EXAMPLE, NOT APPROVED            | 56
+--------------------------------------+
| Heel slide               Mute sound  | 48
+--------------------------------------+ 104
|                                      |
|   CAMERA, full width, 390 x 320      |
|   (clamp 300px, 38dvh, 420px)        |
|                                      |
|            . hip                     |
|             \                        |
|              o knee -- "Knee"        |
|             /                        |
|            o ankle                   |
|                                      |
+--------------------------------------+ 424
|  62               |   3              |
|  degrees          |   reps           | numbers 124 px,
|  (step-hero 72+)  |   (step-hero)    | tabular, baseline
+--------------------------------------+ 548
|  0   10   20 ... | ... 90 ...  120   | ruler 56 px
|  |.|.|.|.|.|.|.|.|.|^|.|.|           | index = live angle
|  Your limit 90 degrees       ^       | limit tick, taller
+--------------------------------------+ 604
| [cue banner reserved, 72 px]         | empty when in range
|  Rep time 1.3 s. Your care team set  | text only when needed
|  at least 2.0 s.                     |
+--------------------------------------+ 676
| (free space 80 px: grows the camera) |
+--------------------------------------+ 756
| [  Stop  ]   [Knee gave way or hurts]| bar 88 px + inset
+--------------------------------------+ 844
```

Layout check (OWN arithmetic): 56 + 48 + 320 + 124 + 56 + 72 + 88 = 764 px. A 844 px screen leaves 80 px. On a 360 x 640 screen the camera shrinks to 300 px. The free space is not enough. So the cue banner overlays the lower 72 px of the camera. This needs a browser test at 360 x 640 (not run).

Rules:
- The camera, the angle and the rep count are all inside the first view at 390 x 844 (test gate G1: Playwright viewport check).
- The two numbers are 72 px or more (READ: the existing `styles.test.ts` rule on the minimum of `--step-hero`).
- The cue banner space is reserved, so the numbers do not jump. In-range shows nothing.
- The cue banner is `role="alert"` for the urgent cue and `role="status"` for the rest (READ in `docs/ui-design.md`). Its text is `--step-2` weight 700.
- The ruler is `aria-hidden`. The same number is in the text above it.
- The ruler scale goes from 0 to the limit plus 30 degrees, rounded to 10. Ticks every 10 degrees. A short tick every 5 degrees (OWN, not tested).
- "Knee gave way or hurts" keeps its full text and a 48 px height. It uses the `--accent` outline and an icon, not red.
- No timer. No set bar. No goal.

### 7.5 Session (laptop 1280 x 800)

```
+------------------------------------------------------------------+
| (i) Prototype. Not for patient use.   (i) EXAMPLE, NOT APPROVED  | 40
+------------------------------------------------------------------+
| Heel slide                                         Mute sound    |
+--------------------------------------+---------------------------+
|                                      |  62 degrees               |
|   CAMERA 4:3, up to 720 x 540        |  (104 px, tabular)        |
|                                      |                           |
|     skeleton and labels              |  3 reps                   |
|                                      |                           |
|                                      |  0 ... |.|.|.|^|.| ... 120|
|                                      |  Your limit 90 degrees    |
|                                      |                           |
|                                      |  [cue banner, 96 px]      |
|                                      |                           |
|                                      |  [ Stop ]                 |
|                                      |  [ Knee gave way or hurts]|
+--------------------------------------+---------------------------+
```

Grid: `grid-template-columns: minmax(0, 7fr) minmax(18rem, 5fr)`. The right column does not scroll. Buttons sit at the bottom of the column, not in a fixed bar. Max text width stays under 60 characters.

### 7.6 Summary (phone)

```
+--------------------------------------+
| banner (2 lines)                     |
+--------------------------------------+
| Session summary                      |  title
| Reps counted                         |  grey label
| 10                                   |  step-4, tabular
| Estimated top angle                  |
| 84 degrees  (not a measurement)      |
| ------------------------------------ |
| How much pain did you feel?          |  legend
| [ Pain: 3 ]  pill, ink, white text   |
|  |.|.|.|.|.|.|.|.|.|.|.|            |  ruler 0 to 10, 56 px tall
|  [ - ]                      [ + ]    |  48 px buttons
| ------------------------------------ |
| Swelling                             |
| (o) None   ( ) A little   ( ) A lot  |  rows 56 px
|                                      |
| (pause message, only if needed)      |
| +----------------------------------+ |  --accent block + icon
| | (!) Pause the exercises ...      | |  FR12 text stays
| +----------------------------------+ |
+--------------------------------------+
| [   Save   ]      [ Do not save ]    |  sticky bar
+--------------------------------------+
```

Risk: the ruler is one 342 px wide control with 11 ticks. The pitch is about 31 px, less than 48 px. So the ruler is one `input type="range"` with a 56 px tall hit area, plus the minus and plus buttons, plus keyboard arrows. No single tick is a target. No value is set at the start (the pill says "Pain: not set"). This needs a decision on whether a range input fits the safety floor. See section 11.

### 7.7 Progress (phone)

```
+--------------------------------------+
| banner (2 lines)                     |
+--------------------------------------+
| Progress                             |
| ( Last 7 | Last 30 | All )           |  segmented, ink thumb
|                                      |
| Knee bend, estimated                 |  grey label
| 84 degrees  last session             |  step-4
| [chart: thin line, 1 hue, y ticks]   |  ruler-like axis
| [read-out line: 3 Nov  82 degrees]   |  tap sets it
| Table: date | angle | reps           |  required table
| ------------------------------------ |
| Pain after sessions                  |
| 3  last session                      |
| [chart ...] [table ...]              |
|                                      |
| (empty state)                        |
| +----------------------------------+ |  flat --sunken block
| | 0 sessions yet                   | |
| | Start an exercise on Home.       | |
| +----------------------------------+ |
+--------------------------------------+
| [Home]    [Progress]    [My data]    |
+--------------------------------------+
```

Wide screens: two columns of charts. The table stays under each chart. No goal line. No up or down text.

## 8. Standards check (skills)

apple-design:
- Response: the press feedback starts on pointer down (`:active`, 120 ms).
- Interruptible: banner and dialog use CSS transitions that reverse from the live value. No gesture drives a motion here, so no spring library is added.
- Spatial consistency: the banner enters and leaves from the same edge. The dialog scales from 0.97 and returns the same way.
- Reduced motion: opacity only. `prefers-contrast: more` makes edges ink. Transparency has no case.
- Type: tracking is size-specific (title -0.025em, number -0.03em, body 0). Units use `rem`, so text size follows the user setting.
- Principles: Agency (Do not save and Skip stay). Responsibility (the safety gate stays plain). Simplicity (the bottom bar has 3 items). Familiarity (a range input and a bottom bar).

modern-web-guidance (searches run: mobile layout, dialog, motion, forms, camera overlay). Guides read: `responsive-design`, `dialog`, `motion`.
- `dvh` for heights, `clamp()` for type, `env(safe-area-inset-bottom)` for the bars.
- Native `dialog`. `closedby` is not Baseline widely available. Esc and the back gesture already close a modal. The erase dialog keeps its confirm button.
- `@starting-style` with `transition-behavior: allow-discrete` for the dialog fade, with a reduced-motion rule.
- Not done: the guides `forms` and `stack-drill-down` were found by search but not read.

web-design-guidelines (rules fetched from the Vercel source, applied to this plan, not to code):
- `touch-action: manipulation` on buttons. Visible `:focus-visible` ring from `--focus`. Sticky bars must not hide the focus (add `scroll-padding-bottom`).
- Tabular numbers on every number. Non-breaking space before a unit. Balanced headings.
- No `transition: all`. Animate `transform` and `opacity` only. Labels wrap the control for one hit area.
- Never disable zoom. Empty and long strings must not break the layout.
- No code was reviewed, so no file:line finding exists.

dataviz: form chosen first (a stat and a thin line), colour last, validator run, legend and table rules in section 6.3. I did not render a chart, so check 7 (look at the render) is open.

chrome-devtools-mcp:a11y-debugging: the Chrome DevTools server failed to connect in this session ("plugin:chrome-devtools-mcp:chrome-devtools" in the failed list). No Lighthouse or tap-target script ran. Contrast is computed by script, not by the browser. Tap targets are by design only. This is a gap.

## 9. Checklist from entry 007 (remove the slop)

Before any screen ships, each answer must be no:
- Is there a gradient, a glow, a glass blur or a drop shadow on a card?
- Is there an emoji or a cheering text ("Great job!")?
- Is there a coloured badge, or a colour that shows good or bad?
- Is there a number that moves by itself, or a counting animation on the live angle?
- Is there a stack of cards where a list is enough?

## 10. What is NOT possible from the catalog, and what the rules forbid

From the catalog (missing or unreadable):
- No entry shows a health or exercise app, a camera overlay with a body, a skeleton, or a live rep counter.
- No entry is a true countdown or a true toast or banner. The cue banner, the countdown and the skeleton overlay are own design.
- Real CSS is READ for only two sites: entry 152 (the drone page) and entry 121 (the 404 page). The other 6 studied entries have no source. Their X posts are walled, or the component code is lazy-loaded (entry 098, bencho.dev). Their values are SEEN.
- Frame timings come from 30 fps video at 100 to 200 ms spacing. They are accurate to about one frame gap. Font sizes in videos are not measurable.
- Entries 144, 004, 037 and the other videos were not studied in depth.
- Licences of the drawings and fonts in the work of other people are unchecked. Only the ideas are used, and no file of theirs enters the repo.

Forbidden by the rules, so dropped:
- Green or red for done, failed, good or bad (seen in 072, 075, 098, 007).
- Check mark celebration, confetti, stamps, streaks and badges (043, 057, 114).
- Percent charge, progress rings, a bar toward a goal (152, 072 percent bar).
- Autoplay loops and any motion without a person (121, 075 timers).
- Hover tooltips as the only way to read data (098). A phone has no hover.
- Glass, blur, 3D, dither and ASCII art (many entries).
- Drag-only gestures (088, 112 as drag only).
- Dot-matrix glyphs (084): a legibility risk, not a rule. Kept out.
- Any new package, a CDN font, or a font file other than the Figtree already in the app.
- Any photo of a face (112) or a person.

## 11. Decisions for the user

1. Palette: keep the Wada paper palette from `docs/ui-design.md`, or switch to the cool Plaster set in section 6.1. The plan recommends Plaster.
2. Bottom bar on Home, Progress and My data (entry 064, SEEN only). It changes the Privacy notice link into My data.
3. Pain as a ruler (one range input with minus and plus buttons) in place of 11 pills. It needs a check against the safety floor and the 48 px rule. Not tested.
4. Camera at the top of Session, full width. The old `ui-design.md` put the numbers first. A viewport test is the gate.
5. Dark attention block as pale lavender with dark text, not a dark block. It passes at 10.53 to 1 but it looks different from the light theme.
6. The `--trace` yellow and the `--chart-2` ochre are not green or red, but they are warm colours. The user decides if the rule "no state colour" is met. Each is a fixed identity colour, with a dash or a halo.

## 12. Gates for the build step

- G1: Playwright at 390 x 844: camera, angle and rep count inside the viewport. Numbers 72 px or more.
- G2: Playwright at 360 x 640 and 320 x 568: no sideways scroll, no hidden Stop button.
- G3: axe 0 violations, light and dark. 0 targets under 48 px. 0 CSP violations.
- G4: `claims-check.sh`, `styles.test.ts` (OKLCH chroma test as planned in `docs/ui-design.md` step 3), and the unit tests pass.
- G5: dataviz validator re-run on the final chart colours. A render of each chart, looked at.
- G6: a test on a real phone, with the real camera, side-on at 2 m. Not run so far.

## 13. Open gaps in this brief

- No chart, screen or code was rendered. All wireframes are ASCII. The pixel heights are OWN arithmetic.
- The live-CSS values of only two sites are READ. Most colour, size and timing values from entries are SEEN.
- The Chrome DevTools server was not available, so no browser a11y or tap-target script ran.
- Skills named in the brief and not run in the way they describe: `a11y-debugging` (server down), `web-design-guidelines` (no code to review). The stop hook also asked for a skill named `work`. It does not exist in this session.
