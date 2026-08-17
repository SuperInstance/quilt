# Quilt Recipes

Common patterns, copy-paste-ready.

## Recipe 1: A/B test two prompts

Test which prompt works better for a specific use case. Each row is a variant.

```yaml
id: prompt-ab-test
title: "A/B test prompts"
cells:
  - id: variant.a.prompt
    kind: value
    value: "You are concise. One sentence answers."

  - id: variant.b.prompt
    kind: value
    value: "You are thorough. Explain with examples."

  - id: variant.a.response
    kind: api
    endpoint: "model:openai/gpt-4o-mini"
    method: POST
    headers: { "Content-Type": "application/json" }

  - id: variant.b.response
    kind: api
    endpoint: "model:openai/gpt-4o"
    method: POST
    headers: { "Content-Type": "application/json" }

  - id: results.a
    kind: value
    value: { success: 0, total: 0 }

  - id: results.b
    kind: value
    value: { success: 0, total: 0 }
```

The agent tests each variant. Aggregate results in `results.a` and `results.b`. When the sample size is enough, the winner is obvious.

## Recipe 2: Multi-tenant rate limiter

Limit each tenant's requests per minute. Rows are tenants, columns are capabilities.

```yaml
id: rate-limiter
title: "Per-tenant rate limiter"
cells:
  - id: limits.requests_per_minute
    kind: value
    value: 60

  - id: tenant.acme.count
    kind: value
    value: 0
    description: "How many requests has acme made in the current window"

  - id: tenant.globex.count
    kind: value
    value: 0

  - id: tenant.acme.allowed
    kind: formula
    expr: "=tenant.acme.count < limits.requests_per_minute"

  - id: tenant.globex.allowed
    kind: formula
    expr: "=tenant.globex.count < limits.requests_per_minute"

  - id: router.allow
    kind: router
    rules:
      - when: 'caller.row === "acme" && !tenant.acme.allowed'
        route: { value: false }
      - when: 'caller.row === "globex" && !tenant.globex.allowed'
        route: { value: false }
      - when: 'true'
        route: { value: true }
```

The agent calls `router.allow` before processing a request. If it returns false, return 429.

## Recipe 3: Anomaly detector with learning

A sensor with a rolling mean. When the current value is far from the rolling mean, escalate.

```yaml
id: anomaly-detector
title: "Anomaly detector with rolling mean"
cells:
  - id: sensor.value
    kind: sensor
    source: "mqtt://broker/topic"
    rate: 1000

  - id: rolling.mean
    kind: program
    code: |
      const x = (await runtime.get('sensor.value')).data || 0;
      const prev = (await runtime.get('rolling.mean')).data || 0;
      return prev * 0.95 + x * 0.05;

  - id: threshold
    kind: value
    value: 3.0

  - id: surprise
    kind: formula
    expr: "=abs(sensor.value - rolling.mean) / 5"

  - id: should_escalate
    kind: formula
    expr: "=surprise > threshold"

  - id: model.analyzer
    kind: api
    endpoint: "model:onnx-anomaly"

  - id: escalation
    kind: program
    code: |
      const x = (await runtime.get('sensor.value')).data;
      return { escalated: true, value: x, at: Date.now() };

  - id: escalation.listener
    kind: listener
    watch: [should_escalate]
    action: escalation
```

Only when `should_escalate` is true does the listener fire `escalation`. The model is never called for normal data.

## Recipe 4: Human approval gate

A cell that pauses until a human approves. The cell's value is `null` until a human sets it.

```yaml
id: human-approval
title: "Human approval gate"
cells:
  - id: action.payload
    kind: value
    value: { command: "delete_database", target: "prod-1" }

  - id: action.approved
    kind: value
    value: null
    description: "Set to true/false by a human via the UI or MCP"

  - id: action.gate
    kind: program
    code: |
      const approved = (await runtime.get('action.approved')).data;
      if (approved === null) {
        return { status: 'pending', message: 'Waiting for human approval' };
      }
      if (approved === true) {
        return { status: 'approved', action: (await runtime.get('action.payload')).data };
      }
      return { status: 'rejected', action: (await runtime.get('action.payload')).data };
```

The agent calls `action.gate` to check the status. A human (or another cell) sets `action.approved` to true/false. The gate returns the appropriate status.

## Recipe 5: Cost tracking per request

Track the cost of every API call. Sum it up.

```yaml
id: cost-tracker
title: "Per-request cost tracking"
cells:
  - id: request.id
    kind: value
    value: "req-001"

  - id: request.cost
    kind: value
    value: 0.01
    description: "Set by the API cell after each call"

  - id: daily.total
    kind: program
    code: |
      // Sum all request.cost values for the day
      // (in production, would query a database)
      return 12.34;

  - id: daily.budget
    kind: value
    value: 100.00

  - id: budget.alert
    kind: listener
    watch: [daily.total]
    condition: "caller.metadata && caller.metadata.current > 0.8 * daily.budget"
    action: log.budget_warning

  - id: log.budget_warning
    kind: program
    code: |
      return { message: 'Daily budget 80% consumed', at: Date.now() };
```

## Recipe 6: Multi-model ensemble

Get a result from multiple models, vote on the answer.

```yaml
id: ensemble
title: "Multi-model ensemble"
cells:
  - id: query
    kind: value
    value: "What is the capital of France?"

  - id: gpt4o.answer
    kind: api
    endpoint: "model:openai/gpt-4o"

  - id: claude.answer
    kind: api
    endpoint: "model:anthropic/claude-sonnet-4-5"

  - id: gemini.answer
    kind: api
    endpoint: "model:google/gemini-2.0-flash"

  - id: ensemble.result
    kind: program
    code: |
      const answers = [
        (await runtime.call('gpt4o.answer')).data,
        (await runtime.call('claude.answer')).data,
        (await runtime.call('gemini.answer')).data,
      ];
      // Vote: return the most common answer
      const counts = {};
      for (const a of answers) {
        counts[a] = (counts[a] || 0) + 1;
      }
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return { answer: winner[0], votes: winner[1], all: answers };
```

## Recipe 7: Webhook receiver

Receive a webhook, store the payload, fire listeners.

```yaml
id: webhook-receiver
title: "Webhook receiver"
cells:
  - id: webhook.last_payload
    kind: io
    direction: in
    port: "https://quilt.example.com/webhook"
    description: "Receives POST requests"

  - id: webhook.processor
    kind: program
    code: |
      const payload = (await runtime.get('webhook.last_payload')).data;
      return { processed: true, payload, at: Date.now() };

  - id: webhook.listener
    kind: listener
    watch: [webhook.last_payload]
    action: webhook.processor
```

External services POST to the port. The IO cell receives it, the listener fires, the program processes it.

## Recipe 8: Slow-degrading cache

Cache a value, but expire it after N seconds. Re-fetch on miss.

```yaml
id: caching-layer
title: "Slow-degrading cache"
cells:
  - id: api.expensive_call
    kind: api
    endpoint: "https://slow-api.example.com/data"
    method: GET

  - id: cache.value
    kind: value
    value: null
    description: "The cached value"

  - id: cache.expires_at
    kind: value
    value: 0
    description: "Epoch ms when the cache expires"

  - id: cache.ttl_ms
    kind: value
    value: 60000
    description: "Time-to-live in ms"

  - id: cached_or_fresh
    kind: program
    code: |
      const cached = (await runtime.get('cache.value')).data;
      const expires = (await runtime.get('cache.expires_at')).data || 0;
      const now = Date.now();
      if (cached !== null && expires > now) {
        return { source: 'cache', data: cached };
      }
      const fresh = await runtime.call('api.expensive_call');
      await runtime.set('cache.value', fresh.data);
      await runtime.set('cache.expires_at', now + ((await runtime.get('cache.ttl_ms')).data || 60000));
      return { source: 'fresh', data: fresh.data };
```

The first call hits the API. Subsequent calls within `ttl_ms` return the cached value.

## Recipe 9: Dynamic cell registration

An agent can register new cells at runtime. The engine accepts the registration and starts tracking the new cell.

```typescript
// In a program cell:
const newCell = {
  id: 'dynamic.cell.' + Date.now(),
  kind: 'value',
  value: 42,
  description: 'Created at runtime by an agent',
};
await runtime.register(newCell);
```

The new cell is now part of the graph. Other cells can reference it.

## Recipe 10: Sheet composition (sub-sheets)

A cell can be a reference to another sheet (in v0.2+). The whole sheet is then composable.

```yaml
id: composed-system
title: "Composed system"
cells:
  - id: sub_sheet.weather
    kind: value
    value: "ref:./weather.cellflow.yaml"
    description: "Reference to a sub-sheet"

  - id: sub_sheet.notifications
    kind: value
    value: "ref:./notifications.cellflow.yaml"

  - id: main.router
    kind: router
    rules:
      - when: 'caller.row === "tenant-a"'
        route: { cell: 'sub_sheet.weather' }
      - when: 'caller.row === "tenant-b"'
        route: { cell: 'sub_sheet.notifications' }
```

(Sub-sheet references are planned for v0.2. The current MVP doesn't resolve them yet.)
