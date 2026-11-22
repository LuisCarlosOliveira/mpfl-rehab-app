import { MARGIN_DEG } from '../lib/margin';
import { ANGLE_LABEL } from './labels';
import { plural } from '../lib/sets';
import { DEFAULT_PROFILE, type SetupProfile, type SetupRuleId } from '../lib/setupRules';

export interface RuleRow {
  label: string;
  failedBy: SetupRuleId[];
  joints?: true;
}

export const RULE_ROWS: RuleRow[] = [
  { label: 'Person in the view', failedBy: ['no-pose'] },
  { label: 'Hip, knee and ankle', failedBy: ['turn-leg', 'show-leg'], joints: true },
  { label: 'Whole leg in the frame', failedBy: ['whole-leg'] },
  { label: 'Leg big enough in the frame', failedBy: ['closer'] },
  { label: 'Side-on to the camera', failedBy: ['side-on'] },
  { label: 'Leg held still', failedBy: ['still'] },
];

const FOOT_ROWS: RuleRow[] = [
  RULE_ROWS[0]!,
  { label: 'Knee, ankle and foot', failedBy: ['turn-leg', 'show-leg'], joints: true },
  { label: 'Knee to toes in the frame', failedBy: ['whole-leg'] },
];
const FRONT_ROWS: RuleRow[] = RULE_ROWS.filter((row) => !row.failedBy.includes('side-on'));

export function rowsFor(profile: SetupProfile = DEFAULT_PROFILE): RuleRow[] {
  if (profile.track === 'knee-to-toe') return FOOT_ROWS;
  return profile.view === 'front' ? FRONT_ROWS : RULE_ROWS;
}

export interface RuleRowState {
  label: string;
  word: 'seen' | 'not seen';
}

export function ruleRows(current: SetupRuleId, profile?: SetupProfile): RuleRowState[] {
  const rows = rowsFor(profile);
  const failedAt = rows.findIndex((row) => row.failedBy.includes(current));
  return rows.map((row, i) => ({
    label: row.label,
    word: failedAt === -1 || i < failedAt ? 'seen' : 'not seen',
  }));
}

export function orderedRuleRows(current: SetupRuleId, profile?: SetupProfile): RuleRowState[] {
  const rows = ruleRows(current, profile);
  return [...rows.filter((r) => r.word === 'not seen'), ...rows.filter((r) => r.word === 'seen')];
}

export function chipFor(current: SetupRuleId, profile?: SetupProfile): { text: string; seen: boolean } {
  const first = ruleRows(current, profile).find((r) => r.word === 'not seen');
  return first ? { text: `${first.label}: not seen`, seen: false } : { text: 'Ready', seen: true };
}

export const jointsSeen = (current: SetupRuleId, profile?: SetupProfile): boolean => {
  const at = rowsFor(profile).findIndex((r) => r.joints);
  return ruleRows(current, profile)[at]?.word === 'seen';
};

export const cameraStatusText = (current: SetupRuleId, profile?: SetupProfile): string =>
  chipFor(current, profile).seen ? startText.ready : profile?.track === 'knee-to-toe' ? startText.waitingFoot : startText.waiting;

export function beforeYouStart(profile: SetupProfile | null): string {
  if (profile === null) return TIMER_NOTE;
  if (profile.track === 'knee-to-toe') return 'Put the camera at the side that you chose. Step back until your knee to your toes shows. Hold still for 2 seconds.';
  if (profile.view === 'front') return 'Put the camera in front of you at hip height. Step back until your whole chosen leg shows. Hold still for 2 seconds.';
  return 'Put the camera at the side that you chose. Step back until your whole chosen leg shows. Hold still for 2 seconds.';
}

export const TIMER_NOTE = 'The camera cannot see this effort. The app times your hold.';

export const LIMIT_NOTICE = `The angle can be off by ${MARGIN_DEG} degrees or more (${ANGLE_LABEL}). Follow the limit of your surgeon or physiotherapist, not the cues of the app.`;

export const CAMERA_PEOPLE_NOTE = 'Make sure that only you are in the camera view.';

export const IDLE_TEXT = {
  line: 'Camera is off',
  help: 'Press Start camera. The app asks for the camera.',
} as const;

export const MODEL_BYTES = 20_381_100;
const megabytes = (bytes: number) => (bytes / 1e6).toFixed(1);

export const startText = {
  camera: 'Asking for the camera',
  model: (loadedBytes: number) =>
    loadedBytes > 0
      ? `Loading the pose model, ${megabytes(loadedBytes)} of ${megabytes(MODEL_BYTES)} MB`
      : `Loading the pose model, ${megabytes(MODEL_BYTES)} MB`,
  cameraOn: 'The camera is on. The pose model is loading.',
  ready: 'Ready',
  waiting: 'Waiting for your whole leg',
  waitingFoot: 'Waiting for your knee to your toes',
  slow: 'This takes longer than usual. Keep this page open.',
  progress: 'Pose model download',
} as const;

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

export const CAPTURE_TEXT = {
  title: 'Find your starting angle',
  hold: 'Hold your leg still for a moment.',
  progress: 'Hold still progress',
  // After the time limit (an engineering value, 15 s, not clinical).
  stuck: 'The app has not found a still moment. Hold your leg still a little longer. Or let the app use your lowest steady angle as the start.',
  bent: 'Your knee stays bent. Straighten your leg as far as your care team allows, then hold still.',
  bentShort: 'Your knee stays bent. Straighten it, then hold still.',
  chooseShort: 'No still moment yet. Use the button under this picture.',
  lowestButton: 'Use my lowest steady angle as the start',
  lockedOut: 'The camera can follow another person, or you moved. Press Follow me again, or stop and start again from Setup.',
  followAgain: 'Follow me again',
  looking: 'Looking for the camera view...',
  otherPerson: 'The camera is following someone else. Make sure that only you are in the camera view, then stop and start again from Setup.',
  lowestNeedsLeg: 'Show your whole leg first. The app needs more angle readings.',
  startingAngle: (deg: number) => `Starting angle: ${deg} ${plural(deg, 'degree')} (estimated)`,
  setupNoRest: 'The app has no resting angle yet.',
  setupNoRestDetail: 'Hold your leg still. If you start now, the next screen finds your starting angle.',
} as const;

export const otherLeg = (side: 'left' | 'right') => (side === 'left' ? 'right' : 'left');

export function firstSentence(message: string): { title: string; rest: string } {
  const at = message.indexOf('. ');
  return at === -1 ? { title: message, rest: '' } : { title: message.slice(0, at + 1), rest: message.slice(at + 2) };
}
