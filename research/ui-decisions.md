# UI decisions: component library and design ideas

Date: 2026-11-08. This file records how the UI is built and why. Marks: V (measured or read in this session), INFERRED, UNVERIFIED.

## 1. Decision

The UI is plain React with one hand-written stylesheet (`app/src/ui/styles.css`). The app does not use shadcn/ui or any other component library. The shadcn MCP server is not used.

User decisions, 2026-11-08: do not use the skill `hmi-design-full`. Evaluate shadcn with measurements, and follow the result.

## 2. shadcn spike (V, measured in a scratch copy, nothing in the repo changed)

The spike added Tailwind v4 and nine shadcn components (button, checkbox, radio-group, alert-dialog, tabs, table, alert, label, input) to a copy of the app. Radix variant only. The Base UI variant was not tested. The spike used a proof screen with the red-flag checkboxes, the pain and swelling radio groups, an erase dialog, tabs and a table.

| Criterion | Result |
|---|---|
| First-load JavaScript, gzip, at most +40 kB | Pass: +36.39 kB (136.55 kB to 172.94 kB). Not lazy. |
| Zero CSP violations | Fail: 4 new inline-style violations when the alert dialog opens |
| Contrast: text 4.5, ring and border 3 | Fail until overridden: muted text 4.34, ring 2.59, border 1.26 |
| No verdict colour needed | Pass: the red `destructive` token can be set to a neutral |
| At most 6 added runtime packages, MIT or Apache-2.0 | Fail: 9 direct packages, with ISC and OFL-1.1 licenses among them |
| No serious axe violation | Fail: 1 serious (the app stylesheet and Tailwind collide on the tab text) |
| Dialog keyboard behavior | Pass |

Other numbers: CSS grows by 8.51 kB gzip. Seven Inter font files add about 218 kB. Radix installs about 60 packages. About 380 production packages are installed in total. The pose-model chunk stays lazy.

Native HTML already does the job for this app. A native `<dialog>` opened with `showModal` gives the focus trap, Escape and focus return. Native checkboxes and radio buttons in a `fieldset` are already used. The only real gain from shadcn was the dialog animation.

Sources: spike files under the session scratchpad (`shadcn-spike`, kept). The shadcn docs (https://ui.shadcn.com/docs/mcp, `installation/vite`, `components-json`, `theming`) do not state the license or the packages that `init` installs. The MCP setup block is `{"mcpServers":{"shadcn":{"command":"npx","args":["shadcn@latest","mcp"]}}}`. It started without error, and no tool call was tested.

## 3. Finding from the spike: Zod and the CSP

The spike saw 2 `script-src eval` violations on the plain app load, with no shadcn. It traced them to Zod, which probes `new Function`. A fix needs checking in the T14 review (Zod `jitless`). Status: UNVERIFIED until the T14 report.

## 4. designeer.xyz (V for what the site says, UNVERIFIED for the linked sites)

Designeer is a link directory that a curator reviews. It hosts no code or screens. The agent read 7 pages and did not open the linked sites. It found no health or rehab listings. Ideas that fit this app:
- Component Gallery (component.gallery): how design systems build forms and inputs. A pattern reference.
- Inclusive Components (inclusive-components.design): accessible patterns, piece by piece.
- Contrast tools (Color.review, Huetone, APCA): check text legibility. The spike used the WCAG formula.
- Mobbin and UX Archive: real onboarding and form flows. Mobbin pricing is unknown.
- Utopia: fluid type sizes, for the large live numbers on the Session screen.
- NumberFlow, Evil Charts, Tremor and BoardUI: not used. Number animation breaks the rule that nothing moves unless needed. Licenses are not stated, and BoardUI is a paid placement.

## 5. Rules that stay (guardrails)

No verdict words. No green or red verdict colour. Units next to numbers. Text contrast of at least 4.5 to 1. Touch targets of at least 48 px. Nothing blinks. These are enforced by `tests/ui/styles.test.ts` and `scripts/claims-check.sh`.
