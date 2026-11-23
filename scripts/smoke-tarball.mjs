#!/usr/bin/env node
/**
 * Tarball smoke test — the guard against "monorepo blindness".
 *
 * Everything inside the monorepo resolves through workspace links, so a
 * broken published artifact (wrong scope, missing dist, dead bin) is
 * invisible to the normal test suite. This script:
 *
 *   1. `npm pack`s @superinstance/quilt-core exactly as publishing would,
 *   2. installs the tarball into a clean temp dir OUTSIDE the monorepo,
 *   3. runs the README "Getting started" example against the installed
 *      package, by its published name, and asserts the outputs.
 *
 * Run locally:  node scripts/smoke-tarball.mjs
 * Runs in CI:   the `smoke` job in .github/workflows/ci.yml
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreDir = join(repoRoot, 'packages', 'core');
const work = mkdtempSync(join(tmpdir(), 'quilt-tarball-smoke-'));

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

console.log(`smoke dir: ${work}`);

// 1. Pack the core package (prepublishOnly/build must have produced dist).
run('npm', ['pack', '--pack-destination', work], coreDir);
const tarball = readdirSync(work).find((f) => f.endsWith('.tgz'));
if (!tarball) throw new Error('npm pack produced no tarball');
console.log(`packed: ${tarball}`);

// 2. Install the tarball into a clean project outside the monorepo.
writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'smoke', private: true, type: 'module' }, null, 2));
run('npm', ['install', '--no-audit', '--no-fund', join(work, tarball)], work);

// 3. Run the README example against the installed package, by name.
writeFileSync(join(work, 'example.mjs'), `
import { QuiltEngine, parseSheet } from '@superinstance/quilt-core';

const engine = new QuiltEngine('hello');
engine.loadSheet(parseSheet(\`
id: hello
cells:
  - id: greeting
    kind: value
    value: "Hello, "
  - id: name
    kind: value
    value: "world"
  - id: message
    kind: formula
    expr: "greeting + name"
\`));

const result = await engine.get('message');
console.log(result.data);
console.log(result.status);

await engine.set('name', 'Quilt');
console.log((await engine.get('message')).data);
`);

const out = run('node', ['example.mjs'], work).trim().split('\n');
const expected = ['Hello, world', 'ready', 'Hello, Quilt'];
if (JSON.stringify(out) !== JSON.stringify(expected)) {
  throw new Error(`smoke example output mismatch:\n  got:      ${JSON.stringify(out)}\n  expected: ${JSON.stringify(expected)}`);
}
console.log('tarball smoke test PASSED:', out.join(' | '));
