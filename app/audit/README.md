# Audit scripts

These Node scripts check a built copy of the app. They are not part of the app bundle.
They use the Playwright and axe-core packages that the app already has. They add no dependency.
All scripts read the app. None of them writes into the repo. Output goes to a temp folder by default.

## What each script checks

- `a11y/audit.mjs`: accessibility and layout. It runs axe (WCAG 2.2 AA), colour contrast, tap target size, text zoom to 200 percent, keyboard order and traps, and reduced motion. It covers 28 screens. Three of them are the "NEW" screens: Home with a plan, and Check my progress.
- `sec/hostile.mjs`: hostile data. It loads bad plan files, bad stored data, bad pairing codes and fake history. It makes sure that no script runs, no CSP rule breaks, no foreign request leaves, and the screen stays usable. Case `c9-control` must fail on purpose (`CONTROL=1`). Cases `c10a` to `c10d` cover Home and Check my progress for a plan at week 8.
- `honesty/honesty-audit.mjs`: data honesty and standing rules. It checks banners, verdict words, scores, state colours, angle labels, chart and table agreement, empty states, the red-flag gate, and the new screens. An angle in a sentence that names a source (S, P or N plus 1 or 2 digits) needs no angle label. The words "surgeon limit", "limit in your plan" and "your care team" have the same effect.
- `honesty/audit-inpage.js`: helper code that the honesty audit injects into each page.
- `gate/source-checks.sh`: source checks with grep. It looks for unsafe APIs, inline styles, remote URLs, dynamic links and a missing CSP. Exit code is the number of hits.
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

## Output files

- a11y: `<OUT>/audit-<LABEL>.json` and `<OUT>/audit-<LABEL>.md`.
- sec: `hostile-result.json` in `OUT`. The last line starts with `SUMMARY`.
- honesty: `<out>/honesty-audit.json` and screenshots. FAIL gives exit code 1.
- gate: `$OUT/status.txt` and one log for each step.

## Self test

`npm run audit:selftest` runs the honesty audit on a page with known faults. It must print `SELFTEST OK`. A broken check cannot pass this test.

## Recovery note

These files were recovered from agent transcripts after the original folder was lost. The recovered files replay the logged writes and edits in time order.
The paths, the temp output folders, the build folder and the preview PID handling of `gate/chain.sh` are new.
TODO: the real clip option `--clip` of the honesty audit needs a webcam MJPEG file. That file is not in the repo.
TODO: the first run of `gate/source-checks.sh` with a second folder (compare with a main tree) is not tested here.
