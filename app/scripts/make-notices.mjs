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

// Every other package that the lock file marks as a production package. Types-only packages (@types/*) never reach the bundle.
const lock = JSON.parse(readFileSync(join(app, 'package-lock.json'), 'utf8')).packages;
const copyrightLine = /^\s*(copyright|\(c\))\b/i;
const groups = new Map();
for (const [key, entry] of Object.entries(lock)) {
  if (!key || entry.dev || key.includes('/@types/') || key.startsWith('node_modules/@types/')) continue;
  const name = key.replace(/^.*node_modules\//, '');
  if (name in dependencies) continue;
  const dir = join(app, key);
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const license = readFirst(dir, /^licen[cs]e(\.|$)/i);
  if (!license) throw new Error(`${name} has no license text`);
  const notice = readFirst(dir, /^notice(\.|$)/i);
  const holder = license.split('\n').filter((l) => copyrightLine.test(l)).map((l) => l.trim());
  const id = `${entry.license ?? pkg.license}`;
  const text = license.split('\n').filter((l) => !copyrightLine.test(l)).join('\n').replace(/\s+/g, ' ').trim();
  const gkey = `${id}\u0000${text}${notice ? `\u0000${notice}` : ''}`;
  if (!groups.has(gkey)) groups.set(gkey, { id, license, notice, members: [] });
  groups.get(gkey).members.push({ name, version: entry.version, holder });
}
const transitive = [...groups.values()]
  .sort((a, b) => a.id.localeCompare(b.id) || a.members[0].name.localeCompare(b.members[0].name))
  .map((g) => {
    g.members.sort((a, b) => a.name.localeCompare(b.name));
    const list = g.members.map((m) => `- ${m.name} ${m.version}: ${m.holder.join(' | ') || 'no copyright line in the license file'}`);
    const head = `== Packages under one license text (${g.id})`;
    const note = 'The license text below is the text of the first package of the list. Each package of the list has the copyright line that is shown for it.';
    return [head, list.join('\n'), note, g.license, g.notice && `NOTICE\n\n${g.notice}`].filter(Boolean).join('\n\n');
  });

const intro = 'Third-party notices. Each section holds the license of one runtime package.\nThe sections that start with "Packages under one license text" list the other production packages that the direct dependencies bring.\nThis file is made by scripts/make-notices.mjs.';
writeFileSync(out, `${intro}\n\n${[...sections, ...transitive].join('\n\n')}\n`);
