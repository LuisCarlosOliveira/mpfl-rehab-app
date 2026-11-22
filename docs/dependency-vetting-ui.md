# Dependency vetting: shadcn/ui and Tailwind v4 stack

Date: 2026-11-08. The user ordered that every new dependency is checked for safety. This file holds the evidence. It follows the method of `docs/dependency-vetting.md` (checklist in its section 7).
Skills loaded with the Skill tool: `owasp-security`, `simple-english:simple-english`, `context7-mcp`. I read `mpfl-clinical-guardrails/SKILL.md`, the UI decisions note section 2 and the shadcn Vite guide. I did not call the Context7 tools. The registry JSON and the shipped code gave the facts.

Method: `npm view`, `npm pack` (download only), `npm install --ignore-scripts --package-lock-only` and `npm audit`. I also used the npm advisory bulk query (POST, read-only), the npm attestation read and GitHub API reads (GET only). A regex scan covered the shipped code. I ran no code from any package. All data is from 2026-11-08. Nothing was added to `app/`.
## 1. Summary
| Package | Version | Where it runs | Licence | Verdict |
|---|---|---|---|---|
| `tailwindcss` | 4.3.5 | build only | MIT | ADOPT WITH CONDITIONS |
| `@tailwindcss/vite` | 4.3.5 | build only | MIT | ADOPT WITH CONDITIONS |
| `tw-animate-css` | 1.4.0 | build only (CSS) | MIT | ADOPT WITH CONDITIONS |
| `radix-ui` (and all `@radix-ui/react-*`) | 1.8.1 | browser | MIT | ADOPT WITH CONDITIONS (no Radix dialog) |
| `class-variance-authority` | 0.7.1 | browser | Apache-2.0 | ADOPT WITH CONDITIONS |
| `clsx` | 2.1.1 | browser | MIT | ADOPT |
| `tailwind-merge` | 3.7.0 | browser | MIT | ADOPT WITH CONDITIONS |
| `lucide-react` | 1.70.0 | browser | ISC (plus MIT for some icons) | ADOPT WITH CONDITIONS |
| `shadcn` (CLI) | 4.23.0 | developer machine only | MIT | ADOPT WITH CONDITIONS (never a dependency) |
| `@base-ui/react` | 1.9.0 | browser | MIT | Not needed. It is the fallback. |
| `@base-ui-components/react` | 1.0.0-rc.0 | none | MIT | REJECT (deprecated, renamed) |

Key results:
- No package has an install script. The only one in the whole tree is `fsevents` (macOS only, optional, from `vite`).
- `npm audit` finds 0 vulnerabilities for the runtime set and the build set. It finds 6 for the `shadcn` CLI tree (section 6.3).
- The Tailwind build loads a native binary that is shipped in an npm package. It does no download at install or build time.
- Radix `Dialog` and `AlertDialog` inject a `<style>` element (section 5.2). This breaks a CSP without `unsafe-inline`. Use the native `<dialog>` for the erase dialog.
- Package count to add: 8 direct packages, 5 runtime and 3 build only (section 10).
- `shadcn init` adds `shadcn` and `tw-animate-css` as dev dependencies on its own. Both are imported by CSS at build time.
## 2. Tailwind: `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`
### 2.1 Identity
| Item | `tailwindcss` | `@tailwindcss/vite` | `tw-animate-css` |
|---|---|---|---|
| Version and publish date | 4.3.5, 2026-11-06 | 4.3.5, 2026-11-06 | 1.4.0, 2025-09-24 |
| Maintainers | `adamwathan`, `reinink`, `malfaitrobin` (Tailwind Labs) | same three | `wombosvideo` (one person) |
| Repository | `tailwindlabs/tailwindcss` (org, 98,647 stars, MIT) | same | `Wombosvideo/tw-animate-css` (user, 818 stars, MIT) |
| Provenance (SLSA v1) | Yes. Tag `v4.3.5`, commit `9b2c925c19aa`. It equals the GitHub tag object. | Yes, same commit | Yes. Tag `v1.4.0`, commit `c20dc32e2b53`. It equals the GitHub tag object. |
| `deprecated` | no | no | no |
| Weekly downloads | 175,996,164 | 60,438,552 | 47,543,912 |
| Unpacked size | 787 kB | 12 kB | 47 kB (CSS 14.9 kB, 1.8 kB gzip) |

Typosquat check: the repository, the package name and the maintainers match. `tw-animate-css` is the package that shadcn names in its own registry file (`styles/new-york-v4/index.json`, `devDependencies`). Download counts are high for all three.
Age: `tailwindcss` 4.3.5 is 2 days old. 4.3.4 is 6 days old. 4.3.3 is from 2026-07-16. I did not diff 4.3.5 against older versions. See condition C9.
### 2.2 Build-time behavior (important)
- `@tailwindcss/vite` has three dependencies: `tailwindcss`, `@tailwindcss/node` and `@tailwindcss/oxide`, all at 4.3.5. It has no install script and no `bin`.
- The plugin is one file (`dist/index.mjs`, 6.9 kB). I read it. It hooks the Vite `transform` step for `.css` files. It reads the CSS file, scans the project files for class names with the native `Scanner`, and writes CSS back. The only I/O calls are `fs/promises` `stat` and the scanner. It has no `fetch`, no network module and no child process.
- `@tailwindcss/node` (the compiler host) has no network call. It reads two environment names: `DEBUG` and `NODE_PATH`. It loads JavaScript plugins with `jiti` only when the CSS holds `@plugin` or `@config`. The app must not use these.
- `@tailwindcss/oxide` is a loader (`index.js`, one file). It picks the native file for the platform with `require('./tailwindcss-oxide.<platform>.node')` or with a platform package. It reads three environment names: `NAPI_RS_ENFORCE_VERSION_CHECK`, `NAPI_RS_FORCE_WASI` and `NAPI_RS_NATIVE_LIBRARY_PATH`. On Linux it runs `ldd --version` with `execSync` to detect musl. This is a fixed command with no input.
- The native code comes from an optional dependency: `@tailwindcss/oxide-linux-x64-gnu` (3.0 MB, one `.node` file, MIT, no scripts, SLSA provenance, same tag commit). There are 12 platform packages plus a `wasm32-wasi` fallback. npm installs only the package that fits the machine. The package comes from the npm registry and npm checks its integrity hash. The code does not download a binary at install time.
- Lightning CSS (`lightningcss` 1.33.0, MPL-2.0) is a second native dependency of `@tailwindcss/node`. Its platform file is 10 MB. It has no install script (its `prepare` script is `patch-package`, which npm runs only in the package repository, not for a consumer). It is a build tool and is not in the browser bundle. MPL-2.0 is weak copyleft for the files of Lightning CSS. We do not change or distribute it. Legal review is UNVERIFIED.
- Both native packages are compiled code. I cannot read it. The check is the provenance (built in GitHub Actions from a public tag) and the registry hash. I did not rebuild the Rust code.
- Risk statement: a compromised Tailwind release runs inside `vite build` with the rights of the developer and of the CI job. This is as serious as a runtime hole. The controls are the exact pin, `npm ci --ignore-scripts`, the lockfile and a CI job with no secrets.
### 2.3 Code scan (shipped JavaScript)
| Package | Hits | Judgment |
|---|---|---|
| `@tailwindcss/vite` | 0 for all patterns | Clean |
| `tailwindcss` | URLs only: 3 doc links in comments | Benign |
| `tw-animate-css` | No JavaScript. One CSS file with `@keyframes` and `@utility`. No `@import`, no `url()`. | Benign |
| `@tailwindcss/node` | 6 environment reads (`DEBUG`, `NODE_PATH`), `new Function` 0 | Benign |
| `@tailwindcss/oxide` | `execSync('ldd --version')`, the environment names above | Benign (platform detection) |
| `jiti` 2.7.0 (via node) | `new Function`, `localStorage`, `navigator`, `atob` inside the bundled Babel parser. 58 environment reads. | Benign for our use. `jiti` runs only for `@plugin` or `@config`. |
### 2.4 Advisories and maintenance
- `npm audit --package-lock-only` (scratch set with `vite`): 0 vulnerabilities. The bulk advisory POST returns `{}` for all direct packages. The GitHub Advisory Database returns 0 for `tailwindcss` and `@tailwindcss/vite`. Repository advisories: `[]`.
- Last commit of `tailwindcss`: 2026-11-08. Releases are frequent (2,699 versions). 116 open issues, 1 matches "security".
- `tw-animate-css`: last release 2026-02-28 (the version is from 2025-09). One maintainer. 20 open issues. The package is CSS only, so the risk is low.
### 2.5 Verdict
ADOPT WITH CONDITIONS: C1 to C4, C8, C9. Tree shaking: not applicable (build only, no runtime).
## 3. Radix: `radix-ui` and `@radix-ui/react-*`
### 3.1 What the shadcn components use
I read the registry JSON of style `new-york-v4` (`https://ui.shadcn.com/r/styles/new-york-v4/<name>.json`). Each component lists the dependency `radix-ui` (the meta package) and no single `@radix-ui/*` name.

The parts used are `Slot` (button, badge), `Checkbox`, `RadioGroup`, `Progress`, `Tabs`, `Separator`, `Label`, `AlertDialog` (uses `Dialog`), `Accordion` (uses `Collapsible`) and `ToggleGroup` (uses `Toggle`). The components card and alert use none.
### 3.2 Identity
| Item | `radix-ui` 1.8.1 | `@radix-ui/react-dialog` 1.3.1 |
|---|---|---|
| Published | 2026-10-12 | 2026-10-12 |
| Maintainers | `chancestrickland`, `mark-workos` (WorkOS) | plus `hadihallak`, `npm-workos` |
| Repository | `radix-ui/primitives` (org, 19,480 stars, MIT) | same |
| Provenance | Yes. `publish.yml` on branch `stable`, commit `f825330a9639`. | Yes, same commit |
| Weekly downloads | 26,781,955 | 92,708,262 |
| Unpacked size | 105 kB (re-export files) | 107 kB |

The other packages are `alert-dialog` 1.2.1, `checkbox` 1.4.1, `radio-group` 1.5.1, `tabs` 1.2.1 and `toggle-group` 1.2.1. Also `progress` 1.2.1, `separator` 1.2.0, `label` 2.1.17, `slot` 1.5.0, `collapsible` 1.2.1 and `accordion` 1.3.1. All are MIT and have provenance. They were published on 2026-10-12 or 2026-10-14. None is deprecated.
Typosquat check: the maintainers and the repository match. The scope `@radix-ui` belongs to WorkOS. I found no tag named `radix-ui@1.8.1` in the repository. Provenance points to a commit on the `stable` branch instead. A byte match with that commit is UNVERIFIED.
### 3.3 Tarball and code scan
- `radix-ui` has 55 direct dependencies, no install script and no `bin`. Its files only re-export the sub packages. `sideEffects` is `false`.
- Install size: the `radix-ui` meta package installs 60 `@radix-ui/*` packages and 81 packages in total with React helpers. The 11 single packages above install 32 `@radix-ui/*` packages and 44 in total. Both sets have 0 install scripts and 0 audit findings.
- I scanned 87 tarballs (all Radix packages and their helpers). The patterns `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `innerHTML`, `localStorage`, `indexedDB`, `navigator` and `atob` have 0 hits in the packages that the 12 components use. The URL hits are comments that link to issues.
### 3.4 Inline style writes (CSP)
The app CSP blocks the `style` attribute in markup and blocks `<style>` elements without a nonce. Writing `element.style.x = value` in JavaScript is not blocked. React does the same for the `style` prop.
| Place | What it does | CSP result |
|---|---|---|
| `react-presence`, `react-dismissable-layer`, `react-focus-guards`, `react-collapsible` (`animationFillMode`, `pointerEvents`, `opacity`, `animationName` and more) | CSSOM write | Allowed |
| `react-toast`, `select`, `scroll-area`, `hover-card` | CSSOM writes. `select` and `scroll-area` also render a `<style>` tag with `dangerouslySetInnerHTML`. | Not used by our 12 components. Never use `Select` and `ScrollArea`. |
| `react-style-singleton` (used by `react-remove-scroll-bar`, used by `react-remove-scroll`) | `document.createElement('style')` with text content. It adds a `nonce` only when `setNonce()` was called. | BLOCKED without a nonce |
| shadcn `progress.tsx` | `style={{ transform: ... }}` | Allowed (CSSOM) |
| shadcn `toggle-group.tsx` | `style={{ "--gap": spacing }}` | Allowed (CSSOM) |

The cause of the 4 violations in the spike (the UI decisions note section 2) is the `<style>` element of `react-remove-scroll-bar`. It is added by `Dialog` and `AlertDialog` when they open. I found it by reading the code. I did not re-run the browser test. Status of the link: UNVERIFIED.
The style text holds measured numbers (the scrollbar gap in pixels). A fixed hash in the CSP cannot cover it. A nonce needs a server that adds a fresh nonce to every response. A static host cannot do this.
The single author `kashey` maintains `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`, `use-sidecar`, `use-callback-ref`, `get-nonce` and `aria-hidden`. None of the six I checked has provenance. All are MIT. The weekly downloads are 87 to 94 million for the main two.
### 3.5 Advisories and maintenance
- `npm audit` for the `radix-ui` set and for the 11-package set: 0 vulnerabilities. Bulk POST for `radix-ui`, `@radix-ui/react-dialog` and `react-remove-scroll`: `{}`. GitHub Advisory Database: 0. Repository advisories: `[]`.
- Last commit: 2026-10-14. 280 open issues, 0 with "security" in the title. The organization owner is WorkOS.
- Tree shaking: `sideEffects: false` for `radix-ui` and the single packages. The bundler drops unused parts. The spike measured +36.39 kB gzip for the whole stack with 9 components (136.55 kB to 172.94 kB).
### 3.6 Verdict
ADOPT WITH CONDITIONS: C1 to C5, C6, C7. Pin `radix-ui` (one line) and keep the shadcn imports as generated. If the team prefers fewer installed packages, use the 11 single packages. That adds 10 more direct lines and breaks the plan limit. Do not use the Radix `Dialog` or `AlertDialog` (C5).
## 4. Helper packages: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`
| Item | cva 0.7.1 | clsx 2.1.1 | tailwind-merge 3.7.0 | lucide-react 1.70.0 |
|---|---|---|---|---|
| Published | 2024-11-26 | 2024-04-23 | 2026-09-12 | 2026-11-06 |
| Versions | 27 | 15 | 481 | 722 |
| Maintainers | `joebell93` (one person) | `lukeed` (one person) | `dcas` (one person) | `ericfennis` (Lucide org) |
| Repository | `joe-bell/cva` (user, 6,911 stars) | `lukeed/clsx` (user, 9,845 stars) | `dcastil/tailwind-merge` (user, 5,705 stars) | `lucide-icons/lucide` (org, 25,638 stars) |
| Licence | Apache-2.0 | MIT | MIT | ISC, plus MIT text for Feather icons |
| Provenance | None | None | Yes, tag `tailwind-merge@3.7.0` | Yes, branch `main`, commit `b826f0c527e1` |
| Weekly downloads | 80,943,534 | 164,615,796 | 106,915,987 | 130,919,011 |
| Dependencies | `clsx` | none | none | none (React peer) |
| Unpacked size | 22 kB | 8.6 kB | 1.05 MB (with maps) | 38.6 MB (2,341 JS files) |
| Main file, gzip | 1,034 B | 248 B | 17,638 B | 32,072 B (all icons) |
| Install script, `bin` | none | none | none | none |
| `deprecated` | no | no | no | no |
### 4.1 Code scan
- `clsx`: 0 hits for every pattern. `class-variance-authority`: 0 hits except one Apache licence URL in a comment.
- `tailwind-merge`: 0 hits for code patterns. The 1,432 URL hits are doc links inside the class name tables and comments. I found no `fetch` and no `eval`.
- `lucide-react`: 0 hits except `http://www.w3.org/2000/svg` (the SVG namespace, not a request). It writes no inline style and no `innerHTML`. React renders the SVG.
- Source match: tag `v2.1.1` of `clsx` exists. Tag `v0.7.1` of cva exists. Tag `1.70.0` of lucide exists and equals the provenance commit. The tag `v3.7.0` of `tailwind-merge` was not found. Its provenance names the tag `tailwind-merge@3.7.0` and commit `511d68a65d8f`. I did not compare file bytes for any of the four.
### 4.2 Maintenance and risk
- `clsx`: last push 2024-06-10 and one maintainer, but the package is 8 kB and has no dependency. Frozen, low risk. No provenance.
- cva 0.7.1 is the last stable release (2024-11). The repository has no open issue. One maintainer. No provenance. It pulls `clsx`.
- `tailwind-merge`: last push 2026-11-08, 42 open issues. It is the only helper that matters for size (17.6 kB gzip, not tree-shakeable because the class tables sit in one bundle).
- `lucide-react`: a release almost every day. Daily releases raise the exposure to a hijacked release. The control is the exact pin plus a rule that no automatic update runs. 365 open issues, none about security. No advisory.
- Advisories: `npm audit` 0. Bulk POST `{}`. GitHub Advisory Database 0 for `clsx`, cva, `tailwind-merge` and `lucide-react`.
- Tree shaking: `lucide-react` has `sideEffects: false` and named exports, so the bundle holds only the imported icons. The size of one icon in the build is UNVERIFIED. Never import `DynamicIcon` or `dynamicIconImports`. `tailwind-merge` has `sideEffects: false` but the whole class table is kept.
### 4.3 Verdicts
- `clsx`: ADOPT.
- cva: ADOPT WITH CONDITIONS (C1 to C4, C10). Note the maintainer has one person and no provenance.
- `tailwind-merge`: ADOPT WITH CONDITIONS (C1 to C4). Size is the cost.
- `lucide-react`: ADOPT WITH CONDITIONS (C1 to C4, C9, C11).
## 5. Base UI (alternative to Radix)
### 5.1 Name
The real name is `@base-ui/react`. The old name `@base-ui-components/react` is deprecated ("Package was renamed to @base-ui/react"). Its last version is `1.0.0-rc.0` from 2026-07-15. Do not install it.
### 5.2 Facts for `@base-ui/react` 1.9.0
| Item | Value |
|---|---|
| Published | 2026-10-09, 13 versions, first version 2025-12-11 |
| Maintainers | 8 people (MUI team) |
| Repository | `mui/base-ui` (org, 11,332 stars, MIT). Last push 2026-11-08. 482 open issues, 0 with "security" in the title. |
| Provenance | Yes. Branch `master`, commit `ad7ecda5296b`. |
| Weekly downloads | 28,356,772 |
| Size | 10.4 MB unpacked (1,682 JS files, `sideEffects: false`) |
| Dependencies | 5: `@babel/runtime`, `@base-ui/utils`, `@floating-ui/react-dom`, `@floating-ui/utils`, `use-sync-external-store`. Total tree: 12 packages, all MIT, 0 install scripts, 0 audit findings. |
| Code scan | 0 hits for `eval`, `new Function`, `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `innerHTML`, `localStorage`. 898 reads of `NODE_ENV` only. |
| Inline style | `.style.setProperty` and `style.cssText` on elements (CSSOM, allowed). No `<style>` element. One `dangerouslySetInnerHTML` in `PrehydrationScript` for server rendering. The browser build swaps it for an empty stub. A `CSPProvider` exists for nonces. |
| shadcn support | `styles/base-nova/index.json` lists `@base-ui/react` instead of `radix-ui`. The component registry has the same names. |
### 5.3 Comparison
| Risk | Radix (`radix-ui`) | Base UI |
|---|---|---|
| Installed packages | 81 (meta) or 44 (single) | 12 |
| Owner | WorkOS org, 2 core maintainers | MUI org, 8 maintainers |
| Provenance | Yes (Radix). No (the six scroll-lock helpers by one person). | Yes |
| CSP | Dialog needs a `<style>` element | No `<style>` element found |
| Age of the API | Old, stable, widely used (92 million weekly for `dialog`) | 1.x since late 2025 and 13 versions. Newer. |
| Audit and advisories | 0 | 0 |

Base UI is the safer choice on supply-chain and CSP evidence. Reasons: 12 packages against 44 to 81, no single-maintainer helper chain, and no `<style>` injection. Radix has the longer track record and the shadcn Radix variant is the one that the spike tested. The Base UI variant was not tested. Switching means a new spike for contrast, axe and CSP.
Recommendation: if the app uses no dialog from a library (native `<dialog>`), Radix is acceptable and the spike data applies. If the team wants a library dialog under the strict CSP, choose Base UI and run the spike again. Do not add both.
## 6. The `shadcn` CLI (code download)
### 6.1 Identity
Version 4.23.0, published 2026-10-27. Maintainers `shadcn` and `npm_bot_shadcn` (Vercel bot). Repository `shadcn-ui/ui` (org, 127,633 stars, MIT). Provenance: yes (`release.yml`, branch `main`, commit `96da9cc7f1aa`). Weekly downloads 17,751,295. The tag `shadcn@4.23.0` exists (`b6d0aca20e44`). 314 versions. Unpacked size 214 kB (9 JavaScript files in `dist`). No `deprecated`. Open issues: 1,778 (4 with "security" in the title, not read).
### 6.2 What the CLI fetches and writes
- It reads JSON from `https://ui.shadcn.com/r/` (the registry). Each file holds the component source as text in `content`, plus `dependencies`, `devDependencies` and `registryDependencies`. I read 14 such files for the 12 components. The source has no `eval`, no `fetch` and no `dangerouslySetInnerHTML`.
- It writes the component files under `src/components/ui/`, `src/lib/utils.ts` and edits the main CSS file (adds `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` plus `@layer base` rules) and `components.json`.
- The component code comes from a remote host at the time you run the command. It is a code download. Any change at `ui.shadcn.com` changes what lands in the repository. Git diff review is the control.
- It installs packages itself. The code runs `npm install --no-audit --no-fund -- <names>` (in `@shadcn/registry` 0.2.1). It does not pass `--ignore-scripts`. A package name that comes from a registry file goes to `npm install`. Package names come from the registry JSON. The CLI puts `--` before the names, so a name cannot act as an option.
- `init -t vite` clones `https://github.com/shadcn-ui/ui.git` (sparse checkout) into a temp folder and runs `<pm> install` and `git init`. Do not use `-t`. Use `init` in the existing app.
- Reads of the environment: `SHADCN_GITHUB_URL`, `SHADCN_TEMPLATE_DIR`, `NODE_ENV` in the CLI and `REGISTRY_URL` in `@shadcn/registry`. An attacker who controls these variables redirects the download. Check them before a run.
- Third-party registries (`@namespace/name`) load code from any URL. Do not use them.
- `shadcn init` adds `shadcn` as a dev dependency because the CSS imports `shadcn/tailwind.css` (16 kB of keyframes and variants, no `@import` and no `url()`). The command `shadcn eject` inlines that file and removes the dependency. The CLI also adds an MCP setup option. Do not enable it.
- The CLI offers a font package (`@fontsource-variable/...`, OFL-1.1) in some presets. It is not vetted here. Choose no font package (see C12).
### 6.3 Dependencies and advisories
`npm install --ignore-scripts --package-lock-only shadcn@4.23.0` gives 225 packages and 0 install scripts. Licences: MIT 190, ISC 15, BSD-3-Clause 6, Apache-2.0 5, BSD-2-Clause 4, BlueOak 2, 0BSD 1, `(MIT OR CC0-1.0)` 1, and one CC-BY-4.0 (`caniuse-lite`, data, not code).
`npm audit`: 6 findings (2 low, 4 moderate), all dev tree only:
| Package | Advisory | Path |
|---|---|---|
| `deepmerge` 4.3.1 | GHSA-gcqx-w48m-w2h4 (prototype poisoning, low) | `shadcn`, `@shadcn/registry` |
| `minimatch` | GHSA-g3hv-75wg-m249 (DoS, moderate) | `ts-morph`, `@ts-morph/common` |

The CLI merges JSON from the registry with `deepmerge`. The poisoning advisory is therefore reachable in theory. The impact is limited to the CLI process during a run. The fix needs a change of `shadcn` upstream.
Verdict: ADOPT WITH CONDITIONS: C1, C2, C6, C7, C8. Run it as `npx shadcn@4.23.0 ...` and do not put it in `package.json` (after `eject`). Keep `shadcn` out of `allowed-deps.txt`.
## 7. Transitive tree
Scratch projects used `npm install --ignore-scripts --package-lock-only --save-exact`.
| Set | Packages | Install scripts | Non-permissive licences | `npm audit` |
|---|---|---|---|---|
| Runtime: `radix-ui`, cva, `clsx`, `tailwind-merge`, `lucide-react`, `react`, `react-dom` | 81 | 0 | 0 | 0 |
| Runtime with the 11 single Radix packages | 44 | 0 | 0 | 0 |
| Build: `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, `vite` | 73 (52 for Linux) | 1 (`fsevents` 2.3.3, macOS only) | 12 `lightningcss*` packages: MPL-2.0 | 0 |
| `@base-ui/react` plus React | 12 | 0 | 0 | 0 |
| `shadcn` CLI | 225 | 0 | `caniuse-lite` CC-BY-4.0 (data) | 6 (dev only) |

Other licences in the build set: MIT, 0BSD (`tslib`), Apache-2.0, ISC and BSD-3-Clause.
## 8. Conditions
| Id | Condition | Applies to |
|---|---|---|
| C1 | Pin exact versions with no caret (section 9). Commit `package-lock.json`. Install with `npm ci --ignore-scripts`. Set `ignore-scripts=true` in the project `.npmrc`. | all |
| C2 | Add the names to `scripts/allowed-deps.txt` with the plan reason. Run `deps-check.sh`, `npm audit --omit=dev` and `make-notices.mjs`. | all |
| C3 | After `npm ci`, compare the lockfile integrity values with section 9. A different hash blocks the merge. | all |
| C4 | Run this vetting again before any version change. A new version is not a safe patch by default. | all |
| C5 | Do not use `Dialog` or `AlertDialog` of Radix under the strict CSP. Use the native `<dialog>` with `showModal`. Do not run `shadcn add alert-dialog` or `dialog`. If a library dialog is needed, evaluate Base UI first. | `radix-ui` |
| C6 | Run the CLI only as `npx --ignore-scripts shadcn@4.23.0 <command>` from the `app/` folder. Add components one by one. Read `git diff` before each commit. Reject a diff that has `fetch`, `eval`, `dangerouslySetInnerHTML`, `style=` text, a URL or a new import. | `shadcn` |
| C7 | Use only the default registry `https://ui.shadcn.com/r`. Add no `@namespace` registry, no MCP setup and no `init -t`. Unset `SHADCN_GITHUB_URL`, `SHADCN_TEMPLATE_DIR` and `REGISTRY_URL` before a run. Check the new names in `dependencies` of each registry file against `allowed-deps.txt` before you let the CLI install. | `shadcn` |
| C8 | After `init`, run `shadcn eject` so that `shadcn/tailwind.css` is inline. Then remove `shadcn` from `package.json`. Commit the inline CSS. | `shadcn`, `tailwindcss` |
| C9 | `tailwindcss` 4.3.5 and `lucide-react` 1.70.0 are 2 days old. If the team wants a cool-off of 7 days, install 4.3.5 after 2026-11-13, or use 4.3.3 (2026-07-16). Do not allow any automatic update tool. | `tailwindcss`, `lucide-react` |
| C10 | Record in the PR that cva and `clsx` are single-maintainer packages without provenance and that `clsx` is frozen. | cva, `clsx` |
| C11 | Import icons by name only: `import { X } from 'lucide-react'`. Never import `DynamicIcon` or `dynamicIconImports`. Add a check to `claims-check.sh` for these two names. | `lucide-react` |
| C12 | Use no font package from the CLI. Keep the system font or ask for a separate vetting of the font. Do not run `init` with a preset that adds `@fontsource-*`. | `shadcn` |
| C13 | The Tailwind CSS must use no `@plugin`, no `@config` and no `@source` with a path outside `app/`. Add a check for these three words in `src/**/*.css`. | `tailwindcss` |
| C14 | Run the build in CI with no secrets in the environment. Keep `node_modules` out of any cache that is shared with deploy jobs. | build set |
| C15 | Extend `make-notices.mjs` so that the notices also cover the transitive Radix and helper packages that reach the browser bundle (about 60 MIT and 1 0BSD). The script today reads direct dependencies only. | notices |
| C16 | Add the CSP test: open the erase dialog and each added component in a real browser and check for zero violations. Also fix contrast (muted text 4.34, ring 2.59, border 1.26, from the spike). These are the open items of section 2 of the UI decisions note. | all UI |
## 9. Pinning
Lines for `package.json`. Runtime (`dependencies`):

```json
"class-variance-authority": "0.7.1",
"clsx": "2.1.1",
"lucide-react": "1.70.0",
"radix-ui": "1.8.1",
"tailwind-merge": "3.7.0"
```

Build only (`devDependencies`):

```json
"@tailwindcss/vite": "4.3.5",
"tailwindcss": "4.3.5",
"tw-animate-css": "1.4.0"
```

Install command: `npm install --save-exact --ignore-scripts class-variance-authority@0.7.1 clsx@2.1.1 lucide-react@1.70.0 radix-ui@1.8.1 tailwind-merge@3.7.0` and `npm install --save-dev --save-exact --ignore-scripts @tailwindcss/vite@4.3.5 tailwindcss@4.3.5 tw-animate-css@1.4.0`.

Lines for `scripts/allowed-deps.txt`. Runtime group first, then the build group next to `vite`. Each group is in alphabetical order:

```
class-variance-authority
clsx
lucide-react
radix-ui
tailwind-merge
@tailwindcss/vite
tailwindcss
tw-animate-css
```

Integrity values (first 40 characters of each, from `npm view`). The lockfile must hold the full value:

```
tailwindcss                 4.3.5   sha512-FcQk9BuffmEHJP2G0XmB2SplU1aLTI7j0...
@tailwindcss/vite           4.3.5   sha512-BCNiY0a1ZjdOHVqw7kyb7U72BwfMF3dfU...
radix-ui                    1.8.1   sha512-HPfpVGizO9xANlsFSauruLhRe/3+iOt3v...
class-variance-authority    0.7.1   sha512-Ka+9Trutv7G8M6WT6SeiRWz792K5qEqIG...
clsx                        2.1.1   sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiO...
tailwind-merge              3.7.0   sha512-XPPUyAc+cvspz3lHTcR/QgPfW2A0lv/xQ...
lucide-react                1.70.0  sha512-gCTPPN1MlQUBtUgdsUv+0CAUj+X8hifRU...
tw-animate-css              1.4.0   sha512-7bziOlRqH0hJx80h/3mbicLW7o8qLsH5+...
```

Notices (`public/THIRD_PARTY_NOTICES.txt`). `make-notices.mjs` matches `LICENSE`, `LICENSE.md`, `LICENSE.txt` and `license` (case does not matter).
- `radix-ui`: MIT, "Copyright (c) 2022 WorkOS". `clsx`: MIT, "Copyright (c) Luke Edwards". `tailwind-merge`: MIT, "Copyright (c) 2021 Dany Castillo". `tw-animate-css`: MIT, "Copyright (c) 2025 Wombosvideo". The files exist in the tarballs.
- cva: Apache-2.0 text in `LICENSE`. The tarball has no `NOTICE` file, so no NOTICE text is needed.
- `lucide-react`: the `LICENSE` file holds ISC for Lucide and MIT for the icons that come from Feather (Copyright 2013-present Cole Bemis). The script copies the whole file, so both texts stay.
- `tailwindcss` and `@tailwindcss/vite` do not ship to the browser. Their notices are not needed in the app file.
## 10. Package count and the plan limit
The plan limit is at most 6 added runtime packages (the UI decisions note section 2).

Runtime, in the browser bundle (5): `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`. Build only, in `devDependencies` (3): `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`. The CLI `shadcn` is not a dependency (0). It runs with `npx` and `eject` removes it.
The runtime count of 5 fits the limit of 6. The limit must say "runtime" and must list the build only packages separately. The runtime tree has 81 packages in total (section 7). The spike counted 9 direct packages because it also counted the build packages and `shadcn`. If the 11 single Radix packages are used, the runtime count is 15 and breaks the limit. If the team drops cva and `tailwind-merge`, the runtime count is 3.
## 11. Not verified
- Browser test of the CSP result: the link between the 4 spike violations and `react-remove-scroll-bar` comes from reading code. I ran no browser.
- Byte equality of every tarball with its repository tag. I used provenance (workflow, tag or branch, commit) and tag names. I did not rebuild any package. No tag `radix-ui@1.8.1` and no `tailwind-merge` tag `v3.7.0` were found. Their provenance names other refs.
- The native Rust binaries (`@tailwindcss/oxide-*`, `lightningcss-*`): compiled code. I did not read or run them. Only the loader and the package metadata were read. I did not check the other 11 platform packages.
- Whether the npm accounts of single maintainers (`joebell93`, `lukeed`, `dcas`, `wombosvideo`, `kashey`) have two-factor authentication. Not visible.
- Provenance of cva, `clsx` and the `react-remove-scroll` family: none exists. The release path is unknown.
- Minified bundle size per package. The gzip sizes are of the shipped files. The spike gives the total.
- The Base UI variant of shadcn: not tested for contrast, axe or CSP. I read the registry file names only.
- Legal review of MPL-2.0 (`lightningcss`, build only) and of the CC-BY-4.0 data (`caniuse-lite`, CLI tree only).
- The 1,778 open issues of `shadcn-ui/ui` and the 4 "security" titles: not read. The issues of the other repositories: searched by the word "security" only.
- Registry content after 2026-11-08. The registry is live, so a later run can fetch different code.
