# @superinstance/quilt-core

> The Quilt engine — reactive, typed cells: part spreadsheet, part state
> machine, part message bus. This package is the engine; everything else
> in the Quilt family builds on it.

```bash
npm install @superinstance/quilt-core
```

```ts
import { QuiltEngine } from '@superinstance/quilt-core';

const engine = new QuiltEngine('hello');
engine.loadSheet({
  id: 'hello',
  cells: [
    { id: 'greeting', kind: 'value', value: 'Hello' },
    { id: 'name', kind: 'value', value: 'world' },
    { id: 'message', kind: 'formula', expr: "greeting + ', ' + name" },
  ],
});

const result = await engine.get('message'); // a CellValue, not a bare value
console.log(result.data);   // "Hello, world"
console.log(result.status); // "ready"

await engine.set('name', 'Quilt'); // reactive: 'message' recomputes
console.log((await engine.get('message')).data); // "Hello, Quilt"
```

- Values come back as **CellValues** — `{ data, status }` — because a
  cell can be pending, stale, or errored, not just ready. `status` is
  `'ready' | 'pending' | 'stale' | 'error'`.
- Formulas reference other cells by bare id and recompute when their
  inputs change.
- The error contract (reads return error values, writes throw) is
  documented in the repo: `docs/error-contract.md`.

Full documentation, guides, and the rest of the family
(`@superinstance/quilt-sdk`, `-cli`, `-mcp`, `-tui`) live in the main
repository: https://github.com/SuperInstance/quilt

License: Apache-2.0
