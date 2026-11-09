// The rules data of the protocol generator. Every rule is data, with a source id, a grade and a population note.
// The generator reads its numbers from `values`. No number sits in generate.ts.
// Option C (decision of the user, 2026-11-08): the generator infers every value that the verified
// knowledge base supports, with source, grade and caveat. Where sources disagree it takes the more
// conservative value. Where the knowledge base says NONE it generates nothing and says "Ask your surgeon".
// It never invents a number.

import { MARGIN_DEG } from '../margin';
import type { Grade, SourceId } from './sources';

export type RuleKind =
  | 'structure' // the window and the phases
  | 'generated' // a value or an exercise that the sources support
  | 'protective' // a refusal that a source supports
  | 'surgeonValue' // a number that the surgeon gave and the person entered
  | 'engineering' // a camera value, not a clinical one
  | 'appRule' // an app rule with no source value
  | 'none' // the knowledge base has no value: nothing is generated
  | 'referral'; // the app makes no plan

export interface Rule {
  id: string;
  title: string;
  kind: RuleKind;
  /** Every number that the rule can put in a plan. Empty when the rule gives no number. */
  values: Readonly<Record<string, number>>;
  /** Protocol fields that carry a number that the person entered. */
  personEntered?: readonly string[];
  sourceIds: readonly SourceId[];
  grade: Grade;
  population: string;
  /** What the app does when the sources disagree. */
  conservative?: string;
  /** Why an engineering value or a NONE value is built this way. */
  reason?: string;
  flag?: 'clinical-review-needed';
  /** One plain sentence for the screen "Why this plan". */
  text: string;
  referralText?: string;
}

export const NOT_APPROVED = 'Not approved by a clinician';
export const ASK_SURGEON = 'Ask your surgeon';
export const REFERRAL_LINE = 'The app cannot make a plan for you.';

const ADULT_ISO = 'Adults after a first, isolated MPFL reconstruction. The sources state no age limit.';
const P2_POPULATION = 'Ages 8 to 25 after isolated soft-tissue knee surgery. Not studied in adults after MPFL reconstruction.';

const defs = {
  // Structure
  W1: {
    title: 'Plan window',
    kind: 'structure',
    values: { firstWeek: 0, lastWeek: 11 },
    sourceIds: ['S1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative: 'S1 puts the next stage at 12 to 16 weeks. P3 ends the second stage at 12 weeks. The app stops at week 11.',
    text: 'The app makes a plan only for weeks 0 to 11 after surgery. It makes no plan from week 12.',
  },
  PH1: {
    title: 'Phase 1',
    kind: 'structure',
    values: { firstWeek: 0, lastWeek: 6 },
    sourceIds: ['S1', 'P1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative: 'P3 splits the first stage at week 2. The app keeps one phase.',
    text: 'Phase 1 covers weeks 0 to 6 after surgery.',
  },
  PH2: {
    title: 'Phase 2',
    kind: 'structure',
    values: { firstWeek: 7 },
    sourceIds: ['S1', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'S1 starts the next stage at week 6 and P1 at week 7. The app takes week 7. Time alone never starts phase 2. You must report that your care team said you can start it.',
    text: 'Phase 2 starts from week 7. It needs your report that your care team said you can start the next stage.',
  },
  // Exercises
  SLR: {
    title: 'Straight leg raise',
    kind: 'generated',
    values: {},
    sourceIds: ['S1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'The straight leg raise is in phase 1 and phase 2. S1 says to start it right after surgery.',
  },
  HEEL: {
    title: 'Heel slide',
    kind: 'protective',
    values: {},
    sourceIds: ['S1', 'P3', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'S1 and P3 start the heel slide in phase 1. P1 starts it in phase 2. The app takes the later start, unless you enter a knee-bend limit from your surgeon.',
    text: 'The heel slide is in phase 1 only with a knee-bend limit from your surgeon. In phase 2 it needs that limit, or the answer no limit.',
  },
  SQUAT: {
    title: 'Mini squat',
    kind: 'protective',
    values: {},
    sourceIds: ['P3', 'N3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P3 starts the mini squat at week 2 and N3 in weeks 0 to 6. No source gives an agreed start or an agreed depth for these weeks. The app adds none.',
    text: 'The app adds no mini squat in weeks 0 to 11. Published plans start it at different times.',
  },
  HOLD: {
    title: 'Seated knee hold',
    kind: 'protective',
    values: {},
    sourceIds: ['P2', 'P1', 'P3'],
    grade: 'OPINION',
    population: P2_POPULATION,
    conservative:
      'P2 and P1 avoid active knee extension against the weight of the leg in the first weeks. P3 allows it from week 2. The app takes the stricter rule.',
    text: 'The app adds no seated knee hold in weeks 0 to 11. P1 and P2 avoid straightening the knee against the weight of the leg.',
  },
  DOSE: {
    title: 'Dose of the strengthening exercise',
    kind: 'generated',
    values: { sets: 2, reps: 10 },
    sourceIds: ['P2'],
    grade: 'OPINION',
    population: P2_POPULATION,
    conservative: 'P2 gives 2 sets of 10 to 15 repetitions, then 3 sets as tolerated. The app takes the lowest bound: 2 sets of 10.',
    text: 'The straight leg raise gets 2 sets of 10 repetitions. This is the lowest bound of the start dose in P2.',
  },
  DOSE_NONE: {
    title: 'Dose of the heel slide',
    kind: 'none',
    values: {},
    sourceIds: ['P2', 'RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'P2 gives a dose for strengthening exercises only. No source gives a dose for the heel slide.',
    text: 'The app sets no dose for the heel slide. Ask your care team how many to do.',
  },
  // Range
  RANGE_NONE: {
    title: 'Knee-bend ceiling',
    kind: 'none',
    values: {},
    sourceIds: ['P2', 'P1', 'S1', 'N3'],
    grade: 'NONE',
    population: 'Not applicable',
    reason:
      'The P2 values of 90 and 120 degrees are passive range targets. P1 has no explicit cap. S1 says "Typically" and describes practice. N3 gives passive flexion above 125 degrees. None of these is a ceiling for an active camera angle.',
    text: 'The app sets no knee-bend limit of its own. Ask your surgeon for your limit.',
  },
  RANGE_SURGEON: {
    title: 'Knee-bend limit of the surgeon',
    kind: 'surgeonValue',
    values: {},
    personEntered: ['maxFlexion'],
    sourceIds: ['P1'],
    grade: 'NONE',
    population: 'Any. The number comes from the surgeon of the person, as entered by the person.',
    text: 'The knee-bend limit in the heel slide is the limit from your surgeon, as entered by you. The app can only lower a limit.',
  },
  // Engineering values
  ENG_TARGET: {
    title: 'Where the heel slide count starts',
    kind: 'engineering',
    values: { targetFlexion: 2 * MARGIN_DEG, minLimit: 3 * MARGIN_DEG + 1 },
    sourceIds: ['F1', 'F3'],
    grade: 'ENGINEERING',
    population: 'Camera error from 20 healthy adults in still photos (F1). Error on exercise video is larger (F3).',
    reason:
      'Twice the camera margin is the smallest knee bend that the camera tells from rest. It is not a range target. The schema needs a limit of at least 3 margins plus 1 degree.',
    flag: 'clinical-review-needed',
    text: 'The app starts counting a heel slide rep at 2 times the camera margin. It is an engineering value. It is not a range for your knee.',
  },
  ENG_RETURN: {
    title: 'Return tolerance of the heel slide',
    kind: 'engineering',
    values: { returnWithinDeg: MARGIN_DEG },
    sourceIds: ['F1', 'F3'],
    grade: 'ENGINEERING',
    population: 'Camera error from 20 healthy adults in still photos (F1). Error on exercise video is larger (F3).',
    reason: 'A rep ends when the knee is back within the camera margin of the resting angle. A clinician must confirm that this is not a clinical value.',
    flag: 'clinical-review-needed',
    text: 'A heel slide rep ends when the knee is back within the camera margin of rest. It is an engineering value.',
  },
  // Review
  REVIEW: {
    title: 'Review dates and checks',
    kind: 'generated',
    values: { phase1Weeks: 6, phase2Weeks: 12 },
    sourceIds: ['S1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'The review date of phase 1 is 6 weeks after surgery, and of phase 2 is 12 weeks. The checks are for your clinician and hold no number.',
  },
  // App rule
  PAIN: {
    title: 'Pain and swelling pause',
    kind: 'appRule',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason:
      'No MPFLR source gives a numeric stop. The value 7 of the FR12 floor is an app rule with no source. The plan sets no pain threshold, so the floor applies.',
    flag: 'clinical-review-needed',
    text: 'The plan sets no pain threshold. The pause rule of the app stays: pain of 7 or more, or swelling more than before.',
  },
  // Values that stay NONE
  NONE_WB_BRACE: {
    title: 'Weight-bearing and brace',
    kind: 'none',
    values: {},
    sourceIds: ['N1', 'S10'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'N1 found no consensus on immobilization or weight-bearing. S10 gives counts of practice only.',
    text: 'The plan sets no weight-bearing rule and no brace. Ask your surgeon.',
  },
  NONE_FREQ: {
    title: 'Session frequency',
    kind: 'none',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'No guideline or review read in the knowledge base gives a session frequency for exercise after MPFL reconstruction.',
    text: 'The plan sets no number of sessions. Ask your care team.',
  },
  NONE_TEMPO: {
    title: 'Repetition tempo',
    kind: 'none',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'No MPFLR source gives a tempo.',
    text: 'The plan sets no repetition time. Ask your care team.',
  },
  NONE_HOLDTIME: {
    title: 'Hold time',
    kind: 'none',
    values: {},
    sourceIds: ['RR', 'P2'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'The 10 seconds of P2 is a test of the straight leg raise and not a dose.',
    text: 'The plan sets no hold time. Ask your care team.',
  },
  NONE_PAIN_STOP: {
    title: 'Numeric pain or swelling stop',
    kind: 'none',
    values: {},
    sourceIds: ['RR', 'P2'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'No MPFLR source gives a numeric stop. The pain value of 2 in P2 is a phase target for walking and is not a stop rule.',
    text: 'The plan sets no pain stop beyond the pause rule of the app. Ask your care team.',
  },
  NONE_VALGUS: {
    title: 'Knee valgus threshold',
    kind: 'none',
    values: {},
    sourceIds: ['RR', 'S1'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'S1 says to monitor valgus and gives no number. The knowledge base marks a 2D frontal angle as not reliable.',
    text: 'The app checks no knee valgus. Ask your care team.',
  },
  NONE_REVISION: {
    title: 'Revision surgery',
    kind: 'none',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'No rehab source for revision surgery was found.',
    text: 'The app makes no plan after a repeat surgery. Ask your surgeon.',
  },
  NONE_GRAFT: {
    title: 'Graft strain',
    kind: 'none',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'The knowledge base holds no graft strain value for rehab.',
    text: 'The app sets no limit from graft strain. Ask your surgeon.',
  },
  // Referral cases. The order of checks is in generate.ts.
  R1: {
    title: 'A written care-team plan',
    kind: 'referral',
    values: {},
    sourceIds: ['S1', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'S1 says progress follows the protocol of the surgeon. P1 says to avoid range beyond the guidelines of the surgeon.',
    referralText: `${REFERRAL_LINE} Your care team plan comes first. Ask your care team for a plan file to load.`,
  },
  R2: {
    title: 'Combined or unknown procedure',
    kind: 'referral',
    values: {},
    sourceIds: ['P2', 'P1', 'S10'],
    grade: 'OPINION',
    population: 'MPFL reconstruction with a bone or cartilage procedure.',
    text: 'P2 excludes realignment surgery. P1 says to follow the most conservative guideline. S10 reports slower plans after a bone procedure.',
    referralText: `${REFERRAL_LINE} The app makes plans only after MPFL reconstruction with no other procedure. Contact your care team for your plan.`,
  },
  R3: {
    title: 'Age under 18',
    kind: 'referral',
    values: {},
    sourceIds: ['G2', 'P2'],
    grade: 'OPINION',
    population: 'Young patients. P2 covers ages 8 to 25 and G2 reviews pediatric guidelines.',
    text: 'Guidelines for young patients vary a lot (G2). The app makes plans only for adults.',
    referralText: `${REFERRAL_LINE} The app makes plans only for adults. Contact your care team for your plan.`,
  },
  R4: {
    title: 'Both knees',
    kind: 'referral',
    values: {},
    sourceIds: ['S13'],
    grade: 'STUDY',
    population: 'Young patients after MPFL reconstruction, 179 knees.',
    text: 'S13 found that surgery on both knees was a risk factor for complications.',
    referralText: `${REFERRAL_LINE} The app makes plans only for one knee. Contact your care team for your plan.`,
  },
  R5: {
    title: 'Repeat or unknown surgery',
    kind: 'referral',
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    text: 'The knowledge base has no rehab source for repeat surgery.',
    referralText: `${REFERRAL_LINE} The app makes plans only after a first MPFL surgery on this knee. Contact your care team for your plan.`,
  },
  R6: {
    title: 'Special surgeon rules',
    kind: 'referral',
    values: {},
    sourceIds: ['N10'],
    grade: 'REVIEW',
    population: 'MPFL reconstruction. Knee anatomy can raise the risk of recurrence.',
    text: 'N10 links knee anatomy to recurrence. The surgeon knows the anatomy and the app does not.',
    referralText: `${REFERRAL_LINE} Your surgeon gave rules that the app cannot use. Contact your care team for your plan.`,
  },
  R7: {
    title: 'No valid date of surgery',
    kind: 'referral',
    values: {},
    sourceIds: ['S1'],
    grade: 'ENGINEERING',
    population: 'Not applicable',
    reason: 'The phases of S1 are in weeks after surgery. Without a valid date the app cannot count weeks.',
    text: 'The app needs the date of surgery to count the weeks.',
    referralText: `${REFERRAL_LINE} The app needs the date of your surgery. Ask your care team.`,
  },
  R8: {
    title: 'Red flag',
    kind: 'referral',
    values: {},
    sourceIds: ['P2'],
    grade: 'OPINION',
    population: P2_POPULATION,
    text: 'P2 lists signs that the therapist reports to the surgeon. The app makes no plan after a red flag.',
    referralText: REFERRAL_LINE,
  },
  R9: {
    title: 'Pain or swelling pause',
    kind: 'referral',
    values: {},
    sourceIds: ['P3', 'RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'P3 says progress follows pain and swelling. No source gives a number, so the FR12 floor of the app applies.',
    text: 'The pause rule of the app applies. The app makes no plan after a pause.',
    referralText: REFERRAL_LINE,
  },
  R10: {
    title: 'Week 12 or later',
    kind: 'referral',
    values: {},
    sourceIds: ['S1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'The next stage of S1 and P3 starts at week 12. The content of that stage is not in the app.',
    referralText: `${REFERRAL_LINE} The app has no plan after week 11. Contact your care team for your next plan.`,
  },
  RX: {
    title: 'Fail closed',
    kind: 'referral',
    values: {},
    sourceIds: ['DESIGN'],
    grade: 'ENGINEERING',
    population: 'Not applicable',
    reason: 'Any exception and any schema failure give a referral. The generator never gives a plan that it cannot check.',
    text: 'The generator found an error or an invalid plan, so it makes no plan.',
    referralText: `${REFERRAL_LINE} Contact your care team.`,
  },
} satisfies Record<string, Omit<Rule, 'id'>>;

export type RuleId = keyof typeof defs;

export const RULE_IDS = Object.keys(defs) as RuleId[];

// The type keeps the literal keys of `values`, so a missing value is a compile error.
type Typed = { [K in RuleId]: Omit<Rule, 'id' | 'values'> & { id: K; values: (typeof defs)[K]['values'] } };

export const RULES = Object.fromEntries(RULE_IDS.map((id) => [id, { id, ...defs[id] }])) as unknown as Typed;
