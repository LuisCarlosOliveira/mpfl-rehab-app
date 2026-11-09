// Analyses the camera accuracy study sheet (docs/accuracy-study-protocol.md).
// Usage: node scripts/accuracy-analyze.mjs <sheet.csv>
// Prints JSON on stdout. Exits with code 2 and "<ErrorName>: message" on stderr for bad input.
// The reference is the mean of goniometer reader A and reader B. The difference is app minus reference.
// Dependency-free. It is not part of the product bundle.
import { readFileSync } from 'node:fs';

const Z_95 = 1.96; // usual factor for 95 percent limits of agreement (Bland and Altman)
const REQUIRED = ['volunteer', 'target_deg', 'goniometer_a_deg', 'goniometer_b_deg', 'app_deg'];
const ANGLE_COLUMNS = ['target_deg', 'goniometer_a_deg', 'goniometer_b_deg', 'app_deg'];
// Bands of the reference angle, in degrees. PROPOSAL, a clinician may change them.
const BANDS = [
  ['0-44', 0, 44],
  ['45-74', 45, 74],
  ['75-104', 75, 104],
  ['105-180', 105, 180],
];
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/;

class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = new.target.name;
  }
}
class MissingColumnError extends InputError {}
class BadRowError extends InputError {}
class NonNumericError extends InputError {}
class AngleRangeError extends InputError {}
class TooFewRowsError extends InputError {}

function parseSheet(text) {
  const lines = text
    .split('\n')
    .map((raw, i) => ({ no: i + 1, text: raw.replace(/\r$/, '').trim() }))
    .filter((l) => l.text !== '' && !l.text.startsWith('#'));
  if (lines.length === 0) throw new MissingColumnError(`The file is empty. Needed columns: ${REQUIRED.join(',')}`);
  const header = lines[0].text.split(',').map((c) => c.trim());
  for (const name of REQUIRED) {
    if (!header.includes(name)) throw new MissingColumnError(`Missing column: ${name}`);
  }
  return lines.slice(1).map(({ no, text: line }) => {
    const cells = line.split(',').map((c) => c.trim());
    if (cells.length !== header.length) {
      throw new BadRowError(`Line ${no}: expected ${header.length} fields, found ${cells.length}. Use a decimal point, not a decimal comma.`);
    }
    const row = Object.fromEntries(header.map((name, i) => [name, cells[i]]));
    for (const name of ANGLE_COLUMNS) {
      if (!NUMBER.test(row[name])) throw new NonNumericError(`Line ${no}: ${name} is not a number: "${row[name]}".`);
      row[name] = Number(row[name]);
      if (row[name] < 0 || row[name] > 180) throw new AngleRangeError(`Line ${no}: ${name} is ${row[name]}. It must be 0 to 180 degrees.`);
    }
    return row;
  });
}

const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const sd = (v) => {
  if (v.length < 2) return null;
  const m = mean(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
};
const r2 = (x) => (x === null ? null : Math.round(x * 100) / 100);
const abs = (v) => v.map(Math.abs);

function summarize(diffs) {
  return {
    n: diffs.length,
    bias: diffs.length ? r2(mean(diffs)) : null,
    meanAbsoluteError: diffs.length ? r2(mean(abs(diffs))) : null,
    sd: r2(sd(diffs)),
  };
}

function analyze(rows) {
  if (rows.length < 2) throw new TooFewRowsError(`The sheet has ${rows.length} data rows. At least 2 are needed.`);
  const points = rows.map((r) => {
    const reference = (r.goniometer_a_deg + r.goniometer_b_deg) / 2;
    return { volunteer: r.volunteer, target_deg: r.target_deg, reference_deg: reference, app_deg: r.app_deg, difference: r.app_deg - reference };
  });
  const diffs = points.map((p) => p.difference);
  const bias = mean(diffs);
  const spread = sd(diffs);
  const readerDiffs = rows.map((r) => r.goniometer_a_deg - r.goniometer_b_deg);
  const bands = Object.fromEntries(
    BANDS.map(([name, lo, hi]) => {
      const { n, bias: b, meanAbsoluteError, sd: s } = summarize(points.filter((p) => p.reference_deg >= lo && p.reference_deg < hi + 1).map((p) => p.difference));
      return [name, { n, bias: b, meanAbsoluteError, sd: s }];
    }),
  );
  return {
    n: points.length,
    bias: r2(bias),
    sd: r2(spread),
    loaLower: r2(bias - Z_95 * spread),
    loaUpper: r2(bias + Z_95 * spread),
    meanAbsoluteError: r2(mean(abs(diffs))),
    readers: { bias: r2(mean(readerDiffs)), sd: r2(sd(readerDiffs)), meanAbsolute: r2(mean(abs(readerDiffs))) },
    bands,
    worst: [...points].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)).slice(0, 3),
  };
}

const path = process.argv[2];
try {
  if (!path) throw new InputError('Usage: accuracy-analyze.mjs <sheet.csv>');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new InputError(`Cannot read the file: ${path}`);
  }
  console.log(JSON.stringify(analyze(parseSheet(text)), null, 2));
} catch (error) {
  if (!(error instanceof InputError)) throw error;
  console.error(`${error.name}: ${error.message}`);
  process.exit(2);
}
