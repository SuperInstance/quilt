# Contributing to Quilt

The substrate is live. The paradigm is new. Everything is in motion. That makes this a great time to contribute.

## What we need

The biggest leverage points, in rough order:

1. **Adapters.** MQTT, Modbus, OPC-UA, GPIO, OpenAI, Anthropic, Ollama. Each one is a 100-300 line module.
2. **Cell type tests.** The core has 9 tests. It needs hundreds. Especially for caller-aware caching, cycle detection, async races.
3. **TUI polish.** The CLI has a basic text mode. A real tmux-native TUI with cell inspector, dependency overlay, live updates — that's a few days of work.
4. **More examples.** Industrial, gaming, agent coordination, scientific computing. Every domain finds a new use.
5. **Web UI.** React-based grid with the same affordances as a spreadsheet. The MCP server already does the heavy lifting; the UI is a view.
6. **Documentation.** The tutorial is good. The architecture doc is good. We need more recipes, more "how do I" answers, more screenshots.

## How to contribute

1. Open an issue describing what you want to build. We can talk through design before you code.
2. Fork the repo, push to a branch, open a PR.
3. PRs need tests. The bar is "the new behavior has a test, and the old tests still pass."
4. For larger changes, a 1-page design doc helps. We don't want to surprise each other.

## Development setup

```bash
git clone https://github.com/superinstance/quilt
cd quilt
npm install
npm run test           # all tests
cd packages/core && npm run test   # just core
```

The runtime is in `packages/core`. The CLI is in `packages/cli`. The MCP server is in `packages/mcp`. Each builds with `tsc` and tests with `vitest`.

## Coding conventions

- TypeScript, strict mode, ESM modules
- Async-first; pure cells are sync, effectful cells are async
- All cell types implement the same shape: `evaluate*(cell, ctx, ...) -> CellValue`
- No `any` unless you have a really good reason
- Comments explain *why*, not *what*
- Tests are specs — if a test passes, the behavior is correct

## The bigger picture

This project isn't "yet another spreadsheet app." It's a new computational substrate. When you're designing a feature, ask: is this making the substrate more powerful, or is it papering over a missing primitive?

If it's the latter, talk to us. We might be missing the primitive entirely.

Welcome aboard.
