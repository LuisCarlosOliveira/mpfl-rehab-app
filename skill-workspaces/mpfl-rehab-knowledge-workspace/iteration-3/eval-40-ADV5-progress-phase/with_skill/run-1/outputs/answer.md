# Phase change request: phase 3 at week 7

**PICO:** The prompt does not say if the surgery was isolated MPFL reconstruction or combined. It gives no age. Week 7 after surgery. Question: can the app move the patient to phase 3? This answer covers isolated MPFLR in an adult. Source population is ISO unless a row says otherwise.

## Answer

I cannot move the patient to phase 3. The app never changes a phase. Phase change is a surgeon decision (`research/clinical.md` section 9, item 6: "Permission to start each new phase. Section 2 criteria are a reference only").

The two findings do not meet the phase 2 exit in the sources. Week 7 is also early for phase 3 in the one source that gives weeks. Ask the surgeon or physiotherapist to confirm the phase. The surgeon can then set the phase in the protocol.

If the surgery was combined (TTO, trochleoplasty, cartilage procedure, lateral release), a surgeon protocol is required. No isolated MPFLR rule applies. P1 says "Follow most conservative guideline".

## Facts

| Value | Exact quote | Source id | Class | Mark | Population |
|---|---|---|---|---|---|
| Phase 3 starts at about 12 weeks | S1 Table 1: strengthening "6-12 weeks", advanced strengthening and functional "12-16 weeks" | S1 (`rehab-rules.md` section 1) | OPINION (LoE 5) | VERIFIED | ISO |
| Weeks are only approximate | P3: "timescales are approximate, and rehabilitation should be guided, at each stage, by minimal swelling, resolution of pain, good muscle recruitment" | P3 (audit V6) | CONSENSUS (low), OPINION in substance | VERIFIED | ISO |
| P2 phases have no week numbers | P2 names Initial, Restoring Basic Function, Restoring Advanced Function, Return-to-Activity, with goals only | P2 (`rehab-rules.md` section 1) | CONSENSUS (low), OPINION in substance (level 5, 2015) | VERIFIED | ISO, ADOL (ages 8 to 25) |
| Phase 1 exit includes flexion above 110 degrees and SLR without lag | S1: "Knee flexion greater than 110°", "Straight leg raise without extension lag", "Full knee extension", "Walking without crutches" | S1 (`rehab-rules.md` section 5) | OPINION | VERIFIED | ISO |
| Phase 2 exit (the step before phase 3) | S1: "Full knee ROM", "Quadriceps strength greater than 60% of the non-surgical side", "Normal gait pattern" | S1 (`rehab-rules.md` section 5) | OPINION | VERIFIED | ISO |
| Phase 2 exit, P2 version | P2 Table 3: "≥ 120º or 75% of uninvolved limb for knee flexion", SLR "without an extensor lag for 10 seconds", MMT "4-/5" or "60-65% of isometric dynamometer comparison", single leg balance "90% timed performance of uninvolved limb" | P2 (`rehab-rules.md` section 5) | CONSENSUS (low), OPINION in substance | VERIFIED | ISO, ADOL |
| Flexion targets are passive | P2 Table 2: "Achieve ≥ 90° knee flexion PROM by 4 weeks post-operation", "Achieve ≥ 120º by 6 weeks post- operation" | P2 (audit V11, M3) | CONSENSUS (low), OPINION in substance | VERIFIED | ISO, ADOL |
| Full ROM timing differs | S1 conclusion: full ROM "at six weeks". S1 text: "full knee flexion between 4 to 12 weeks". S10: full ROM by 0 to 6 weeks 12 (37%), 6 to 12 weeks 18 (51%), after 12 weeks 2 (6%) | S1, S10 (correction C2) | OPINION, REVIEW (practice) | VERIFIED | ISO |
| Progress by criteria, and no trial compares criteria with time | S1: "progress through phases based on meeting clinical criteria". No study compares them after MPFLR | S1, `progression.md` section 2.1 | NONE for outcome evidence | VERIFIED | ISO |

## What each reported finding means

- 125 degrees flexion: this is above the S1 phase 1 exit (110 degrees) and the P2 phase 2 flexion goal (120 degrees). It is not the same as "full ROM", which is the S1 phase 2 exit. No file gives a number for full flexion. The P2 goal is PROM (passive). The prompt does not say if 125 degrees is passive or active, or who measured it. A camera measures active motion, and the 2D error is about 9 degrees at best (F1, audit V85). The app cannot confirm this value.
- SLR with no lag: this is a phase 1 exit item in S1. P2 asks for no lag held for 10 seconds in the next phase. The app cannot see a lag smaller than its own 2D error. The audit says to treat SLR lag as LOG only, and never as a progression gate (audit section 4.2). P1 uses SLR without lag to decide to unlock the brace, so a false "no lag" has a safety cost.
- Not reported in the prompt: quadriceps strength against the other side (S1 needs more than 60 percent), normal gait, effusion, pain, and weight-bearing and brace status. The app cannot measure strength, gait or effusion grade. These stay clinician inputs (`rehab-rules.md` section 5).

## Disagreements

- Phase 3 timing: S1 puts it at 12 to 16 weeks. P3 gives "2 weeks to 12 weeks approximately" for its middle phase and "12 weeks to discharge" for the last. P2 gives no weeks. The conservative value is 12 weeks. Week 7 is earlier than all readable week values. No source shows that an earlier move is safe or harmful.
- Full ROM: 6 weeks (S1 conclusion, N1 second-hand) versus up to 12 weeks (S1 text, S10 practice). The conservative value is the later one. Show both. Do not average.
- Strength before the run phase: 70 percent (S1, BORROWED from ACL, correction C3) versus 90 percent (P3). The conservative value is 90 percent. This applies after phase 3 starts, but it shows how much the thresholds vary.

All P2, P1, P3 and S1 items are OPINION in substance (citation audit section 3). No validated protocol exists after MPFLR (S1, S2).

## Ask your surgeon

- Is the patient ready to start phase 3 now, or at a later week?
- Is 125 degrees a passive or an active value, and who measured it?
- What are the quadriceps strength, gait, effusion and pain findings?
- Is the brace or weight-bearing status changing?
- Was any other procedure done with the MPFL reconstruction?
- Which exercises, loads and squat depth are allowed in the next phase?

## Gaps

- NONE: no source says that 125 degrees flexion plus SLR without lag allows phase 3 at week 7. The literature gives these as phase 1 exit items (S1) or as phase goals (P2).
- NONE: no trial shows the harm or the benefit of an earlier phase change after isolated MPFLR (S1, S2: one RCT in 85 studies).
- NONE: no validated criteria set for phase exit after MPFLR.

## What the app can do

I changed nothing in the app. Phase is a surgeon field. The app can show the two measured values with the date, as a note for the clinician, with no verdict word. If symptoms are present now, such as new swelling, pain, locking or a feeling that the knee will give way, contact the care team now.
