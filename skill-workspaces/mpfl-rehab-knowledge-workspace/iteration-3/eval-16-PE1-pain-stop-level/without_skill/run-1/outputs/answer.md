No source gives an evidence-based pain level that stops an exercise after MPFLR. The knowledge base says this directly: no MPFLR guideline or study that the project read gives a numeric pain or swelling level that stops an exercise (research/rehab-rules.md, section 4).

What exists instead:

1. Your surgeon or physiotherapist sets the stop level. Follow their written protocol first. If they give a number, use it.

2. The app has a safety floor, and it is an app rule, not a clinical rule. If the pain entry is 7 out of 10 or more, or swelling is "more than before", the app shows "pause, contact your care team" (plan FR12, app/src/lib/safety.ts, PAIN_FLOOR = 7). The value 7 is a PROPOSAL. A clinician must review it. A protocol can set a lower threshold (for example 5), and the app then uses the lower value. A higher protocol value does not lift the floor. An invalid pain entry also pauses.

3. Other numbers in the research are not stop rules:
   - Pain at or below 2 of 10 is a phase goal after MPFLR (guideline P2). It is a target, not a stop level.
   - "Pain at most 5 of 10 during or right after activity, and back to the starting level by next morning" comes from tendinopathy and patellofemoral pain work (Thomeé model, Sprague 2021). It was never tested after surgery. Do not use it as a default after MPFLR.
   - The idea that painful exercise is harmless comes from chronic pain studies. It does not transfer to a healing graft.

4. General guidance from the guidelines: avoid painful arcs of motion, and avoid provoking joint effusion or quadriceps inhibition.

Stop and contact your care team at once for red flags, for example a calf that is painful, swollen, warm or red, fever or wound problems, a knee that gives way, or sudden shortness of breath or chest pain (call emergency services for the last one).

Short answer: there is no validated number. Stop when your surgeon's protocol says to stop. The app pauses at 7 of 10 or more (a provisional floor) or when swelling is worse. If an exercise hurts more than your protocol allows, or you are unsure, stop and ask your care team. This is not medical advice.
