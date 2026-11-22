// Red-flag list. General guidance, UNVERIFIED for MPFL surgery.
// The app gives no diagnosis. It tells the user to stop and to contact help.
// Source of each item (research/clinical.md section 7, research/clinical-update.md section 2.5):
//   calf: Cincinnati Children's guideline (P2) lists signs of DVT. Consensus, evidence level 5.
//   swelling: P2 lists persistent or recurrent effusion. No numeric threshold exists.
//   catching-locking, bend-loss: P2 lists catching or locking, and loss or no progress of range of motion.
//   giving-way, kneecap-moved: recurrent instability is a known failure (S11, S5, S4). The signs are general practice.
//   infection: the rate is 1.3 percent (N11). The signs are general practice.
//   breathless-chest, foot-numb-cold: general practice. UNVERIFIED for MPFL surgery.
// Not added: "rising irritability" (P2). It has no sign that a person can answer yes or no.

export type RedFlagGroup = 'care-team' | 'emergency';

export interface RedFlag {
  id: string;
  group: RedFlagGroup;
  text: string;
}

export const GENERAL_GUIDANCE_NOTE = 'General guidance, not verified for MPFL surgery.';

export const RED_FLAGS: readonly RedFlag[] = [
  { id: 'breathless-chest', group: 'emergency', text: 'Sudden shortness of breath or chest pain.' },
  {
    id: 'kneecap-moved',
    group: 'emergency',
    text: 'Your kneecap moved out of place, or you heard a pop and cannot put weight on the leg.',
  },
  { id: 'foot-numb-cold', group: 'emergency', text: 'Your foot is numb, cold or pale, or you cannot feel a pulse in it.' },
  { id: 'calf', group: 'care-team', text: 'Pain, swelling, warmth or redness in your calf.' },
  {
    id: 'infection',
    group: 'care-team',
    text: 'Fever, spreading redness, fluid from the wound, or wound pain that grows.',
  },
  { id: 'swelling', group: 'care-team', text: 'Large or growing swelling of the knee after exercise.' },
  { id: 'giving-way', group: 'care-team', text: 'A new feeling that the knee gives way.' },
  { id: 'catching-locking', group: 'care-team', text: 'Your knee catches or locks.' },
  { id: 'bend-loss', group: 'care-team', text: 'Your knee bend is getting less, or it is not getting better.' },
];

export const MESSAGES: Record<RedFlagGroup, string> = {
  emergency: 'Stop. Do not exercise. Call emergency services now.',
  'care-team': 'Stop. Do not exercise. Contact your care team.',
};

interface RedFlagResult {
  blocked: boolean;
  group: RedFlagGroup | null;
  message: string;
}

export function evaluateRedFlags(answers: Record<string, boolean>): RedFlagResult {
  const yes = RED_FLAGS.filter((f) => answers[f.id] === true);
  const group: RedFlagGroup | null = yes.some((f) => f.group === 'emergency')
    ? 'emergency'
    : yes.length > 0
      ? 'care-team'
      : null;
  return { blocked: group !== null, group, message: group ? MESSAGES[group] : '' };
}
