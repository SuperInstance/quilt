/**
 * PLAY-TEST PATCH 12 pin (welded alternative): effectful cache key
 * carries a read-set state-version term.
 *
 * z's hold'em sheet found the freeze: `callKey` = caller + input
 * cannot see sheet state, so a repeated (caller, input) pair was
 * served a stale cached verdict after `match.seq` reset — the table
 * froze permanently. Main's classes 7+10 (propagate-invalidate +
 * input-in-key) fix declared deps and distinct inputs, but NOT
 * same-input-state-change: a program that reads a cell it did NOT
 * declare as a dep (the failure humans miss) keeps serving its first
 * verdict forever.
 *
 * Welded alternative (Z_PATCH_RECONCILE.md): record the cells a
 * program actually reads during evaluation; the cache hit is only
 * served while every read cell's state version is unchanged. Fresh
 * when the read-set changed, cached when not — patch-12 correctness
 * with main's cost profile (memoized fan-out sheets without program
 * cells pay nothing).
 */
import { describe, it, expect } from 'vitest';
import { QuiltEngine } from '../src/index.js';

describe('PATCH 12: read-set state version in the effectful cache key', () => {
  it('fish-reset freeze: same (caller, input) after undeclared state change must NOT serve stale verdict', async () => {
    // The judge reads match.seq through the runtime WITHOUT declaring
    // deps: [] on purpose — this is exactly the hold'em authoring bug.
    const e = new QuiltEngine('t12');
    e.loadSheet({
      id: 't12',
      cells: [
        { id: 'match.seq', kind: 'value', value: 1 },
        {
          id: 'judge', kind: 'program', deps: [],
          code: `
            const seq = await runtime.get('match.seq');
            return { verdict: seq.data === 1 ? 'OPEN' : 'RESET' };
          `,
        },
      ],
    });

    // Fish calls { seq: 1 } — table is OPEN.
    const first = await e.call('judge', { seq: 1 });
    expect(first.data).toEqual({ verdict: 'OPEN' });

    // The match resets. judge never declared match.seq as a dep, so
    // propagate does not touch judge's cache — pre-patch the next
    // identical call is served the frozen verdict.
    await e.set('match.seq', 2);

    const second = await e.call('judge', { seq: 1 });
    expect(second.data).toEqual({ verdict: 'RESET' });
  });

  it('read-set unchanged → cache is still served (no cost regression)', async () => {
    // Welded-alternative contract: freshness must not become
    // "recompute every call". An UNRELATED cell changing must not
    // invalidate the program's cache. The program makes no runtime
    // reads, so its read-set is empty.
    const e = new QuiltEngine('t12b');
    e.loadSheet({
      id: 't12b',
      cells: [
        { id: 'unrelated', kind: 'value', value: 'noise' },
        {
          id: 'constable', kind: 'program', deps: [],
          code: `return 'constant';`,
        },
      ],
    });
    const r1 = await e.call('constable', { n: 1 });
    const r2 = await e.call('constable', { n: 1 });
    expect(r1.data).toBe('constant');
    expect(r2.data).toBe('constant');

    await e.set('unrelated', 'more-noise');

    const r3 = await e.call('constable', { n: 1 });
    expect(r3.data).toBe('constant');
  });

  it('declared-dep upstream change still invalidates (classes 7+10 semantics preserved)', async () => {
    const e = new QuiltEngine('t12c');
    e.loadSheet({
      id: 't12c',
      cells: [
        { id: 'pot', kind: 'value', value: 10 },
        {
          id: 'dealer', kind: 'program', deps: ['pot'],
          code: `
            const p = await runtime.get('pot');
            return 'pot:' + p.data;
          `,
        },
      ],
    });
    const a = await e.call('dealer', {});
    expect(a.data).toBe('pot:10');
    await e.set('pot', 99);
    const b = await e.call('dealer', {});
    expect(b.data).toBe('pot:99');
  });
});
