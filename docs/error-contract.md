# The error contract

How the engine reports failure is part of its public API. This page
documents the contract as it stands, and the tests in
`packages/core/test/error-contract.test.ts` pin it.

## The read/write split (missing cell)

For a cell id that does not exist in the loaded sheet:

| Operation | Behaviour |
|---|---|
| `get(id)` | **Returns** a CellValue: `{ data: undefined, status: 'error', error: { message: 'no such cell: <id>' } }`. Never throws for a missing cell. |
| `call(id, …)` | **Returns** the same error CellValue. Never throws for a missing cell. |
| `set(id, …)` | **Throws** `Error('no such cell: <id>')`. |
| `push(id, …)` | **Throws** `Error('no such cell: <id>')`. |

The message is identical on both sides — only the delivery differs.

## Why it is split this way

- **Reads are pull-based and compositional.** A formula, a router, or a
  federated lookup can ask for a cell that a given sheet doesn't have;
  an error *value* flows through the graph as data (status `error`)
  instead of unwinding every caller with an exception. Evaluation
  failures inside cells follow the same rule: they come back as
  CellValues with `status: 'error'`, not as throws.
- **Writes are imperative and addressed.** A `set` or `push` to a
  missing cell is a programming error by the caller, with no graph to
  absorb it — so it throws, loudly and immediately.

## What is NOT decided here

This split is **documented and pinned, not unified**. Making reads
throw (or writes return error values) would be a breaking change to
every consumer that pattern-matches on `status`, and is reserved for a
major version bump, decided deliberately — not as a drive-by fix.

If you change any behaviour in the table above, update this page and
the pinning tests in the same commit.
