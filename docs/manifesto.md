# Quilt Manifesto

> The spreadsheet is not the interface to the system. **The spreadsheet is the system.**

---

## 1. A cell is not a value. A cell is a contract.

When you change cell `A1` from "OpenAI GPT-4o" to a local ONNX model, every dependent cell rewires automatically. The grid is doing dependency injection. The cell is a *socket* — a stable address into which you can plug any implementation.

This is the move that makes the spreadsheet into a runtime. It collapses the distinction between *data*, *logic*, *API*, and *IO* into a single addressable surface.

## 2. Rows and columns are semantic axes, not just coordinates.

The grid's spatial structure isn't a UI accident. It's the most universal *policy surface* ever invented. Every spreadsheet user already knows that "rows are instances, columns are properties" — we just need to make that explicit and let it be queried.

`caller.row > 10` is a routing rule. `caller.column == "premium"` is a tier selector. Position becomes metadata. The grid becomes a tensor.

## 3. Every cell can be a sensor, a model, an actuator, or a policy.

The same grid can hold:

- a value (`42`)
- a formula (`=sensor.temp * 1.8 + 32`)
- an API call (HTTP, MCP tool)
- a model invocation (LLM, ONNX)
- a sensor (MQTT, Modbus, GPIO)
- an actuator (webhook, file write, serial)
- a listener (fires on change)
- a router (delegates based on context)

The cell type isn't a category — it's a *capability shape*. All of them compose.

## 4. Spreadsheets are the most successful reactive programming environment ever built.

Billions of people understand formulas. Billions of people understand cell references. Billions of people understand what it means to "drag a formula down." The reactive dataflow model that FRP researchers spent decades formalizing is already in every Excel user's hands.

We don't need to invent a new mental model. We need to *extend* the one that already works.

## 5. The grid is the runtime. The cell is the contract. The language is the source of truth.

No code is hidden. No logic is in a YAML file somewhere else. The sheet is the executable artifact. The YAML is the source. The diff is the review. The grid is the debugger.

When something goes wrong, you don't `console.log` and pray. You open the sheet, see which cell is red, click it, see its call history, see which dependency changed, and fix it.

## 6. Classical and jazz cells coexist. The grid shows you which is which.

Some cells are deterministic. Some are stochastic. Most systems are somewhere in between. Quilt doesn't force you to pick — it lets you mix, and it makes the mix *visible*.

A safety interlock is a formula. An anomaly detector is a model. They're in the same sheet. You can see the boundary. You can change the boundary. You can *audit* the boundary.

## 7. Over time, jazz becomes classical. The grid is the distillation workbench.

Production AI systems don't stay LLM-based forever. They get distilled. The big model becomes a small model. The small model becomes a rule. The rule becomes a constant.

Quilt makes this *visible and editable* in the same place. You see which cells are still "jazz" (stochastic, expensive). You see which are "classical" (deterministic, fast). You migrate them, one cell at a time, watching the cost drop in the grid.

## 8. Humans and agents share the same surface.

The agent reads a cell. You see the read. The agent writes a cell. You see the write. You override a cell. The agent sees the override on the next cycle. Same grid, same view, same audit log.

This is the end of "AI in a black box." The cell is the boundary. It's where the human and the agent meet.

## 9. MCP is not a side protocol. It's the connective tissue.

A sheet can be an MCP server. A cell can be an MCP tool. An MCP client (Claude Code, Cursor, anything) can read the sheet and call cells. The agent's working memory is the grid.

This makes Quilt a first-class citizen in the agent ecosystem. Every MCP client can use it. Every MCP server can be a cell in it.

## 10. The lowest-level primitive is the *addressable capability*, not the *function call*.

We're not building a new programming language. We're building a new *substrate* — one where addressing is composition, where position is policy, and where every cell is both a value and a verb.

The spreadsheet is the first proof of concept. The principle is older than the spreadsheet. The grid is just the shape that billion of people already understand.

---

## What we're not

- We're not "Excel with AI." That's a feature, not a substrate.
- We're not "n8n in a grid." Flowcharts are graphs; this is a tensor.
- We're not "another agent framework." Agents are cells, not code.
- We're not "low-code for non-programmers." We're a new computational surface for everyone.

## What we are

A spreadsheet where every cell is a live, typed, addressable capability. A grid that runs. A control plane for the agent era. A new way to compose systems.

**The spreadsheet is the runtime. The cell is the contract. The grid is the patch panel for the world.**
