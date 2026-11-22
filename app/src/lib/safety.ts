// The safety floor of FR12. It decides when the app tells the patient to pause.
// It is an app rule and not a clinical default. The value 7 is a PROPOSAL that a clinician
// must review. The knowledge base has no source for it. The plan states the value once, in FR12. A clinician can set a lower
// threshold in the protocol. A higher protocol value does not lift the floor.

export const PAIN_FLOOR = 7;

export const PAUSE_MESSAGE = 'Pause and contact your care team.';

export type SwellingAnswer = 'none' | 'some' | 'more';
export type PauseReason = 'pain' | 'swelling' | 'invalid-input';

export interface SessionAnswers {
  pain: number; // 0 to 10, from the patient
  swelling: SwellingAnswer;
  painPauseThreshold?: number; // from the protocol, optional
}

export interface SessionVerdict {
  pause: boolean;
  reasons: PauseReason[];
  message: string | null;
}

const validPain = (pain: number) => Number.isInteger(pain) && pain >= 0 && pain <= 10;

export function evaluateSession(answers: SessionAnswers): SessionVerdict {
  const reasons: PauseReason[] = [];
  if (!validPain(answers.pain)) {
    reasons.push('invalid-input');
  } else {
    const threshold = Math.min(PAIN_FLOOR, answers.painPauseThreshold ?? PAIN_FLOOR);
    if (answers.pain >= threshold) reasons.push('pain');
  }
  if (answers.swelling === 'more') reasons.push('swelling');
  const pause = reasons.length > 0;
  return { pause, reasons, message: pause ? PAUSE_MESSAGE : null };
}
