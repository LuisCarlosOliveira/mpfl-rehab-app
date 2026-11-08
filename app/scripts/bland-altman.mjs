// Turns paired angle measurements into the camera error margin.
// Usage: node scripts/bland-altman.mjs <pairs.csv>
//        node scripts/bland-altman.mjs --repeat <sessions.csv>
// Prints JSON on stdout. Exits with code 2 and a message on stderr for bad input.
import { readFileSync } from 'node:fs';
import { agreementByView, InputError, parseCsv, repeatabilityByView } from './agreement.mjs';

const args = process.argv.slice(2);
const repeat = args[0] === '--repeat';
const path = repeat ? args[1] : args[0];

try {
  if (!path) throw new InputError('Usage: bland-altman.mjs [--repeat] <file.csv>');
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new InputError(`Cannot read the file: ${path}`);
  }
  const rows = parseCsv(text, repeat);
  const views = repeat ? repeatabilityByView(rows) : agreementByView(rows);
  console.log(JSON.stringify({ mode: repeat ? 'repeat' : 'agreement', views }, null, 2));
} catch (error) {
  if (!(error instanceof InputError)) throw error;
  console.error(error.message);
  process.exit(2);
}
