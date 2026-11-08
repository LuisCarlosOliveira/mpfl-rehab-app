**PICO:** Isolated MPFL reconstruction (the case that this answer covers), any age group, any week after surgery. Question: can the app grade effusion?

**Answer**

No. The app cannot grade effusion. Grading is a clinician exam. The app only collects what the patient reports.

What the app does today (code, `app/src/ui/Summary.tsx` and `app/src/lib/safety.ts`):
- The patient answers one swelling question with three choices: "No swelling", "Some swelling", "More than before".
- The answer "More than before" pauses the session and shows "pause and contact your care team".
- This is a patient report. It is not a grade and not a measurement. The app does not use a clinical effusion scale.
- The pause rule is an app safety floor. It is a PROPOSAL and needs clinician review (`docs/clinical-limits.md`). It is not an evidence-based default.

**Facts**

| Fact | Exact quote | Source id | Class | Access | Population |
|---|---|---|---|---|---|
| A clinician can grade effusion with the modified stroke test, 5 grades. Reliability was moderate to good | "The kappa value was 0.75" and "the percent agreement was 73%" (75 patients) | N24 (Sturgill 2009, JOSPT). `research/rehab-rules.md` section 4, `research/clinical-update.md` | STUDY | VERIFIED (abstract only) | BORROWED (outpatient knee patients, not MPFLR) |
| The stroke test is a hands-on clinician test | The app cannot do it (`research/rehab-rules.md` section 4) | N24 | STUDY | VERIFIED (abstract only) | BORROWED |
| The guideline sets an effusion goal for each phase, with no scale named | Table 2: "Minimal to none". Table 3: "Intermittent to minimal". Table 4: "Resolved for all basic functional activities and minimal to intermittent following more advanced functional activities" | P2 (Cincinnati Guideline 46, January 2015). `research/rehab-rules.md` section 4. Audit row V54 EXACT | CONSENSUS, but level 5, so OPINION in substance (`research/citation-audit.md` section 3) | VERIFIED (full text) | ISO, ADOL (ages 8 to 25, no realignment). Older than 5 years |
| Referral sign: persistent or recurrent effusion | P2 rec 4: "Persistent or recurrent effusion" | P2. Audit row V55 EXACT, V56 PARAPHRASED. Correction C18 | CONSENSUS (level 5). The effusion item also cites a systematic review, Stefancin 2007 [1b], a lesser-quality review in the P2 scale | VERIFIED (full text) | ISO, ADOL |
| Avoid provoking effusion | P1: "Avoid provocation of quadriceps inhibition, joint effusion, active inflammation" | P1 (HSS guideline). Audit row V57 EXACT. `research/rehab-rules.md` section 4 | OPINION | VERIFIED (full text) | ISO |
| Effusion before running | AS1: "No effusion/trace of effusion" | AS1 (Aspetar ACL guideline). Audit row V61 EXACT | CONSENSUS | VERIFIED | BORROWED (ACL reconstruction) |
| Return to sport lists include "no effusion" | ME1: "(2) no effusion". ISAKOS 2013 list (via ME1): "No knee effusion" | ME1, IS1. Audit row V69 PARAPHRASED (the ISAKOS list has 10 rows) | OPINION (committee, second-hand) | ISAKOS primary document NOT FOUND (V94). Do not use it as a source on its own | MPFLR and patellofemoral instability |

**Disagreements and gaps**

- No source gives a numeric effusion level that pauses rehab after MPFLR. Status: NONE. The literature gives only phase goals in words (P2) and a referral item (P2 rec 4). Any pause value in the app is an app rule or a clinician value.
- No source tests a patient self-report of swelling against a clinician effusion grade after MPFLR. Status: NONE. The three-choice question is a PROPOSAL.
- P2 names no effusion scale. The stroke test (N24) is a borrowed tool and the guideline does not tell a clinician to use it.
- I did not find a validated way for a phone or a webcam to detect or grade effusion. Not in the knowledge base. A clinician exam or a validated measurement study can answer this.

**What the app can and cannot do**

- It can ask the patient about swelling, record the answer, and show it to the clinician in the review summary. The review text already says "Swelling in the joint. Examine at the visit."
- It can pause the session and show "contact your care team" when the patient reports "More than before".
- It cannot grade effusion. Effusion grade stays a clinician input. This matches the rule that the app cannot measure strength LSI, hops, Y-Balance, gait or effusion grade (`research/rehab-rules.md` section 5).
- Screen text must not say that the knee is "fine", "safe" or "improving" from the swelling answer. It can only show what the patient entered.

**Ask your surgeon**

- Which effusion grade or scale do you use, and at which visit do you grade it?
- How much swelling, and for how long, must the patient report before contacting you?
- Do you want the app swelling answer to pause the session, or to show a note only?
- Does your protocol differ because of a combined procedure (for example a bone or cartilage procedure)? Isolated MPFLR values do not apply then. A surgeon protocol is required.

If you have swelling in your own knee now, contact your care team now. If you also have signs of a blood clot, chest pain or breathlessness, call emergency services.

**Check**

Each fact has a source, a class and an access mark. The NONE items are stated. The audit changed the grade of P2 to OPINION in substance. N24 is BORROWED. The population is labeled.
