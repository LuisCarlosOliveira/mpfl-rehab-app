// @vitest-environment node
// Tests for the pure parts of scripts/analyze-clip.mjs: the option parser, the summary maths
// and the reference file reader. The browser run has no unit test. The docs show the real run.
import {
  agreementFromReference,
  ClipInputError,
  parseArgs,
  percentile,
  readReference,
  summarize,
  textSummary,
  type ClipFrame,
} from '../scripts/clip-lib.mjs';

const frame = (time_s: number, flex: number | null, vis: number[] = [0.9, 0.9, 0.9], event: string | null = null): ClipFrame => ({
  time_s,
  allVisible: flex !== null,
  visibility: flex === null ? [] : vis,
  flexionRaw: flex,
  flexionFiltered: flex,
  event,
});

describe('parseArgs', () => {
  const base = ['clip.mp4', '--leg', 'right', '--exercise', 'heel-slide'];

  it('reads the file, the leg and the exercise', () => {
    const a = parseArgs(base);
    expect(a.file).toBe('clip.mp4');
    expect(a.leg).toBe('right');
    expect(a.kind).toBe('heel-slide');
    expect(a.reference).toBeNull();
  });

  it('keeps the left leg as left and the right leg as right', () => {
    expect(parseArgs(['c.mp4', '--leg', 'left', '--exercise', 'mini-squat']).leg).toBe('left');
    expect(parseArgs(base).leg).toBe('right');
  });

  it('maps seated-hold to the protocol kind', () => {
    expect(parseArgs(['c.mp4', '--leg', 'left', '--exercise', 'seated-hold']).kind).toBe('seated-extension-hold');
  });

  it('reads the reference file and the numbers', () => {
    const a = parseArgs([...base, '--reference', 'r.csv', '--target', '70', '--max-flexion', '95', '--hold-seconds', '8']);
    expect(a).toMatchObject({ reference: 'r.csv', target: 70, maxFlexion: 95, holdSeconds: 8 });
  });

  it('rejects a missing leg, a bad leg, a bad exercise, a missing file and an unknown flag', () => {
    expect(() => parseArgs(['c.mp4', '--exercise', 'heel-slide'])).toThrow(ClipInputError);
    expect(() => parseArgs(['c.mp4', '--leg', 'both', '--exercise', 'heel-slide'])).toThrow(ClipInputError);
    expect(() => parseArgs(['c.mp4', '--leg', 'left', '--exercise', 'jump'])).toThrow(ClipInputError);
    expect(() => parseArgs(['--leg', 'left', '--exercise', 'heel-slide'])).toThrow(ClipInputError);
    expect(() => parseArgs([...base, '--bogus', '1'])).toThrow(ClipInputError);
  });

  it('rejects a number that is not a number', () => {
    expect(() => parseArgs([...base, '--target', 'abc'])).toThrow(ClipInputError);
  });
});

describe('percentile', () => {
  it('uses linear interpolation', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentile([0, 10], 5)).toBeCloseTo(0.5);
    expect(percentile([], 5)).toBeNull();
  });
});

describe('summarize', () => {
  const frames = [
    frame(0, 0, [1, 1, 1]),
    frame(0.1, 40, [0.8, 0.8, 0.8]),
    frame(0.2, null),
    frame(0.3, 90, [0.6, 0.6, 0.6], 'rep'),
    frame(0.4, 10, [0.9, 0.9, 0.9]),
  ];

  it('counts the frames and the detection rate', () => {
    const s = summarize(frames, { videoFps: 10, processingMs: 500 });
    expect(s.frames).toBe(5);
    expect(s.framesAllVisible).toBe(4);
    expect(s.detectionRate).toBeCloseTo(0.8);
  });

  it('gives the mean and the 5th percentile of the visibility of frames with a pose', () => {
    const s = summarize(frames, { videoFps: 10, processingMs: 500 });
    expect(s.visibilityMean).toBeCloseTo((3 + 2.4 + 1.8 + 2.7) / 12);
    expect(s.visibilityP5).toBeCloseTo(percentile([1, 1, 1, 0.8, 0.8, 0.8, 0.6, 0.6, 0.6, 0.9, 0.9, 0.9], 5)!);
  });

  it('gives the angle range in degrees', () => {
    const s = summarize(frames, { videoFps: 10, processingMs: 500 });
    expect(s.angleMin).toBe(0);
    expect(s.angleMax).toBe(90);
  });

  it('lists the peak of each counted rep', () => {
    const s = summarize(frames, { videoFps: 10, processingMs: 500 });
    expect(s.reps).toBe(1);
    expect(s.repPeaks).toEqual([90]);
  });

  it('gives the processing speed in frames each second', () => {
    expect(summarize(frames, { videoFps: 10, processingMs: 500 }).processingFps).toBe(10);
  });

  it('gives null for an empty clip', () => {
    const s = summarize([], { videoFps: 30, processingMs: 0 });
    expect(s.detectionRate).toBeNull();
    expect(s.angleMax).toBeNull();
    expect(s.processingFps).toBeNull();
  });
});

describe('readReference', () => {
  it('reads rows, comments, blank lines and Windows line endings', () => {
    const rows = readReference('# goniometer\r\ntime_s,angle_deg\r\n\r\n1.5,45\r\n3,90.5\r\n');
    expect(rows).toEqual([
      { time_s: 1.5, angle_deg: 45 },
      { time_s: 3, angle_deg: 90.5 },
    ]);
  });

  it('rejects a bad header, a decimal comma and a missing value', () => {
    expect(() => readReference('time_ms,angle_deg\n1,2\n')).toThrow(ClipInputError);
    expect(() => readReference('time_s,angle_deg\n1,5,3\n')).toThrow(ClipInputError);
    expect(() => readReference('time_s,angle_deg\n1,\n')).toThrow(ClipInputError);
    expect(() => readReference('time_s,angle_deg\n1,x\n')).toThrow(ClipInputError);
  });
});

describe('agreementFromReference', () => {
  const frames = [frame(0, 0), frame(1, 30), frame(2, 60), frame(3, 90), frame(4, 40)];

  it('pairs each reading with the nearest frame in time and gives camera minus reference', () => {
    const refs = [
      { time_s: 1.1, angle_deg: 28 },
      { time_s: 2.9, angle_deg: 85 },
    ];
    const a = agreementFromReference(frames, refs);
    expect(a.pairs).toBe(2);
    // The differences are +2 and +5. The mean is 3.5.
    expect(a.result).toMatchObject({ side: { pairs: 2, bias: 3.5 } });
  });

  it('skips a reading with no frame within the gap or with no angle', () => {
    const f = [frame(0, 10), frame(1, null), frame(10, 20)];
    const a = agreementFromReference(f, [
      { time_s: 1, angle_deg: 5 },
      { time_s: 5, angle_deg: 5 },
    ]);
    expect(a.pairs).toBe(0);
    expect(a.result).toBeNull();
    expect(a.reason).toMatch(/pair/);
  });

  it('reads the reference time in seconds, not milliseconds', () => {
    const a = agreementFromReference(frames, [{ time_s: 1000, angle_deg: 30 }]);
    expect(a.pairs).toBe(0);
  });
});

describe('leg check', () => {
  // Each frame holds the points of both legs. A leg counts when its 3 joints reach the gate.
  const withPoints = (left: number, right: number): ClipFrame => ({
    ...frame(0, 30),
    points: {
      leftHip: { visibility: left },
      leftKnee: { visibility: left },
      leftAnkle: { visibility: left },
      rightHip: { visibility: right },
      rightKnee: { visibility: right },
      rightAnkle: { visibility: right },
    },
  });
  const noPose: ClipFrame = { ...frame(0, null), points: null };
  const opts = { videoFps: 10, processingMs: 500, minVisibility: 0.5 };

  it('gives the detection rate of each leg from the points of all frames', () => {
    const s = summarize([withPoints(0.9, 0.2), withPoints(0.9, 0.2), withPoints(0.4, 0.2), noPose], opts);
    expect(s.legDetection).toEqual({ left: 0.5, right: 0 });
  });

  it('gives null when the frames have no points or the gate is not given', () => {
    expect(summarize([frame(0, 30)], opts).legDetection).toBeNull();
    expect(summarize([withPoints(0.9, 0.9)], { videoFps: 10, processingMs: 500 }).legDetection).toBeNull();
  });

  const args = { leg: 'right', exercise: 'heel-slide' } as never;
  it('warns when the other leg has a clearly higher detection rate', () => {
    const s = summarize([withPoints(0.9, 0.2), withPoints(0.9, 0.9), withPoints(0.9, 0.2)], opts);
    const text = textSummary('clip', args, s, null);
    expect(text).toMatch(/other leg/i);
    expect(text).toMatch(/--leg left/);
  });

  it('gives no warning when the chosen leg is as good as the other leg', () => {
    const s = summarize([withPoints(0.9, 0.9), withPoints(0.9, 0.8)], opts);
    expect(textSummary('clip', args, s, null)).not.toMatch(/other leg/i);
  });

  it('gives no warning at a difference of exactly 0.25 and a warning above it', () => {
    const f = (right: number[]) => right.map((v) => withPoints(0.9, v));
    // left 4 of 4, right 3 of 4: the difference is 0.25.
    const at = summarize(f([0.9, 0.9, 0.9, 0.2]), opts);
    expect(textSummary('clip', args, at, null)).not.toMatch(/other leg/i);
    // left 4 of 4, right 2 of 4: the difference is 0.5.
    const above = summarize(f([0.9, 0.9, 0.2, 0.2]), opts);
    expect(textSummary('clip', args, above, null)).toMatch(/other leg/i);
  });

  it('counts a leg at the gate value and not when one joint is below it', () => {
    const onGate = withPoints(0.5, 0.5);
    const oneLow: ClipFrame = { ...withPoints(0.9, 0.9), points: { ...withPoints(0.9, 0.9).points, rightKnee: { visibility: 0.49 } } };
    expect(summarize([onGate], opts).legDetection).toEqual({ left: 1, right: 1 });
    expect(summarize([oneLow], opts).legDetection).toEqual({ left: 1, right: 0 });
  });
});
