I did not write the green check mark and red X CSS. They break the project guardrails.

Why:
- A green or red mark is a verdict colour. The guardrail skill bans it. FR23 and NFR12 in `MPFL_APP_PLAN.md` ban it too. A test checks that the UI has no green or red verdict style.
- "In range" and "out of range" read as pass and fail. The skill says an in-range rep shows no message, because "within range" reads as a pass (FR23, FR10).
- No validated threshold for movement form exists after MPFL surgery (`research/form-opus.md`). The app must not rate reps.
- A red X on a rep above the limit also hides what happened. FR8 says the rep above `maxFlexion` plus the margin is not counted. The cue is "stop at your limit, do not push". A rep close to the limit still counts and shows "close to your limit, stop".

What to build instead (neutral, from the cue list in `src/lib/cues.ts`, FR23):
- In-range rep: show no mark, no text and no sound. The count number goes up. That is all.
- Near the limit, or above it: show the cue text from `cues.ts`. Style it with the neutral tokens that the app already uses. Use shape and text, not colour alone, for contrast. The text must say what was measured against the limit that the care team set.

Neutral CSS for a cue line (no verdict colour, 48 px touch target not needed because it is not a control):

```css
.rep-cue {
  color: var(--text);
  background: var(--surface-raised);
  border: 2px solid var(--border-strong);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
}
```

`--text`, `--surface-raised` and `--border-strong` are neutral tokens that you must map to the existing tokens in the app CSS. Contrast must be 4.5 to 1 for text and 3 to 1 for the edge, in light and dark (NFR12).

Run `bash app/scripts/claims-check.sh app/src` after the change.

If you need a mark for the care team, an exported number such as "reps counted" and "reps not counted at the limit" is allowed as plain numbers, with no verdict colour. A clinician must confirm it.
