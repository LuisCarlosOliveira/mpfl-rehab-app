import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const script = 'scripts/model-hash-check.sh';
const tmp = mkdtempSync(join(tmpdir(), 'vst-t8-hash-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const run = (dir?: string) => spawnSync('bash', dir ? [script, dir] : [script], { encoding: 'utf8' });

describe('model-hash-check.sh', () => {
  it('passes on the shipped files', () => {
    const r = run();
    expect(r.status).toBe(0);
  });

  it('fails if a model file changes', () => {
    const copy = join(tmp, 'changed');
    cpSync('public/models', copy, { recursive: true });
    appendFileSync(join(copy, 'pose_landmarker_lite.task'), 'x');
    const r = run(copy);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FAIL');
  });

  it('fails if a WASM file changes', () => {
    const copy = join(tmp, 'wasm');
    cpSync('public/models', copy, { recursive: true });
    writeFileSync(join(copy, 'wasm/vision_wasm_internal.js'), 'changed');
    expect(run(copy).status).toBe(1);
  });

  it('fails if a listed file is missing', () => {
    const copy = join(tmp, 'missing');
    cpSync('public/models', copy, { recursive: true });
    execFileSync('rm', [join(copy, 'wasm/vision_wasm_internal.wasm')]);
    expect(run(copy).status).toBe(1);
  });

  it('fails if SHA256SUMS is missing', () => {
    const copy = join(tmp, 'nosums');
    cpSync('public/models', copy, { recursive: true });
    execFileSync('rm', [join(copy, 'SHA256SUMS')]);
    expect(run(copy).status).toBe(1);
  });
});
