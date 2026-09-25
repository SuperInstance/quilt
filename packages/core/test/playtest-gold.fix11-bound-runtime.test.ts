/**
 * PLAY-TEST PATCH 11 pin: program cells receive a context-bound runtime.
 * Pre-patch, nested runtime.call from inside a program silently dropped
 * the caller identity (tenant tier, tags, metadata), collapsing
 * per-tenant memoization to one shared answer.
 */
import { describe, it, expect } from 'vitest';
import { QuiltEngine } from '../src/index.js';

describe('PATCH 11: context-bound program runtime', () => {
  it('nested runtime.call preserves caller identity (tenant routing)', async () => {
    // Per-tenant memoization keys on identity (id/tags), not metadata —
    // that is the contextKey contract. Pre-patch the nested call dropped
    // the whole context, so both tenants collapsed onto one cached answer.
    const e = new QuiltEngine('t11');
    e.loadSheet({
      id: 't11',
      cells: [
        {
          id: 'greet', kind: 'program', deps: [],
          code: `return 'hello ' + (caller.identity?.id ?? 'anonymous');`,
        },
        {
          id: 'delegate', kind: 'program', deps: [],
          code: `return (await runtime.call('greet')).data;`,
        },
      ],
    });
    const acme = await e.call('delegate', {}, { identity: { id: 'acme' } });
    const globex = await e.call('delegate', {}, { identity: { id: 'globex' } });
    expect(acme.data).toBe('hello acme');
    expect(globex.data).toBe('hello globex');
  });

  it('caller metadata is still VISIBLE through the bound runtime', async () => {
    // metadata is not part of the memo key (by design: too volatile),
    // but it must still propagate so program code can read it.
    const e = new QuiltEngine('t11m');
    e.loadSheet({
      id: 't11m',
      cells: [
        {
          id: 'read-md', kind: 'program', deps: [],
          code: `return 'md:' + (caller.metadata?.flag ?? 'none');`,
        },
        {
          id: 'delegate', kind: 'program', deps: [],
          code: `return (await runtime.call('read-md')).data;`,
        },
      ],
    });
    const r = await e.call('delegate', {}, { metadata: { flag: 'on' } });
    expect(r.data).toBe('md:on');
  });

  it('explicit ctx passed to runtime.call still wins over the bound one', async () => {
    const e = new QuiltEngine('t11b');
    e.loadSheet({
      id: 't11b',
      cells: [
        {
          id: 'greet', kind: 'program', deps: [],
          code: `return 'hello ' + (caller.metadata?.tenant ?? 'anonymous');`,
        },
        {
          id: 'delegate', kind: 'program', deps: [],
          code: `return (await runtime.call('greet', undefined, { metadata: { tenant: 'explicit' } })).data;`,
        },
      ],
    });
    const r = await e.call('delegate', {}, { metadata: { tenant: 'acme' } });
    expect(r.data).toBe('hello explicit');
  });
});
