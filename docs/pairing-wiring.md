# Pairing: how the second camera is wired

Task T12b and T25. The pairing code is built, tested and wired into Home, Setup and Session. This note was a list of steps to wire. On 2026-11-09 it describes what exists. The old step list is in the git history. A real phone has not run this code (UNPROVEN).

## What exists

| Item | File | Use |
|---|---|---|
| `PairCompanion` | `src/ui/PairCompanion.tsx` | The screen for the phone. Screen id `companion`. Props: `onExit` |
| `PairHost` | `src/ui/PairHost.tsx` | The screen for the laptop. Props: `pairing`, `view`, `onDone`, `onSkip` |
| `CompanionEntry` | `src/ui/CompanionEntry.tsx` | The card with the button "Use this phone as the second camera". Home and the Load screen show it |
| `usePairing()` | `src/pairing/usePairing.ts` | Hook. `App.tsx` calls it once, so one pairing lives from Setup to the end of the Session |
| `createPairing()` | `src/pairing/pairing.ts` | The same object without React |
| `pairing.source()` | `src/pairing/pairing.ts` | A `LandmarkSource` with `view: 'front'`. It gives frames only while the status is `connected` |
| `cameraSource(options)` | `src/pose/source.ts` | Options `view`, `deviceId`, `facingMode`. The default is unchanged |

Both screens import `src/pairing/pair.css` by themselves.

## Wiring that exists now

1. The screen id `companion` is in `SCREEN_IDS` (`src/lib/flow.ts`). `resolve()` in `appState.ts` returns it like `privacy` and `load`. The phone has no protocol and no red-flag check. It only sends body points.
2. A new phone has no protocol, so the Load screen shows the button too.
3. Setup has three steps: `guide`, `pair` and `camera`. The step `pair` is optional. The button is "Add a second camera (optional)". It shows `PairHost`. The step list shows the pair step only after the person opened it.
4. `Skip` and `Back` in the pair step stop the pairing. A connected phone stays connected for the camera step and for the Session.
5. `Session` takes an optional `second` prop with the source, the status and the message. The second source starts after the first camera and has its own effect, so a link change never restarts the main camera.
6. The second view is for the clinician record only. The Session shows one status chip "Second camera connected" and no live cue from the front view.
7. When the phone stops, the Session shows "The second camera stopped. The session continues with one camera." once.
8. The session record has `secondView: front`, `frontReps` and `frontChangeDeg`. The value is the median change of at least 3 reps, inward positive (`src/lib/views.ts`, FR24). Fewer reps give no value.

## The ready message and the clock

- The laptop sends `{"type":"ready"}` when its own end of the data channel opens. The phone sends its `hello` only after `ready`. The message was added in commit 939d096.
- The time limits of the link use `performance.now()`, a clock that never steps. `Date.now()` can step back or forward when a device syncs its time, and the state machine then ended a good pairing. The test machine showed `Date.now()` going back by 9.09 s about every 5.5 s while `performance.now()` did not (comment in `tests/pairing-ui/rtcLink.test.ts`).
- A report states 3 failures in 30 runs and 2 failures in 30 runs before the two fixes, and 0 failures after them. No report file in the repo holds these runs. I did not re-run them (not re-run).
- Limits of the link: the offer is valid for 120 seconds and the hello must come within 15 seconds (PROPOSAL values). The phone sends at most 15 messages each second. A message has at most 4,096 bytes.

## The Wake Lock on the phone

- The phone screen asks for a screen Wake Lock when the person starts the link. It asks again when the page is visible again and no lock is held. Every way out releases the lock.
- A phone with no Wake Lock, or a refusal, shows the text `Your screen could turn off. Turn off the screen timeout in your phone settings while the phone works as the second camera.` The text `The screen stays on while the phone works.` shows only when the browser granted the lock. Live test 3 found that the old text was not always true (L3-04). The fix is in commit 6264037.
- A real Wake Lock request has not run. Headless Chromium rejected the request (live test 3, checks 32 and 33). A page on an address that is not a secure context has no Wake Lock (L3-04).

## Limits that the wiring keeps

- Do not add `getUserMedia`, a video element or an image of the phone to the laptop. The laptop gets numbers only.
- Do not call `pairing.begin()` before the person presses `Start pairing`.
- Do not show the status words as a verdict. The screens use only: `Waiting for the phone`, `Connecting to the phone`, `Connected`, `Could not pair` and `Stopped`.
- The text `Could not pair. The app continues with one camera.` is fixed. Do not change it.

## Known limits of the second camera

- Two phones, one offer: when two phones take the same offer, the first answer connected in 1 of 4 runs. In 3 runs the laptop stayed on "Connecting to the phone" and closed after about 18 seconds (live test 3, L3-02, LOW). The result is safe and the person can try again. No recorded re-run exists after the ready message, so it is UNPROVEN whether the message changes this.
- Pairing over a tailnet with no shared LAN: UNPROVEN. IPv6-only phones: UNPROVEN, because IPv6 and tcp candidates are dropped.
- The real phone (Redmi A3), real Android Chrome, real QR scan with a phone camera and a real private-network address of the phone have not run. Two Chrome flags on the phone are needed. No document names them (PENDING). The pairing browser tests use `--disable-features=WebRtcHideLocalIpsWithMdns` on the PC browser in tests only.
- Live test 3 ran two Chromium browsers on one machine with real video. It found 40 PASS, 2 FAIL and 6 NOT RUN in 48 checks. The tree was commit b451206, before the fixes above.
- The care team column header now reads "Front-view change, estimated, not a medical measurement". Live test round 2 verified it (the retest record, L3-03). The note says "Median of N reps, inward positive".
- Live test round 2 (commit 939d096): 10 of 10 pasted pairings connected in 1.3 to 2.0 s, and 2 real QR scans connected. The messages held no image and no video text. The test used two Chromium browsers on one machine. A real phone is still UNPROVEN.
- Update 2026-11-09, commit 903d2c9: the CSP no longer has `blob:` in `img-src` and `media-src`. The pairing browser suite (18 tests) passed 3 runs out of 3 on the final tree (the test results record). The new field `repsBy` records who counted the reps of the session (`ui/Session.tsx`). It does not change `frontReps` or `frontChangeDeg`.

## The test route that is not in the pipeline

The browser specs of the pairing use their own config: `e2e/pairing/playwright.config.ts`. Run `npm run e2e:pairing`, or `PAIR_OUT=<folder> npx playwright test -c e2e/pairing/playwright.config.ts --workers=1`. The config has two projects, `pairing` and `pairing-ip`. The spec `e2e/pairing-app.spec.ts` runs the wired screens in the main config. The test pages are in `e2e/pairing/`. They are never shipped. A report states 18 tests and three passes in a row (not re-run by me).
