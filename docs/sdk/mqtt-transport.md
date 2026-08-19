# MqttCellTransport

An IoT-native cell transport using MQTT 5.0.

## When to use

- You have an MQTT broker (Mosquitto, EMQX, HiveMQ, AWS IoT Core, Azure IoT Hub)
- You want cells to flow over a pub/sub bus
- You want retained messages to replay on reconnect
- You want dead-instance detection in <1s (via last-will-and-testament)

## Topic scheme

```
quilt/{instance}/{sheet}/{cellPath}
```

Examples:
- `quilt/boat-1/sensors/heading` — boat-1's heading sensor
- `quilt/esp32-7c/imu/acceleration/x` — esp32-7c's IMU X-axis
- `quilt/codespace-7c/jupyter/last_output` — codespace Jupyter output

## Usage

```ts
import { MqttCellTransport } from '@quilt/sdk';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtts://broker.local:8883', {
  clientId: 'my-app',
  will: {
    topic: 'quilt/my-app/status',
    payload: Buffer.from('offline'),
    qos: 1,
    retain: true,
  },
});

const transport = new MqttCellTransport(client, {
  url: 'mqtts://broker.local:8883',
  qos: 1,       // default
  retain: true, // default
});
```

## API

### `new MqttCellTransport(client, opts)`

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | string | required | Broker URL (for documentation only) |
| `clientId` | string | instance id | MQTT client id |
| `qos` | 0 \| 1 \| 2 | 1 | QoS for all publishes/subscribes |
| `retain` | boolean | true | Whether publishes are retained |
| `will` | object | none | Last-will-and-testament (set on `client.connect`) |

### `resolve(uri)`

Returns a `CellHandle` with the MQTT topic.

```ts
const handle = await transport.resolve('quilt://boat-1/sensors#heading');
console.log(handle.topic); // 'quilt/boat-1/sensors/heading'
```

### `getValue(uri, timeoutMs?)`

Reads the next retained message for the topic. Times out after 5s (configurable).

```ts
try {
  const v = await transport.getValue('quilt://boat-1/sensors#heading');
  console.log(v);
} catch (e) {
  // timeout
}
```

### `subscribe(uri, onValue)`

Subscribes to the topic. Returns an unsubscribe function.

```ts
const unsub = transport.subscribe('quilt://boat-1/sensors#heading', (v) => {
  console.log('new heading:', v);
});

// later
unsub();
```

### `publish(uri, value)`

Publishes the value to the topic as JSON. Retained by default.

```ts
transport.publish('quilt://boat-1/sensors#heading', { value: 45, ts: Date.now() });
```

### `publishRaw(topic, payload, retain?)` / `subscribeRaw(topic, cb)`

For non-Quilt topics. Use these to bridge existing MQTT traffic into Quilt.

## Wildcards

MQTT supports `+` (single level) and `#` (multi-level) wildcards in subscriptions.

| Pattern | Matches |
|---|---|
| `quilt/+/sensors/#` | every sensor on every instance |
| `quilt/boat-1/+/heading` | heading on boat-1 only |
| `quilt/#` | everything |

`mqttTopicMatches(pattern, topic)` is exposed as a utility:

```ts
import { mqttTopicMatches } from '@quilt/sdk';
mqttTopicMatches('quilt/+/+/#', 'quilt/boat-1/sensors/heading'); // true
```

## Federation with other transports

`MqttCellTransport` implements `CellTransport` — use it with `resolveCell` and `subscribeCell` like any other transport:

```ts
import { resolveCell, subscribeCell, CellRouter } from '@quilt/sdk';

// Mixed transport
const router = new CellRouter({
  routes: {
    'quilt://esp32-*': { transport: mqttTransport, priority: 1 },
    'quilt://+': { transport: httpTransport, priority: 2 },
  },
});

const cell = await router.resolveCell('quilt://esp32-1/sensors#heading');
```

## Compatibility

The constructor takes any `MqttLikeClient`:

```ts
interface MqttLikeClient {
  on(event, cb): void;
  subscribe(topic, opts?, cb?): void;
  publish(topic, payload, opts?, cb?): void;
  end(force?): void;
}
```

Compatible with:
- `mqtt` (mqtt.js) — the npm package
- `mqtt-react-hooks` — React Native
- `aedes` — embeddable broker
- Any custom broker implementation
