// The progress check. Pure function: no React, no clock, no storage. It saves nothing and sets no phase (FR4).
// It reads the phase of the plan only as a property, to show it. It imports no save function.
// Design: docs/progression-evaluation-design.md, sections 3 to 5.
// It shows the numbers of the person next to published guidelines. It gives no verdict, no score, no total, no
// "n of N", no window size and no minimum session count. A number from a guideline carries its source and an
// EXACT audit row of research/citation-audit.md. Where the guideline has no number, the row says so.
// Every sentence of the output sits in T below, and allProgressTexts() lists them all.

import { classifyAgainstLimit, MARGIN_SOURCE, MARGIN_SOURCE_TEXT, type LimitState } from './margin';
import { contactReason } from './contactCard';
import { hasAngleChart, sortByDate } from './progress';
import { ANGLE, CHECK_TITLE, LAST_PLAN_WEEK, lastSessionLine, localDayOf, progressCard, sessionParts, weekLine, type SessionParts } from './progressHome';
import { dateWords, phaseName, PLAN_NAMES, weeksSince, weekWords } from './planView';
import { NOT_APPROVED } from './protocolGen';
import { PAIN_FLOOR } from './safety';
import { STATE } from './reviewSummary';
import type { Protocol } from './protocol/schema';
import type { SessionRecord, StoredInputs } from './storage';

/** S1 "knee flexion greater than 110°", audit row V100 (EXACT). S1 does not say if it is passive or active. */
const S1_FLEXION = 110;
/** Plan date to use when a plan has no `generated.on`: every session counts. */
const NO_PLAN_DATE = '0000-00-00';

export { ANGLE, LAST_PLAN_WEEK, lastSessionLine, localDayOf, progressCard };

export type RowType = 'measured' | 'reported' | 'cannot-measure';
export type RowId = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'E8' | 'E9' | 'E10' | 'E11' | 'E12';
export type EventKind = 'gave-way' | 'pain' | 'swelling' | 'red-flag';
export type Answer = 'yes' | 'no' | 'unknown';

export interface ProgressInput {
  /** Valid stored sessions (the screen reads them with readValidRows). */
  sessions: readonly SessionRecord[];
  /** The stored answers of the plan generator. null when none are stored. */
  inputs: StoredInputs | null;
  protocol: Protocol;
  /** The local calendar date of the device, as year-month-day (localIsoDate). */
  today: string;
  /** The two answers that the app does not store. Only a screen that just asked them passes them. */
  answers?: { walksWithoutCrutches?: Answer; legRaiseStraight?: Answer };
}

export interface SafetyEvent {
  kind: EventKind;
  /** The local calendar day of the session. */
  day: string;
  text: string;
}

export interface ProgressRow {
  id: RowId;
  type: RowType;
  title: string;
  /** In order: the number of the person, the criterion words, the source. Each entry is one text of T. */
  lines: string[];
  /** The margin state. null for a row with no limit, and when the data is not enough. */
  state: LimitState | null;
}

/** One measured number for the screen. The value is a number only: the app shows it next to the others and does not sort it. */
export interface MeasuredNumber {
  id: 'peak' | 'limit' | 'margin' | 'heel-peak' | 's1';
  label: string;
  value: number;
  unit: string;
  note?: string;
}

export interface ProgressCheck {
  /** The measured numbers of the last session next to the limit of the plan and the camera error. Empty when no angle is saved. */
  numbers: MeasuredNumber[];
  /** Safety events since the plan date, oldest first. A screen shows them before everything else. */
  events: SafetyEvent[];
  /** Whole weeks since surgery. null when the date is missing or in the future. */
  week: number | null;
  /** The week in plain words, for example "Week 2 (the third week after surgery)". null with no week. */
  weekText: string | null;
  /** The phase of the plan, as a property that the app only shows. */
  phase: string;
  /** The surgery date that the app uses, in plain words. null when the app has no date. */
  surgeryDate: string | null;
  /** Lines about the time that the person must read: no date, no plan after week 11, the clearance report. */
  notices: string[];
  /** The guideline lines about the weeks, with their sources. */
  guidelines: string[];
  /** The newest sessions, newest first. */
  recent: SessionParts[];
  rows: ProgressRow[];
  /** True when no session is stored. */
  noSessions: boolean;
  /** The line that every screen of the check shows. */
  notApproved: string;
}

// ---------------------------------------------------------------- the one place for every sentence

const times = (n: number): string => `${n} ${n === 1 ? 'time' : 'times'}`;

const lowerName = (kind: SessionRecord['exercise']): string => PLAN_NAMES[kind].toLowerCase();

const T = {
  notApproved: `${NOT_APPROVED}.`,
  // Time
  week: weekLine,
  noDate: 'The app has no date of your surgery. Open Update my plan to enter it.',
  phase1: 'Phase 1 covers weeks 0 to 6 (S1, P3).',
  phase2: 'Phase 2 starts from week 7. Week 7 is a boundary that the app sets. No guideline gives it. Time alone does not start phase 2.',
  clearance: 'You must report that your care team said you can start phase 2.',
  week4: 'P1 says: "Contact surgeon if ROM not trending towards 90° by 4 weeks" (audit row V12, EXACT). The app does not measure this.',
  noPlan: `The app has no plan after week ${LAST_PLAN_WEEK}. Contact your care team for your next plan.`,
  // Safety events
  gaveWay: (day: string) => `On ${day} you pressed "Knee gave way or hurts".`,
  pain: (day: string, v: number) => `On ${day} you reported pain ${v} out of 10.`,
  swelling: (day: string) => `On ${day} you reported swelling: more than before.`,
  redFlag: (day: string) => `On ${day} a red flag answer blocked the session.`,
  // Shared
  peak: (name: string, deg: number) => `Peak knee bend, ${name}, last session: ${deg} degrees (${ANGLE}).`,
  margin: (m: number, source: string) => `Camera error: plus or minus ${m} degrees. Source: ${source}.`,
  noNumber: (what: string) => `No number in the guideline for ${what}.`,
  cannot: 'The app cannot measure this. Ask your care team.',
  // E1
  e1Title: 'Knee bend, heel slide',
  e1None: 'No heel slide done yet',
  e1Criterion: `S1 lists knee flexion greater than ${S1_FLEXION} degrees. Source: S1, audit row V100 (EXACT).`,
  e1Passive: 'S1 does not say if this is a passive bend or an active bend.',
  e1Surgeon: (d: number) => `Your surgeon limit is ${d} degrees. This is lower than ${S1_FLEXION} degrees.`,
  // E2
  e2Title: 'Full knee extension',
  e2Criterion: 'S1 lists full knee extension. Source: S1, audit row V19 (EXACT).',
  // E3 and E4
  askedHere: 'The app does not keep this answer. You give it in Update my plan.',
  answer: (a: Answer) => `Your answer in Update my plan: ${a}.`,
  e3Title: 'Straight leg raise without extension lag',
  e3Criterion: 'S1 lists the straight leg raise without extension lag. Source: S1, audit row V100 (EXACT).',
  e3P2: 'P2 lists, for its phase: "less than or equal to 10 degrees of extensor lag". Source: P2, audit row V39 (EXACT). P2 is for ages 8 to 25.',
  e3Lag: 'The app cannot read an extension lag from a camera angle.',
  e4Title: 'Walking without crutches',
  e4Criterion: 'S1 lists walking without crutches. Source: S1, audit row V101 (EXACT).',
  // E5, E6, E7
  e5Title: 'Pain after a session',
  painEntry: (day: string, name: string, v: number) => `${day}, ${name}: pain ${v} out of 10 after the session.`,
  painWhat: 'pain after a session',
  e6Title: 'Pain during walking',
  e6Asked: 'The app asks pain after a session. P2 means pain during walking.',
  e6P2: 'P2 lists, for ages 8 to 25 and its phase: pain of 2 or less out of 10 during walking. Source: P2, audit row V52 (EXACT).',
  e6None: 'The app compares no number.',
  e7Title: 'Swelling',
  swellingList: (none: number, some: number, more: number) => `Swelling since your plan date: none ${times(none)}, some ${times(some)}, more than before ${times(more)}.`,
  swellingWhat: 'swelling',
  // E8
  e8Title: 'Safety events',
  e8None: 'No safety event since your plan date.',
  e8Listed: 'The safety events are listed at the top of this page.',
  pause: (n: number, clinician: boolean) => `Pain pause value: ${n} out of 10. Source: ${clinician ? 'the limit of your clinician' : 'app rule FR12, not a guideline value'}.`,
  e8Source: 'P2 lists red flags to report. Source: P2, audit row V55 (EXACT).',
  // E9
  e9Title: 'Reps and sets',
  repsSets: (name: string, list: string) => `Reps for each set, ${name}, last session: ${list}.`,
  reps: (name: string, n: number) => `Reps, ${name}, last session: ${n}.`,
  planDose: (sets: number, reps: number) => `Your plan: ${sets} ${sets === 1 ? 'set' : 'sets'} of ${reps}.`,
  e9P2: 'P2 gives 2 sets of 10-15 repetitions for strengthening exercises. Source: P2, audit row V49 (EXACT). P2 is for ages 8 to 25.',
  minReps: 'a minimum number of reps',
  // E10
  e10Title: 'Hold time',
  holdWhat: 'hold time',
  e10P2: 'P2 uses 10 seconds as a test of the straight leg raise and not as a dose. Source: P2, audit row V39 (EXACT).',
  // E11
  e11Title: 'Knee bend against the limit in your plan',
  planLimit: (d: number) => `Limit in your plan: ${d} degrees. The number comes from your plan, not from a guideline.`,
  noLimit: 'Your plan has no knee limit for this exercise.',
  // The measured numbers of the screen
  peakLabel: (name: string) => `Last peak knee bend, ${name}`,
  limitLabel: 'Limit in your plan',
  limitNote: 'The number comes from your plan, not from a guideline.',
  marginLabel: 'Camera error, plus or minus',
  marginNote: (source: string) => `Source: ${source}.`,
  s1Label: 'S1 lists knee flexion greater than',
  s1Note: 'Source: S1, audit row V100 (EXACT).',
  // E12
  e12Title: 'End of phase 2',
  e12Weeks: `S1 and P3 start the next stage at week ${LAST_PLAN_WEEK + 1}. Source: audit rows V3 and V4 (EXACT).`,
  e12Cannot: 'The app cannot measure the end of phase 2. Ask your care team.',
};

/** Every sentence that checkProgress can write, with sample values for the templates. Tests and the style check read this. */
export function allProgressTexts(): string[] {
  const names = (Object.keys(PLAN_NAMES) as SessionRecord['exercise'][]).map(lowerName);
  const answers: Answer[] = ['yes', 'no', 'unknown'];
  return [
    T.notApproved, T.week(8), T.noDate, T.phase1, T.phase2, T.clearance, T.week4, T.noPlan,
    T.gaveWay('2026-11-03'), T.pain('2026-11-04', 8), T.swelling('2026-11-05'), T.redFlag('2026-11-06'),
    ...names.map((n) => T.peak(n, 84)), T.margin(9, MARGIN_SOURCE_TEXT[MARGIN_SOURCE]), T.cannot,
    STATE.notEnough,
    T.e1Title, T.e1None, T.e1Criterion, T.e1Passive, T.e1Surgeon(90),
    T.e2Title, T.e2Criterion,
    T.askedHere, ...answers.map(T.answer), T.e3Title, T.e3Criterion, T.e3P2, T.e3Lag, T.e4Title, T.e4Criterion,
    T.e5Title, ...names.map((n) => T.painEntry('2026-11-05', n, 2)), T.noNumber(T.painWhat), T.e6Title, T.e6Asked, T.e6P2, T.e6None, T.e7Title, T.swellingList(3, 1, 0), T.swellingList(1, 2, 0), T.noNumber(T.swellingWhat),
    T.e8Title, T.e8None, T.e8Listed, T.pause(7, false), T.pause(5, true), T.e8Source,
    T.e9Title, ...names.map((n) => T.repsSets(n, '8, 8')), ...names.map((n) => T.reps(n, 10)), T.planDose(1, 10), T.planDose(2, 10), T.e9P2, T.noNumber(T.minReps),
    T.e10Title, T.noNumber(T.holdWhat), T.e10P2,
    T.e11Title, T.planLimit(90), T.noLimit,
    ...names.map(T.peakLabel), T.limitLabel, T.limitNote, T.marginLabel, T.marginNote(MARGIN_SOURCE_TEXT[MARGIN_SOURCE]), T.s1Label, T.s1Note,
    T.e12Title, T.e12Weeks, T.e12Cannot,
    ...Object.values(CHECK_SCREEN).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))),
    weekHead(0), weekHead(2), weekHead(11), weekWords(2),
    CHECK_SCREEN.update, progressCard(8),
    ...(Object.keys(PLAN_NAMES) as SessionRecord['exercise'][]).flatMap((kind) => {
      const base = { date: '2026-11-05T10:00:00.000Z', exercise: kind } as SessionRecord;
      return [lastSessionLine({ ...base, peakFlexion: 84, reps: 10, holdSeconds: null }), lastSessionLine({ ...base, peakFlexion: null, reps: 10, holdSeconds: null }),
        lastSessionLine({ ...base, peakFlexion: null, reps: null, holdSeconds: 10 }), lastSessionLine({ ...base, peakFlexion: null, reps: null, holdSeconds: null })];
    }),
  ];
}

// ---------------------------------------------------------------- the fixed strings of the screens

/** The fixed strings of the screen "Check my progress". allProgressTexts lists them, so the word checks cover them. */
export const CHECK_SCREEN = {
  title: CHECK_TITLE,
  lede: 'This page shows your numbers next to published guidelines. The app changes nothing until you press Confirm on a plan.',
  eventsTitle: 'Safety events since your plan date',
  weekLabel: 'Week',
  phaseLabel: 'Phase',
  dateLabel: 'Date of surgery used',
  dateHelp: 'If this date is not right, change it in Update my plan.',
  sessionsTitle: 'Your last sessions',
  noSessions: 'No session is saved yet.',
  checkTitle: 'What the app can check',
  moreTitle: 'Guidelines the app cannot measure',
  weeksTitle: 'Weeks and phases',
  types: { measured: 'Measured by the app', reported: 'Reported by you', 'cannot-measure': 'The app cannot measure this' } satisfies Record<RowType, string>,
  update: 'Update my plan',
  back: 'Back to Home',
  again: 'The app checks your plan again from the date of today and your answers. You confirm the change or keep your plan.',
  readError: 'The app cannot read your sessions. Go back and try again.',
  numbersTitle: 'Your last measured numbers',
  noAngle: 'No knee angle is saved yet.',
};

/** The week in plain words with a capital letter, for the top of the screen. */
export const weekHead = (week: number): string => {
  const w = weekWords(week);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}`;
};

/** The number of the newest sessions in the list and of the newest pain answers. The screen does not say the number. */
const SHOWN = 5;

// ---------------------------------------------------------------- dates

/** The sessions on or after the plan date, by local day. */
export const sessionsSince = (sessions: readonly SessionRecord[], since: string): SessionRecord[] => sessions.filter((s) => localDayOf(s.date) >= since);

// ---------------------------------------------------------------- the check

const highestPain = (s: SessionRecord): number | null => {
  const values = [s.pain, ...(s.setPain ?? [])].filter((v): v is number => typeof v === 'number');
  return values.length === 0 ? null : Math.max(...values);
};

function eventsOf(sessions: readonly SessionRecord[], threshold: number | undefined): SafetyEvent[] {
  return sortByDate(sessions).flatMap((s): SafetyEvent[] => {
    const day = localDayOf(s.date);
    const out: SafetyEvent[] = [];
    const reason = contactReason(s, threshold);
    if (reason?.kind === 'gave-way') out.push({ kind: 'gave-way', day, text: T.gaveWay(day) });
    if (reason?.kind === 'pain') out.push({ kind: 'pain', day, text: T.pain(day, highestPain(s) ?? 0) });
    if (reason?.kind === 'swelling') out.push({ kind: 'swelling', day, text: T.swelling(day) });
    if (s.redFlagBlocks > 0) out.push({ kind: 'red-flag', day, text: T.redFlag(day) });
    return out;
  });
}

/** The lines about the time, in two groups: what the person must read, and the guideline lines with their sources. */
function timeOf(week: number | null, phase: number): { notices: string[]; guidelines: string[] } {
  if (week === null) return { notices: [T.noDate], guidelines: [] };
  if (week > LAST_PLAN_WEEK) return { notices: [T.noPlan], guidelines: [] };
  return {
    notices: week >= 7 && phase < 2 ? [T.clearance] : [],
    guidelines: [T.phase1, T.phase2, ...(week >= 4 && week <= 6 ? [T.week4] : [])],
  };
}

const row = (id: RowId, type: RowType, title: string, lines: string[], state: LimitState | null = null): ProgressRow => ({ id, type, title, lines, state });

export function checkProgress(input: ProgressInput): ProgressCheck {
  const { sessions, inputs, protocol, today, answers } = input;
  const sorted = sortByDate(sessions);
  const noSessions = sorted.length === 0;
  const since = protocol.generated?.on ?? NO_PLAN_DATE;
  const inWindow = sessionsSince(sorted, since);
  const week = inputs?.surgeryDate ? weeksSince(inputs.surgeryDate, today) : null;
  const time = timeOf(week, protocol.activePhase);
  const events = eventsOf(inWindow, protocol.painPauseThreshold);
  const enough = (lines: () => string[]): string[] => (noSessions ? [STATE.notEnough] : lines());

  // The last session with a peak angle, and the limit of the plan for the same exercise.
  const phase = protocol.phases.find((p) => p.id === protocol.activePhase);
  const lastAngle = [...sorted].reverse().find((s) => s.peakFlexion !== null && hasAngleChart(s.exercise));
  const lastHeelSlide = [...sorted].reverse().find((s) => s.exercise === 'heel-slide' && s.peakFlexion !== null);
  const lastReps = [...sorted].reverse().find((s) => (s.repsPerSet?.length ?? 0) > 0 || s.reps !== null);

  // E1: the heel slide peak against the 110 degrees of S1, with the three margin states.
  const surgeonDeg = inputs?.surgeonLimit.kind === 'degrees' ? inputs.surgeonLimit.degrees : undefined;
  const e1State = lastHeelSlide ? classifyAgainstLimit(lastHeelSlide.peakFlexion, S1_FLEXION, lastHeelSlide.marginDeg) : null;
  const heelSlideDone = sorted.some((s) => s.exercise === 'heel-slide');
  const e1: ProgressRow = lastHeelSlide && e1State
    ? row('E1', 'measured', T.e1Title, [
      T.peak(lowerName('heel-slide'), Math.round(lastHeelSlide.peakFlexion as number)), T.margin(lastHeelSlide.marginDeg, MARGIN_SOURCE_TEXT[lastHeelSlide.marginSource]),
      T.e1Criterion, T.e1Passive, ...(surgeonDeg !== undefined && surgeonDeg < S1_FLEXION ? [T.e1Surgeon(surgeonDeg)] : []),
    ], e1State)
    : row('E1', 'measured', T.e1Title, [heelSlideDone ? STATE.notEnough : T.e1None, T.e1Criterion, T.e1Passive, ...(surgeonDeg !== undefined && surgeonDeg < S1_FLEXION ? [T.e1Surgeon(surgeonDeg)] : [])]);

  const asked = (a: Answer | undefined) => (a === undefined ? T.askedHere : T.answer(a));

  // E5 and E7: the answers since the plan date.
  const pains = inWindow.flatMap((s) => (s.pain === undefined ? [] : [T.painEntry(localDayOf(s.date), lowerName(s.exercise), s.pain)])).slice(-SHOWN);
  const swell = inWindow.flatMap((s) => (s.swelling === undefined ? [] : [s.swelling]));
  const count = (v: 'none' | 'some' | 'more') => swell.filter((x) => x === v).length;

  // E8: the pause value that the app uses.
  const clinicianPause = protocol.painPauseThreshold !== undefined && protocol.painPauseThreshold < PAIN_FLOOR;
  const pauseValue = clinicianPause ? (protocol.painPauseThreshold as number) : PAIN_FLOOR;

  // E9: reps of the last session next to the dose of the plan.
  const planned = lastReps ? phase?.exercises.find((e) => e.kind === lastReps.exercise) : undefined;
  const repsLine = !lastReps ? STATE.notEnough
    : (lastReps.repsPerSet?.length ?? 0) > 0 ? T.repsSets(lowerName(lastReps.exercise), (lastReps.repsPerSet as number[]).join(', '))
      : T.reps(lowerName(lastReps.exercise), lastReps.reps as number);

  // E11: the last peak angle against the limit that the plan holds.
  const limit = lastAngle ? phase?.exercises.find((e) => e.kind === lastAngle.exercise)?.maxFlexion : undefined;
  const e11State = lastAngle && limit !== undefined ? classifyAgainstLimit(lastAngle.peakFlexion, limit, lastAngle.marginDeg) : null;
  const e11: ProgressRow = !lastAngle ? row('E11', 'measured', T.e11Title, [STATE.notEnough])
    : limit === undefined || e11State === null
      ? row('E11', 'measured', T.e11Title, [T.peak(lowerName(lastAngle.exercise), Math.round(lastAngle.peakFlexion as number)), T.noLimit])
      : row('E11', 'measured', T.e11Title, [
        T.peak(lowerName(lastAngle.exercise), Math.round(lastAngle.peakFlexion as number)), T.planLimit(limit),
        T.margin(lastAngle.marginDeg, MARGIN_SOURCE_TEXT[lastAngle.marginSource]),
      ], e11State);

  const rows: ProgressRow[] = [
    e1,
    row('E2', 'cannot-measure', T.e2Title, [T.cannot, T.e2Criterion]),
    row('E3', 'reported', T.e3Title, [asked(answers?.legRaiseStraight), T.e3Criterion, T.e3P2, T.e3Lag]),
    row('E4', 'reported', T.e4Title, [asked(answers?.walksWithoutCrutches), T.e4Criterion]),
    row('E5', 'reported', T.e5Title, [...(pains.length === 0 ? [STATE.notEnough] : pains), T.noNumber(T.painWhat)]),
    row('E6', 'reported', T.e6Title, [T.e6Asked, T.e6P2, T.e6None]),
    row('E7', 'reported', T.e7Title, [swell.length === 0 ? STATE.notEnough : T.swellingList(count('none'), count('some'), count('more')), T.noNumber(T.swellingWhat)]),
    row('E8', 'measured', T.e8Title, [...enough(() => [events.length === 0 ? T.e8None : T.e8Listed]), T.pause(pauseValue, clinicianPause), T.e8Source]),
    row('E9', 'measured', T.e9Title, [repsLine, ...(planned?.sets !== undefined && planned.reps !== undefined ? [T.planDose(planned.sets, planned.reps)] : []), T.e9P2, T.noNumber(T.minReps)]),
    row('E10', 'cannot-measure', T.e10Title, [T.noNumber(T.holdWhat), T.e10P2]),
    e11,
    row('E12', 'cannot-measure', T.e12Title, [T.e12Weeks, T.e12Cannot]),
  ];

  const numbers: MeasuredNumber[] = [];
  if (lastAngle) {
    numbers.push({ id: 'peak', label: T.peakLabel(lowerName(lastAngle.exercise)), value: Math.round(lastAngle.peakFlexion as number), unit: 'degrees', note: ANGLE });
    if (limit !== undefined) numbers.push({ id: 'limit', label: T.limitLabel, value: limit, unit: 'degrees', note: T.limitNote });
    numbers.push({ id: 'margin', label: T.marginLabel, value: lastAngle.marginDeg, unit: 'degrees', note: T.marginNote(MARGIN_SOURCE_TEXT[lastAngle.marginSource]) });
  }
  if (lastHeelSlide) {
    if (lastAngle?.exercise !== 'heel-slide') numbers.push({ id: 'heel-peak', label: T.peakLabel(lowerName('heel-slide')), value: Math.round(lastHeelSlide.peakFlexion as number), unit: 'degrees', note: ANGLE });
    numbers.push({ id: 's1', label: T.s1Label, value: S1_FLEXION, unit: 'degrees', note: T.s1Note });
  }

  return {
    numbers, events, week, weekText: week === null ? null : weekHead(week), phase: phaseName(protocol),
    surgeryDate: inputs?.surgeryDate && weeksSince(inputs.surgeryDate, '9999-12-31') !== null ? dateWords(inputs.surgeryDate) : null,
    ...time, recent: [...sorted].reverse().slice(0, SHOWN).map(sessionParts), rows, noSessions, notApproved: T.notApproved,
  };
}
