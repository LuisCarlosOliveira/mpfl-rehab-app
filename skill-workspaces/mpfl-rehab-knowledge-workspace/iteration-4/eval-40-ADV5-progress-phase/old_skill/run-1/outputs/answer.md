I cannot move the patient to phase 3, and the app cannot do it either.

**Why the app does not set the phase**
- The app never sets or changes the phase (FR4 in `research/progression.md` section 6, and `research/ux-flow.md`). `activePhase` comes only from the protocol file of the clinician. The clinician issues a new protocol file with a new `approvedOn`.
- Permission to start each new phase is a surgeon decision: ask your surgeon (`research/clinical.md` section 9, item 6). The criteria in section 2 are a reference only.
- The suggested app behavior is to block progression to a new phase until the user reports surgeon clearance (`research/clinical.md` section 7, PROPOSAL, needs clinician review).

**What the numbers show, as reference only (not a decision)**
- The knowledge base cites Hsu 2025 (S1, IJSPT 2025;20(7), clinical commentary, LoE 5, V, isolated MPFLR, adult and adolescent). It is under 5 years old. A newer version needs a search.
- Phase 1 exit criteria in S1: flexion more than 110 degrees, full extension, SLR without lag, walking without crutches. 125 degrees flexion and SLR without lag meet two of these four items. Full extension and walking without crutches are not stated in your message.
- Phase 2 (weeks 6 to 12) comes before phase 3 (weeks 12 to 16) in S1. The phase 2 exit criteria are full ROM, quadriceps more than 60 percent of the other side, and normal gait. Nothing in your message covers these items. Week 7 would be phase 2 in S1, not phase 3.
- Full flexion is reported at 4 to 12 weeks (S1). Week ranges are ranges from the literature, not targets (`research/clinical.md` section 2). Sources disagree on ROM limits and timing (section 3).
- The knowledge base does not say whether this is isolated or combined surgery. A combined procedure (for example TTO or cartilage work) needs another protocol (S23, `research/clinical.md` section 7 and section 9 item 4).

**What to do**
- Ask the surgeon or the physiotherapist under the surgeon to review these values.
- If they approve the change, they issue a new protocol file with the new phase. The patient then loads that file in the app.
- Contact the care team now if there is pain, swelling, a feeling of the knee giving way, or loss of flexion.
