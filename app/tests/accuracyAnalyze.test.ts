// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, '../scripts/accuracy-analyze.mjs');
const template = resolve(here, '../../docs/accuracy-study-sheet.csv');
const HEADER =
  'volunteer,leg,camera_side,lighting,clothing,target_deg,goniometer_a_deg,goniometer_b_deg,app_deg';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mpfl-acc-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function runFile(file: string) {
  const r = spawnSync('node', [script, file], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout, err: r.stderr };
}
function run(text: string, header = HEADER) {
  const file = join(dir, 'sheet.csv');
  writeFileSync(file, `${header}\n${text}`);
  return runFile(file);
}
// A row: volunteer, target, reader A, reader B, app value. Other columns are fixed.
const row = (v: string, t: number, a: number | string, b: number | string, app: number | string) =>
  `${v},right,left,bright,shorts,${t},${a},${b},${app}`;

// SYNTHETIC set. Reference is the mean of A and B.
// refs 0, 30, 60, 90. diffs (app minus ref) +2, -4, +6, 0.
// bias 1. deviations 1, -5, 5, -1. squares 52. sd = sqrt(52/3) = 4.16.
// limits = 1 -/+ 1.96 * 4.1633 = -7.16 and 9.16. MAE = (2+4+6+0)/4 = 3.
// Reader differences A minus B: 0, 0, -4, 0. bias -1. sd = sqrt(12/3) = 2.
const SET = [row('v01', 0, 0, 0, 2), row('v01', 30, 30, 30, 26), row('v02', 60, 58, 62, 66), row('v02', 90, 90, 90, 90)].join('\n');

describe('accuracy-analyze on SYNTHETIC rows with hand-computed answers', () => {
  it('prints n, bias, SD, limits of agreement and MAE for the SYNTHETIC set', () => {
    const r = run(SET);
    expect(r.status).toBe(0);
    const o = JSON.parse(r.out);
    expect(o.n).toBe(4);
    expect(o.bias).toBe(1);
    expect(o.sd).toBe(4.16);
    expect(o.loaLower).toBe(-7.16);
    expect(o.loaUpper).toBe(9.16);
    expect(o.meanAbsoluteError).toBe(3);
  });

  it('uses the mean of reader A and reader B as the reference (SYNTHETIC 58 and 62 give 60)', () => {
    const o = JSON.parse(run(SET).out);
    expect(o.worst[0]).toMatchObject({ volunteer: 'v02', target_deg: 60, reference_deg: 60, app_deg: 66, difference: 6 });
  });

  it('prints the reader difference for the SYNTHETIC set', () => {
    const o = JSON.parse(run(SET).out);
    expect(o.readers).toEqual({ bias: -1, sd: 2, meanAbsolute: 1 });
  });

  it('groups the error by reference band for the SYNTHETIC set', () => {
    const o = JSON.parse(run(SET).out);
    expect(o.bands['0-44']).toEqual({ n: 2, bias: -1, meanAbsoluteError: 3, sd: 4.24 });
    expect(o.bands['45-74']).toEqual({ n: 1, bias: 6, meanAbsoluteError: 6, sd: null });
    expect(o.bands['75-104']).toEqual({ n: 1, bias: 0, meanAbsoluteError: 0, sd: null });
    expect(o.bands['105-180']).toEqual({ n: 0, bias: null, meanAbsoluteError: null, sd: null });
  });

  it('lists the worst 3 points by absolute difference for the SYNTHETIC set', () => {
    const o = JSON.parse(run(SET).out);
    expect(o.worst.map((w: { difference: number }) => w.difference)).toEqual([6, -4, 2]);
  });

  it('accepts comment lines, blank lines, Windows line endings and any column order (SYNTHETIC)', () => {
    const file = join(dir, 'order.csv');
    writeFileSync(
      file,
      '# synthetic\r\napp_deg,goniometer_b_deg,goniometer_a_deg,target_deg,clothing,lighting,camera_side,leg,volunteer\r\n\r\n3,10,10,10,s,l,left,left,v1\r\n7,20,20,20,s,l,left,left,v2\r\n',
    );
    const o = JSON.parse(runFile(file).out);
    expect(o.n).toBe(2);
    expect(o.bias).toBe(-10);
  });
});

describe('accuracy-analyze refuses bad SYNTHETIC input with a named error', () => {
  const fail = (r: { status: number | null; err: string }, name: string, text: string) => {
    expect(r.status).toBe(2);
    expect(r.err).toContain(name);
    expect(r.err).toContain(text);
  };

  it('MissingColumnError names the missing column (SYNTHETIC)', () => {
    fail(
      run('v1,right,left,l,s,0,0,0', 'volunteer,leg,camera_side,lighting,clothing,target_deg,goniometer_a_deg,goniometer_b_deg'),
      'MissingColumnError',
      'app_deg',
    );
  });

  it('NonNumericError names the line and the column (SYNTHETIC "abc")', () => {
    fail(run(`${row('v1', 0, 0, 0, 1)}\n${row('v2', 30, 'abc', 30, 31)}`), 'NonNumericError', 'goniometer_a_deg');
  });

  it('NonNumericError rejects an empty value, and a decimal comma gives BadRowError (SYNTHETIC)', () => {
    fail(run(`${row('v1', 0, 0, 0, 1)}\n${row('v2', 30, 30, 30, '')}`), 'NonNumericError', 'app_deg');
    fail(run(`${row('v1', 0, 0, 0, 1)}\nv2,right,left,l,s,30,30,30,31,5`), 'BadRowError', 'Line 3');
  });

  it('TooFewRowsError for one SYNTHETIC row', () => {
    fail(run(row('v1', 0, 0, 0, 1)), 'TooFewRowsError', '1');
  });

  it('AngleRangeError for a SYNTHETIC angle of 181 or -1', () => {
    fail(run(`${row('v1', 0, 0, 0, 1)}\n${row('v2', 30, 30, 30, 181)}`), 'AngleRangeError', 'app_deg');
    fail(run(`${row('v1', 0, 0, 0, 1)}\n${row('v2', 30, -1, 30, 31)}`), 'AngleRangeError', 'goniometer_a_deg');
  });

  it('accepts the SYNTHETIC limits 0 and 180', () => {
    expect(run(`${row('v1', 0, 0, 0, 0)}\n${row('v2', 180, 180, 180, 180)}`).status).toBe(0);
  });

  it('exits with 2 and a message for a missing file', () => {
    fail(runFile(join(dir, 'none.csv')), 'InputError', 'Cannot read');
  });
});

describe('study sheet template', () => {
  it('holds the header only, and the tool refuses it with TooFewRowsError', () => {
    const text = readFileSync(template, 'utf8').trim();
    expect(text).toBe(HEADER);
    const r = runFile(template);
    expect(r.status).toBe(2);
    expect(r.err).toContain('TooFewRowsError');
  });
});
