// @vitest-environment node
// Tests for the check scripts. They prove that each script fails when it must fail.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const claims = resolve(here, '../scripts/claims-check.sh');
const phase = resolve(here, '../scripts/phase-check.sh');
const realSrc = resolve(here, '../src');

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mpfl-script-test-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function put(rel: string, text: string) {
  const file = join(dir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}

const run = (script: string, ...args: string[]) => spawnSync('bash', [script, ...args], { encoding: 'utf8' });

describe('claims-check.sh', () => {
  it('fails on a banned claim', () => {
    put('lib/a.ts', 'export const t = "Clinically validated angle";');
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on a banned API', () => {
    put('lib/b.ts', 'const r = new MediaRecorder(stream);');
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes on clean text', () => {
    put('lib/c.ts', 'export const t = "Estimated angle, not a medical measurement";');
    expect(run(claims, dir).status).toBe(0);
  });

  it('skips a line that ends with the allow marker', () => {
    put('ui/d.tsx', 'const t = "score"; // claims-check:allow');
    expect(run(claims, dir).status).toBe(0);
  });

  it.each([
    ['ui/e.tsx', 'const t = "Good job";'],
    ['lib/cues.ts', 'export const c = "That was wrong";'],
    ['lib/redflags.ts', 'export const m = "You pass";'],
    ['pose/camera.ts', 'const m = "Goal for today";'],
  ])('fails on a verdict word in patient text (%s)', (rel, text) => {
    put(rel, text);
    expect(run(claims, dir).status).toBe(1);
  });

  it('allows the same words in code that no patient reads', () => {
    put('lib/other.ts', 'const safe = true; function fail() {}');
    expect(run(claims, dir).status).toBe(0);
  });

  it('exits 2 when a path does not exist', () => {
    const r = run(claims, join(dir, 'missing'));
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/not found/);
  });

  it('works from any folder and passes on the real source', () => {
    const out = execFileSync('bash', [claims, realSrc], { cwd: tmpdir(), encoding: 'utf8' });
    expect(out).toMatch(/claims-check: ok/);
  });
});

describe('phase-check.sh', () => {
  it('fails on a write to activePhase outside the protocol folder', () => {
    put('ui/p.ts', 'store.activePhase = 2;');
    expect(run(phase, dir).status).toBe(1);
  });

  it('fails on setActivePhase', () => {
    put('ui/q.ts', 'setActivePhase(3);');
    expect(run(phase, dir).status).toBe(1);
  });

  it('fails on Object.assign into activePhase', () => {
    put('ui/r.ts', 'Object.assign(p, { activePhase: 2 });');
    expect(run(phase, dir).status).toBe(1);
  });

  it('passes on a read and on a write inside the protocol folder', () => {
    put('ui/s.ts', 'const a = store.activePhase; if (a === 1) {}');
    put('lib/protocol/t.ts', 'p.activePhase = 3;');
    expect(run(phase, dir).status).toBe(0);
  });

  it('passes on a React prop that only passes the value to a screen', () => {
    put('ui/App.tsx', 'return <Home activePhase={store.activePhase} />;');
    expect(run(phase, dir).status).toBe(0);
  });

  it('fails on a member write of an object, not only of a number', () => {
    put('ui/w.ts', 'store.activePhase = { id: 2 };');
    expect(run(phase, dir).status).toBe(1);
  });

  it('fails on a write with no spaces around the sign', () => {
    put('ui/x.ts', 'store.activePhase=2;');
    expect(run(phase, dir).status).toBe(1);
  });

  it('exits 2 when the path does not exist', () => {
    expect(run(phase, join(dir, 'missing')).status).toBe(2);
  });

  it('passes on the real source', () => {
    expect(run(phase, realSrc).status).toBe(0);
  });
});

describe('plan-skills-check.sh', () => {
  const skills = resolve(here, '../scripts/plan-skills-check.sh');
  const realPlan = resolve(here, '../../MPFL_APP_PLAN.md');

  it('fails when a finished task has no Skills used line', () => {
    const f = put('plan.md', '### T1. A task\n- Result: DONE 2026-11-08. It works.\n');
    const r = run(skills, f);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/T1/);
  });

  it('passes when every finished task names its skills', () => {
    const f = put('plan.md', '### T1. A task\n- Result: DONE 2026-11-08. It works. Skills used: none loaded (gap).\n');
    expect(run(skills, f).status).toBe(0);
  });

  it('ignores a task that is not finished', () => {
    const f = put('plan.md', '### T1. A task\n- Result: pending.\n');
    expect(run(skills, f).status).toBe(0);
  });

  it('checks every finished task, not only the first', () => {
    const f = put('plan.md', '### T1. A\n- Result: DONE. Skills used: x.\n\n### T2. B\n- Result: DONE. It works.\n');
    const r = run(skills, f);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/T2/);
    expect(r.stdout).not.toMatch(/T1\b/);
  });

  it('exits 2 when the plan file does not exist', () => {
    expect(run(skills, join(dir, 'missing.md')).status).toBe(2);
  });

  it('passes on the real plan', () => {
    expect(run(skills, realPlan).status).toBe(0);
  });
});

describe('claims-check.sh: more banned APIs and quoting (S-06)', () => {
  it.each([
    'createImageBitmap',
    'OffscreenCanvas',
    'getImageData',
    'navigator.share',
    'sendBeacon',
    'WebSocket',
  ])('fails on the banned API %s', (api) => {
    put('lib/api.ts', `const x = ${api};`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('skips a banned API on a line with the allow marker', () => {
    put('lib/api.ts', 'const x = new WebSocket(u); // claims-check:allow');
    expect(run(claims, dir).status).toBe(0);
  });

  it('does not ban RTCPeerConnection, which the pairing task needs', () => {
    put('lib/pair.ts', 'const pc = new RTCPeerConnection();');
    expect(run(claims, dir).status).toBe(0);
  });

  it('checks a patient text file in a folder whose name has a space', () => {
    put('my folder/ui/a.tsx', 'const t = "Good job";');
    expect(run(claims, join(dir, 'my folder')).status).toBe(1);
  });
});

describe('model-hash-check.sh: built output (S-05)', () => {
  const hash = resolve(here, '../scripts/model-hash-check.sh');
  const models = resolve(here, '../public/models');
  const runHash = (folder: string) => spawnSync('bash', [hash, folder], { encoding: 'utf8' });

  it('passes on a build copy that equals the source', () => {
    const copy = join(dir, 'dist-models');
    cpSync(models, copy, { recursive: true });
    expect(runHash(copy).status).toBe(0);
  });

  it('fails when a build copy and its own SHA256SUMS were changed together', () => {
    const copy = join(dir, 'dist-models');
    cpSync(models, copy, { recursive: true });
    const task = join(copy, 'pose_landmarker_lite.task');
    appendFileSync(task, 'x');
    const digest = spawnSync('sha256sum', [task], { encoding: 'utf8' }).stdout.split(' ')[0];
    const sums = join(copy, 'SHA256SUMS');
    const text = spawnSync('cat', [sums], { encoding: 'utf8' }).stdout.split('\n');
    text[0] = `${digest}  pose_landmarker_lite.task`;
    writeFileSync(sums, text.join('\n'));
    const r = runHash(copy);
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/differs from public\/models\/SHA256SUMS/);
  });
});

describe('claims-check.sh: pixel read only in the QR reader (T12b)', () => {
  const read = 'const img = ctx.getImageData(0, 0, w, h);';
  const marked = `${read} // claims-check:allow`;

  it('fails on getImageData in another file, also with the marker', () => {
    put('lib/other.ts', read);
    expect(run(claims, dir).status).toBe(1);
    put('lib/other.ts', marked);
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on getImageData in a file with the same name in another folder', () => {
    put('lib/pairing/qrReader.ts', marked);
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes on one marked line in pairing/qrReader.ts', () => {
    put('pairing/qrReader.ts', `const a = 1;\n${marked}\n`);
    const r = run(claims, dir);
    expect(r.status).toBe(0);
  });

  it('passes when the folder holds the marked reader and a clean file', () => {
    put('pairing/qrReader.ts', marked);
    put('lib/clean.ts', 'export const x = 1;');
    expect(run(claims, dir).status).toBe(0);
  });

  it('fails on getImageData in qrReader.ts without the marker', () => {
    put('pairing/qrReader.ts', read);
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on a second getImageData line without the marker', () => {
    put('pairing/qrReader.ts', `${marked}\n${read}\n`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on a second getImageData line with the marker', () => {
    put('pairing/qrReader.ts', `${marked}\n${marked}\n`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on a comment that names getImageData without the marker', () => {
    put('pairing/qrReader.ts', `${marked}\n// do not call getImageData twice\n`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('still checks the other banned APIs in qrReader.ts', () => {
    put('pairing/qrReader.ts', `${marked}\nconst u = canvas.toDataURL();\n`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('names the file in the failure output', () => {
    put('lib/other.ts', read);
    expect(run(claims, dir).stdout).toContain('other.ts');
  });

  it('accepts the reader when a single file is given', () => {
    const file = put('pairing/qrReader.ts', marked);
    expect(run(claims, file).status).toBe(0);
  });
});

// Live test follow-up: the body map and any other screen must draw from numbers, never from pixels.
// A frame must never be drawn to a canvas outside the QR reader.
describe('claims-check.sh: no frame drawing outside the QR reader', () => {
  const drawLine = 'ctx.drawImage(video, 0, 0);';

  it('fails on drawImage in a screen file', () => {
    put('ui/BodyMap.tsx', `const x = 1;\n${drawLine}\n`);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('BodyMap.tsx');
  });

  it('fails on drawImage even with the allow marker outside the reader', () => {
    put('ui/BodyMap.tsx', `${drawLine} // claims-check:allow`);
    expect(run(claims, dir).status).toBe(1);
  });

  it('fails on a created canvas, a canvas tag and getContext outside the reader', () => {
    for (const line of ["const c = document.createElement('canvas');", 'return <canvas />;', "const g = c.getContext('2d');"]) {
      put('ui/Other.tsx', line);
      expect(run(claims, dir).status, line).toBe(1);
    }
  });

  it('fails in a file named qrReader.ts that sits in another folder', () => {
    put('lib/pairing/qrReader.ts', drawLine);
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes for the drawing lines of pairing/qrReader.ts', () => {
    put(
      'pairing/qrReader.ts',
      `const c = document.createElement('canvas');\nconst g = c.getContext('2d');\ng.drawImage(video, 0, 0);\n`,
    );
    expect(run(claims, dir).status).toBe(0);
  });

  it('accepts a single reader file', () => {
    const file = put('pairing/qrReader.ts', drawLine);
    expect(run(claims, file).status).toBe(0);
  });

  it('passes on the real source of the app', () => {
    expect(run(claims, resolve(here, '../src')).status).toBe(0);
  });
});

// T23b: the patterns that keep the save path of a generated plan to one place (FR4, FR30, FR31).
describe('phase-check.sh: patterns for the confirm-before-save path', () => {
  describe('object key activePhase with a value', () => {
    it('fails outside the protocol folder and the generator file', () => {
      put('ui/a.ts', 'const p = { id: 1, activePhase: 2, name: "x" };');
      const r = run(phase, dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/ui\/a\.ts/);
    });

    it('fails on a key at the end of the object', () => {
      put('ui/b.ts', 'return { ...p, activePhase: n };');
      expect(run(phase, dir).status).toBe(1);
    });

    it('fails in another file of the generator folder', () => {
      put('lib/protocolGen/other.ts', 'const p = { activePhase: 2 };');
      expect(run(phase, dir).status).toBe(1);
    });

    it('passes in the protocol folder and in the generator file', () => {
      put('lib/protocol/x.ts', 'const p = { activePhase: 2 };');
      put('lib/protocolGen/generate.ts', 'const p = { activePhase: phase2 ? 2 : 1, };');
      expect(run(phase, dir).status).toBe(0);
    });

    it('passes on a type line and on a prop that passes the value', () => {
      put('ui/Home.tsx', 'interface Props {\n  activePhase: number;\n}\nreturn <Home activePhase={s.activePhase} />;');
      expect(run(phase, dir).status).toBe(0);
    });
  });

  describe('the generator imports no storage', () => {
    it.each([
      ['an import of the storage folder', "import { saveProtocol } from '../storage';"],
      ['an import of a storage file', "import { createDb } from '../storage/db';"],
      ['an import of dexie', "import Dexie from 'dexie';"],
      ['an import of the save module', "import { acceptProposal } from '../protocol/accept';"],
      ['a dynamic import of storage', "const m = await import('../storage/db');"],
      ['a use of localStorage', "const v = localStorage.getItem('k');"],
      ['a use of indexedDB', 'const r = indexedDB.open("x");'],
    ])('fails on %s', (_name, line) => {
      put('lib/protocolGen/generate.ts', line);
      const r = run(phase, dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/protocolGen/);
    });

    it('passes on imports of the schema and the rules', () => {
      put('lib/protocolGen/generate.ts', "import { protocolSchema } from '../protocol/schema';\nimport { RULES } from './rules';");
      expect(run(phase, dir).status).toBe(0);
    });

    it('does not flag storage imports outside the generator folder', () => {
      put('ui/LoadProtocol.tsx', "import { createDb } from '../lib/storage';");
      expect(run(phase, dir).status).toBe(0);
    });
  });

  describe('callers of acceptProposal and confirmByPerson', () => {
    it.each([
      ['acceptProposal', 'ui/Home.tsx', 'await acceptProposal(db, p, c, mode);'],
      ['acceptProposal', 'lib/protocolGen/save.ts', 'acceptProposal(db, p, c, mode);'],
      ['acceptProposal', 'lib/protocol/other.ts', 'acceptProposal(db, p, c, mode);'],
      ['confirmByPerson', 'ui/Home.tsx', 'const c = confirmByPerson(e);'],
      ['confirmByPerson', 'lib/protocol/other.ts', 'confirmByPerson(e);'],
    ])('fails on a call of %s in %s', (_name, rel, line) => {
      put(rel, line);
      const r = run(phase, dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain(rel);
    });

    it('passes in the screen that confirms and in the accept file', () => {
      put('ui/ConfirmPlan.tsx', 'const c = confirmByPerson(e);\nawait acceptProposal(db, p, c, mode);');
      put('lib/protocol/accept.ts', 'export function confirmByPerson(e: Event) {}\nexport async function acceptProposal() {}');
      expect(run(phase, dir).status).toBe(0);
    });

    it('passes on an import with no call', () => {
      put('ui/Home.tsx', "import { acceptProposal, confirmByPerson } from '../lib/protocol/accept';");
      expect(run(phase, dir).status).toBe(0);
    });

    it('skips a line with the allow marker', () => {
      put('ui/Home.tsx', '// acceptProposal(db) is named here. claims-check:allow');
      expect(run(phase, dir).status).toBe(0);
    });
  });

  describe('saveProtocol and the protocol table', () => {
    it('fails when a file other than the three allowed files calls saveProtocol', () => {
      put('ui/Other.tsx', 'await saveProtocol(db, raw, mode);');
      const r = run(phase, dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('ui/Other.tsx');
    });

    it('fails when a file that uses the generator calls saveProtocol', () => {
      put('ui/LoadProtocol.tsx', "import { generateProtocol } from '../lib/protocolGen';\nawait saveProtocol(db, JSON.stringify(p), mode);");
      const r = run(phase, dir);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('LoadProtocol.tsx');
    });

    it('fails when a file reads the generated field and calls saveProtocol', () => {
      put('ui/LoadProtocol.tsx', 'if (p.generated) {}\nawait saveProtocol(db, raw, mode);');
      expect(run(phase, dir).status).toBe(1);
    });

    it('passes when the load screen saves a file and the accept file saves a plan', () => {
      put('ui/LoadProtocol.tsx', 'result = await saveProtocol(db, await file.text(), mode);');
      put('lib/protocol/accept.ts', 'await saveProtocol(db, JSON.stringify(next), mode);');
      put('lib/storage/db.ts', 'export async function saveProtocol(db: MpflDb, raw: string, mode: Mode) {}');
      expect(run(phase, dir).status).toBe(0);
    });

    it('fails on a direct write to the protocol table outside the storage file', () => {
      put('ui/Sneaky.tsx', 'await db.protocol.put({ key: "current", raw, savedAt });');
      expect(run(phase, dir).status).toBe(1);
    });

    it('fails on a write to the protocol table in the protocol folder', () => {
      put('lib/protocol/other.ts', 'await db.protocol.put({ key: "current", raw, savedAt });');
      expect(run(phase, dir).status).toBe(1);
    });

    it('passes on a read of the protocol table and on a write in the storage file', () => {
      put('ui/Reader.tsx', 'const s = await db.protocol.get("current");');
      put('lib/storage/db.ts', "await db.protocol.put({ key: 'current', raw, savedAt });");
      expect(run(phase, dir).status).toBe(0);
    });
  });

  it('keeps the old patterns when a new violation is also present', () => {
    put('ui/p.ts', 'store.activePhase = 2;');
    expect(run(phase, dir).status).toBe(1);
  });

  it('exits 2 for a missing path and does not scan', () => {
    const r = run(phase, join(dir, 'missing'));
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/not found/);
  });

  it('scans the folder that it is given and not the real source', () => {
    put('lib/protocolGen/generate.ts', "import Dexie from 'dexie';");
    expect(run(phase, dir).status).toBe(1);
    expect(run(phase, realSrc).status).toBe(0);
  });

  it('passes on the real source', () => {
    expect(run(phase, realSrc).status).toBe(0);
  }, 30_000);
});

describe('phase-check.sh: bypass patterns (F4b)', () => {
  it.each([
    ['acceptProposal', "import { acceptProposal as ap } from '../lib/protocol/accept';\nawait ap(db, p, c, mode);"],
    ['confirmByPerson', "import { confirmByPerson as cp } from '../lib/protocol/accept';"],
    ['saveProtocol', "import { saveProtocol as sp } from '../lib/storage/db';"],
    ['a re-export under a new name', 'export { saveProtocol as store } from "../lib/storage/db";'],
    ['a destructure rename', "const { acceptProposal: ap } = await import('../lib/protocol/accept');"],
    ['a quoted member name', "const m = await import('../lib/protocol/accept');\nawait m['acceptProposal'](db, p, c, mode);"],
  ])('fails on an alias of %s outside the allowed callers', (_name, text) => {
    put('ui/Alias.tsx', text);
    const r = run(phase, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ui/Alias.tsx');
  });

  it.each([
    ['a concatenation', "const k = 'active' + 'Phase';\nreturn { ...p, [k]: 2 };"],
    ['a second concatenation', "const k = 'active'+'Phase';"],
    ['a concatenation with the end part first', "const k = prefix + 'Phase';"],
    ['a template', 'const k = `active${suffix}`;'],
    ['a template with the end part', 'const k = `${prefix}Phase`;'],
    ['an array join', "const k = ['active', 'Phase'].join('');"],
  ])('fails on %s that builds the text activePhase', (_name, text) => {
    put('ui/Computed.ts', text);
    expect(run(phase, dir).status).toBe(1);
  });

  it.each([
    ['db.table with a string name', "await db.table('protocol').put(p);"],
    ['db.table with double quotes', 'await db.table("protocol").put(p);'],
    ['a call of .table on another object', 'const t = store.table(name);'],
    ['a bracket access of the protocol table', "await db['protocol'].put(p);"],
  ])('fails on %s outside the storage file', (_name, text) => {
    put('ui/Table.tsx', text);
    expect(run(phase, dir).status).toBe(1);
  });

  it('passes on .table in the storage file', () => {
    put('lib/storage/db.ts', "const t = db.table('protocol');");
    expect(run(phase, dir).status).toBe(0);
  });

  it.each([
    ['a replace call', "const t = raw.replace('\"activePhase\":1', '\"activePhase\":2');"],
    ['a JSON.parse line', "const o = JSON.parse(text); o['activePhase'] = 2;"],
    ['a quoted key', "const o = {}; o[\"activePhase\"] = 2;"],
    ['a template with the text', 'const t = `{"activePhase":2}`;'],
  ])('fails on the text activePhase in a string (%s) outside the loader and the generator', (_name, text) => {
    put('ui/Json.ts', text);
    expect(run(phase, dir).status).toBe(1);
  });

  it('passes on the text activePhase in a string inside the loader and the generator', () => {
    put('lib/protocol/x.ts', "const k = 'activePhase';");
    put('lib/protocolGen/generate.ts', "const k = 'activePhase';");
    expect(run(phase, dir).status).toBe(0);
  });

  it('passes on a template that only reads the phase', () => {
    put('lib/planView.ts', 'return `Phase ${p.activePhase} ${name}`;');
    expect(run(phase, dir).status).toBe(0);
  });
});

describe('claims-check.sh: praise and outcome words (F4b)', () => {
  const praise = [
    'great', 'nice', 'well done', 'excellent', 'awesome', 'congratulations', 'success', 'successful',
    'improve', 'improving', 'improved', 'worse', 'worsening', 'healing', 'recovered', 'recovery',
  ];
  it.each(praise)('fails on "%s" in a screen file', (word) => {
    put('ui/Praise.tsx', `export const t = "Your knee: ${word}";`);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ui/Praise.tsx');
  });

  it('fails on the full praise sentence of the audit', () => {
    put('ui/Praise.tsx', 'const t = "Great job. Well done, your knee is improving. Success!";');
    expect(run(claims, dir).status).toBe(1);
  });

  it.each(['lib/cues.ts', 'lib/redflags.ts', 'pose/camera.ts', 'lib/sets.ts', 'lib/guides.ts', 'lib/planView.ts', 'lib/onboarding.ts', 'ui/setupView.ts'])(
    'checks %s for a praise word',
    (rel) => {
      put(rel, 'export const t = "Your knee is improving";');
      expect(run(claims, dir).status).toBe(1);
    },
  );

  it('skips a praise word on a line with the allow marker', () => {
    put('ui/Praise.tsx', 'const t = "recovery"; // claims-check:allow');
    expect(run(claims, dir).status).toBe(0);
  });

  it('does not check a file that no patient reads', () => {
    put('lib/other.ts', 'const success = true; // great');
    expect(run(claims, dir).status).toBe(0);
  });
});

describe('claims-check.sh: no colour in a screen file (F4b)', () => {
  it.each([
    ['an inline style object', "<div style={{ color: 'green' }}>x</div>"],
    ['an inline style attribute', '<div style="color:red">x</div>'],
    ['an inline style with a variable', '<div style={s}>x</div>'],
    ['a style write through the DOM', 'el.style.color = v;'],
    ['a style attribute set by code', "el.setAttribute('style', v);"],
  ])('fails on %s in a ui file', (_name, text) => {
    put('ui/Colour.tsx', text);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ui/Colour.tsx');
  });

  it.each([
    ['a hex colour', "const c = '#00ff00';"],
    ['a short hex colour', 'const c = "#0f0";'],
    ['a colour name', "const c = 'green';"],
    ['an rgb colour', 'const c = `rgb(0, 200, 0)`;'],
    ['an hsl colour', "const c = 'hsl(120 50% 50%)';"],
    ['an oklch colour', "const c = 'oklch(0.7 0.2 140)';"],
  ])('fails on %s in a tsx file', (_name, text) => {
    put('ui/Literal.tsx', text);
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes on the SVG paint values that the icons use', () => {
    put('ui/Icon.tsx', '<svg fill="none" stroke="currentColor"><path fill="currentColor" /></svg>');
    expect(run(claims, dir).status).toBe(0);
  });

  it('passes on an anchor link and a CSS variable name', () => {
    put('ui/Link.tsx', '<a href="#main">Skip</a>;\nconst v = "var(--paper)";');
    expect(run(claims, dir).status).toBe(0);
  });
});

// F5a: seven save paths that the final audit found and that the first patterns missed.
// HONEST LIMIT: each pattern matches text. A person can still hide a save path from a text match.
describe('phase-check.sh: more save paths (F5a)', () => {
  it.each([
    ['a key from fromCharCode', "const k = String.fromCharCode(97, 99, 116, 105, 118, 101);\nreturn { ...p, [k]: 2 };"],
    ['a table kept in a variable', 'const t = db.protocol;\nawait t.put(p);'],
    ['a table kept in a variable with a type', 'const t: Table = store.protocol;'],
    ['a destructured table', 'const { protocol } = db;\nawait protocol.put(p);'],
    ['a destructured parameter', 'const f = ({ protocol }) => protocol.put(p);'],
    ['a bare write to a table name', 'await protocol.put(p);'],
    ['db.tables', 'await db.tables.find((t) => t.name === "protocol")!.put(p);'],
    ['a raw indexedDB open', "const r = indexedDB.open('mpfl-rehab');"],
    ['a new Dexie', "const d = new Dexie('mpfl-rehab');"],
    ['a Dexie import', "import Dexie from 'dexie';"],
    ['acceptProposal with the argument on the next line', 'await acceptProposal(\n  db, p, c, mode);'],
    ['acceptProposal with the bracket on the next line', 'await acceptProposal\n  (db, p, c, mode);'],
    ['confirmByPerson with the bracket on the next line', 'const c = confirmByPerson\n(e);'],
    ['saveProtocol with the bracket on the next line', 'await st.saveProtocol\n(db, raw, mode);'],
    ['a table call split before the method', 'await db.protocol\n  .put(p);'],
  ])('fails on %s in a ui file', (_name, text) => {
    const rel = 'ui/Bypass.ts';
    put(rel, text);
    const r = run(phase, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(rel);
  });

  it('passes when the same split call is in an allowed file', () => {
    put('ui/ConfirmPlan.tsx', 'await acceptProposal(\n  db, p, c, mode);\nconst c = confirmByPerson\n(e);');
    put('ui/LoadProtocol.tsx', 'await saveProtocol\n(db, raw, mode);');
    expect(run(phase, dir).status).toBe(0);
  });

  it('passes on Dexie, indexedDB, tables and fromCharCode in the files that may hold them', () => {
    put('lib/storage/db.ts', "import Dexie from 'dexie';\nconst d = new Dexie(name);\nconst { protocol } = db;\nawait protocol.put(p);\nconst t = db.protocol;\nawait db.tables;");
    put('lib/pairing/payload.ts', 'const s = String.fromCharCode(...bytes);');
    expect(run(phase, dir).status).toBe(0);
  });

  it('passes on a read of the protocol prop and on a protocol value', () => {
    put('ui/Show.tsx', 'const { protocol } = props;\nreturn <A protocol={protocol} />;');
    expect(run(phase, dir).status).toBe(0);
  });

  it('names the header test file that exists', () => {
    const head = execFileSync('head', ['-n', '30', phase], { encoding: 'utf8' });
    expect(head).toContain('tests/importGraph.test.ts');
    expect(head).not.toContain('tests/ui/importGraph.test.ts');
  });
});

// F5a: gaps that the final audit found in claims-check.sh.
// HONEST LIMIT: a pattern match joins quoted parts that sit next to a plus sign. It cannot see a word that a variable or a function builds.
describe('claims-check.sh: praise built from parts, more words, more files (F5a)', () => {
  it.each([
    ['a plus between two strings', "const t = 'Well ' + 'done';"],
    ['a plus with no spaces', 'const t = "Well "+"done";'],
    ['a word cut in two', "const t = 'Excel' + 'lent';"],
    ['a plus on the next line', "const t = 'Great '\n  + 'job';"],
    ['a template part that is empty', 'const t = `Excel${\'\'}lent`;'],
    ['a join of two parts', "const t = ['Well ', 'done'].join('');"],
  ])('fails on praise built from parts: %s', (_n, text) => {
    put('ui/Parts.tsx', text);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ui/Parts.tsx');
  });

  it('passes on two parts that do not make a banned word', () => {
    put('ui/Parts.tsx', "const t = 'Stop at ' + 'your limit';");
    expect(run(claims, dir).status).toBe(0);
  });

  it.each(['proud', 'fantastic', 'amazing', 'brilliant', 'superb', 'impressive', 'well-done', 'keep it up', 'you did it', 'way to go', 'healed'])(
    'fails on the praise word "%s"',
    (word) => {
      put('ui/Praise.tsx', `const t = "Today you are ${word}.";`);
      expect(run(claims, dir).status).toBe(1);
    },
  );

  it.each(['lib/cues.ts', 'lib/sets.ts', 'lib/guides.ts', 'lib/planView.ts', 'lib/onboarding.ts', 'lib/figure.ts', 'lib/setupRules.ts', 'lib/redflags.ts',
    'ui/askSurgeon.ts', 'lib/reviewSummary.ts', 'lib/contactCard.ts'])('checks %s for the new praise words', (rel) => {
    put(rel, 'export const t = "Fantastic work";');
    expect(run(claims, dir).status).toBe(1);
  });

  it('checks a lib file that holds patient text for a split praise word', () => {
    put('lib/contactCard.ts', "export const t = 'Well ' + 'done';");
    expect(run(claims, dir).status).toBe(1);
  });

  it('does not check the source quotes of the plan generator', () => {
    put('lib/protocolGen/sources.ts', 'export const q = "Recovery and improvement after surgery";');
    put('lib/protocolGen/rules.ts', 'export const q = "recovery";');
    expect(run(claims, dir).status).toBe(0);
  });

  it('keeps the old praise words', () => {
    put('ui/Praise.tsx', 'const t = "Success";');
    expect(run(claims, dir).status).toBe(1);
  });
});

describe('claims-check.sh: colour from a lib file and in a var() fallback (F5a)', () => {
  it.each([
    ['a colour name in a style object', "export const s = { color: 'limegreen' };"],
    ['a colour name that is not on the list', "export const s = { color: 'chartreuse' };"],
    ['a background name', "export const s = { background: 'palegreen' };"],
    ['a hex colour', "export const c = '#0a0';"],
    ['an rgb function', 'export const c = `rgb(0 200 0)`;'],
    ['a colour name in quotes', "export const c = 'green';"],
  ])('fails on %s in a lib file', (_n, text) => {
    put('lib/palette.ts', text);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('lib/palette.ts');
  });

  it('fails on a colour in lib/figure.ts too', () => {
    put('lib/figure.ts', "export const c = { fill: 'red' };");
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes on a CSS variable name and on currentColor in a lib file', () => {
    put('lib/figure.ts', "export const a = { fill: 'var(--ink)', stroke: 'currentColor', color: 'none' };");
    expect(run(claims, dir).status).toBe(0);
  });

  it.each([
    ['a colour name', 'a { color: var(--ok, red); }'],
    ['a hex colour', 'a { color: var(--ok, #0f0); }'],
    ['an rgb colour', 'a { color: var(--ok, rgb(0 200 0)); }'],
    ['a name with no space', 'a { color: var(--ok,lime); }'],
  ])('fails on %s as a var() fallback in a css file', (_n, text) => {
    put('ui/x.css', text);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('ui/x.css');
  });

  it('fails on a var() fallback colour in a tsx string', () => {
    put('ui/Box.tsx', "const c = 'var(--ok, lime)';");
    expect(run(claims, dir).status).toBe(1);
  });

  it('passes on a var() with another variable as the fallback and on a colour token in a css file', () => {
    put('ui/x.css', ':root { --paper: #fafaf7; }\na { color: var(--ink, var(--paper)); border: 1px solid var(--line); }');
    expect(run(claims, dir).status).toBe(0);
  });
});

describe('claims-check.sh: frame and relay APIs (F5a)', () => {
  it.each([
    ['captureStream', 'const s = video.captureStream();'],
    ['VideoFrame', 'const f = new VideoFrame(video);'],
    ['MediaStreamTrackProcessor', 'const p = new MediaStreamTrackProcessor({ track });'],
    ['a stun url', "const c = { urls: 'stun:stun.example.org' };"],
    ['a turn url', 'const c = { urls: "turn:relay.example.org" };'],
    ['a filled ice list', "const p = new RTCPeerConnection({ iceServers: [{ urls: 'x' }] });"],
    ['an ice list over two lines', 'const p = new RTCPeerConnection({ iceServers: [\n  { urls: u },\n] });'],
    ['an ice list from a variable', 'const p = new RTCPeerConnection({ iceServers: servers });'],
    ['an ice list as a shorthand key', 'const p = new RTCPeerConnection({ iceServers });'],
  ])('fails on %s', (_n, text) => {
    put('pairing/link.ts', text);
    const r = run(claims, dir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('pairing/link.ts');
  });

  it('passes on the empty ice list of the data channel and on requestVideoFrameCallback', () => {
    put('pairing/link.ts', 'const p = new RTCPeerConnection({ iceServers: [] });\nconst p2 = new RTCPeerConnection({ iceServers: [ ] });');
    put('pose/loop.ts', 'const h = video.requestVideoFrameCallback(tick);');
    expect(run(claims, dir).status).toBe(0);
  });

  it('passes on the real source of the app, with no allow marker added by F5a', () => {
    expect(run(claims, realSrc).status).toBe(0);
  }, 30_000);
});
