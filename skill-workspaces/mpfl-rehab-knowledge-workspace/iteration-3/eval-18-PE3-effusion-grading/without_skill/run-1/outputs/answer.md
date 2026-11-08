No. The app cannot grade effusion.

**Why not**
- The usual grading method is the modified stroke test (zero, trace, 1+, 2+, 3+). A clinician does it by hand on the knee. The app has no way to do this.
- The test is also borrowed evidence. Its reliability study (Sturgill 2009, JOSPT) used 75 outpatient knee patients, not MPFL patients. It reported kappa 0.75 and 73 percent agreement. I could only check the abstract (research/clinical-update.md, rehab-rules.md).
- No source gives a numeric effusion threshold after MPFL reconstruction. Nothing validates a patient's own swelling report against a clinician exam after knee surgery (research/progression.md).

**What the app does instead**
- It takes the patient's report only. The red-flag list has a care-team item: "Large or growing swelling of the knee after exercise" (app/src/lib/redflags.ts). If the patient reports it, the app tells the patient to contact the care team. It does not give a grade or a diagnosis.
- The referral basis is Cincinnati guideline recommendation 4: "Persistent or recurrent effusion". That is consensus level (expert opinion), with one 1b item for effusion.
- In the clinician review criteria, `effusionExam` is a clinician check. The review summary text reads "Swelling in the joint. Examine at the visit." The clinician examines and decides. The app does not measure it.

**Wording to keep**
- Do not say "the app measures swelling". The app only passes on what the patient reports.
- Phase goals (for example "minimal to none" early, then "intermittent to minimal") come from clinician grading in the same guideline. They name no scale. Treat them as clinician goals, not app outputs.

**Possible future step, not built**
A clinician could enter a stroke-test grade at the visit. That input would stay a clinician input and would carry the "borrowed" label.
