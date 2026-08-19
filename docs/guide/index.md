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
npm install @quilt/core @quilt/sdk
```

## Your first sheet

```ts
import { QuiltEngine, parseSheet } from '@quilt/core';

const engine = new QuiltEngine('hello');

// value cell
engine.loadSheet(parseSheet(`
cells:
  greeting:
    kind: value
    value: "Hello, "
  name:
    kind: value
    value: "world"
  message:
    kind: formula
    formula: "greeting + name"
`));

console.log(await engine.get('message')); // "Hello, world"

// Change a value cell — formula re-evaluates automatically
await engine.set('name', 'Quilt');
console.log(await engine.get('message')); // "Hello, Quilt"
```

## Your first AI cell

```ts
engine.loadSheet(parseSheet(`
cells:
  prompt:
    kind: value
    value: "Explain {{topic}} in one sentence"
  topic:
    kind: value
    value: "quorum consensus"
  answer:
    kind: ai
    provider: zai
    model: glm-4.5
    template: "{{prompt}}"
`));

const answer = await engine.get('answer');
console.log(answer);
```

## Your first federated cell

```ts
import { HttpCellTransport, resolveCell, subscribeCell } from '@quilt/sdk';

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
- [SDK reference](/sdk/) — full API documentation
