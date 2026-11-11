# UI redesign decisions

Date: 2026-11-09. Status: advice only. No app code changed. This file answers the six questions of section 11 of `docs/ui-redesign-brief.md`.

Skills used: frontend-design:frontend-design, apple-design, web-design-guidelines, dataviz, simple-english:simple-english.

How the skills were used. They were loaded and applied as rules of thought. I ran no browser, no Lighthouse run and no dataviz validator. The Chrome DevTools server was not available. I ran no app test. The contrast numbers marked COMPUTED come from my own one-line script (WCAG 2.x). Nothing was rendered.

Source marks:
- READ (repo): I read the file in this session. The path is given.
- READ (brief) and SEEN (brief): the brief marks the value so. I quote it and did not check the source.
- COMPUTED: I calculated it here.
- OWN: my judgement.

## Hard limits that every decision keeps

- No verdict word, no score, no green or red state colour (`MPFL_APP_PLAN.md` FR13, FR23, NFR12).
- An in-range rep shows nothing (FR23).
- The two prototype banner lines stay (`app/src/ui/Banners.tsx`).
- Every clinical value needs clinician review. The pain floor of 7 is a PROPOSAL (FR12).
- No frame or video is stored. Targets are 48 px or more. Everything loads from the own origin.
- `claims-check.sh`, `tests/ui/styles.test.ts`, `tests/ui/noVerdict.test.tsx` and the axe specs keep passing.

## 1. Cool Plaster page or the current paper palette

Decision: use Plaster `#ECEFF0`. Change the whole token set in one step. Do not change `--bg` alone.

Why:
- The warm paper `#fcf3ef` is a Wada choice. `docs/ui-design.md` section 10 says "Some people find it pink" (READ, repo). No user quote backs this in the repo. It is a claim only.
- Plaster is a true neutral. COMPUTED in OKLCH: Plaster has chroma 0.003 and hue 220. The paper has chroma 0.011 and hue 46.
- The change costs little. The token names stay (brief section 6, READ brief).
- I re-computed 16 text, fill and edge pairs of the brief table. All match the brief to two decimals. The lowest text value is 5.21 (`--subtle` on `--bg`, light).

Risk:
- COMPUTED: `--edge` on `--sunken` in light is 2.97 to 1. The need is 3 to 1. The brief table does not list this pair. A control with an edge on a sunken chip or track fails.
- COMPUTED: `--chart-2` ochre on `--bg` is 3.23. It passes. The brief checked it only on `--raised`.
- The comment in `styles.test.ts` line 57 names "warm paper neutrals". The test still passes, because Plaster has chroma below 0.04. Update the comment.
- The brief says the whole table was computed by a script in the scratchpad. That script is not in the repo. Nobody can re-run it from the repo.

Gate:
- Add the pair `--edge` on `--sunken` to the contrast list. Fix the token or forbid the pairing. The first option is `--edge` `#6F7D87` (needs a re-check).
- `styles.test.ts` passes (OKLCH test). axe shows 0 violations in light and dark. The e2e test of 48 px targets passes (`e2e/app-a11y.spec.ts`).
- Look at one screenshot of each theme on a real phone (gate G6 of the brief).

## 2. Bottom bar with Home, Your sessions and My data

Decision: yes, with three conditions. Use the real screen names. Remove the two Home tiles that it replaces. Hide the bar on every flow screen.

Why:
- The evidence is thin. Entry 064 is one screenshot (SEEN, brief). No test with a patient asks for it.
- The need is real in the code. Home holds three tile buttons that open the same screens: "Your sessions", "My data" and "Privacy notice" (`app/src/ui/Home.tsx` lines 298 to 312, READ repo). The bar replaces two of them. The Home page gets shorter. This is the "long scroll" defect of brief section 0.
- The plan renamed the screen "Progress" to "Your sessions" (`MPFL_APP_PLAN.md` FR13, READ repo). The reason is that "Progress" reads as a goal. The brief wireframes 7.1 and 7.7 still say "Progress". Use "Your sessions".
- Navigation is simple. `backStep` sends `dashboard` and `data` back to Home (`app/src/ui/appState.ts` line 219, READ repo). A tab switch can use the same `open` action.

Risk:
- The red-flag gate must stay unreachable by a back path (FR5). The bar must never show on Red flag, Setup, Session or Summary. A fuzz test exists for this (`docs/live-test/retest3.md`, 560 random actions, READ repo).
- The bar uses space on a small phone. Keep it 56 px with the safe-area inset. It must not hide the focus (`scroll-padding-bottom`).
- The Privacy notice moves. Two unit tests click "Privacy notice" on Home (`tests/ui/home.test.tsx` line 113, `tests/ui/app.test.tsx` line 120). They need an edit. The first-run Privacy screen stays as it is.
- Do not add a fourth item. A bar with 3 items is the limit that the brief sets.

Gate:
- Rerun `appBack.test.tsx`, `home.test.tsx`, `app.test.tsx` and the back-fuzz flow.
- A new test: the bar is absent on Red flag, Setup, Session and Summary.
- axe 0 violations. Each item is 48 px or more. The `nav` has a label and `aria-current` on the open item.

## 3. Pain as a 0 to 10 ruler with minus and plus buttons

Decision: no. Keep the 11 radio buttons. Restyle them only. Do not use a range input. Needs the user to confirm.

Why:
- This is a safety floor. The rules cannot decide it. No rule names a slider. I read these rules and facts:
  - FR12: pain 7 or more pauses the exercise. The floor applies between sets and at Summary (`MPFL_APP_PLAN.md`, READ repo).
  - FR12 and `research/ux-flow.md` line 360: no value is pre-selected. An unanswered question is never read as a high value.
  - L1-01 was a HIGH defect in this exact path (`docs/live-test/exercise-flows.md` row 33, READ repo). Audit 3 H1 was a second one.
- The floor sits between 6 and 7. The brief says the ticks are about 31 px apart (SEEN brief, section 7.6). A drag with a shaking or tired hand can land on 6 and not on 7. That error is on the unsafe side. A pill is one clear 48 px tap.
- A range input always holds a value. The brief asks for "Pain: not set". That needs extra code. The first plus press is also unclear: does it set 0 or 1?
- The brief itself drops entry 088 because "a drag gesture is hard for shaking hands" (brief section 4, READ brief). A drag-first pain control breaks the same rule.
- The current pills already pass. The grid has 6 columns on a phone. Each cell is 56 px high (`app/src/ui/styles.css` lines 783 to 800, READ repo). At 360 px wide each cell is 48 px wide (COMPUTED: (360 - 32 - 40) / 6).
- Pain reaches two screens with one component (`PainScale.tsx`). Tests pin 11 radios (`tests/ui/summaryPain.test.tsx` line 49, `tests/ui/sessionPain.test.tsx` lines 48 and 56) and a press on the radio "7" (`e2e/app-session-layout.spec.ts`). A new control breaks all of them.

Risk of this decision:
- The pills keep the look of a form. The gain is only in the visual style. Use an ink fill for the chosen pill and keep the end labels "No pain" and "Worst pain". Selection must not rely on colour alone. Add a heavier edge to the chosen pill.
- Two rows of pills take more height than one ruler. This is acceptable. The pause message sits above the bar at 390 x 844 (R3-03, READ repo).

Gate:
- `summaryPain`, `sessionPain` and `summaryPersist` tests pass without a change of count or name.
- The e2e test R3-03 passes (pain 7 shows the pause message above the bar).
- A new test: no pill is checked at the start, and a stored pain of 6 and of 7 show the right message.
- Hand test with a real phone: 20 taps on 6 and 7 with a thumb, no wrong value. Not run so far.

If the user still wants a ruler: add it as a visual layer above the pills. The pills stay the only input. This keeps the 11 targets and adds no new state.

## 4. Camera at the top of Session, full width, no card

Decision: yes. Make the picture full width and remove the card look. Do not let the cue banner cover the camera. Keep the picture at 4:3 with `object-fit: contain`.

Why:
- The camera is already first on a phone. `Session.tsx` and `styles.css` set `order: -1` on the frame below 62 rem and a max height of `min(42svh, max(7rem, 100svh - 32rem))` (READ repo, lines 1951 to 1966). Brief section 0 describes an older screenshot from the scratch copy (`ui2/shots/b/phone/22-session-live.png`, SEEN brief). That defect is partly fixed.
- What remains is the look. The frame still has a border, a large radius and a shadow (`.frame`, line 955, READ repo). The brief wants none of them.
- A gate exists. `e2e/app-session-layout.spec.ts` checks at 390 x 844 and 360 x 640 that the video, the angle, the count and the button end above the fixed bar. It also checks that the scroll is 0 (READ repo).
- The picture must not be cropped. Setup rule 4 asks the whole leg to be inside the frame edge (`research/ux-flow.md` line 240). A crop with `cover` hides the edge. The brief uses a picture 320 px high at 390 px wide. The 4:3 ratio gives 293 px (COMPUTED). Keep 4:3.

Risk:
- The brief arithmetic (section 7.4) assumes a bar of 88 px with two buttons. The real bar can hold three rows: Stop, "Count this rep" for the leg raise, and "Knee gave way or hurts". The page reserves 11 rem (`.session`, line 1951). The comment of R3-03 says 360 x 640 leaves too little room (READ repo). Redo the arithmetic with the real bar.
- The brief puts the cue banner over the lower 72 px of the camera. That covers the ankle and foot, the part the person needs to see. The current rule is the opposite: notices sit above the camera so the bar never covers them (L3-06). Keep the reserved space under the numbers. On a small phone let the picture shrink.
- Without a border the picture has no edge against `--bg`. A video on a dark ground is fine in light mode. Test it.

Gate:
- Extend `app-session-layout.spec.ts`: video top and bottom, angle and count all inside `window.innerHeight` at 390 x 844 and 360 x 640. The computed font size of both numbers is 72 px or more.
- No sideways scroll at 320 and 195 px (the existing tests).
- `styles.test.ts` (the 72 px rule and the camera under the rest panel, R3-03) passes.
- Real phone, side-on at 2 m (gate G6). Not run so far.

## 5. Attention block as pale lavender with dark text

Decision: yes, in the dark theme only. Do not apply the same fill to the prototype banner.

Why:
- The brief changes only the dark values. `--accent` becomes `#C3C8F2` and `--on-accent` becomes `#14183A` (READ brief, section 6.1). The light theme keeps the dark indigo block.
- It follows one rule in both themes. The attention block is the strongest contrast to the page. A dark block on a light page. A pale block on a dark page. COMPUTED: lavender on the dark page is 11.27 to 1, on a raised card 9.30 to 1. Text on the block is 10.53 to 1. The current dark block is `#7178a0` with text at 4.54 to 1 (`styles.css` line 96, READ repo). It barely passes.
- The colour is not a verdict colour. COMPUTED: chroma 0.059 and hue 280. The test of `styles.test.ts` flags red (hue below 40 or above 340) and green (hue 100 to 175) only. This passes.
- The block keeps its icon and its words. The pause message does not rely on colour alone.

Risk:
- The banner also uses `--accent` (`styles.css` line 257, READ repo). In dark mode a pale lavender strip shows on every screen. It is the brightest thing on the page for the whole session. That breaks "quiet by default". Add a separate token for the banner. Use `--accent-soft` `#1A1E3C` as the fill and `--accent-ink` as the text. COMPUTED: that text is 9.93 to 1. The fill is close to the page (1.13 to 1). Add a 1 px `--line` edge. Banner text does not change.
- A bright block in a dark room is glare. It is rare by design. It shows only for pause, emergency and the knee-gave-way messages.
- Other users of `--accent`: the gauge limit mark, the erase dialog edge, `.chip-accent`. Check each one in dark mode.

Gate:
- The contrast test of `styles.test.ts` covers the dark block (the migration plan step 3 asks for this, `docs/ui-design.md` section 9).
- axe 0 violations in dark mode on Session, Summary, Red flag and My data (the screens with `notice-strong`).
- `noVerdict.test.tsx` passes. A screenshot of the banner in dark mode shows no bright strip.

## 6. Tape-yellow leg trace and ochre chart series

Decision: keep the white trace with its dark halo and reject tape yellow. Drop `--chart-2` ochre now. Needs the user to confirm.

Why:
- The rule says "no verdict colour" and "no green or red" (FR23, NFR12). Yellow and ochre are neither. Both pass the repo test. COMPUTED: yellow `#FFD54A` is hue 92, chroma 0.157. It sits 8 degrees below the green band of the test (100 to 175). Ochre is hue 78 to 83.
- The rules can allow a fixed warm colour. They cannot say whether a patient reads yellow as a warning. In many control rooms amber means caution. This is the state-colour risk. I found no evidence in the repo that the current trace is hard to see.
- The current trace is white with a dark halo and a dashed other leg (`styles.css` lines 2092 to 2160, READ repo). `docs/live-test/skeleton-validation.md` reports no colour problem (READ repo, I found no line about it). The brief gives no reason for yellow except a fixed colour (brief section 6.8). KISS says keep what works.
- Ochre has no user. Every chart in `app/src/ui/Dashboard.tsx` plots one series, `dataKey="value"` (READ repo). `dashboard.css` uses only `--chart`. The two-series rule of brief section 6.3 is for a chart that does not exist. YAGNI says drop `--chart-2` until one exists.
- The rule for a future second series: use `--ink` dashed with a different marker, a direct label and a table. A warm hue is not needed. The dataviz validator must run on it (not run here).

Risk:
- White on a bright wall or a white blanket can lose contrast. The halo of `#120b0ab3` is 18.39 to 1 against white (COMPUTED) and keeps the line visible. This is untested on a real room.
- If the user prefers yellow: pin it so it cannot become a state. It must never change by state or time. Only `.bm-*` classes use it. Use it nowhere else. Add a test that finds `--trace` only in the body map rules.

Gate:
- If white stays: no change, and `bodyMap*.test.tsx` pass.
- If yellow is chosen: a new test pins the single use. `styles.test.ts` passes. Look at the trace on three real backgrounds (white wall, dark wall, bed).
- Any future second series: run `validate_palette.js` in both modes before the colour enters the CSS.

## Summary table

| # | Question | Decision | Confirm with the user |
|---|---|---|---|
| 1 | Plaster or paper | Plaster, whole token set, fix the edge-on-sunken pair | no |
| 2 | Bottom bar | Yes: Home, Your sessions, My data. Remove the replaced tiles. Hidden on flow screens | no |
| 3 | Pain ruler | No. Keep 11 radios. Restyle only | yes (safety floor) |
| 4 | Camera on top, no card | Yes. Full width, 4:3, no border. Cue banner stays off the picture | no |
| 5 | Lavender attention block | Yes, dark theme only. Separate banner token | no |
| 6 | Yellow trace and ochre | Keep white trace. Drop ochre until a two-series chart exists | yes (state colour) |

## Changes I recommend to the brief

1. Section 11, item 2 and wireframes 7.1 and 7.7: replace "Progress" with "Your sessions" (FR13).
2. Section 7.6: the Summary has no "Do not save" button. It has "Skip the questions" (FR11, T40). Fix the wireframe and the line "Save and Do not save".
3. Section 7.6 and section 11, item 3: remove the range input. Keep the 11 radios. State that the 48 px rule and the "no value pre-selected" rule decide this.
4. Section 0, bullet 2: the camera is already first on a phone. Say what is left (the card look). Cite `styles.css` lines 1951 to 1966 and `e2e/app-session-layout.spec.ts`.
5. Section 7.4: the bar can hold three rows because of "Count this rep". Redo the height arithmetic. Do not overlay the cue banner on the camera (L3-06).
6. Section 6.2: add the pair `--edge` on `--sunken` (2.97 in light, fails). State the script is in the scratchpad only. Copy it into the repo or say so.
7. Section 6.1 and 6.3: remove `--chart-2` until a two-series chart exists. Keep `--trace` out of the token list if white stays.
8. Section 6.1: add a banner token for dark mode so the banner does not turn lavender (decision 5).
9. Section 11, item 6: the question is not only "is it red or green". Name the caution-colour risk of yellow and amber.
10. Section 13: add the open gap that no real-phone test exists for pain taps on 6 and 7.

## Checks

- `python3 ~/.claude/scripts/ste-check.py` was run on this file. See the report for the result.
- No temporary file or process was created. Nothing needs cleanup.
