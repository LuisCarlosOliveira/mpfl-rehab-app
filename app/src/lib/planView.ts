// The pure helpers behind the plan screens. They hold no screen code and no clinical number.
// Every number that they show comes from a protocol that the generator made, or from the stored answers.

import { contactReason } from './contactCard';
import type { Exercise, HomeExercise, Protocol } from './protocol';
import { RULES, SOURCES, type GenerateResult, type GeneratorInputs, type Grade, type SourceId, type WhyEntry } from './protocolGen';
import type { SessionRecord } from './storage';

/**
 * What the generator made and the person has not confirmed. It is in memory only. Nothing is saved until Confirm.
 * `inputs` is null for an early referral, because the questions were not all answered.
 */
export type PlanDraft =
  | { kind: 'referral'; origin: 'create' | 'update'; reason: string; text: string; inputs: GeneratorInputs | null }
  | {
      kind: 'plan';
      origin: 'create' | 'update';
      protocol: Protocol;
      why: WhyEntry[];
      inputs: GeneratorInputs;
      /** The lines of change against the stored plan. Empty for a new plan, and for an update with no change. */
      changes: string[];
      /** A reason that the app offers no Confirm, for example "Ask your care team about the next stage". null: Confirm is open. */
      hold: string | null;
    };

/** The draft for a result of the generator. A referral keeps no plan. */
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
const NAMES: Record<Exercise['kind'], string> = {
  'heel-slide': 'Heel slide',
  'straight-leg-raise': 'Straight leg raise',
  'mini-squat': 'Mini squat',
  'seated-extension-hold': 'Seated knee extension hold',
};

export const HOME_NAMES: Record<HomeExercise['kind'], string> = {
  'quad-set': 'Quadriceps set',
  'gluteal-set': 'Gluteal set',
  'ankle-pump': 'Ankle pump',
  'leg-raise-side': 'Leg raise to the side',
  'leg-raise-back': 'Leg raise to the back',
};
export const NOT_CHECKED = 'The app does not check this exercise.';
/** The line for a dose that the plan does not hold. The generator sets no dose, so the person asks the care team. */
export const ASK_HOW_MANY = 'How many: ask your care team';
/** The line for a knee-bend limit that the plan does not hold. Only the surgeon sets it. */
export const ASK_LIMIT = 'Knee-bend limit: ask your surgeon';

/** The dose of a home exercise as plain words. With no dose in the plan, the person asks the care team. */
export const homeDose = (h: HomeExercise): string =>
  h.sets !== undefined && h.reps !== undefined ? `${h.sets} sets of ${h.reps}` : ASK_HOW_MANY;

/** The calendar date of the device clock, as year-month-day. It is not the date in UTC. */
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

/** Whole weeks from the surgery date to today. null when a date is not real or the surgery date is in the future. */
export function weeksSince(surgery: string, today: string): number | null {
  const a = dayNumber(surgery);
  const b = dayNumber(today);
  if (a === null || b === null || a > b) return null;
  return Math.floor((b - a) / 7);
}

/** True on the review date and after it. */
export function reviewDue(reviewDate: string | undefined, today: string): boolean {
  return reviewDate !== undefined && reviewDate <= today;
}

const activeExercises = (p: Protocol): Exercise[] => p.phases.find((ph) => ph.id === p.activePhase)?.exercises ?? [];
const activeHome = (p: Protocol): HomeExercise[] => p.phases.find((ph) => ph.id === p.activePhase)?.homeExercises ?? [];
const phaseName = (p: Protocol) => {
  const ph = p.phases.find((x) => x.id === p.activePhase);
  return `Phase ${p.activePhase} ${ph?.name ?? ''}`.trim();
};
const limitText = (e: Exercise | undefined) => (e?.maxFlexion === undefined ? 'no limit' : `${e.maxFlexion} degrees`);

/** One plain line for each part of the new plan. */
export function describeNewPlan(protocol: Protocol): string[] {
  const lines = [`${phaseName(protocol)}.`];
  for (const e of activeExercises(protocol)) {
    lines.push(e.maxFlexion === undefined ? `${NAMES[e.kind]}.` : `${NAMES[e.kind]}, knee-bend limit ${e.maxFlexion} degrees.`);
  }
  for (const h of activeHome(protocol)) {
    lines.push(h.sets !== undefined ? `${HOME_NAMES[h.kind]}, ${homeDose(h)}. ${NOT_CHECKED}` : `${HOME_NAMES[h.kind]}. ${homeDose(h)}. ${NOT_CHECKED}`);
  }
  return lines;
}

/** The changes between the stored plan and the proposal, each with its reason and rule id. Empty when nothing changes. */
export function describeChanges(current: Protocol, next: Protocol): string[] {
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
    if (!after.some((x) => x.kind === old.kind)) lines.push(`${NAMES[old.kind]} removed. Reason: ${REMOVED_REASON[old.kind]}.`);
  }
  const homeBefore = activeHome(current);
  for (const h of activeHome(next)) {
    if (!homeBefore.some((x) => x.kind === h.kind)) lines.push(`${HOME_NAMES[h.kind]} added. Reason: published plans list it for this stage (${h.kind === 'ankle-pump' ? RULES.ANKLE.id : RULES.HOME.id}).`);
  }
  for (const h of homeBefore) {
    if (!activeHome(next).some((x) => x.kind === h.kind)) lines.push(`${HOME_NAMES[h.kind]} removed. Reason: published plans list it for the first stage only (${RULES.ANKLE.id}).`);
  }
  return lines;
}

const ADDED_REASON = (e: Exercise, next: Protocol): string => {
  if (e.kind === 'mini-squat') return `you reported that you walk without crutches and lift your leg without the knee bending (${RULES.SQUAT_P2.id})`;
  if (e.maxFlexion === undefined && next.activePhase === 2) return `you do not know a limit, or you have none, and phase 2 allows it (${RULES.HEEL_P2_UNKNOWN.id})`;
  return `you gave a knee-bend limit from your surgeon (${RULES.HEEL.id})`;
};
const REMOVED_REASON: Record<Exercise['kind'], string> = {
  'heel-slide': `the app adds this exercise only with a knee-bend limit from your surgeon (${RULES.HEEL.id})`,
  'straight-leg-raise': `the app adds this exercise in every plan (${RULES.SLR.id})`,
  'mini-squat': `an answer changed, or the knee gave way since your plan. The app adds the mini squat only without these (${RULES.SQUAT_GATE.id})`,
  'seated-extension-hold': `the app adds no seated hold, because its arc is a clinical number (${RULES.HOLD.id})`,
};

const EXERCISE_CEILINGS = ['maxFlexion', 'maxTopFlexion'] as const;

/**
 * True when the proposal gives the knee more room than the stored plan: a pain limit that is higher or gone, a knee-bend ceiling that is
 * higher or gone, a straightest angle that is lower or gone, or a mini squat or a seated hold that the stored plan lacks in the same phase.
 */
export function raisesLimit(current: Protocol, next: Protocol): boolean {
  if (current.painPauseThreshold !== undefined && (next.painPauseThreshold === undefined || next.painPauseThreshold > current.painPauseThreshold)) return true;
  for (const phase of next.phases) {
    const before = current.phases.find((p) => p.id === phase.id);
    for (const exercise of phase.exercises) {
      const old = before?.exercises.find((e) => e.kind === exercise.kind);
      // A mini squat or a seated hold that the stored plan lacks is more load for the knee (generator v2).
      if (!old && (exercise.kind === 'mini-squat' || exercise.kind === 'seated-extension-hold')) return true;
      if (!old) continue;
      for (const key of EXERCISE_CEILINGS) {
        const was = old[key];
        if (was !== undefined && (exercise[key] === undefined || exercise[key] > was)) return true;
      }
      // minFlexion is the straightest angle that is allowed. A lower value allows more.
      if (old.minFlexion !== undefined && (exercise.minFlexion === undefined || exercise.minFlexion < old.minFlexion)) return true;
    }
  }
  return false;
}

/** True when the proposal moves the plan forward: a later phase, or a limit that is higher or gone. The app and the screens use this one rule. */
export function movesForward(current: Protocol, next: Protocol): boolean {
  return next.activePhase > current.activePhase || raisesLimit(current, next);
}

/** The number of sessions since the plan date with a safety event: a block, a gave-way press, a pause or swelling. */
export function eventsSince(sessions: readonly SessionRecord[], since: string, painPauseThreshold: number | undefined): number {
  return sessions.filter((s) => s.date.slice(0, 10) >= since && (s.redFlagBlocks > 0 || contactReason(s, painPauseThreshold) !== null)).length;
}

/** True when a session since the plan date has a "Knee gave way or hurts" press. It removes the mini squat (SQUAT_GATE). */
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

/** The evidence level in plain words, with the code of the knowledge base. */
export const evidenceLabel = (level: Grade): string => `${EVIDENCE[level]} (${level})`;

/** A source as one line: the id, the authors and the year. A project file shows its honest label and no authors or year. */
export function sourceLine(id: SourceId): string {
  const s = SOURCES[id];
  return s.notPublished === undefined ? `${id}: ${s.authors}, ${s.year}` : `${id}: ${s.notPublished}`;
}

/** The note for a heel slide that the app made. The count value is set by the app. It is no target and no goal. */
export const APP_VALUE = '(set by the app, not by a clinician)';
export const countStartText = (deg: number): string => `The app starts counting a rep at ${deg} degrees ${APP_VALUE}`;

const FIELD_LABELS: Record<string, { label: string; unit?: string }> = {
  maxFlexion: { label: 'knee-bend limit', unit: ' degrees' },
  minFlexion: { label: 'straightest knee angle', unit: ' degrees' },
  returnWithinDeg: { label: 'return within', unit: ' degrees' },
  sets: { label: 'sets' },
  reps: { label: 'reps' },
  reviewDate: { label: 'review date' },
};

/**
 * One applied value as a line: the phase, where it is in the plan, the number, and who set it.
 * The phase is in every line, so a plan with two phases never shows the same line twice.
 * The count value and the return tolerance of the heel slide are values of the app. They are no target and no goal.
 */
function appliedLine(a: WhyEntry['applied'][number]): string {
  const [phaseKey, kind, field] = a.path.split('.') as [string, string, string | undefined];
  const phase = `Phase ${phaseKey.replace('phase', '')}`;
  const name = NAMES[kind as Exercise['kind']] ?? HOME_NAMES[kind as HomeExercise['kind']] ?? kind;
  if (field === 'targetFlexion' && kind === 'seated-extension-hold') return `${phase}, ${name}, the app counts the hold at ${a.value} degrees ${APP_VALUE}`;
  if (field === 'targetFlexion') return `${phase}, ${name}, the app starts counting a rep at ${a.value} degrees ${APP_VALUE}`;
  if (field === 'returnWithinDeg') return `${phase}, ${name}, the app ends a rep when the knee is back within ${a.value} degrees of rest ${APP_VALUE}`;
  const info = FIELD_LABELS[field ?? kind] ?? { label: field ?? kind };
  const who = a.origin === 'person' ? ' (as entered by you)' : '';
  const where = field === undefined ? phase : `${phase}, ${name}`;
  return `${where}, ${info.label}: ${a.value}${info.unit ?? ''}${who}`;
}

export interface WhyView {
  id: string;
  title: string;
  text: string;
  evidence: string;
  population: string;
  conservative?: string;
  sources: string[];
  applied: string[];
  /** True when a clinician has not reviewed the value, as the rule says. */
  needsReview: boolean;
}

/** One rule of "Why this plan" as plain fields, so the screen holds no rule logic. */
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
    needsReview: e.flag === 'clinical-review-needed',
  };
}

/** The answers that made the plan, as short lines for "Why this plan". */
export function answerLines(i: GeneratorInputs): string[] {
  const limit = i.surgeonLimit.kind === 'degrees' ? `${i.surgeonLimit.degrees} degrees` : i.surgeonLimit.kind === 'none' ? 'No limit' : 'I do not know';
  return [
    `Date of surgery: ${i.surgeryDate ?? 'not given'}`,
    `Operated knee: ${i.side === 'left' ? 'Left' : 'Right'}`,
    `Operation: MPFL reconstruction only`,
    `Knee-bend limit from your surgeon: ${limit}`,
  ];
}
