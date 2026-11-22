import { MARGIN_DEG } from '../margin';
import { generatorExtendedOn } from '../mode';
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
  values: Readonly<Record<string, number>>;
  personEntered?: readonly string[];
  sourceIds: readonly SourceId[];
  grade: Grade;
  population: string;
  conservative?: string;
  reason?: string;
  flag?: 'clinical-review-needed';
  auditRows?: readonly string[];
  appOwn?: true;
  display?: {
    population?: string;
    value: string;
    cite: string;
    evidence: string;
    disagree?: string;
  };
  textRefused?: string;
  text: string;
  referralText?: string;
}

export const NOT_APPROVED = 'Not approved by a clinician';
export const ASK_SURGEON = 'Ask your surgeon';
export const REFERRAL_LINE = 'The app cannot make a plan for you.';

const ADULT_ISO = 'Adults after a first, isolated MPFL reconstruction. The sources state no age limit.';
const P2_POPULATION = 'Ages 8 to 25 after isolated soft-tissue knee surgery. Not studied in adults after MPFL reconstruction.';

export const RANGE_REFERENCE =
  'Knee bend limit by week: no number in the guideline. Typical practice: start at 0 to 30 degrees in the first or second week and progress by 20 to 30 degrees per week. This is not a limit and not your plan. Your surgeon sets your limit.';

export const NO_NUMBER = 'No number in the guideline.';

export function romCheckText(week: number): string {
  const first = 'Your care team checks your knee bend at about 4 weeks after surgery (P1).';
  if (week < 4) return `${first} The check is about ${4 - week} ${4 - week === 1 ? 'week' : 'weeks'} from now. If no check is planned, contact your care team.`;
  if (week === 4) return `${first} The check is now. If no check is planned, contact your care team.`;
  return `${first} The check is due now or past. If you did not have it, contact your care team.`;
}

export const phaseOneStaysText = (week: number): string =>
  `Your plan is still phase 1. You are in week ${week}. Phase 2 needs the report that your care team cleared you. Contact your care team.`;

export const DOSE_SHOWN = '2 sets of 10 to 15, then 3 sets as tolerated';

const defs = {
  W1: {
    title: 'Plan window',
    kind: 'structure',
    values: { firstWeek: 0, lastWeek: 11 },
    auditRows: ['V3', 'V4'],
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
    auditRows: ['V3', 'V4'],
    sourceIds: ['S1', 'P1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative: 'P3 splits the first stage at week 2. The app keeps one phase.',
    text: 'Phase 1 covers weeks 0 to 6 after surgery.',
  },
  PH2: {
    title: 'Phase 2',
    kind: 'structure',
    appOwn: true,
    values: { firstWeek: 7 },
    auditRows: ['V3'],
    sourceIds: ['S1', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'S1 lists the second stage as 6-12 weeks. Week 7 is a boundary that the app sets. Time alone never starts phase 2. You must report that your care team said you can start it.',
    text: 'Phase 2 starts from week 7, a boundary that the app sets. It needs your report that your care team said you can start the next stage.',
  },
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
    auditRows: ['V36'], // S1 and P3 start the heel slide in phase 1. Row V37 (P1) is WRONG and holds no quote here: P1 starts it in phase 2.
    sourceIds: ['S1', 'P3', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'S1 and P3 start the heel slide in phase 1. P1 starts it in phase 2. The app takes the later start, unless you enter a knee-bend limit from your surgeon.',
    get text() {
      return generatorExtendedOn()
        ? 'The heel slide is in phase 1 only with a knee-bend limit from your surgeon. In phase 2 it is in your plan with a limit, with no limit, or when you do not know a limit.'
        : 'The heel slide is in phase 1 only with a knee-bend limit from your surgeon. In phase 2 it is in your plan with that limit, or with no limit. When the limit is unknown, it is left out.';
    },
  },
  HEEL_P2_UNKNOWN: {
    title: 'Heel slide in phase 2 with an unknown limit',
    kind: 'generated',
    values: {},
    sourceIds: ['P1', 'S1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'The phase 2 rules of P1 do not repeat the limit of the surgeon. S1 and P3 expect full range in this stage. The app sets no ceiling. If your surgeon gave you a limit, enter it. The app then uses it.',
    text: 'In phase 2 the heel slide is in your plan also when you do not know a limit. If your surgeon gave you a limit, enter it. P1 starts the heel slide only when the knee has bent far enough. The app cannot check this. Ask your care team.',
  },
  HOME: {
    title: 'Home exercises that the camera does not count',
    kind: 'generated',
    values: {},
    sourceIds: ['S1', 'P1', 'P2', 'P3', 'N3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'Quadriceps sets, gluteal sets and leg raises to the side and to the back are in your plan. The app does not check them.',
  },
  ANKLE: {
    title: 'Ankle pumps',
    kind: 'generated',
    values: {},
    auditRows: ['V109', 'V4'],
    sourceIds: ['P1', 'P3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P1 names ankle pumps in its pre-operative and acute care home plan. P3 names them in weeks 0 to 2. The app adds them in phase 1 and not in phase 2.',
    text: 'Ankle pumps are in phase 1. The app sets no number of repetitions for them.',
  },
  ROM_CHECK: {
    title: 'Check of your knee bend at about 4 weeks',
    kind: 'generated',
    values: {},
    auditRows: ['V12'],
    sourceIds: ['P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'Your care team checks your knee bend at about 4 weeks after surgery (P1). If no check is planned, contact your care team.',
  },
  PT_VISITS: {
    title: 'Physiotherapy visits',
    kind: 'generated',
    values: {},
    auditRows: ['V111'],
    sourceIds: ['P2'],
    grade: 'OPINION',
    population: P2_POPULATION,
    text: 'Published guidelines expect physiotherapy visits about 2 to 3 times each week (P2). This is not a number of home sessions.',
  },
  SQUAT: {
    title: 'Mini squat in weeks 0 to 6',
    kind: 'protective',
    values: {},
    auditRows: ['V41', 'V117', 'V95', 'V4'],
    sourceIds: ['P1', 'P3', 'N3', 'P2'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P3 starts the mini squat at week 2. N3 and P2 list it in the first weeks. P1 starts free squats at week 12. No source gives an agreed start for these weeks. The app adds none.',
    text: 'The app adds no mini squat in weeks 0 to 6. Published plans start it at different times.',
  },
  SQUAT_P2: {
    title: 'Mini squat from week 7',
    kind: 'generated',
    values: {},
    auditRows: ['V41', 'V96', 'V108', 'V117'],
    sourceIds: ['P3', 'P2', 'N3', 'S1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P3 lists the mini squat in its second stage. N3 lists squats in weeks 6 or 8 to 12. P1 names sit to stand and the leg press in its second phase and starts free squats at week 12. The app starts at week 7, after the clearance answer and both answers about walking and the leg raise.',
    textRefused:
      'The mini squat is not in your plan. It needs your report that your care team said you can start the next stage. It also needs a yes to both answers about walking and the leg raise, and no knee that gave way. P3 lists the mini squat in its second stage. P1 starts free squats later, at week 12. Ask your care team.',
    text: 'From week 7, after your care team said you can start the next stage, the mini squat is in your plan. P1 starts free squats later, at week 12.',
  },
  SQUAT_DEPTH: {
    title: 'Depth limit of the mini squat',
    kind: 'generated',
    values: { maxFlexion: 50 },
    personEntered: ['maxFlexion'], // only a lower number from the surgeon, as entered by the person
    auditRows: ['V95', 'V116', 'V119', 'V117'],
    sourceIds: ['N3', 'S16', 'P2'],
    grade: 'OPINION',
    population: 'N3: MPFL reconstruction, weeks 0 to 6. S16: 18 healthy people, a lab study. The sources give no depth for weeks 7 to 11.',
    conservative:
      'N3 gives a mini squat range of 0 to 50 degrees in the first weeks and gives no depth later. S16 gives the same range for healthy people. P2 starts wall squats at 45 degrees and goes deeper later. The sources disagree and none gives a depth for weeks 7 to 11. The app takes 50 degrees. A limit from your surgeon can only lower it.',
    display: {
      value: 'Depth limit 50 degrees of estimated knee bend. A limit from your surgeon can only lower it.',
      cite: 'Hysing-Dahl, 2024, N3 Table 1 (mini squats 0 to 50 degrees, weeks 0 to 6). Escamilla, 2009, S16 (0 to 50 degrees, healthy people)',
      evidence: 'OPINION (level 5)',
      disagree:
        "Cincinnati Children's, 2015, P2 starts wall squats at 45 degrees and goes to higher and lower levels of flexion. HSS, 2024, P1 starts free squats at week 12. No source gives a depth for weeks 7 to 11.",
    },
    text: 'The mini squat stops at 50 degrees of estimated knee bend (N3). A limit from your surgeon can only lower it.',
  },
  SQUAT_GATE: {
    title: 'Answers needed for the mini squat',
    kind: 'protective',
    values: {},
    auditRows: ['V55', 'V100', 'V101', 'V107'],
    sourceIds: ['S1', 'P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'S1 lists a straight leg raise with no extension lag and walking without crutches as checks at the end of the first stage. P1 asks for an active quadriceps contraction in the leg raise before the leg press. A knee that gave way removes the mini squat (P2 rec 4, irritability of the knee).',
    text: 'The mini squat needs your report that you walk without crutches and lift your leg without the knee bending. The app does not check this. Reported by you. Not checked by the app.',
  },
  HOLD: {
    title: 'Seated knee hold without a clearance',
    kind: 'protective',
    values: {},
    auditRows: ['V106', 'V45', 'V4'],
    sourceIds: ['P2', 'P1', 'P3'],
    grade: 'OPINION',
    population: P2_POPULATION,
    conservative:
      'P2 and P1 avoid active knee extension against the weight of the leg in the first weeks. P3 allows it from week 2. The app takes the stricter rule.',
    text: 'The app adds no seated knee hold in weeks 0 to 6, and none from week 7 without your report that your surgeon cleared it. P1 and P2 avoid straightening the knee against the weight of the leg.',
  },
  HOLD_ARC_LIMIT: {
    title: 'Seated knee hold with a low knee-bend limit',
    kind: 'protective',
    values: {},
    auditRows: ['V105'],
    sourceIds: ['P1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative: 'P1 gives an arc of 90 to 40 degrees. A knee-bend limit below 90 degrees leaves no part of the arc that the surgeon allows.',
    text: 'The seated hold is not in your plan because the knee-bend limit your surgeon gave is below the start of the guideline arc (90 degrees).',
  },
  HOLD_P2: {
    title: 'Seated knee hold in a limited arc',
    kind: 'generated',
    values: { minFlexion: 40, arcStart: 90 },
    auditRows: ['V105', 'V114'],
    sourceIds: ['P1', 'P2'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P1 gives an arc of 90 to 40 degrees in phase 2 and follows the preference of the surgeon. P2 gives 90 to 30 degrees in a Note. The app takes 40 degrees, the more bent end. The knee never goes straight.',
    display: {
      value: 'Arc from 90 to 40 degrees of knee bend. The knee never goes straight. No hold time.',
      cite: 'Hospital for Special Surgery, 2024, P1 phase 2 (open chain strengthening in a limited arc of motion, 90-40 degrees)',
      evidence: 'OPINION (level 5)',
      disagree: "Cincinnati Children's, 2015, P2 gives 90 to 30 degrees, in a Note.",
    },
    text: 'From week 7, after you report that your surgeon cleared it, the seated hold stays between 90 and 40 degrees of knee bend (P1). The app sets no hold time.',
  },
  EXTENDED_OFF: {
    title: 'Held back: mini squat, seated hold and heel slide with an unknown limit',
    kind: 'protective',
    values: {},
    auditRows: ['V117', 'V110', 'V96'],
    sourceIds: ['P1', 'P3', 'N3'],
    grade: 'OPINION',
    population: ADULT_ISO,
    conservative:
      'P3 lists mini squats in its second stage. P1 starts free squats at week 12. No source gives a depth or the answers for a mini squat in weeks 7 to 11.',
    text: 'The app adds no mini squat, no seated hold and no heel slide for an unknown limit. Ask your care team about these exercises.',
  },
  ENG_HOLD: {
    title: 'Hold angle of the seated hold',
    kind: 'engineering',
    values: { targetFlexion: 40 + 2 * MARGIN_DEG },
    sourceIds: ['F1', 'F3'],
    grade: 'ENGINEERING',
    population: 'Camera error from healthy adults in still photos (F1). Error on exercise video is larger (F3).',
    reason:
      'The hold angle is the arc end of 40 degrees plus twice the camera margin. The schema needs a hold angle of more than the arc end plus one margin. It is not a range target.',
    flag: 'clinical-review-needed',
    text: 'The app counts the hold at the arc end plus 2 times the camera margin. It is an engineering value and not a range for your knee.',
  },
  DOSE: {
    title: 'Dose of the strengthening exercise',
    kind: 'generated',
    values: { sets: 2, reps: 10 },
    auditRows: ['V49'],
    sourceIds: ['P2'],
    grade: 'OPINION',
    population: P2_POPULATION,
    conservative:
      'P2 gives 2 sets of 10 to 15 repetitions, then 3 sets as tolerated. The plan shows the whole range. The field in the plan holds the start of the range, 2 sets of 10. P2 is for ages 8 to 25. No study gives a dose for adults after MPFL reconstruction.',
    display: {
      value: DOSE_SHOWN,
      cite: "Cincinnati Children's Hospital Medical Center, 2015, Evidence-Based Care Guideline 46, rec 26",
      evidence: 'OPINION (level 5)',
    },
    text: `Every strengthening exercise in your plan starts at ${DOSE_SHOWN} (P2). P2 says this dose applies to all strengthening exercises. P2 is for ages 8 to 25. No study gives a dose for adults after MPFL reconstruction.`,
  },
  DOSE_NONE: {
    title: 'Dose of the heel slide and the ankle pump',
    kind: 'none',
    values: {},
    sourceIds: ['P2', 'RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason: 'P2 gives a dose for strengthening exercises only. No source gives a dose for the heel slide or the ankle pump.',
    text: 'The app sets no dose for the heel slide and the ankle pump. Ask your care team how many to do.',
  },
  RANGE_NONE: {
    title: 'Knee-bend ceiling',
    kind: 'none',
    values: {},
    auditRows: ['V10', 'V11', 'V12'],
    sourceIds: ['P2', 'P1', 'S1', 'N3'],
    grade: 'NONE',
    population: 'Not applicable',
    reason:
      'The P2 values of 90 and 120 degrees are passive range targets. P1 has no explicit cap. S1 says "Typically" and describes practice. None of these is a ceiling for an active camera angle.',
    display: {
      value: RANGE_REFERENCE,
      cite: 'Hsu CJ, Lee C, Christensen RS, Liu TY, 2025, S1, text of the protection phase',
      evidence: 'OPINION (level 5, clinical commentary)',
      population: 'Isolated and combined MPFL reconstruction, no age limit stated',
    },
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
  ENG_TARGET: {
    title: 'Where the heel slide count starts',
    kind: 'engineering',
    values: { targetFlexion: 2 * MARGIN_DEG, minLimit: 3 * MARGIN_DEG + 1 },
    sourceIds: ['F1', 'F3'],
    grade: 'ENGINEERING',
    population: 'Camera error from healthy adults in still photos (F1). Error on exercise video is larger (F3).',
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
    population: 'Camera error from healthy adults in still photos (F1). Error on exercise video is larger (F3).',
    reason: 'A rep ends when the knee is back within the camera margin of the resting angle. A clinician must confirm that this is not a clinical value.',
    flag: 'clinical-review-needed',
    text: 'A heel slide rep ends when the knee is back within the camera margin of rest. It is an engineering value.',
  },
  REVIEW: {
    title: 'Review dates and checks',
    kind: 'generated',
    values: { phase1Weeks: 6, phase2Weeks: 12 },
    auditRows: ['V3', 'V4'],
    sourceIds: ['S1'],
    grade: 'OPINION',
    population: ADULT_ISO,
    text: 'The review date of phase 1 is 6 weeks after surgery, and of phase 2 is 12 weeks. The checks are for your clinician and hold no number.',
  },
  PAIN: {
    title: 'Pain and swelling pause',
    kind: 'appRule',
    appOwn: true,
    values: {},
    sourceIds: ['RR'],
    grade: 'NONE',
    population: 'Not applicable',
    reason:
      'No MPFLR source gives a numeric stop. The value 7 of the FR12 floor is an app rule with no source. The plan sets no pain threshold, so the floor applies.',
    flag: 'clinical-review-needed',
    text: 'The plan sets no pain threshold. The pause rule of the app stays: pain of 7 or more, or swelling more than before.',
  },
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
    auditRows: ['V39'],
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
    auditRows: ['V52'],
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
    auditRows: ['V81'],
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
    text: 'P2 excludes realignment surgery. P1 says to follow the more conservative guideline. S10 reports slower plans after a bone procedure.',
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
    auditRows: ['V3', 'V4'],
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

type Typed = { [K in RuleId]: Omit<Rule, 'id' | 'values'> & { id: K; values: (typeof defs)[K]['values'] } };

export const RULES = Object.fromEntries(
  RULE_IDS.map((id) => [id, Object.defineProperties({ id }, Object.getOwnPropertyDescriptors(defs[id]))]),
) as unknown as Typed;
