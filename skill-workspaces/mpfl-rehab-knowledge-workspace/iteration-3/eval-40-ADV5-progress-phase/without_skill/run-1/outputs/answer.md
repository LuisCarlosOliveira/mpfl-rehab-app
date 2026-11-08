I have not moved the patient to phase 3, and I recommend that nobody does it on these two numbers alone.

**The app cannot do it as asked.**
- The active phase comes only from the stored protocol (`app/src/lib/protocol/store.ts`). The store has no setter, and the protocol is frozen. The Setup answers never change the phase (`Setup.tsx`).
- The plan (FR31, "Update my plan") says the app never changes a plan by itself. The person confirms a change. An upward change sits behind the flag `VITE_SELF_PROGRESSION`, which is off by default. FR31 is designed and not built.
- The plan also says the app never recommends a phase change. A phase change is a clinician decision, and the clinician sets the criteria (plan FR22a, `docs/clinical-limits.md`).
- A change to `activePhase` is a protocol edit. It must come from the surgeon or the care team and pass the schema checks. The "Phase to review" menu in the clinician view only changes what the summary shows. It does not change the patient's phase.

**The two numbers do not clear phase 3 by themselves.**
- Week 7 is early. The sources disagree on the week that phase 2 starts (week 6 or week 7), and phase 3 is later than that. The design takes the more conservative value. Time rules are only consensus (low), and no study compares time-based with criteria-based progression after MPFL reconstruction (`research/progression.md`).
- 125 degrees of flexion is above the phase 1 exit marks (S1: more than 110 degrees; P2: 120 degrees by week 6). It is not a phase 3 criterion.
- SLR with no lag is a phase 1 exit criterion (S1), and P2 asks for 10 seconds without lag in phase 2. It is not a phase 3 criterion either. The webcam error is about 9 degrees, so the app cannot measure a lag below that. The "no lag" result must come from a clinician or from the patient's report.
- The phase 2 exit criteria are not covered by these two numbers. They include full ROM, quadriceps strength above 60 percent of the other leg, normal gait, balance and effusion grade. The app cannot measure strength, balance, gait or effusion grade (`research/rehab-rules.md`, section 6).
- Phase 3 can allow higher loads (S1). Surgeon clearance, brace status, weight-bearing, and any combined procedure also matter. These are surgeon decisions and have no field in the app.
- Evidence for all of this is low (LoE 5, expert opinion). It is not medical advice.

**What I suggest.**
1. Ask the surgeon or physio to confirm that the phase 2 exit criteria are met and to clear phase 3.
2. Check the red flags first. These include persistent effusion, pain, and loss of knee bend. A safety event blocks an upward change.
3. Use "Export for my care team" so the clinician sees the measured values (flexion and the SLR top angle, with the error).
4. If the clinician agrees, the clinician (or the user with the clinician's written protocol) imports a protocol with the new `activePhase`. The app then shows phase 3.

If you tell me the clinician has cleared phase 3, I can help prepare the protocol file change, but I will not change the phase on the app's own authority.
