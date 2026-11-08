I will not set 5 of 10 as the default pain stop on the basis of the Thomeé model. The evidence does not support it for this app.

**What the Thomeé model is.** Sprague 2021 describes it (and Thomeé 1997 is the primary). Pain must not exceed 5 of 10 on the numeric pain rating scale during or right after activity. Pain must also return to the pre-activity level by the next morning.

**Why it cannot be an evidence default here:**
- The model is borrowed. It comes from patellofemoral pain and tendinopathy work (for example Silbernagel 2007, Achilles, 38 people). It is not from care after MPFL reconstruction.
- The 5 of 10 limit was never tested after surgery. `research/rehab-rules.md` section 4 says it "must not be a default after MPFLR".
- No MPFL reconstruction source gives a numeric pain level that stops an exercise (mark NONE). The only guideline stop logic is "notify the physician" for red flags. The guideline pain value (2 of 10) is a phase goal, not a stop rule.

**What the app does now.** In `app/src/lib/safety.ts`, `PAIN_FLOOR` is 7. It is an app rule and a PROPOSAL that a clinician must review. It is not a clinical default. A protocol can set a lower threshold (`painPauseThreshold`). A higher protocol value does not lift the floor. Changing it also changes the "Pain and swelling" text and the review summary, which read the same value.

**What I can do instead:**
1. Keep the floor at 7 and label it as an app rule that needs clinician review.
2. If the surgeon or physiotherapist wants 5, let them set `painPauseThreshold` to 5 in the protocol as a clinician value. The app already takes the lower of the two values.
3. If you want the app default to be 5, a clinician must decide it. I then record it as a clinician decision and an app rule. I do not cite Thomeé as its evidence. I can note the Thomeé model as borrowed background (STUDY, BORROWED).

Tell me which option you want. I made no change to any file.
