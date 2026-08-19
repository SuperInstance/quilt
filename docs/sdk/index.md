# @quilt/sdk

Eight functions for treating Quilt as an agent substrate and federated runtime.

## The 8 primitives

### Agent substrate (v0.4.0)

| Function | What it does |
|---|---|
| [`resolveTemplate(uri, ctx)`](/sdk/resolve-template) | Substitute `{{var}}` tokens. |
| [`resolveArtifact(uri, ctx, store)`](/sdk/resolve-artifact) | Resolve a Quilt URI to a pinned version. |
| [`validateManifest(manifest)`](/sdk/validate-manifest) | JSON Schema + precondition checks. |
| [`publishArtifact(src, meta, store)`](/sdk/publish-artifact) | Upload an artifact, get a content-addressed URI. |
| [`publishRunTrace(trace, store)`](/sdk/publish-run-trace) | Persist an immutable execution trace. |

### Federation (v0.5.0)

| Function | What it does |
|---|---|
| [`resolveCell(uri, transport)`](/sdk/resolve-cell) | Resolve a cell URI to a live handle. |
| [`subscribeCell(uri, cb, transport)`](/sdk/subscribe-cell) | Subscribe to cell updates. |
| `CellRouter` | Route calls across transports. |

### Storage (v0.6.0)

| Class | What it does |
|---|---|
| [`FederatedArtifactStore`](/sdk/federated-store) | Multi-tier cache + R2 canonical store. |
| `MemoryCacheBackend` | In-memory local cache. |
| `FileSystemCacheBackend` | Filesystem local cache. |

### Transport (v0.6.0)

| Class | What it does |
|---|---|
| [`MqttCellTransport`](/sdk/mqtt-transport) | MQTT 5.0 cell transport. |

## The minimum surface

These 8 functions + 4 classes are the minimum surface that lets:
- **Planners** compile goals into manifest DAGs
- **Runtimes** execute those DAGs transactionally
- **Agents** learn from the past
- **UIs** show users what is happening
- **Federations** span tiers seamlessly

Everything else is built on top.
