# @quilt/sdk

> Agent substrate primitives for Quilt. Eight functions that turn Quilt sheets into executable, auditable, replayable artifacts — and that federate them across tiers.

[![tests](https://img.shields.io/badge/tests-79%2F79%20passing-brightgreen)](.)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](.)
[![version](https://img.shields.io/badge/version-0.6.0-blue)](.)

```
npm install @quilt/sdk
```

## What it is

`@quilt/sdk` is the **smallest possible surface** for treating Quilt as an agent substrate and federated runtime. It exposes eight primitives that any planner, runtime, or UI can compose:

| # | Primitive | Purpose |
|---|---|---|
| 1 | `resolveTemplate(uri, ctx)` | Substitute `{{var}}` tokens. Snake/camel-insensitive. |
| 2 | `resolveArtifact(uri, ctx, store)` | Resolve a Quilt URI to a pinned version with provenance. |
| 3 | `validateManifest(manifest, opts)` | JSON Schema validation + optional precondition checks. |
| 4 | `publishArtifact(src, meta, store)` | Upload an artifact; get a content-addressed URI back. |
| 5 | `publishRunTrace(trace, store)` | Persist an immutable execution trace. |
| 6 | `resolveCell(uri, transport)` | Resolve a cell URI to a live handle on a remote instance. |
| 7 | `subscribeCell(uri, cb)` | Subscribe to a cell; receive updates when it changes. |
| 8 | `CellRouter` | Route calls across transports; load-balance, fail-over. |

Plus three storage classes:

| Class | Purpose |
|---|---|
| `InMemoryArtifactStore` | In-memory store; for tests and ephemeral workloads. |
| `FederatedArtifactStore` | Multi-tier cache + R2 canonical store. |
| `MemoryCacheBackend` / `FileSystemCacheBackend` | Pluggable local cache tiers. |

Plus one transport:

| Class | Purpose |
|---|---|
| `MqttCellTransport` | IoT-native cell transport using MQTT 5.0. |

These primitives unlock every higher-level pattern: planners that compile goals into manifest DAGs, runtimes that execute them transactionally, agents that learn from the past, UIs that show users what is happening with full provenance, and federated fleets that span tiers from ESP32 to server.

## Why these five?

They are the minimum surface that lets:

- **Planners** compile goals into manifest DAGs (validate, resolve)
- **Runtimes** execute those DAGs transactionally (resolve, publish)
- **Agents** query the past and learn from it (resolve, publish_run_trace)
- **UIs** show users what is happening with provenance (resolve, validate)

Everything else (UI, scheduler, model router) is built on top.

## Quick start

```ts
import {
  resolveTemplate,
  resolveArtifact,
  validateManifest,
  publishArtifact,
  publishRunTrace,
  InMemoryArtifactStore,
} from '@quilt/sdk';

const store = new InMemoryArtifactStore();

// 1. Templating
resolveTemplate('quilt://ml/models:{{run_id}}', { runId: 'r-01' });
// → 'quilt://ml/models:r-01'

// 2. Resolve
const r = await resolveArtifact('quilt://data:latest', {}, store);
// → { version: 'a3b2...', resolvedUri: 'quilt://data:a3b2...', ... }

// 3. Validate
const v = await validateManifest(
  { id: 'demo', preconditions: [{ type: 'artifact_exists', uri: 'quilt://data:latest' }] },
  { store, checkExists: true }
);
// → { valid: true, errors: [] }

// 4. Publish
const { uri, contentHash } = await publishArtifact('hello', { manifestId: 'demo' }, store);
// → { uri: 'quilt://artifacts/demo/...:...', contentHash: 'a591...' }

// 5. Trace
await publishRunTrace({
  runId: 'r-01',
  manifestId: 'demo',
  startTime: new Date().toISOString(),
  status: 'success',
  nodes: [{ nodeId: 'main', status: 'success' }],
}, store);
```

## The manifest format

`validateManifest` accepts any object that conforms to the JSON Schema in
[`schemas/manifest.schema.json`](../../schemas/manifest.schema.json). All extension fields
are optional. The minimum valid manifest is `{ "id": "..." }` — the same shape
as a Quilt sheet.

A fully-decorated manifest:

```yaml
id: train-classifier
version: "1.0.0"
title: "Train Classifier"

inputs:
  - name: dataset
    uri: quilt://ml/datasets/staged:latest
    required: true
    type: dataset

outputs:
  - name: model
    uri: quilt://ml/models/classifier:{{run_id}}
    type: model

preconditions:
  - type: artifact_exists
    uri: quilt://ml/datasets/staged:latest

postconditions:
  - type: artifact_exists
    uri: quilt://ml/models/classifier:{{run_id}}

rollback:
  type: manifest
  manifest_id: rollback-train

resource_hints:
  gpu: 1
  memory_gb: 32
  timeout_s: 7200

model_requirements:
  llm_context_tokens: 8000
  multimodal: false

provenance_tags: [training, weekly-run]
```

## Storage backends

The SDK ships with `InMemoryArtifactStore` for tests and small demos. For
production, implement the `ArtifactStore` interface:

```ts
interface ArtifactStore {
  put(logicalUri: string, bytes: Uint8Array | string, metadata: ArtifactMetadata): Promise<{ uri: string; version: string }>;
  get(uri: string): Promise<{ bytes: Uint8Array; metadata: ArtifactMetadata }>;
  exists(uri: string): Promise<boolean>;
  listVersions(logicalUri: string): Promise<{ version: string; createdAt: string }[]>;
}
```

Pluggable backends we have in mind: Cloudflare R2, S3, GCS, local FS,
PostgreSQL with bytea, IPFS, Git LFS.

## Replay as a learning loop

The publishRunTrace primitive is the foundation of replay-based learning.
Given a stored trace, you can reconstruct the run:

```ts
// 1. Load the trace
const trace = await loadTrace(traceUri, store);

// 2. Resolve every input to its pinned version
for (const node of trace.nodes) {
  for (const uri of node.artifactUris ?? []) {
    const resolved = await resolveArtifact(uri, trace.context, store);
    // resolved.version is the exact version used in the original run
  }
}

// 3. Re-execute (or compare to a new run)
```

## Mapping to the Quilt ecosystem

| Spec concept | Quilt equivalent |
|---|---|
| Manifest (declarative primitive) | Quilt sheet (YAML) |
| Container entrypoint | Cell `evaluate()` (no Docker needed) |
| Inputs/outputs | `derived_from` + reactive propagation |
| Pre/postconditions | `kind: 'sensor'` + `validate` listeners |
| Rollback | `@quilt/evolve` revert step |
| model_requirements | `kind: 'ai'` + ai_kind + provider config |
| Run trace | `engine.serialize()` + reactive history |
| Capability negotiation | `@quilt/ai` AIEngine routes across 4 providers |
| Agent substrate | `@quilt/mcp` exposes Quilt to ANY agent |

## Architecture note

The SDK is intentionally side-effect-free by default. `resolveArtifact`,
`validateManifest`, and `resolveTemplate` are pure functions of their
inputs. `publishArtifact` and `publishRunTrace` take an `ArtifactStore`
so callers can wire any backend (Cloudflare R2, S3, local FS, in-memory
mock for tests).

This makes the SDK trivially testable (we ship 28 tests) and easy to embed
anywhere — browser, server, edge worker, CLI, test harness.

## API reference

See [`src/index.ts`](./src/index.ts) — every function has a heavy header
comment with rationale, examples, and edge cases.

## Testing

```bash
cd packages/sdk
npm test
```

28 tests cover: templating edge cases, URI validation, version pinning,
schema validation, all precondition types, content addressing,
idempotency, end-to-end planner-style flows.

## License

Apache 2.0
