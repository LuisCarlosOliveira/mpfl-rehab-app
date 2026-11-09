// The maths for the camera error margin. Plain functions, no file access.
// Used by scripts/bland-altman.mjs, scripts/accuracy-analyze.mjs and tests/blandAltman.test.ts.

// PROPOSAL, not a source: below this number of pairs no margin is printed.
// A clinician or a statistician must review the value before the margin is used.
export const MIN_PAIRS = 30;

// 1.96 is the usual factor for 95 percent limits of agreement (Bland and Altman).
const Z_95 = 1.96;
// 2.77 is 1.96 times the square root of 2. It gives the repeatability coefficient.
const REPEAT_FACTOR = 2.77;

export class InputError extends Error {}

const PAIR_COLUMNS = ['subject', 'view', 'reference_deg', 'camera_deg'];
const REPEAT_COLUMNS = ['subject', 'view', 'session', 'camera_deg'];
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

/**
 * Read CSV text into row objects. Blank lines and lines that start with # are skipped.
 * Windows line endings are accepted. A bad header or a bad value throws InputError.
 */
export function parseCsv(text, repeat = false) {
  const columns = repeat ? REPEAT_COLUMNS : PAIR_COLUMNS;
  const numberColumns = repeat ? ['camera_deg'] : ['reference_deg', 'camera_deg'];
  const lines = text
    .split('\n')
    .map((raw, i) => ({ no: i + 1, text: raw.replace(/\r$/, '').trim() }))
    .filter((l) => l.text !== '' && !l.text.startsWith('#'));

  if (lines.length === 0 || lines[0].text !== columns.join(',')) {
    throw new InputError(`Bad header. Expected: ${columns.join(',')}`);
  }

  return lines.slice(1).map(({ no, text: line }) => {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== columns.length) {
      throw new InputError(
        `Line ${no}: expected ${columns.length} fields, found ${cells.length}. Use a decimal point, not a decimal comma.`,
      );
    }
    const row = Object.fromEntries(columns.map((name, i) => [name, cells[i]]));
    for (const name of columns) {
      if (row[name] === '') throw new InputError(`Line ${no}: the field ${name} is empty.`);
    }
    for (const name of numberColumns) {
      if (!NUMBER.test(row[name])) {
        throw new InputError(`Line ${no}: ${name} is not a number: "${row[name]}". Use a decimal point.`);
      }
      row[name] = Number(row[name]);
    }
    return row;
  });
}

function groupBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }
  return groups;
}

export const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const sumSquares = (values) => {
  const m = mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0);
};
/** Sample standard deviation (n minus 1). */
export const sampleSd = (values) => Math.sqrt(sumSquares(values) / (values.length - 1));
const round = (x) => Math.round(x * 1e4) / 1e4;

/** Bias, SD and 95 percent limits of agreement of a list of differences. Needs at least 2 values. */
export function limitsOfAgreement(diffs) {
  const bias = mean(diffs);
  const sd = sampleSd(diffs);
  return { bias, sd, lower: bias - Z_95 * sd, upper: bias + Z_95 * sd };
}

/**
 * Bland-Altman agreement for each view. Rows come from parseCsv with repeat false.
 * The difference of a pair is camera minus reference.
 */
export function agreementByView(rows) {
  const views = {};
  for (const [view, group] of groupBy(rows, 'view')) {
    const diffs = group.map((r) => r.camera_deg - r.reference_deg);
    if (diffs.length < 2) {
      throw new InputError(`View "${view}" has ${diffs.length} pair. At least 2 pairs are needed.`);
    }
    const { bias, sd, lower, upper } = limitsOfAgreement(diffs);
    const enoughData = diffs.length >= MIN_PAIRS;
    const margin = Math.ceil(Math.max(Math.abs(lower), Math.abs(upper)));
    views[view] = {
      pairs: diffs.length,
      bias: round(bias),
      sd: round(sd),
      loaLower: round(lower),
      loaUpper: round(upper),
      enoughData,
      margin: enoughData ? margin : null,
      ...(enoughData ? {} : { marginReason: `Only ${diffs.length} pairs. At least ${MIN_PAIRS} are needed (PROPOSAL).` }),
    };
  }
  return views;
}

/**
 * Test-retest error for each view. Rows come from parseCsv with repeat true.
 * The within-subject variance pools the spread of each subject around the subject mean.
 */
export function repeatabilityByView(rows) {
  const views = {};
  for (const [view, group] of groupBy(rows, 'view')) {
    let ss = 0;
    let df = 0;
    let subjects = 0;
    for (const subjectRows of groupBy(group, 'subject').values()) {
      if (subjectRows.length < 2) continue;
      subjects += 1;
      ss += sumSquares(subjectRows.map((r) => r.camera_deg));
      df += subjectRows.length - 1;
    }
    if (df === 0) {
      throw new InputError(`View "${view}" has no subject with 2 or more sessions.`);
    }
    const sw = Math.sqrt(ss / df);
    views[view] = {
      subjects,
      degreesOfFreedom: df,
      withinSubjectSd: round(sw),
      repeatability: round(REPEAT_FACTOR * sw),
      enoughData: df >= MIN_PAIRS,
    };
  }
  return views;
}
