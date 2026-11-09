# Test results of the final tree

Date: 2026-11-09. These results come from the tree of the commit that holds this file. The main session ran each command alone on one machine (an i5 laptop with software graphics, shared with agents at other times). The raw logs stay in the session scratchpad and are not part of the repository. A rerun on another machine can differ in time and frame rate, but not in pass counts.

## Commands and results

| Command (from the folder `app`) | Result |
|---|---|
| `npm run precheck` | Exit 0. 147 test files and 2,978 tests passed. It runs type check, lint, unit tests, and the five check scripts. |
| `bash scripts/model-hash-check.sh` | Exit 0. The model and WASM files match `public/models/SHA256SUMS`. |
| `bash scripts/deps-check.sh` | Exit 0. Every dependency is on `scripts/allowed-deps.txt`. |
| `bash scripts/plan-skills-check.sh` | Exit 0. Every finished task of the plan has a `Skills used:` line. |
| `bash scripts/claims-check.sh src` | Exit 0. No line matches the banned words, praise words, frame APIs, canvas code or inline colours. It is a pattern match. It cannot prove that no other banned text exists. |
| `bash scripts/phase-check.sh src` | Exit 0. No line of the source matches the patterns of the script. The check is a pattern match. Runtime tests and `tests/importGraph.test.ts` cover the real save path. |
| `npm audit --omit=dev` | Exit 0. 0 vulnerabilities in the runtime dependencies. |
| `npm run build` then `npm run e2e` | Exit 0. 154 browser tests passed in the `app` project (Chromium with a fake webcam, the real built app). |
| `npx playwright test --workers=1 --project=webkit` | Exit 0. 14 tests passed (WebKit 27.2). |
| `PAIR_PORT=4196 npm run e2e:pairing` | Exit 0 in 3 runs out of 3. 18 tests passed in each run (two Chromium pages with real WebRTC). |

No preview server and no fake-camera browser was left running after these commands.

## What these results prove and do not prove

- The code does what the tests say. The tests use synthetic landmarks and saved landmarks of 8 real public clips. They also run in a real browser, with a fake camera that plays those clips.
- The browser tests prove these points:
  - There are zero content policy violations on the screens that they open.
  - There are zero requests to another origin.
  - No frame or video is in the stored data.
  - The browser history cannot skip the red-flag check.
  - A second phone connects over WebRTC, and only landmark numbers cross the channel.
- They do not prove accuracy of the knee angle against a goniometer. They do not prove behavior on a real phone (a Redmi A3, real Android Chrome, the tailnet, a real Wake Lock). They do not prove that a clinician accepts any value or text.
- The live tests with real clips are in `docs/live-test/`. Round 1 found issues. Round 2 (`docs/live-test/retest.md`) verified 18 of 22 fixes. Round 3 changed the Back button, the 195 px layout, the plurals, the capture layout and the lowest-angle rule. The fixes of the final audit (audit 3) changed the pain floor between sets, the hand-count marker and the guard scripts. These fixes have unit and browser tests. They have no separate live re-test yet.

## Figures that other documents quote

| Figure | Source |
|---|---|
| First-load JavaScript 172,551 bytes gzip | `tests/ui/bundleSize.test.ts` limit 185 kB, and the round 2 measurement |
| Lighthouse mobile Home 99 to 100, Load 100, desktop 100, accessibility 100, best practices 100 | `docs/live-test/retest.md` (three runs each) |
| SEO 63 by design | `public/robots.txt` says `Disallow: /` because this is a private health tool |
| Pose loop about 15 detections per second on this laptop, 12.6 to 15.3 depending on load | `docs/live-test/performance.md` and the W4 measurements. It was not measured on a phone. |

## Note on test counts

`npx vitest list` shows fewer tests than a run executes. Tests that a loop generates are not all listed. For example `tests/protocolGenGenerate.test.ts` lists 32 entries and executes 139 tests. The executed count of the precheck run is the figure that this file quotes.
