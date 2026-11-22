import { contactReason } from './contactCard';
import { specFor } from './monitor';
import { PHASE_SECOND, type HomeExercise, type PlanExercise, type Protocol } from './protocol';
import { DOSE_SHOWN, NOT_APPROVED, RULES, SOURCES, type GenerateResult, type GeneratorInputs, type Grade, type SourceId, type WhyEntry } from './protocolGen';
import type { SessionRecord } from './storage';

export type PlanDraft =
  | { kind: 'referral'; origin: 'create' | 'update'; reason: string; text: string; inputs: GeneratorInputs | null }
  | {
      kind: 'plan';
      origin: 'create' | 'update';
      protocol: Protocol;
      why: WhyEntry[];
      inputs: GeneratorInputs;
      changes: string[];
      hold: string | null;
    };

export function draftOf(
  result: GenerateResult,
  origin: 'create' | 'update',
  inputs: GeneratorInputs | null,
  changes: string[] = [],
  hold: string | null = null,
): PlanDraft {
  if (result.kind === 'referral') return { kind: 'referral', origin, reason: result.reason, text: result.text, inputs };
  if (inputs === null) throw new Error('A plan needs the inputs that made it.');
  return { kind: 'plan', origin, protocol: result.protocol, why: result.why, inputs, changes, hold };
}

const DAY_MS = 86_400_000;
export const HOME_NAMES: Record<HomeExercise['kind'], string> = {
  'quad-set': 'Quadriceps set',
  'gluteal-set': 'Gluteal set',
  'ankle-pump': 'Ankle pump',
  'leg-raise-side': 'Leg raise to the side',
  'leg-raise-back': 'Leg raise to the back',
};
export const PLAN_NAMES: Record<PlanExercise['kind'], string> = {
  'heel-slide': 'Heel slide',
  'straight-leg-raise': 'Straight leg raise',
  'mini-squat': 'Mini squat',
  'seated-extension-hold': 'Seated knee extension hold',
  ...HOME_NAMES,
};
const NAMES = PLAN_NAMES;
export const NOT_CHECKED = 'The app does not check this exercise.';

const MONITOR_LINES: Partial<Record<PlanExercise['kind'], string>> = {
  'leg-raise-back': 'The camera counts your lifts and measures the angle. The app does not judge how you do it.',
  'leg-raise-side': 'The camera counts your lifts. It cannot measure the angle well.',
  'ankle-pump': 'The camera counts your pumps. It does not check how far you move.',
  'quad-set': 'The camera cannot see this effort. The app times your hold.',
  'gluteal-set': 'The camera cannot see this effort. The app times your hold.',
};

export function monitorLine(kind: string): string | null {
  return MONITOR_LINES[kind as PlanExercise['kind']] ?? (specFor(kind) === undefined ? NOT_CHECKED : null);
}
export const ASK_HOW_MANY = 'How many: ask your care team';
export const ASK_LIMIT = 'Knee-bend limit: ask your surgeon';
export const NO_LIMIT_GIVEN = 'No knee-bend limit was given by your surgeon';

export const HOLD_TIME_LINE = 'Hold time: no number in the guideline. The seated hold cannot start until a hold time is set.';

export type SourceNoteId = 'DOSE' | 'SQUAT_DEPTH' | 'HOLD_P2' | 'RANGE_NONE';

export function sourceLines(id: SourceNoteId): string[] {
  const r = RULES[id];
  const d = r.display;
  if (d === undefined) return [];
  return [d.value, `Source: ${d.cite}`, `Evidence: ${d.evidence}`, `Population: ${d.population ?? r.population}`, `${NOT_APPROVED}. No clinician has reviewed this value.`, ...(d.disagree === undefined ? [] : [`Another source: ${d.disagree}`])];
}

export function localIsoDate(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

function dayNumber(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) return null;
  return ms / DAY_MS;
}

export function weeksSince(surgery: string, today: string): number | null {
  const a = dayNumber(surgery);
  const b = dayNumber(today);
  if (a === null || b === null || a > b) return null;
  return Math.floor((b - a) / 7);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const ordinal = (k: number): string => {
  const suffix = k % 100 >= 11 && k % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[k % 10] ?? 'th';
  return ORDINALS[k - 1] ?? `${k}${suffix}`;
};

export function dateWords(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export const weekWords = (week: number): string => `week ${week} (the ${ordinal(week + 1)} week after surgery)`;

export function surgeryDateWords(surgery: string, today: string): string | null {
  if (weeksSince(surgery, '9999-12-31') === null) return null;
  const week = weeksSince(surgery, today);
  return week === null ? dateWords(surgery) : `${dateWords(surgery)}, ${weekWords(week)}`;
}

export function reviewDue(reviewDate: string | undefined, today: string): boolean {
  return reviewDate !== undefined && reviewDate <= today;
}

const activeExercises = (p: Protocol): PlanExercise[] => p.phases.find((ph) => ph.id === p.activePhase)?.exercises ?? [];
export const phaseName = (p: Protocol) => {
  const ph = p.phases.find((x) => x.id === p.activePhase);
  return `Phase ${p.activePhase} ${ph?.name ?? ''}`.trim();
};
const limitText = (e: PlanExercise | undefined) => (e?.maxFlexion === undefined ? 'no limit' : `${e.maxFlexion} degrees`);

export function doseScope(protocol: Protocol): string[] {
  const has = (x: { sets?: number; reps?: number }) => x.sets !== undefined && x.reps !== undefined;
  const camera = activeExercises(protocol).filter(has);
  const names = (list: PlanExercise[]) => list.map((e) => NAMES[e.kind].toLowerCase());
  return [...names(camera.filter((e) => e.kind !== 'mini-squat')), ...names(camera.filter((e) => e.kind === 'mini-squat'))];
}

export function describeNewPlan(protocol: Protocol): string[] {
  const lines = [`${phaseName(protocol)}.`];
  const hasDose = (x: { sets?: number; reps?: number }) => x.sets !== undefined && x.reps !== undefined;
  const exercises = activeExercises(protocol);
  let askDose = false;
  for (const e of exercises) {
    if (!hasDose(e) && e.holdSeconds === undefined && e.kind !== 'seated-extension-hold') askDose = true;
    const hold = e.holdSeconds === undefined ? [] : [`hold ${e.holdSeconds} seconds`];
    const parts = [NAMES[e.kind], ...(e.maxFlexion === undefined ? [] : [`knee-bend limit ${e.maxFlexion} degrees`]), ...hold];
    lines.push(`${parts.join(', ')}.`);
    const honest = monitorLine(e.kind);
    if (honest !== null) lines.push(honest);
    if (e.kind === 'heel-slide' && e.maxFlexion === undefined && e.source.includes('No limit entered')) lines.push(`${NO_LIMIT_GIVEN}.`);
  }
  if (exercises.some(hasDose)) lines.push(`Sets and reps: ${doseScope(protocol).join(', ')}: ${DOSE_SHOWN}.`);
  if (exercises.some((e) => e.kind === 'seated-extension-hold' && e.holdSeconds === undefined)) lines.push(HOLD_TIME_LINE);
  if (askDose) lines.push(`${ASK_HOW_MANY}.`);
  return lines;
}

export function describeChanges(current: Protocol, next: Protocol, inputs?: { seatedHoldCleared?: string; phaseClearance?: string }): string[] {
  const lines: string[] = [];
  if (next.activePhase !== current.activePhase) {
    const reason =
      next.activePhase > current.activePhase
        ? 'you reported that your care team said you can start the next stage'
        : 'you did not report that your care team said you can start the next stage';
    lines.push(`${phaseName(current)} changes to ${phaseName(next)}. Reason: ${reason} (${RULES.PH2.id}).`);
  }
  const before = activeExercises(current);
  const after = activeExercises(next);
  for (const e of after) {
    const old = before.find((x) => x.kind === e.kind);
    if (old === undefined) {
      lines.push(`${NAMES[e.kind]} added. Reason: ${ADDED_REASON(e, next)}.`);
    } else if (old.maxFlexion !== e.maxFlexion) {
      lines.push(
        `Knee-bend limit in your plan: from ${limitText(old)} to ${limitText(e)}. Reason: the knee-bend limit is the limit from your surgeon, as entered by you.`,
      );
    }
  }
  for (const old of before) {
    if (!after.some((x) => x.kind === old.kind)) lines.push(`${NAMES[old.kind]} removed. Reason: ${removedReason(old.kind, current, next, inputs)}.`);
  }
  if (after.some((e) => e.kind === 'seated-extension-hold' && e.holdSeconds === undefined) && !before.some((e) => e.kind === 'seated-extension-hold')) lines.push(HOLD_TIME_LINE);
  const hadNoDose = (old: { sets?: number } | undefined) => old !== undefined && old.sets === undefined;
  const newDose = [
    ...after.filter((e) => e.sets !== undefined && hadNoDose(before.find((x) => x.kind === e.kind))).map((e) => NAMES[e.kind]),
  ];
  if (newDose.length > 0) {
    lines.push(`Sets and reps added for ${newDose.join(', ')}. Reason: P2 gives ${DOSE_SHOWN} for strengthening exercises, for ages 8 to 25. No study gives a dose for adults after MPFL reconstruction (${RULES.DOSE.id}).`);
  }
  return lines;
}

const ADDED_REASON = (e: PlanExercise, next: Protocol): string => {
  if (e.kind === 'ankle-pump') return `published plans list it for this stage (${RULES.ANKLE.id})`;
  if ((HOME_KINDS as readonly string[]).includes(e.kind)) return `published plans list it for this stage (${RULES.HOME.id})`;
  if (e.kind === 'mini-squat') return `you reported that you walk without crutches and lift your leg without the knee bending (${RULES.SQUAT_P2.id})`;
  if (e.kind === 'seated-extension-hold') return `you reported that your surgeon cleared it (${RULES.HOLD_P2.id})`;
  if (e.maxFlexion === undefined && next.activePhase === PHASE_SECOND) return `you do not know a limit, or you have none, and phase 2 allows it (${RULES.HEEL_P2_UNKNOWN.id})`;
  return `you gave a knee-bend limit from your surgeon (${RULES.HEEL.id})`;
};
const HOME_KINDS = Object.keys(HOME_NAMES);
const REMOVED_REASON: Record<PlanExercise['kind'], string> = {
  'quad-set': `the app adds this exercise in every plan (${RULES.HOME.id})`,
  'gluteal-set': `the app adds this exercise in every plan (${RULES.HOME.id})`,
  'leg-raise-side': `the app adds this exercise in every plan (${RULES.HOME.id})`,
  'leg-raise-back': `the app adds this exercise in every plan (${RULES.HOME.id})`,
  'ankle-pump': `published plans list it for the first stage only (${RULES.ANKLE.id})`,
  'heel-slide': `the app adds this exercise only with a knee-bend limit from your surgeon (${RULES.HEEL.id})`,
  'straight-leg-raise': `the app adds this exercise in every plan (${RULES.SLR.id})`,
  'mini-squat': `an answer changed, or the knee gave way since your plan. The app adds the mini squat only without these (${RULES.SQUAT_GATE.id})`,
  'seated-extension-hold': `you did not report that your surgeon cleared it (${RULES.HOLD_P2.id})`,
};

function removedReason(kind: PlanExercise['kind'], current: Protocol, next: Protocol, inputs?: { seatedHoldCleared?: string; phaseClearance?: string }): string {
  if (kind !== 'seated-extension-hold') return REMOVED_REASON[kind];
  if (next.activePhase < current.activePhase || inputs?.phaseClearance === 'no') {
    return `the plan goes back to the first stage, and the seated hold is only in the second stage (${RULES.HOLD_P2.id})`;
  }
  const arcStart = RULES.HOLD_P2.values.arcStart;
  const limit = activeExercises(next).find((e) => e.kind === 'heel-slide')?.maxFlexion;
  if (limit !== undefined && limit < arcStart && inputs?.seatedHoldCleared !== 'no') {
    return `the knee-bend limit from your surgeon (${limit} degrees) is below the start of the guideline arc (${arcStart} degrees) (${RULES.HOLD_ARC_LIMIT.id})`;
  }
  if (inputs?.seatedHoldCleared === 'yes') return `an answer changed, or the knee gave way since your plan. The app adds the seated hold only without these (${RULES.HOLD_P2.id})`;
  return REMOVED_REASON[kind];
}

const EXERCISE_CEILINGS = ['maxFlexion', 'maxTopFlexion'] as const;

export function raisesKneeLimit(current: Protocol, next: Protocol): boolean {
  if (losesPainLimit(current, next)) return true;
  for (const phase of next.phases) {
    const before = current.phases.find((p) => p.id === phase.id);
    for (const exercise of phase.exercises) {
      const old = before?.exercises.find((e) => e.kind === exercise.kind);
      if (!old) continue;
      for (const key of EXERCISE_CEILINGS) {
        const was = old[key];
        if (was !== undefined && (exercise[key] === undefined || exercise[key] > was)) return true;
      }
      if (old.minFlexion !== undefined && (exercise.minFlexion === undefined || exercise.minFlexion < old.minFlexion)) return true;
    }
  }
  return false;
}

function addsLoad(current: Protocol, next: Protocol): boolean {
  return next.phases.some((phase) => {
    const before = current.phases.find((p) => p.id === phase.id);
    return phase.exercises.some((e) => (e.kind === 'mini-squat' || e.kind === 'seated-extension-hold') && !before?.exercises.some((o) => o.kind === e.kind));
  });
}

export const raisesLimit = (current: Protocol, next: Protocol): boolean => raisesKneeLimit(current, next) || addsLoad(current, next);

export function movesForward(current: Protocol, next: Protocol): boolean {
  return next.activePhase > current.activePhase || raisesLimit(current, next);
}

export const HOLD_NEXT_STAGE = 'Ask your care team about the next stage.';
export const HOLD_LIMIT = 'A higher limit needs your care team. The app keeps your current limit.';
export const HOLD_PAIN_LIMIT = 'Your stored plan has a pain limit from your clinician. A new plan from your answers would remove or raise it. Ask your care team. The app keeps your plan.';

export const losesPainLimit = (current: Protocol, next: Protocol): boolean =>
  current.painPauseThreshold !== undefined && (next.painPauseThreshold === undefined || next.painPauseThreshold > current.painPauseThreshold);

export function holdTextFor(current: Protocol, next: Protocol): string {
  if (losesPainLimit(current, next)) return HOLD_PAIN_LIMIT;
  return raisesKneeLimit(current, next) ? HOLD_LIMIT : HOLD_NEXT_STAGE;
}

export function eventsSince(sessions: readonly SessionRecord[], since: string, painPauseThreshold: number | undefined): number {
  return sessions.filter((s) => s.date.slice(0, 10) >= since && (s.redFlagBlocks > 0 || contactReason(s, painPauseThreshold) !== null)).length;
}

export const gaveWaySince = (sessions: readonly SessionRecord[], since: string): boolean =>
  sessions.some((s) => s.date.slice(0, 10) >= since && s.gaveWayPresses > 0);

const EVIDENCE: Record<Grade, string> = {
  CONSENSUS: 'Consensus statement',
  REVIEW: 'Review of studies',
  STUDY: 'Single study',
  OPINION: 'Expert opinion',
  NONE: 'No source gives a value',
  ENGINEERING: 'Camera value, not a clinical value',
};

export const evidenceLabel = (level: Grade): string => `${EVIDENCE[level]} (${level})`;

export function sourceLine(id: SourceId): string {
  const s = SOURCES[id];
  return s.notPublished === undefined ? `${id}: ${s.authors}, ${s.year}` : `${id}: ${s.notPublished}`;
}

const APP_VALUE = '(set by the app, not by a clinician)';
export const countStartText = (deg: number): string => `The app starts counting a rep at ${deg} degrees ${APP_VALUE}`;

const FIELD_LABELS: Record<string, { label: string; unit?: string }> = {
  maxFlexion: { label: 'knee-bend limit', unit: ' degrees' },
  minFlexion: { label: 'straightest knee angle', unit: ' degrees' },
  returnWithinDeg: { label: 'return within', unit: ' degrees' },
  sets: { label: 'sets, start of the range' },
  reps: { label: 'reps, start of the range 10 to 15' },
  reviewDate: { label: 'review date' },
};

function appliedLine(a: WhyEntry['applied'][number]): string {
  const [phaseKey, kind, field] = a.path.split('.') as [string, string, string | undefined];
  const phase = `Phase ${phaseKey.replace('phase', '')}`;
  const name = NAMES[kind as PlanExercise['kind']] ?? kind;
  if (field === 'targetFlexion' && kind === 'seated-extension-hold') return `${phase}, ${name}, the app counts the hold at ${a.value} degrees ${APP_VALUE}`;
  if (field === 'targetFlexion') return `${phase}, ${name}, the app starts counting a rep at ${a.value} degrees ${APP_VALUE}`;
  if (field === 'returnWithinDeg') return `${phase}, ${name}, the app ends a rep when the knee is back within ${a.value} degrees of rest ${APP_VALUE}`;
  const info = FIELD_LABELS[field ?? kind] ?? { label: field ?? kind };
  const who = a.origin === 'person' ? ' (as entered by you)' : '';
  const where = field === undefined ? phase : `${phase}, ${name}`;
  return `${where}, ${info.label}: ${a.value}${info.unit ?? ''}${who}`;
}

interface WhyView {
  id: string;
  title: string;
  text: string;
  evidence: string;
  population: string;
  conservative?: string;
  sources: string[];
  applied: string[];
  ask: string | null;
  needsReview: boolean;
  noNumber: { words: string } | null;
}

const ASKS = ['Ask your surgeon', 'Ask your care team'] as const;

const askOf = (text: string): string | null =>
  ASKS.map((a) => ({ a, at: text.indexOf(a) })).filter((x) => x.at >= 0).sort((x, y) => x.at - y.at)[0]?.a ?? null;

export function whyView(e: WhyEntry): WhyView {
  return {
    id: e.ruleId,
    title: RULES[e.ruleId].title,
    text: e.text,
    evidence: evidenceLabel(e.grade),
    population: e.population,
    conservative: e.conservative,
    sources: e.sourceIds.map(sourceLine),
    applied: e.applied.map(appliedLine),
    ask: askOf(e.text),
    needsReview: e.flag === 'clinical-review-needed',
    noNumber: RULES[e.ruleId].kind === 'none' ? { words: RULES[e.ruleId].reason ?? '' } : null,
  };
}

export function answerLines(i: GeneratorInputs): string[] {
  const limit = i.surgeonLimit.kind === 'degrees' ? `${i.surgeonLimit.degrees} degrees` : i.surgeonLimit.kind === 'none' ? 'No limit' : 'I do not know';
  return [
    `Date of surgery: ${i.surgeryDate ?? 'not given'}`,
    `Operated knee: ${i.side === 'left' ? 'Left' : 'Right'}`,
    `Operation: MPFL reconstruction only`,
    `Knee-bend limit from your surgeon: ${limit}`,
  ];
}
