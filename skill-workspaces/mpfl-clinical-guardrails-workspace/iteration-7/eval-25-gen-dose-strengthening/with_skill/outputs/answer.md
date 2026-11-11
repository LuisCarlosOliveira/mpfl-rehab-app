I will do this, with limits. The plan generator can show a dose, because one published source gives an exact number. I will not invent a dose for any exercise that the source does not cover.

**Why this is allowed**

- The source is the Cincinnati Guideline 46 (P2), recommendation 26. The audit row V49 in `research/citation-audit.md` says EXACT.
- The quote is: "strengthening exercises are initiated in 2 sets of 10-15 repetitions of exercises as appropriate, with progression to 3 sets of each exercise as tolerated". Note 1 says it applies to all strengthening exercises in all phases (`research/rehab-rules.md`, row "Sets and repetitions").
- The grade is level 5 (opinion, with indirect evidence from strength training in other groups). The population is ages 8 to 25, MPFL repair, reconstruction or revision. No adult MPFL study of dose exists.
- This follows the guideline plan rule of 2026-11-11. The app shows the number with its source, grade, population and the line "Not approved by a clinician".

**What I will change in `src/lib/protocolGen/`**

1. Add the dose to each strengthening exercise in the generated plan. This covers strengthening exercises only, such as straight leg raises, hip work and mini squats.
2. Add no dose to ankle pumps, heel slides or other non-strengthening items.
3. If the surgeon or protocol sets a dose, the surgeon number replaces this text. A surgeon number can only lower a ceiling.
4. If another source disagrees, show it on the same screen. I will check the other sources before I finish. If none disagrees, I will say so in the audit notes.
5. Add a test that pins the text and the source id. Then run `bash app/scripts/claims-check.sh app/src`.

**Cases that I will not fill**

- Quadriceps sets and other isometric holds: the guideline gives no hold time. The plan shows "no number in the guideline" for hold time and uses only the sets and reps text above.
- Seated knee extension hold: this stays phase 2 only. It needs the person to report that the surgeon cleared it. The arc ends at 40 degrees (P1). The plan sets no hold time. The dose text applies only after those conditions are true.

**Exact plan text for each strengthening exercise**

> Dose from a guideline: start with 2 sets of 10 to 15 repetitions. Progress to 3 sets as you tolerate it. If you cannot do 2 sets of 10 repetitions, ask your care team to change the intensity.
> Source: Cincinnati Guideline 46 (2015), recommendation 26. Grade: level 5, opinion. Population: ages 8 to 25 after MPFL surgery. Not approved by a clinician. Your care team plan always comes first.

Wording notes: the text has no goal, pass, "safe" or "good" word, and no verdict colour. The phrase "as you tolerate it" is the guideline wording "as tolerated". It is not a pain limit. The app sets no pain stop value here. The pain rule in FR12 stays as it is.

I did not edit any code or run any command. This reply only describes the change.
