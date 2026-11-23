# Quick start

Welcome to Quilt. In 5 minutes you'll have a reactive cell graph running.

## What is a cell?

A cell is a **live, typed, addressable capability**. It can be:
- A value (number, string, object)
- A formula (computed from other cells)
- An API call (HTTP)
- A program (TypeScript closure)
- A sensor (poll-based)
- A listener (push side-effect)
- A router (per-context memoized)
- An IO (WebSocket, MQTT, serial)
- An AI call (LLM)

Cells wire together. Change one, every dependent rewires automatically.

## Installation

```bash
npm install @superinstance/quilt-core @superinstance/quilt-sdk
```

## Your first sheet

```ts
import { QuiltEngine, parseSheet } from '@superinstance/quilt-core';

const engine = new QuiltEngine('hello');

// value cell
engine.loadSheet(parseSheet(`
id: hello
cells:
  - id: greeting
    kind: value
    value: "Hello, "
  - id: name
    kind: value
    value: "world"
  - id: message
    kind: formula
    expr: "greeting + name"
`));

// get() returns a CellValue — read .data for the payload
console.log((await engine.get('message')).data); // "Hello, world"

// Change a value cell — formula re-evaluates automatically
await engine.set('name', 'Quilt');
console.log((await engine.get('message')).data); // "Hello, Quilt"
```

## Your first AI cell

```ts
engine.loadSheet(parseSheet(`
id: ai-demo
cells:
  - id: topic
    kind: value
    value: "quorum consensus"
  - id: answer
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "Explain {{topic}} in one sentence"
`));

const answer = await engine.get('answer');
console.log(answer.data);
```

## Your first federated cell

```ts
import { HttpCellTransport, resolveCell, subscribeCell } from '@superinstance/quilt-sdk';

const transport = new HttpCellTransport('https://quilt.example.com', process.env.TOKEN);
const handle = await resolveCell('quilt://boat-1/sensors#heading', transport);
console.log(await handle.get());

// Subscribe to changes
const unsub = subscribeCell('quilt://boat-1/sensors#heading', (v) => {
  console.log('new heading:', v);
}, transport);
```

## Next steps

- [Cell kinds](/guide/cell-kinds) — the 9 cell types in detail
- [Federation](/guide/federation) — cross-tier cell resolution
- [Deployment](/guide/deployment) — run Quilt anywhere
- [Error contract](../error-contract.md) — how get/call return errors and set/push throw
- [SDK reference](/sdk/) — full API documentation
