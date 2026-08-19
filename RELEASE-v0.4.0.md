# v0.4.0 — Agent Substrate

> The smallest possible surface for treating Quilt as a substrate for
> agents, planners, and runtimes. Five primitives, one CLI command, one
> manifest schema.

## What ships

### `schemas/manifest.schema.json` (new)
- Backward-compatible extension of the Quilt sheet format
- Optional fields: `inputs`, `outputs`, `preconditions`, `postconditions`,
  `rollback`, `resource_hints`, `model_requirements`, `provenance_tags`,
  `irreversible`
- All fields are optional — existing sheets continue to work unchanged
- Full JSON Schema with examples, $id, and description on every field

### `@quilt/sdk` (new package, v0.1.0)
- **5 primitives** for the agent substrate:
  1. `resolveTemplate(uri, ctx)` — `{{var}}` substitution (snake/camel-insensitive)
  2. `resolveArtifact(uri, ctx, store)` — pin `:latest`, get provenance
  3. `validateManifest(manifest, opts)` — JSON Schema + optional precondition checks
  4. `publishArtifact(src, meta, store)` — content-addressed upload
  5. `publishRunTrace(trace, store)` — immutable execution trace
- **`InMemoryArtifactStore`** — test/demo store, swappable for R2/S3/etc.
- **28 tests passing** (all primitives + end-to-end planner flow)
- Heavy header comments on every export
- TypeScript with full type definitions
- Apache 2.0

### `@quilt/cli` (updated to v0.4.0)
- New `quilt validate <file>` command
  - JSON Schema validation
  - `--check-exists` for precondition verification
  - `--run-id <id>` for templating `{{run_id}}` in preconditions
- New `quilt resolve <uri>` command
  - Template substitution
  - Version pinning display
- Existing commands unchanged

### `examples/train-classifier.manifest.yaml` (new)
- A fully-decorated example manifest demonstrating all schema fields
- Works with `quilt validate` out of the box

### `landing/agent-substrate.html` (new, 56 KB)
- 8-section landing page documenting the agent substrate
- Interactive playground: type a URI, paste a manifest, click validate
- Maps the spec to Quilt's existing primitives
- Visual: the 5 primitives, the QuiltAgent class, reactive vs imperative

## Why this matters

Before v0.4.0, Quilt was a reactive engine. Now Quilt is also a
**substrate** that any agent, planner, or runtime can compose against.
The five primitives are the minimum surface that lets:

- **Planners** compile goals into manifest DAGs
- **Runtimes** execute them transactionally with rollback
- **Agents** learn from the past via run traces
- **UIs** show users what is happening with full provenance

The same shape that works for "train a classifier" works for "answer a
question with RAG", "coordinate three agents", "simulate a universe".
The schema is the contract.

## Mapping to existing Quilt

| New concept | Already in Quilt |
|---|---|
| `Manifest` (declarative primitive) | A Quilt sheet (YAML) |
| Container entrypoint | A cell's `evaluate()` |
| Inputs/outputs | `derived_from` + reactive propagation |
| Pre/postconditions | `kind: 'sensor'` + `validate` listeners |
| Rollback | `@quilt/evolve` revert step |
| `model_requirements` | `kind: 'ai'` + ai_kind + provider |
| Run trace | `engine.serialize()` + reactive history |
| Agent substrate | `@quilt/mcp` exposes Quilt to any agent |

## Test totals

- `@quilt/sdk` — 28 tests (all passing)
- `@quilt/core` — 15 tests (all passing, unchanged)
- `quilt validate` CLI — verified against 2 example manifests
- `quilt resolve` CLI — verified with 3 URI patterns

## Migration

Zero. All new fields are optional. All existing sheets work unchanged.
`@quilt/sdk` is a new package, not a breaking change.

## Next

- `quilt-runner` (new repo) — reference runtime that executes Quilt sheets
  as transactional plans
- `quilt-rag` (new repo) — production RAG with Vectorize
- `quilt-agents` (new repo) — multi-agent universes with `@quilt/evolve`
- `quilt-demo-classifier-dag` — end-to-end example
