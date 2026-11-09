# Lighthouse audit

This file shows how to measure the Lighthouse scores of the app. It also holds the first result.
The target is 95 or more in Performance, Accessibility and Best practices (NFR5 and section 7 of `MPFL_APP_PLAN.md`). The SEO target is dropped (see "SEO decision" below). The older text "each category" is superseded.

## First result

Date: 2026-11-08. Build: before the restyle of `src/ui`. Chrome 158. Lighthouse 13.6.0.
Each screen has the same score on mobile and on desktop, except Performance.

| Screen | Form factor | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| Privacy (first load) | mobile | 81 | 100 | 96 | 82 |
| Privacy (first load) | desktop | 100 | 100 | 100 | 82 |
| Load protocol file | mobile | 89 | 100 | 100 | 82 |
| Load protocol file | desktop | 100 | 100 | 100 | 82 |
| Home with example protocol | mobile | 89 (repeats: 96, 100) | 100 | 100 | 82 |
| Home with example protocol | desktop | 100 | 100 | 100 | 82 |

The mobile Performance score changes from run to run (81 to 100). The cause is Total Blocking Time (80 ms to 680 ms).
The first run after a cold start is the slowest.
Accessibility is 100 on every screen, so NFR5 passes for this part.
SEO is 82 on every screen, so the target of 95 is not met.

### Failing audits and causes

1. SEO `meta-description`: `index.html` has no `<meta name="description">`.
2. SEO `robots-txt`: the server answers `/robots.txt` with `index.html`. Lighthouse reports 15 errors, one for each line of the HTML.
3. Best practices `errors-in-console` (Privacy, mobile, first run only): `/favicon.ico` answers 404.
4. Performance `total-blocking-time` (mobile): the main chunk `assets/index-*.js` has 469 kB (145 kB gzip). Script work in this chunk took 580 ms to 800 ms under 4x CPU slowdown.
5. Performance `unused-javascript` (Privacy, mobile): 91 KiB of the main chunk is unused on the first screen.
6. Performance `render-blocking-insight`: `assets/index-*.css` (2.9 kB) blocks the first paint for about 150 ms.
7. Agentic browsing `llms-txt` (score 67): the server answers `/llms.txt` with `index.html`. This category is not part of the target.

### Proposed fixes (not done at the time, `src` was not changed by this work). Status on 2026-11-09 is in the next sections.

1. Add `<meta name="description" content="...">` to `index.html`. Use neutral text that does not claim a medical use.
2. Add `public/robots.txt`. A valid file is `User-agent: *` and `Disallow: /`. This is right for a private tool.
3. Add `<link rel="icon" href="data:,">` to `index.html`, or add `public/favicon.ico`. The CSP allows `data:` images.
4. Split the main chunk. Load the Session, Setup and Summary screens with `React.lazy`, like the data screens. Move `zod` and `dexie` out of the first chunk if the first screens do not need them.
5. Measure the chunk with a source map before the split, to find the large modules.
6. Optional: inline the 2.9 kB CSS, or accept the 150 ms.
7. Optional: add `public/llms.txt` with one `# Title` line and one link. This is not needed for the target.

## Second result (live test 4, commit b451206)

Source: `docs/live-test/performance.md`, round 1. Date: 2026-11-08 and 2026-11-09. Lighthouse 13.6.0. Median of three runs. The machine was shared, so the timing is noisy. Status of the proposed fixes above: items 1, 2 and 3 are done and the audits `meta-description`, `robots-txt` and the favicon error pass. Items 4 and 5 (the chunk split) were not done at this commit.

| Screen | Form factor | Performance (runs) | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| Privacy | mobile | 97 (97, 99, 97) | 100 | 100 | 63 |
| Privacy | desktop | 100 | 100 | 100 | 63 |
| Load protocol | mobile | 99 (99, 99, 99) | 100 | 100 | 63 |
| Load protocol | desktop | 100 | 100 | 100 | 63 |
| Home with protocol | mobile | 92 (98, 92, 90) | 100 | 100 | 63 |
| Home with protocol | desktop | 100 | 100 | 100 | 63 |

Accessibility was 100 in all 18 runs. A plan screen was not audited, because Lighthouse reloads the root URL (check C07, NOT RUN). The main chunk then had 749 kB (235 kB gzip), so Home on mobile fell below 95.

## After the first-load split (W3)

The screens Setup, Session, Summary, the plan screens and the phone screen now load on demand (commit 8a148dd). The test `tests/ui/bundleSize.test.ts` measures the first-load JavaScript. At the commit that added it, the first load had 172,736 bytes of gzip JavaScript (entry chunk 314,359 bytes raw). The limit in the test is 185,000 bytes gzip. This value comes from the test file and not from a Lighthouse run.

The main session reported a median Lighthouse mobile Performance of 95 on Home after this split. No report file in the repo holds that run, and I did not re-run it (not re-run). Accessibility and Best practices after the split are not in any report that I read (PENDING).

Update 2026-11-09: live test round 2 measured the split (`docs/live-test/retest.md`, commit 939d096, Lighthouse 13.6.0, Chrome 1254, 3 runs for each cell). The first load had 172,551 bytes of gzip JavaScript. The test comment says 172,736 bytes, and the difference is not explained.

| Screen | Form factor | Performance (runs) | Accessibility | Best practices | SEO |
|---|---|---|---|---|---|
| Load | mobile | 100 (100, 100, 100) | 100 | 100 | 63 |
| Load | desktop | 100 (100, 100, 100) | 100 | 100 | 63 |
| Home | mobile | 100 (100, 99, 100) | 100 | 100 | 63 |
| Home | desktop | 100 (100, 100, 100) | 100 | 100 | 63 |

This replaces the reported median of 95. The plan screens and Setup got no Lighthouse run. The later commits (ab171d3 and 903d2c9) got no Lighthouse run (NOT RUN).

## SEO decision

The SEO score is 63, not 95. The cause is `public/robots.txt`, which holds `User-agent: *` and `Disallow: /`. Lighthouse then reports the page as not crawlable (audit `is-crawlable`, live test 4, L4-01). The old SEO failures (meta description, `robots-txt`) are fixed.

Decision, 2026-11-09, relayed by the main session (the exact words of the user are not preserved): the SEO target is dropped on purpose. The app is a private tool and a prototype, so the file keeps `Disallow: /` and the page stays out of search engines. The plan target for this category is removed. The targets for Performance, Accessibility and Best practices stay at 95 or more. The decision is open to a change by the user. With `Allow: /` the live test expects a score of about 100.

## Limits of the local server

`vite preview` sends only the `/*` block of `public/_headers`. The CSP, Permissions-Policy, Referrer-Policy and nosniff headers reach the page.
The path rules do not apply. Files in `/assets/*` get `Cache-Control: no-cache` locally, and not the `immutable` value of the real host.
Lighthouse does not check cache lifetime in its Performance score here, but check it on the real host.
A missing file such as `/robots.txt` returns `index.html` with status 200. The real host can behave in the same way.

## How to repeat the audit

Run all commands in the `app` folder. Use a scratch folder outside the repo, here called `$S`.

1. Build into the scratch folder:
   `npx vite build --outDir $S/lh/dist --emptyOutDir`
2. Start the server in the background and keep its PID:
   `node node_modules/vite/bin/vite.js preview --outDir $S/lh/dist --host 127.0.0.1 --port 4198 --strictPort`
3. Read the headers:
   `curl -sI http://127.0.0.1:4198/`
   Make sure that `Content-Security-Policy` is in the answer.
4. Start a clean Chrome with a debugging port. The Playwright build works:
   `~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome --headless=new --no-sandbox --remote-debugging-port=9333 --user-data-dir=$S/lh/profile about:blank`
   Keep the PID of this process.
5. Audit the first load. The profile is clean, so the screen is Privacy:
   `npx lighthouse http://127.0.0.1:4198/ --port=9333 --disable-storage-reset --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=$S/lh/privacy-mobile.json`
   For desktop, add `--preset=desktop`.
6. Move the app to the Load screen. Run the seed script below with the argument `load`. Then audit as in step 5.
7. Move the app to Home. Run the seed script with the argument `home`. Then audit as in step 5.
8. Read the scores:
   `node -e "const r=require('$S/lh/privacy-mobile.json');console.log(Object.entries(r.categories).map(([k,v])=>k+'='+Math.round(v.score*100)).join(' '))"`
   List the failed audits with the filter `a.score!==null && a.score<0.9`.
9. Repeat each mobile run three times. The mobile Performance score changes between runs.
10. Stop Chrome and the server by the PIDs of steps 2 and 4. Remove `$S/lh`.

The flag `--disable-storage-reset` keeps the stored data between runs. Without it, Lighthouse erases the privacy flag and the protocol.

Seed script (`seed.mjs`). Keep it outside the repo and pass `load` or `home` as the argument:

```js
import { chromium } from '<app>/node_modules/playwright-core/index.mjs';
const step = process.argv[2];
const browser = await chromium.connectOverCDP('http://127.0.0.1:9333');
const page = await browser.contexts()[0].newPage();
await page.goto('http://127.0.0.1:4198/');
const ok = page.getByRole('button', { name: 'I understand' });
if (await ok.isVisible({ timeout: 2000 }).catch(() => false)) await ok.click();
await page.getByRole('heading', { level: 1, name: 'Load protocol file' }).waitFor();
if (step === 'home') {
  await page.getByLabel('Protocol file (.json)').setInputFiles('<app>/src/lib/protocol/example-protocol.json');
  await page.getByRole('heading', { level: 1, name: 'Home' }).waitFor();
}
await page.close();
await browser.close();
```

Replace `<app>` with the absolute path of the `app` folder.

## The chrome-devtools tool

The MCP tool `lighthouse_audit` gives Accessibility, Best practices, SEO and Agentic browsing. It does not give Performance.
It returned the same three failed audits as the command line (meta-description, robots-txt, llms-txt) on every screen.
Use the command line above for the Performance score.
The `lighthouse` package is already in `devDependencies` of `package.json`, so the steps add no dependency.
