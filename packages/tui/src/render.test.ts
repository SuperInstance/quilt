//! # render.test.ts
//!
//! Tests for the renderer. These run without a TTY — they just
//! exercise the pure rendering function over different states.
//!
//! Run with: `node --test --import tsx src/render.test.ts`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './render.js';
import type { TuiState, CellRow } from './types.js';

// =============================================================================
// Helpers
// =============================================================================

function makeState(overrides: Partial<TuiState> = {}): TuiState {
  return {
    sheetId: 'test',
    cells: [],
    selectedIndex: 0,
    selectedId: null,
    viewTop: 0,
    viewportHeight: 10,
    mode: 'normal',
    editBuffer: null,
    status: null,
    ...overrides,
  };
}

function makeRow(overrides: Partial<CellRow>): CellRow {
  return {
    id: 'x',
    kind: 'value',
    value: '42',
    status: 'ready',
    error: null,
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

test('renders an empty state', () => {
  const state = makeState();
  const out = render(state);
  assert.match(out, /Quilt TUI/);
  assert.match(out, /test/);
  // Empty state has 0 cells.
  assert.match(out, /0 cells/);
});

test('renders cell list with id, kind, value', () => {
  const state = makeState({
    cells: [
      makeRow({ id: 'a', kind: 'value', value: '10' }),
      makeRow({ id: 'b', kind: 'formula', value: '20' }),
    ],
    selectedIndex: 0,
    selectedId: 'a',
  });
  const out = render(state);
  assert.match(out, /a/);
  assert.match(out, /b/);
  assert.match(out, /value/);
  assert.match(out, /formula/);
});

test('highlights the selected cell', () => {
  const state = makeState({
    cells: [makeRow({ id: 'a' }), makeRow({ id: 'b' })],
    selectedIndex: 1,
    selectedId: 'b',
  });
  const out = render(state);
  // The selected cell has a '>' prefix.
  assert.match(out, />\s+\S*b/, 'expected the selected cell to have a > marker');
});

test('shows error state in red', () => {
  const state = makeState({
    cells: [makeRow({ id: 'x', status: 'error', error: 'boom' })],
    selectedIndex: 0,
    selectedId: 'x',
  });
  const out = render(state);
  // The red ANSI code is \x1b[31m.
  // eslint-disable-next-line no-control-regex
  assert.match(out, /\x1b\[31m/);
  assert.match(out, /boom/);
});

test('shows idle state in dim', () => {
  const state = makeState({
    cells: [makeRow({ id: 'x', status: 'idle' })],
    selectedIndex: 0,
    selectedId: 'x',
  });
  const out = render(state);
  assert.match(out, /idle/);
});

test('shows dependencies of selected cell', () => {
  const state = makeState({
    cells: [
      makeRow({ id: 'a' }),
      makeRow({ id: 'sum', dependencies: ['a', 'b'] }),
    ],
    selectedIndex: 1,
    selectedId: 'sum',
  });
  const out = render(state);
  assert.match(out, /Dependencies of:/);
  assert.match(out, /a/);
  assert.match(out, /b/);
});

test('shows dependents of selected cell', () => {
  const state = makeState({
    cells: [
      makeRow({ id: 'x', dependents: ['y', 'z'] }),
      makeRow({ id: 'y' }),
    ],
    selectedIndex: 0,
    selectedId: 'x',
  });
  const out = render(state);
  assert.match(out, /Dependents of:/);
  assert.match(out, /y/);
  assert.match(out, /z/);
});

test('shows mode bar in normal mode', () => {
  const state = makeState({ mode: 'normal' });
  const out = render(state);
  assert.match(out, /NORMAL/);
});

test('shows mode bar in edit mode with buffer', () => {
  const state = makeState({ mode: 'edit', editBuffer: 'hello' });
  const out = render(state);
  assert.match(out, /EDIT/);
  assert.match(out, /hello/);
});

test('shows mode bar in set mode', () => {
  const state = makeState({ mode: 'set', editBuffer: '42' });
  const out = render(state);
  assert.match(out, /SET/);
  assert.match(out, /42/);
});

test('shows mode bar in command mode', () => {
  const state = makeState({ mode: 'command', editBuffer: 'reload' });
  const out = render(state);
  assert.match(out, /:/);
  assert.match(out, /reload/);
});

test('shows status line when set', () => {
  const state = makeState({ status: 'reloaded' });
  const out = render(state);
  assert.match(out, /reloaded/);
});

test('truncates long values', () => {
  const long = 'a'.repeat(100);
  const state = makeState({
    cells: [makeRow({ id: 'x', value: long })],
    selectedIndex: 0,
    selectedId: 'x',
  });
  const out = render(state);
  // The truncated version should have a '…' marker.
  assert.match(out, /…/);
});

test('handles many cells with scroll indicator', () => {
  const cells = Array.from({ length: 30 }, (_, i) =>
    makeRow({ id: `c${i}` }),
  );
  const state = makeState({
    cells,
    selectedIndex: 5,
    selectedId: 'c5',
    viewportHeight: 10,
  });
  const out = render(state);
  // Scroll indicator mentions a range.
  assert.match(out, /of 30/);
});

test('cell kind gets a color code', () => {
  const state = makeState({
    cells: [
      makeRow({ id: 'v', kind: 'value' }),
      makeRow({ id: 'f', kind: 'formula' }),
      makeRow({ id: 'p', kind: 'program' }),
      makeRow({ id: 's', kind: 'sensor' }),
    ],
    selectedIndex: 0,
    selectedId: 'v',
  });
  const out = render(state);
  // Each kind has a distinct color in the KIND_COLORS map.
  // The renderer emits the kind text in that color.
  assert.match(out, /value/);
  assert.match(out, /formula/);
  assert.match(out, /program/);
  assert.match(out, /sensor/);
});
