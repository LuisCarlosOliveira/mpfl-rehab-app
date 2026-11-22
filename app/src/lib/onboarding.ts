import { generateProtocol, RULES, type GenerateResult, type GeneratorInputs } from './protocolGen';
import { weeksSince } from './planView';
import { generatorExtendedOn } from './mode';

export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type StepId =
  | 'writtenPlan' | 'procedure' | 'ageBand' | 'bothKnees' | 'firstSurgery' | 'specialRules'
  | 'surgeryDate' | 'side' | 'limit' | 'redFlags' | 'today' | 'clearance' | 'walking' | 'legRaise' | 'seatedHold' | 'summary';

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
  limitDegrees: string;
  redFlags: Record<string, boolean>;
  pain: number | null;
  swelling: GeneratorInputs['swelling'] | null;
  phaseClearance: YesNoUnknown | null;
  walksWithoutCrutches: YesNoUnknown | null;
  legRaiseStraight: YesNoUnknown | null;
  seatedHoldCleared: YesNoUnknown | null;
}

export const emptyAnswers = (): Answers => ({
  writtenPlan: null, procedure: null, ageBand: null, bothKnees: null, firstSurgery: null, specialRules: null,
  surgeryDate: '', side: null, limitKind: null, limitDegrees: '', redFlags: {}, pain: null, swelling: null, phaseClearance: null,
  walksWithoutCrutches: null, legRaiseStraight: null, seatedHoldCleared: null,
});

const BEFORE_DATE: StepId[] = ['writtenPlan', 'procedure', 'ageBand', 'bothKnees', 'firstSurgery', 'specialRules', 'surgeryDate', 'side', 'limit', 'redFlags', 'today'];

const weeksOf = (a: Answers, today: string) => weeksSince(a.surgeryDate, today);

export const clearanceAsked = (a: Answers, today: string): boolean => {
  const w = weeksOf(a, today);
  return w !== null && w >= RULES.PH2.values.firstWeek;
};

export const gatesAsked = (a: Answers, today: string): boolean => generatorExtendedOn() && clearanceAsked(a, today) && a.phaseClearance === 'yes';

export function stepsFor(a: Answers, today: string): StepId[] {
  return [
    ...BEFORE_DATE,
    ...(clearanceAsked(a, today) ? (['clearance'] as const) : []),
    ...(gatesAsked(a, today) ? (['walking', 'legRaise', 'seatedHold'] as const) : []),
    'summary',
  ];
}

export type GroupId = 'about' | 'surgeon' | 'today';
export const GROUP_IDS: readonly GroupId[] = ['about', 'surgeon', 'today'];
const GROUP_OF: Record<Exclude<StepId, 'summary'>, GroupId> = {
  writtenPlan: 'about', procedure: 'about', ageBand: 'about', bothKnees: 'about', firstSurgery: 'about', specialRules: 'about',
  surgeryDate: 'surgeon', side: 'surgeon', limit: 'surgeon',
  redFlags: 'today', today: 'today', clearance: 'today', walking: 'today', legRaise: 'today', seatedHold: 'today',
};
export const groupOf = (step: Exclude<StepId, 'summary'>): GroupId => GROUP_OF[step];
export const groupSteps = (group: GroupId, a: Answers, today: string): Exclude<StepId, 'summary'>[] =>
  stepsFor(a, today).filter((s): s is Exclude<StepId, 'summary'> => s !== 'summary' && GROUP_OF[s] === group);

export function limitNumber(text: string): number | null {
  if (text.trim() === '' || !/^\s*-?\d+\s*$/.test(text)) return null;
  const n = Number(text);
  return n >= 0 && n <= 180 ? n : null;
}

export function limitProblem(text: string): string | null {
  return text.trim() === '' || limitNumber(text) !== null ? null : 'Enter a whole number of degrees from 0 to 180.';
}

export function surgeryDateFromParts(day: string, month: string, year: string, today: string): { iso: string | null; problem: string | null } {
  const [d, m, y] = [day.trim(), month.trim(), year.trim()];
  if (d === '' || m === '' || y === '') return { iso: null, problem: null };
  const real = { iso: null, problem: 'Enter a real date' };
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(y)) return real;
  const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  if (weeksSince(iso, '9999-12-31') === null) return real;
  return weeksSince(iso, today) === null ? { iso: null, problem: 'The date cannot be in the future' } : { iso, problem: null };
}

export function answered(step: StepId, a: Answers, today?: string): boolean {
  switch (step) {
    case 'writtenPlan': return a.writtenPlan !== null;
    case 'procedure': return a.procedure !== null;
    case 'ageBand': return a.ageBand !== null;
    case 'bothKnees': return a.bothKnees !== null;
    case 'firstSurgery': return a.firstSurgery !== null;
    case 'specialRules': return a.specialRules !== null;
    case 'surgeryDate': return weeksSince(a.surgeryDate, today ?? '9999-12-31') !== null;
    case 'side': return a.side !== null;
    case 'limit': return a.limitKind === 'degrees' ? limitNumber(a.limitDegrees) !== null : a.limitKind !== null;
    case 'redFlags': return true; // no tick is a valid answer
    case 'today': return a.pain !== null && a.swelling !== null;
    case 'clearance': return a.phaseClearance !== null;
    case 'walking': return a.walksWithoutCrutches !== null;
    case 'legRaise': return a.legRaiseStraight !== null;
    case 'seatedHold': return a.seatedHoldCleared !== null;
    case 'summary': return true;
  }
}

export const groupAnswered = (group: GroupId, a: Answers, today: string): boolean => groupSteps(group, a, today).every((s) => answered(s, a, today));

export function toInputs(a: Answers, today: string): GeneratorInputs | null {
  if (
    a.writtenPlan === null || a.procedure === null || a.ageBand === null || a.bothKnees === null || a.firstSurgery === null ||
    a.specialRules === null || a.side === null || a.limitKind === null || a.pain === null || a.swelling === null
  ) return null;
  const degrees = limitNumber(a.limitDegrees);
  if (a.limitKind === 'degrees' && degrees === null) return null;
  const asked = clearanceAsked(a, today);
  if (asked && a.phaseClearance === null) return null;
  const gates = gatesAsked(a, today);
  if (gates && (a.walksWithoutCrutches === null || a.legRaiseStraight === null || a.seatedHoldCleared === null)) return null;
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
    walksWithoutCrutches: gates ? (a.walksWithoutCrutches as YesNoUnknown) : 'unknown',
    legRaiseStraight: gates ? (a.legRaiseStraight as YesNoUnknown) : 'unknown',
    seatedHoldCleared: gates ? (a.seatedHoldCleared as YesNoUnknown) : 'unknown',
    kneeGaveWay: false,
    redFlags: Object.fromEntries(Object.entries(a.redFlags).filter(([, v]) => v)),
    pain: a.pain,
    swelling: a.swelling,
  };
}

export function fromInputs(i: GeneratorInputs, today: string): Answers {
  const a: Answers = {
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
    walksWithoutCrutches: i.walksWithoutCrutches ?? null,
    legRaiseStraight: i.legRaiseStraight ?? null,
    seatedHoldCleared: i.seatedHoldCleared ?? null,
  };
  const steps = stepsFor(a, today);
  if (!steps.includes('clearance')) a.phaseClearance = null;
  if (!steps.includes('walking')) {
    a.walksWithoutCrutches = null;
    a.legRaiseStraight = null;
    a.seatedHoldCleared = null;
  }
  return a;
}

const REFERRAL_QUESTIONS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R10'];

export function earlyReferral(a: Answers, today: string): Extract<GenerateResult, { kind: 'referral' }> | null {
  const probe: GeneratorInputs = {
    writtenPlan: a.writtenPlan ?? 'no',
    procedure: a.procedure ?? 'mpflr-only',
    ageBand: a.ageBand ?? '18-plus',
    bothKnees: a.bothKnees ?? false,
    firstSurgery: a.firstSurgery ?? 'yes',
    specialRules: a.specialRules ?? 'no',
    surgeryDate: weeksOf(a, today) === null ? today : a.surgeryDate,
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
