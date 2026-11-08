# UI design

Date: 2026-11-08. Status: design proven in a scratch copy. Nothing in `app/` changed. The user tested the old app on a phone and called it terrible. This file holds the new design, the evidence for each choice, and the plan to move it into the app.

Scratch folder: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/ui2/` (called `ui2/` below). It has the approach B app (`b-css/`), the shadcn proof (`a-shadcn/`, `a-base/`), the scripts, and all screenshots.

## 1. Decision

The app uses approach B: hand-written CSS on design tokens, native HTML elements, a few small components, and inline SVG icons. It adds no npm package. shadcn/ui and Tailwind (approach A) are dropped. The user allowed this choice if B wins or ties.

Reasons, from measurements (section 2):
- B looks as good as A. I built Home and Session both ways. A needed patches to the generated components to reach the same result.
- B adds 4.5 kB to the first-load JavaScript. A adds 16.8 kB for two screens.
- B adds 0 packages. A adds 8 direct packages and about 330 more production packages.
- B has 0 CSP violations. Radix dialog and alert dialog have 2 each.
- The app needs no select, popover, tooltip or menu. Native `dialog`, `details`, `fieldset` and `input` do the work.

Decision for the user: if a later screen needs a popover, a select or a tooltip, use shadcn with the Base UI variant. It has 0 violations. Never use the Radix dialog (section 5).

## 2. Evidence: A against B

Both approaches use the same palette and the same font. A has only Home and Session built with shadcn. B has every screen.

| Measure | Before | B (hand CSS) | A (shadcn, Radix) |
|---|---|---|---|
| First-load JS, gzip | 138.87 kB | 143.44 kB (+4.57) | 155.67 kB (+16.80) |
| First-load CSS, gzip | 1.85 kB | 5.34 kB (+3.49) | 9.12 kB (+7.27) |
| Font, woff2 | 0 | 20.16 kB | 20.16 kB |
| New direct packages | 0 | 0 | 8 (plus `shadcn`, `cn`, `@types/node` from `init`) |
| Production packages installed | 50 | 50 | 381 |
| CSP violations on load | 0 | 0 | 0 |
| CSP violations, dialog and alert dialog | not applicable | 0 (native `dialog`) | 2 and 2 |
| Control edge contrast, default | not applicable | 3.41 to 1 (token set by me) | 1.32 to 1 (`border-border` on outline buttons) |
| Default button height | 48 px | 48 px | 32 px (`h-8`) |
| Visual quality | poor | good | good, after patches |
| Maintenance | one file | one file, tokens | Tailwind, 8 packages, patched generated files |
| Build risk | none | none | native binaries run in `vite build` |

How I measured:
- Sizes: `vite build` of each app, then gzip level 9 of the files that `index.html` loads with their static imports (`ui2/size.sh`). The lazy chunks (charts, pose model) are the same in all three.
- A needed these edits for B quality: button heights on every use, the outline border token, font weights, the card ring and the badge height. It also needed a neutral `destructive` token, an own `cn` helper and no font package.
- `shadcn init` (CLI 4.23.0, run with `--ignore-scripts`) adds three things that the vetting did not list: `cn@0.5.2`, `@fontsource-variable/geist`, and `shadcn` as a production dependency. I removed the first two.
- Screenshots of A: `ui2/shots/a/phone/04-home.png`, `ui2/shots/a/laptop/04-home.png`, `ui2/shots/a/phone/22-session-live.png`.

## 3. Research

Sources opened with a rendered browser (Playwright, screenshots read with the Read tool) or with `curl` for text:
- designeer.xyz: a curated link directory. It lists art, motion and UI shots. It has no health app. I took no layout from it.
- component.gallery (Segmented control: 28 examples, Stepper: 20, Badge, Progress indicator): names and anatomy of the parts.
- inclusive-components.design (Cards, Collapsible Sections, Notifications): structure and ARIA rules.
- utopia.fyi: the method for fluid type and space without breakpoints.
- collectui.com (Workout tracker): one card seen. A tinted card, an activity icon, one large metric and one stop control.
- 21st.dev (Segmented Control, Steps pages): 70 and 85 community components. Shapes only.
- 60fps.design: has a Health category. It shows heart-rate screens and celebration effects.
- fontsource.org (Figtree, Inter): licence and file size of variable fonts.
- huetone.ardov.me: a lightness scale tool with APCA. I used the WCAG numbers of my own script instead.
- shadcn docs (installation/vite, theming, cli, changelog): Vite setup, token names, the `--base` flag (`base`, `radix`, `aria`).
- Not usable: Mobbin shows only a login page for apps. UX Archive did not connect. I rendered minimal.gallery, siteinspire, details.so, radix-ui.com, base-ui.com and motion-primitives.com but studied none of them.

Ideas I took, by site and pattern:
- component.gallery, Segmented control: the pain scale 0 to 10 and the swelling choice. Native radio inputs in pill shapes. The selected pill is filled.
- component.gallery and 21st.dev, Steps: the two-step indicator on Setup (Position guide, Camera).
- Collect UI, Workout tracker: Home exercise cards with an icon tile, chips and one primary button. Session counters in one card.
- inclusive-components, Cards: the heading is inside the list item. One real button for the action, not a link around the card.
- inclusive-components, Collapsible Sections: native `details` and `summary` for "Decisions for your surgeon".
- inclusive-components, Notifications: `role="alert"` for urgent text, `role="status"` for the rest.
- utopia.fyi: the type steps of section 4.2.
- fontsource.org: the font choice of section 4.2.

Ideas I rejected:
- 60fps.design heart and badge screens: red hearts and celebration read as verdict colours and goals.
- designeer: glass, blur, 3D, dither, ASCII art and number animation. They break the rule that nothing moves unless a person acts.
- Sponsored kits (BoardUI) and NumberFlow: licence unknown, and number animation.
- Progress rings and streak badges (seen in fitness apps): they imply a goal. The guardrail skill forbids a goal.
- A set progress bar on Session: the app has no set logic. A bar toward "10 reps" reads as a goal.

## 4. Design system

### 4.1 Palette

Source: Sanzo Wada combination 125 (Cerulian Blue, Violet Blue, Fawn), built with the skill `wada-ui-palettes`. The script certified 79 of 79 pairs in both themes. I rendered the three shortlisted combinations before I chose (`ui2/wada-125/sample.png`). Colours are hex values. Wada values approximate printed colours.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#fcf3ef` | `#191210` | page |
| `--surface` | `#fff9f6` | `#211a18` | quiet panels |
| `--raised` | `#ffffff` | `#2b2321` | cards |
| `--sunken` | `#f4e6e1` | `#120b0a` | chips, tracks |
| `--ink` | `#231714` | `#f3e9e6` | text |
| `--muted` | `#574946` | `#b8afac` | secondary text |
| `--edge` | `#91817d` | `#786f6d` | control edges |
| `--primary` | `#007e8f` | `#0093a5` | main action |
| `--on-primary` | `#fff7f3` | `#120b0a` | text on primary |
| `--primary-soft` | `#d8eff2` | `#022c32` | hero card, seen chips |
| `--accent` | `#40456a` | `#7178a0` | pause, emergency, notices |
| `--accent-ink` | `#40456a` | `#b3bbe6` | accent as text or icon |
| `--chart` | `#006271` | `#5fc1d2` | chart marks |

Contrast results (script `ui2/contrast-check.py`, WCAG 2.x, light and dark):

| Pair | Light | Dark | Need |
|---|---|---|---|
| ink on page | 15.95 | 15.51 | 4.5 |
| muted on page | 7.85 | 8.60 | 4.5 |
| subtle on page | 5.09 | 5.93 | 4.5 |
| on-primary on primary | 4.53 | 5.30 | 4.5 |
| on-accent on accent | 8.72 | 4.54 | 4.5 |
| link on page | 5.14 | 5.44 | 4.5 |
| accent-ink on cards | 9.22 | 8.18 | 4.5 |
| control edge on page | 3.41 | 3.78 | 3.0 |
| focus ring on page | 6.51 | 7.37 | 3.0 |
| chart mark on card | 7.03 | 7.36 | 3.0 |

The numbers that failed in the old shadcn spike now pass. Muted text went from 4.34 to 7.85. The ring went from 2.59 to 6.51. The control edge went from 1.26 to 3.41. The quiet divider (`--line`, 1.32) is not a control edge and carries no meaning. Disabled text is exempt and stays at 4.69 or more.

### 4.2 Neutral-colour decisions (guardrail: no green or red)

- No token is green or red. The hues are teal (211 degrees), indigo (277) and a warm paper neutral (38).
- The shadcn `destructive` token, if it ever returns, is the indigo `--accent`.
- Pause, emergency, "knee gave way" and error messages use the strong indigo block: dark fill, light text, an icon and the words. Colour never carries the meaning alone.
- The erase action has a thick indigo edge and a trash icon. It is not red.
- Pain values 0 to 10 and all charts use no severity ramp. The selected pill and every mark use teal.
- The limit on the angle gauge is a quiet indigo marker with the words "Your limit 90 degrees". It is not a goal or a target.
- The old test `styles.test.ts` flags the warm paper tints, because HSL saturation of a near-white is high. It must change to an OKLCH chroma test (section 9, step 3).

### 4.3 Type, space, shape, motion, icons

- Font: Figtree variable, weights 300 to 900, latin subset, self-hosted as `fonts/figtree-latin-wght.woff2`. Licence SIL OFL 1.1. Size 20,156 bytes. SHA-256 `4ba7d3d0...7462dd`. It has tabular figures (`tnum`), used for every number. The CSP allows it (`default-src 'self'`). Other fonts I measured: Manrope 24.8 kB, Plus Jakarta Sans 27.3 kB, Instrument Sans 30.1 kB, Onest 33.8 kB. The OFL text must go into `THIRD_PARTY_NOTICES.txt`.
- Type scale: six fluid steps from 360 px to 1280 px (utopia.fyi, ratio 1.2 to 1.25, base 17 to 19 px). The steps run `--step-m1` (0.89 to 0.95 rem), `--step-0` (1.06 to 1.19), `--step-1`, `--step-2`, `--step-3` and `--step-4` (2.20 to 2.90). The live numbers use `--step-hero`, from 4.5 rem (72 px) to 6.5 rem.
- Space: `--s-1` to `--s-7`, 0.25 rem to 3 rem. The steps from `--s-5` are fluid. The page gutter is fluid from 16 px to 32 px.
- Radius: 8, 14, 20 and 28 px, and pills. Shadow: three levels, two soft layers, tinted with the ink colour. Cards use level 1. The hero card and the camera frame use level 2. The dialog uses level 3.
- Touch targets: 48 px minimum on every button, choice row, pill and summary. The audit script checked all 78 screens. Result: 0 targets smaller than 48 px.
- Motion: only after a person acts. Press scale 0.98 (140 ms), chevron turn (160 ms), checkbox tick (120 ms), dialog fade and scale from 0.97 (180 ms, `@starting-style`). No keyframes. The existing reduced-motion rule turns everything off. This relaxes the old rule "nothing moves" to "nothing moves unless a person acts". That is a decision for the user.
- Icons: 44 Lucide icons (ISC licence) copied as path data into `Icon.tsx`. No package, no network. Each icon has a visible label and `aria-hidden`.

## 5. CSP findings

CSP: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'none'`. I did not change it. Method: a page opens each component under this policy in Chromium, and a `securitypolicyviolation` listener counts events (`ui2/csp-measure.mjs`).

| Component | Radix variant (`radix-ui` 1.8.1) | Base UI variant (`@base-ui/react` 1.9.0) | Native |
|---|---|---|---|
| Page load | 0 | 0 | 0 |
| Dialog | 2 (`style-src-elem`, inline) | 0 | 0 |
| Alert dialog | 2 (`style-src-elem`, inline) | 0 | 0 |
| Popover | 0 | 0 | not applicable |
| Tabs | 0 | 0 | not applicable |

- The cause is a `<style>` element that the Radix dialog injects (`react-remove-scroll-bar`). A style attribute is not the cause, because React sets styles through the CSSOM.
- Result: the Base UI variant is clean. The Radix variant is clean except for dialogs. The native `dialog` is clean and is what B uses.
- No decision on `style-src-elem 'unsafe-inline'` is needed. I did not test it. The CSP stays as it is.

## 6. Packages and assets

Approach B adds no npm package. For the vetting agent:

| Item | Kind | Licence | Size | Note |
|---|---|---|---|---|
| Figtree variable, latin | font file copied from `@fontsource-variable/figtree` 5.3.0 | OFL-1.1 | 20,156 B | not a dependency, only the file |
| Lucide icon paths | 44 paths copied from `lucide-react` 1.70.0 | ISC | 9.7 kB source | not a dependency, add notice |

Approach A, for the record only (not adopted). Pins from `docs/dependency-vetting-ui.md`: `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5, `tw-animate-css` 1.4.0, `radix-ui` 1.8.1 (or `@base-ui/react` 1.9.0), `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0, `lucide-react` 1.70.0. Run `npx --ignore-scripts shadcn@4.23.0` and remove `cn`, `@fontsource-variable/geist` and the `shadcn` production entry afterwards.

## 7. Screens

Before: `ui/before-360/`. After: `ui2/shots/b/<phone|laptop|tablet>/NN-name.png`. Phone is 390 x 844, laptop 1280 x 800, tablet 768 x 1024, all at 2x. Full-page shots show a sticky bar in the middle of the page. That is a capture effect.

Shared parts are these. A slim indigo strip holds the fixed banners, each with an info icon and the same text. A brand bar sits above a page head with the `h1` and one quiet action. Cards, chips and a sticky action bar complete the set.

| Screen | Design | Files |
|---|---|---|
| Privacy | Three point cards with an icon tile each. One large primary button. | `01-privacy` |
| Load protocol | A dashed drop area with a file icon. Errors in an indigo notice with a title. | `02-load`, `03-load-error` |
| Home | The first exercise is the hero: tinted card, icon tile, name, stat chips, large Start, and on wide screens its end-position drawing. Other exercises are compact cards. A side column holds protocol facts, the surgeon disclosure (10 items in one `details`) and the data tiles. | `04-home`, `05-home-surgeon-open` |
| Red flag | Two cards with icons. Large checkable rows. The block message is a strong indigo notice and scrolls into view. | `06-redflag`, `07-redflag-blocked` |
| Setup | Step indicator. Position guide with two cropped drawings and six note cards. Camera step: rounded frame, a large instruction, six status chips (icon and word, "seen" or "not seen"), a reserved drawing area, sticky Start. | `08` to `10`, `25`, `26` |
| Session | One card: the angle at 72 px or more with a gauge and a quiet limit marker, and the rep count. The cue and a strong alert banner. The camera in a rounded frame. A fixed bar: Stop and "Knee gave way or hurts". | `11`, `22` to `24` |
| Summary | Stat cards. Pain as an 11-pill segmented control. Swelling as three radio cards. The pause message is a strong notice with an icon. Save and Do not save in the sticky bar. | `12` to `14` |
| Progress | Charts in cards, two columns on wide screens. One teal hue, a quiet grid, a table under each chart with a fixed height. No goal line. An empty state with an icon. | `15`, `19` |
| My data | Four cards. A native erase dialog with a fade. | `16` to `18` |
| Care team | Drop areas, a summary card, tables and charts in the same style. | `20`, `21` |

Not built: the pairing screens (`PairHost`, `PairCompanion`). They did not exist in my copy.

## 8. Checks

- Screens: 26 screens at 3 sizes, the real flow plus a scripted harness for live session and setup states. Each check also reads axe, overflow, CSP events and the size of every button.
- axe (WCAG 2.0 to 2.2 A and AA, plus best practice): 0 violations. This holds for the last light runs (phone, laptop) and the last dark runs (phone, laptop). The tablet run is from the build before the last two small CSS fixes. Two bugs were found and fixed on the way: a dark-theme contrast loss from an opacity, and a hover colour in dark mode.
- Horizontal overflow: 0. CSP violations: 0. Targets under 48 px: 0.
- Layout bug found by looking: a three-digit angle ran into the rep counter on a laptop. Fixed with a wrapping unit and a wider angle column.
- Old tests on the new UI (scratch copy, `tests/ui` only, one worker): 248 of 258 pass with no test change. The 10 failures are listed in section 9.
- `tsc`, `eslint` and `claims-check.sh` pass in the scratch copy.
- Not done: a test on a real phone, a screen reader pass, the e2e suites and the full unit suite.

## 9. Migration plan

The repo changed after my copy: `App.tsx`, `Session.tsx`, `Summary.tsx`, `RedFlag.tsx`, `DataScreen.tsx` and `GuideFigure.tsx` are newer, and `figures.css`, `PairHost.tsx`, `PairCompanion.tsx`, `pairing/pair.css` and `pairing/qr.css` are new. Apply each step to the current files. Keep every heading, label, role and prop.

1. Add `src/ui/fonts/figtree-latin-wght.woff2`. Add the OFL text and the Lucide ISC notice to `public/THIRD_PARTY_NOTICES.txt`.
2. Replace `src/ui/styles.css` with the token and component sheet of `ui2/b-css/src/ui/styles.css`. Add the alias `--radius: var(--r-m)`, because `figures.css`, `pair.css` and `qr.css` use it.
3. Change `tests/ui/styles.test.ts`. The verdict-colour test must use OKLCH chroma and hue instead of HSL. The generic-family test must skip `@font-face`. The 72 px test must read the minimum of `--step-hero`. The contrast test must cover the dark block. Keep the no-keyframes and reduced-motion checks.
4. Add `Icon.tsx`, `Notice.tsx` and `Shell.tsx`.
5. Move the screens in this order, one commit each. Run the matching test file after each commit. The order is `App.tsx`, `Banners.tsx`, `Privacy.tsx`, `LoadProtocol.tsx`, `Home.tsx` and `RedFlag.tsx`. Then `Setup.tsx` with `GuideFigure.tsx` and `figures.css`, then `Session.tsx` and `Summary.tsx`. Last are `Dashboard.tsx` with `dashboard.css`, `DataScreen.tsx` and `ClinicianView.tsx`.
6. Re-theme `figures.css` to the new tokens. It has its own blue values. Add the crop of the viewBox if the new figure still has empty space, and keep the Start and End words in the caption.
7. Restyle `PairHost.tsx`, `PairCompanion.tsx`, `pair.css` and `qr.css` with `.btn`, `.card` and `Notice` in place of `.pair-btn` and `.pair-status`.
8. Add the harness idea to the e2e folder if wanted: a scripted source shows live session states.
9. Run `npm run precheck`, then the pipeline. Take new screenshots with `ui2/shots.mjs` and read them.

What each screen needs, in short: Home needs `guideFor` and `GuideFigure` for the hero. Setup needs `Icon`, `Notice`, and the `dl` markup of the note cards (`dt` and `dd` as direct children). Session needs the gauge (SVG attributes only) and the single counter card. Summary needs the `fieldset` legend fix (float, so it sits inside the card). Dashboard needs the `yTicks` field for the pain axis.

Old tests that fail on the new UI (10 of 258), and the change for each:
- `tests/ui/styles.test.ts` (3): the three changes of step 3.
- `tests/ui/session.test.tsx` (3): it queries `.attention[role="alert"]` and `.attention[role="status"]`. The class is now `.notice`.
- `tests/ui/dashboard.test.tsx` (3): the empty state has an icon, so "no chart" must look for `.recharts-wrapper` and not for any `svg`. The custom-property test cannot read names with digits such as `--s-3`. The no-transition test must allow the dialog fade, or the fade moves to `styles.css`.
- `tests/ui/wiring.test.tsx` (1): the same `svg` query in the sessions error text.

One code fix is already in the scratch copy. jsdom has no `scrollIntoView`, so `RedFlag.tsx` calls it as `scrollIntoView?.(...)`. Without it, 26 more tests fail.

## 10. Risks and weak spots

- The hero drawing and the Start, End figures still have a lot of white space. The real figure code changed after my copy.
- The sticky action bar covers the last chips on a short phone. The 50 vh limit on the preview helps. A real phone test is needed.
- Nothing ran on a real phone, with a screen reader or with a real person in the camera. The live states come from a scripted source.
- The warm paper background is a Wada choice. Some people find it pink. The token `--bg` is one line to change.
- `details` hides the surgeon list. Tests and e2e that read that text must open it first.
- The 44 icons and the font file need entries in the third-party notices.
- Dark theme is checked for contrast and layout only. No one has used it.
- Radix, Tailwind and the shadcn CLI are not in the app. If the user overrules this decision, the vetting conditions in `docs/dependency-vetting-ui.md` apply.
