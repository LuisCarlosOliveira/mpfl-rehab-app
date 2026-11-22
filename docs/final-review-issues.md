# Final review: issues list

Date: 2026-11-11. Build under review: commit 1ba91ac (master 55219d7 is a merge of it).

## How the review ran

- Three Opus testers (high effort) drove the real built app with Playwright. The fake camera played the real exercise clips. They took screenshots at 390 x 844 and 1280 x 800, in light and dark.
  - Tester A: planning and onboarding (17 issues).
  - Tester B: live exercise, skeleton, cues (8 issues).
  - Tester C: evaluation, Summary, dashboard, data, care team view (12 issues).
- One Opus reviewer (high effort) checked each issue in the code and reproduced the High and Medium issues in its own browser run. It added 3 new issues (R-02 to R-04).
- Raw findings and evidence stay outside the repository, in the session scratchpad folder `review/` (folders A-planning, B-exercises, C-evaluation, R-reviewer).
- The reviewer also checked tester B. B-01 is a duplicate of C-01.

## Decisions taken (the user said: no confirmation needed)

| Issue | Decision | Reason |
|---|---|---|
| C-03 | "Skip the questions" keeps a pain answer that the person already gave and that started the pause. | A reported pain of 7 must not vanish. The care team needs the trace. |
| A-03 | After week 11 the week-3 plan stays usable, with a clear note. The review card does not offer an update. | The app has no plan after week 11. It must not promise one. |
| A-15 | The S1 review dates stay in the plan. | They only open a review prompt. They never add load. |
| A-16 | No change. | The brief asks for one left-aligned column. Polish only. |
| B-03 | Change the Setup text to "Make sure that only you are in the camera view." When the chosen hip jumps more than an engineering fraction of the width in one update, treat the frames as not seen until the hip is steady. No second pose model. | Keeps CPU low on the i5 target. Needs no new data. |
| B-08 | No change. Record as a clinician blocker. | A plausibility cap is an engineering number with no source. |
| C-07 | Show whole degrees everywhere. | The angle error is about 9 degrees. A decimal claims more precision. |

A clinician must still confirm: A-03 (does the week-3 plan stay usable after week 11) and every clinical value.

## Issues and verdicts

| ID | Verdict | Severity | Package |
|---|---|---|---|
| C-01 / B-01 | Confirmed. A seated hold counts while the leg is out of view. Cause: `exercises.ts` returns before `holdStep` and `repsStep` on a null angle. | High | P-LIVE |
| C-02 | Confirmed. A between-set pain answer is missing from the care team view. | High | P-SAFETY |
| R-02 | New, confirmed. The Home contact card ignores a between-set pain of 7 or more when the protocol has no threshold. | High | P-SAFETY |
| C-03 | Confirmed. See the decision above. No Home contact card after the Skip either. | Medium | P-LIVE |
| C-04 | Confirmed. "Last peak knee bend" names no exercise and can show a leg raise value. | Medium | P-DATA |
| C-05 | Confirmed. The charts say "Date" but space sessions evenly. | Medium | P-DATA |
| C-11 | Confirmed. At 320 px an empty swelling cell has the colour of a checked cell (flowV2.css:292, :322). Raised to Medium because it is a safety question. | Medium | P-LIVE |
| A-01 | Confirmed. The summary shows an answer that was never asked. | Medium | P-PLAN |
| A-02 | Confirmed. Create over a stored plan offers Confirm, then refuses with a wrong reason. | Medium | P-PLAN |
| R-03 | New, confirmed. Two copies of `movesForward` differ. Root cause of A-02 case C. | Medium | P-PLAN |
| A-03 | Confirmed. See the decision above. | Medium | P-HOME |
| A-04 | Confirmed. "Why this plan" for the heel slide says the opposite of the plan. | Medium | P-PLAN |
| A-05 | Confirmed. The home exercise rows look unfinished and are louder than the camera exercises. | Medium | P-PLAN |
| A-06 | Confirmed. A limit of 200 or -5 disables Next with no message. | Low | P-PLAN |
| A-07 | Confirmed. The Confirm list is inconsistent. | Low | P-PLAN |
| A-08 | Confirmed. A hover fill covers the first line of a Load row. | Low | P-PLAN |
| A-09 | Confirmed. The review card leads to disabled export buttons. | Low | P-HOME |
| A-10 | Partly. Raw schema text on Load refusals. | Low | P-HOME |
| A-11 | Confirmed. After the emergency block the text says to go back to Home to start again. | Low | P-HOME |
| A-12 | Confirmed. A date after week 11 does not stop the questions early. | Low | P-PLAN |
| A-13 | Partly. Home has no Privacy link. "I understand" from My data lands on Home. | Low | P-HOME |
| A-14 | Confirmed in code. Plan answers stay stored and go into every export. | Low | P-DATA |
| A-15 | Not a bug. Decision above. | Low | none |
| A-16 | Partly. Decision above. | Low | none |
| A-17 | Confirmed. Chips and button names do not match their texts. | Low | P-PLAN (chip), P-HOME (button) |
| C-06 | Confirmed. The leg raise Summary says "could not read" next to camera numbers. | Low | P-LIVE |
| C-07 | Confirmed. Two precisions for one angle. | Low | P-DATA (dashboard), P-SAFETY (care team) |
| C-08 | Confirmed. My data counts rows that the export leaves out. | Low | P-DATA |
| C-09 | Confirmed. The import text does not match the real rule. | Low | P-DATA |
| C-10 | Confirmed. The exercise list shows running totals of reps. | Low | P-DATA |
| C-12 | Confirmed. Raw timestamp in the care team header. | Low | P-SAFETY |
| R-04 | New, confirmed. Lower case exercise name in the care team table. | Low | P-SAFETY |
| B-02 | Confirmed. The over-limit alert hides the lowest-angle button (sessionV2.css:110). 0 reps in 60 s. | Medium | P-LIVE |
| B-03 | Confirmed. A second person takes over the chosen leg (landmarker.ts:78 numPoses 1). See the decision above. | Medium | P-LIVE |
| B-04 | Confirmed from the crop and the code. Setup body map labels hidden under other texts. | Low | P-LIVE |
| B-05 | Confirmed in code. The picture angle and the readout differ (raw against filtered). | Low | P-LIVE |
| B-06 | Confirmed in code. "Show your whole leg." flickers (BodyMap waits 500 ms, the cue does not). | Low | P-LIVE |
| B-07 | Plausible, tester evidence only. No moving-leg note when the chosen leg is the hidden far leg. | Low | P-LIVE |
| B-08 | Confirmed in code. Heel slide Summary shows 172 degrees from clip cuts. A cap would be an engineering number with no source. See the decision above. | Low | none |

## Packages (no two packages edit the same file)

- P-SAFETY: `lib/contactCard.ts`, `lib/reviewSummary.ts`, `ui/ClinicianView.tsx`.
- P-DATA: `ui/Dashboard.tsx`, `lib/progress.ts`, `ui/DataScreen.tsx`, `lib/storage/export.ts`.
- P-PLAN: `lib/onboarding.ts`, `ui/Onboarding.tsx`, `ui/answerControls.tsx`, `ui/ConfirmPlan.tsx`, `lib/protocol/accept.ts`, `lib/planView.ts`, `ui/PlanResult.tsx`, `lib/protocolGen/rules.ts`, `ui/HomeExercises.tsx`, `ui/screensV2.css`.
- P-HOME: `ui/Home.tsx`, `ui/App.tsx`, `ui/appState.ts`, `ui/LoadProtocol.tsx`, `ui/Referral.tsx`, `ui/RedFlag.tsx`, `lib/protocol/loader.ts`. No CSS.
- P-LIVE: `lib/exercises.ts`, `lib/counters.ts`, `lib/cues.ts`, `ui/Session.tsx`, `ui/sessionV2.css`, `ui/BodyMap.tsx`, `ui/Summary.tsx`, `ui/flowV2.css`, `ui/setupView.ts`.

## Not tested by anyone

No live test ran in this round for these items:

- A live full set (rest panel and between-set pain only through import).
- A real second camera and a real phone.
- Safari and Firefox.
- A screen reader.
- 200 percent zoom.
- RTL.
- Accuracy of the angle against a goniometer.
