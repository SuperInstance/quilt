# Release v0.6.0 — FederatedArtifactStore + MqttCellTransport

**Date:** 2026-08-19
**Status:** SHIPPED
**Tests:** 79/79 passing (18 new)

## Summary

`@quilt/sdk` v0.6.0 adds two new primitives that complete the federation story:

1. **FederatedArtifactStore** — multi-tier, content-addressed artifact store with R2 as the canonical backing store
2. **MqttCellTransport** — IoT-native cell transport using MQTT 5.0

Together with the existing 8 SDK primitives (resolveTemplate, resolveArtifact, validateManifest, publishArtifact, publishRunTrace, resolveCell, subscribeCell, CellRouter), these new additions enable:

- **Cross-tier cache hierarchies** — ESP32 reads a model from R2, codespace caches it locally, server reuses the same bytes
- **IoT-native pub/sub** — cells flow over MQTT, retained messages replay on reconnect, dead instances detected in <1s
- **Hot/warm/cold storage** — local memory for hot, filesystem for warm, R2 for cold; auto-promote on read

## What was added

### 1. FederatedArtifactStore (3 tiers, LRU)

```
hot (memory)  →  warm (filesystem)  →  cold (R2)
  <1ms             <10ms                ~100ms
  64MB cap         unlimited            unlimited
```

- Implements the existing `ArtifactStore` interface
- Pluggable local backend: `MemoryCacheBackend` (default) or `FileSystemCacheBackend`
- R2 binding is optional; failures are best-effort (don't break puts)
- LRU eviction on the hot cache
- `hotStats()` for observability

### 2. MqttCellTransport

Topic format: `quilt/{instance}/{sheet}/{cellPath}`

Wildcards: `quilt/+/+/#` (any cell on any instance), `quilt/sensor-1/+/+` (any cell on sensor-1).

Features:
- Compatible with any MQTT 5.0 broker (Mosquitto, EMQX, HiveMQ, AWS IoT Core, Azure IoT Hub)
- Retained-message replay on reconnect
- Last-will-and-testament for instance death detection
- Configurable QoS (0, 1, 2)
- `publishRaw`/`subscribeRaw` for non-Quilt MQTT topics

### 3. New tests (18 total)

- FederatedArtifactStore: 9 tests (basic put/get, listVersions, R2 best-effort, R2 promote, exists, invalidate, LRU, custom local)
- MemoryCacheBackend: 2 tests (basic, list with prefix)
- mqttTopicMatches: 3 tests (exact, +, #)
- MqttCellTransport: 4 tests (round-trip, getValue, timeout, isConnected)

## Use cases

### Cross-tier model serving

```ts
const store = new FederatedArtifactStore({
  r2: env.MY_BUCKET,
  r2Bucket: 'quilt-artifacts',
  local: new FileSystemCacheBackend('/var/cache/quilt'),
});

// ESP32 fetches a 50MB model from R2; codespace caches it locally;
// server reuses the same bytes; all content-addressed.
const model = await store.get('quilt://models/yolov8n:abc123');
```

### IoT-native cell bus

```ts
import mqtt from 'mqtt';
const client = mqtt.connect('mqtts://broker.local:8883');
const transport = new MqttCellTransport(client, { url: 'mqtts://broker.local:8883' });

// Sensor on the boat publishes heading
transport.publish('quilt://boat-1/sensors#heading', { value: 45, ts: Date.now() });

// Dashboard on the server subscribes
const unsub = transport.subscribe('quilt://boat-1/sensors#heading', (v) => {
  console.log('new heading:', v);
});
```

## Files added/modified

- `packages/sdk/src/index.ts` — +437 lines (FederatedArtifactStore, MemoryCacheBackend, FileSystemCacheBackend, MqttCellTransport, mqttTopicMatches)
- `packages/sdk/test/federation-store.test.js` — 200 lines, 18 tests
- `packages/sdk/README.md` — updated to v0.6.0
- `RELEASE-v0.6.0.md` — this file

## Cross-references

- **@quilt/core** — uses `FederatedArtifactStore` internally for cross-tier cache lookup
- **@quilt/cloudflare** — uses R2 as the canonical store
- **quilt-jetson** (forthcoming) — uses MqttCellTransport for sensor fan-out
- **quilt-fleet** (forthcoming) — uses both for multi-instance orchestration
