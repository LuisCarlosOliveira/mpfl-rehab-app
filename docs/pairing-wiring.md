# Pairing: what to wire into the app

Task T12b. The pairing code is built and tested. No file of the app uses it yet. This note tells the main session what to add.
The files `App.tsx`, `Setup.tsx`, `Home.tsx` and `appState.ts` are not changed by the pairing task.

## What exists

| Item | File | Use |
|---|---|---|
| `PairCompanion` | `src/ui/PairCompanion.tsx` | The screen for the phone. Props: `onExit`. |
| `PairHost` | `src/ui/PairHost.tsx` | The screen for the laptop. Props: `pairing`, `view`, `onDone`, `onSkip`. |
| `usePairing()` | `src/pairing/usePairing.ts` | Hook. Returns `{ pairing, view }`. |
| `createPairing()` | `src/pairing/pairing.ts` | The same object without React. |
| `pairing.source()` | `src/pairing/pairing.ts` | A `LandmarkSource` with `view: 'front'`. It gives frames only while the status is `connected`. |
| `cameraSource(options)` | `src/pose/source.ts` | New options: `view`, `deviceId`, `facingMode`. The default is unchanged. |

Both screens import `src/pairing/pair.css` by themselves. No change to `styles.css` is needed.

## 1. The phone screen

1. Add the screen id `pair-companion` to `SCREEN_IDS` in `src/lib/flow.ts`.
2. In `resolve()` of `appState.ts`, return the target for `pair-companion` like for `privacy` and `load`. The phone has no protocol and no red-flag check. It only sends body points.
3. In `App.tsx`, show `<PairCompanion onExit={() => dispatch({ type: 'open', screen: 'home' })} />` for this screen. If the phone has no protocol, use `load` as the exit.
4. Add the button text `Use this phone as the second camera`. Put it on the Home screen and on the Load protocol screen. A new phone has no protocol, so it must also be on the Load screen.
5. The screen has its own `h1`. The shell already moves the focus to `main h1` when the screen changes.

## 2. The laptop step in Setup

The step is optional. It comes before the camera step, because the scan uses the same camera layer (`src/pose/camera.ts`). The layer keeps one active stream.

1. Create the pairing once for the setup flow: `const { pairing, view } = usePairing();` in `App.tsx`, or in a small parent of `Setup`. The pairing must live longer than the step, because the Session screen reads from it.
2. On the position guide step of `Setup`, add the button `Add a second camera`. Show it only when the exercise can use the front view (the plan decides which). Show it with the text `Optional`.
3. The button sets a new step `pair`. This step shows `<PairHost pairing={pairing} view={view} onDone={goToCameraStep} onSkip={goToCameraStep} />`.
4. `onDone` and `onSkip` both go to the camera step. The camera step starts the main camera as before.
5. If the patient leaves Setup without a connected phone, call `pairing.close()`. If the status is `connected`, keep it open until the session ends.

## 3. The second view in the Session screen

1. `Session` takes one `source` today. Add an optional prop `second?: LandmarkSource`. Pass `pairing.source()` when `view.status === 'connected'`, and nothing otherwise.
2. When `second` exists, call `second.start(handler)` after the first source starts. The handler gets the 33 landmarks of the phone and the time of the laptop clock.
3. Use the values only for the clinician record. Use `pairReps` and `frontKneeInward` from `src/lib/views.ts` (FR24). Show no live cue from the front view.
4. Call `second.stop()` when the session ends. Then call `pairing.close()`. The close sends a `bye` to the phone, and the phone stops its camera.
5. If the link fails during a session, `view.status` becomes `failed`. The session continues with one camera. Show the text of `view.message` once.

## 4. The `view` field of the session record

`SourceView` is now the type `View` (`side` or `front`). The side source has the tag `side`. The phone source has the tag `front`. Write the tag of each source into the session record and the export, as T9c asks. The default is `side`.

## 5. Limits that the wiring must keep

- Do not add `getUserMedia`, a video element or an image of the phone to the laptop. The laptop gets numbers only.
- Do not call `pairing.begin()` before the patient presses `Start pairing`.
- Do not show the status words as a verdict. The screens use only: Waiting for the phone, Connecting to the phone, Connected, Could not pair, Stopped.
- The text `Could not pair. The app continues with one camera.` is fixed. Do not change it.

## 6. The test route that is not in the CI pipeline

The browser specs of the pairing use their own config: `e2e/pairing/playwright.config.ts`. Run: `PAIR_OUT=<folder> npx playwright test -c e2e/pairing/playwright.config.ts --workers=1`. The config has two projects, `pairing` and `pairing-ip`. Add a step to the pipeline for it, or merge its projects into `playwright.config.ts`. The test pages are in `e2e/pairing/`. They are never shipped.
