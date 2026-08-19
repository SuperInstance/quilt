# Cell kinds

Every cell has a `kind`. The 9 cell kinds are the atoms of Quilt.

## 1. value

A static value. Numbers, strings, booleans, objects, arrays — anything JSON-serializable.

```yaml
cells:
  threshold:
    kind: value
    value: 0.5
```

## 2. formula

A computed expression. Other cells become variables by name.

```yaml
cells:
  discount:
    kind: value
    value: 0.1
  price:
    kind: value
    value: 100
  final:
    kind: formula
    formula: "price * (1 - discount)"
```

Ternaries and function calls work:
```yaml
formula: "count > 0 ? sum/count : 0"
```

## 3. api

An outbound HTTP call. Every response becomes the cell's value.

```yaml
cells:
  weather:
    kind: api
    url: "https://api.open-meteo.com/v1/forecast?latitude=37.7&longitude=-122.4&current=temperature_2m"
    cache_ttl: 60000  # ms
```

## 4. program

A TypeScript function body. Full closure scope.

```yaml
cells:
  pid:
    kind: program
    fn: |
      return (target, current) => {
        const error = target - current;
        return 0.5 * error + 0.1 * (error - lastError);
      };
```

## 5. sensor

Pull-based data source. Polls and returns the current value.

```yaml
cells:
  imu_heading:
    kind: sensor
    poll_ms: 50
    fn: "return sensor.read().heading;"
```

## 6. listener

Push side-effect. Fires when an upstream value changes.

```yaml
cells:
  alarm:
    kind: listener
    depends_on: [imu_heading]
    fn: |
      if (imu_heading > 90) send_sms('Off course!');
```

## 7. router

Per-context memoization. Picks a value based on the caller.

```yaml
cells:
  model:
    kind: router
    routes:
      user: "gpt-4"
      admin: "claude-3-opus"
      background: "gpt-3.5-turbo"
```

## 8. io

Bidirectional IO. WebSocket, MQTT, serial — anything.

```yaml
cells:
  mqtt_in:
    kind: io
    transport: mqtt
    topic: "boat/sensors/heading"
```

## 9. ai

An LLM call. Templated input, provider-routed, content-addressed cache.

```yaml
cells:
  summary:
    kind: ai
    provider: zai
    model: glm-4.5
    template: "Summarize: {{article}}"
    cache: true
```

## Composition

Cells compose. A formula can reference an api cell. A listener can fire on a sensor. An ai cell's template can reference a value cell. Every connection is tracked by the engine; every change propagates.

```yaml
cells:
  # value
  threshold:
    kind: value
    value: 0.8

  # api
  reading:
    kind: api
    url: "https://sensor.local/reading"

  # formula
  alert:
    kind: formula
    formula: "reading > threshold"

  # listener
  notifier:
    kind: listener
    depends_on: [alert]
    fn: "if (alert) send_email('sensor@high', reading);"

  # ai
  analysis:
    kind: ai
    provider: zai
    template: "Reading: {{reading}}. Above threshold ({{threshold}}) by {{alert ? (reading - threshold) : 0}}. Recommend action."
```

## Engine semantics

The engine maintains a dependency graph. When a cell's value changes:
1. The cell is marked dirty.
2. All formula cells that depend on it are re-evaluated.
3. All listener cells are invoked.
4. The propagation continues until no more cells are dirty.

This is the same model as spreadsheet recalculation, but applied to arbitrary capabilities.
