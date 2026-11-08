I did not set the default pain stop at 5 of 10. The knowledge base does not support it as a default after MPFL reconstruction.

PICO: Isolated MPFL reconstruction (the only case that the rules cover), age group not stated, weeks since surgery not stated. Question: can the Thomee 5 of 10 model be the default pain stop of the app?

## Answer

No. The 5 of 10 value is a pain-monitoring model from tendon and patellofemoral pain. Nobody tested it after surgery. `research/rehab-rules.md` section 4 says it must not be a default after MPFLR.

No MPFLR source gives a numeric pain stop for an exercise. That item is NONE. Any app pause value is an app rule or a clinician value. It is never an evidence default (`research/rehab-rules.md` section 4, `docs/clinical-limits.md`, "The safety floor").

## Facts

| Value | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| Pain at most 5 of 10 during or right after activity | "pain levels should not exceed a 5/10 on the numeric pain rating scale (NPRS) during or immediately after activity. Additionally, pain ratings should return to pre-activity levels by the following morning" | PM1 (Sprague 2021, PMC7905015), `rehab-rules.md` section 4 | STUDY (pilot RCT) | VERIFIED for the PM1 text. The Thomee 1997 primary is abstract only, so the 5 of 10 value is second-hand | BORROWED (patellar tendinopathy, patellofemoral pain origin). Not post-operative |
| Pain-monitoring model did not harm in a trial | "No negative effects could be demonstrated from continuing Achilles tendon-loading activity ... with the use of a pain-monitoring model" | N25 (Silbernagel 2007, 38 patients) | STUDY (RCT) | VERIFIED-ABSTRACT. The 5 of 10 limit is not in the abstract (`source-audit.md` N25). Audit row V58 is EXACT | BORROWED (Achilles tendon) |
| Painful exercise is not harmful in chronic pain | Effect "-0.27 (-0.54 to -0.05) in favour of painful exercises" | SM1 (Smith 2017) | REVIEW | VERIFIED (abstract) | BORROWED (chronic musculoskeletal pain). Does not transfer to a healing graft |
| Pain at most 2 of 10 | "Pain ≤ 2out of 10 on NRS or little to no indication of pain with other scales during ambulation" | P2 Table 2 (Cincinnati Guideline 46, January 2015), audit row V52 | OPINION in substance (guideline level 5, CONSENSUS low). P2 is older than 5 years | VERIFIED | ISO and ADOL (ages 8 to 25, no realignment). It is a phase goal for walking and daily tasks. It is not a stop rule (audit section 4.4) |
| Notify the physician | P2 rec 4 red flags: "Unchanging or increased irritability in the knee", "Persistent or recurrent effusion" | P2 page 4, audit V55 and V56 | OPINION in substance (effusion item carries a lesser 1b grade, C18) | VERIFIED | ISO and ADOL |

## Disagreements

- The borrowed 5 of 10 model and the P2 goal of 2 of 10 give different numbers. They answer different questions. The first is a monitoring limit for activity in tendon pain. The second is a goal for walking after surgery.
- The conservative value is the lower one. This is not a recommendation of 2 as a stop rule. The audit marks 2 of 10 as NOT SUPPORTED as a session stop rule or exercise pain limit (`citation-audit.md` section 4.4).
- The current app safety floor (FR12 in `MPFL_APP_PLAN.md`) pauses at pain 7 or more. It is an app rule, and the value 7 is a PROPOSAL. A protocol can set a lower threshold, for example 5. A clinician must review it.

## What the app can do

- Keep the pain stop as a field that a clinician sets in the protocol. The knowledge base value can appear only as a reference range for the clinician, labelled BORROWED. This follows `citation-audit.md` section 6, condition 1.
- If you want 5 as a value, mark it PROPOSAL. Use the wording "borrowed from a tendon pain model, not tested after MPFL surgery". A clinician must review it before any patient use.
- Do not call 5 of 10 an evidence-based or guideline default in code, in screen text or in the plan.
- The red-flag referral stays in place. Surgeon decision 14 in `docs/clinical-limits.md` ("Pain and swelling thresholds that pause the program") stays "ask your surgeon" when the protocol does not set it.
- The app never changes the phase and never picks a limit for a patient.

## Ask your surgeon

- At what pain level must a session stop?
- At what pain level must I contact the care team?
- What swelling level pauses the program?

## Gaps

- NONE: a numeric pain stop during exercise after MPFLR. No source read gives it. The literature gives only the borrowed Thomee model (PM1, N25, SM1) and the P2 goal of 2 of 10 for walking.
- NONE: any test of the 5 of 10 model after MPFL surgery or any ligament surgery.
- Second-hand: the 5 of 10 value comes from PM1, not from the Thomee 1997 primary.
- Not in the knowledge base: whether pain stops should differ by phase or by age. A clinician or a trial in this population can answer it.
