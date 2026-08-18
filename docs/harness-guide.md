# Building Custom Harnesses around Quilt

This guide is for developers who want to embed Quilt's engine
inside their own application. It covers both the TypeScript and
Rust runtimes and shows the patterns we use internally.

## What is a "harness"?

A harness is the application that:

1. Loads a sheet (or several)
2. Drives inputs (sensors, user actions, scheduled events)
3. Surfaces outputs to users (CLI, web, chat, embedded device)
4. Subscribes to changes for live updates

Examples of harnesses:

- The `quilt` CLI (Rust) — terminal tool
- The `@quilt/mcp` server (TypeScript) — exposes sheets as MCP tools
- The `quilt-web` server (Rust) — HTTP + SSE
- The `@quilt/tui` package (TypeScript) — terminal UI
- Your own agent runtime, dashboard, IDE plugin, etc.

The engine itself is just a library. The harness is everything
around it.

---

## Rust harness (the canonical path)

The Rust engine is a sync core with async cell evaluators. It's
designed to be embedded in a sync binary or wrapped in a
`tokio::main` async harness.

### Minimal sync harness

```rust
use quilt_core::{QuiltEngine, parse_sheet, CallerContext};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let yaml = std::fs::read_to_string("sheet.yaml")?;
    let sheet = parse_sheet(&yaml)?;
    let engine = QuiltEngine::new("my-sheet").into_arc();
    engine.load_sheet(sheet)?;

    // Read a value.
    let v = engine.get("some.cell", CallerContext::default())?;
    println!("some.cell = {:?}", v.data);

    // Set a value (triggers reactive recomputation).
    engine.set("input.a", serde_json::json!(42), CallerContext::default())?;

    // Subscribe to a cell for live updates.
    let (_tx, rx) = engine.subscribe("some.cell")?;
    // ... in another thread: rx.recv() yields SubscriptionEvent values

    Ok(())
}
```

### Async harness with tokio

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let yaml = std::fs::read_to_string("sheet.yaml")?;
    let sheet = parse_sheet(&yaml)?;
    let engine = QuiltEngine::new("my-sheet").into_arc();
    engine.load_sheet(sheet)?;

    // The engine's get/set/call are sync, even for async cells.
    // drive_async handles the async bridge internally.
    let v = engine.get("api.cell", CallerContext::default())?;
    Ok(())
}
```

### Wiring live updates to a web server

```rust
use quilt_core::{QuiltEngine, QuiltEngine, parse_sheet};
use tokio::sync::broadcast;

let engine = QuiltEngine::new("my-sheet").into_arc();
engine.load_sheet(parse_sheet(&yaml)?)?;

// Subscribe-all: a sync channel that yields every change.
let all_sub = engine.subscribe_all();
let (tx, mut rx) = broadcast::channel(1024);

// Bridge: pump the sync channel into the async broadcast.
std::thread::spawn(move || {
    loop {
        match all_sub.rx.recv() {
            Ok(ev) => { let _ = tx.send(ev); }
            Err(_) => break,
        }
    }
});

// Now `rx` can be used in async SSE handlers.
while let Ok(ev) = rx.recv().await {
    println!("cell {} changed to {:?}", ev.cell_id, ev.new_value.data);
}
```

### Common patterns

**Per-tenant context**: pass a different `CallerContext` per
request to get caller-aware memoization. The formula cache is
keyed by `context_key(ctx)`.

```rust
let mut ctx = CallerContext::default();
ctx.row = Some(serde_json::json!("tenant-42"));
let v = engine.get("model.picker", ctx)?;
```

**Dynamic cell registration**: agents can define new cells at
runtime. Use `engine.register(def)` instead of `load_sheet`:

```rust
use quilt_core::{CellDef, CellKind};
let def = CellDef {
    id: "agent.metric".into(),
    kind: CellKind::Value,
    value: Some(serde_json::json!(0.0)),
    ..Default::default()
};
engine.register(def)?;
```

**Streaming changes to many subscribers**: use `subscribe_all`
plus a broadcast channel. The pattern in `quilt-web` is the
reference implementation.

---

## TypeScript harness

The TS engine is fully async. Use it from any async context.

### Minimal Node harness

```ts
import { QuiltEngine, parseSheet, CallerContext } from '@quilt/core';
import { readFile } from 'node:fs/promises';

const yaml = await readFile('sheet.yaml', 'utf8');
const sheet = parseSheet(yaml);
const engine = new QuiltEngine(sheet.id);
engine.loadSheet(sheet);

const v = await engine.get('some.cell');
console.log('some.cell =', v.data);

await engine.set('input.a', 42);

// Subscribe to a cell.
engine.subscribe('some.cell', (value, prev) => {
  console.log('changed from', prev.data, 'to', value.data);
});
```

### Wiring to an HTTP server

```ts
import express from 'express';
import { QuiltEngine, parseSheet } from '@quilt/core';

const engine = new QuiltEngine('my-sheet');
engine.loadSheet(parseSheet(yaml));

const app = express();
app.use(express.json());

app.get('/api/cell/:id', async (req, res) => {
  res.json(await engine.get(req.params.id));
});

app.post('/api/cell/:id', async (req, res) => {
  await engine.set(req.params.id, req.body);
  res.status(204).end();
});

// SSE for live updates.
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  const sub = engine.subscribeAll((ev) => {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  });
  req.on('close', () => engine.unsubscribe(sub.id));
});

app.listen(3000);
```

### Wiring to an MCP server

See `packages/mcp/`. The pattern:

1. Create the engine
2. Call `startMcpServer(engine)` to expose cells as tools
3. The MCP server handles subscriptions + changes

### Wiring to a CLI (the `quilt` binary pattern)

```ts
import { QuiltEngine, parseSheet } from '@quilt/core';

async function load(path: string) {
  const yaml = await readFile(path, 'utf8');
  const sheet = parseSheet(yaml);
  const engine = new QuiltEngine(sheet.id);
  engine.loadSheet(sheet);
  return engine;
}

async function cmdGet(path: string, cellId: string) {
  const engine = await load(path);
  const v = await engine.get(cellId);
  console.log(JSON.stringify(v.data));
}
```

### Common patterns

**Caller context**: pass `caller.row` / `caller.column` /
`caller.identity` to get caller-aware routing:

```ts
const ctx: CallerContext = {
  row: 'tenant-42',
  column: 'creative',
  identity: { id: 'user-1', type: 'user', tags: ['premium'] },
};
const v = await engine.call('route.model', input, ctx);
```

**Subscribe patterns**:
- `subscribe(cellId, callback)` — single cell
- `subscribeAll(callback)` — every change
- `unsubscribe(subId)` — stop watching

**Error handling**: `get` returns a `CellValue` with
`status: 'error'` and an `error` field. The engine never throws
on cell errors; only structural problems (missing sheet, etc.)
throw.

---

## Cross-runtime portability

A sheet written in YAML works in both runtimes, with these caveats:

| Feature | TS | Rust |
|---|---|---|
| `=` ternary `x > 0 ? 'a' : 'b'` | yes | no (rhai) |
| `if/else` as expression | no (statement) | yes (rhai) |
| Program cell helpers | `runtime.get`/`runtime.call` | `qget`/`qcall` (no `call` shadow) |
| Formulas (math) | JS | rhai |
| Chained formulas | auto, JS proxy | auto, snapshot pre-eval |
| Sensor `default` | yes | yes |

If you want a single YAML to run on both, use **ternaries** and
**avoid the `call` keyword** (use `qcall` in Rust; in TS the
runtime function is `runtime.call`).

---

## Endpoints: plugging Quilt into other systems

### Connect Quilt to an existing REST API

Wrap an existing REST endpoint as a `program` cell. The script
makes the HTTP call and returns the response.

```ts
{
  id: 'github.user',
  kind: 'program',
  code: `
    const username = input;
    const res = await fetch('https://api.github.com/users/' + username);
    return await res.json();
  `
}
```

```yaml
id: github.user
kind: program
code: |
  let username = input;
  let res = qcall("http.get", "https://api.github.com/users/" + username);
  res
```

### Connect Quilt to a database

Use a `program` cell that runs a query. Return the rows as JSON.

```yaml
id: db.users
kind: program
code: |
  // In the harness, expose a 'db' helper that runs queries.
  let rows = qcall("db.query", "SELECT id, name FROM users");
  rows
```

The harness wires `qcall("db.query", sql)` to its actual DB
driver.

### Connect Quilt to LLM providers

Use the `api` cell kind with a `model:foo` pseudo-endpoint. The
engine returns a synthetic result by default; the harness
overrides the executor to make real calls.

```ts
// In your harness, register a custom executor.
engine.setApiExecutor(async (endpoint, input) => {
  if (endpoint === 'model:gpt-4o') {
    return await callOpenAI('gpt-4o', input);
  }
  // ...
});
```

### Connect Quilt to message queues

Use a `program` cell to publish, and an `api` cell to consume:

```ts
{
  id: 'kafka.publish',
  kind: 'program',
  code: `
    const message = input;
    await runtime.call('kafka.client', 'publish', { topic: 'events', message });
    return { published: true };
  `
}
```

### Connect Quilt to filesystem / S3

Use a `program` cell that calls a harness helper. Don't put
filesystem logic in the cell — keep it in the harness where you
have full control over the security model.

---

## Performance tips

For high-throughput cell evaluation:

- **Batch reads**: read multiple cells in one go. The engine
  caches formulas per-context, so calling the same formula
  repeatedly is cheap.
- **Pre-compile formulas**: the engine caches the compiled
  AST. Don't re-parse the YAML on every request — load once.
- **Use listeners, not polls**: `subscribe` is push-based; polls
  waste CPU.
- **Avoid deep chains**: each formula is one eval. A chain of
  10 formulas is 10 evals. If you can collapse two formulas
  into one, do it.
- **Throttle SSE in the harness**: if you have 10k subscribers,
  coalesce events and send at most every 100ms.

For very high throughput, see the `throughput` doc.

---

## Testing harnesses

The engine is a pure library. Test the harness separately from
the engine.

- **Unit-test cells**: load a sheet in a test, set values,
  assert on outputs.
- **Snapshot-test rendered output**: for CLI / TUI harnesses,
  capture stdout and compare.
- **Mock the runtime**: when a `program` cell calls
  `runtime.get("x")`, your test should provide a mock runtime
  with a known `x`.
