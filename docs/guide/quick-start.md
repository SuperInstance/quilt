# Quick start

Five minutes from zero to a running cell graph.

## Install

```bash
npm install @superinstance/quilt-core
```

This installs the latest published release (**0.3.3**). The repository
carries 0.3.4, which will be the next publish. Node >= 18.

(Or `@superinstance/quilt-sdk` if you only need the federation primitives.)

## Hello, cells

A sheet is a YAML document with an `id` and a `cells` **array**. Each cell
has an `id`, a `kind`, and the fields its kind needs — a formula cell's
expression lives in `expr`.

```ts
import { QuiltEngine, parseSheet } from '@superinstance/quilt-core';

const engine = new QuiltEngine('hello');
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

const result = await engine.get('message');
console.log(result.data);   // "Hello, world"
console.log(result.status); // "ready"
```

`get()` is async and returns a **CellValue** — `{ data, status, … }` —
never the raw value. Read `.data` for the payload and `.status` to know
whether it is `ready`, `computing`, `error`, or `stale`.

## Change a value — dependents recompute

```ts
await engine.set('name', 'Quilt');
const updated = await engine.get('message');
console.log(updated.data); // "Hello, Quilt"
```

`set()` is async too. That pair — load a sheet, `get` a formula, `set` an
input, watch the formula move — is the whole reactive model in miniature.

## In a browser (no install)

```html
<script type="module">
  import { QuiltEngine } from 'https://cdn.jsdelivr.net/npm/@superinstance/quilt-core@0.3.3/dist/index.js';
  // ...
</script>
```

(Pin the version that exists. There is no 0.6.0.)

## Pick a runtime

| If you want to... | Use |
|---|---|
| Build a web app or agent | `@superinstance/quilt-core` + `@superinstance/quilt-sdk` (Node or browser) |
| Run a single static binary | `quilt-rust` (cargo install quilt) |
| Run a single HTML file | `quilt-live` (70KB, works offline) |
| Run on ESP32 | `quilt-esp32` (no_std) |
| Run on Jetson | `quilt-jetson` (CUDA, ROS2) |
| Run on Cloudflare | `quilt-cloudflare` (Workers + D1 + R2) |
| Run a full Linux service | `quilt` CLI (Node) or `quilt-rust` |
| Try a Codespace | `quilt-codespace` (GitHub Codespaces) |

## Your first 5-line app

```ts
import { QuiltEngine, parseSheet } from '@superinstance/quilt-core';
const e = new QuiltEngine('app');
e.loadSheet(parseSheet(`
id: app
cells:
  - id: x
    kind: value
    value: 42
  - id: y
    kind: formula
    expr: "x * 2"
`));
console.log((await e.get('y')).data); // 84
```

## Your first AI cell

AI cells need an AI engine configured on the `QuiltEngine` (see the AI
cell docs); without one, the cell returns a CellValue with
`status: "error"` instead of throwing.

```ts
import { QuiltEngine, parseSheet } from '@superinstance/quilt-core';

const e = new QuiltEngine('app');
e.loadSheet(parseSheet(`
id: app
cells:
  - id: topic
    kind: value
    value: "reactive programming"
  - id: answer
    kind: ai
    ai_kind: ai.llm
    provider: zai
    model: glm-4.5
    prompt: "Explain {{topic}} in 20 words"
`));

const answer = await e.get('answer');
console.log(answer.data);
```

## Your first cross-tier cell

```ts
import { HttpCellTransport, resolveCell } from '@superinstance/quilt-sdk';

const transport = new HttpCellTransport('https://quilt.example.com', process.env.QUILT_TOKEN);
const heading = await resolveCell('quilt://boat-1/sensors#heading', transport);
console.log(await heading.get());
```

## Next

- [Cell kinds](/guide/cell-kinds) — the nine kinds and their fields
- [Federation](/guide/federation) — cross-tier resolution
- [Tutorial](https://github.com/SuperInstance/quilt/tree/main/tutorials) — a longer, CLI-first walkthrough
- [Examples](https://github.com/SuperInstance/quilt/tree/main/examples) — complete sheets, e.g. `examples/boat-autopilot/sheet.yaml`
