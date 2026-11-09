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
  // F5a: the person confirmation. accept.ts defines it and only the confirm screen may use it.
  confirmByPerson: { definedIn: 'lib/protocol/accept.ts', allowed: ['ui/ConfirmPlan.tsx'] },
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
    // F5a: a specifier that ends in .js names the .ts or .tsx file (the way of a Node ESM build), so the graph follows it too.
    const bare = base.replace(/\.(js|mjs|cjs)$/, '');
    const hit = [base, `${base}.ts`, `${base}.tsx`, `${bare}.ts`, `${bare}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((c) => /\.tsx?$/.test(c) && existsSync(c) && statSync(c).isFile());
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

/**
 * F5a: every file that names a guarded identifier in code, whatever the form: a call, a value kept in a variable, a property
 * after a namespace or a dynamic import, or a quoted member name. Comments are not code, so they do not count.
 * HONEST LIMIT: a name that a program builds from parts at run time ('save' + 'Protocol') has no such token. The parser cannot see it.
 */
function referencesOf(root: string, name: string): string[] {
  const out = new Set<string>();
  for (const file of listFiles(root)) {
    const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, kind);
    const visit = (n: ts.Node) => {
      if ((ts.isIdentifier(n) || ts.isStringLiteralLike(n) || ts.isPrivateIdentifier(n)) && n.text === name) out.add(relative(root, file));
      ts.forEachChild(n, visit);
    };
    visit(source);
  }
  return [...out].sort();
}

/** Files that import or name the guarded identifier and are neither the defining file nor on the allowed list. */
function violationsOf(root: string, name: string): string[] {
  const g = GUARDED[name]!;
  const ok = new Set([g.definedIn, ...g.allowed]);
  return [...new Set([...importersOf(root, name), ...referencesOf(root, name)])].filter((f) => !ok.has(f)).sort();
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

  it.each(Object.keys(GUARDED))('names %s in no file outside the defining file and the allowed files (F5a)', (name) => {
    expect(violationsOf(realSrc, name)).toEqual([]);
  });

  it('guards confirmByPerson with the confirm screen as the only importer (F5a)', () => {
    expect(GUARDED.confirmByPerson).toEqual({ definedIn: 'lib/protocol/accept.ts', allowed: ['ui/ConfirmPlan.tsx'] });
    expect(readFileSync(join(realSrc, GUARDED.confirmByPerson!.definedIn), 'utf8')).toMatch(/export function confirmByPerson/);
    expect(importersOf(realSrc, 'confirmByPerson')).toEqual(['ui/ConfirmPlan.tsx']);
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

    it.each([
      ['a .js specifier', "import { saveProtocol } from '../lib/storage/db.js';"],
      ['a .js specifier of a namespace import', "import * as st from '../lib/storage/db.js';"],
      ['a .js specifier of a re-export', "export { saveProtocol as go } from '../lib/storage/db.js';"],
      ['a .js specifier with a dynamic import', "const m = await import('../lib/storage/db.js');"],
    ])('finds %s (F5a)', (_n, text) => {
      put('ui/New.tsx', text);
      expect(importersOf(dir, 'saveProtocol')).toContain('ui/New.tsx');
    });

    it('finds a .js specifier of the confirmation function (F5a)', () => {
      put('lib/protocol/accept.ts', "import { saveProtocol } from '../storage/db';\nexport function confirmByPerson() {}\nexport async function acceptProposal() { await saveProtocol(); }");
      put('ui/New.tsx', "import { confirmByPerson } from '../lib/protocol/accept.js';");
      expect(importersOf(dir, 'confirmByPerson')).toEqual(['ui/New.tsx']);
      expect(violationsOf(dir, 'confirmByPerson')).toEqual(['ui/New.tsx']);
    });

    it('lets the confirm screen use the confirmation function (F5a)', () => {
      put('lib/protocol/accept.ts', 'export function confirmByPerson() {}');
      put('ui/ConfirmPlan.tsx', "import { confirmByPerson } from '../lib/protocol/accept';\nconst c = confirmByPerson();");
      expect(violationsOf(dir, 'confirmByPerson')).toEqual([]);
    });

    it.each([
      ['a value kept in a variable', "import { saveProtocol } from '../lib/storage/db';\nconst f = saveProtocol;\nf();"],
      ['a property of a namespace', "import * as st from '../lib/storage/db';\nst.saveProtocol(1);"],
      ['a quoted member name', "import * as st from '../lib/storage/db';\nst['saveProtocol'](1);"],
      ['a property of a dynamic import with no static link', "const m = await import(path);\nm.saveProtocol(1);"],
      ['an object that holds the function', "const o = { run: saveProtocol };"],
    ])('names the guarded identifier in a file that is not allowed: %s (F5a)', (_n, text) => {
      put('ui/Rebound.ts', text);
      expect(violationsOf(dir, 'saveProtocol')).toContain('ui/Rebound.ts');
    });

    it('does not count a comment or a different name (F5a)', () => {
      put('ui/Clean.ts', '// saveProtocol is named here only in a comment\nconst saveProtocolLater = 1;');
      expect(violationsOf(dir, 'saveProtocol')).toEqual([]);
    });

    it('fails on the file of the final audit: a .js namespace import and a split call (F5a)', () => {
      put('ui/JudgeBypass.ts', "import * as st from '../lib/storage/db.js';\nexport async function go() {\n  await st.saveProtocol\n  (1, 'x', 'demo');\n}\n");
      expect(importersOf(dir, 'saveProtocol')).toContain('ui/JudgeBypass.ts');
      expect(violationsOf(dir, 'saveProtocol')).toEqual(['ui/JudgeBypass.ts']);
    });
  });
});
