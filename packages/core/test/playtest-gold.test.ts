/**
 * Playtest-gold pins (R2). Each describe block pins one fix class from
 * the Super Z playtest report. FAIL-first: these pins were written
 * against the pre-fix engine and watched to fail before patching.
 */

import { describe, it, expect } from 'vitest';
import { QuiltEngine, type SheetDef } from '../src/index.js';

function define(sheet: SheetDef, id = 'test'): QuiltEngine {
  const engine = new QuiltEngine(id);
  engine.loadSheet(sheet);
  return engine;
}

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
