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
  });
});
