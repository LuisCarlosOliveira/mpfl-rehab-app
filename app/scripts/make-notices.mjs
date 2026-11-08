// Write the third-party notices for the direct runtime dependencies.
// Usage: node scripts/make-notices.mjs [output file]   (default: public/THIRD_PARTY_NOTICES.txt)
// The script stops with an error if a package has no license text.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(app, 'public/THIRD_PARTY_NOTICES.txt');
const { dependencies } = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));

// MediaPipe ships no license file. docs/model.md holds the Apache-2.0 text of its repository.
function mediapipeLicense() {
  const doc = readFileSync(join(app, '../docs/model.md'), 'utf8');
  const afterHeading = doc.split('## Apache License 2.0 (LICENSE)')[1] ?? '';
  const block = afterHeading.split('```')[1];
  if (!block) throw new Error('docs/model.md has no Apache license block');
  return `The model card and the model source are in docs/model.md.\n\n${block.trim()}`;
}

function readFirst(dir, pattern) {
  const name = readdirSync(dir).find((f) => pattern.test(f));
  return name ? readFileSync(join(dir, name), 'utf8').trim() : null;
}

const sections = Object.keys(dependencies)
  .sort()
  .map((name) => {
    const dir = join(app, 'node_modules', name);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const license = readFirst(dir, /^licen[cs]e(\.|$)/i) ?? (name === '@mediapipe/tasks-vision' ? mediapipeLicense() : null);
    if (!license) throw new Error(`${name} has no license text`);
    const notice = readFirst(dir, /^notice(\.|$)/i);
    const head = `== ${name} ${pkg.version} (${pkg.license})`;
    return [head, license, notice && `NOTICE\n\n${notice}`].filter(Boolean).join('\n\n');
  });

const intro = 'Third-party notices. Each section holds the license of one runtime dependency.\nThis file is made by scripts/make-notices.mjs.';
writeFileSync(out, `${intro}\n\n${sections.join('\n\n')}\n`);
