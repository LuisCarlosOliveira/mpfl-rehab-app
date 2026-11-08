No rehab rules apply after revision MPFLR (MPFLR means MPFL reconstruction). The project knowledge base has no source for them.

What the sources say:
- `research/rehab-rules.md`, section 8, row "Revision MPFLR": the mark is NONE. No rehab source for revision surgery was found. The HSS-type guideline P2 lists "revision" in its target population. It gives no separate rule for it.
- `research/clinical.md`, item 13 of the list of unsupported decisions: changes for skeletal immaturity, bilateral surgery, revision surgery or high-risk anatomy have no source.

What the app does:
- Intake question I5 asks "Is this your first MPFL surgery on this knee?" The answers "No" and "I do not know" trigger referral R5 (`docs/protocol-generator-design.md`).
- The referral text is: "The app makes plans only after a first MPFL surgery on this knee. Contact your care team for your plan."
- The generator refuses repeat surgery (`docs/adaptation-and-live-form-design.md`). The plan lists repeat surgery among the referral cases (`MPFL_APP_PLAN.md`, section 1.5).
- The app gives no plan, no phases and no limits for a revision.

What to do as a patient:
- Follow the written protocol of your surgeon and your care team. Do not use the standard isolated-MPFLR rules for a revision.
- Ask them about weight-bearing, brace use, range of motion and return to sport. The knowledge base gives no rule for a revision on any of these.

The app is a prototype and not a medical device. This answer is not medical advice.
