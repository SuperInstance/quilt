# Security Model

This document describes Quilt's security model: what we trust, what we don't, and what you need to do to run Quilt safely in production.

## Trust boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trust boundary                                │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐    ┌──────────────┐  │
│  │   Sheet      │ ──────► │   Engine     │ ──►│   Adapters   │  │
│  │ (YAML file)  │         │  (in-memory) │    │  (network)   │  │
│  └──────────────┘         └──────────────┘    └──────────────┘  │
│                                                                  │
│  Trusted: author of the sheet                                    │
│  Untrusted: anything that calls into the sheet                   │
└─────────────────────────────────────────────────────────────────┘
```

The author of a sheet is trusted. The author defines the cells, what they call, what they connect to. If the author is malicious, the sheet is malicious.

Anything that calls into the sheet (via the engine, via MCP, via the CLI) is treated as untrusted input. The engine validates context, never executes user code directly, and treats cell values as data.

## What's safe to do today

- **Run sheets you wrote yourself** — full trust
- **Run sheets from trusted authors** (e.g. our examples) — full trust
- **Expose a sheet via MCP stdio** — safe (stdio is local IPC)
- **Run sheets on a Raspberry Pi with sensor input** — safe, sensors are local
- **Use the CLI to inspect and run sheets** — safe

## What needs additional care

- **Expose a sheet via MCP over HTTP** — needs auth, see below
- **Multi-tenant deployment** — needs cell-level permissions, see below
- **Untrusted sheet sources** — needs sandboxing, see below
- **Program cells that call `runtime.set`** — can write to any cell, see below

## What you MUST NOT do

- **Don't load sheets from untrusted sources** — a malicious sheet can call any API, run any program, access any sensor
- **Don't expose MCP over HTTP without authentication** — anyone on the network could call your cells
- **Don't give program cells access to the filesystem without sandboxing** — the program can read/write any file the engine can

## Implementation status

| Area | Status | Notes |
|------|--------|-------|
| Schema validation | ✅ done | The parser validates cell structure |
| Caller context | ✅ done | Every call carries context |
| Type checking | ❌ not yet | Cell types are documented but not enforced |
| Capability-based permissions | ❌ not yet | `CellDef.permissions` is declared but ignored |
| WASM sandbox for program cells | ❌ not yet | Program cells run in the host process |
| HTTP auth for MCP | ❌ not yet | stdio only for now |
| Rate limiting | ❌ not yet | Caller has to implement |
| Audit log | ⚠️ partial | `getTraces()` gives recent evaluations |
| Encrypted secrets | ❌ not yet | Use env vars |

## Sandboxing program cells

Program cells are the most powerful — and most dangerous — cell type. They execute arbitrary JavaScript with access to the runtime. For production:

1. **Run the engine in a separate process or container** — limits blast radius
2. **Use `worker_threads` or `isolated-vm`** — true isolation
3. **Whitelist allowed operations** — reject filesystem access, network calls outside a known set
4. **Set resource limits** — memory, CPU time, wall clock

The MVP runs program cells in the host process. This is fine for development and trusted deployments. For production, you must add sandboxing.

## Protecting API endpoints

API cells can call any URL. To prevent abuse:

1. **Whitelist allowed hosts** in your sheet
2. **Use env vars for secrets** — never hardcode API keys
3. **Set rate limits at the network layer** — e.g. with an API gateway
4. **Log all API calls** — `getTraces()` shows them

## Protecting MCP

The MCP server exposes cells as tools. Anyone with MCP access can call any cell. To secure:

1. **stdio only by default** — local IPC, no network exposure
2. **For HTTP transport, add authentication** — bearer tokens, OAuth, etc.
3. **Filter cells by permission** — only expose certain cells as tools
4. **Log every MCP call** — for audit

## Trusting sheets

Before loading a sheet from an untrusted source:

1. **Read the YAML** — make sure it doesn't do anything you don't expect
2. **Check the `endpoint` fields** — make sure it doesn't call unknown APIs
3. **Check the `code` fields** — make sure program cells don't do dangerous things
4. **Run in a sandboxed environment first** — test in a container or VM

## Future work

- WASM-based sandbox for program cells (v0.2)
- Capability-based permissions (v0.3)
- Signed sheets (v0.4) — only load sheets signed by trusted authors
- Encrypted secrets in YAML (v0.5) — don't put API keys in plain text

---

If you find a security issue, please email security@quilt.example.com (or open a private security advisory on GitHub).
