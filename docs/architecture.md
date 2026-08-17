# Architecture

This document describes how Quilt works under the hood. It's aimed at people who want to extend the system, build adapters, or understand the trade-offs.

## The substrate

At the lowest level, Quilt is a **reactive cell graph** — a directed graph where nodes are cells and edges are dependencies. The graph is evaluated lazily (pull) for pure cells and eagerly (push) for effectful ones.

```
┌─────────────────────────────────────────────────────────────┐
│                    Quilt Engine                          │
├─────────────────────────────────────────────────────────────┤
│  Cells: value, formula, api, program, sensor, listener,    │
│         router, io                                          │
├─────────────────────────────────────────────────────────────┤
│  Reactive dependency graph (DAG + explicit feedback loops) │
│  Caller context propagation (row, column, identity, trace)  │
│  Per-context memoization (caller-aware caching)            │
│  Subscription system (for UI, listeners, MCP)              │
├─────────────────────────────────────────────────────────────┤
│  YAML / JSON sheet format (git-friendly, diffable)         │
│  Evaluation trace log (for debugging, time-travel)         │
└─────────────────────────────────────────────────────────────┘
```

## Cell kinds

Eight cell kinds, each with a distinct evaluation semantics:

| Kind | Trigger | Pure? | Async? | Has effects? |
|------|---------|-------|--------|--------------|
| `value` | never (static) | yes | no | no |
| `formula` | pull (dep changed) | yes | no | no |
| `api` | call | no | yes | yes (network/model) |
| `program` | call | no | yes | yes (any) |
| `sensor` | push (external) | no | no | no (read-only) |
| `listener` | push (dep changed) | no | yes | yes (action) |
| `router` | call | no | yes | no (delegates) |
| `io` | push (external) | no | no | yes (bidirectional) |

The split between *pure* and *effectful* is the most important. Pure cells are evaluated on demand, cached aggressively, and never cause side effects. Effectful cells are evaluated only when explicitly triggered, never auto-recomputed by upstream changes, and can declare what they did via the `effects` field.

## The dependency graph

When you write a formula like `=a + b`, the engine scans the expression for known cell ids and adds edges. The graph is built once at sheet load and updated when cells are added or removed.

```
    [value: a]──┐
                ├──[formula: sum]──[depends on: a, b]
    [value: b]──┘
```

When `a` changes, the engine:
1. Marks `sum` as stale.
2. Invalidates `sum`'s caller-aware cache.
3. Notifies subscribers of `a`.
4. Walks dependents (depth-first), recursively.

This is the same algorithm Excel uses. The difference is that Quilt extends it to async, effectful, and caller-aware cells.

## Caller context

Every cell call carries a context:

```typescript
interface CallerContext {
  row?: number | string;        // spatial row
  column?: number | string;     // spatial column
  sheet?: string;               // which sheet (for cross-sheet)
  caller?: CellId;              // immediate caller
  trace?: CellId[];             // full ancestor chain
  identity?: {                  // who is making the call
    id: string;
    type: 'human' | 'agent' | 'sensor' | 'system';
    tags?: string[];
  };
  metadata?: Record<string, unknown>;
  timestamp: number;
}
```

The engine extends the context as it descends into the dependency graph. The trace accumulates; the caller pointer shifts. Cells can read any of these and route on them.

**Per-context memoization**: the same cell with different contexts can return different values, and each is cached separately. The cache key is a hash of the relevant context fields (row, column, identity, tags).

## MCP integration

The MCP server is a thin layer over the engine. It exposes:

- **Tools**: one per named cell. `cell__compass_heading`, `cell__model_router`, etc.
- **Resources**: the whole sheet (`quilt://sheet-id/sheet`) and each cell individually.

This means any MCP client (Claude Code, Cursor, Windsurf, your own) can:
- Read the current state of the sheet as a resource
- Call any cell as a tool, with input + caller context
- Subscribe to cell changes (via the engine's subscription system, exposed as MCP resources)

The cell-as-MCP-tool mapping is direct. There's no translation layer. The cell's `call(input, context)` becomes the MCP tool's invocation.

## Storage

The runtime is in-memory. The sheet is serialized as YAML. Persistence strategies:

- **Ephemeral**: just YAML in a file. The engine loads it on start, runs in memory, dumps back on stop.
- **Snapshotted**: YAML in a file, with periodic snapshots to disk for crash recovery.
- **Streaming**: append-only event log of all cell changes, replayable to rebuild state.

For the MVP, we ship the ephemeral mode. The other two are in the roadmap.

## What's deliberately not here

- **No cross-sheet refs in the MVP.** A cell references other cells in the same sheet by id. Cross-sheet refs will use `sheet-id/cell-id` notation.
- **No transactional updates.** The engine propagates changes eagerly. A multi-cell update is not atomic. This will be added when needed.
- **No versioned cells.** A cell has one implementation. To A/B test, copy the cell with a different id. Decomposition in the engine is explicit.
- **No built-in auth.** MCP uses stdio; the host controls access. For HTTP-transport MCP, we'll add token-based auth.

These omissions are deliberate. The MVP proves the substrate. The rest is engineering.
