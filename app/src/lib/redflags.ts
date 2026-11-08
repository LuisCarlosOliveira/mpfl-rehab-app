// Red-flag list. General guidance from clinical practice.
// research/clinical.md section 7 marks every item UNVERIFIED for MPFL surgery.
// The app gives no diagnosis. It tells the user to stop and to contact help.

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
];

export const MESSAGES: Record<RedFlagGroup, string> = {
  emergency: 'Stop. Do not exercise. Call emergency services now.',
  'care-team': 'Stop. Do not exercise. Contact your care team.',
};

export interface RedFlagResult {
  blocked: boolean;
  group: RedFlagGroup | null;
  message: string;
}

/** Any "yes" blocks the session. The emergency group wins over the care-team group. */
export function evaluateRedFlags(answers: Record<string, boolean>): RedFlagResult {
  const yes = RED_FLAGS.filter((f) => answers[f.id] === true);
  const group: RedFlagGroup | null = yes.some((f) => f.group === 'emergency')
    ? 'emergency'
    : yes.length > 0
      ? 'care-team'
      : null;
  return { blocked: group !== null, group, message: group ? MESSAGES[group] : '' };
}
