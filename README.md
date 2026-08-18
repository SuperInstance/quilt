# ◳ Quilt

> **A spreadsheet where every cell is a live, addressable capability. The grid is the runtime.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-native-purple)](https://modelcontextprotocol.io)
[![Rust port](https://img.shields.io/badge/Rust-1.0-blue)](https://github.com/superinstance/quilt-rust)
[![Status](https://img.shields.io/badge/status-v0.2.0-brightgreen)](https://github.com/superinstance/quilt)
[![Tests](https://img.shields.io/badge/tests-15%2F15-brightgreen)](https://github.com/superinstance/quilt)

**[Live simulator ⚡](landing/simulator.html)** · **[Read the manifesto →](docs/manifesto.md)** · **[Tutorial →](tutorials/README.md)** · **[Examples →](examples/)** · **[Architecture →](docs/architecture.md)** · **[Harness guide →](docs/harness-guide.md)** · **[Throughput notes →](docs/throughput.md)**

---

## 🤔 TypeScript or Rust?

Both are production-grade. Same engine, same sheet format, different tradeoffs.

| Need                                              | Use **TypeScript** | Use **Rust** |
| ------------------------------------------------- | :----------------: | :----------: |
| **Browser simulator** / web UI                    | ✅                  | ✅ (axum)     |
| **TUI** for the terminal                          | ✅                  | ✅ (crossterm)|
| **MCP server** for Claude Code / Cursor / agents  | ✅                  | ✅            |
| **Single static binary**, no Node.js              | ❌                  | ✅            |
| **Embedded / IoT / edge** (RPi, ESP32, no_std)     | ❌                  | ✅            |
| **Strict memory guarantees** in a sandboxed cell  | ❌                  | ✅ (rhai)     |
| **High-throughput** cell evaluation               | ⚠️ (~50k ops/s)     | ✅ (compiled) |
| Embed in a **web app** or **Node service**        | ✅                  | ✅ (axum)     |
| **Static cross-compilation** to any platform      | ❌                  | ✅            |
| **WASM target** for the browser                   | 🔜 (planned)        | ✅ (planned)  |

> The two repos share the **same sheet format (YAML)** and the **same conceptual model**. A sheet that runs on one runs on the other (with a few language-specific quirks documented in `docs/harness-guide.md`).

---

## What it is

Quilt is a reactive, typed, cellular runtime. The spreadsheet is the control plane. The cell is the universal IO primitive.

- A cell can be a **value**, **formula**, **api**, **program**, **sensor**, **listener**, **router**, or **io**.
- A cell reference is a stable **address**, not a coordinate.
- A cell can **route** based on who called it (`caller.row > 10` → use Model A).
- The whole sheet is an **MCP server**. Every named cell is an MCP tool.
- It's **reactive** by default. Change one cell, every dependent rewires.
- **Per-context memoization**: same cell called from different callers can return different cached values.

> **The paradigm shift, in one line:** A cell is not a value. A cell is a live, typed, addressable capability. The spreadsheet is not a document. The spreadsheet is the runtime.

---

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────┐
│                       Quilt  (TS)                        │
│                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│   │  parse   │───►│  engine  │◄──►│  cells   │          │
│   │ (YAML)   │    │  (graph) │    │  (8 ks)  │          │
│   └──────────┘    └────┬─────┘    └──────────┘          │
│                        │                                 │
│            ┌───────────┼────────────┐                    │
│            ▼           ▼            ▼                    │
│       ┌────────┐  ┌────────┐  ┌────────┐                 │
│       │  CLI   │  │  MCP   │  │  TUI   │                 │
│       │ (node) │  │  (mcp) │  │ (ansi) │                 │
│       └────────┘  └────────┘  └────────┘                 │
│                                                          │
│       ┌────────┐                                          │
│       │  Web   │  ← landing/simulator.html               │
│       │  UI    │  ← browser-native, no build step        │
│       └────────┘                                          │
└──────────────────────────────────────────────────────────┘
```

The Rust port has the same shape — same 8 cell kinds, same engine, same CLI/MCP surfaces. The difference: `node` + JavaScript instead of `tokio` + `rhai`. See [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust).

---

## The one-liner

> A spreadsheet where every cell is a live API endpoint, and changing one cell rewires every dependent sensor, model, and agent.

---

## ⚡ Try the live simulator

**No install. No clone. Just open it.**

**[→ Open the simulator](landing/simulator.html)** *(in your browser, offline-capable)*

A side-by-side code editor + runtime view + dependency graph. Edit a YAML sheet, see the cells update in real time. Pick a preset, hit "Run", watch the cells compute.

---

## Quick start (5 minutes)

```sh
# 1. Clone
git clone https://github.com/superinstance/quilt.git
cd quilt

# 2. Install (npm workspaces)
npm install

# 3. Run a sheet
npx @quilt/cli run examples/boat-autopilot/sheet.yaml

# 4. Serve as MCP (then point an MCP client at it)
npx @quilt/cli serve examples/boat-autopilot/sheet.yaml

# 5. Or use the TypeScript API
node -e '
import("@quilt/core").then(async ({ QuiltEngine, parseSheet }) => {
  const engine = new QuiltEngine({ id: "demo" });
  engine.loadSheet(parseSheet("id: demo\ncells:\n  - id: hello\n    kind: value\n    value: hello, world"));
  const v = await engine.get("hello", {});
  console.log(v.data);
});
'
```

---

## The 8 cell kinds

| Kind        | What it is                                       | Evaluator             | Example                                |
| ----------- | ------------------------------------------------ | --------------------- | -------------------------------------- |
| `value`     | Static data. No dependencies.                    | direct                | `kind: value, value: 42`              |
| `formula`   | Reactive expression. Re-evaluates on change.     | `new Function`        | `kind: formula, expr: =a + b`         |
| `api`       | HTTP endpoint. Fetched on call.                  | `fetch` (async)       | `kind: api, endpoint: https://...`    |
| `program`   | Inline JavaScript async function.                | `AsyncFunction`       | `kind: program, code: \| ...`         |
| `sensor`    | Push-only value. Adapter writes, formula reads.  | external adapter      | `kind: sensor, source: mqtt://...`    |
| `io`        | Bidirectional port.                              | external adapter      | `kind: io, port: gpio17, direction: out` |
| `listener`  | Triggers on watched cell change.                 | engine propagation    | `kind: listener, watch: [x]`          |
| `router`    | Caller-aware policy. Delegates to a target cell. | `eval_when`           | `kind: router, rules: [...]`          |

---

## A working example: boat-autopilot

From `examples/boat-autopilot/sheet.yaml`:

```yaml
id: boat-autopilot
version: "1"
cells:
  - id: heading
    kind: sensor
    source: "nmea:/dev/ttyUSB0"
    description: The boat's current heading in degrees.

  - id: target_heading
    kind: value
    value: 270
    description: Where the autopilot should steer.

  - id: error
    kind: formula
    expr: =((target_heading - heading + 540) % 360) - 180
    description: The signed angular error, in [-180, 180].

  - id: rudder
    kind: formula
    expr: =clamp(error * 0.5, -30, 30)
    description: The commanded rudder angle.

  - id: rudder_cmd
    kind: io
    port: rudder_actuator
    direction: out
    description: The actual rudder command sent to the actuator.
```

What this gives you:

```
┌──────────────────┬─────────┬─────────┐
│ ID               │ KIND    │ VALUE   │
├──────────────────┼─────────┼─────────┤
│ heading          │ sensor  │ 265     │
│ target_heading   │ value   │ 270     │
│ error            │ formula │ 5       │
│ rudder           │ formula │ 2.5     │
│ rudder_cmd       │ io      │ 2.5     │
└──────────────────┴─────────┴─────────┘
```

Change `target_heading` to `090` and watch the chain recompute. The boat's actual rudder is commanded to turn the boat toward 090. *That's it. That's the whole autopilot.*

---

## Use it with Claude Code

Add to your MCP config (`~/.config/claude-code/mcp.json` or similar):

```json
{
  "mcpServers": {
    "quilt": {
      "command": "npx",
      "args": ["@quilt/cli", "serve", "/path/to/your/sheet.yaml"]
    }
  }
}
```

Then in your conversation:

> *"What cells are in this sheet?"*
>
> *"Read the `rudder` cell."*
>
> *"Set `target_heading` to 045."*
>
> *"What cells depend on `heading`?"*

Claude calls the MCP tools directly. You see the cell values; you don't write code.

---

## The 5-layer abstraction

Quilt is built on 5 layers of "addressing as composition." Understanding them is the difference between using Quilt and *thinking* in Quilt.

```
Layer 0  ADDRESS           A stable id, not a coordinate. Not a URI. A name.
Layer 1  SPATIAL           row / column carry context. Position is policy.
Layer 2  REACTIVE          when an address changes, dependents re-evaluate.
Layer 3  BIDIRECTIONAL     same address is readable AND writable.
Layer 4  COMPOSING         writing an address IS binding to it.
```

The Rust port honors the same five layers. The data model is identical. Only the runtime differs.

---

## What's in the box

### Core runtime
- **`@quilt/core`** — the reactive cell engine. TypeScript, ESM, no native deps. ~1,500 lines, heavily commented.
- **`@quilt/cli`** — `init / run / serve --mcp / get / set / inspect / test`. The entry point.
- **`@quilt/mcp`** — exposes every cell as an MCP tool, every sheet as an MCP resource.
- **`@quilt/tui`** — terminal-native view of a running engine. Live cell grid, dependencies panel, key bindings. Plays well with tmux.

### Examples (10, all working end-to-end)

The original four:

- **[boat-autopilot](examples/boat-autopilot/)** — sensors, PID, voice intent, model router. The killer demo.
- **[agent-dashboard](examples/agent-dashboard/)** — tasks, status, shared human+agent workspace.
- **[model-router](examples/model-router/)** — caller-aware model selection.
- **[sensor-anomaly](examples/sensor-anomaly/)** — self-tuning anomaly detector.

Six new production-grade examples:

- **[weather-monitor](examples/weather-monitor/)** — three sensors → heat-index formula → listener alerts → caller-aware router.
- **[chat-router](examples/chat-router/)** — LLM routing by tier (premium/standard/free) and message length.
- **[ab-test-router](examples/ab-test-router/)** — deterministic A/B test using FNV-1a hash + bucket router.
- **[iot-dashboard](examples/iot-dashboard/)** — three thermometers → room status → building status, with alerts.
- **[rate-limiter](examples/rate-limiter/)** — token-bucket rate limiter with per-caller state.
- **[task-scheduler](examples/task-scheduler/)** — reactive task scheduler with overdue listener.

### Templates (3, copy-and-customize)
- **[predictive-maintenance](templates/predictive-maintenance.yaml)** — per-machine rows, sensor → model → alert
- **[npc-behavior](templates/npc-behavior.yaml)** — game NPC behavior
- **[edge-anomaly-detection](templates/edge-anomaly-detection.yaml)** — Raspberry Pi / industrial gateway

### Browser visuals (no build step)
- **[landing/index.html](landing/index.html)** — landing page with animated grid demo
- **[landing/simulator.html](landing/simulator.html)** — live side-by-side simulator (code + runtime + dependency graph)
- Both work offline. Just open them in a browser.

### Documentation
- **[Manifesto](docs/manifesto.md)** — the 10-point declaration
- **[Architecture](docs/architecture.md)** — engine internals
- **[Tutorial](tutorials/README.md)** — 5 chapters, about an hour
- **[Recipes](docs/recipes.md)** — 10 common patterns, copy-paste
- **[Comparison](docs/comparison.md)** — how Quilt differs from n8n, LangGraph, etc.
- **[Security](docs/security.md)** — the trust model, what to do in production

---

## The cell kinds, visually

```
                  ┌────────────┐
                  │  CellDef   │  ← a YAML object
                  │ id, kind,  │
                  │ kind-      │
                  │ specific   │
                  │ fields     │
                  └─────┬──────┘
                        │  load_sheet
                        ▼
                  ┌────────────┐
                  │   Cell     │  ← a runtime object
                  │ def, value,│
                  │ deps,      │
                  │ dependents │
                  └─────┬──────┘
                        │  set / push / call
                        ▼
              ┌────────────────────┐
              │   propagation      │
              │   - mark stale     │
              │   - fire listeners │
              │   - recompute      │
              │   - notify subs    │
              └─────────┬──────────┘
                        │
                        ▼
              ┌────────────────────┐
              │   CellValue {      │
              │     data, status,  │
              │     error,         │
              │     effects,       │
              │     computed_at    │
              │   }                │
              └────────────────────┘
```

Every `get` reads. Every `set` writes. Every `call` invokes. Every `push` is an inbound event. Every `subscribe` is a notification stream. The cell kind determines the *how*; the engine handles the *when*.

---

## Engineering notes (for the curious)

### Why a `Map` for cells, not a tree?

Quilt is intentionally **not** a tree of nodes. It's a flat `Map<CellId, Cell>` with explicit `dependencies` and `dependents` sets. Why?

- Cycles are allowed (a listener can watch the cell that triggers it; the engine just fires it again on the next change).
- Order doesn't matter — you can add a cell at any time.
- Debugging is trivial: every dependency is named, every dependent is named, you can `console.log` the cell.

Trees are great for hierarchies (DOM, AST, file system). Quilt is not a hierarchy.

### Why are formulas lazy, but listeners eager?

A formula is **lazy**: it recomputes the next time someone calls `get` on it. This is the right thing for a spreadsheet — millions of cells can exist, but only the ones the user looks at need to be evaluated.

A listener is **eager**: it fires the moment the watched cell changes. This is the right thing for an event handler — by definition, it needs to react.

### Why is the cell value an object, not a primitive?

A `CellValue` is `{ data, status, error, effects, computed_at }`. Why the wrapper?

- `status` lets the UI render stale/error/loading states without inspecting the data.
- `error` carries the error message separately from the data, so a UI can show both.
- `effects` records *what the cell did* (network call, storage read, etc.) for tracing, cost accounting, and decomposition.
- `computed_at` lets you show freshness: "this value is 3 seconds old."

This is what makes Quilt a **runtime**, not a data structure.

### Why does the TypeScript version use `new Function`?

Historical reasons: the engine was prototyped in JavaScript before Rust was a serious option. `new Function` gives you the full JavaScript language, including async/await, which is what `program` cells use.

The trade-off: `new Function` is not sandboxed by default. A malicious `program` cell can read the filesystem, make network calls, etc. The mitigation is documented in [docs/security.md](docs/security.md). The Rust port uses `rhai` which IS sandboxed by default — see [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust).

The TypeScript version is gaining a WASM-cell-sandbox as a v0.2 feature to close the gap.

---

## Cross-references

| Want to…                                                | Go to                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| **Use Quilt right now** (stable, TypeScript)            | This repo.                                                           |
| Try the **browser simulator** (live, no install)        | [landing/simulator.html](landing/simulator.html)                     |
| Read the **manifesto** (the 10-point declaration)       | [docs/manifesto.md](docs/manifesto.md)                               |
| Read the **architecture** deep-dive                      | [docs/architecture.md](docs/architecture.md)                         |
| Read about **security** and the trust model              | [docs/security.md](docs/security.md)                                 |
| Walk through the **5-chapter tutorial**                 | [tutorials/README.md](tutorials/README.md)                           |
| See **10 recipes** for common patterns                  | [docs/recipes.md](docs/recipes.md)                                   |
| Compare to **n8n, LangGraph, Observable, Excel**         | [docs/comparison.md](docs/comparison.md)                             |
| **Embed Quilt in Rust** (single binary, embedded)       | [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust) |
| **Get the same engine as a static binary** (alpha)      | [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust) |
| Use the **TUI** (terminal view, tmux-friendly)          | [packages/tui/](packages/tui/)                                       |
| **Report a bug**                                        | [issues](https://github.com/superinstance/quilt/issues)              |

---

## Project status

| Component        | Status          | Notes                                       |
| ---------------- | --------------- | ------------------------------------------- |
| `core` engine    | ✅ Stable        | 9/9 unit tests passing. ~1,500 lines.        |
| `mcp` server     | ✅ Stable        | 5 tools + 1 resource per sheet.              |
| `cli`            | ✅ Stable        | `init / run / serve / get / set / inspect / test`. |
| `tui`            | ✅ Stable        | Live cell grid, dependency overlay, key bindings. |
| Simulator        | ✅ Stable        | Browser, no build step.                      |
| Examples         | ✅ 4 working    | All four run end-to-end.                    |
| Templates        | ✅ 3 working    | Copy-and-customize.                          |
| Web UI           | 🚧 Planned       | v0.2 — WASM-compiled `quilt-core`.           |
| WASM sandbox     | 🚧 Planned       | v0.2 — close the JavaScript sandbox gap.     |
| **Rust port**    | ⚠️ Alpha        | 49 tests passing; same engine, same model.   |

---

## Why "Quilt"?

A quilt is a stitched composition of small fabric pieces into a working whole. Each piece is itself complete, but the quilt is more than the sum.

> The pieces are cells. The stitches are addresses. The whole is the runtime.

The name was chosen for an AI agent encountering it cold:
- **One syllable.** Easy to say, easy to type, easy to remember.
- **Universal metaphor.** Every culture has quilts.
- **CLI-friendly.** `quilt` is a 5-letter command. No flags, no conflicts.
- **No major tech collision.** No `quilt.com` baggage, no `loom.com` baggage, no `tessera` pretension.

Other names we considered and rejected: `loom` (loom.com video tool), `tessera` (3 syllables, Latin), `mosaic` (1990s browser), `cellar` (negative connotation), `atlas` (overused).

---

## Contributing

We welcome PRs that:
- Add a new cell evaluator
- Add an adapter (MQTT, Modbus, OpenAI, Anthropic, etc.)
- Improve the MCP tool list
- Add a Web UI
- Fix a security gap
- Port the Rust examples to TypeScript
- Improve the documentation

Open an issue first if you're planning something large.

---

## License

Apache 2.0.

---

> Use TypeScript when you want the *full experience* — browser, TUI, MCP, simulator, all the examples, all the docs. Use [Rust](https://github.com/superinstance/quilt-rust) when you need a *single binary* that ships anywhere. Both speak the same sheet format.
