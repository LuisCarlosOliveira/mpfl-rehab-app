// Plain helpers for the Setup screen. No React here, so a test can read them directly.
// The rule order is the priority order of src/lib/setupRules.ts (research/ux-flow.md section 6.2).
import { plural } from '../lib/sets';
import type { SetupRuleId } from '../lib/setupRules';

export interface RuleRow {
  label: string;
  /** Rule ids of the setup check that make this row "not seen". */
  failedBy: SetupRuleId[];
}

export const RULE_ROWS: RuleRow[] = [
  { label: 'Person in the view', failedBy: ['no-pose'] },
  { label: 'Hip, knee and ankle', failedBy: ['turn-leg', 'show-leg'] },
  { label: 'Whole leg in the frame', failedBy: ['whole-leg'] },
  { label: 'Leg big enough in the frame', failedBy: ['closer'] },
  { label: 'Side-on to the camera', failedBy: ['side-on'] },
  { label: 'Leg held still', failedBy: ['still'] },
];

export interface RuleRowState {
  label: string;
  word: 'seen' | 'not seen';
}

/**
 * The check shows the first failed rule only. A rule before it was seen.
 * The failed rule and each rule after it are "not seen", because the check did not see them yet.
 */
export function ruleRows(current: SetupRuleId): RuleRowState[] {
  const failedAt = RULE_ROWS.findIndex((row) => row.failedBy.includes(current));
  return RULE_ROWS.map((row, i) => ({
    label: row.label,
    word: failedAt === -1 || i < failedAt ? 'seen' : 'not seen',
  }));
}

/** The same chips as ruleRows. The rules that are not seen come first, so the person reads what to fix at the top (U19). */
export function orderedRuleRows(current: SetupRuleId): RuleRowState[] {
  const rows = ruleRows(current);
  return [...rows.filter((r) => r.word === 'not seen'), ...rows.filter((r) => r.word === 'seen')];
}

/** The first rule that is not seen, as the words of one chip (A4). When every rule is seen it reads Ready. */
export function chipFor(current: SetupRuleId): { text: string; seen: boolean } {
  const first = ruleRows(current).find((r) => r.word === 'not seen');
  return first ? { text: `${first.label}: not seen`, seen: false } : { text: 'Ready', seen: true };
}

/** True when the check shows that hip, knee and ankle are seen. The angle text of the body map shows only then (U1). */
export const jointsSeen = (current: SetupRuleId): boolean => ruleRows(current).find((r) => r.label.startsWith('Hip, knee and ankle'))?.word === 'seen';

/** The words of the hidden status line while the camera runs. It says Ready only when every rule is seen (U1). */
export const cameraStatusText = (current: SetupRuleId): string => (chipFor(current).seen ? startText.ready : startText.waiting);

// The camera note on the camera step (B-03). The pose model follows one person, so a second person in the view can take over the leg.
export const CAMERA_PEOPLE_NOTE = 'Make sure that only you are in the camera view.';

// The step card before the camera starts (A3). The words "Camera is off" and the help line are plain and neutral.
export const IDLE_TEXT = {
  line: 'Camera is off',
  help: 'Press Start camera. The app asks for the camera.',
} as const;

/**
 * Bytes that the model load fetches: the WASM file and the model file of public/models.
 * A test reads both files and keeps this number equal to their size.
 */
export const MODEL_BYTES = 20_381_100;
const megabytes = (bytes: number) => (bytes / 1e6).toFixed(1);

// Texts of the start steps (U10). Plain and neutral. The model step shows the real bytes when the loader reports them.
export const startText = {
  camera: 'Asking for the camera',
  model: (loadedBytes: number) =>
    loadedBytes > 0
      ? `Loading the pose model, ${megabytes(loadedBytes)} of ${megabytes(MODEL_BYTES)} MB`
      : `Loading the pose model, ${megabytes(MODEL_BYTES)} MB`,
  cameraOn: 'The camera is on. The pose model is loading.',
  ready: 'Ready',
  waiting: 'Waiting for your whole leg',
  slow: 'This takes longer than usual. Keep this page open.',
  progress: 'Pose model download',
} as const;

/** Whole seconds left, rounded up, or null when no countdown runs. */
export function countdownSeconds(leftMs: number | null): number | null {
  return leftMs === null ? null : Math.ceil(leftMs / 1000);
}

// Texts of the leg choice (T17). Plain, neutral, no verdict word and no advice.
// Source: docs/leg-and-baseline-design.md section 5.4.
export const LEG_TEXT = {
  legQuestion: 'Which leg will you exercise?',
  planLeg: 'Operated leg in your plan',
  cameraQuestion: 'Which side of you is the camera on?',
  // PROPOSAL: the camera question starts on the side of the chosen leg, because the guide puts the camera there.
  cameraHint: 'The guide puts the camera on the side of your chosen leg. Change this if your camera is on the other side.',
  otherLegConfirm: 'Your plan names the other leg. The app will follow the leg that you chose. It does not change your plan. Continue?',
  continueButton: 'Continue with this leg',
  farLeg: 'The camera is on the other side. The estimated angle can be less exact.',
  identity: 'The camera sees your other leg move more. Make sure that the chosen leg is the one that moves.',
  resting: (deg: number) => `Resting angle: ${deg} ${plural(deg, 'degree')}. Estimated angle, not a medical measurement.`,
  // PROPOSAL (T17): the app has no default return value. The notice shows in Setup and in Session.
  noReturnValue: 'Your protocol has no return value. Ask your surgeon.',
  noReturnValueDetail: 'The app counts no rep. The angle and the peak still show.',
} as const;

// Texts of the in-place capture of the starting angle (F1). Plain, neutral, no verdict word.
// The person can follow every instruction in place. No text asks to stop and start again.
export const CAPTURE_TEXT = {
  title: 'Find your starting angle',
  hold: 'Hold your leg still for a moment.',
  progress: 'Hold still progress',
  // After the time limit (an engineering value, 15 s, not clinical).
  stuck: 'The app has not found a still moment. Hold your leg still a little longer. Or let the app use your lowest steady angle as the start.',
  // The knee is as bent as the start of a rep, held still or at its lowest. The person can follow this in place.
  bent: 'Your knee stays bent. Straighten your leg as far as your care team allows, then hold still.',
  // One line each, for the camera picture (R2-04). The full texts above sit in the card under the numbers.
  bentShort: 'Your knee stays bent. Straighten it, then hold still.',
  chooseShort: 'No still moment yet. Use the button under this picture.',
  lowestButton: 'Use my lowest steady angle as the start',
  // B3-01, B3-03: the camera reads a hip far from the first one for more than 4 s. The cause is not known, so the text names both.
  lockedOut: 'The camera can follow another person, or you moved. Press Follow me again, or stop and start again from Setup.',
  followAgain: 'Follow me again',
  // B6-01: the press waits for the answer of the probe of two poses. It decides nothing before.
  looking: 'Looking for the camera view...',
  // B4-01: the camera follows one person. After a press, a hip far from the start hip is read as someone else, and no numbers show.
  otherPerson: 'The camera is following someone else. Make sure that only you are in the camera view, then stop and start again from Setup.',
  lowestNeedsLeg: 'Show your whole leg first. The app needs more angle readings.',
  startingAngle: (deg: number) => `Starting angle: ${deg} ${plural(deg, 'degree')} (estimated)`,
  setupNoRest: 'The app has no resting angle yet.',
  setupNoRestDetail: 'Hold your leg still. If you start now, the next screen finds your starting angle.',
} as const;

/** The side that the person did not choose. */
export const otherLeg = (side: 'left' | 'right') => (side === 'left' ? 'right' : 'left');

/** The first sentence and the rest of a message. A camera message has a title and one sentence with the fix (A6). */
export function firstSentence(message: string): { title: string; rest: string } {
  const at = message.indexOf('. ');
  return at === -1 ? { title: message, rest: '' } : { title: message.slice(0, at + 1), rest: message.slice(at + 2) };
}
