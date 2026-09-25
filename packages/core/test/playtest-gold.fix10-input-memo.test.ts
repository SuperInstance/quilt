/**
 * PLAY-TEST PATCH 10 pin: effectful calls that take input must key the
 * memo cache on the input. Pre-patch, call(id, a) then call(id, b) under
 * the same caller context collided and the second call was served the
 * first call's result.
 */
import { describe, it, expect } from 'vitest';
import { QuiltEngine } from '../src/index.js';
import { callKey, stableJson, contextKey, emptyContext } from '../src/context.js';

const appendSheet = () => {
  const e = new QuiltEngine('t10', { eager: true });
  e.loadSheet({
    id: 't10',
    cells: [
      { id: 'rows', kind: 'value', value: [] as unknown[] },
      {
        id: 'append', kind: 'program', deps: [],
        code: `
          const rows = (await runtime.get('rows')).data;
          await runtime.set('rows', [...rows, input.v]);
          return (await runtime.get('rows')).data.length;
        `,
      },
    ],
  });
  return e;
};

describe('PATCH 10: input-aware memo key', () => {
  it('distinct inputs produce distinct results, state accumulates', async () => {
    const e = appendSheet();
    expect((await e.call('append', { v: 1 })).data).toBe(1);
    expect((await e.call('append', { v: 2 })).data).toBe(2);
    expect((await e.call('append', { v: 3 })).data).toBe(3);
    expect((await e.get('rows')).data).toEqual([1, 2, 3]);
  });

  it('identical input still memoizes (no redundant recompute)', async () => {
    const e = appendSheet();
    const a = await e.call('append', { v: 9 });
    const b = await e.call('append', { v: 9 });
    expect(a.data).toBe(b.data);
    expect((await e.get('rows')).data).toEqual([9]); // one append, not two
  });

  it('callKey differs only when input differs; key-order in objects is stable', () => {
    const ctx = emptyContext();
    const base = contextKey(ctx);
    expect(callKey(ctx, undefined)).toBe(base);
    expect(callKey(ctx, { a: 1, b: 2 })).toBe(callKey(ctx, { b: 2, a: 1 }));
    expect(callKey(ctx, { a: 1 })).not.toBe(callKey(ctx, { a: 2 }));
    expect(stableJson([{ z: 1, y: [2, null] }])).toBe('[{"y":[2,null],"z":1}]');
  });
});
