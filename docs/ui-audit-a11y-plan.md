# UI audit: accessibility and responsive plan

Skills used: break-ui, web-design-guidelines, chrome-devtools-mcp:a11y-debugging (server down, Playwright used), modern-web-guidance, simple-english:simple-english.

## The script

The script is `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-a11y/audit.mjs`. It uses Playwright and `@axe-core/playwright` from `app/node_modules`. It adds no dependency.

Run it on any URL:

```
BASE_URL=http://127.0.0.1:<port> LABEL=<name> node audit.mjs
```

Options: `QUICK=1` (1280 and 390 wide, light only), `ONLY="Home|Session"` (screen names, split by a bar), `OUT=<folder>`, `CONCURRENCY=2`. The output is `audit-<LABEL>.json` and `audit-<LABEL>.md`. A full run takes about 6 minutes.

To audit the redesign, build it, serve it with your own `vite preview` on a free port, and run the script with `LABEL=redesign`. Then compare the two `totals` blocks.

## What the script checks

It covers 25 screens. These are Privacy, Load protocol, file refused, Home, Red flag (also blocked), Setup (three states), Session, and Summary (also pause message). They also include Your sessions, My data, Care team view, second camera, six generator screens, Update my plan, and the error screen. The error screen appears because the script aborts a chunk request on purpose.

1. axe (WCAG 2.0, 2.1, 2.2 A and AA, and best practice) at 1280x800, 390x844 and 360x640, light and dark.
2. Keyboard. Each screen: Tab and Shift+Tab reach every control, the focus ring is visible, and no trap exists. One journey uses only the keyboard (Enter, Space, arrow keys, Escape, Back button, browser Back) from Privacy to Your sessions.
3. Tap targets at 390 wide. A radio or checkbox counts through its label. The limit is 48 px.
4. Horizontal scroll, off-screen elements and clipped text at 320, 360, 390, 768 and 1280, and again with the root font at 200 percent.
5. Console errors, failed requests, and requests to another origin.
6. Motion with `prefers-reduced-motion: reduce` and with no preference. It counts running transform animations and transitions.
7. Contrast of every visible text node, with the ratio. The limit is 4.5, or 3 for large text.

## Baseline (main tree, `app/dist`, port 4471)

The run covered 25 screens in 370 seconds. It had no run errors.

| Check | Result |
|---|---|
| axe violations | 0 nodes, 0 rules, on all 150 screen and size runs |
| Contrast failures | 0 pairs. The lowest ratio on any screen is 4.52. The white text on the teal primary button measures 4.53. |
| Tap targets under 48 px at 390 | 0 of 184 |
| Horizontal scroll at 320, 360, 390, 768, 1280 | 0 screens |
| Clipped text at normal size | 0 |
| Keyboard: controls not reached | 0 (forward and backward) |
| Keyboard: traps, controls with no focus ring | 0 |
| Keyboard journey | 25 of 25 steps ok |
| Console errors, failed requests, other-origin requests | 0 (the error screen adds 30 console errors and 20 failed requests on purpose) |
| Transform animation with reduced motion | 0 |
| Transform animation with no preference | 3 (a transform transition on a radio or checkbox input, on three screens) |
| Horizontal scroll at 200 percent text | 10 screens (see below) |

### Findings to fix or keep

1. 200 percent text causes horizontal scroll on 10 screens. At 320 wide: Home, Session, Red flag, Red flag blocked, Generator your plan, Update my plan and Second camera. At 320 and 390 wide: Setup position guide, Setup camera step, Setup camera running and Second camera. The causes are the step list (`li.step`), `.guide-note`, `.exercise-body`, `.session-meta` and `.plan-exercise`. The redesign must keep these wrapping. This is a WCAG 1.4.4 and 1.4.10 risk.
2. The primary button contrast is 4.53 and the limit is 4.5. Any colour change in the redesign can break it.
3. Date inputs have no outline of their own. Chromium highlights the active field inside the input. The redesign must keep this visible, or add an outline.
4. The red flag block lasts for the whole visit by design. After the person ticks and clears a box, Continue stays disabled. Keyboard users must leave and come back. This is a product rule, not an audit fault, but it can confuse people.
5. Escape does nothing on any screen. This is allowed. It is not a fault.

## What the script cannot test

- The file dialog of the Load screen. Playwright sets the file. The script only proves that Tab reaches the control.
- A real screen reader, real touch, and real phone browsers. WebKit and Firefox are not run.
- The Chrome DevTools MCP server did not connect, so no Lighthouse audit ran. Playwright and axe replaced it.
- Real camera and pose tracking. The fake camera of Chromium feeds the Session screen.
- The Setup second-camera pairing, and the QR scan in the phone screen. Only the intro of the phone screen is audited.
- Text zoom is simulated with a 200 percent root font size. Browser page zoom is not tested.
- Dark mode is emulated with `prefers-color-scheme`. The numbers show that the app has dark colours (the lowest ratio in dark is 4.54), but this is not a visual review.
- Contrast is computed from text and background colours. Text on an image or gradient is counted as unknown. The baseline had 0 such nodes.
- Focus ring contrast against its background is not measured.

## Clean up

Removed: the own `vite preview` on port 4471 (PIDs 3169406 and 3169436), and the temporary debug files. Kept: `audit.mjs`, `audit-baseline.json`, `audit-baseline.md`, `uiaudit-bad-protocol.json` (input file of the script), `uiaudit-preview.log`, all in the folder `uiaudit-a11y` of the scratchpad.
