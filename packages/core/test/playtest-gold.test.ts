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
