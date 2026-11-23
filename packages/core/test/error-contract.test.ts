/**
 * Pinning tests for the engine's error contract (see docs/error-contract.md).
 *
 * The contract is a deliberate read/write split for a MISSING cell:
 *   - Reads (`get`, `call`) never throw for a missing cell — they return
 *     a CellValue with status 'error' and error.message 'no such cell: <id>'.
 *   - Writes (`set`, `push`) throw an Error with the identical message.
 *
 * These tests pin that split so it cannot drift silently. Unifying the
 * two sides is a breaking change reserved for a major version bump —
 * do not "fix" a failure here by changing the engine's behaviour;
 * update the contract doc and these tests together, deliberately.
 */

import { describe, it, expect } from 'vitest';
import { QuiltEngine } from '../src/index.js';

function engine(): QuiltEngine {
  const e = new QuiltEngine('contract');
  e.loadSheet({
    id: 'contract',
    cells: [{ id: 'present', kind: 'value', value: 1 }],
  });
  return e;
}

describe('error contract — missing cell', () => {
  it('get returns an error CellValue instead of throwing', async () => {
    const v = await engine().get('nope');
    expect(v.status).toBe('error');
    expect(v.data).toBeUndefined();
    expect(v.error?.message).toBe('no such cell: nope');
  });

  it('call returns an error CellValue instead of throwing', async () => {
    const v = await engine().call('nope');
    expect(v.status).toBe('error');
    expect(v.error?.message).toBe('no such cell: nope');
  });

  it('set throws with the identical message', async () => {
    await expect(engine().set('nope', 1)).rejects.toThrow('no such cell: nope');
  });

  it('push throws with the identical message', async () => {
    await expect(engine().push('nope', 1)).rejects.toThrow('no such cell: nope');
  });

  it('the read and write messages are identical', async () => {
    const e = engine();
    const readMessage = (await e.get('ghost')).error?.message;
    let writeMessage: string | undefined;
    try {
      await e.set('ghost', 1);
    } catch (err) {
      writeMessage = err instanceof Error ? err.message : String(err);
    }
    expect(readMessage).toBeDefined();
    expect(writeMessage).toBe(readMessage);
  });
});
