# Live test 4: performance, stability, size and input extremes

Date: 2026-11-08 and 2026-11-09. App: `app/dist` at commit b451206, served with `vite preview` on port 4305.
Tester: an independent agent. The tester changed no source file, no test and no config.
Evidence folder (outside the repo): `/tmp/claude-1000/-home-luis-projects/c0df9405-b52e-4b2f-b357-194865342f04/scratchpad/live/t4/`. In this file it is called `$E`.

## Summary

The machine was shared. Other testers ran browsers and test suites at the same time. The load average was 1.6 at the start and 9 to 16 at the end (8 cores). Every timing number in this file is noisy. Each measurement ran three times. The tables show the median and the spread.

Main results:

1. Accessibility is 100 on every screen, on mobile and on desktop. NFR5 passes for the screens that were tested.
2. SEO is 63 on every screen, not 95 or more. The old failures (meta description, robots.txt) are fixed. A new failure appeared: `robots.txt` has `Disallow: /`, so Lighthouse reports the page as not crawlable (L4-01).
3. Mobile Performance is 97 (Privacy), 99 (Load) and 92 (Home). Home is below 95. The main chunk grew from 469 kB to 749 kB (145 kB to 235 kB gzip) (L4-02).
4. NFR4: the pose loop median is 14.97 to 14.99 frames per second with the real clips 01, 03 and 07. This is at the limit of 15. Two of nine runs had a median of 11.99. The loop runs on the main thread (L4-03, L4-04).
5. CPU throttling is a rough proxy for a low-end phone and not the phone. With 4x throttling the median is 3.0 frames per second. With 6x it is 2.2 frames per second.
6. Memory: the JS heap grew 0.86 MB in 10 minutes and then stayed flat. The camera tracks end after every session. Node and listener counts do not grow across sessions. The browser memory grows about 30 MB per session (L4-06).
7. On Slow 4G (emulation) the model needs 92.8 s to load. The person sees only the label "Starting the camera" (L4-05).
8. The lowest (320 x 240) and highest (1920 x 1080) resolution files and a portrait file all work. No crash and no console error.

Counts: 20 PASS, 11 FAIL, 3 NOT RUN (34 checks).

## What was loaded and how

Skills that the tester loaded with the Skill tool: `chrome-devtools-mcp:chrome-devtools`, `chrome-devtools-mcp:debug-optimize-lcp`, `chrome-devtools-mcp:memory-leak-debugging`, `chrome-devtools-mcp:a11y-debugging`, `modern-web-guidance`, `owasp-security` and `simple-english:simple-english`. All seven loaded.

Tools: Lighthouse 13.6.0 (`npx lighthouse`, Chrome from Playwright build 1254, `--disable-storage-reset`, as in `docs/lighthouse.md`). Playwright scripts for the frame rate, memory, Slow 4G and extremes. Headed Chromium on display :0 for the frame rate, memory and extremes tests. Headless Chromium for the Slow 4G test and Lighthouse.

Camera: `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=<mjpeg file>`. The files are the converted real clips 01, 03 and 07 (640 x 360, 30 fps). The model is `lite`.

Measurement hooks ran inside the page with `addInitScript`. They made no repo edit. One hook wraps `requestVideoFrameCallback` and records the callback time and the duration of each loop tick. Another hook wraps `getUserMedia`. The tick duration includes `detect()` and the `onFrame` handler. `src/pose/loop.ts` keeps its own `medianFps()` and `medianDetectMs()` in a closure that the page cannot read. The tester used the same definition (median of the gaps between frames) and measured it from outside.

## Checks

| ID | Check | What was done | What was seen | Evidence | Result |
|---|---|---|---|---|---|
| C01 | Lighthouse Privacy, mobile | 3 runs | Perf 97 (97, 99, 97), A11y 100, BP 100, SEO 63 | `$E/lh/privacy-mobile-{1,2,3}.json` | FAIL (SEO) |
| C02 | Lighthouse Privacy, desktop | 3 runs | Perf 100, A11y 100, BP 100, SEO 63 | `$E/lh/privacy-desktop-*.json` | FAIL (SEO) |
| C03 | Lighthouse Load protocol, mobile | 3 runs | Perf 99 (99, 99, 99), A11y 100, BP 100, SEO 63 | `$E/lh/load-mobile-*.json` | FAIL (SEO) |
| C04 | Lighthouse Load protocol, desktop | 3 runs | Perf 100, A11y 100, BP 100, SEO 63 | `$E/lh/load-desktop-*.json` | FAIL (SEO) |
| C05 | Lighthouse Home with stored protocol, mobile | 3 runs | Perf 92 (98, 92, 90), A11y 100, BP 100, SEO 63 | `$E/lh/home-mobile-*.json` | FAIL (Perf, SEO) |
| C06 | Lighthouse Home, desktop | 3 runs | Perf 100, A11y 100, BP 100, SEO 63 | `$E/lh/home-desktop-*.json` | FAIL (SEO) |
| C07 | Lighthouse on a plan screen | Not done. Lighthouse reloads the root URL and the app opens at Home. A plan screen needs state that a reload does not keep | none | none | NOT RUN |
| C08 | Accessibility score 95 or more (NFR5) | All 18 runs | 100 in every run | `$E/lh/sum.mjs` output | PASS |
| C09 | SEO audits `meta-description` and `robots-txt` | Read the audit results | Both pass. The favicon error is gone (Best practices 100 everywhere) | `$E/lh/home-mobile-1.json` | PASS |
| C10 | NFR4 clip 01, 60 s, 1x | 3 runs, headed | Median 14.97, 11.99, 14.97 | `$E/fps-01-heel-slide-side-x1-r*.json` | PASS (at the limit) |
| C11 | NFR4 clip 03, 60 s, 1x | 3 runs, headed | Median 14.99, 14.99, 11.99 | `$E/fps-03-straight-leg-raise-side-x1-r*.json` | PASS (at the limit) |
| C12 | NFR4 clip 07, 60 s, 1x | 3 runs, headed | Median 14.99, 14.99, 14.97 | `$E/fps-07-mini-squat-front-x1-r*.json` | PASS (at the limit) |
| C13 | NFR4 stable over repeated runs | Compare the 9 runs | 2 of 9 runs have a median of 11.99. The 5th percentile of the frame rate is 7.5 to 12 | same files | FAIL |
| C14 | CPU throttling 4x (proxy) | Clip 01, 60 s, 3 runs | Median 3.00 (3.53, 2.86, 3.00) | `$E/fps-01-heel-slide-side-x4-r*.json` | FAIL |
| C15 | CPU throttling 6x (proxy) | Clip 01, 60 s, 3 runs | Median 2.22 (2.22, 2.00, 2.31) | `$E/fps-01-heel-slide-side-x6-r*.json` | FAIL |
| C16 | The app stays running under throttling | Same runs | No crash, no console error, no page error. The angle value still updates | same files, `fpslog-*.txt` | PASS |
| C17 | Tap latency of Stop under throttling | Not measured | none | none | NOT RUN |
| C18 | 10 minute session, heap trend | Clip 01, one 10 minute session, a sample every 30 s | Heap 8.30 MB to 9.16 MB. About 8.9 MB at 5 minutes. Flat after 8 minutes | `$E/mem-full10min.log` | PASS |
| C19 | Camera tracks end at session end | 3 sessions (heavy probe) and 4 sessions (light probe) | Every track is `ended` after Stop. The video element count is 0 | `$E/mem-full10min.log`, `$E/mem-light.log` | PASS |
| C20 | The heap drops after the model is released | Sample after Stop | 9.16 MB to 7.40 MB (heavy probe). 8.30 MB to 6.76 MB (light probe, 90 s) | same files | PASS |
| C21 | Session 2 and 3 in the same page load: DOM nodes and listeners | Light probe, 4 sessions | Nodes at Home 376, 377, 378, 379. Listeners at Home 180, 182, 184, 186 | `$E/mem-light.log` | PASS |
| C22 | Session 2 and 3: JS heap and browser memory | Light probe, 4 sessions | Heap at Home 6.92, 7.30, 7.52, 7.69 MB. Browser process tree 1245, 1278, 1305, 1331 MB | `$E/mem-light.log` | FAIL (small growth, L4-06) |
| C23 | Start next set pressed during the 10 minute run | The Setup check never passed with a real clip, so no baseline and no counted rep. The set never ended | Counter stayed at 0 of 10 | `$E/mem-full10min.log` | NOT RUN |
| C24 | Bundle sizes | `gzip -9` of every file in `dist` | See the size table | `$E/` (commands in this file) | PASS |
| C25 | First load on Slow 4G, Privacy | 3 runs, cache off | 1.73 s median to a visible button (1.64 to 2.25 s). 266.5 kB | `$E/slow4g-r*.json` | PASS |
| C26 | First load on Slow 4G, Home | 3 runs, cache off | 2.06 s median (1.61 to 2.09 s). 266.5 kB | same files | PASS |
| C27 | Model load on Slow 4G, and the progress that the person sees | 3 runs | 92.8 s median (91.9 to 94.0 s). The page shows only the label "Starting the camera" | same files, `src/ui/Setup.tsx` line 452 | FAIL (L4-05) |
| C28 | `public/_headers` syntax | Read the file and parsed the blocks | 5 blocks. Each has a path line and indented `Name: value` lines | `app/public/_headers` | PASS |
| C29 | Headers that `vite preview` sent | `curl -sI` | CSP, Permissions-Policy, Referrer-Policy and nosniff are present. Cache rules are not applied | `$E/preview.log` | PASS |
| C30 | No service worker | Searched `src`, `index.html` and `vite.config.ts` | No registration. Only `db.ts` unregisters old workers | grep result | PASS |
| C31 | 320 x 240 camera file | Setup and Session, 30 s | Works. Frame size 320x240. 8.6 frames per second under load | `$E/ext2.json` | PASS |
| C32 | 1920 x 1080 camera file | Setup and Session, 30 s | Works. Frame size 1920x1080. 6.7 frames per second under load | `$E/ext2.json` | PASS |
| C33 | Portrait camera file (360 x 640) | Setup and Session, 30 s | No crash. The text is "Move closer." The preview shows a narrow frame | `$E/ext2.json`, `$E/ext-portrait-setup.png` | PASS (L4-09) |
| C34 | Console and page errors in all runs | Read all script logs | No page error and no console error | `$E/*.log`, `$E/*.txt` | PASS |

Count of results: PASS 20, FAIL 11 (C01 to C06, C13, C14, C15, C22, C27), NOT RUN 3 (C07, C17, C23).

## Lighthouse

Before: `docs/lighthouse.md` (first result, 2026-11-08, build before the restyle). Now: median of three runs on `dist` at b451206.

| Screen | Form factor | Perf before | Perf now (runs) | A11y before / now | BP before / now | SEO before / now |
|---|---|---|---|---|---|---|
| Privacy | mobile | 81 | 97 (97, 99, 97) | 100 / 100 | 96 / 100 | 82 / 63 |
| Privacy | desktop | 100 | 100 (100, 100, 100) | 100 / 100 | 100 / 100 | 82 / 63 |
| Load protocol | mobile | 89 | 99 (99, 99, 99) | 100 / 100 | 100 / 100 | 82 / 63 |
| Load protocol | desktop | 100 | 100 (100, 100, 100) | 100 / 100 | 100 / 100 | 82 / 63 |
| Home with protocol | mobile | 89 | 92 (98, 92, 90) | 100 / 100 | 100 / 100 | 82 / 63 |
| Home with protocol | desktop | 100 | 100 (100, 100, 100) | 100 / 100 | 100 / 100 | 82 / 63 |

Metrics now (median of three, unit in the column name):

| Screen | Form factor | LCP ms | TBT ms | CLS | FCP ms |
|---|---|---|---|---|---|
| Privacy | mobile | 1134 (1117 to 2304) | 149 (138 to 193) | 0 | 754 |
| Privacy | desktop | 301 (282 to 303) | 4 (0 to 5) | 0 | 203 |
| Load protocol | mobile | 1081 (1071 to 1110) | 118 (107 to 122) | 0 | 752 |
| Load protocol | desktop | 288 (282 to 289) | 0 | 0 | 202 |
| Home | mobile | 1262 (1139 to 1281) | 359 (167 to 407) | 0 | 753 |
| Home | desktop | 319 (312 to 324) | 15 (10 to 16) | 0 | 204 |

The first run after a cold start is the only run with a real transfer: 266508 bytes (Privacy, mobile, run 1). All later runs read from the HTTP cache (664 bytes). The one run of 2304 ms LCP is that cold run.

Remaining failing audits (score under 0.9), with the proposed fix:

| Audit | Where | Value | Proposed fix |
|---|---|---|---|
| `is-crawlable` (SEO) | all screens | `robots.txt` line 1 blocks the page | Decide: use `Allow: /` to reach about 100, or keep `Disallow: /` and change the plan target for SEO (L4-01) |
| `total-blocking-time` | Home, mobile, runs 2 and 3 (359 and 407 ms) | main chunk 749 kB | Load Session, Setup and Summary with `React.lazy`. Find the large modules with a source map (L4-02) |
| `max-potential-fid` | mobile, all screens (score 0.24 to 0.81) | script work in the main chunk | Same fix as TBT. This audit has no weight in the category score |
| `render-blocking-insight` | mobile score 0, desktop 0.5 | `index-*.css` 30 kB (179 B transfer), 151 ms | Inline the critical CSS or accept 150 ms (L4-07) |
| `valid-source-maps` | all screens | no source map for the 749 kB chunk | Optional. Publish a source map only if profiling needs it (L4-07) |
| `unused-javascript` | Privacy, mobile, run 1 only | cold run | Same fix as TBT |
| `network-dependency-tree-insight` | all screens | chain HTML, CSS, font | Optional: preload the font file |

The earlier failures `meta-description`, `robots-txt` and the favicon console error pass now.

## Frame rate (NFR4)

Headed Chromium, `lite` model, this machine, shared. Video 640 x 360, 30 fps. 60 seconds on the Session screen. The Setup check did not reach a resting angle, so the session ran with no baseline and counted no rep. The pose loop still ran at full speed.

How the numbers were made: the frame rate is 1000 divided by the median gap between two loop ticks. The 5th percentile frame rate is 1000 divided by the 95th percentile gap. The load column shows the one-minute load average before and after the run.

| Clip | CPU throttle | Run | Median fps | 5th percentile fps | Gaps over 100 ms | Median tick ms | Load before / after |
|---|---|---|---|---|---|---|---|
| 01 heel slide | 1x | 1 | 14.97 | 8.6 | 115 of 781 | 71 | 3.2 / 5.0 |
| 01 heel slide | 1x | 2 | 11.99 | 8.6 | 180 of 663 | 87 | 5.5 / 6.0 |
| 01 heel slide | 1x | 3 | 14.97 | 10.0 | 67 of 791 | 71 | 5.8 / 4.5 |
| 03 straight leg raise | 1x | 1 | 14.99 | 12.0 | 28 of 877 | 65 | 4.5 / 3.0 |
| 03 straight leg raise | 1x | 2 | 14.99 | 10.0 | 58 of 887 | 64 | 3.0 / 4.0 |
| 03 straight leg raise | 1x | 3 | 11.99 | 7.5 | 227 of 698 | 84 | 4.0 / 4.9 |
| 07 mini squat front | 1x | 1 | 14.99 | 10.0 | 93 of 830 | 67 | 4.9 / 4.3 |
| 07 mini squat front | 1x | 2 | 14.99 | 10.0 | 67 of 861 | 64 | 5.0 / 4.5 |
| 07 mini squat front | 1x | 3 | 14.97 | 10.0 | 75 of 781 | 71 | 4.5 / 4.5 |
| 01 heel slide | 4x | 1, 2, 3 | 3.53, 2.86, 3.00 | 2.6, 2.3, 2.4 | 199, 168, 178 of about 180 | 279, 335, 324 | 4.5 to 6.2 |
| 01 heel slide | 6x | 1, 2, 3 | 2.22, 2.00, 2.31 | 1.6, 1.6, 1.9 | 128, 120, 135 of about 130 | 427, 481, 417 | 4.8 to 6.2 |

Median of the three runs: clip 01 14.97, clip 03 14.99, clip 07 14.99, clip 01 at 4x 3.00, clip 01 at 6x 2.22.

Findings:

1. The video has 30 frames each second. The loop handles every second frame at 1x. This gives 66.7 ms for each frame and 15.0 fps. The median sits on the limit of NFR4 (15). A value of 14.97 is the same as 15.0 within the rounding of the 0.1 ms timestamps.
2. The runs with 11.99 fps (83.3 ms gaps) came when the load average was 5.5 and 4.0 to 4.9. The loop then handles every third frame for more than half of the time.
3. Dropped frames: the loop uses `requestVideoFrameCallback`. A frame that arrives while `detect()` runs is skipped, not queued. The heap stays flat, so no backlog builds. The longest gap was 234 ms at 1x, 634 ms at 4x and 967 ms at 6x.
4. The median tick takes 64 to 87 ms and the median gap is 67 to 83 ms. The pose work uses nearly all of the main thread. The `longtask` observer counted one long task for each frame (659 to 866 in 60 s).
5. Under 4x throttling the median is 3 fps. A heel slide of 2 seconds gives about 6 samples. This is a proxy and not the Redmi A3. The app does not crash. The effect on rep counting and on tap latency was not measured.

## Memory and stability

One headed Chromium page load. Clip 01 looped as the camera. The Session ran with no baseline, so the counter stayed at 0 and "Start next set" never appeared (C23). A sample was taken after a forced garbage collection (`HeapProfiler.collectGarbage`). The memory columns come from CDP `Performance.getMetrics` (`JSHeapUsedSize`, `Nodes`, `JSEventListeners`) and `ps` (RSS of the whole browser process tree).

Run A, 10 minutes (heavy probe: it tracks every listener and every stream, so it keeps them alive). Values at the start, every 2.5 minutes and at the end of session 1:

| Time in session 1 | JS heap MB | `Nodes` | CDP listeners | Video elements | Track state | Browser RSS MB |
|---|---|---|---|---|---|---|
| Home before | 4.42 | 414 | 182 | 0 | none | 921 |
| 0.5 min | 8.30 | 1000 | 255 | 1 | live | 1380 |
| 2.5 min | 8.70 | 1000 | 255 | 1 | live | 1385 |
| 5.0 min | 8.90 | 1000 | 258 | 1 | live | 1387 |
| 7.5 min | 9.08 | 1000 | 255 | 1 | live | 1389 |
| 10.0 min | 9.16 | 1000 | 255 | 1 | live | 1390 |
| After Stop (Summary) | 7.40 | 1128 | 269 | 0 | ended | 1257 |
| Home after save | 7.55 | 1355 | 278 | 0 | ended | 1255 |

The heap grew 0.86 MB in 10 minutes. Most of this came in the first 5 minutes. The last 2 minutes added 0.00 MB. This is a plateau and not a steady leak.

Run A, sessions 2 and 3 (3 minutes each). Values at Home after each save:

| After | JS heap MB | `Nodes` | CDP listeners | Streams that the probe holds |
|---|---|---|---|---|
| Session 1 | 7.55 | 1355 | 278 | 1 ended |
| Session 2 | 8.07 | 2346 | 375 | 2 ended |
| Session 3 | 8.65 | 3337 | 472 | 3 ended |

In run A `Nodes` grew by 991 and listeners by 97 in each session. This is an artifact of the probe, which kept every listener function (and the DOM that it references) in a `Set`. Run B removed the probe and the numbers stopped growing. Do not count run A as a leak of the app.

Run B, 4 sessions of 90 seconds (light probe: no listener tracking, streams held only by `WeakRef`). Values at Home after each save:

| After | JS heap MB | `Nodes` | CDP listeners | Browser RSS MB | Tracks |
|---|---|---|---|---|---|
| Baseline | 4.38 | 364 | 178 | 920 | none |
| Session 1 | 6.92 | 376 | 180 | 1245 | ended |
| Session 2 | 7.30 | 377 | 182 | 1278 | ended |
| Session 3 | 7.52 | 378 | 184 | 1305 | ended |
| Session 4 | 7.69 | 379 | 186 | 1331 | ended |

Result: DOM nodes and listeners grow by 1 and 2 for each session. This is close to flat. The JS heap grows 0.17 to 0.38 MB for each session. The browser process memory grows 26 to 33 MB for each session. Four sessions add 86 MB. This can be a slow leak or memory that the allocator does not return. A longer test must decide. See L4-06.

One earlier attempt ended at 7 minutes because the browser closed. The tester did not find the cause. Another tester used the machine at the same time. That run is not used.

## Size and caching

Bundle (gzip level 9 of each file in `dist`, the host can use Brotli and get less):

| File | Raw bytes | Gzip bytes | Loaded when |
|---|---|---|---|
| `assets/index-DSJ9yYJA.js` (main chunk) | 749003 | 235457 | first load |
| `assets/index-CpYALIVh.css` | 30075 | 6686 | first load |
| `assets/figtree-latin-wght-D_ZTVpCC.woff2` | 20156 | 20161 | first load (font) |
| `assets/Dashboard-B1na00hT.js` | 353191 | 100982 | lazy, My data and charts |
| `assets/dashboard-x_wyA1rg.css` | 3130 | 1078 | lazy |
| `assets/ClinicianView-YwPNLA-D.js` | 12970 | 4385 | lazy |
| `assets/DataScreen-BcmbsqYp.js` | 6016 | 2112 | lazy |
| `assets/landmarker-DAvEWz-n.js` | 154688 | 45040 | lazy, Start camera |
| `models/pose_landmarker_lite.task` | 5777746 | 4969689 | Start camera |
| `models/wasm/vision_wasm_internal.wasm` | 14603354 | 4120661 | Start camera |
| `models/wasm/vision_wasm_internal.js` | 334128 | 80672 | Start camera |

First-load JS plus CSS plus font: 266508 bytes transferred in the test (JS and CSS already compressed by the preview server). Before the restyle the main chunk was 469 kB (145 kB gzip). Now it is 749 kB (235 kB gzip). The folder `dist/models/wasm` also holds a second pair of files (`vision_wasm_module_internal.*`, 14.6 MB) that the test never fetched.

Slow 4G (Chrome preset: 1.6 Mbit/s down, 750 kbit/s up, 150 ms round trip). Cache off. Median of three runs. The machine was shared.

| Measure | Median | Runs |
|---|---|---|
| Privacy: button visible | 1.73 s | 2.25, 1.64, 1.73 |
| Home with stored protocol: button visible | 2.06 s | 1.61, 2.06, 2.09 |
| Model load: from "Start camera" to the first camera instruction | 92.8 s | 92.8, 94.0, 91.9 |

The model load fetched four files: `landmarker-*.js` (46 kB), `vision_wasm_internal.js` (82 kB), `vision_wasm_internal.wasm` (14.6 MB) and `pose_landmarker_lite.task` (4.98 MB). Total about 19.7 MB. The preview server did not compress the `.wasm` file. A host that compresses `.wasm` sends about 4.1 MB, and the load can fall to about 45 s on the same link. The `.task` file does not compress well (4.97 MB).

During the load the person sees the label "Starting the camera" on a disabled button. The preview area says "Your camera view shows here." There is no progress and no size notice. The camera is started before the model (`src/pose/source.ts`), so the camera is on while the person waits.

### What a host must send (`public/_headers`)

The file has five blocks. All are valid in the format of Cloudflare Pages and Netlify (a path line, then indented `Name: value` lines).

| Path | Header | Meaning for the host |
|---|---|---|
| `/*` | `Content-Security-Policy`, `Permissions-Policy: camera=(self), microphone=()`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` | Send on every response. `vite preview` sends only this block |
| `/` and `/index.html` | `Cache-Control: no-cache` | The browser asks again each time. Right for the entry file |
| `/assets/*` | `Cache-Control: public, max-age=31536000, immutable` | Right. The file names carry a hash |
| `/models/*` | `Cache-Control: no-cache` | The browser sends a request for 5.8 MB and 14.6 MB each visit and gets 304 if the ETag matches. See L4-10 |

The host must also compress `.wasm`, `.js`, `.css` and `.json` with gzip or Brotli. The path rules do not run in the preview. The tester read the file and did not test a real host.

Service worker: none. `src/lib/storage/db.ts` only unregisters old workers.

## Input extremes

Each file was made from clip 01 with ffmpeg. Setup then Session, 30 seconds. The reference rows are the 640 x 360 clip in the same test run. The machine was loaded (load average 9 to 15). The numbers show that the loop works. They do not show the effect of the resolution.

| File | Frame size seen in the page | Setup text | Session median fps | Median tick ms | Result |
|---|---|---|---|---|---|
| Reference 640 x 360 (first) | 640x360 | Move closer. | 7.5 | 130 | works |
| 320 x 240 | 320x240 | Move closer. | 8.6 | 114 | works |
| 1920 x 1080 | 1920x1080 | Move closer. | 6.7 | 138 | works |
| Portrait 360 x 640 (clip turned 90 degrees) | 360x640 | Move closer. | 10.0 | 90 | works, no message about the turn |
| Reference 640 x 360 (last) | 640x360 | Move closer. | 15.0 | 72 | works |

The two reference rows differ by a factor of 2 because the load changed. So the frame rate cannot show a resolution effect in this test. The pose model resizes the input, so a large effect is not expected. A quiet machine can confirm it.

The portrait file is a turned clip of a person who lies down. It is not a real portrait recording of a person who stands. The app showed a narrow preview and the text "Move closer." It did not say that the picture is turned.

## Issues

| ID | Severity | Title |
|---|---|---|
| L4-01 | MEDIUM | SEO score is 63. Target is 95. |
| L4-02 | MEDIUM | Home mobile Performance is 92. Target is 95. |
| L4-03 | MEDIUM | NFR4 is at the limit and not stable |
| L4-04 | MEDIUM | The pose loop uses nearly all of the main thread |
| L4-05 | MEDIUM | The model load has no progress on a slow network |
| L4-06 | LOW | Browser memory grows 26 to 33 MB in each session |
| L4-07 | LOW | Render-blocking CSS and no source map |
| L4-08 | LOW | The Setup check rarely passes with a real clip |
| L4-09 | LOW | A turned picture gets the text "Move closer." |
| L4-10 | LOW | Model files have no long cache life |

### L4-01 (MEDIUM) SEO score is 63, target 95

Steps: run Lighthouse on any screen (see `docs/lighthouse.md`).
Expected: SEO 95 or more.
Actual: SEO 63 in all 18 runs. The audit `is-crawlable` fails because `public/robots.txt` holds `User-agent: *` and `Disallow: /`. The score before the fix was 82.
Cause: the fix that `docs/lighthouse.md` proposed for `robots-txt` blocks all crawlers on purpose. Lighthouse treats a blocked page as not indexable.
Proposed fix: the owner must decide. Option 1: change to `Allow: /` and the SEO score will reach about 100. Option 2: keep `Disallow: /` and change the plan target so that SEO does not count for a private tool.
Evidence: `$E/lh/home-mobile-1.json` (audit `is-crawlable`), `app/public/robots.txt`.

### L4-02 (MEDIUM) Home mobile Performance is 92, target 95

Steps: Lighthouse, mobile, Home with a stored protocol, 3 runs.
Expected: 95 or more.
Actual: 98, 92, 90. TBT is 167, 359 and 407 ms. The main chunk is 749 kB raw and 235 kB gzip (was 469 kB and 145 kB). Privacy (97) and Load (99) pass.
Proposed fix: load Session, Setup, Summary and the other large screens with `React.lazy`, as for the data screens. Build once with a source map in the scratch folder to find the large modules.
Evidence: `$E/lh/home-mobile-{1,2,3}.json`, `$E/lh/sum.mjs` output in this file.

### L4-03 (MEDIUM) NFR4 is at the limit and not stable

Steps: Session with clip 01, 03 or 07 as the camera, 60 s, `lite` model, 1x.
Expected: median of 15 frames per second or more, stable.
Actual: 14.97 to 14.99 in 7 runs. 11.99 in 2 runs. The 5th percentile is 7.5 to 12 fps. With 4x throttling the median is 3.00 fps. With 6x it is 2.22 fps.
Limit of the test: the machine was shared (load average 3 to 6 during these runs). A run on a quiet machine can show a higher value. A real phone was not tested.
Proposed fix: see L4-04. Record the result in `docs/accuracy.md` as "at the limit, not stable".
Evidence: `$E/fps-*.json`.

### L4-04 (MEDIUM) The pose loop uses nearly all of the main thread

Steps: read the tick time in the same runs.
Expected: the main thread has free time, so a tap on Stop is handled at once.
Actual: the median tick is 64 to 87 ms and the median gap is 67 to 83 ms. One long task occurs for each frame (659 to 866 in 60 s). At 4x the tick is 279 to 335 ms.
Proposed fix: run `detect()` in a Worker, or lower the rate of detection and keep the main thread free. Measure the delay of a tap on Stop and on "Knee gave way or hurts" before and after.
Evidence: `$E/fps-*.json` (fields `tickMs`, `longTasks`).

### L4-05 (MEDIUM) The model load has no progress on a slow network

Steps: Slow 4G emulation, Setup, "Start camera".
Expected: the person sees progress or a size notice, because the load takes a long time.
Actual: 92.8 s (median) with a disabled button that says "Starting the camera". The camera is already on. About 19.7 MB is fetched, 14.6 MB of it is the `.wasm` file.
Proposed fix: show a short text such as "Loading the pose model (about 20 MB). This can take a minute on a slow network." Make sure that the host compresses `.wasm`.
Evidence: `$E/slow4g-r{1,2,3}.json`, `app/src/ui/Setup.tsx` line 452, `app/src/pose/source.ts`.

### L4-06 (LOW) Browser memory grows 26 to 33 MB in each session

Steps: four sessions of 90 s in one page load, with a sample at Home after each save.
Expected: the memory returns to the level after session 1.
Actual: the JS heap at Home is 6.92, 7.30, 7.52 and 7.69 MB. The browser process tree is 1245, 1278, 1305 and 1331 MB. Nodes and listeners are flat.
Note: this is not proof of a leak. A 10 minute run had a plateau. The cause can be the model memory that the allocator keeps. A repeat with 10 sessions and a heap snapshot can decide.
Evidence: `$E/mem-light.log`, `$E/mem-light-rows.json`.

### L4-07 (LOW) Render-blocking CSS and no source map

The CSS file grew from 2.9 kB to 30 kB. It blocks the first paint for about 150 ms on mobile. The main chunk has no source map (`valid-source-maps`). Both are optional. The CSS can be inlined if the TBT fix does not give enough.
Evidence: `$E/lh/home-mobile-1.json`.

### L4-08 (LOW) The Setup check rarely passes with a real clip

Steps: Setup with each of the 8 clips as the camera, wait 30 s.
Actual: the text stays at "Move closer." or "Move back. Show your whole leg." for clips 01, 02, 03, 05, 06, 07 and 08. Clip 04 starts a countdown for a moment and then drops it. No clip reached "Start exercise" through the check. A press on "Start exercise" still opens the Session, but with no resting angle, so no rep is counted. This is why C23 is NOT RUN.
Limit: the clips are studio recordings with a person far from the camera. A real recording by the product owner at 2 to 2.5 m can behave in another way. The check of the rules can be strict on purpose.
Evidence: `$E/dbg3.log`, `$E/dbg2.mjs` (its output is in the session log), `$E/fps-01-heel-slide-side-x1-r1.png`.

### L4-09 (LOW) A turned picture gets the text "Move closer."

Steps: use a camera file turned by 90 degrees.
Actual: no crash. The preview is a narrow frame. The text is "Move closer." The app does not say that the picture is turned.
Limit: the file is a turned clip, not a real portrait recording.
Evidence: `$E/ext2.json`, `$E/ext-portrait-setup.png`.

### L4-10 (LOW) Model files have no long cache life

`/models/*` has `Cache-Control: no-cache`. Every visit sends a request for the 5.8 MB model and the 14.6 MB `.wasm` file. The answer is 304 when the ETag matches, so little data moves. If the files get a version in the path (for example `/models/v1/`), the host can use `immutable`.
Evidence: `app/public/_headers`.

## What was good

1. Accessibility 100 on every screen and in every one of the 18 runs.
2. Best practices 100 on all screens. The favicon error is gone.
3. Desktop Performance 100 on every screen. CLS is 0 everywhere.
4. Mobile LCP is about 1.1 to 1.3 s on a warm cache.
5. The `meta-description` and `robots-txt` audits pass.
6. The camera tracks end after every session (7 of 7 sessions) and the video element is removed.
7. The JS heap drops by about 1.7 MB after Stop. DOM nodes and listeners do not grow across sessions (run B).
8. No console error and no page error in any run. The headers of the CSP reach the page.
9. Input extremes (320 x 240, 1920 x 1080, 360 x 640) do not break the app.
10. The first load is 266 kB. Only the Start camera step loads the model.
11. No service worker.

## What the tests did not cover

1. A real Redmi A3 or any real phone. CPU throttling is a rough proxy.
2. A real network. Slow 4G is an emulation of speed and delay only.
3. A real host. The path rules of `_headers` and the compression of `.wasm` were read and not run.
4. A quiet machine. All timing was on a shared machine.
5. "Start next set" with counted reps (C23). The Setup check never passed with a real clip. A recorded clip of the owner or a mock source can cover this.
6. A Lighthouse run on a plan screen (C07).
7. The delay of a tap under load (C17).
8. A real portrait recording of a standing person.
9. The effect of the resolution on the frame rate. The machine load hid it.
