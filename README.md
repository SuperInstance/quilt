# ◳ Quilt

<p align="center">
  <img src="assets/images/hero-grid.jpg" alt="The grid is the runtime — a sparse cybernetic quilt, every cell a live, addressable capability" width="720">
</p>

> **A spreadsheet where every cell is a live, addressable capability. The grid is the runtime.**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-native-purple)](https://modelcontextprotocol.io)
[![Rust port](https://img.shields.io/badge/Rust-1.0-blue)](https://github.com/superinstance/quilt-rust)
[![Status](https://img.shields.io/badge/status-v0.2.0-brightgreen)](https://github.com/superinstance/quilt)
[![Tests](https://img.shields.io/badge/tests-15%2F15-brightgreen)](https://github.com/superinstance/quilt)

**[Quilt Live ⚡](https://superinstance.github.io/quilt/landing/quilt-live.html)** · **[Studio 🎨](https://superinstance.github.io/quilt/landing/studio.html)** · **[Showcase 🌟](https://superinstance.github.io/quilt/landing/showcase.html)** · **[Docs 📚](https://superinstance.github.io/quilt/landing/docs.html)** · **[Tutorial 🎓](https://superinstance.github.io/quilt/landing/tutorial.html)** · **[Simulator](https://superinstance.github.io/quilt/landing/simulator.html)** · **[Manifesto →](docs/manifesto.md)** · **[Examples →](examples/)**

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

## What is this, really?

You already know spreadsheets — columns of numbers, formulas that snap
back to life when you change an input. Now keep the spreadsheet, but
make every cell a *living thing*. A cell isn't just a number in a box.
It can be a sensor reading, an API call, a program, a model, a light
switch, a listener, a policy. Give every cell a stable name, let cells
point at each other, and when one cell changes, everything downstream
rewires itself — automatically, instantly, visibly.

That's Quilt. A sheet is a YAML file, and that file is the whole
system: the data, the logic, the I/O, the routing, the alerting. No
build step, no services to deploy, no glue code to maintain. Run the
sheet and cells compute. Expose the sheet and every named cell becomes
a tool an agent can call. Edit the sheet and the running system
changes. The grid isn't a picture of the system. The grid *is* the
system.

**The mental leap, in two moves:**

- **A cell is not a value. A cell is a contract.** It's a stable
  address you can plug anything into. `compass.heading` doesn't hold
  "a number"; it holds *whatever the compass says right now*. Swap the
  implementation — real NMEA, a simulator, a test stub — and every cell
  that reads it keeps working. That's dependency injection, done by
  editing YAML.
- **A spreadsheet is not a document. A spreadsheet is a runtime.**
  When you change `target_heading` from `270` to `090`, you aren't
  editing a record of the boat; you're commanding it. Formulas
  recompute, listeners fire, actuators move. The file isn't the log of
  the system. The file is the nervous system.

### Why this matters

Every real system is a pile of event handlers, webhooks, cron jobs,
database rows, and config spread across half a dozen repos, stitched
together with glue code that no single person can hold in their head.
Quilt collapses that pile into one grid. Each integration point is one
named cell. Connections are references, not code. Changes propagate by
themselves. And the whole thing stays *auditable*: the dependency
graph is the architecture diagram, it's always current, and it's in a
format your whole team can read and diff. When something goes wrong
you don't grep five services — you open the sheet, find the red cell,
and see exactly which inputs changed.

For the agent era it matters differently. Every sheet is an MCP
server, so Claude Code, Cursor, or any MCP client reads cells as
resources and calls them as tools. Humans and agents share one grid:
the agent writes a cell, you see the write; you override a cell, the
agent sees the override on its next read. Caller-aware routing means
one sheet serves many tenants and tiers without forking. And the
jazz → classical flywheel — start with an LLM cell, watch the calls,
distill the common cases into a formula, watch the cost drop — becomes
a visible, editable process instead of a refactor buried in a
codebase. If you're wiring sensors, models, APIs, and agents into one
system, and you want it reactive, auditable, and agent-readable:
this is the substrate.

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
│       │  Web   │  ← /landing/quilt-live.html + simulator│
│       │  UI    │  ← browser-native, no build step        │
│       └────────┘                                          │
└──────────────────────────────────────────────────────────┘
```

The Rust port has the same shape — same 8 cell kinds, same engine, same CLI/MCP surfaces. The difference: `node` + JavaScript instead of `tokio` + `rhai`. See [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust).

---

## The one-liner

> A spreadsheet where every cell is a live API endpoint, and changing one cell rewires every dependent sensor, model, and agent.

---

## The mental model in 5 minutes

Five ideas, in order. Read them once and you'll think in cells.

### 1. A sheet is a list of cells

A sheet is YAML: an `id`, optional `axes` (what rows and columns
*mean*), and a `cells` list. Each cell is one entry. No build step, no
schema to register, no framework — a sheet is data that the engine
brings to life.

```yaml
id: hello
cells:
  - id: greeting
    kind: value
    value: "Hello, Quilt!"
```

### 2. Address, not coordinate

A cell is named, not numbered. `A1` tells you nothing; `compass.heading`
tells you everything. Ids are dot-namespaced (`fleet.boat1.rudder`),
stable across reordering, and the thing other cells reference. A
formula names its inputs explicitly — rename a cell and its dependents
break loudly, which is the point: dependencies are visible, not
implicit.

```yaml
cells:
  - id: hello
    kind: value
    value: "Hello"

  - id: greeting
    kind: formula
    expr: "=hello + ', world!'"
```

### 3. Reactivity: change one cell, everything downstream rewires

Pure cells — `value` and `formula` — recompute on demand, the same
lazy way Excel does: a change marks dependents *stale*, and the next
read of a dependent recomputes it. Effectful cells — `api`, `program`,
`router` — run when called and cache their result per caller context.
Listeners are the eager ones: the moment a watched cell changes, they
fire. Same spreadsheet, extended to async and side effects.

```yaml
  - id: temp
    kind: value
    value: 21

  - id: feels_like
    kind: formula
    expr: "=temp * 9 / 5 + 32"
```

### 4. Caller-awareness: a cell can route on who's asking

Every call carries context — `row`, `column`, `identity`, `trace`. A
router cell evaluates rules against that context and delegates. The
same address can return a different value to a premium caller than to
a free one, to row 5 than to row 50. This is the primitive nobody else
has: position is policy.

```yaml
  - id: pick
    kind: router
    rules:
      - when: 'caller.row > 10'
        route: { cell: fast }
      - when: 'true'
        route: { cell: precise }
```

### 5. Bidirectional IO: the same address reads and writes

A `sensor` streams values in — an adapter pushes readings. An `io`
cell is a port: a webhook, a GPIO pin, an actuator — it can receive
*and* send. The address doesn't care which side you're on: read it and
you get the latest state; write it and the grid reacts.

```yaml
  - id: rudder
    kind: io
    direction: out
    port: actuator:rudder
```

### 6. Composition: writing an address IS binding to it

Any cell can reference any other cell. That's the whole composition
story — you don't import modules, you point at addresses. A formula
that reads `sensor.temp` is bound to that sensor; a listener that
watches `is_dark` is bound to that decision; a router that delegates
to `models.precise` is bound to that model. Change the target cell and
every binding follows. This is the five-layer abstraction — and it's
why the grid composes the way a real system should: by name, not by
nesting.

---

## ⚡ Try it now

**No install. No clone. Just open it.**

### Two flavors

| What | Try it | Best for |
| --- | --- | --- |
| **Quilt Live** | [→ Open the page](https://superinstance.github.io/quilt/landing/quilt-live.html) | Full reactive data OS in your browser. Click-to-try grid, save state as a cookie or downloadable .html. **One file, the whole app.** |
| **Live simulator** | [→ Open the page](https://superinstance.github.io/quilt/landing/simulator.html) | Side-by-side code editor + runtime view + dependency graph. Edit a YAML sheet, see the cells update in real time. |

Both run entirely in the browser. No build, no install, no server.

> Want a local copy? You can also **download `quilt-live.html` as a single file** and run it offline. The button is right there in the app's top bar.

### What is Quilt Live?

A portable, reactive data OS in one HTML file. **~70 KB, zero dependencies.** Every cell in the grid is a live, addressable capability. Open the link above, change a value, watch the formulas recompute. Save the state as a cookie, or download the whole app with your state baked in. The downloaded file *IS* the app — open it on any device, even offline, and your work is right there.

[→ Open Quilt Live](https://superinstance.github.io/quilt/landing/quilt-live.html) · [Source on GitHub](https://github.com/SuperInstance/quilt-live) · [See the 54 examples](https://github.com/SuperInstance/quilt-live/tree/main/examples)

### Where is this going?

Read the **[5-year roadmap](quilt-roadmap-2026.md)** for the bigger picture — Quilt on ESP32, mesh networking, agents as sheets, the personal data mesh. We have sketches for [`quilt-esp32`](https://github.com/SuperInstance/quilt-esp32) (microcontroller runtime), [`quilt-mesh`](https://github.com/SuperInstance/quilt-mesh) (peer-to-peer sync), and [`quilt-agent`](https://github.com/SuperInstance/quilt-agent) (LLM agents as sheets).

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

<p align="center">
  <img src="assets/images/cell-types.jpg" alt="Many different kinds of cells living in one grid — values, formulas, programs, models" width="640"><br>
  <em>A sheet can hold many different kinds of cells at once — each one a
  different kind of capability, all addressable from the grid.</em>
</p>

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

## Your first sheet, step by step

Let's build something real from nothing: **a light that turns on when
a sensor reading crosses a threshold.** A twilight lamp for a room —
the kind of thing you'd put on a Raspberry Pi, except the whole
controller is a YAML file.

> The commands below use `quilt`, the repo's CLI binary (available
after `npm install && npm run build` — see [Quick start](#quick-start-5-minutes)).

### Step 1 — scaffold

```sh
quilt init room-light
# ✓ Scaffolded room-light.quilt.yaml
```

This creates `room-light.quilt.yaml` with a starter sheet: a value,
a formula, and a pure computation. We're replacing the cells with our
own.

### Step 2 — write the sheet

Open `room-light.quilt.yaml` and give it these five cells:

```yaml
id: room-light
title: "Twilight Light"
description: "A light that turns on when the room gets dark"
version: 0.1.0

cells:
  - id: ambient.light
    kind: sensor
    source: simulated
    rate: 1000
    default: 400
    unit: lux
    description: "Current ambient light level"

  - id: threshold
    kind: value
    value: 200
    unit: lux
    description: "Below this, the room counts as dark"

  - id: is_dark
    kind: formula
    expr: "=ambient.light < threshold"
    description: "True when it's dark enough to need the light"

  - id: light.state
    kind: formula
    expr: "=is_dark ? 'ON' : 'OFF'"
    description: "The light's command state, derived from darkness"

  - id: light.actuator
    kind: io
    direction: out
    port: gpio:relay1
    description: "The physical relay the light is wired to"
```

Walk through it, cell by cell:

- **`ambient.light`** — a `sensor`: input from the outside world.
  `source: simulated` means no real hardware; `default: 400` gives it
  a starting reading so the sheet works out of the box. In production
  the source would be something like `i2c:/dev/i2c-1` or
  `mqtt://broker/topic`, and an adapter would push readings into the
  cell.
- **`threshold`** — a `value`: a configuration knob. Change this one
  number and the light's behavior changes, with zero logic edits.
- **`is_dark`** — a `formula`: the decision. `=ambient.light <
  threshold` references two cells by id. The engine auto-detects the
  dependency edges by scanning the expression — you never declare
  them.
- **`light.state`** — a `formula` that turns the boolean into a
  command string. Note the ternary: formulas are JavaScript
  expressions, with `abs`, `min`, `max`, and `clamp` available.
- **`light.actuator`** — an `io` cell, `direction: out`: the port the
  relay is wired to. In a real deployment a harness binds this port to
  a GPIO pin. Here it's the visible output slot of the system.

### Step 3 — inspect the graph

```sh
quilt inspect room-light.quilt.yaml
```

```
──────────────────────────────────────────────────────────────────────
Sheet: room-light
Cells: 5
──────────────────────────────────────────────────────────────────────

[sensor] (1)
  ambient.light — Current ambient light level

[value] (1)
  threshold — Below this, the room counts as dark

[formula] (2)
  is_dark ← ambient.light, threshold — True when it's dark enough to need the light
  light.state ← is_dark — The light's command state, derived from darkness

[io] (1)
  light.actuator — The physical relay the light is wired to
```

The `←` arrows are the dependency edges the engine found. You can see
the whole system at a glance — this *is* the architecture diagram.

### Step 4 — run it

```sh
quilt run room-light.quilt.yaml
```

```
▶ Running sheet: room-light (Twilight Light)
  5 cells loaded.

  ◉ ambient.light                  [sensor  ] ✓ 400
  ○ threshold                      [value   ] ✓ 200
  ƒ is_dark                        [formula ] ✓ false
  ƒ light.state                    [formula ] ✓ "OFF"
  ⇆ light.actuator                 [io      ] … ∅
```

400 lux of daylight, threshold 200: not dark, light OFF. The glyphs
are the cell kinds — `◉` sensor, `○` value, `ƒ` formula, `⇆` io.

### Step 5 — make it dark

Two honest ways to see the reactivity, depending on whether you want
to edit or to watch.

**The edit way** — the sheet is the source of truth. Change
`default: 400` to `default: 120`, save, and run again:

```
  ◉ ambient.light                  [sensor  ] ✓ 120
  ƒ is_dark                        [formula ] ✓ true
  ƒ light.state                    [formula ] ✓ "ON"
```

The room got dark, so the light turned on. You changed one number in
a file and the system recomputed.

**The live way** — a running engine reacts to pushes. Ten lines of
Node, using the same library the CLI uses:

```js
import { readFile } from 'node:fs/promises';
import { QuiltEngine, parseSheet } from '@quilt/core';

const sheet = parseSheet(await readFile('room-light.quilt.yaml', 'utf8'));
const engine = new QuiltEngine(sheet.id);
engine.loadSheet(sheet);

console.log('daylight:', (await engine.get('light.state')).data);   // OFF
await engine.push('ambient.light', 120);                            // the room goes dark
console.log('is_dark:', (await engine.get('is_dark')).data);        // true
console.log('light.state:', (await engine.get('light.state')).data);// ON
await engine.push('ambient.light', 500);                            // morning
console.log('light.state:', (await engine.get('light.state')).data);// OFF
```

```
daylight: OFF
is_dark: true
light.state: ON
light.state: OFF
```

`engine.push` feeds the sensor — that's exactly what a real adapter
does (MQTT subscription, GPIO interrupt, webhook). The formula chain
recomputes on the next read. No events, no callbacks, no wiring — just
cells.

> **Why not `quilt set`?** `quilt set room-light.quilt.yaml
> ambient.light 100` works, but each CLI invocation is its own
> session: it loads the YAML, sets the value in memory, prints `✓ set
> ambient.light = 100`, and exits. The YAML file is unchanged, and the
> next command starts from the file again. `set` is for scripting and
> agents; persistence is the file, liveness is your harness, the TUI,
> the simulator, or a `serve` session.

### Step 6 — make it *do* something

A formula that flips a string is nice; a system that acts is better.
Add a listener and a program cell:

```yaml
  - id: log.switch
    kind: listener
    watch: [is_dark]
    action: log.event
    description: "Fires whenever darkness changes"

  - id: log.event
    kind: program
    code: |
      const dark = (await runtime.get('is_dark')).data;
      return { event: dark ? 'lights-on' : 'lights-off', at: Date.now() };
```

The listener is *eager*: the instant `is_dark` changes, it calls
`log.event`, which runs arbitrary async JavaScript — log to a file,
POST a webhook, flash an LED. The program cell gets three handles:
`input`, `caller` (the context), and `runtime` — with
`runtime.get` / `runtime.set` / `runtime.call` it can read, write, and
invoke any other cell. That's the "anything" escape hatch; use it
sparingly and prefer formulas for pure math.

### Step 7 — hand it to an agent

```sh
quilt serve room-light.quilt.yaml --mcp
# [quilt] serving sheet 'room-light' as MCP server on stdio
```

Point Claude Code or Cursor at it (config in the next section) and the
agent can read `cell__is_dark`, ask what's in the sheet, and call
`cell__log_event` to trigger the program. Your light just got an API —
and the API is the whole grid.

---

## CLI command reference

`quilt` is deliberately small — the power lives in the runtime and the
embedding surfaces. This is the entire command surface:

| Command | What it does |
| --- | --- |
| `quilt init [name]` | Scaffold `<name>.quilt.yaml` (default `my-quilt-sheet`) with a starter sheet |
| `quilt run <sheet>` | Load the sheet, evaluate every cell once, print id / kind / status / value |
| `quilt serve <sheet>` | One-shot serve: load and print the sheet's current state |
| `quilt serve <sheet> --mcp` | Serve the sheet as an **MCP server on stdio** — every cell becomes a tool |
| `quilt get <sheet> <cell>` | Print a cell's `CellValue` as JSON |
| `quilt set <sheet> <cell> <value>` | Set a cell's value in a fresh session and print confirmation (does not persist) |
| `quilt test <sheet>` | Evaluate every cell; print `✓`/`✗` per cell; exit `1` if anything failed |
| `quilt inspect <sheet>` | Show the sheet grouped by kind, with dependency arrows and descriptions |
| `quilt help` / `-h` / `--help` | Print usage |

Details worth knowing:

- **`set` value parsing** — the value is parsed as JSON first, and
  falls back to a plain string: `quilt set s.yaml x 42` sets the
  number `42`, `quilt set s.yaml x '"42"'` sets the string `"42"`,
  `quilt set s.yaml x '{"a":1}'` sets an object. Bare words become
  strings.
- **`run` glyphs** — the kind symbols: `○` value, `ƒ` formula,
  `↗` api, `⚙` program, `◉` sensor, `⚡` listener, `⇄` router,
  `⇆` io. Status marks: `✓` ready, `✗` error, `…` idle/pending, `∅`
  no value.
- **Stateless by design** — every invocation loads the YAML fresh.
  `run`, `inspect`, and `test` are read-only; `set` mutates a
  throwaway session. Long-lived state belongs to a harness, the TUI,
  the simulator, or an MCP `serve` session.
- **Exit codes** — usage errors exit `1`; `test` exits `1` if any
  cell failed; everything else exits `0`.

---

## Use it with Claude Code

Add to your MCP config (`~/.config/claude-code/mcp.json` or similar):

```json
{
  "mcpServers": {
    "quilt": {
      "command": "npx",
      "args": ["@quilt/cli", "serve", "/path/to/your/sheet.yaml", "--mcp"]
    }
  }
}
```

The `--mcp` flag is what puts the sheet on stdio. Without it, `serve`
prints a one-shot view and exits — an MCP client would see nothing.

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

## How to use it, deep dives

### MCP: the sheet as an agent's workspace

The mapping is direct — there is no translation layer:

- **Every named cell → one MCP tool**, named `cell__<id>` with dots
  sanitized to underscores (`compass.heading` → `cell__compass_heading`).
  The tool accepts `input` (passed to the cell), plus `row` and
  `column` (caller context for routing).
- **The whole sheet → an MCP resource** at `quilt://<sheet>/sheet`,
  plus one resource per cell at `quilt://<sheet>/cell/<id>`.

> In a repo clone, substitute `npx @quilt/cli` with the built `quilt`
> binary (the npm packages aren't published yet) — e.g.
> `"command": "/path/to/quilt/node_modules/.bin/quilt"`.

**Claude Code** — either add it with the CLI:

```sh
claude mcp add quilt -- npx @quilt/cli serve /path/to/your/sheet.yaml --mcp
```

or by editing `~/.config/claude-code/mcp.json` (the config in the
section above — don't forget `--mcp`).

**Cursor** — project-level config in `.cursor/mcp.json` (or
`~/.cursor/mcp.json` for all projects):

```json
{
  "mcpServers": {
    "quilt": {
      "command": "npx",
      "args": ["@quilt/cli", "serve", "/path/to/your/sheet.yaml", "--mcp"]
    }
  }
}
```

**A worked flow** — with the boat sheet served, an agent can:

> "What cells are in this sheet?" — reads the
> `quilt://boat-autopilot/sheet` resource.
>
> "Call `cell__heading_error` for boat-2." — invokes the formula with
> `row: "boat-2"`.
>
> "What's the current rudder command?" — calls `cell__rudder_command`.

One honest caveat: the current toolset is **call-based**. Calling a
`value` or `formula` cell returns its current value; calling an
effectful cell invokes it with your `input`. There's no set/push tool
yet, so agents can read and invoke, but writes flow through your
harness — or through a `program` cell that calls `runtime.set`.

### As a library: embed the engine

`@quilt/core` is a plain ESM library — no native deps, TypeScript,
~1,500 commented lines. It's the same engine the CLI, MCP, and TUI
all sit on. Embed it in a Node service, a web server, an agent
runtime, or a test suite.

```sh
npm install @quilt/core
```

The engine API, in one breath:

| Method | Signature | Notes |
| --- | --- | --- |
| `loadSheet` | `(sheet: SheetDef) => void` | Loads a parsed sheet; resets engine state and rebuilds the graph |
| `defineCell` | `(def: CellDef) => Cell` | Add one cell; throws on duplicate id |
| `register` | `(def: CellDef) => Cell` | Dynamic registration (agents defining cells at runtime); adds declared deps |
| `get` | `(id, ctx?) => Promise<CellValue>` | Pull a value, computing if needed; never throws — errors come back as `status: 'error'` |
| `set` | `(id, value, ctx?) => Promise<void>` | Write a value and propagate; throws on unknown cell |
| `call` | `(id, input?, ctx?) => Promise<CellValue>` | Invoke a cell as a capability; behaves as `get` for pure cells |
| `push` | `(id, data, ctx?) => Promise<void>` | Feed a sensor/io cell from an adapter; throws for other kinds |
| `subscribe` | `(id, cb(value, prev), filter?) => string` | Watch one cell; returns a subscription id |
| `unsubscribe` | `(subId) => void` | Stop watching |
| `getCell` | `(id) => Cell \| undefined` | Raw cell — read `.dependencies` and `.dependents` |
| `listCells` | `(kind?) => Cell[]` | All cells, optionally filtered by kind |
| `getTraces` | `(limit = 100) => EvaluationTrace[]` | Recent evaluations (debugging, cost accounting) |
| `exportDefs` | `() => CellDef[]` | Serialize runtime state back to definitions |

Plus the parser and context helpers: `parseSheet(yaml)`,
`validateSheet(raw)`, `serializeSheet(sheet)`, `emptyContext()`,
`extendContext(parent, childId, extra?)`, `contextKey(ctx)`, and
`evalWhen(when, ctx)`.

The boat demo (`examples/boat-autopilot/demo.ts`) is built from exactly
this pattern — load, push, read, per-boat context:

```js
import { readFile } from 'node:fs/promises';
import { QuiltEngine, parseSheet } from '@quilt/core';

const sheet = parseSheet(await readFile('examples/boat-autopilot/sheet.yaml', 'utf8'));
const engine = new QuiltEngine(sheet.id);
engine.loadSheet(sheet);

// Two boats, one sheet, caller-aware rows:
for (const boat of [{ id: 'boat-1', heading: 180 }, { id: 'boat-2', heading: 175 }]) {
  await engine.push('compass.heading', boat.heading);
  const err = await engine.get('heading.error', { row: boat.id });
  console.log(boat.id, err.data);  // the signed error for that boat
}

// Watch a cell forever:
const sub = engine.subscribe('compass.heading', (v, prev) => {
  console.log('heading:', prev.data, '→', v.data);
});
```

**Caller context** is just an object — pass `row`, `column`,
`identity`, or `metadata` to any call, and every cell downstream sees
it:

```js
const ctx = {
  row: 'boat-1',
  identity: { id: 'user-1', type: 'human', tags: ['premium'] },
};
const v = await engine.call('model.router', input, ctx);
```

### The TUI: the power-tool view

`@quilt/tui` is a keyboard-driven terminal view of a running engine —
live cell grid, dependencies and dependents panels for the selected
cell, no full-screen takeover, plays well with tmux.

```sh
npx quilt-tui room-light.quilt.yaml
```

| Key | Action |
| --- | --- |
| `j` / `k` / arrows | Move selection |
| `g` / `G` | Jump to top / bottom |
| `s` | Set the selected cell to a new value (JSON or bare string) |
| `e` | Edit (read-only in MVP — use `s`) |
| `:` | Command mode — `reload`, `help`, `quit` |
| `r` | Reload cell values from the engine |
| `q` / `Ctrl-C` | Quit |

A worked flow: open the boat sheet, `k` down to `desired.heading`,
press `s`, type `090`, Enter — the engine `set`s the cell and
propagates; press `r` to refresh the grid and watch `heading.error`
flip sign. In `s` mode, `42` is a number, `"42"` is a string, and
`{"a":1}` is an object.

### The browser simulator: no install, no build

[`landing/simulator.html`](landing/simulator.html) is a self-contained
simulator — open it in any browser, even offline. Left pane: the sheet
source. Right pane: the live runtime. Below: the dependency graph.
Pick a preset (Boat Autopilot, Model Router, Anomaly Detector, Agent
Dashboard), edit the YAML, hit **Apply**, and watch cells recompute in
real time. For the full single-file experience, try
[Quilt Live](https://superinstance.github.io/quilt/landing/quilt-live.html)
(`landing/quilt-live.html` in this repo) — the same reactive grid as a
portable, save-your-state app. [`landing/index.html`](landing/index.html)
is the landing page with the animated grid demo;
[`landing/tutorial.html`](landing/tutorial.html) is the interactive
tutorial. None of them need a build step.

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
- **[landing/quilt-live.html](landing/quilt-live.html)** — the Quilt Live single-file reactive data OS ([live page](https://superinstance.github.io/quilt/landing/quilt-live.html))
- **[landing/simulator.html](landing/simulator.html)** — live side-by-side simulator (code + runtime + dependency graph) ([live page](https://superinstance.github.io/quilt/landing/simulator.html))
- All work offline. Just open them in a browser.

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

## Troubleshooting & FAQ

### "My formula isn't recomputing."

Formulas are *lazy*. When an input changes, the engine marks the
dependent `stale` but doesn't compute it until someone reads it —
exactly like Excel. If you see `"status": "stale"`, that's the engine
telling you "this needs a recompute," and the very next `get` performs
it. If the dependent is an `api`/`program`/`router` cell, it's
different: effectful cells are **never** auto-recomputed by upstream
changes — they run when called. Call it (with a fresh context) and it
will evaluate.

### "My program/api cell keeps returning the same value."

That's per-context memoization, working as designed. Effectful cells
cache their result keyed by the caller context (`row`, `column`,
`identity.id`, `identity.tags`). Same context → same cached value,
even if upstream cells changed. Force a fresh evaluation by changing
the context (a different `row`, or an `identity` tag) or by `set`ting
the cell itself. This is also why the same cell can serve many callers
at once — each gets its own cached answer.

### "My subscription callback saw the old value."

`push`/`set` notify subscribers *before* propagation marks dependents
stale, so inside a callback the downstream cells may still hold their
previous values. After `await engine.push(...)` returns, propagation
is complete and everything is fresh. If you must read dependents
inside a callback, wait a tick
(`await new Promise(r => setImmediate(r))`).

### "Can I have cycles?"

Yes — the graph is a flat `Map<CellId, Cell>` with explicit dependency
sets, not a tree, and feedback loops are allowed: a listener can watch
the very cell it triggers and will simply fire again on the next
change. Keep *pure* chains (formulas) acyclic — a formula cycle has
no convergent answer. Effectful feedback (sensor → formula → listener
→ actuator → sensor) is the intended pattern.

### "Is it sandboxed?"

Not by default — and this is the one to read carefully.
[`docs/security.md`](docs/security.md) is the full trust model. The
short version: formulas compile via `new Function`, program cells via
`new AsyncFunction`; they run in the host process with the full
JavaScript language and are **not** a security boundary. Trust the
author of the sheet — the author defines what cells call, what they
connect to, what code they run. Treat anything *calling into* the
sheet as untrusted input. For production: run the engine in a
container or worker, use `worker_threads` or `isolated-vm`, whitelist
endpoints, keep secrets in env vars. The Rust port uses `rhai`, which
is sandboxed by default; a WASM sandbox for the TS port is planned
for v0.2.

### "Cells are async — what happens when two calls race?"

`api` and `program` cells are asynchronous. The engine de-dupes
concurrent calls to the same effectful cell: while one evaluation is
in flight, a second call awaits the same promise (the `inflight` map
in `engine.ts`). A cell mid-evaluation reports `status: 'computing'`.
Results are cached per context after completion.

### "How do I see what depends on X?"

Three answers, all real:

- `quilt inspect sheet.yaml` — shows every cell's dependencies as
  `id ← a, b, c`.
- The engine API: `engine.getCell('heading').dependents` — the
  reverse index, exactly the cells that would rewire if `heading`
  changed.
- The TUI: select a cell and read its dependencies/dependents panels.

### "Why is my sensor cell empty — and why didn't `quilt set` stick?"

Two separate things, both common:

- **Sensors are push-only.** `get` on a sensor returns the last
  *pushed* value (or `default`, if set) — nothing polls, ever. If no
  adapter has pushed and there's no `default`, you get `∅`. Feed it
  with `engine.push` (`quilt set` works as a manual stand-in in a
  pinch).
- **The CLI is stateless.** Each `quilt` command loads the YAML fresh;
  `set` mutates a throwaway session and exits. The file is the source
  of truth. Long-lived reactivity lives in a harness, the TUI, the
  simulator, or `quilt serve --mcp`.

---

## Glossary

### The 8 cell kinds

| Kind | What it is | When to use it |
| --- | --- | --- |
| `value` | Static data. No dependencies. | Constants, config, state you change rarely. The leaves of the graph. |
| `formula` | Pure reactive expression, lazily recomputed on change. | Anything derivable from other cells. Prefer this for all math. |
| `api` | HTTP endpoint (or `model:` / `mcp://` pseudo-endpoint), fetched on call. | External data or model calls that should run when invoked, not on a schedule. |
| `program` | Inline async JavaScript. | Logic beyond expressions: orchestration, branching, `runtime.get` / `set` / `call` chains. Use sparingly. |
| `sensor` | Push-only inbound stream; adapter writes, formulas read. | Anything that arrives on its own timing — MQTT, GPIO, serial, webhooks. |
| `io` | Bidirectional port: receives and sends. | Webhooks, actuators, hardware pins — the address that faces the world. |
| `listener` | Eager trigger that fires when a watched cell changes. | "If X happens, do Y" — alerts, escalations, actions. |
| `router` | Caller-aware policy; delegates to a target based on context. | Serving many tenants / tiers / models behind one address. |

### Core terms

- **Address** — a cell's stable, dot-namespaced id
  (`fleet.boat1.rudder`). Not a coordinate. Survives reordering and
  refactors.
- **Caller** — whoever triggered an evaluation: a human, an agent, a
  sensor, another cell. The caller's context travels with the call.
- **Propagation** — the engine's walk from a changed cell to its
  dependents: mark stale, fire listeners, notify subscribers.
- **CellValue** — what a cell holds: `{ data, status, error,
  computedAt, effects }`. The value knows its own freshness.
- **Adapter** — external code that drives a sensor or io cell:
  `engine.push(id, reading)` on its own event loop.
- **Dependency / dependent** — the two sides of an edge: `is_dark`
  *depends on* `ambient.light`; `ambient.light`'s *dependents*
  include `is_dark`. Both sets are explicit and inspectable.
- **Sheet** — a YAML file: id, axes, cells. The executable artifact.
- **Context** — row, column, identity, trace, metadata, timestamp —
  everything a call knows about where it came from.
- **Effect** — a declared side effect a cell performed (network,
  storage, io, model, compute) — the audit trail on every CellValue.
- **Status** — `idle` / `computing` / `ready` / `error` / `stale`:
  what the cell knows about its own value.

---

## Cross-references

| Want to…                                                | Go to                                                                |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| **Use Quilt right now** (stable, TypeScript)            | This repo.                                                           |
| Try the **browser simulator** (live, no install)        | [superinstance.github.io/quilt/landing/simulator.html](https://superinstance.github.io/quilt/landing/simulator.html) |
| Try **Quilt Live** (full reactive OS, single file)     | [superinstance.github.io/quilt/landing/quilt-live.html](https://superinstance.github.io/quilt/landing/quilt-live.html) |
| Read the **manifesto** (the 10-point declaration)       | [docs/manifesto.md](docs/manifesto.md)                               |
| Read the **architecture** deep-dive                      | [docs/architecture.md](docs/architecture.md)                         |
| Read about **security** and the trust model              | [docs/security.md](docs/security.md)                                 |
| Walk through the **5-chapter tutorial**                 | [tutorials/README.md](tutorials/README.md)                           |
| See **10 recipes** for common patterns                  | [docs/recipes.md](docs/recipes.md)                                   |
| Compare to **n8n, LangGraph, Observable, Excel**         | [docs/comparison.md](docs/comparison.md)                             |
| **Embed Quilt in Rust** (single binary, embedded)       | [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust) |
| **Get the same engine as a static binary** (alpha)      | [superinstance/quilt-rust](https://github.com/superinstance/quilt-rust) |
| Use the **TUI** (terminal view, tmux-friendly)          | [packages/tui/](packages/tui/)                                       |
| **Try Quilt in a single HTML file** (no install, portable) | **[superinstance/quilt-live](https://github.com/superinstance/quilt-live)** — open one file, save state as cookie or downloadable .html |
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
