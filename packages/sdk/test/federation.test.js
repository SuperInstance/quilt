/**
 * @quilt/sdk — federation tests
 *
 * Tests for cross-Quilt cell addressing: parseCellRef, resolveCell,
 * subscribeCell, CellRouter, detectTier, and the local/HTTP transports.
 *
 *   cd packages/sdk && npx tsx --test test/federation.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseCellRef,
  resolveCell,
  subscribeCell,
  CellRouter,
  detectTier,
  tierInfoFor,
  LocalCellTransport,
  HttpCellTransport,
  CellRefError,
} from '../src/index.ts';

// ──────────────────────────────────────────────────────────────────────────
//  parseCellRef
// ──────────────────────────────────────────────────────────────────────────

test('parseCellRef: simple local ref', () => {
  const r = parseCellRef('quilt://local/boat-autopilot#rudder.angle');
  assert.equal(r.instance, 'local');
  assert.equal(r.sheet, 'boat-autopilot');
  assert.equal(r.cellPath, 'rudder.angle');
  assert.equal(r.isWildcard, false);
});

test('parseCellRef: remote instance', () => {
  const r = parseCellRef('quilt://jetson-lab/perception#vision.scene');
  assert.equal(r.instance, 'jetson-lab');
  assert.equal(r.sheet, 'perception');
  assert.equal(r.cellPath, 'vision.scene');
});

test('parseCellRef: dotted sheet name', () => {
  const r = parseCellRef('quilt://codespace-7c3/prod.app#anomaly.detector');
  assert.equal(r.instance, 'codespace-7c3');
  assert.equal(r.sheet, 'prod.app');
  assert.equal(r.cellPath, 'anomaly.detector');
});

test('parseCellRef: deep cell path', () => {
  const r = parseCellRef('quilt://local/s#a.b.c.d.e');
  assert.equal(r.cellPath, 'a.b.c.d.e');
});

test('parseCellRef: instance wildcard', () => {
  const r = parseCellRef('quilt://*/prod#x');
  assert.equal(r.isWildcard, true);
});

test('parseCellRef: sheet wildcard', () => {
  const r = parseCellRef('quilt://esp32-fleet/+#rudder.angle');
  assert.equal(r.isWildcard, true);
});

test('parseCellRef: cell wildcard', () => {
  const r = parseCellRef('quilt://local/sheet#*');
  assert.equal(r.isWildcard, true);
});

test('parseCellRef: rejects non-quilt scheme', () => {
  assert.throws(() => parseCellRef('http://local/s#x'), CellRefError);
});

test('parseCellRef: rejects missing hash', () => {
  assert.throws(() => parseCellRef('quilt://local/sheet'), CellRefError);
});

test('parseCellRef: rejects empty cell path', () => {
  assert.throws(() => parseCellRef('quilt://local/sheet#'), CellRefError);
});

test('parseCellRef: rejects missing sheet', () => {
  assert.throws(() => parseCellRef('quilt://local#x'), CellRefError);
});

// ──────────────────────────────────────────────────────────────────────────
//  LocalCellTransport + resolveCell + subscribeCell
// ──────────────────────────────────────────────────────────────────────────

/**
 * A fake local engine for testing. Cells are just a Map; subscriptions
 * are a Set of callbacks fired on set().
 */
function fakeEngine(initial = {}) {
  const cells = new Map(Object.entries(initial));
  const subs = new Map();

  return {
    async getCell(_sheet, path) {
      return cells.get(path);
    },
    async setCell(_sheet, path, value) {
      cells.set(path, value);
      for (const cb of subs.get(path) ?? []) cb(value);
    },
    subscribe(_sheet, path, callback) {
      let set = subs.get(path);
      if (!set) { set = new Set(); subs.set(path, set); }
      set.add(callback);
      return () => set.delete(callback);
    },
  };
}

test('resolveCell: local engine returns live handle', async () => {
  const engine = fakeEngine({ 'rudder.angle': 12.5 });
  const transport = new LocalCellTransport(new Map([['local', engine]]));

  const h = await resolveCell('quilt://local/boat-autopilot#rudder.angle', transport);
  const v = await h.get();
  assert.equal(v, 12.5);
});

test('resolveCell: set propagates', async () => {
  const engine = fakeEngine({ 'rudder.angle': 12.5 });
  const transport = new LocalCellTransport(new Map([['local', engine]]));

  const h = await resolveCell('quilt://local/boat-autopilot#rudder.angle', transport);
  await h.set(20.0);
  const v = await h.get();
  assert.equal(v, 20.0);
});

test('resolveCell: subscribe fires on change', async () => {
  const engine = fakeEngine({ 'rudder.angle': 12.5 });
  const transport = new LocalCellTransport(new Map([['local', engine]]));

  const h = await resolveCell('quilt://local/boat-autopilot#rudder.angle', transport);
  const seen = [];
  h.subscribe((v) => seen.push(v));

  // Wait a tick for subscription to register
  await new Promise((r) => setTimeout(r, 5));
  await engine.setCell('boat-autopilot', 'rudder.angle', 25.0);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, [25.0]);
});

test('resolveCell: subscribe can be unsubscribed', async () => {
  const engine = fakeEngine({ 'rudder.angle': 12.5 });
  const transport = new LocalCellTransport(new Map([['local', engine]]));

  const h = await resolveCell('quilt://local/boat-autopilot#rudder.angle', transport);
  const seen = [];
  const unsub = h.subscribe((v) => seen.push(v));
  await new Promise((r) => setTimeout(r, 5));
  await engine.setCell('boat-autopilot', 'rudder.angle', 30.0);
  await new Promise((r) => setTimeout(r, 5));
  unsub();
  await engine.setCell('boat-autopilot', 'rudder.angle', 40.0);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, [30.0]);
});

test('resolveCell: rejects wildcard', async () => {
  const engine = fakeEngine();
  const transport = new LocalCellTransport(new Map([['local', engine]]));
  await assert.rejects(
    () => resolveCell('quilt://*/sheet#x', transport),
    CellRefError
  );
});

test('LocalCellTransport: routes "local" to first engine', async () => {
  const engine = fakeEngine({ x: 42 });
  const transport = new LocalCellTransport(new Map([['local', engine]]));
  const v = await transport.get('local', 'sheet', 'x');
  assert.equal(v, 42);
});

test('LocalCellTransport: routes named instance', async () => {
  const engine = fakeEngine({ x: 99 });
  const transport = new LocalCellTransport(new Map([['jetson', engine]]));
  const v = await transport.get('jetson', 'sheet', 'x');
  assert.equal(v, 99);
});

test('LocalCellTransport: rejects unknown instance', async () => {
  const engine = fakeEngine();
  const transport = new LocalCellTransport(new Map([['local', engine]]));
  await assert.rejects(
    () => transport.get('jetson', 'sheet', 'x'),
    CellRefError
  );
});

// ──────────────────────────────────────────────────────────────────────────
//  CellRouter
// ──────────────────────────────────────────────────────────────────────────

test('CellRouter: routes to the right transport', async () => {
  const local = fakeEngine({ x: 1 });
  const jetson = fakeEngine({ x: 2 });
  const codespace = fakeEngine({ x: 3 });

  const router = new CellRouter();
  router.add('local', new LocalCellTransport(new Map([['local', local]])));
  router.add('jetson-lab', new LocalCellTransport(new Map([['jetson-lab', jetson]])));
  router.add('codespace-7c3', new LocalCellTransport(new Map([['codespace-7c3', codespace]])));

  const h1 = await router.resolve('quilt://local/sheet#x');
  const h2 = await router.resolve('quilt://jetson-lab/sheet#x');
  const h3 = await router.resolve('quilt://codespace-7c3/sheet#x');

  assert.equal(await h1.get(), 1);
  assert.equal(await h2.get(), 2);
  assert.equal(await h3.get(), 3);
});

test('CellRouter: subscribe receives cross-instance updates', async () => {
  const local = fakeEngine({ rudder: 0 });
  const router = new CellRouter();
  router.add('local', new LocalCellTransport(new Map([['local', local]])));

  const seen = [];
  router.subscribe('quilt://local/boat#rudder', (v) => seen.push(v));
  await new Promise((r) => setTimeout(r, 5));

  await local.setCell('boat', 'rudder', 10);
  await local.setCell('boat', 'rudder', 20);
  await new Promise((r) => setTimeout(r, 5));
  assert.deepEqual(seen, [10, 20]);
});

test('CellRouter: rejects unknown instance', async () => {
  const router = new CellRouter();
  await assert.rejects(
    () => router.resolve('quilt://nonexistent/sheet#x'),
    CellRefError
  );
});

test('CellRouter: instances() lists registered', () => {
  const router = new CellRouter();
  router.add('a', new LocalCellTransport(new Map()));
  router.add('b', new LocalCellTransport(new Map()));
  assert.deepEqual(router.instances().sort(), ['a', 'b']);
});

// ──────────────────────────────────────────────────────────────────────────
//  detectTier
// ──────────────────────────────────────────────────────────────────────────

test('detectTier: honors QUILT_TIER override', () => {
  const originalTier = process.env.QUILT_TIER;
  process.env.QUILT_TIER = 'codespace';
  try {
    const t = detectTier();
    assert.equal(t.tier, 'codespace');
    assert.equal(t.platform, 'GitHub Codespace (Linux container)');
  } finally {
    if (originalTier === undefined) delete process.env.QUILT_TIER;
    else process.env.QUILT_TIER = originalTier;
  }
});

test('detectTier: detects Codespace from CODESPACES env var', () => {
  const originalTier = process.env.QUILT_TIER;
  const originalCodespaces = process.env.CODESPACES;
  delete process.env.QUILT_TIER;
  process.env.CODESPACES = 'true';
  try {
    const t = detectTier();
    assert.equal(t.tier, 'codespace');
  } finally {
    if (originalTier === undefined) delete process.env.QUILT_TIER;
    else process.env.QUILT_TIER = originalTier;
    if (originalCodespaces === undefined) delete process.env.CODESPACES;
    else process.env.CODESPACES = originalCodespaces;
  }
});

test('detectTier: falls back to server in Node', () => {
  const originalTier = process.env.QUILT_TIER;
  const originalCodespaces = process.env.CODESPACES;
  const originalTarget = process.env.QUILT_TARGET;
  delete process.env.QUILT_TIER;
  delete process.env.CODESPACES;
  delete process.env.QUILT_TARGET;
  try {
    const t = detectTier();
    assert.equal(t.tier, 'server');
    assert.equal(t.platform, 'Generic server (Node.js / Bun / Deno)');
  } finally {
    if (originalTier === undefined) delete process.env.QUILT_TIER;
    else process.env.QUILT_TIER = originalTier;
    if (originalCodespaces === undefined) delete process.env.CODESPACES;
    else process.env.CODESPACES = originalCodespaces;
    if (originalTarget === undefined) delete process.env.QUILT_TARGET;
    else process.env.QUILT_TARGET = originalTarget;
  }
});

test('tierInfoFor: esp32 has no async but has network', () => {
  const t = tierInfoFor('esp32');
  assert.equal(t.tier, 'esp32');
  assert.equal(t.capabilities.async, false);
  assert.equal(t.capabilities.network, true);
  assert.equal(t.capabilities.gpu, false);
  assert.ok(t.siblings.includes('jetson'));
});

test('tierInfoFor: codespace has async + llm but no GPU', () => {
  const t = tierInfoFor('codespace');
  assert.equal(t.capabilities.async, true);
  assert.equal(t.capabilities.llmApi, true);
  assert.equal(t.capabilities.gpu, false);
});

test('tierInfoFor: jetson has GPU', () => {
  const t = tierInfoFor('jetson');
  assert.equal(t.capabilities.gpu, true);
});

test('tierInfoFor: cloudflare has no filesystem but has persistence via D1/KV', () => {
  const t = tierInfoFor('cloudflare');
  assert.equal(t.capabilities.filesystem, false);
  assert.equal(t.capabilities.persistent, true);
});

test('tierInfoFor: instance id has tier prefix', () => {
  const t = tierInfoFor('codespace');
  assert.match(t.instanceId, /^codespace-/);
});

test('tierInfoFor: unknown has no capabilities', () => {
  const t = tierInfoFor('unknown');
  assert.equal(t.capabilities.async, false);
  assert.equal(t.capabilities.network, false);
});

// ──────────────────────────────────────────────────────────────────────────
//  HttpCellTransport (no actual HTTP — just shape tests)
// ──────────────────────────────────────────────────────────────────────────

test('HttpCellTransport: stores baseUrl and token', () => {
  const t = new HttpCellTransport('https://example.com', 'tok-123');
  // We don't hit the network in this test — just check that the class
  // accepts a base URL and token without throwing.
  assert.ok(t);
});
