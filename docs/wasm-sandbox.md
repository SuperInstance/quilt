# WASM Sandbox for Program Cells

> **The one security gap in v0.1, and the plan to close it.**

## The gap

In v0.1, a `program` cell in the TypeScript engine runs its code via JavaScript's `new AsyncFunction(...)`. This is:

- **Powerful**: full JavaScript, async/await, closures, the works.
- **Dangerous**: same-origin access to the host process. A malicious program cell can read `process.env`, make network calls, read the filesystem, etc.

The Rust port doesn't have this problem because it uses `rhai`, which is sandboxed by default.

## The plan

For v0.2, the TypeScript engine gains a WASM-based sandbox. A `program` cell's code is compiled to WebAssembly and executed in a V8 isolate (or a similar WASM runtime) with no host access. The cell can:

- Receive its `input` (JSON)
- Call the `runtime` handle: `runtime.get(id, ctx)`, `runtime.set(id, value, ctx)`, `runtime.call(id, input, ctx)`, `runtime.list()`
- Return a JSON value

The cell **cannot**:

- Read the filesystem
- Make raw network calls (it can only go through `runtime.call` to other cells)
- Access `process.env`
- Read or write global state

## How it works

```text
┌─────────────────┐         ┌──────────────────┐
│  program cell   │         │  V8 isolate /    │
│  code (string)  │────────►│  WASM runtime    │
│                 │ compile │  (sandboxed)     │
│                 │         │                  │
│                 │◄────────│  no host access  │
└─────────────────┘ execute └──────────────────┘
```

Two paths in v0.2:

### Path A: QuickJS (default, ready in v0.2)

[QuickJS](https://bellard.org/quickjs/) is a small embeddable JavaScript engine. We embed it via [`quickjs-emscripten`](https://github.com/justjake/quickjs-emscripten). A `program` cell is parsed and executed in a QuickJS context with no host bindings registered. The `runtime` handle is exposed as a host function the QuickJS code can call.

**Trade-off**: QuickJS doesn't support async/await natively. We bridge by polling or by running the program in a worker.

### Path B: V8 Isolates (experimental, v0.2)

[Node.js `vm` module](https://nodejs.org/api/vm.html) supports V8 isolates via `vm.createContext()`. With `vm.constants.DONT_CONTEXTIFY` and a frozen context, you can get most of the safety guarantees of a real sandbox.

**Trade-off**: V8 isolates are not perfectly isolated — there are known escape techniques. For a higher security bar, you'd want [`isolated-vm`](https://github.com/laverdet/isolated-vm), which uses real V8 isolates with no shared heap.

## The cell-level configuration

A `CellDef` will gain an optional `sandbox` field:

```yaml
- id: ai-pick-model
  kind: program
  code: |
    const input = $input;
    if (input.task === 'summarize') return 'claude-sonnet';
    return 'gpt-4o-mini';
  sandbox:
    enabled: true
    timeout_ms: 5000
    max_memory_mb: 16
    permissions:
      read: [model.list, model.get]
      write: []
```

The `sandbox` block tells the engine:

- `enabled: true` — run in WASM sandbox, not in the host process
- `timeout_ms: 5000` — kill the cell after 5 seconds
- `max_memory_mb: 16` — kill the cell if it uses more than 16 MB
- `permissions.read: [...]` — which cells the `runtime.get` call is allowed to invoke
- `permissions.write: [...]` — which cells the `runtime.set` call is allowed to invoke

## What this changes for users

Nothing, for most users. The default `sandbox.enabled` is `true` for new sheets. Old sheets that explicitly opt in to the host process keep that behavior via `sandbox.enabled: false`.

What this changes for security:

- **Before**: a malicious or buggy `program` cell could read your secrets, exfiltrate your data, or break your engine.
- **After**: a `program` cell can only do what the runtime handle allows. If the cell loops forever, it gets killed at `timeout_ms`. If it uses too much memory, it gets killed at `max_memory_mb`.

## Timeline

| When    | Status                                                         |
| ------- | -------------------------------------------------------------- |
| v0.1    | Default: `new AsyncFunction` (not sandboxed). `sandbox.enabled: false` is the default. |
| v0.2    | Default: `sandbox.enabled: true` with QuickJS. `false` opt-in for trusted code. |
| v0.3    | V8 isolates via `isolated-vm` for production-grade security.    |
| v0.4    | Per-cell capability tokens: a cell can hold a token that grants read/write access to specific cells. |

## The escape hatches

For trusted code (your own, on your own machine), the v0.2 sandbox can be disabled:

```yaml
- id: my-trusted-cell
  kind: program
  sandbox:
    enabled: false
  code: |
    // this code runs in the host process
    // you have full Node.js / browser access
    return await someLocalApiCall();
```

This is the v0.1 behavior, opt-in. The plan is to make `enabled: true` the default in v0.2 so the secure path is the path of least resistance.

## What about the Rust port?

The Rust port already has the sandbox model — `rhai` is sandboxed by default, and a `program` cell has no host access. The Rust port's `CellDef` doesn't need a `sandbox` field; the secure path is the only path.

If you're choosing between TypeScript and Rust for security reasons: **the Rust port is more secure out of the box today.** The TypeScript port will catch up in v0.2.

## See also

- **[docs/security.md](security.md)** — the broader trust model
- **[docs/comparison.md](comparison.md)** — Quilt vs. n8n, LangGraph, etc.
- **[superinstance/quilt-rust](https://github.com/superinstance/quilt-rust)** — the Rust port, which is sandboxed by default
