/**
 * Playtest-gold pins (R2). Each describe block pins one fix class from
 * the Super Z playtest report. FAIL-first: these pins were written
 * against the pre-fix engine and watched to fail before patching.
 */

import { describe, it, expect } from 'vitest';
import { QuiltEngine, type SheetDef } from '../src/index.js';
import type { AIEngineLike } from '../src/cells/ai.js';

function define(sheet: SheetDef, id = 'test'): QuiltEngine {
  const engine = new QuiltEngine(id);
  engine.loadSheet(sheet);
  return engine;
}

describe('playtest-gold class 7: program/router caches invalidated on upstream change', () => {
  it('program cell with deps recomputes on upstream change', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'n', kind: 'value', value: 1 },
        {
          id: 'p',
          kind: 'program',
          deps: ['n'],
          code: `
            const v = await runtime.get('n');
            return (v.data ?? 0) * 10;
          `,
        },
      ],
    });
    expect((await engine.call('p')).data).toBe(10);
    await engine.set('n', 2);
    // Previously the program kept serving its FIRST result forever.
    expect((await engine.call('p')).data).toBe(20);
  });

  it('router cache is invalidated when a declared upstream changes', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'mode', kind: 'value', value: 'fast' },
        { id: 'fast', kind: 'value', value: 'fast-result' },
        {
          id: 'r',
          kind: 'router',
          deps: ['mode'],
          rules: [{ when: 'true', route: 'fast' }],
        },
      ],
    });
    const ctx = { timestamp: 0 };
    expect((await engine.call('r', undefined, ctx)).data).toBe('fast-result');
    expect(engine.getCell('r')?.value.status).toBe('ready');
    await engine.set('mode', 'other');
    // The declared upstream changed: the cached router result is stale
    // and the cache map is cleared, so the next call re-evaluates.
    expect(engine.getCell('r')?.value.status).toBe('stale');
    expect(engine.getCell('r')?.contextCache.size).toBe(0);
  });
});

describe('playtest-gold class 6: router context delegation + dotted contains', () => {
  it('delegated cell sees the original caller context', async () => {
    const engine = define({
      id: 'test',
      cells: [
        {
          id: 'r',
          kind: 'router',
          rules: [{ when: 'true', route: 'whoami' }],
        },
        {
          id: 'whoami',
          kind: 'program',
          code: `return { row: caller.row ?? null, id: caller.identity?.id ?? null };`,
        },
      ],
    });
    const v = await engine.call('r', undefined, {
      row: 'boat-7',
      timestamp: 0,
      identity: { id: 'agent-1', type: 'agent' },
    });
    expect(v.status).toBe('ready');
    expect(v.data).toEqual({ row: 'boat-7', id: 'agent-1' });
  });

  it('matches on caller.identity.tags (dotted path contains)', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'cheap', kind: 'value', value: 'cheap-result' },
        { id: 'premium', kind: 'value', value: 'premium-result' },
        {
          id: 'r',
          kind: 'router',
          rules: [
            { when: 'caller.identity.tags contains "premium"', route: 'premium' },
            { when: 'true', route: 'cheap' },
          ],
        },
      ],
    });
    const ctx = (tags: string[]): { timestamp: number; identity: { id: string; type: 'human'; tags: string[] } } => ({
      timestamp: 0,
      identity: { id: 'u1', type: 'human', tags },
    });
    expect((await engine.call('r', undefined, ctx(['premium']))).data).toBe('premium-result');
    expect((await engine.call('r', undefined, ctx(['free']))).data).toBe('cheap-result');
  });
});

describe('playtest-gold class 5: fresh event context per listener fire', () => {
  it('action body runs on every fire (no cache swallowing)', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'x', kind: 'value', value: 0 },
        { id: 'count', kind: 'value', value: 0 },
        { id: 'onX', kind: 'listener', watch: ['x'], action: 'bump' },
        {
          id: 'bump',
          kind: 'program',
          code: `
            const n = await runtime.get('count');
            await runtime.set('count', (n.data ?? 0) + 1);
            return n.data ?? 0;
          `,
        },
      ],
    });
    await engine.set('x', 1);
    await engine.set('x', 2);
    expect(engine.getCell('count')?.value.data).toBe(2);
  });

  it('action sees changed/prev/current via caller.metadata', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'x', kind: 'value', value: 0 },
        { id: 'seen', kind: 'value', value: null },
        { id: 'onX', kind: 'listener', watch: ['x'], action: 'record' },
        {
          id: 'record',
          kind: 'program',
          code: `
            await runtime.set('seen', {
              changed: caller.metadata?.changed ?? null,
              prev: caller.metadata?.prev ?? null,
              current: caller.metadata?.current ?? null,
            });
            return caller.metadata?.current ?? null;
          `,
        },
      ],
    });
    await engine.set('x', 7);
    expect(engine.getCell('seen')?.value.data)
      .toEqual({ changed: 'x', prev: 0, current: 7 });
  });
});

describe('playtest-gold class 4: propagation cycle guard', () => {
  it('cyclic deps do not recurse forever', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'a', kind: 'formula', expr: '=b + 1' },
        { id: 'b', kind: 'formula', expr: '=a + 1' },
      ],
    });
    await expect(engine.set('a', 1)).resolves.toBeUndefined();
  });

  it('self-dependency terminates', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'l', kind: 'listener', watch: ['l'], action: 'noop' },
        { id: 'noop', kind: 'program', code: 'return 1;' },
      ],
    });
    await expect(engine.set('l', 'x')).resolves.toBeUndefined();
  });
});

describe('playtest-gold class 3: eager recompute + real prev source', () => {
  // The prev-source pin stands alone (lazy mode): a pull must store the
  // computed value on the cell itself. Without it, listener events
  // report prev=undefined and the FIRST real threshold crossing of any
  // watched formula is missed (z.ai patch-9 symptom statement).
  it('prev-source: a pull stores the computed value on the cell', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'c', kind: 'value', value: 20 },
        { id: 'f', kind: 'formula', expr: '=c * 2' },
      ],
    });
    expect(engine.getCell('f')?.value.status).toBe('idle');
    expect((await engine.get('f')).data).toBe(40);
    // The last computed value must live on the cell so propagation
    // events can report a real prev.
    expect(engine.getCell('f')?.value.data).toBe(40);
  });

  it('eager: stale formulas recompute during propagation (no pull needed)', async () => {
    const engine = new QuiltEngine('test', { eager: true });
    engine.loadSheet({
      id: 'test',
      cells: [
        { id: 'c', kind: 'value', value: 20 },
        { id: 'f', kind: 'formula', expr: '=c * 2' },
      ],
    });
    expect((await engine.get('f')).data).toBe(40);
    await engine.set('c', 21);
    // propagation itself recomputed f — no get() required.
    expect(engine.getCell('f')?.value.data).toBe(42);
  });

  it('eager: edge-triggered listener on a derived formula fires exactly once at the crossing', async () => {
    const engine = new QuiltEngine('test', { eager: true });
    engine.loadSheet({
      id: 'test',
      cells: [
        { id: 'c', kind: 'value', value: 20 },
        { id: 'f', kind: 'formula', expr: '=c * 9 / 5 + 32' }, // 68
        { id: 'count', kind: 'value', value: 0 },
        {
          id: 'cross',
          kind: 'listener',
          watch: ['f'],
          condition: 'caller.metadata.current > 100 && caller.metadata.prev <= 100',
          action: 'bump',
        },
        {
          id: 'bump',
          kind: 'program',
          code: `
            const n = await runtime.get('count');
            await runtime.set('count', (n.data ?? 0) + 1);
            return n.data ?? 0;
          `,
        },
      ],
    });
    await engine.get('f'); // pull seeds the graph (68)
    await engine.set('c', 40); // f becomes 104 — crossing
    expect(engine.getCell('count')?.value.data).toBe(1);
    await engine.set('c', 45); // f becomes 113 — no crossing
    expect(engine.getCell('count')?.value.data).toBe(1);
  });

  it('eager: subscribers of derived cells observe the real transition during set()', async () => {
    const engine = new QuiltEngine('test', { eager: true });
    engine.loadSheet({
      id: 'test',
      cells: [
        { id: 'c', kind: 'value', value: 20 },
        { id: 'f', kind: 'formula', expr: '=c * 2' },
      ],
    });
    await engine.get('f');
    const seen: Array<[unknown, unknown]> = [];
    engine.subscribe('f', (v, p) => { seen.push([p.data, v.data]); });
    await engine.set('c', 30);
    expect(seen).toEqual([[40, 60]]);
  });
});

describe('playtest-gold class 2: value-cell get() returns the live value', () => {
  it('set() is visible to get() on the same cell', async () => {
    const engine = define({
      id: 'test',
      cells: [{ id: 'x', kind: 'value', value: 1 }],
    });
    expect((await engine.get('x')).data).toBe(1);
    await engine.set('x', 42);
    expect((await engine.get('x')).data).toBe(42);
  });

  it('downstream formula and direct read agree after set()', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'a', kind: 'value', value: 3 },
        { id: 'b', kind: 'formula', expr: '=a * 2' },
      ],
    });
    await engine.set('a', 10);
    // The formula sees the new value through cell.value.data...
    expect((await engine.get('b')).data).toBe(20);
    // ...and a direct read must agree (previously it returned def.value).
    expect((await engine.get('a')).data).toBe(10);
  });
});

describe('playtest-gold class 9: loud failures', () => {
  const captureWarnings = (fn: () => void): string[] => {
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
    try {
      fn();
    } finally {
      console.warn = orig;
    }
    return warnings;
  };

  it('warns at load when a listener has no action', () => {
    const warnings = captureWarnings(() => {
      define({
        id: 'test',
        cells: [{ id: 'broken', kind: 'listener', watch: ['nope'] }],
      });
    });
    expect(warnings.some(w => w.includes('broken'))).toBe(true);
  });

  it('warns at load when a listener action is an io/sensor cell', () => {
    const warnings = captureWarnings(() => {
      define({
        id: 'test',
        cells: [
          { id: 'feed', kind: 'sensor' },
          { id: 'bad', kind: 'listener', watch: ['feed'], action: 'feed' },
        ],
      });
    });
    expect(warnings.some(w => w.includes('bad') && w.includes('feed'))).toBe(true);
  });

  it('logs when a listener condition cannot be parsed (semantics unchanged: false)', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'x', kind: 'value', value: 1 },
        { id: 'fired', kind: 'value', value: 0 },
        { id: 'w', kind: 'listener', watch: ['x'], condition: 'f(}', action: 'bump' },
        {
          id: 'bump',
          kind: 'program',
          code: `
            const n = await runtime.get('fired');
            await runtime.set('fired', (n.data ?? 0) + 1);
            return n.data ?? 0;
          `,
        },
      ],
    });
    const warnings: string[] = [];
    const orig = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
    try {
      await engine.set('x', 2);
    } finally {
      console.warn = orig;
    }
    // The failure is now LOUD...
    expect(warnings.some(w => w.includes('f(}'))).toBe(true);
    // ...but the truth semantics are untouched: unparseable = false.
    expect(engine.getCell('fired')?.value.data).toBe(0);
  });
});

describe('playtest-gold class 8: ai-cell schema fields reach the provider', () => {
  // sysone.choice / sysone.score declare their fence in the sheet —
  // options, min, max, rubric — and the provider adapter must receive
  // them or the fence silently degenerates to adapter defaults.
  it('passes options/min/max/rubric through to the provider config', async () => {
    let lastConfig: Record<string, unknown> | null = null;
    const stub: AIEngineLike = {
      call: async (config) => { lastConfig = config as unknown as Record<string, unknown>; return 'ok'; },
    };
    const engine = new QuiltEngine('test', { ai: stub });
    const decide = {
      id: 'decide',
      kind: 'ai',
      ai_kind: 'ai.llm',
      provider: 'zai',
      model: 'glm-4.5',
      prompt: 'pick one',
      options: ['alpha', 'beta'],
      min: 0,
      max: 100,
      rubric: 'clarity',
    } as unknown as SheetDef['cells'][number];
    engine.loadSheet({ id: 'test', cells: [decide] });
    await engine.get('decide');
    expect(lastConfig).not.toBeNull();
    expect(lastConfig?.options).toEqual(['alpha', 'beta']);
    expect(lastConfig?.min).toBe(0);
    expect(lastConfig?.max).toBe(100);
    expect(lastConfig?.rubric).toBe('clarity');
  });

  it('does NOT forward functions or nested cell graphs', async () => {
    let lastConfig: Record<string, unknown> | null = null;
    const stub: AIEngineLike = {
      call: async (config) => { lastConfig = config as unknown as Record<string, unknown>; return 'ok'; },
    };
    const engine = new QuiltEngine('test', { ai: stub });
    const decide = {
      id: 'decide',
      kind: 'ai',
      ai_kind: 'ai.llm',
      provider: 'zai',
      model: 'glm-4.5',
      prompt: 'x',
      options: ['a'],
      evilFn: () => 1,
      nested: { a: 1 },
    } as unknown as SheetDef['cells'][number];
    engine.loadSheet({ id: 'test', cells: [decide] });
    await engine.get('decide');
    expect(lastConfig).not.toBeNull();
    expect('evilFn' in (lastConfig as Record<string, unknown>)).toBe(false);
    expect('nested' in (lastConfig as Record<string, unknown>)).toBe(false);
    // Whitelisted fields still arrive.
    expect(lastConfig?.options).toEqual(['a']);
  });
});

describe('playtest-gold class 1: listener watch lists are wired into the dep graph', () => {
  it('fires the listener action when a watched cell changes', async () => {
    const engine = define({
      id: 'test',
      cells: [
        { id: 'temp', kind: 'value', value: 20 },
        { id: 'alarmCount', kind: 'value', value: 0 },
        {
          id: 'alarm',
          kind: 'listener',
          watch: ['temp'],
          condition: 'caller.metadata.current > 25',
          action: 'bump',
        },
        {
          id: 'bump',
          kind: 'program',
          code: `
            const c = await runtime.get('alarmCount');
            const next = (c.data ?? 0) + 1;
            await runtime.set('alarmCount', next);
            return next;
          `,
        },
      ],
    });

    await engine.set('temp', 30);
    // The action program bumps alarmCount through the runtime handle.
    expect(engine.getCell('alarmCount')?.value.data).toBe(1);

    // Below threshold -> condition false -> no fire.
    await engine.set('temp', 22);
    expect(engine.getCell('alarmCount')?.value.data).toBe(1);
  });

  it('register() also wires watch lists', async () => {
    const engine = new QuiltEngine('test');
    engine.loadSheet({
      id: 'test',
      cells: [
        { id: 'temp', kind: 'value', value: 20 },
        { id: 'alarmCount', kind: 'value', value: 0 },
        {
          id: 'bump',
          kind: 'program',
          code: `
            const c = await runtime.get('alarmCount');
            const next = (c.data ?? 0) + 1;
            await runtime.set('alarmCount', next);
            return next;
          `,
        },
      ],
    });
    engine.register({
      id: 'alarm',
      kind: 'listener',
      watch: ['temp'],
      action: 'bump',
    });

    await engine.set('temp', 99);
    expect(engine.getCell('alarmCount')?.value.data).toBe(1);
  });
});
