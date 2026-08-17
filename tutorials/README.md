# Quilt Tutorial

Five chapters, about an hour total. By the end you'll have built a working agent mission control in your terminal.

| # | Chapter | What you'll do |
|---|---|---|
| 1 | [Hello, cells](#1-hello-cells) | Your first sheet — values and formulas |
| 2 | [Reactivity](#2-reactivity) | How the graph updates itself |
| 3 | [Caller-aware routing](#3-caller-aware-routing) | The killer primitive |
| 4 | [MCP integration](#4-mcp-integration) | Expose your sheet to Claude Code |
| 5 | [Decomposition](#5-decomposition) | From jazz to classical |

## 1. Hello, cells

A **cell** in Quilt isn't a value. It's a *capability contract* — a stable address that holds something that does work.

The simplest cell is a value:

```yaml
cells:
  - id: hello
    kind: value
    value: "Hello, Quilt!"
```

That's it. Run it:

```bash
$ quilt run hello.quilt.yaml
▶ Running sheet: hello
  ○ hello                          [value   ] ✓ "Hello, Quilt!"
```

The `○` symbol means value, `ƒ` means formula, `↗` means API, `⚙` means program. You'll learn them by feel.

Now a formula. Formulas are *reactive computations* — they re-evaluate when their inputs change.

```yaml
cells:
  - id: hello
    kind: value
    value: "Hello"

  - id: greeting
    kind: formula
    expr: "=hello + ', world!'"
```

Run it again. `greeting` shows `"Hello, world!"`. No "build", no "deploy", no compile step. The graph is alive.

**Key insight**: the formula references `hello` by its stable id. If you rename `hello` to `greeting_input`, the formula breaks — *and that's the point*. The dependency is explicit, not implicit.

## 2. Reactivity

A formula isn't a snapshot. It's a live computation that re-runs when its inputs change.

Try this:

```bash
$ quilt set hello.quilt.yaml hello "Howdy"
✓ set hello = "Howdy"
$ quilt get hello.quilt.yaml greeting
{
  "data": "Howdy, world!",
  "status": "ready"
}
```

The formula re-evaluated. No subscription, no watcher, no manual refresh. The engine noticed the change and propagated.

This is **reactivity**. It's what spreadsheets have always done — but Quilt extends it to async, side-effectful, and caller-aware.

**Pure cells** (value, formula) are pull-based: when something asks for them, they recompute on demand. The engine tracks which formulas depend on which values, and re-runs the right ones in the right order.

**Effectful cells** (api, program, sensor, listener) are push-based: they evaluate when triggered, and notify their dependents. The same propagation, but the trigger is explicit.

## 3. Caller-aware routing

This is the primitive that no other tool has.

A cell can change its behavior based on *who called it* — the row, the column, the caller's identity, anything in the context.

```yaml
cells:
  - id: fast
    kind: value
    value: "fast-result"

  - id: precise
    kind: value
    value: "precise-result"

  - id: router
    kind: router
    rules:
      - when: 'caller.row > 10'
        route: { cell: 'fast' }
      - when: 'caller.row <= 10'
        route: { cell: 'precise' }
```

Now the same `router` cell returns different values based on context:

```typescript
await engine.call('router', undefined, { row: 5 });   // → "precise-result"
await engine.call('router', undefined, { row: 50 });  // → "fast-result"
```

The engine passes `caller.row` through the dependency graph. Every cell in the chain sees the same context. This means a cell deep in a workflow can route based on the *original* caller's position.

**Why this matters**: in a multi-tenant system, you can route by tenant (row), by capability (column), by user tier (identity tags), all in the same sheet. Change one cell — the model — and every caller reroutes.

**The deeper insight**: row/column position is a *first-class policy dimension*. The grid isn't just a visualization — it's a routing surface. The same mental model that lets you sort by cost or filter by status also lets you route by tenant.

## 4. MCP integration

Every Quilt sheet can be exposed as an MCP server. That means Claude Code, Cursor, Windsurf — any MCP client — can use your cells as tools and read your sheet as resources.

```bash
$ quilt serve my-sheet.quilt.yaml --mcp
[quilt] serving sheet 'my-sheet' as MCP server on stdio
```

That's it. The sheet is now an MCP server.

In your Claude Code config:

```json
{
  "mcpServers": {
    "quilt": {
      "command": "quilt",
      "args": ["serve", "my-sheet.quilt.yaml", "--mcp"]
    }
  }
}
```

Now Claude Code sees your sheet. Every named cell is a tool:

```
> Use cell__rudder_command to steer the boat
> Use cell__model_router to choose a model
> Use cell__voice_intent to parse the user's voice command
```

**Why this matters**: the sheet is now the *shared working memory* between you and the agent. The agent writes a cell, you see it instantly. You override a cell, the agent sees it on the next cycle. Same grid, same view, same audit log.

**The deeper insight**: MCP is not a side feature. It's the protocol that makes the agent ↔ grid boundary work. Without MCP, you'd be copy-pasting between windows. With it, you have a real shared workspace.

## 5. Decomposition

Quilt has a concept called the **classical ↔ jazz spectrum**.

- **Classical cells** are deterministic. Pure formulas. PID controllers. Threshold checks. They run fast, test easy, cost nothing.
- **Jazz cells** are stochastic. LLM calls. Anomaly detection. Creative generation. They cost money, take time, may hallucinate.

The same grid manages both. You can see exactly where the jazz is:

```yaml
cells:
  - id: threshold
    kind: value
    value: 0.5
    description: "Above this, escalate"

  - id: classifier
    kind: model
    endpoint: "model:gpt-4o"  # jazz
    description: "LLM classifier (expensive)"

  - id: rule_based
    kind: formula
    expr: "=sensor.value > threshold"  # classical
    description: "Simple threshold check"
```

But the **decomposition flywheel** lets you turn jazz into classical over time:

1. **Start**: the `classifier` cell is a big LLM call. Jazz.
2. **Log**: every call gets recorded. Inputs, outputs, timestamps, costs.
3. **Distill**: after N examples, you notice patterns. "Oh, 80% of the time the answer is `safe` when the temperature is < 50."
4. **Replace**: a new `rule_based` cell handles the easy cases. The `classifier` only sees the hard ones.
5. **Result**: lower cost, lower latency, higher reliability. *And you can see it in the grid.*

The grid is the distillation workbench. Every cell, every call, every decision is visible and editable. You don't refactor code — you edit cells.

**The deeper insight**: this is how production AI systems should be built. Start with a big model, observe, decompose, ship cheaper, faster, more reliable pieces. The grid makes this *visible* instead of hidden in a codebase somewhere.

## Where to go from here

- Read the [manifesto](../docs/manifesto.md) for the full design philosophy
- Read the [architecture doc](../docs/architecture.md) for the technical details
- Look at the [examples](../examples/) for working patterns
- Browse the [templates](../templates/) for starting points
- Open an issue if you get stuck — we read every one
