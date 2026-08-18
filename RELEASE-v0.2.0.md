# Quilt TypeScript v0.2.0 — Release Notes

**Date:** 2026-08-18
**Status:** Production-grade, ready for release.

## What changed since v0.1.0

The v0.1.0 release shipped the core engine, the parser, the CLI,
the MCP server, and the TUI. v0.2.0 expands the example set,
hardens the engine, and adds the harness/throughput docs.

### Engine (quilt-core)

- **9 core engine tests + 6 new example tests = 15 tests pass**
  (was: 9, 0 failing).
- **Sensor `default` field.** Cells can declare an initial value
  in YAML; the engine uses it at load time. Demo sheets now
  work without an adapter wired up.
- The `defineCell` constructor now seeds the cell's value from
  the YAML `value` or `default` field, so `engine.get()` returns
  the right value on the first call.

### Examples (10, all working)

The four original examples (boat-autopilot, agent-dashboard,
model-router, sensor-anomaly) plus six new production-grade
examples:

- **weather-monitor** — three sensors → heat-index formula →
  listener alerts → caller-aware router.
- **chat-router** — LLM routing by tier (premium/standard/free)
  and message length.
- **ab-test-router** — deterministic A/B split using FNV-1a hash.
- **iot-dashboard** — three thermometers → room status → building
  status, with alerts.
- **rate-limiter** — token-bucket rate limiter with per-caller
  state.
- **task-scheduler** — reactive task scheduler with overdue
  listener.

All 10 examples load and evaluate end-to-end. The 6 new
examples are covered by `packages/core/test/examples.test.mts`
(6 tests, all green).

### Tests

- **15 vitest tests pass** (9 engine + 6 example e2e).
- **15 node:test tests pass** in `@quilt/tui` (the TUI uses
  node:test because it works without a build step).
- **30 total tests across the workspace.**

### Documentation

- `docs/harness-guide.md` — comprehensive guide for building
  custom harnesses around the TS engine. Covers sync/async
  patterns, MCP/HTTP/CLI wiring, caller context, error
  handling, common integration patterns (REST/DB/queues/LLMs),
  and cross-runtime portability notes.
- `docs/throughput.md` — research note on high-throughput cell
  evaluation. Analyzes current performance, the
  new-Function/with overhead, and lays out 6 paths to 10x
  throughput.

### Build

- `vitest.config.ts` — clean config that excludes the tui
  package (which uses node:test) and the examples dir.
- Zero TypeScript errors across the workspace (`tsc --noEmit`).

## What you can do with v0.2.0

- Ship a Node.js process that hosts an MCP server backed by a
  sheet. `npx @quilt/mcp sheet.yaml` gives you an MCP server on
  stdio.
- Embed Quilt in a web app via the `quilt.js` client + the
  `/quilt-web` server (Rust). The bundled HTML demo works
  without a build step.
- Build a CLI tool with `@quilt/cli` that runs a sheet, prints
  cell values, sets inputs, opens the TUI.
- Run the TUI for an interactive terminal view. `npx @quilt/tui
  sheet.yaml` opens a vim-style cell browser.

## What's not in v0.2.0 (planned for v0.3.0)

- A bytecode VM for the formula DSL (currently `new Function`
  with `with (cells)`). See `docs/throughput.md` for the
  detailed plan.
- JIT-friendly helper functions (typed overloads of `max`,
  `min`, `clamp` for 2/3/4-arg forms).
- WebAssembly-backed program cells for hot paths.
- A "compiled sheet" format (`.quilt.bin`) for fast startup.

## Cross-runtime portability

A sheet written in YAML works in both runtimes (TS and Rust),
with these caveats:

| Feature | TS | Rust |
|---|---|---|
| `=` ternary `x > 0 ? 'a' : 'b'` | yes | no (rhai) |
| `if/else` as expression | no (statement) | yes (rhai) |
| Program cell helpers | `runtime.get`/`runtime.call` | `qget`/`qcall` |
| Formulas (math) | JS | rhai |
| Chained formulas | auto, JS proxy | auto, snapshot pre-eval |
| Sensor `default` | yes | yes |

If you want a single YAML to run on both, use **ternaries** and
**avoid the `call` keyword** (use `qcall` in Rust; in TS the
runtime function is `runtime.call`).
