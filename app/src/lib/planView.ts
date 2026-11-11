// The pure helpers behind the plan screens. They hold no screen code and no clinical number.
// Every number that they show comes from a protocol that the generator made, or from the stored answers.

import { contactReason } from './contactCard';
import type { Exercise, HomeExercise, Protocol } from './protocol';
import { DOSE_SHOWN, NOT_APPROVED, RULES, SOURCES, type GenerateResult, type GeneratorInputs, type Grade, type SourceId, type WhyEntry } from './protocolGen';
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
/** The same fact for the whole group of home exercises. The group shows it once. */
export const NOT_CHECKED_GROUP = 'The app does not check these exercises.';
/** The line for a dose that the plan does not hold. The generator sets no dose, so the person asks the care team. */
export const ASK_HOW_MANY = 'How many: ask your care team';
/** The line for a knee-bend limit that the plan does not hold. Only the surgeon sets it. */
export const ASK_LIMIT = 'Knee-bend limit: ask your surgeon';
/** The line for a heel slide after the answer "No limit". The surgeon gave none, so the person has nothing to ask for. */
export const NO_LIMIT_GIVEN = 'No knee-bend limit was given by your surgeon';

/** The line for the seated hold. The guideline gives no hold time and the app invents none. Every screen says the same. */
export const HOLD_TIME_LINE = 'Hold time: no number in the guideline. The seated hold cannot start until a hold time is set.';

/** The rules whose number comes from a published source and shows with a source note. */
export type SourceNoteId = 'DOSE' | 'SQUAT_DEPTH' | 'HOLD_P2' | 'RANGE_NONE';

/**
 * The lines of a source note, in the fixed order: the value, the source, the evidence, the population, the label of the app,
 * and the source that disagrees. Every line comes from the rule, so one sentence has one place.
 */
export function sourceLines(id: SourceNoteId): string[] {
  const r = RULES[id];
  const d = r.display;
  if (d === undefined) return [];
  return [d.value, `Source: ${d.cite}`, `Evidence: ${d.evidence}`, `Population: ${d.population ?? r.population}`, `${NOT_APPROVED}. No clinician has reviewed this value.`, ...(d.disagree === undefined ? [] : [`Another source: ${d.disagree}`])];
}

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

/** The names of the exercises of the active phase that hold the dose, in the order of the plan screen. The mini squat is last. */
export function doseScope(protocol: Protocol): string[] {
  const has = (x: { sets?: number; reps?: number }) => x.sets !== undefined && x.reps !== undefined;
  const camera = activeExercises(protocol).filter(has);
  const names = (list: Exercise[]) => list.map((e) => NAMES[e.kind].toLowerCase());
  return [...names(camera.filter((e) => e.kind !== 'mini-squat')), ...activeHome(protocol).filter(has).map((h) => HOME_NAMES[h.kind].toLowerCase()), ...names(camera.filter((e) => e.kind === 'mini-squat'))];
}

/**
 * One plain line for each part of the new plan. A dose shows once for the group, as the guideline gives it (the whole range, with the
 * population and the label). The exercises without a dose in the guideline show the missing dose once, at the end.
 */
export function describeNewPlan(protocol: Protocol): string[] {
  const lines = [`${phaseName(protocol)}.`];
  const hasDose = (x: { sets?: number; reps?: number }) => x.sets !== undefined && x.reps !== undefined;
  const exercises = activeExercises(protocol);
  const home = activeHome(protocol);
  let askDose = false;
  for (const e of exercises) {
    if (!hasDose(e) && e.holdSeconds === undefined && e.kind !== 'seated-extension-hold') askDose = true;
    const hold = e.holdSeconds === undefined ? [] : [`hold ${e.holdSeconds} seconds`];
    const parts = [NAMES[e.kind], ...(e.maxFlexion === undefined ? [] : [`knee-bend limit ${e.maxFlexion} degrees`]), ...hold];
    lines.push(`${parts.join(', ')}.`);
    // The same line as Home: the plan says that no limit was given, and does not leave it out.
    if (e.kind === 'heel-slide' && e.maxFlexion === undefined && e.source.includes('No limit entered')) lines.push(`${NO_LIMIT_GIVEN}.`);
  }
  for (const h of home) {
    if (!hasDose(h)) askDose = true;
    lines.push(`${HOME_NAMES[h.kind]} (at home).`);
  }
  if ([...exercises, ...home].some(hasDose)) lines.push(`Sets and reps: ${doseScope(protocol).join(', ')}: ${DOSE_SHOWN}.`);
  if (exercises.some((e) => e.kind === 'seated-extension-hold' && e.holdSeconds === undefined)) lines.push(HOLD_TIME_LINE);
  if (askDose) lines.push(`${ASK_HOW_MANY}.`);
  if (home.length > 0) lines.push('The app does not check the exercises at home.');
  return lines;
}

/** The changes between the stored plan and the proposal, each with its reason and rule id. Empty when nothing changes. */
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
  const homeBefore = activeHome(current);
  for (const h of activeHome(next)) {
    if (!homeBefore.some((x) => x.kind === h.kind)) lines.push(`${HOME_NAMES[h.kind]} added. Reason: published plans list it for this stage (${h.kind === 'ankle-pump' ? RULES.ANKLE.id : RULES.HOME.id}).`);
  }
  for (const h of homeBefore) {
    if (!activeHome(next).some((x) => x.kind === h.kind)) lines.push(`${HOME_NAMES[h.kind]} removed. Reason: published plans list it for the first stage only (${RULES.ANKLE.id}).`);
  }
  if (after.some((e) => e.kind === 'seated-extension-hold' && e.holdSeconds === undefined) && !before.some((e) => e.kind === 'seated-extension-hold')) lines.push(HOLD_TIME_LINE);
  // A stored plan from before the dose rule has no sets and reps. The new plan adds the dose of the guideline.
  const hadNoDose = (old: { sets?: number } | undefined) => old !== undefined && old.sets === undefined;
  const newDose = [
    ...after.filter((e) => e.sets !== undefined && hadNoDose(before.find((x) => x.kind === e.kind))).map((e) => NAMES[e.kind]),
    ...activeHome(next).filter((h) => h.sets !== undefined && hadNoDose(homeBefore.find((x) => x.kind === h.kind))).map((h) => HOME_NAMES[h.kind]),
  ];
  if (newDose.length > 0) {
    lines.push(`Sets and reps added for ${newDose.join(', ')}. Reason: P2 gives ${DOSE_SHOWN} for strengthening exercises, for ages 8 to 25, not for adults (${RULES.DOSE.id}).`);
  }
  return lines;
}

const ADDED_REASON = (e: Exercise, next: Protocol): string => {
  if (e.kind === 'mini-squat') return `you reported that you walk without crutches and lift your leg without the knee bending (${RULES.SQUAT_P2.id})`;
  if (e.kind === 'seated-extension-hold') return `you reported that your surgeon cleared it (${RULES.HOLD_P2.id})`;
  if (e.maxFlexion === undefined && next.activePhase === 2) return `you do not know a limit, or you have none, and phase 2 allows it (${RULES.HEEL_P2_UNKNOWN.id})`;
  return `you gave a knee-bend limit from your surgeon (${RULES.HEEL.id})`;
};
const REMOVED_REASON: Record<Exercise['kind'], string> = {
  'heel-slide': `the app adds this exercise only with a knee-bend limit from your surgeon (${RULES.HEEL.id})`,
  'straight-leg-raise': `the app adds this exercise in every plan (${RULES.SLR.id})`,
  'mini-squat': `an answer changed, or the knee gave way since your plan. The app adds the mini squat only without these (${RULES.SQUAT_GATE.id})`,
  'seated-extension-hold': `you did not report that your surgeon cleared it (${RULES.HOLD_P2.id})`,
};

/** The seated hold goes for one of four causes. The text names the first that holds, in this order: the stage goes back, the limit is below the arc start, no clearance, or something else. */
function removedReason(kind: Exercise['kind'], current: Protocol, next: Protocol, inputs?: { seatedHoldCleared?: string; phaseClearance?: string }): string {
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

/**
 * True when the proposal gives the knee more room through a number: a pain limit that is higher or gone, a knee-bend ceiling that is
 * higher or gone, or a straightest angle that is lower or gone. A new exercise is not a number, so it does not count here.
 */
export function raisesKneeLimit(current: Protocol, next: Protocol): boolean {
  if (current.painPauseThreshold !== undefined && (next.painPauseThreshold === undefined || next.painPauseThreshold > current.painPauseThreshold)) return true;
  for (const phase of next.phases) {
    const before = current.phases.find((p) => p.id === phase.id);
    for (const exercise of phase.exercises) {
      const old = before?.exercises.find((e) => e.kind === exercise.kind);
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

/** True when the proposal adds a mini squat or a seated hold that the stored plan lacks in the same phase. It is more load for the knee (generator v2). */
export function addsLoad(current: Protocol, next: Protocol): boolean {
  return next.phases.some((phase) => {
    const before = current.phases.find((p) => p.id === phase.id);
    return phase.exercises.some((e) => (e.kind === 'mini-squat' || e.kind === 'seated-extension-hold') && !before?.exercises.some((o) => o.kind === e.kind));
  });
}

/** True when the proposal gives the knee more room than the stored plan: a higher limit or a new mini squat or seated hold. */
export const raisesLimit = (current: Protocol, next: Protocol): boolean => raisesKneeLimit(current, next) || addsLoad(current, next);

/** True when the proposal moves the plan forward: a later phase, or a limit that is higher or gone. The app and the screens use this one rule. */
export function movesForward(current: Protocol, next: Protocol): boolean {
  return next.activePhase > current.activePhase || raisesLimit(current, next);
}

export const HOLD_NEXT_STAGE = 'Ask your care team about the next stage.';
export const HOLD_LIMIT = 'A higher limit needs your care team. The app keeps your current limit.';
export const HOLD_PAIN_LIMIT = 'Your stored plan has a pain limit from your clinician. A new plan from your answers would remove or raise it. Ask your care team. The app keeps your plan.';

/** The reason that the app offers no Confirm for a plan that moves forward, with the right words for the cause. */
export function holdTextFor(current: Protocol, next: Protocol): string {
  const painLimit = current.painPauseThreshold !== undefined && (next.painPauseThreshold === undefined || next.painPauseThreshold > current.painPauseThreshold);
  if (painLimit) return HOLD_PAIN_LIMIT;
  return raisesKneeLimit(current, next) ? HOLD_LIMIT : HOLD_NEXT_STAGE;
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
  sets: { label: 'sets, start of the range' },
  reps: { label: 'reps, start of the range 10 to 15' },
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
  /** Who the person asks, as the text of the rule says it: "Ask your surgeon" or "Ask your care team". null when the text names neither. */
  ask: string | null;
  /** True when a clinician has not reviewed the value, as the rule says. */
  needsReview: boolean;
  /** For a value that no source gives: the words of the guideline (the reason of the rule). null for the other rules. */
  noNumber: { words: string } | null;
}

const ASKS = ['Ask your surgeon', 'Ask your care team'] as const;

/** The first "Ask your ..." that a text holds. The chip of a rule follows its own line. */
export const askOf = (text: string): string | null =>
  ASKS.map((a) => ({ a, at: text.indexOf(a) })).filter((x) => x.at >= 0).sort((x, y) => x.at - y.at)[0]?.a ?? null;

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
    ask: askOf(e.text),
    needsReview: e.flag === 'clinical-review-needed',
    noNumber: RULES[e.ruleId].kind === 'none' ? { words: RULES[e.ruleId].reason ?? '' } : null,
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
