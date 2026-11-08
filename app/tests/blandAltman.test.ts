// @vitest-environment node
// Tests for scripts/bland-altman.mjs and scripts/agreement.mjs.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/bland-altman.mjs');
// The proposed minimum number of pairs. The test pins it, so a change must be on purpose.
const MIN_PAIRS = 30;
const PAIR_HEADER = 'subject,view,reference_deg,camera_deg';
const REPEAT_HEADER = 'subject,view,session,camera_deg';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mpfl-ba-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function run(text: string | null, ...flags: string[]) {
  const file = join(dir, 'data.csv');
  if (text !== null) writeFileSync(file, text);
  const target = text === null ? join(dir, 'missing.csv') : file;
  const result = spawnSync('node', [script, ...flags, target], { encoding: 'utf8' });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

const json = (r: { out: string }) => JSON.parse(r.out);

// Rows with reference 0, so that each difference equals the camera value.
const pairs = (view: string, diffs: number[]) => diffs.map((d, i) => `s${i},${view},0,${d}`);
const csv = (...rows: string[]) => [PAIR_HEADER, ...rows].join('\n') + '\n';
// n copies of a and n copies of b.
const twoValues = (n: number, a: number, b: number) => [...Array(n).fill(a), ...Array(n).fill(b)] as number[];

describe('agreement maths on known data', () => {
  // Differences 1, 2, 3, 4. Mean 2.5. Deviations -1.5, -0.5, 0.5, 1.5.
  // Squares 2.25, 0.25, 0.25, 2.25 sum to 5. Variance 5 / 3 = 1.6667. SD = 1.2910.
  // Limits: 2.5 -/+ 1.96 * 1.2910 = -0.0304 and 5.0304.
  it('gives bias, SD and limits for 4 pairs, with no margin', () => {
    const view = json(run(csv(...pairs('side', [1, 2, 3, 4])))).views.side;
    expect(view.pairs).toBe(4);
    expect(view.bias).toBe(2.5);
    expect(view.sd).toBeCloseTo(1.291, 3);
    expect(view.loaLower).toBeCloseTo(-0.0304, 3);
    expect(view.loaUpper).toBeCloseTo(5.0304, 3);
    expect(view.enoughData).toBe(false);
    expect(view.margin).toBeNull();
    expect(view.marginReason).toMatch(/30/);
  });

  it('uses camera minus reference', () => {
    const view = json(run(csv('a,side,10,13', 'b,side,20,23'))).views.side;
    expect(view.bias).toBe(3);
  });

  it('gives bias 0 and margin 0 for a perfect camera', () => {
    const view = json(run(csv(...pairs('side', Array(MIN_PAIRS).fill(0))))).views.side;
    expect(view).toMatchObject({ bias: 0, sd: 0, loaLower: 0, loaUpper: 0, enoughData: true, margin: 0 });
  });

  it('gives the offset as bias and zero spread for a constant offset', () => {
    const view = json(run(csv(...pairs('side', Array(MIN_PAIRS).fill(5))))).views.side;
    expect(view).toMatchObject({ bias: 5, sd: 0, margin: 5 });
  });

  // 15 differences of 1.2 and 15 of 3.2. Mean 2.2. Each deviation is 1.0, so the sum of squares is 30.
  // Variance 30 / 29. SD = 1.0171. Upper limit 2.2 + 1.96 * 1.0171 = 4.1935. The margin rounds up to 5.
  it('rounds the margin up to the next whole degree', () => {
    const view = json(run(csv(...pairs('side', twoValues(15, 1.2, 3.2))))).views.side;
    expect(view.pairs).toBe(30);
    expect(view.loaUpper).toBeCloseTo(4.1935, 3);
    expect(view.margin).toBe(5);
  });

  it('takes the larger absolute limit when the camera reads low', () => {
    const view = json(run(csv(...pairs('side', twoValues(15, -1.2, -3.2))))).views.side;
    expect(view.loaLower).toBeCloseTo(-4.1935, 3);
    expect(view.margin).toBe(5);
  });

  it('does not push a limit of exactly 5 up to 6', () => {
    const view = json(run(csv(...pairs('side', Array(MIN_PAIRS).fill(-5))))).views.side;
    expect(view.margin).toBe(5);
  });

  it('keeps two views apart', () => {
    const rows = [...pairs('side', Array(MIN_PAIRS).fill(0)), ...pairs('front', twoValues(15, 1.2, 3.2))];
    const views = json(run(csv(...rows))).views;
    expect(views.side.margin).toBe(0);
    expect(views.front.margin).toBe(5);
  });

  it('prints margin null below the minimum number of pairs and a margin at the minimum', () => {
    const few = json(run(csv(...pairs('side', Array(MIN_PAIRS - 1).fill(1))))).views.side;
    expect(few.margin).toBeNull();
    expect(few.enoughData).toBe(false);
    const enough = json(run(csv(...pairs('side', Array(MIN_PAIRS).fill(1))))).views.side;
    expect(enough.margin).toBe(1);
  });
});

describe('--repeat mode', () => {
  // Subject A: 10 and 12, mean 11, sum of squares 2. Subject B: 20 and 21, mean 20.5, sum of squares 0.5.
  // Total 2.5 over 2 degrees of freedom. Variance 1.25. Within-subject SD = 1.1180.
  // Repeatability coefficient = 2.77 * 1.1180 = 3.0970.
  it('gives the within-subject SD and the repeatability coefficient', () => {
    const text = [REPEAT_HEADER, 'A,side,1,10', 'A,side,2,12', 'B,side,1,20', 'B,side,2,21'].join('\n');
    const result = run(text, '--repeat');
    expect(result.status).toBe(0);
    const view = json(result).views.side;
    expect(view.subjects).toBe(2);
    expect(view.degreesOfFreedom).toBe(2);
    expect(view.withinSubjectSd).toBeCloseTo(1.118, 3);
    expect(view.repeatability).toBeCloseTo(3.097, 3);
    expect(view.enoughData).toBe(false);
  });

  it('ignores a subject with one session', () => {
    const text = [REPEAT_HEADER, 'A,side,1,10', 'A,side,2,12', 'B,side,1,99'].join('\n');
    const view = json(run(text, '--repeat')).views.side;
    expect(view.subjects).toBe(1);
    expect(view.withinSubjectSd).toBeCloseTo(Math.SQRT2, 3);
  });

  it('exits 2 when no subject has two sessions', () => {
    const result = run([REPEAT_HEADER, 'A,side,1,10', 'B,side,1,11'].join('\n'), '--repeat');
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/2 or more sessions/);
  });

  it('exits 2 for the pair header in repeat mode', () => {
    expect(run(csv('a,side,1,2'), '--repeat').status).toBe(2);
  });
});

describe('input errors exit with code 2', () => {
  it('a missing file', () => {
    const result = run(null);
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/Cannot read the file/);
    expect(result.out).toBe('');
  });

  it('no argument', () => {
    const result = spawnSync('node', [script], { encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/Usage/);
  });

  it('a bad header', () => {
    const result = run('subject,view,ref,cam\na,side,1,2\n');
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/Bad header/);
  });

  it('a value that is not a number', () => {
    const result = run(csv('a,side,10,abc', 'b,side,10,12'));
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/Line 2.*camera_deg.*not a number/);
  });

  it('an empty value', () => {
    const result = run(csv('a,side,10,', 'b,side,10,12'));
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/empty/);
  });

  it('a view with fewer than 2 pairs', () => {
    const result = run(csv('a,side,10,12'));
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/At least 2 pairs/);
  });

  it('a decimal comma, with a clear message', () => {
    const result = run(csv('a,side,10,12,5', 'b,side,10,12'));
    expect(result.status).toBe(2);
    expect(result.err).toMatch(/decimal comma/);
  });
});

describe('file format', () => {
  it('accepts comments, blank lines and Windows line endings', () => {
    const text = ['# camera: laptop, 2.5 m', PAIR_HEADER, '', 'a,side,10,11', '# note', 'b,side,10,13', ''].join('\r\n');
    const result = run(text);
    expect(result.status).toBe(0);
    expect(json(result).views.side).toMatchObject({ pairs: 2, bias: 2 });
  });

  it('accepts a decimal point', () => {
    expect(json(run(csv('a,side,10.5,12', 'b,side,-1.5,.5'))).views.side.bias).toBe(1.75);
  });
});
