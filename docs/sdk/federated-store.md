# FederatedArtifactStore

A multi-tier, content-addressed artifact store with R2 as the canonical backing store.

## When to use

- You want to share models, manifests, or sheets across tiers
- You want hot reads on local + cold fallback to R2
- You want automatic LRU eviction on the hot tier
- You want R2 failures to not break your writes

## The 3 tiers

```
hot (memory)  →  warm (filesystem)  →  cold (R2)
  <1ms             <10ms                ~100ms
  64MB cap         unlimited            unlimited
```

Reads consult tiers in order; promote on hit. Writes go to all tiers; R2 is best-effort.

## Usage

```ts
import { FederatedArtifactStore, FileSystemCacheBackend } from '@quilt/sdk';

const store = new FederatedArtifactStore({
  r2: env.MY_BUCKET,                                // optional
  r2Bucket: 'quilt-artifacts',                     // required if r2 set
  local: new FileSystemCacheBackend('/var/cache'),  // optional, defaults to memory
  maxLocalBytes: 64 * 1024 * 1024,                  // default 64MB
  log: (msg, level) => console.log(level, msg),
});

const { uri, version } = await store.put('quilt://models/yolov8n', modelBytes, {
  name: 'yolov8n',
  type: 'onnx',
});
// uri = 'quilt://models/yolov8n:abc123def456'

const { bytes, metadata } = await store.get(uri);
```

## API

### `new FederatedArtifactStore(opts)`

| Option | Type | Default | Description |
|---|---|---|---|
| `r2` | R2 binding | none | Cloudflare R2 binding (`env.MY_BUCKET` in Workers) |
| `r2Bucket` | string | none | Required if `r2` is set |
| `local` | LocalBackend | MemoryCacheBackend | The local cache tier |
| `maxLocalBytes` | number | 64MB | LRU eviction threshold for hot cache |
| `log` | function | none | Logger for tier transitions |

### `put(uri, bytes, metadata)`

Writes to all tiers. R2 is best-effort.

```ts
const { uri, version } = await store.put(
  'quilt://models/yolov8n',
  modelBytes,
  { name: 'yolov8n', type: 'onnx' }
);
```

The URI returned has the version suffix appended (content hash, first 12 chars by default).

### `get(uri)`

Reads from tiers in order. Promotes to local on hit.

```ts
const { bytes, metadata } = await store.get('quilt://models/yolov8n:abc123');
```

Throws if not found in any tier.

### `exists(uri)`

Checks all tiers. Returns boolean.

### `listVersions(uri)`

Lists all versions of an artifact across tiers. Dedupes.

### `invalidate(uri)`

Removes from all tiers.

### `hotStats()`

Returns `{ entries, bytes, maxBytes }` for the hot cache.

## Backend implementations

### `MemoryCacheBackend` (default)

```ts
const store = new FederatedArtifactStore();  // uses MemoryCacheBackend internally
```

In-memory map. Fast, but not persistent.

### `FileSystemCacheBackend`

```ts
import { FileSystemCacheBackend } from '@quilt/sdk';
const store = new FederatedArtifactStore({
  local: new FileSystemCacheBackend('/var/cache/quilt'),
});
```

Writes bytes + sidecar metadata files. Persists across restarts.

## Custom backends

Implement the same interface for IndexedDB, Redis, S3, etc.:

```ts
class RedisCacheBackend {
  async get(key: string) { ... }
  async put(key: string, bytes: Uint8Array, metadata: ArtifactMetadata) { ... }
  async delete(key: string) { ... }
  async list(prefix?: string) { ... }
}
```

## Use case: cross-tier model serving

```ts
// Worker A: ESP32 on the boat
const boat = new FederatedArtifactStore({ r2: env.MY_BUCKET });
const model = await boat.get('quilt://models/yolov8n:abc123');
// First read: ~100ms (R2). After: <1ms (memory).

// Worker B: server
const server = new FederatedArtifactStore({
  r2: env.MY_BUCKET,
  local: new FileSystemCacheBackend('/var/cache'),
});
const same = await server.get('quilt://models/yolov8n:abc123');
// First read: ~10ms (disk). After: <1ms (memory).
```

Same content, different cache tiers, same URI.
