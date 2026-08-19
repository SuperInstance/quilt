# Quick start

Five minutes from zero to a running cell graph.

## Install

```bash
npm install @quilt/core
```

(Or `@quilt/sdk` if you only need the federation primitives.)

## Hello, cells

```ts
import { QuiltEngine, parseSheet } from '@quilt/core';

const engine = new QuiltEngine('hello');
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

await engine.get('message'); // "Hello, world"
```

## Pick a runtime

| If you want to... | Use |
|---|---|
| Build a web app or agent | `@quilt/core` + `@quilt/sdk` (Node or browser) |
| Run a single static binary | `quilt-rust` (cargo install quilt) |
| Run a single HTML file | `quilt-live` (70KB, works offline) |
| Run on ESP32 | `quilt-esp32` (no_std) |
| Run on Jetson | `quilt-jetson` (CUDA, ROS2) |
| Run on Cloudflare | `quilt-cloudflare` (Workers + D1 + R2) |
| Run a full Linux service | `quilt` CLI (Node) or `quilt-rust` |
| Try a Codespace | `quilt-codespace` (GitHub Codespaces) |

## Your first 5-line app

```ts
import { QuiltEngine, parseSheet } from '@quilt/core';
const e = new QuiltEngine('app');
e.loadSheet(parseSheet('cells: { x: { kind: value, value: 42 }, y: { kind: formula, formula: "x * 2" } }'));
console.log(await e.get('y')); // 84
```

## Your first AI cell

```ts
e.loadSheet(parseSheet(`
cells:
  topic:
    kind: value
    value: "reactive programming"
  answer:
    kind: ai
    provider: zai
    model: glm-4.5
    template: "Explain {{topic}} in 20 words"
`));

await e.get('answer'); // "Reactive programming is a paradigm where changes..."
```

## Your first cross-tier cell

```ts
import { HttpCellTransport, resolveCell } from '@quilt/sdk';

const transport = new HttpCellTransport('https://quilt.example.com', process.env.QUILT_TOKEN);
const heading = await resolveCell('quilt://boat-1/sensors#heading', transport);
console.log(await heading.get());
```

## Next

- [Cell kinds](/guide/cell-kinds) — what each kind does
- [Federation](/guide/federation) — cross-tier resolution
- [Examples](https://github.com/SuperInstance/quilt/tree/main/examples)
