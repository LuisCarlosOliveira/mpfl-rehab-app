# Dependency vetting: yt-dlp (private test use)

Date: 2026-11-08. Task: real-person clips for local tests of the pose pipeline. The user decided on option 3: use `yt-dlp` for private tests. The user accepts that YouTube terms forbid downloads with a tool.
Skills loaded with the Skill tool: `owasp-security`, `simple-english:simple-english`, `anti-slop-code:anti-slop-code`. Method: `docs/dependency-vetting.md`, adapted for PyPI.

I only downloaded files. I ran no code from the packages before this vetting ended. All data is from 2026-11-08. The work folder is the scratchpad folder `ytvet/`.

## 1. Summary
| Item | Value |
|---|---|
| Package | `yt-dlp` 2026.10.26 (PyPI upload 2026-10-26, 22:25 UTC) |
| License | Unlicense |
| Extra package | `yt-dlp-ejs` 0.8.0 (2026-03-17), needed for YouTube |
| Verdict | ADOPT WITH CONDITIONS |

The install has no hook that runs code. No known advisory affects 2026.10.26. The conditions are in section 8.

## 2. Identity
- PyPI project `yt-dlp`. Repository `https://github.com/yt-dlp/yt-dlp`. Owner type is Organization. 206,190 stars. Last push 2026-11-04. Not archived.
- `pyproject.toml` names the author pukkandan and the maintainers Grub4K, bashonly and coletdjnz.
- The name `yt_dlp` is the same PyPI project, because PyPI normalizes the name.
- `youtube-dl` is the older upstream project (last release 2021-12-17, author Sergey M.). `ytdl` is an unrelated package (last release 2020). `yt-dlp-plugins` does not exist on PyPI.
- Conclusion: no typosquat. I install the exact name `yt-dlp` with an exact version.
- Latest stable release on PyPI is 2026.10.26. Newer uploads (2026.10.29, 2026.11.4) are `.dev` builds. I do not use them.

## 3. Files and hashes
| File | SHA-256 | PyPI digest |
|---|---|---|
| `yt_dlp-2026.10.26-py3-none-any.whl` (3,186,201 B) | `a05c5b5d8562f7e8a62f5334348b406af4930d56d3a65f8021d14af0e22339ae` | same |
| `yt_dlp-2026.10.26.tar.gz` (3,048,880 B) | `abe5c6b94c3b2f0560500add1c42e0a97641752743a5b65588ac2007a6e23eb6` | same |
| `yt_dlp_ejs-0.8.0-py3-none-any.whl` | `79300e5fca7f937a1eeede11f0456862c1b41107ce1d726871e0207424f4bdb4` | same |

- The wheel code equals the sdist code and the GitHub release `yt-dlp.tar.gz`. The only differences are two `README.md` files (not in the wheel) and `version.py` (the wheel sets `VARIANT = 'pip'` and an update hint). This is expected.
- The GitHub release `yt-dlp.tar.gz` has the SHA-256 `21f942d2...f95` and matches the line in `SHA2-256SUMS`.
- `SHA2-256SUMS.sig` has a good GPG signature. Key: `AC0C BBE6 848D 6A87 3464 AF4E 57CF 6593 3B5A 7581` (Simon Sawicki, yt-dlp signing key). I imported the key from the repository in a throwaway keyring. GPG warns that the key is not certified in my trust web. I did not verify the key by a second channel.
- Tag `2026.10.26` points to the commit `f264a6cb`. The release author is `github-actions[bot]`.
- PyPI attestations: not checked (UNVERIFIED).

## 4. Install-time code
- Build backend: `hatchling` (wheel built with 1.32.4). The wheel is `py3-none-any`, so `pip` runs no build step for it.
- `pyproject.toml` has no custom build hook. There is no `setup.py`. The wheel has no `.pth` file.
- Entry points: `yt-dlp = yt_dlp:main` and a PyInstaller hook directory that runs only when someone bundles the tool.
- `dependencies = []`. The base package needs nothing.
- `yt-dlp-ejs` 0.8.0: wheel only needs Python 3.10. It holds two minified JavaScript files and two small Python readers. Its sdist has a custom hook for the build only, not for the wheel install.

## 5. Dependencies
| Extra | Content | Decision |
|---|---|---|
| (none) | no dependency | install |
| `default` | brotli, certifi, mutagen, pycryptodomex, requests, urllib3, websockets, yt-dlp-ejs | only `yt-dlp-ejs` |
| `curl-cffi` | browser TLS impersonation | not installed: it exists to avoid bot checks |
| `secretstorage`, `deno`, `pin*` | browser cookies, runtime, pins | not installed |

The built-in `urllib` handler works without `requests`. Without `yt-dlp-ejs`, YouTube formats can fail. The tool then needs a JavaScript runtime. Node 24 is on this machine. The Node provider starts Node with the `--permission` flag (read in `jsc/_builtin/node.py`), so the solver script cannot read files or use the network.

## 6. Advisories
GitHub advisory database, `affects=yt-dlp`. I list each one with the fixed version. The planned version 2026.10.26 is above all of them.

| Advisory | Topic | Fixed in |
|---|---|---|
| GHSA-6v4j-43gg-vj32 (CVE-2026-55404) | command injection through `--write-link` output | 2026.7.4 |
| GHSA-69qj-pvh9-c5wg | command injection with `--exec` | 2026.6.9 |
| GHSA-vx4q-3cr2-7cg2 (CVE-2026-50574) | code execution with manifest downloads and `aria2c` | 2026.6.9 |
| GHSA-c6mh-fpjc-4pr3 (CVE-2026-50023) | dangerous file type through filename sanitization | 2026.6.9 |
| GHSA-f7j3-774f-rfhj (CVE-2026-50019) | cookie leak with curl | 2026.6.9 |
| GHSA-g3gw-q23r-pgqm (CVE-2026-26331) | command injection with `--netrc-cmd` | 2026.02.21 |
| GHSA-79w7-vh3h-8g4j (CVE-2024-38519) | file write and RCE through file extension | 2024.07.01 |
| GHSA-3v33-3wmw-3785 | third-party code in Douyu extractors | 2024.07.07 |
| GHSA-hjq6-52gw-2g7p, GHSA-42h4-v29r-42qg | `--exec` injection with `%q` on Windows | 2024.04.09, 2023.09.24 |
| GHSA-3ch3-jhc6-5r8x | proxy injection in the generic extractor | 2023.11.14 |
| GHSA-v8mc-9377-rwjj | cookie leak | 2023.7.06 |

The advisory list for `yt-dlp-ejs` is empty. Two classes of risk remain: a new bug in a future parser, and a crafted video page that abuses an option. The rule is to avoid `--exec`, `--write-link`, `--netrc-cmd`, external downloaders and cookies.

## 7. Network and process use
- Update check: `update.py` calls `api.github.com/repos/yt-dlp/yt-dlp/releases`. It runs only with `-U` or the update options. Use `--no-update`.
- Other hosts in non-extractor code are comments and links only. The extractor code holds the video sites. For YouTube it holds `youtube.com`, `i.ytimg.com`, `music.youtube.com` and some mirror names in test data.
- I found no telemetry, no analytics call and no unknown fixed host in the core code.
- Files that start processes: `YoutubeDL.py`, `cookies.py`, `downloader/external.py`, `downloader/rtmp.py`, `postprocessor/exec.py`, `postprocessor/ffmpeg.py`, `postprocessor/embedthumbnail.py`, `update.py`, `extractor/youtube/jsc/_builtin/{node,deno,bun,quickjs}.py`, and some legacy helpers.
- In normal use these run `ffmpeg` and `ffprobe` (merge and trim) and Node (YouTube solver). The `exec.py` and `external.py` paths run only with the user options `--exec` and `--downloader`.
- No `eval`, `pickle` or `marshal` in the shipped code (grep).
- Not verified: I did not read every extractor. There are about 1,000 files.

## 8. Conditions
| Id | Condition |
|---|---|
| C1 | Install only in the throwaway venv `ytenv`. Never global, never in the repo. |
| C2 | Use `pip install --no-deps --require-hashes` with the three SHA-256 values above. |
| C3 | Run with `python -I -m yt_dlp --no-update --ignore-config --no-plugin-dirs`. No cookies, no proxy, no login. |
| C4 | Do not use `--exec`, `--write-link`, `--netrc-cmd`, `--downloader` or `-U`. |
| C5 | Write output only into the scratchpad folder `clips-real/`. Clips stay out of git, are not shared, and serve local tests only. |
| C6 | If YouTube asks for sign-in or a bot check, stop. Do not work around it. |
| C7 | Re-vet before any version change. |

## 9. Maintenance
Releases in 2026: 01.29, 01.31, 02.04, 02.21, 03.03, 03.13, 03.17, 06.09, 07.04, 08.19, 10.21 and 10.26. That is a release about every 3 to 6 weeks. The project has an organization, four maintainers and a signed release. Many security fixes in 2026 show active response.

## 10. Not verified
- The signing key by a second channel.
- PyPI attestations for the wheel.
- Every extractor and the minified solver code of `yt-dlp-ejs` (I read the Python files, the hosts and the code patterns only).
- Two-factor use on the PyPI accounts of the maintainers.
