# UI redesign: security audit plan and baseline

Skills used: owasp-security, break-ui, web-design-guidelines, simple-english:simple-english.

The web-design-guidelines skill was loaded. This audit did not fetch its rule list. It checks overflow and the reachable controls only. It is not a full guideline review.

## What this is

This is the prepare phase of the security audit for the UI redesign. It has two tools and one baseline run on the main tree.

- Script for hostile data: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-sec/hostile.mjs`
- Script for source checks: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-sec/source-checks.sh`
- Baseline result data: `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-sec/baseline-result.json` and `baseline.log` in the same folder.

The scripts add no dependency. The hostile script uses the Playwright that is in `app/node_modules`. Both scripts only read. They write only the result file.

## How to run

Run the script against any build of the app. The build must come from `vite preview` or from a host that sends the CSP header.

```
BASE_URL=http://127.0.0.1:PORT node /tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-sec/hostile.mjs
```

Options:

- `OUT=<file>` sets the result file. The default is `hostile-result.json` next to the script.
- `ONLY=<case id prefix>` runs a part, for example `ONLY=c7` for the URL cases.
- `CONTROL=1` adds a positive control. This case must fail. It proves that the checks can see a fault.
- `PW_ROOT=<app dir>` sets the folder with `node_modules` (default is the main tree app).

The run takes about 4 minutes. The exit code is 1 if any case fails. For the redesign, start `vite preview` on a free port from the built worktree. Use a port other than 4380, 4391 and 4196.

Source checks:

```
/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/uiaudit-sec/source-checks.sh <app dir of the redesign> [<app dir of the main tree>]
```

The exit code is the number of hits.

## What each case checks

Every screen that a case reaches gets the same audit at 320 pixels and at 1280 pixels width.

- No script ran. A payload sets `window.__pwn`, and the audit reads it.
- No crash. The root has content and at least one control (button, link, file input or text box) that works.
- No horizontal page overflow and no element outside the viewport.
- No injected markup: no script, iframe, `on*` attribute, `javascript:` or `data:` URL, or image in the page. No `target=_blank` without `rel`.
- No request to another origin. The script aborts such a request and counts it. It also counts every non-GET request to the own origin.
- CSP violation count, console errors, page errors, dialogs, downloads and popups.
- Storage after the run. It reads every IndexedDB store and localStorage. It fails on a Blob, ArrayBuffer, typed array, ImageData, or a `data:image`, `data:video` or `blob:` string. It fails on a second database, a cookie, a cache, a service worker and a localStorage key without the `mpfl.` prefix.
- Prototype pollution of `Object.prototype` and `Array.prototype`.
- Verdict words in the text of the app, such as "healed", "recovered", "ready to progress" and "on track". The first case collects the words that the clean app uses. Only a new word fails.
- The active phase. The phase on Home must equal the phase in the file. The stored phase must not change.

Cases:

| Id | Content |
| --- | --- |
| c0a, c0b | Clean example plan. This gives the allowed word list. |
| c1 | Plan text fields (author, phase name, exercise source, five surgeon fields) with script and image payloads, `javascript:` text, template text, HTML entities, 400 unbroken characters, zero-width text, right-to-left text and emoji. The plan then goes through Home, red flag, Setup, and the care team view. |
| c2 | 27 plan files that the loader must refuse: 10 MB file, 4.9 MB valid JSON, 5 MB of multi-byte text, `__proto__` and `constructor` keys at four depths, wrong types, root types, empty, NUL bytes, payload keys, negative, huge, infinite, NaN, decimal and negative-zero numbers, 200000 levels of nesting, a 1.5 million element array, bad id, bad date. Each must show an alert, store nothing and keep the Load screen. Two odd files that the loader accepts are recorded as notes: a BOM and a duplicate key. |
| c3 | Valid plan at the limits: 10 phases, active phase 10, pain threshold 0, limits 0 and 180. |
| c4 | Session import: 1200 sessions at extreme valid values, then Progress and the care team view. File names with a payload, 250 characters, and right-to-left text. Payload values, `__proto__`, wrong types, 5001 sessions, a 6 MB file, a non-JSON file. |
| c5 | IndexedDB with 25 hostile session rows (payload text, NaN, Infinity, wrong types, 100000 character field, `__proto__`) and a valid plan. Stored plan text that is changed in place (not JSON, 8 MB, `__proto__`, payload text, an approval added to the example). Hostile `mpfl.*` localStorage values and fake keys such as `mpfl.redFlagCleared`. |
| c6 | Pairing. The phone screen gets 17 hostile codes pasted. The laptop screen gets the same list, plus one valid answer. The script counts `RTCPeerConnection` and `setRemoteDescription` calls. |
| c7 | 15 URLs (query and hash) with payloads, screen names, `mode=patient`, `redFlagCleared=true`, `phase=9`, long values. A plan with phase 2 is stored. The screen must be Home, the phase must stay 2, and the red-flag gate must show. One case uses browser Back and Forward and fake history entries. The gate must not be passed. |

## Source check on the main tree and the redesign tree

Both trees were checked. Result: 0 hits for each.

- No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacent`, `document.write`, `eval`, `new Function`, `srcdoc` or string timer.
- One `target="_blank"` link (`src/ui/Privacy.tsx` line 36). It has `rel="noopener noreferrer"`.
- No `style=` attribute and no inline script in `index.html` or `src`.
- No `href` or `src` that gets its value from a variable.
- `app/package.json` and `app/package-lock.json` of the redesign tree are identical to the main tree. No new dependency at the time of the check.
- The CSP in `index.html` and in `public/_headers` is the same in both trees.

The three `https://` links in `src/lib/protocolGen/sources.ts` are data strings. The code never renders them as a link or fetches them.

## Baseline result (main tree build in `app/dist`, port 4501)

Command output, summary line: `cases=68 pass=66 fail=2 audits=180 cspViolations=0 foreignRequests=0 scriptRuns=0`.

Counts over all 68 cases:

- Script runs: 0. CSP violations: 0. Console errors: 0. Page errors: 0.
- Requests to another origin: 0. Non-GET requests to the own origin: 0. Popups: 0.
- Frame, video, Blob or image data in storage: 0. Databases: only `mpfl-rehab`. Cookies, caches and service workers: none.
- Prototype pollution: 0. Injected markup: 0. Crash screens: 0. Verdict words: 0.
- 27 of 27 bad plan files refused with a plain alert and nothing stored. The 10 MB file took 2.4 seconds. The 1.5 million element array took 1.7 seconds.
- 1200 sessions imported in 0.5 seconds. Progress opened in 2.6 seconds.
- Stored plan text that is not valid goes to the Load screen. A valid stored plan with payload text shows as text, and Home shows the stored phase.
- Red-flag gate: not passed by URL, by history entries, by Back and Forward, by fake localStorage keys, or by a reload.

The 2 failed cases:

1. `c2-bad-float-where-int` was slow in one run (8.4 seconds). The same case took 42 ms in two later runs. This is machine load. It is not an app fault. It was a timing flake in the 5 second limit.
2. `c6b-pair-laptop-paste`: the page is 3 pixels wider than a 320 pixel screen on the laptop pairing step ("Add a second camera"). The overflow is there before any input. Hostile data does not cause it. This is a real layout fault of the main tree at 320 pixels. The redesign must not keep it.

Two observations that are not failures:

- The export copies stored rows as they are, with no schema check. A hostile local row, for example NaN, is exported. The CSV quotes text cells. The import refuses such a file. Rows come only from the own device, so the risk is low.
- The plan loader accepts a duplicate JSON key (the last one wins). The pairing parser rejects it. The plan schema is strict, so the effect is small.

## Positive control

`CONTROL=1 ONLY=c9` injects an image with an `onerror` attribute and then clears the root. The script failed as it must: it reported `img, img[onerror]`, `crash screen: root empty` and 4 CSP violations. The control also tried to inject a wide element with an inline style. The CSP blocked the style, so no overflow showed. The overflow check is proved only by the real 3 pixel finding above.

## Gaps

- The messages of the data channel from a real phone (landmark frames) are not tested here. The script has no peer. The vitest files in `tests/pairing` cover `parseMessage`. A hostile peer test needs a second browser.
- The video and the pose loop run on the fake camera only. The script does not check frames in a live session. It checks storage and the code paths for a stored frame only after the screens that it reaches. The Session and Summary screens are not part of the hostile cases. They need the fake camera and about 20 seconds each.
- A real QR scan with a hostile image is not tested.
- The dev server is Vite preview. A host that is not Vite can answer a very long URL (more than about 16 KB) with HTTP 431. This is not the app. The URL cases stop at 10 KB for that reason.
- WebKit and Firefox are not run. Chromium only.
- The size of text in the redesign is not checked for contrast or touch target size. The a11y e2e test covers that.
- The script checks the screens that exist now. A new screen in the redesign needs a new case in `hostile.mjs`, or it is not covered. The audits reach Load, Home, My data, Care team view, Progress, red flag, Setup (guide and camera step) and the pairing screens.
- The main tree has no error boundary (no `componentDidCatch` in `src`). A render error in a screen leaves a blank page with no way back. No hostile input caused this in the baseline, but the redesign must not add a way to throw during render. The control case shows that the script detects a blank root.

## What to run on the redesign

1. `source-checks.sh` on the redesign `app` folder. Expect 0 hits.
2. `hostile.mjs` against `vite preview` of the redesign build. Expect the same counts as the baseline: 0 script runs, 0 CSP violations, 0 foreign requests, 0 stored media, 0 crash screens, 0 verdict words.
3. Compare every fail line with the baseline list above. The 3 pixel overflow on the laptop pairing step must be gone.
4. Run `CONTROL=1 ONLY=c9` once. It must fail. If it passes, the checks are blind.
5. If a screen, a button name or a heading changed, update the selectors at the top of each case first. A selector error shows as `script error` and not as a pass.
