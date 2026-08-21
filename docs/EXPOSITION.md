# Exposition – Why Quilt?

## The Problem
- SuperInstance’s ecosystem is a collection of **independent runtimes** (Claw, Spreadsheet‑Moment, Dodecet‑Encoder, etc.).
- Each runtime has its own state‑management model, event system, and wiring language.  When a cell in Claw wants to react to a sensor value from a boat, developers must write bespoke adapters, duplicate dependency‑tracking logic, and manually propagate context.

## The Vision
Quilt is a **reactive spreadsheet engine** that treats *every piece of state* as a **cell**.  By unifying the representation of:
- static values (`value` cells)
- derived expressions (`formula` cells)
- side‑effectful services (`api`, `program`, `router`, `ai` cells)
- push‑based streams (`sensor`, `io` cells)
- observers (`listener` cells)

we obtain a **single source of truth** for the whole fleet.  The engine automatically builds a dependency graph, lazily recomputes only what is needed, and propagates changes with **per‑caller context** (row/column/identity).  This gives us:
1. **Deterministic recomputation** – no hidden order of side‑effects.
2. **Context‑aware routing** – a cell can decide which implementation to use based on the caller (e.g. a high‑precision model for premium agents, a cheap model for low‑tier ones).
3. **Effect tracking** – every async operation records an `Effect` (network, model usage, compute time) enabling cost‑analysis, audit logs, and automated decomposition.
4. **Language‑agnostic embedding** – the core is pure TypeScript compiled to WASM; any host language (Python, Rust, Go) can import it and drive the same sheet.

## How Quilt Solves the SuperInstance Pain‑Points
| Pain‑Point | Quilt Solution |
|------------|----------------|
| **Fragmented state** | All state lives in a single `SheetDef`.  Cells can reference each other across domains (`{{claw.agent.health}}`). |
| **Manual wiring** | Dependency graph is built automatically; `autoDetectDeps` scans expressions for `{{cellId}}` placeholders. |
| **Duplicated context handling** | `CallerContext` travels with every call, enabling routing rules (`router` cells) that adapt to the caller’s identity, tags, or row/column. |
| **Opaque side‑effects** | `Effect` objects are attached to every `CellValue`, making latency, token usage, and network calls visible to the fleet. |
| **Hard to test** | Pure cells (`value`, `formula`) are deterministic; effectful cells are de‑duplicated and can be stubbed in tests via the `inflight` map. |

---

# Architectural Overview (for Hermes)

```
+-------------------+      +-------------------+      +-------------------+
|   Claw Engine    | ---> |   Quilt Engine    | <--- | Spreadsheet‑Moment |
+-------------------+      +-------------------+      +-------------------+
        ^                         ^                         ^
        |                         |                         |
        |   sensor / push data    |   pull / get values      |   UI bindings
        +-------------------------+--------------------------+
```

- **Hermes** (the perception layer) can **push raw telemetry** (sonar, acoustic, GPS) directly into Quilt `sensor` cells via `engine.push`.  The engine then propagates the change to any dependent `formula` or `ai` cells, which may trigger model inference or routing decisions.
- **Hermes** can also **subscribe** to high‑level `listener` cells that emit alerts when a condition is met (e.g., `engine.subscribe('danger_zone', cb)`).  This gives us a clean, event‑driven bridge from low‑level hardware to fleet‑wide decision making.

---

# Next Steps for the Team
1. **Fix the TypeScript compile errors** (`ai.ts` missing fields, status literals).  Once `npm run build` succeeds we will have a distributable WASM bundle.
2. **Create a minimal demo sheet** that exercises every cell kind – this will be used by the `quilt-radio-orchestrator` Python demo.
3. **Write an adapter library** (`hermes-quilt-adapter`) that exposes simple helper functions:
   - `pushTelemetry(id, payload)` → `engine.push`.
   - `readValue(id)` → `engine.get`.
   - `subscribeAlert(id, cb)` → `engine.subscribe`.
4. **Document the integration** (see the next file).  This will be the reference for the rest of the fleet.

---

*All of this is written with the intent that Hermes, as the ship’s sensory array, becomes the primary data‑ingress point for Quilt, turning raw acoustic/sonar streams into reactive, context‑aware knowledge that powers the entire SuperInstance ecosystem.*
