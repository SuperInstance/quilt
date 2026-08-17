/**
 * Tests for the core engine. These are the spec by which we know the
 * substrate is doing the right thing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QuiltEngine, type SheetDef, type CellDef } from '../src/index.js';

function define(sheet: SheetDef): QuiltEngine {
  const engine = new QuiltEngine('test');
  engine.loadSheet(sheet);
  return engine;
}

describe('value cells', () => {
  it('returns the static value', async () => {
    const engine = define({
      id: 'test',
      cells: [{ id: 'answer', kind: 'value', value: 42 }],
    });
    const v = await engine.get('answer');
    expect(v.status).toBe('ready');
    expect(v.data).toBe(42);
  });
});

describe('formula cells', () => {
  it('evaluates a formula referencing other cells', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'a', kind: 'value', value: 3 },
        { id: 'b', kind: 'value', value: 4 },
        { id: 'sum', kind: 'formula', expr: '=a + b' },
      ],
    });
    const v = await engine.get('sum');
    expect(v.status).toBe('ready');
    expect(v.data).toBe(7);
  });

  it('recomputes when a dependency changes', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'a', kind: 'value', value: 3 },
        { id: 'b', kind: 'value', value: 4 },
        { id: 'sum', kind: 'formula', expr: '=a + b' },
      ],
    });
    expect((await engine.get('sum')).data).toBe(7);
    await engine.set('a', 10);
    expect((await engine.get('sum')).data).toBe(14);
  });

  it('uses helpers like max/min/clamp', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'temp', kind: 'value', value: 150 },
        { id: 'safe', kind: 'formula', expr: '=clamp(temp, 0, 100)' },
      ],
    });
    expect((await engine.get('safe')).data).toBe(100);
  });

  it('caller context is visible in formulas', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'tenants', kind: 'value', value: 'small' },
        { id: 'tier', kind: 'formula', expr: '=caller.row > 10 ? "premium" : "basic"' },
      ],
    });
    const r1 = await engine.get('tier', { row: 5, timestamp: 0 });
    const r2 = await engine.get('tier', { row: 50, timestamp: 0 });
    expect(r1.data).toBe('basic');
    expect(r2.data).toBe('premium');
  });
});

describe('api cells', () => {
  it('makes an HTTP request and returns the result', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      return new Response(JSON.stringify({ url, ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const engine = define({
        id: 'test',
        cells: [
          { id: 'api', kind: 'api', endpoint: 'https://example.com/test', method: 'GET' },
        ],
      });
      const v = await engine.call('api');
      expect(v.status).toBe('ready');
      expect((v.data as { ok: boolean }).ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('router cells', () => {
  it('routes based on caller context', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'fast', kind: 'value', value: 'fast-result' },
        { id: 'precise', kind: 'value', value: 'precise-result' },
        {
          id: 'router',
          kind: 'router',
          rules: [
            { when: 'caller.row > 10', route: 'fast' },
            { when: 'caller.row <= 10', route: 'precise' },
          ],
        },
      ],
    });
    const r1 = await engine.call('router', undefined, { row: 5, timestamp: 0 });
    const r2 = await engine.call('router', undefined, { row: 50, timestamp: 0 });
    expect(r1.data).toBe('precise-result');
    expect(r2.data).toBe('fast-result');
  });
});

describe('subscriptions', () => {
  it('notifies on set', async () => {
    const engine = define({
      id: 'test',
      cells: [{ id: 'x', kind: 'value', value: 1 }],
    });
    const seen: number[] = [];
    engine.subscribe('x', (v) => { seen.push(v.data as number); });
    await engine.set('x', 2);
    await engine.set('x', 3);
    expect(seen).toEqual([2, 3]);
  });
});

describe('program cells', () => {
  it('runs arbitrary code with runtime handle', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'a', kind: 'value', value: 5 },
        { id: 'b', kind: 'value', value: 7 },
        {
          id: 'sum',
          kind: 'program',
          code: `
            const av = await runtime.get('a');
            const bv = await runtime.get('b');
            return av.data + bv.data;
          `,
        },
      ],
    });
    const v = await engine.call('sum');
    expect(v.status).toBe('ready');
    expect(v.data).toBe(12);
  });
});
