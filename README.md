# ◳ Quilt

**A spreadsheet where every cell is a live, addressable capability. The grid is the runtime.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/superinstance/quilt/blob/main/LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-native-purple)](https://modelcontextprotocol.io)
[![Rust port](https://img.shields.io/badge/Rust-port-orange)](https://github.com/superinstance/quilt-rust)

[Live simulator ⚡](landing/simulator.html) · [Read the manifesto →](docs/manifesto.md) · [Tutorial →](tutorials/README.md) · [Examples →](examples/) · [Architecture →](docs/architecture.md)

---

## What it is

Quilt is a reactive, typed, cellular runtime. The spreadsheet is the control plane. The cell is the universal IO primitive.

- A cell can be a value, formula, API, model, sensor, actuator, listener, or router.
- A cell reference is a stable address, not a coordinate.
- A cell can route based on who called it (`caller.row > 10` → use Model A).
- The whole sheet is an MCP server. Every named cell is an MCP tool.
- It's reactive by default. Change one cell, every dependent rewires.

> The paradigm shift, in one line: **A cell is not a value. A cell is a live, typed, addressable capability. The spreadsheet is not a document. The spreadsheet is the runtime.**

## The one-liner

> A spreadsheet where every cell is a live API endpoint, and changing one cell rewires every dependent sensor, model, and agent.

---

## ⚡ Try the live simulator

Open [`landing/simulator.html`](landing/simulator.html) in your browser. Edit a sheet on the left, watch the runtime update on the right, see the dependency graph below. No build, no install. Four presets: boat autopilot, model router, anomaly detector, agent dashboard.

> Or open the [landing page](landing/index.html) for the full tour.

---

## The paradigm

| Old mental model | New mental model |
|---|---|
| Cell = value | Cell = capability |
| Formula = math | Formula = program call |
| Sheet = document | Sheet = runtime |
| Row/column = labels | Row/column = policy |
| Reference = pointer | Reference = dependency injection |
| Spreadsheet = calculator | Spreadsheet = control plane |

This isn't "Excel with AI." This is a new computational surface. A reactive, typed, embeddable runtime where addressing is composition.

---

## Install

```bash
npm install -g @quilt/cli
```

Requires Node.js 18+.

## Quick start (5 minutes)

```bash
# Scaffold a starter sheet
$ quilt init my-sheet
✓ Scaffolded my-sheet.cellflow.yaml

# Run it
$ quilt run my-sheet.cellflow.yaml
▶ Running sheet: my-sheet (My new Quilt sheet)
  3 cells loaded.

  ○ hello                          [value   ] ✓ "Hello, Quilt!"
  ƒ greeting                       [formula ] ✓ "Hello, Quilt! Welcome to the grid."
  ƒ doubled                        [formula ] ✓ 6
```

## Try a real example

```bash
# The boat autopilot — sensors, PID, model router
$ quilt run examples/boat-autopilot/sheet.yaml

# The model router — caller-aware routing
$ quilt run examples/model-router/sheet.yaml

# The agent dashboard — shared workspace for human + agent
$ quilt serve examples/agent-dashboard/sheet.yaml --mcp
```

## Use it with Claude Code

```bash
# Expose a sheet as an MCP server
$ quilt serve my-sheet.cellflow.yaml --mcp
```

Add to your Claude Code config:

```json
{
  "mcpServers": {
    "quilt": {
      "command": "quilt",
      "args": ["serve", "my-sheet.cellflow.yaml", "--mcp"]
    }
  }
}
```

Now every named cell is a tool Claude Code can use. The sheet is shared working memory.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────┐
│                  Quilt Engine                                │
│                                                              │
│  Cells: value · formula · api · program · sensor ·          │
│         listener · router · io                              │
│                                                              │
│  Reactive dependency graph (auto-tracked)                   │
│  Caller context propagation (row, column, identity, trace)  │
│  Per-context memoization (caller-aware caching)            │
│  Subscription system (UI, listeners, MCP)                   │
│                                                              │
│  YAML/JSON sheet format (git-friendly, diffable)            │
└─────────────────────────────────────────────────────────────┘
              ▲                              ▲
              │                              │
    ┌─────────┴────────┐            ┌────────┴────────┐
    │  TUI / Web UI    │            │  MCP Server     │
    │  (humans watch)  │            │  (agents call)  │
    └──────────────────┘            └─────────────────┘
```

Read the [architecture doc](docs/architecture.md) for the full picture.

---

## What's in the box

### Core runtime
- **`@quilt/core`** — the reactive cell engine. TypeScript, ESM, no native deps. ~1,500 lines, heavily commented.
- **`@quilt/cli`** — `init / run / serve --mcp / get / set / inspect / test`. The entry point.
- **`@quilt/mcp`** — exposes every cell as an MCP tool, every sheet as an MCP resource.

### Examples (4, all working)
- **[boat-autopilot](examples/boat-autopilot/)** — sensors, PID, voice intent, model router. The killer demo.
- **[agent-dashboard](examples/agent-dashboard/)** — tasks, status, shared human+agent workspace.
- **[model-router](examples/model-router/)** — caller-aware model selection.
- **[sensor-anomaly](examples/sensor-anomaly/)** — self-tuning anomaly detector.

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

### Companion repos
- **[quilt-rust](https://github.com/superinstance/quilt-rust)** — Rust port (in progress)

---

## The cell kinds

| Kind | Trigger | Pure? | Async? | What it's for |
|------|---------|-------|--------|---------------|
| `value` | never | yes | no | Static data, config |
| `formula` | pull (dep changed) | yes | no | Reactive computation |
| `api` | call | no | yes | External endpoint, LLM call |
| `program` | call | no | yes | Stateful, side-effectful logic |
| `sensor` | push (external) | no | no | MQTT, Modbus, GPIO, etc. |
| `listener` | dep change | no | yes | "if X happens, do Y" |
| `router` | call | no | yes | Caller-aware policy |
| `io` | push | no | no | Bidirectional port (form, MCP, GPIO) |

---

## Project status

**v0.1.0** — the substrate is live. The engine works, the MCP server works, the CLI works, four examples work, three templates work, the simulator works, the docs are written.

What's not done yet:
- WASM sandbox for program cells (security)
- Capability-based permissions (security)
- HTTP-transport MCP with auth
- Cross-sheet references
- Time-windowed cells (as a first-class axis)
- Rust port (in progress in a sibling repo)
- Web UI (a real spreadsheet grid)
- TUI (terminal-native experience)
- More adapters (MQTT, Modbus, OPC-UA, OpenAI, Anthropic, Ollama)

Open an issue if you want to tackle any of these.

---

## Why "Quilt"?

A quilt is a whole made of small pieces. Each piece is mundane. The whole is art. That's what Quilt does — mundane cells compose into a working runtime.

One syllable. Universal craft. Won't date. Pronounceable in any language. CLI-friendly.

> A bed cover is the primary meaning of "quilt." A cellular runtime is not. After 30 seconds with the simulator, nobody thinks "bed cover."

---

## License

Apache 2.0. Use it however you want.

## Contributing

Open an issue, send a PR, write a tutorial, build a template, share a killer demo. We read everything.

The grid is the runtime. The cell is the contract. The patch panel for the world.
