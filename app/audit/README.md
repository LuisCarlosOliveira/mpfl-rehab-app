# Audit scripts

These Node scripts check a built copy of the app. They are not part of the app bundle.
They use the Playwright and axe-core packages that the app already has. They add no dependency.
All scripts read the app. None of them writes into the repo. Output goes to a temp folder by default.

## What each script checks

- `a11y/audit.mjs`: accessibility and layout. It runs axe (WCAG 2.2 AA), colour contrast, tap target size, text zoom to 200 percent, keyboard order and traps, and reduced motion. It covers 28 screens. Three of them are the "NEW" screens: Home with a plan, and Check my progress. The questions of "Create my plan" run in 3 groups (Step 1 of 3 to Step 3 of 3). A helper picks an answer inside the group of one question, found by its legend. The date of surgery has the fields Day, Month and Year. The exit code is 1 if a screen or a keyboard journey step did not run (`runErrors` or `journeyFailed` above 0). A gap cannot pass.
- `sec/hostile.mjs`: hostile data. It loads bad plan files, bad stored data, bad pairing codes and fake history. It makes sure that no script runs, no CSP rule breaks, no foreign request leaves, and the screen stays usable. Case `c9-control` must fail on purpose (`CONTROL=1`). Cases `c10a` to `c10d` cover Home and Check my progress for a plan at week 8. The exit code is 1 if a case failed or did not run to the end (`notRun` in the `SUMMARY` line).
- `honesty/honesty-audit.mjs`: data honesty and standing rules. It checks banners, verdict words, scores, state colours, angle labels, chart and table agreement, empty states, the red-flag gate, and the new screens. An angle in a sentence that names a source (S, P or N plus 1 or 2 digits) needs no angle label. The skip link is not a tap target at rest. It waits above the page until a key focuses it. The 48 px target check leaves it out. The words "surgeon limit", "limit in your plan" and "your care team" have the same effect.
- `honesty/audit-inpage.js`: helper code that the honesty audit injects into each page.
- `gate/source-checks.sh`: source checks with grep. It looks for unsafe APIs, inline styles, remote URLs, dynamic links and a missing CSP. Exit code is the number of hits. A CSS `@import` of a relative local file in quotes (`'./tokens.css'`) is allowed. Every other `@import` is a hit: `http(s):`, protocol-relative, `url()` and a bare name. `bash audit/gate/source-checks.sh --selftest` proves that the remote forms are still caught.
- `gate/first-load.mjs`: counts the gzip size of the first-load files of a build.
- `gate/chain.sh`: runs all steps in one chain.

## How to run

Run these commands in the `app` folder. Build first.

1. Build to a folder outside the repo: `npm run build -- --outDir /tmp/mpfl-dist --emptyOutDir`.
2. Start the preview: `node node_modules/vite/bin/vite.js preview --outDir /tmp/mpfl-dist --host 127.0.0.1 --port 4660 --strictPort`.
3. Run a script with the preview URL:
   - `BASE_URL=http://127.0.0.1:4660 npm run audit:a11y`
   - `BASE_URL=http://127.0.0.1:4660 npm run audit:sec`
   - `npm run audit:honesty -- http://127.0.0.1:4660 --theme both --src src`
   - `npm run audit:selftest` needs no preview.
4. Stop the preview by its PID.

Or run the whole gate: `PORT=4660 npm run gate`. The gate builds into `$OUT/dist`, starts and stops its own preview, and writes `$OUT/status.txt`.
To leave steps out, set `SKIP`, for example `SKIP="precheck e2e" npm run gate`. The CI pipeline owns the precheck and e2e steps.

## Settings

- `APP_DIR`, `PW_ROOT` and `APP_ROOT` name the app folder for the a11y, sec and honesty scripts. The default is the folder two levels above the script.
- `BASE_URL` is the preview URL. `a11y` and `sec` need it. `honesty` takes it as the first argument.
- `OUT` is the result folder. `ONLY` picks screens (`a11y`, separate with `|`) or case ids (`sec`, an id prefix).
- `QUICK=1` shortens the a11y run. `LABEL` names the a11y result files.
- Default port for the gate is 4660. Change it with `PORT`.

## Manual tests

Seven e2e tests need a webcam clip of 33 MB. The clip is not in the repo. The tests skip with the reason `manual: needs the webcam clip, see app/audit/README.md`. The gate does not run them.

| Test | File | Variables |
|---|---|---|
| B4-03 at 320 x 568, 360 x 640, 390 x 844 and 1280 x 800 (four tests) | `e2e/app-live3-lock.spec.ts` | `LIVE_TRAP_CLIP` |
| B4-06 | `e2e/app-live3-lock.spec.ts` | `LIVE_TRAP_CLIP` |
| B5-04 at 320 x 568, heel slide | `e2e/app-live4-lock.spec.ts` | `LIVE_CLIP`, `LIVE_CASE=heel320` |
| B5-04 at 1280 x 800, straight leg raise | `e2e/app-live4-lock.spec.ts` | `LIVE_CLIP`, `LIVE_CASE=slr1280` |

When the clip exists, run each file in the `app` folder. Use the clip `t1-heel-shift-left.mjpeg` for the heel cases. Use `08-straight-leg-raise-oblique.mjpeg` for `slr1280`.

1. `LIVE_TRAP_CLIP=/path/t1-heel-shift-left.mjpeg npx playwright test e2e/app-live3-lock.spec.ts`
2. `LIVE_CASE=heel320 LIVE_CLIP=/path/t1-heel-shift-left.mjpeg npx playwright test e2e/app-live4-lock.spec.ts`
3. `LIVE_CASE=slr1280 LIVE_CLIP=/path/08-straight-leg-raise-oblique.mjpeg npx playwright test e2e/app-live4-lock.spec.ts`

## Output files

- a11y: `<OUT>/audit-<LABEL>.json` and `<OUT>/audit-<LABEL>.md`.
- sec: `hostile-result.json` in `OUT`. The last line starts with `SUMMARY`.
- honesty: `<out>/honesty-audit.json` and screenshots. FAIL gives exit code 1.
- gate: `$OUT/status.txt` and one log for each step.

## Self test

`npm run audit:selftest` runs the honesty audit on a page with known faults. It must print `SELFTEST OK`. A broken check cannot pass this test. The gate also runs `bash audit/gate/source-checks.sh --selftest`. It must print `SOURCE SELFTEST OK`.

## Recovery note

These files were rebuilt from logs of earlier work after the original folder was lost. The rebuild replays the logged writes and edits in time order.
The paths, the temp output folders, the build folder and the preview PID handling of `gate/chain.sh` are new.
TODO: the real clip option `--clip` of the honesty audit needs a webcam MJPEG file. That file is not in the repo.
TODO: the first run of `gate/source-checks.sh` with a second folder (compare with a main tree) is not tested here.
