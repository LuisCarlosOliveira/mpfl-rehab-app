// The "Contact your care team" card (adaptation design 5.4, rule B1).
// A referral and not a verdict. Source: P2 rec 4 "Unchanging or increased irritability", "Persistent or recurrent
// effusion", "Catching, locking" (OPINION, safe as a referral). One event is enough. The app counts nothing.
// The card reads the last saved session only. The app sets no pain value of its own: it uses the FR12 rule and the clinician threshold.
import { evaluateSession } from './safety';
import type { SessionData } from './storage';

export const CONTACT_TITLE = 'Contact your care team';

export interface ContactReason {
  kind: 'gave-way' | 'pain' | 'swelling';
  text: string;
}

export function contactReason(session: SessionData, painPauseThreshold: number | undefined): ContactReason | null {
  const day = session.date.slice(0, 10);
  if (session.gaveWayPresses > 0) return { kind: 'gave-way', text: `On ${day} you pressed "Knee gave way or hurts".` };

  const end = evaluateSession({ pain: session.pain ?? 0, swelling: 'none', painPauseThreshold });
  const answers = (session.setPain ?? []).filter((v): v is number => v !== null);
  const between = answers.some((pain) => evaluateSession({ pain, swelling: 'none', painPauseThreshold }).reasons.includes('pain'));
  if (end.reasons.includes('pain') || between) {
    const value = end.reasons.includes('pain') ? session.pain : Math.max(...answers);
    return { kind: 'pain', text: `On ${day} you reported pain ${value} out of 10.` };
  }
  if (session.swelling === 'more') return { kind: 'swelling', text: `On ${day} you reported swelling: more than before.` };
  return null;
}
