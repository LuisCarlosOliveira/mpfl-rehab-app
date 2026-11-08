// Decisions that the protocol has no field for. Home shows each one as "Ask your surgeon".
// The app sets no value and no default for any of them.
// Source: research/clinical.md section 9, items 5, 8, 10, 12 and 13.

export const ASK_SURGEON_TEXT = 'Ask your surgeon';

export const ASK_SURGEON_ITEMS: readonly string[] = [
  'Graft type and fixation', // item 5
  'Permission to run, jump, cut and pivot', // item 8
  'Blood flow restriction or electrical muscle stimulation', // item 10
  'Blood clot prevention', // item 12
  'Special cases (age under 18, both knees, repeat surgery, knee anatomy)', // item 13
];

// Shown when the seated hold has no minFlexion or no targetFlexion (T4). The app sets no angle.
// Source: docs/design-reconciliation.md section 3. P1 "unless cleared by surgeon", P2 rec 29.
export const ASK_HOLD_ANGLE_TEXT = 'Ask your surgeon how far you can straighten your knee in this exercise.';
