# Clinician first review

No clinician has reviewed any value of the app. This sheet lists the values to review first, before any patient uses the app. The full register is in [docs/clinical-limits.md](clinical-limits.md).

The app is a prototype. Every value below is a PROPOSAL, an ENGINEERING value or an OPINION-grade value. Write Agree or a new value in each row. A row with the CV id "none" is in an older table of `docs/clinical-limits.md` and has no CV id. A claim marked "not traced" is not checked in the code.

| CV id | Value and unit | What it does | Where to check | Agree | Change to | Initials and date |
|---|---|---|---|---|---|---|
| none (older table, FR12) | Pain floor 7 (scale 0 to 10) | Pain of 7 or more stops the session. This holds between sets and at the Summary. Swelling "more than before" also stops it. The text is "Pause and contact your care team." A lower protocol value stops earlier. A higher protocol value never lifts the floor. The value 7 has no source. | `lib/safety.ts`, `PAIN_FLOOR` and `evaluateSession`. Screens: between sets in `ui/Session.tsx`, `ui/Summary.tsx` | | | |
| none (older table) | Phase 1 is weeks 0 to 6. Phase 2 starts at week 7. The plan ends after week 11. | Time alone never starts phase 2. The person must report that the care team cleared the next stage. The app cannot check this report. | `lib/protocolGen/rules.ts`, `PH1`, `PH2`, `W1`. `lib/protocolGen/generate.ts`, `phase2` | | | |
| none (older table) | Heel slide: count start 18 degrees, limit floor 28 degrees, return tolerance 9 degrees | The generated heel slide counts a rep from 18 degrees. In phase 1 it is in the plan only with a knee-bend limit from the surgeon. The values are ENGINEERING and are not a range target. | `rules.ts`, `ENG_TARGET`, `ENG_RETURN`, `HEEL`. Example plan: `lib/protocol/example-protocol.json`, phase 1 | | | |
| CV-47 | Heel slide drawing 60 degrees. The example plan has target 60 and limit 90 degrees. | The drawing and the example plan show these angles. They are examples and not advice. | `lib/figure.ts`, `ILLUSTRATIVE_FLEXION`. `example-protocol.json`, phase 1, `heel-slide` | | | |
| CV-02 | Camera margin 9 degrees (UNVERIFIED for the lite model) | The app adds or subtracts this value for rep targets, return tolerance and cue limits. No goniometer study checks it. | `lib/margin.ts`, `MARGIN_DEG`, `MARGIN_SOURCE` | | | |
| none (older table) | Knee-bend limit logic. The person enters the surgeon limit. | A rep counts if the peak reaches the target minus 9 degrees. A rep above the limit plus 9 degrees does not count. Without a limit, no number is assumed. | `lib/counters.ts`, `repsStep`. `rules.ts`, `RANGE_NONE` | | | |
| none (older table) | Near-limit from the limit minus 9 degrees. Over-limit above the limit plus 9 degrees. Texts: "Close to your limit, stop." and "Stop at your limit, do not push." | The cues warn at and above the limit. The near-limit cue does not stop the set. The over-limit beep repeats every 5 seconds. | `lib/counters.ts`, `repsStep`. `lib/cues.ts`, `FIXED`. `ui/Session.tsx` | | | |
| none (older table) | Straight leg raise: 2 sets of 10 reps (P2 rec 26, OPINION, ages 8 to 25) | The generated dose. The example plan has 3 sets of 10. The app has no top-angle limit unless a clinician sets `maxTopFlexion`. | `rules.ts`, `DOSE`. `lib/monitor/registry.ts`, `STRAIGHT_LEG_RAISE`, `max-top-flexion` | | | |
| none (older table) | Straight leg raise peak above 30 degrees shows "The camera could not read this leg raise." Button "Count this rep". | The 30 degree value is ENGINEERING with no source. The button counts a rep by hand. | `lib/cues.ts`. `ui/Session.tsx` | | | |
| CV-51, CV-52 | Mini squat: depth limit 50 degrees, example target 30 degrees, 2 sets of 10 reps | The generated depth limit is 50 degrees (N3, S16 healthy people). A surgeon limit can only lower it. The mini squat is not in the plan in weeks 0 to 6. | `rules.ts`, `SQUAT_DEPTH`, `SQUAT_P2`, `SQUAT_GATE`. Example plan, phase 2 | | | |
| CV-01, CV-53 | Seated hold: arc from 90 to 40 degrees. Hold target 58 degrees (40 plus 2 times 9). Example 40 and 60 degrees, 5 seconds. | The hold is only in phase 2 with the report that the surgeon cleared it. `holdSeconds` has no default. The target is an ENGINEERING value. | `rules.ts`, `HOLD_P2`, `ENG_HOLD`. `lib/counters.ts`, `holdStep`. Example plan, phase 2 | | | |
| none (older table) | Red-flag list: 9 items. 3 are emergency items and 6 go to the care team. | Any yes blocks the session. Emergency items say "Call emergency services now." The list is general guidance and is UNVERIFIED for MPFL surgery. The item "or it is not getting better" needs a yes or no form. | `lib/redflags.ts`, `RED_FLAGS`, `MESSAGES` | | | |
| none (older table) | Button "Knee gave way or hurts" | The button ends the set. The Summary shows the care-team message first and the Home card names the day. Whether the next session starts is not traced. | `ui/Session.tsx`, `ui/Summary.tsx`, `lib/contactCard.ts` | | | |
| none (decision 2026-11-22) | Self-progression is off (`VITE_SELF_PROGRESSION`, only `true` or `1` turns it on) | The app refuses a move to phase 2, a higher limit, a new mini squat or a new seated hold. It says "Ask your care team about the next stage." | `lib/protocol/accept.ts`, `selfProgressionOn`. `docs/clinical-limits.md`, section "The app never changes the phase" | | | |

## Questions before a patient session

Answer each question with yes or no. Write your initials and the date at the end.

1. Do you accept the pain floor of 7 for this patient? Yes / No
2. Do you know the surgeon knee-bend limit for this patient, and is it in the plan? Yes / No
3. Do you accept the phase 1 and phase 2 weeks and the clearance rule for this patient? Yes / No
4. Do you accept the near-limit and over-limit cues, with a camera margin of 9 degrees that is UNVERIFIED? Yes / No
5. Will you be present for the whole session, and can you stop it at once? Yes / No

If one answer is No, the patient must not use the app.

Initials and date: ______________________
