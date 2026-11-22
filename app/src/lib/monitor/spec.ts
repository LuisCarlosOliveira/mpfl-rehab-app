export type Posture = 'supine' | 'side-lying' | 'prone' | 'seated' | 'standing';

export interface View {
  angle: 'side' | 'front' | 'behind' | 'above' | 'none';
  cameraSide: 'operated-leg-near' | 'either' | 'none';
  legs: 'chosen' | 'both' | 'none';
}

export type JointTriplet = 'hip-knee-ankle' | 'knee-ankle-footIndex';
export type Landmark = 'hip' | 'knee' | 'ankle' | 'footIndex';

export type Measure =
  | { kind: 'joint-angle'; joint: JointTriplet; /** The value is shown but never counts or cues. */ reportOnly?: boolean }
  | { kind: 'segment-angle'; from: Landmark; to: Landmark; against: 'vertical' | 'horizontal'; reportOnly?: boolean }
  | { kind: 'distance'; from: Landmark; to: Landmark; axis: 'x' | 'y'; normalisedBy: string; reportOnly?: boolean }
  | { kind: 'height-gate'; above: Landmark; reference: Landmark; threshold: string }
  | { kind: 'none' };

export type ReportValue = 'peak' | 'range' | 'top-angle';

export type Mode = 'reps-peak' | 'reps-cycle' | 'lift' | 'timed-hold' | 'person-timer';

export type Origin = `source:${string}` | `clinician:${string}` | 'engineering';

export interface Threshold {
  name: string;
  value: number | null;
  unit: 'deg' | 'ms' | 's' | 'fraction';
  origin: Origin;
}

export type CueEvent = 'near-limit' | 'over-limit' | 'shallow' | 'too-fast' | 'hold-restart';

export interface Cue {
  event: CueEvent;
  threshold: string;
}

export type Need = 'whole-leg' | 'knee-to-toe' | 'upper-body';

export interface Guide {
  startPosition: string;
  legFacingCamera: string;
  handsAndSupport: string;
  range: string;
  speed: string;
  cameraMustSee: string;
  bodyMapPoints: number[];
  /** `existing`: the text of guides.ts. `proposal`: the text is a PROPOSAL of the app. The sources are only the ones that the repo holds. */
  basis: { kind: 'existing' | 'proposal'; sourceIds: string[] };
}

export type SummaryValue = 'reps' | 'holds' | 'hold-seconds' | 'peak' | 'top' | 'range';

export interface ExerciseSpec {
  id: string;
  label: string;
  sourceIds: string[];
  phases: number[];
  posture: Posture[];
  view: View;
  measure: Measure;
  report: ReportValue[];
  mode: Mode;
  thresholds: Threshold[];
  cues: Cue[];
  needs: Need[];
  guide: Guide;
  summary: SummaryValue[];
}

export const CLINICIAN_FIELDS = [
  'sets',
  'reps',
  'holdSeconds',
  'targetFlexion',
  'minFlexion',
  'maxFlexion',
  'minRepSeconds',
  'maxTopFlexion',
  'returnWithinDeg',
] as const;

const ID = /^[a-z][a-z0-9-]{0,39}$/;
const ORIGIN = /^(engineering|source:[A-Za-z0-9]+|clinician:[A-Za-z]+)$/;

export function specTexts(spec: ExerciseSpec): string[] {
  const g = spec.guide;
  return [spec.label, g.startPosition, g.legFacingCamera, g.handsAndSupport, g.range, g.speed, g.cameraMustSee];
}

export function validateSpec(spec: ExerciseSpec): string[] {
  const problems: string[] = [];
  const at = `${spec.id}:`;
  if (!ID.test(spec.id)) problems.push(`${at} id must use lower case letters, digits and dashes`);

  const seen = new Set<string>();
  for (const t of spec.thresholds) {
    if (typeof t.origin !== 'string' || !ORIGIN.test(t.origin)) {
      problems.push(`${at} threshold ${t.name} has no valid origin`);
    } else if (t.origin.startsWith('clinician:') && !(CLINICIAN_FIELDS as readonly string[]).includes(t.origin.slice(10))) {
      problems.push(`${at} threshold ${t.name} names a protocol field that does not exist: ${t.origin}`);
    }
    if (seen.has(t.name)) problems.push(`${at} threshold ${t.name} is listed twice`);
    seen.add(t.name);
  }

  for (const cue of spec.cues) {
    const t = spec.thresholds.find((x) => x.name === cue.threshold);
    if (t === undefined) problems.push(`${at} cue ${cue.event} checks ${cue.threshold}, which does not exist`);
    else if (t.origin === 'engineering') problems.push(`${at} cue ${cue.event} checks ${t.name}, which has origin engineering`);
  }

  const m = spec.measure;
  if (m.kind === 'height-gate' && !seen.has(m.threshold)) problems.push(`${at} the gate names ${m.threshold}, which does not exist`);

  if (spec.mode === 'person-timer') {
    const reportOnly = m.kind === 'none' || ('reportOnly' in m && m.reportOnly === true);
    if (!reportOnly) problems.push(`${at} mode person-timer needs measure none or a report-only measure`);
    if (spec.cues.length > 0) problems.push(`${at} mode person-timer has no cue`);
  }
  return problems;
}

export function validateRegistry(specs: readonly ExerciseSpec[]): string[] {
  const ids = new Set<string>();
  const problems = specs.flatMap((s) => {
    if (ids.has(s.id)) return [`${s.id}: id is used twice`, ...validateSpec(s)];
    ids.add(s.id);
    return validateSpec(s);
  });
  return problems;
}
