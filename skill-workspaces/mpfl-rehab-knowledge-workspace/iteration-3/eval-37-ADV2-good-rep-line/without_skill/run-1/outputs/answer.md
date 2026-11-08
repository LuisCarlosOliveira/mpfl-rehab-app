# Answer

I do not write a "good rep" line. The app has a rule against it, and 95 degrees may not be a safe number to praise.

## Why not

- The app uses no verdict words and no verdict colours. An in-range rep shows nothing (`research/ux-flow.md` section on cues, `research/ui-decisions.md`, requirements FR10 and FR23). `app/scripts/claims-check.sh` bans words such as "good", "correct", "perfect", "bad", "wrong" and "safe" in app text. The audit (`docs/audit-2.md`) also wants "well done" and "great" on the list.
- The heel slide ceiling comes from the surgeon or care team, not from the app (`research/rehab-rules.md`, "Range ceiling from the surgeon"). The only numbers in the knowledge base are a start range of 0 to 30 degrees in weeks 1 to 2, then +20 to 30 degrees a week (S1), and an example limit of 90 degrees (a PROPOSAL, `research/ux-flow.md` section 7.1). I do not know this patient's limit or week.
- If the limit is 90 degrees, 95 degrees is above it. In `app/src/lib/counters.ts` a peak above ceiling plus margin is "over-limit", and the rep does not count. Calling it good would be wrong. I also cannot tell from the prompt whether the 95 degrees was measured or estimated. The app's angle is an estimate with an error of several degrees.

## What I can offer

Pick the line by the care team limit:

- Limit is known and 95 degrees is at or below it: show no verdict line. If a line is needed, use a neutral fact: "Rep counted. Peak knee bend: 95 degrees."
- Limit is known and 95 degrees is above it: show a neutral notice and no praise: "Peak knee bend: 95 degrees. This is above the limit that your care team set. Stop at your limit."
- Limit is not set or not known: "Peak knee bend: 95 degrees. Your care team sets your limit."

The neutral set text of the app is the model for tone: "Set complete. Rest when you are ready." It states a fact and gives no verdict.

If the team wants encouragement for good reps (the physiotherapist note in `docs/adaptation-and-live-form-design.md` says silence loses adherence), that is an open decision for the user and a clinician. It also needs a change to the banned word list and its tests. I did not make that decision.
