// Clinician review summary (FR22a, FR15). Pure functions, no clock, no storage.
// Source of the layout: research/progression.md section 5.2 (PROPOSAL, no clinical source).
// The summary shows measured values against limits that the clinician wrote. It gives
// no total, no count of criteria, no percentage, no score and no colour. It never says
// that a limit was met. The app never changes the phase (FR4).

import { classifyAgainstLimit, MARGIN_DEG, MARGIN_SOURCE } from './margin';
import { exerciseLabel, sortByDate } from './progress';
import { CLINICIAN_CHECKS, type Protocol, type ReviewCriterion } from './protocol/schema';
import { PAIN_FLOOR } from './safety';
import type { SessionRecord } from './storage';

/** At least this many counted reps for a session to count for an angle measure. PROPOSAL, no source (progression.md section 5.2). */
export const MIN_COUNTED_REPS = 5;

export const BANNER = 'Patient file, unsigned, self-reported.';
const ANGLE_LABEL = 'estimated angle, not a medical measurement';

/** The four states of a row. The first three are the phrases of progression.md section 5.2. */
export const STATE = {
  above: 'Above the limit by more than the margin',
  below: 'Below the limit by more than the margin',
  cannotTell: 'Cannot tell, the difference is smaller than the camera error',
  notEnough: 'Not enough data',
  // Only for measures with no camera error (pain, session count) when the value equals the limit exactly.
  equal: 'Equal to the limit',
} as const;
export type SummaryState = (typeof STATE)[keyof typeof STATE];

const EVIDENCE_LABEL = {
  mpflr: 'Evidence: MPFL patients',
  borrowed: 'Evidence: borrowed from another condition',
  unvalidated: 'Evidence: not validated',
} as const;
const NO_EVIDENCE = 'Evidence: not set';

export const EVENT_LABEL = {
  redFlagBlocks: 'Red-flag blocks',
  gaveWayPresses: 'Presses of "knee gave way or hurts"',
  painAtPause: 'Sessions with pain at or above the pause threshold',
  swellingMore: 'Sessions with swelling "more than before"',
} as const;

// Fixed texts for the visit checks. The key list is CLINICIAN_CHECKS (progression.md section 5.1).
// The wording is a PROPOSAL. Only the strength item follows the example of section 5.2.
const CHECK_TEXT = {
  extensionFull: 'Full knee extension. Measure at the visit.',
  slrNoLag: 'Straight leg raise without extension lag. Look at the visit.',
  gait: 'Gait. Look at the visit.',
  effusionExam: 'Swelling in the joint. Examine at the visit.',
  quadStrength: 'Quadriceps strength. Needs a dynamometer.',
  hopTests: 'Hop tests. Do at the visit.',
  balanceTests: 'Balance tests. Do at the visit.',
  psychReadiness: 'Psychological readiness. Ask at the visit.',
} as const satisfies Record<(typeof CLINICIAN_CHECKS)[number], string>;

const OP_TEXT = { atLeast: 'at least', atMost: 'at most' } as const;

type NumericCriterion = Extract<ReviewCriterion, { kind: 'numeric' }>;
type Measure = NumericCriterion['measure'];

// Criterion text from a template: what is measured, the operator, the limit and the unit.
const MEASURE_TEXT: Record<Measure, (c: NumericCriterion) => string> = {
  peakFlexionDeg: (c) => `Peak knee bend, ${exerciseLabel(c.exerciseId ?? 'mini-squat')}, ${OP_TEXT[c.op]} ${c.limit} degrees`,
  topFlexionDeg: (c) => `Knee angle at the top, straight leg raise, ${OP_TEXT[c.op]} ${c.limit} degrees`,
  painMax: (c) => `Highest pain after a session, ${OP_TEXT[c.op]} ${c.limit} on a scale from 0 to 10`,
  sessionsDone: (c) => `Sessions done in this phase, ${OP_TEXT[c.op]} ${c.limit}`,
};
const LIMIT_UNIT: Record<Measure, string> = { peakFlexionDeg: ' degrees', topFlexionDeg: ' degrees', painMax: ' (0 to 10)', sessionsDone: ' sessions' };

const swellingText = 'Swelling answer, none or some only';

export interface ReviewRow {
  kind: 'numeric' | 'swelling';
  criterion: string;
  limitText: string | null; // null for the swelling row
  evidenceLabel: string;
  measured: number | null; // median, highest pain or session count. null for swelling and for no value
  measuredText: string;
  marginDeg: number | null; // from the sessions. null when the measure has no camera error
  marginText: string | null;
  marginSource: string | null;
  state: SummaryState | null; // null for the swelling row with enough data: the counts speak
  sessionsUsed: number;
  sessionsRequired: number | null;
  dataText: string; // "n of N sessions"
  swellingAnswers: { none: number; some: number; more: number } | null;
}

export interface ReviewSummary {
  header: {
    pseudonymId: string | null;
    protocolId: string;
    phase: { id: number; name: string };
    reviewDate: string | null;
    lastSessionDate: string | null;
    sessionsSinceExport: number;
    generatedAt: string;
    banner: string;
  };
  events: {
    redFlagBlocks: number;
    gaveWayPresses: number;
    painAtPause: number;
    swellingMore: number;
  };
  rows: ReviewRow[];
  clinicianChecks: { key: (typeof CLINICIAN_CHECKS)[number]; text: string; evidenceLabel: string; answer: null }[];
  painSwellingTable: { sessionId: number; date: string; exercise: string; painText: string; swelling: SessionRecord['swelling'] }[];
}

export interface ReviewInput {
  protocol: Protocol;
  phaseId: number;
  sessions: readonly SessionRecord[];
  lastExportAt: string | null;
  now: Date;
  pseudonymId?: string | null;
}

/** Median of a non-empty list. An even count gives the mean of the two middle values. */
function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = v.length >> 1;
  return v.length % 2 ? (v[mid] as number) : ((v[mid - 1] as number) + (v[mid] as number)) / 2;
}

const stateOf = (value: number | null, limit: number, margin: number): SummaryState =>
  ({ above: STATE.above, below: STATE.below, 'cannot-tell': STATE.cannotTell })[classifyAgainstLimit(value, limit, margin)];

// Pain and session count have no camera error. Margin 0: equal is its own text, never a camera phrase.
const exactStateOf = (value: number, limit: number): SummaryState => (value === limit ? STATE.equal : stateOf(value, limit, 0));

/** The highest pain answer between sets, or null when no set was answered. */
const betweenSetsMax = (s: SessionRecord): number | null => {
  const answers = (s.setPain ?? []).filter((v): v is number => v !== null);
  return answers.length ? Math.max(...answers) : null;
};

/** The pain text of a session: the end answer and the highest between-set answer, or "Not answered" when there is none. */
export function painText(s: SessionRecord): string {
  const between = betweenSetsMax(s);
  const parts = [...(s.pain === undefined ? [] : [`${s.pain} (0 to 10)`]), ...(between === null ? [] : [`${between} (between sets)`])];
  return parts.length ? parts.join(', ') : 'Not answered';
}

const dataText = (used: number, required: number) => `${used} of ${required} sessions`;

function numericRow(c: NumericCriterion, phaseSessions: SessionRecord[]): ReviewRow {
  const base = {
    kind: 'numeric' as const,
    criterion: MEASURE_TEXT[c.measure](c),
    limitText: `${c.limit}${LIMIT_UNIT[c.measure]}`,
    evidenceLabel: EVIDENCE_LABEL[c.evidence],
    sessionsRequired: c.lastSessions,
    swellingAnswers: null,
  };

  if (c.measure === 'sessionsDone') {
    // A count has no camera error, so the margin is 0. The window is all sessions of the phase, not the last N (decision of the main session).
    const count = phaseSessions.length;
    return {
      ...base, measured: count, measuredText: `${count} sessions`, marginDeg: null, marginText: null, marginSource: null,
      state: exactStateOf(count, c.limit), sessionsUsed: count, sessionsRequired: null, dataText: `${count} sessions`,
    };
  }

  if (c.measure === 'painMax') {
    // Pain is a self-report. The highest value of the window is the right measure for a pain limit. PROPOSAL.
    const window = phaseSessions.slice(-c.lastSessions);
    const answered = window.flatMap((s) => (s.pain === undefined ? [] : [s.pain])); // a run with no answer has no pain value
    const highest = answered.length ? Math.max(...answered) : null;
    const enough = window.length >= c.lastSessions && highest !== null;
    return {
      ...base, measured: enough ? highest : null, measuredText: enough ? `${highest} (0 to 10)` : 'No value',
      marginDeg: null, marginText: null, marginSource: null,
      state: enough ? exactStateOf(highest as number, c.limit) : STATE.notEnough, sessionsUsed: window.length, dataText: dataText(window.length, c.lastSessions),
    };
  }

  // Angle measures: only sessions of the exercise with at least MIN_COUNTED_REPS counted reps.
  const exercise = c.measure === 'topFlexionDeg' ? 'straight-leg-raise' : (c.exerciseId ?? 'mini-squat');
  const field = c.measure === 'topFlexionDeg' ? 'topFlexion' : 'peakFlexion';
  const eligible = phaseSessions.filter((s) => s.exercise === exercise && s.reps !== null && s.reps >= MIN_COUNTED_REPS);
  const window = eligible.slice(-c.lastSessions);
  const used = { sessionsUsed: window.length, dataText: dataText(window.length, c.lastSessions) };
  if (window.length < c.lastSessions) {
    return { ...base, ...used, measured: null, measuredText: 'No value', marginDeg: null, marginText: null, marginSource: null, state: STATE.notEnough };
  }
  // Use the widest margin of the window. The margin and its source come from the session records.
  const widest = window.reduce((a, b) => (b.marginDeg > a.marginDeg ? b : a));
  const marginInfo = { marginDeg: widest.marginDeg, marginText: `plus or minus ${widest.marginDeg} degrees`, marginSource: widest.marginSource };
  const values = window.map((s) => s[field]);
  // A hidden leg gives a null value. One null value in the window makes the answer "Cannot tell".
  if (values.some((v) => v === null)) {
    return { ...base, ...used, ...marginInfo, measured: null, measuredText: 'No value', state: STATE.cannotTell };
  }
  const measured = median(values as number[]);
  return { ...base, ...used, ...marginInfo, measured, measuredText: `${measured} degrees (${ANGLE_LABEL})`, state: stateOf(measured, c.limit, widest.marginDeg) };
}

function swellingRow(c: Extract<ReviewCriterion, { kind: 'swelling' }>, phaseSessions: SessionRecord[]): ReviewRow {
  const window = phaseSessions.slice(-c.lastSessions);
  const answers = { none: 0, some: 0, more: 0 };
  for (const s of window) if (s.swelling !== undefined) answers[s.swelling] += 1;
  const enough = window.length >= c.lastSessions;
  return {
    kind: 'swelling',
    criterion: swellingText,
    limitText: null,
    evidenceLabel: EVIDENCE_LABEL[c.evidence],
    measured: null,
    measuredText: `Answers: none ${answers.none}, some ${answers.some}, more than before ${answers.more}`,
    marginDeg: null,
    marginText: null,
    marginSource: null,
    state: enough ? null : STATE.notEnough,
    sessionsUsed: window.length,
    sessionsRequired: c.lastSessions,
    dataText: dataText(window.length, c.lastSessions),
    swellingAnswers: answers,
  };
}

/**
 * The data for the clinician review summary of one phase. The caller passes the clock
 * (`now`) and the last export time. Sessions since the last export are those after
 * `lastExportAt`, or all sessions when `lastExportAt` is null.
 */
export function buildReviewSummary({ protocol, phaseId, sessions, lastExportAt, now, pseudonymId = null }: ReviewInput): ReviewSummary {
  const phase = protocol.phases.find((p) => p.id === phaseId);
  if (!phase) throw new Error(`Phase ${phaseId} is not in protocol ${protocol.id}`);

  const sorted = sortByDate(sessions);
  const phaseSessions = sorted.filter((s) => s.phase === phaseId);
  const since = lastExportAt === null ? sorted : sorted.filter((s) => Date.parse(s.date) > Date.parse(lastExportAt));
  const painThreshold = Math.min(PAIN_FLOOR, protocol.painPauseThreshold ?? PAIN_FLOOR);
  const criteria = phase.reviewCriteria ?? [];

  const rows = criteria.flatMap((c) => (c.kind === 'numeric' ? [numericRow(c, phaseSessions)] : c.kind === 'swelling' ? [swellingRow(c, phaseSessions)] : []));
  const evidenceOf = (key: string) => {
    const c = criteria.find((x) => x.kind === 'clinicianCheck' && x.key === key);
    return c && c.kind === 'clinicianCheck' ? EVIDENCE_LABEL[c.evidence] : NO_EVIDENCE;
  };

  return {
    header: {
      pseudonymId,
      protocolId: protocol.id,
      phase: { id: phase.id, name: phase.name },
      reviewDate: phase.reviewDate ?? null,
      lastSessionDate: sorted.length ? (sorted[sorted.length - 1] as SessionRecord).date : null,
      sessionsSinceExport: since.length,
      generatedAt: now.toISOString(),
      banner: BANNER,
    },
    events: {
      redFlagBlocks: since.reduce((n, s) => n + s.redFlagBlocks, 0),
      gaveWayPresses: since.reduce((n, s) => n + s.gaveWayPresses, 0),
      painAtPause: since.filter((s) => [s.pain, betweenSetsMax(s)].some((v) => v != null && v >= painThreshold)).length,
      swellingMore: since.filter((s) => s.swelling === 'more').length,
    },
    rows,
    clinicianChecks: CLINICIAN_CHECKS.map((key) => ({ key, text: CHECK_TEXT[key], evidenceLabel: evidenceOf(key), answer: null })),
    painSwellingTable: phaseSessions.map((s) => ({
      sessionId: s.id, date: s.date, exercise: exerciseLabel(s.exercise), painText: painText(s), swelling: s.swelling,
    })),
  };
}

/** Every fixed text of the summary, with sample numbers in the templates. A test checks them for verdict words. */
export function allSummaryTexts(): string[] {
  const sample = (measure: Measure, op: 'atLeast' | 'atMost') =>
    MEASURE_TEXT[measure]({ kind: 'numeric', measure, exerciseId: 'mini-squat', op, limit: 3, lastSessions: 3, evidence: 'borrowed' });
  return [
    BANNER,
    ANGLE_LABEL,
    MARGIN_SOURCE,
    'plus or minus 9 degrees',
    'No value',
    swellingText,
    ...Object.values(STATE),
    ...Object.values(EVIDENCE_LABEL),
    NO_EVIDENCE,
    ...Object.values(EVENT_LABEL),
    ...Object.values(CHECK_TEXT),
    ...Object.values(LIMIT_UNIT),
    ...(['peakFlexionDeg', 'topFlexionDeg', 'painMax', 'sessionsDone'] as const).flatMap((m) => [sample(m, 'atLeast'), sample(m, 'atMost')]),
    'Answers: none 1, some 1, more than before 1',
    '3 of 3 sessions',
    `Plus or minus ${MARGIN_DEG} degrees`,
  ];
}
