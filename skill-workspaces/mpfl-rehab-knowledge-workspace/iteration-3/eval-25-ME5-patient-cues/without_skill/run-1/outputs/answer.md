Six checks can be a patient cue. Source: `research/form-evidence.md` (verdicts CUE, LOG, NO BUILD) and `docs/adaptation-and-live-form-design.md`.

A check is a CUE only if three conditions hold. A clinician sets the limit for this patient. A guideline or review supports the clinical meaning. The 2D camera error is smaller than the distance the cue must detect (about 9 degrees best case).

Checks that can be a cue:

1. Knee bend ceiling (heel slide, mini squat, side view). Only with a clinician ceiling and the 9 degree margin. The text states the limit, not a verdict ("Close to your limit, stop." and "Stop at your limit, do not push.").
2. Knee bend target (heel slide, side view). Only when the peak is more than the margin below the clinician target. Plain statement: "Depth below your target."
3. Rep time (all exercises). Only with a clinician minimum rep time. No guideline gives a tempo. Without the clinician value it is LOG.
6. Arc end of the seated hold (side view). Only with a clinician arc (new field `minFlexion`). Arc ends of 30 to 45 degrees sit above the margin.
11. Leg not in view (all exercises). This is a setup message, not a clinical check: "Show your whole leg."
12. Pain entry between sets. Only as the app safety floor or a clinician value. It is not an evidence-based default.

Short form from `research/INDEX-v2.md`: only side-view knee angle against a clinician limit, rep time and leg visibility can be patient cues.

Checks that cannot be a cue:

- Straight leg raise lag (check 5): LOG only. The 10 degree limit sits inside the video error (9.3 to 21.9 degrees). The generator never sets `maxTopFlexion`.
- Steadiness (4), hip rise (9): NO BUILD, no source.
- Knee valgus (7): NO BUILD as a cue. Frontal 2D angles are not valid.
- Trunk lean (8): LOG only after the app measures its own error.
- Movement symmetry (10): LOG only, never shown as "LSI".
- Any form score: not supported.

An in-range rep gets no cue, so the app never reads as approval. Cues never rate the movement. The cue texts are fixed in `app/src/lib/cues.ts`. Also note that no study shows live camera cues improve outcome or safety after knee surgery, so a cue is an app behavior that needs clinician approval.
