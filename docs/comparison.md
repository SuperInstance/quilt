# How Quilt Compares

A frank comparison of Quilt with other tools. Not marketing — a real assessment of when to use what.

## vs. n8n / Make / Zapier (workflow automation)

**What they do well:**
- Linear workflows with clear steps
- Lots of pre-built connectors (Slack, Gmail, etc.)
- Visual editor with drag-and-drop
- Good for non-developers

**Where they fail:**
- Flowcharts become spaghetti at ~50 nodes
- Hard to express "for each tenant, do X" (you copy-paste)
- No concept of caller context — every trigger is anonymous
- State management is awkward (you use variables, but they don't propagate well)

**Where Quilt wins:**
- Spatial layout scales — 500 devices as 500 rows is readable
- Caller-aware routing (row > 10 → Model A) is native
- The grid is a tensor — you can sort, filter, aggregate
- Cells compose by reference, not by wire

**When to use which:**
- n8n if you have 5-10 nodes and want a quick automation
- Quilt if you have 50+ similar workflows, multi-tenant routing, or need the runtime to be inspectable

## vs. LangGraph / CrewAI (agent frameworks)

**What they do well:**
- Powerful primitives for agent reasoning
- Code-native, type-safe
- Great for complex agent logic

**Where they fail:**
- The agent's state is hidden in code or logs
- No way to "see" what the agent is doing without a debugger
- Hard to share state with humans
- Configuration is scattered across code, env vars, and prompt files

**Where Quilt wins:**
- The grid is the agent's working memory — visible, editable, sortable
- Humans and agents share the same surface (via MCP)
- One cell change can reroute 1000s of calls
- The decomposition flywheel turns agents into algorithms over time

**When to use which:**
- LangGraph if you need complex reasoning, custom tool definitions, or graph-based agent flow
- Quilt if the agent needs to share state with humans, or you want a visible control plane

## vs. Observable / Marimo (reactive notebooks)

**What they do well:**
- Reactive dataflow with auto-recompute
- Great for data exploration
- Visualizations are first-class

**Where they fail:**
- Not a runtime — they don't deploy anywhere
- No concept of async or side effects
- No IO/sensor support
- Cells are values, not capabilities

**Where Quilt wins:**
- Quilt is a runtime, not a notebook
- Cells can be async, side-effectful, IO-bound
- The same sheet runs in dev, in prod, on a Pi, in the cloud
- MCP integration is native

**When to use which:**
- Observable for data exploration and visualization
- Quilt for production systems that need reactivity, IO, and routing

## vs. Excel / Google Sheets (spreadsheets)

**What they do well:**
- Universal — billions of people understand them
- Formulas are powerful (Excel functions, array formulas)
- Collaboration features
- Pivot tables, charts, conditional formatting

**Where they fail:**
- Formulas are pure only — no async, no side effects
- No programmatic access to models, sensors, MCP tools
- Can't be a runtime — it's a document
- No version control (Google Sheets has limited history, not Git)

**Where Quilt wins:**
- Cells can be models, sensors, listeners — not just formulas
- The grid is a runtime, not a document
- YAML files are git-friendly
- MCP integration makes it agent-accessible
- Caller-aware routing (the grid is a policy mesh)

**When to use which:**
- Excel for ad-hoc analysis, collaboration, quick numbers
- Quilt for systems that need to compute, react, and act

## vs. Eclipse Streamsheets

**What they do well:**
- Spreadsheets for streaming data (MQTT, Kafka)
- Industrial IoT focus
- Open source

**Where they fail:**
- No agentic cells — cells are stream processors, not capabilities
- No caller-aware routing
- No MCP integration
- No model cells

**Where Quilt wins:**
- All of Streamsheets' capabilities, plus:
  - Caller-aware routing
  - Model cells (LLM/ONNX)
  - MCP-native design
  - Decomposition flywheel
  - More expressive cell types (api, program, listener, router, io)

**When to use which:**
- Streamsheets if you're already in that ecosystem and just need stream processing
- Quilt if you need a more general reactive runtime with agent/IO/MCP support

## vs. Apache Airflow / Prefect (data pipelines)

**What they do well:**
- Scheduled, batch-oriented workflows
- Robust execution (retries, alerts, monitoring)
- DAG-based dependencies

**Where they fail:**
- Batch-oriented, not reactive
- Heavy operational overhead
- Not designed for sub-second latency
- Python-only (mostly)

**Where Quilt wins:**
- Reactive, not scheduled (data flows immediately when it changes)
- Lightweight (no scheduler, no worker pool)
- Latency in single-digit ms
- Multi-language (TypeScript and Rust)

**When to use which:**
- Airflow for batch jobs (ETL, daily reports, scheduled pipelines)
- Quilt for reactive systems (control loops, real-time processing, edge AI)

## vs. Retool / Appsmith (internal tools)

**What they do well:**
- Drag-and-drop UI builder
- Database connectors
- Good for non-developers

**Where they fail:**
- UI is bound to data sources, not to logic
- No real "runtime" — it's a UI on top of databases
- No reactive propagation
- Limited for complex logic

**Where Quilt wins:**
- Logic IS the runtime — not bolted on
- Cells compose, propagate, route
- The grid is the source of truth, not a UI for a database
- Embedded web components let you put any cell in any UI

**When to use which:**
- Retool for quick CRUD apps
- Quilt when the app needs to *react* to changing data, or has complex logic

## The honest summary

Quilt is not a better spreadsheet, not a better n8n, not a better LangGraph. It's a different *substrate* — one that combines reactivity, IO, agents, and a spatial policy surface. The closest analogues are:

- **A reactive notebook that can deploy** (Observable + runtime)
- **A spreadsheet that calls LLMs and sensors** (Excel + MCP + IO)
- **A flowchart that's also a tensor** (n8n + caller-aware routing)
- **An agent runtime that's also a control panel** (LangGraph + grid UI)

If you need one of those combinations, Quilt is probably the right tool. If you just need a spreadsheet, use a spreadsheet.

---

Want to add a comparison we missed? Open an issue.
