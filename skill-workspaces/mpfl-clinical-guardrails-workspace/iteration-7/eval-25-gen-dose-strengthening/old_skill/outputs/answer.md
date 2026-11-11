I will add the dose line to each strengthening exercise. I will not add a fixed dose for everyone. I refuse that part.

Why. In this app a clinician sets every clinical number in a protocol field. The app must show a surgeon decision as "ask your surgeon" when the protocol does not set it, and it must not set a default (`research/clinical.md` section 9, `research/rehab-rules.md` section 3).

The only source for a dose is P2, rec 26 (`research/rehab-rules.md` section 3). It says "2 sets of 10-15 repetitions", with progression to 3 sets. P2 is VERIFIED, but it is a level 5 guideline, mark CONSENSUS (low). It covers lateral patellar dislocation care for ages 8 to 25 and excludes realignment surgery. It is not an MPFL reconstruction rule. So it is a PROPOSAL, not an app rule. Frequency and tempo have no source (mark NONE).

What I will do:
1. Add optional protocol fields for each strengthening exercise: `sets` and `reps`. A clinician fills them in. Nothing is pre-filled.
2. The generator prints the dose only when both fields are set by the protocol.
3. If a field is empty, the generator prints the text below.
4. I will not add a dose for frequency, tempo or load. I will not add any text that rates the dose or says the person reached it.
5. I will run `bash app/scripts/claims-check.sh app/src` after the change.

Exact plan text when the protocol sets the dose (N and M come from the protocol):

    Sets and reps: N sets of M reps. Your care team set this.

Exact plan text when the protocol does not set the dose:

    Sets and reps: ask your surgeon.

Optional, for you to decide: the clinician editor can show the P2 range as a hint next to the empty field. The hint text is "Reference only, from a guideline for a different surgery (P2): 2 sets of 10 to 15 reps, up to 3 sets. Not a default." The app never copies this into the plan by itself.

Example data keeps the banner "EXAMPLE, NOT APPROVED". Without `PATIENT_USE_APPROVED`, every screen reads "Prototype. Not for patient use."
