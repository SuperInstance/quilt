# Federation

A Quilt sheet doesn't have to live on one machine. Federation lets cells span tiers, instances, and transports — all addressable by URI.

## The URI scheme

```
quilt://[instance]/[sheet]#[cell]
```

Examples:
- `quilt://local/boat-autopilot#rudder.angle` — local sheet
- `quilt://esp32-1/sensors#heading` — ESP32 sensor cell
- `quilt://codespace-7c/jupyter#last_output` — codespace cell
- `quilt://cloudflare-prod-1/main#user_count` — Worker cell

Wildcards:
- `quilt://+/+/#` — every cell on every instance
- `quilt://esp32-1/+/+` — every cell on esp32-1
- `quilt://+/boat-*/#` — every cell on every boat

## The 5 tiers

| Tier | Where | Strength |
|---|---|---|
| esp32 | Embedded, no_std | Tight control loops at 50Hz |
| jetson | Edge ML | CUDA, ROS2, sensor fusion |
| codespace | GitHub Codespace | ttyd, MCP, browser-accessible |
| cloudflare | Workers + D1/R2 | Global edge, zero cold start |
| server | Node.js, single binary | Full Linux, no constraints |

Every tier implements the same `CellTransport` interface. The SDK doesn't care which.

## Transports

The SDK ships 3 transports:

### HttpCellTransport

```ts
import { HttpCellTransport } from '@quilt/sdk';
const transport = new HttpCellTransport('https://quilt.example.com', token);
```

REST over HTTPS. Simple, cacheable, works through any proxy.

### MqttCellTransport (v0.6.0+)

```ts
import { MqttCellTransport } from '@quilt/sdk';
import mqtt from 'mqtt';
const client = mqtt.connect('mqtts://broker.local:8883');
const transport = new MqttCellTransport(client, { url: 'mqtts://broker.local:8883' });
```

MQTT 5.0. Pub/sub with retained messages and last-will. Best for IoT fleets.

### LocalCellTransport

```ts
import { LocalCellTransport } from '@quilt/sdk';
const transport = new LocalCellTransport(new Map([['local', engine]]));
```

In-process. For tests and same-process subscriptions.

## Resolution

`resolveCell` returns a handle you can `.get()` or `.subscribe()`:

```ts
import { resolveCell, subscribeCell } from '@quilt/sdk';

const handle = await resolveCell('quilt://boat-1/sensors#heading', transport);
console.log(await handle.get()); // 45

const unsub = subscribeCell('quilt://boat-1/sensors#heading', (v) => {
  console.log('new heading:', v);
}, transport);
```

## CellRouter

`CellRouter` lets you route calls across transports based on policies:

```ts
import { CellRouter } from '@quilt/sdk';

const router = new CellRouter({
  routes: {
    'quilt://local/*': { transport: localTransport, priority: 1 },
    'quilt://cloudflare-*/+': { transport: cloudflareTransport, priority: 2 },
    'quilt://+/+/*': { transport: mqttTransport, priority: 3 },  // fallback
  },
  defaultTransport: mqttTransport,
});

const cell = await router.resolveCell('quilt://cloudflare-prod-1/main#count');
```

## Storage: FederatedArtifactStore

For non-realtime data (models, run traces, manifests), use `FederatedArtifactStore`:

```ts
import { FederatedArtifactStore, FileSystemCacheBackend } from '@quilt/sdk';

const store = new FederatedArtifactStore({
  r2: env.MY_BUCKET,  // optional
  r2Bucket: 'quilt-artifacts',
  local: new FileSystemCacheBackend('/var/cache/quilt'),
});

await store.put('quilt://models/yolov8n', modelBytes, { name: 'yolov8n', type: 'onnx' });
const model = await store.get('quilt://models/yolov8n:abc123');
```

3-tier cache: hot (memory) → warm (filesystem) → cold (R2). LRU eviction on the hot tier. Reads auto-promote.

## Cross-references

- [quilt-fleet](https://github.com/SuperInstance/quilt-fleet) — multi-instance orchestration
- [quilt-mesh](https://github.com/SuperInstance/quilt-mesh) — peer-to-peer federation
- [quilt-esp32](https://github.com/SuperInstance/quilt-esp32) — esp32 transport implementation
- [quilt-jetson](https://github.com/SuperInstance/quilt-jetson) — jetson transport implementation
- [quilt-codespace](https://github.com/SuperInstance/quilt-codespace) — codespace transport implementation
- [quilt-cloudflare](https://github.com/SuperInstance/quilt-cloudflare) — workers transport implementation
