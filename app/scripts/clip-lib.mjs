// Pure parts of analyze-clip.mjs: option parser, summary maths, reference file reader.
// No file access and no browser here, so tests/analyzeClip.test.ts can run them.
import { agreementByView } from './agreement.mjs';

export class ClipInputError extends Error {}

const KINDS = {
  'heel-slide': 'heel-slide',
  'mini-squat': 'mini-squat',
  'straight-leg-raise': 'straight-leg-raise',
  'seated-hold': 'seated-extension-hold',
};
const USAGE =
  'Usage: node scripts/analyze-clip.mjs <video> --leg left|right --exercise heel-slide|mini-squat|straight-leg-raise|seated-hold ' +
  '[--reference <csv>] [--target <deg>] [--max-flexion <deg>] [--hold-seconds <s>] [--out <folder>]';

// PROPOSAL values for the analysis only. The app itself sets no default (ask your surgeon).
const DEFAULT_TARGET_DEG = 60;
const DEFAULT_HOLD_S = 5;
const NUMBER_FLAGS = { '--target': 'target', '--max-flexion': 'maxFlexion', '--hold-seconds': 'holdSeconds' };

export function parseArgs(argv) {
  const args = {
    file: null,
    leg: null,
    exercise: null,
    kind: null,
    reference: null,
    out: '.clip-out',
    target: DEFAULT_TARGET_DEG,
    maxFlexion: null,
    holdSeconds: DEFAULT_HOLD_S,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      if (args.file !== null) throw new ClipInputError(`Only one video file is allowed. ${USAGE}`);
      args.file = a;
      continue;
    }
    const value = argv[++i];
    if (value === undefined) throw new ClipInputError(`The option ${a} needs a value. ${USAGE}`);
    if (a === '--leg') {
      if (value !== 'left' && value !== 'right') throw new ClipInputError(`--leg must be left or right, not "${value}".`);
      args.leg = value;
    } else if (a === '--exercise') {
      if (!Object.hasOwn(KINDS, value)) throw new ClipInputError(`--exercise must be one of ${Object.keys(KINDS).join(', ')}, not "${value}".`);
      args.exercise = value;
      args.kind = KINDS[value];
    } else if (a === '--reference') {
      args.reference = value;
    } else if (a === '--out') {
      args.out = value;
    } else if (Object.hasOwn(NUMBER_FLAGS, a)) {
      const n = Number(value);
      if (value.trim() === '' || !Number.isFinite(n)) throw new ClipInputError(`${a} must be a number, not "${value}".`);
      args[NUMBER_FLAGS[a]] = n;
    } else {
      throw new ClipInputError(`Unknown option ${a}. ${USAGE}`);
    }
  }
  if (args.file === null) throw new ClipInputError(`The video file is missing. ${USAGE}`);
  if (args.leg === null) throw new ClipInputError(`--leg is missing. ${USAGE}`);
  if (args.exercise === null) throw new ClipInputError(`--exercise is missing. ${USAGE}`);
  return args;
}

const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

/** Linear interpolation between the closest ranks. p is 0 to 100. */
export function percentile(values, p) {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = ((s.length - 1) * p) / 100;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

const COUNTED = new Set(['rep', 'too-fast']);
const LEG_JOINTS = { left: ['leftHip', 'leftKnee', 'leftAnkle'], right: ['rightHip', 'rightKnee', 'rightAnkle'] };
// The warning shows when the other leg is found in this much more of the frames.
const LEG_WARN_DIFF = 0.25;

/** Share of frames in which all 3 joints of each leg reach the gate. null without points or gate. */
function legDetection(frames, minVisibility) {
  if (minVisibility === undefined || frames.length === 0 || !frames.some((f) => f.points)) return null;
  const rate = (names) => frames.filter((f) => f.points && names.every((n) => f.points[n].visibility >= minVisibility)).length / frames.length;
  return { left: rate(LEG_JOINTS.left), right: rate(LEG_JOINTS.right) };
}

/**
 * frames: one record each, time_s in seconds, angles in degrees (flexion, 0 is straight).
 * visibility holds the 3 values of the chosen leg when a pose was found, else it is empty.
 */
export function summarize(frames, { videoFps, processingMs, minVisibility }) {
  const filtered = frames.map((f) => f.flexionFiltered).filter((v) => v !== null);
  const visibility = frames.flatMap((f) => f.visibility);
  const framesAllVisible = frames.filter((f) => f.allVisible).length;
  const repPeaks = [];
  let peak = null;
  for (const f of frames) {
    if (f.flexionFiltered !== null) peak = peak === null ? f.flexionFiltered : Math.max(peak, f.flexionFiltered);
    if (COUNTED.has(f.event)) {
      repPeaks.push(peak);
      peak = null;
    }
  }
  return {
    frames: frames.length,
    framesAllVisible,
    detectionRate: frames.length === 0 ? null : framesAllVisible / frames.length,
    visibilityMean: visibility.length === 0 ? null : mean(visibility),
    visibilityP5: percentile(visibility, 5),
    angleMin: filtered.length === 0 ? null : Math.min(...filtered),
    angleMax: filtered.length === 0 ? null : Math.max(...filtered),
    reps: repPeaks.length,
    repPeaks,
    legDetection: legDetection(frames, minVisibility),
    processingFps: frames.length === 0 || processingMs <= 0 ? null : frames.length / (processingMs / 1000),
    videoFps,
  };
}

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/** Read a CSV with the columns time_s,angle_deg. Lines that start with # are comments. */
export function readReference(text) {
  const lines = text
    .split('\n')
    .map((raw, i) => ({ no: i + 1, text: raw.replace(/\r$/, '').trim() }))
    .filter((l) => l.text !== '' && !l.text.startsWith('#'));
  if (lines.length === 0 || lines[0].text !== 'time_s,angle_deg') {
    throw new ClipInputError('Bad header in the reference file. Expected: time_s,angle_deg');
  }
  return lines.slice(1).map(({ no, text: line }) => {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== 2) {
      throw new ClipInputError(`Reference line ${no}: expected 2 fields, found ${cells.length}. Use a decimal point.`);
    }
    for (const c of cells) {
      if (!NUMBER.test(c)) throw new ClipInputError(`Reference line ${no}: "${c}" is not a number.`);
    }
    return { time_s: Number(cells[0]), angle_deg: Number(cells[1]) };
  });
}

const MAX_GAP_S = 0.5;

/**
 * Pairs each reading with the nearest frame in time (frame angle is the filtered flexion).
 * The pairs go to agreementByView of scripts/agreement.mjs. The difference is camera minus reference.
 */
export function agreementFromReference(frames, refs, maxGapS = MAX_GAP_S) {
  const usable = frames.filter((f) => f.flexionFiltered !== null);
  const rows = [];
  for (const r of refs) {
    let best = null;
    for (const f of usable) {
      const gap = Math.abs(f.time_s - r.time_s);
      if (best === null || gap < best.gap) best = { gap, f };
    }
    if (best !== null && best.gap <= maxGapS) {
      rows.push({ subject: 'clip', view: 'side', reference_deg: r.angle_deg, camera_deg: best.f.flexionFiltered });
    }
  }
  if (rows.length < 2) {
    return { pairs: rows.length, maxGapS, result: null, reason: `Only ${rows.length} pair found. At least 2 pairs are needed.` };
  }
  return { pairs: rows.length, maxGapS, result: agreementByView(rows), reason: null };
}

const fix = (v, d = 1) => (v === null ? 'none' : v.toFixed(d));

export function textSummary(name, args, s, agreement) {
  const lines = [
    `Clip: ${name}. Leg: ${args.leg}. Exercise: ${args.exercise}.`,
    `Frames: ${s.frames}. Video fps: ${fix(s.videoFps)}. Processing fps (offline, with seeks): ${fix(s.processingFps)}.`,
    `Frames with all 3 joints visible: ${s.framesAllVisible} (detection rate ${s.detectionRate === null ? 'none' : (s.detectionRate * 100).toFixed(1) + ' percent'}).`,
    `Visibility: mean ${fix(s.visibilityMean, 3)}, 5th percentile ${fix(s.visibilityP5, 3)}.`,
    `Estimated flexion (filtered): min ${fix(s.angleMin)}, max ${fix(s.angleMax)} degrees.`,
    `Reps counted: ${s.reps}. Peak angles: ${s.repPeaks.map((p) => fix(p)).join(', ') || 'none'}.`,
    'These are estimated angles, not a medical measurement. One clip is a smoke test, not validation.',
  ];
  const other = args.leg === 'left' ? 'right' : 'left';
  if (s.legDetection && s.legDetection[other] - s.legDetection[args.leg] > LEG_WARN_DIFF) {
    lines.push(
      `Warning: the other leg is found in more frames (${(s.legDetection[other] * 100).toFixed(1)} percent, against ${(s.legDetection[args.leg] * 100).toFixed(1)} percent). ` +
        `The leg is the side of the person, not the side of the picture. If the other leg does the exercise, run again with --leg ${other}.`,
    );
  }
  if (agreement) {
    lines.push(
      agreement.result
        ? `Agreement with the reference: ${JSON.stringify(agreement.result.side)}`
        : `Agreement with the reference: not computed. ${agreement.reason}`,
    );
  }
  return lines.join('\n');
}
