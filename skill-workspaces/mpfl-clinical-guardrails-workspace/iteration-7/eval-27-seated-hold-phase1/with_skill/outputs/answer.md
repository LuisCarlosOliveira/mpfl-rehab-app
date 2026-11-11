I will not add the seated knee extension hold to phase 1. I made no change to the plan generator.

Reason:
- The hold asks for active open-chain extension to 0 degrees.
- Two guidelines say to avoid this in the first phase. P2 recommendation 29 says these exercises "are avoided to minimize stress to the reconstructed medial patellofemoral ligament". P1 phase 1 says "Do not perform AROM open chain KE, unless cleared by surgeon".
- The evidence is in `research/rehab-rules.md` section 2. It is CONSENSUS (low), level 5. The rule is still the same in both guidelines.
- The clinical guardrails say: do not offer the hold in phase 1 unless the surgeon enables it. The generator can add it only in phase 2, and only after the person reports that the surgeon cleared it.

What I can do instead:
1. Add the hold in phase 2 only. It needs a surgeon clearance answer first. The arc end is the one of P1 (40 degrees). The plan sets no hold time.
2. Add a phase 1 option that the surgeon must enable. The app shows it as "ask your surgeon" and sets no default.

Plan text for the phase 1 screen, if you want a note there:

"Seated knee extension hold: not in this phase. Ask your surgeon. Not approved by a clinician."

I add nothing to the plan until you choose one of these options. The phase stays set only by the protocol field `activePhase`.
