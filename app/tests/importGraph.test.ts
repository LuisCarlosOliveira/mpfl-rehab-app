// @vitest-environment node
// Static import graph of src. It reads each file with the TypeScript parser, so an alias, a re-export,
// a namespace import and a dynamic import all count. It does not use a text pattern.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const realSrc = resolve(here, '../src');

/** Each guarded function, the module that defines it, and every file that may import or re-export it. */
const GUARDED: Record<string, { definedIn: string; allowed: string[] }> = {
  saveProtocol: { definedIn: 'lib/storage/db.ts', allowed: ['lib/protocol/accept.ts', 'lib/storage/index.ts', 'ui/LoadProtocol.tsx'] },
  acceptProposal: { definedIn: 'lib/protocol/accept.ts', allowed: ['ui/ConfirmPlan.tsx'] },
};

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listFiles(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

interface Link {
  from: string;
  to: string;
  names: string[] | 'all';
  reexport: boolean;
}

/** Every import, re-export, dynamic import and require of one file, as links to files inside the root. */
function linksOf(root: string, file: string): Link[] {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
  const out: Link[] = [];
  const target = (spec: string): string | null => {
    if (!spec.startsWith('.')) return null;
    const base = resolve(dirname(file), spec);
    const hit = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((c) => /\.tsx?$/.test(c) && existsSync(c) && statSync(c).isFile());
    return hit ? relative(root, hit) : null;
  };
  const add = (spec: ts.Expression | undefined, names: string[] | 'all', reexport: boolean) => {
    const to = spec && ts.isStringLiteralLike(spec) ? target(spec.text) : null;
    if (to) out.push({ from: relative(root, file), to, names, reexport });
  };
  // The original name counts, so `import { saveProtocol as sp }` is still saveProtocol.
  const original = (list: readonly (ts.ImportSpecifier | ts.ExportSpecifier)[]) => list.map((e) => (e.propertyName ?? e.name).text);
  const visit = (n: ts.Node) => {
    if (ts.isImportDeclaration(n)) {
      const b = n.importClause?.namedBindings;
      add(n.moduleSpecifier, b && ts.isNamedImports(b) ? original(b.elements) : 'all', false);
    } else if (ts.isExportDeclaration(n)) {
      add(n.moduleSpecifier, n.exportClause && ts.isNamedExports(n.exportClause) ? original(n.exportClause.elements) : 'all', true);
    } else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require'))) {
      add(n.arguments[0], 'all', false);
    }
    ts.forEachChild(n, visit);
  };
  visit(source);
  return out;
}

/** Files that import or re-export a guarded name, also through a chain of re-exporting modules. */
function importersOf(root: string, name: string): string[] {
  const links = listFiles(root).flatMap((f) => linksOf(root, f));
  const exposing = new Set([GUARDED[name]!.definedIn]);
  const shows = (l: Link) => exposing.has(l.to) && (l.names === 'all' || l.names.includes(name));
  for (let grew = true; grew; ) {
    grew = false;
    for (const l of links) {
      if (l.reexport && shows(l) && !exposing.has(l.from)) {
        exposing.add(l.from);
        grew = true;
      }
    }
  }
  return [...new Set(links.filter(shows).map((l) => l.from))].sort();
}

describe('import graph of src (F4b)', () => {
  it('reads every module under src', () => {
    const files = listFiles(realSrc);
    expect(files.length).toBeGreaterThan(40);
    for (const f of files) expect(() => linksOf(realSrc, f)).not.toThrow();
  });

  it.each(Object.keys(GUARDED))('lets only the allowed files import %s', (name) => {
    expect(importersOf(realSrc, name)).toEqual(GUARDED[name]!.allowed);
  });

  it('defines saveProtocol in storage/db.ts and imports it in accept.ts', () => {
    expect(readFileSync(join(realSrc, GUARDED.saveProtocol!.definedIn), 'utf8')).toMatch(/export async function saveProtocol/);
    expect(importersOf(realSrc, 'saveProtocol')).toContain('lib/protocol/accept.ts');
  });

  describe('on a copy with one added file', () => {
    let dir: string;
    const put = (rel: string, text: string) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), text);
    };
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'mpfl-graph-'));
      put('lib/storage/db.ts', 'export async function saveProtocol() {}');
      put('lib/storage/index.ts', "export { saveProtocol } from './db';");
      put('lib/protocol/accept.ts', "import { saveProtocol } from '../storage/db';\nexport async function acceptProposal() { await saveProtocol(); }");
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it.each([
      ['an import', "import { saveProtocol } from '../lib/storage/db';"],
      ['an alias', "import { saveProtocol as sp } from '../lib/storage/db';"],
      ['an import through the index file', "import { saveProtocol } from '../lib/storage';"],
      ['a namespace import', "import * as s from '../lib/storage/db';"],
      ['a dynamic import', "const m = await import('../lib/storage/db');"],
      ['a re-export under a new name', "export { saveProtocol as save } from '../lib/storage/db';"],
      ['an export star', "export * from '../lib/storage/db';"],
    ])('finds %s of saveProtocol', (_n, text) => {
      put('ui/New.tsx', text);
      expect(importersOf(dir, 'saveProtocol')).toContain('ui/New.tsx');
    });

    it('finds an importer behind a re-export hop', () => {
      put('ui/Hop.ts', "export { saveProtocol } from '../lib/storage';");
      put('ui/Use.ts', "import { saveProtocol as sp } from './Hop';");
      expect(importersOf(dir, 'saveProtocol')).toContain('ui/Use.ts');
    });

    it('finds no new importer when a file imports another name', () => {
      put('ui/Ok.tsx', "import { createDb } from '../lib/storage';");
      expect(importersOf(dir, 'saveProtocol')).toEqual(['lib/protocol/accept.ts', 'lib/storage/index.ts']);
    });
  });
});
