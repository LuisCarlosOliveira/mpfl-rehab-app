// The questionnaire model of "Create my plan". It holds the order of the questions, the check that a question is
// answered, the early referral and the conversion to the inputs of the generator. It has no screen code.
// One question for each screen. The referral questions come first, so the app takes the least data before a refusal.

import { generateProtocol, RULES, type GenerateResult, type GeneratorInputs } from './protocolGen';
import { weeksSince } from './planView';

export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type StepId =
  | 'writtenPlan' | 'procedure' | 'ageBand' | 'bothKnees' | 'firstSurgery' | 'specialRules'
  | 'surgeryDate' | 'side' | 'limit' | 'redFlags' | 'today' | 'clearance' | 'summary';

export interface Answers {
  writtenPlan: YesNoUnknown | null;
  procedure: GeneratorInputs['procedure'] | null;
  ageBand: GeneratorInputs['ageBand'] | null;
  bothKnees: boolean | null;
  firstSurgery: YesNoUnknown | null;
  specialRules: YesNoUnknown | null;
  surgeryDate: string;
  side: GeneratorInputs['side'] | null;
  limitKind: GeneratorInputs['surgeonLimit']['kind'] | null;
  /** The text of the number field. It is checked when the person goes on. */
  limitDegrees: string;
  redFlags: Record<string, boolean>;
  pain: number | null;
  swelling: GeneratorInputs['swelling'] | null;
  phaseClearance: YesNoUnknown | null;
}

export const emptyAnswers = (): Answers => ({
  writtenPlan: null, procedure: null, ageBand: null, bothKnees: null, firstSurgery: null, specialRules: null,
  surgeryDate: '', side: null, limitKind: null, limitDegrees: '', redFlags: {}, pain: null, swelling: null, phaseClearance: null,
});

const BEFORE_DATE: StepId[] = ['writtenPlan', 'procedure', 'ageBand', 'bothKnees', 'firstSurgery', 'specialRules', 'surgeryDate', 'side', 'limit', 'redFlags', 'today'];

/** The weeks since surgery, or null when the date is empty, not real or in the future. */
const weeksOf = (a: Answers, today: string) => weeksSince(a.surgeryDate, today);

/** The clearance question runs from the first week of phase 2. Before that week the answer is no. */
export const clearanceAsked = (a: Answers, today: string): boolean => {
  const w = weeksOf(a, today);
  return w !== null && w >= RULES.PH2.values.firstWeek;
};

export function stepsFor(a: Answers, today: string): StepId[] {
  return [...BEFORE_DATE, ...(clearanceAsked(a, today) ? (['clearance'] as const) : []), 'summary'];
}

/** The number of the limit field, or null when the text is not a number from 0 to 180. */
export function limitNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 180 ? n : null;
}

export function answered(step: StepId, a: Answers): boolean {
  switch (step) {
    case 'writtenPlan': return a.writtenPlan !== null;
    case 'procedure': return a.procedure !== null;
    case 'ageBand': return a.ageBand !== null;
    case 'bothKnees': return a.bothKnees !== null;
    case 'firstSurgery': return a.firstSurgery !== null;
    case 'specialRules': return a.specialRules !== null;
    case 'surgeryDate': return weeksSince(a.surgeryDate, '9999-12-31') !== null;
    case 'side': return a.side !== null;
    case 'limit': return a.limitKind === 'degrees' ? limitNumber(a.limitDegrees) !== null : a.limitKind !== null;
    case 'redFlags': return true; // no tick is a valid answer
    case 'today': return a.pain !== null && a.swelling !== null;
    case 'clearance': return a.phaseClearance !== null;
    case 'summary': return true;
  }
}

/** The inputs of the generator, or null when an answer is missing. */
export function toInputs(a: Answers, today: string): GeneratorInputs | null {
  if (
    a.writtenPlan === null || a.procedure === null || a.ageBand === null || a.bothKnees === null || a.firstSurgery === null ||
    a.specialRules === null || a.side === null || a.limitKind === null || a.pain === null || a.swelling === null
  ) return null;
  const degrees = limitNumber(a.limitDegrees);
  if (a.limitKind === 'degrees' && degrees === null) return null;
  const asked = clearanceAsked(a, today);
  if (asked && a.phaseClearance === null) return null;
  return {
    writtenPlan: a.writtenPlan,
    procedure: a.procedure,
    ageBand: a.ageBand,
    bothKnees: a.bothKnees,
    firstSurgery: a.firstSurgery,
    specialRules: a.specialRules,
    surgeryDate: a.surgeryDate === '' ? null : a.surgeryDate,
    side: a.side,
    surgeonLimit: a.limitKind === 'degrees' ? { kind: 'degrees', degrees: degrees as number } : { kind: a.limitKind },
    phaseClearance: asked ? (a.phaseClearance as YesNoUnknown) : 'no',
    redFlags: Object.fromEntries(Object.entries(a.redFlags).filter(([, v]) => v)),
    pain: a.pain,
    swelling: a.swelling,
  };
}

export function fromInputs(i: GeneratorInputs): Answers {
  return {
    writtenPlan: i.writtenPlan,
    procedure: i.procedure,
    ageBand: i.ageBand,
    bothKnees: i.bothKnees,
    firstSurgery: i.firstSurgery,
    specialRules: i.specialRules,
    surgeryDate: i.surgeryDate ?? '',
    side: i.side,
    limitKind: i.surgeonLimit.kind,
    limitDegrees: i.surgeonLimit.kind === 'degrees' ? String(i.surgeonLimit.degrees) : '',
    redFlags: { ...i.redFlags },
    pain: i.pain,
    swelling: i.swelling,
    phaseClearance: i.phaseClearance,
  };
}

const REFERRAL_QUESTIONS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];

/**
 * A referral that the first six answers already decide. The generator makes the text. The other answers get values
 * that cause no referral, so only these six can speak. The person sees the refusal at once and gives no more data.
 */
export function earlyReferral(a: Answers, today: string): Extract<GenerateResult, { kind: 'referral' }> | null {
  const probe: GeneratorInputs = {
    writtenPlan: a.writtenPlan ?? 'no',
    procedure: a.procedure ?? 'mpflr-only',
    ageBand: a.ageBand ?? '18-plus',
    bothKnees: a.bothKnees ?? false,
    firstSurgery: a.firstSurgery ?? 'yes',
    specialRules: a.specialRules ?? 'no',
    surgeryDate: today,
    side: 'left',
    surgeonLimit: { kind: 'unknown' },
    phaseClearance: 'no',
    redFlags: {},
    pain: 0,
    swelling: 'none',
  };
  const r = generateProtocol(probe, today);
  return r.kind === 'referral' && REFERRAL_QUESTIONS.includes(r.reason) ? r : null;
}
