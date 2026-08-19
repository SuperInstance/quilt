# v0.5.0 — Quilt Federation

> Quilts that link to other quilts. Eight SDK primitives, a 3-tier Codespaces template, and the end of the siloed runtime.

## What ships

### `@quilt/sdk` v0.2.0 — federation primitives

The agent substrate (v0.4.0) had 5 primitives. v0.5.0 adds 3 more for **cross-Quilt cell addressing**:

| New | What it does |
|---|---|
| `resolveCell(uri, transport)` | Resolve a federated cell URI to a live, subscribable handle |
| `subscribeCell(uri, transport, cb)` | Subscribe to a cell across instances — fires on every value change |
| `CellRouter` | Multi-instance routing table; one line to add a new tier |

Plus the supporting pieces:
- `parseCellRef(uri)` — parse `quilt://[instance]/[sheet]#[cell]`
- `LocalCellTransport` / `HttpCellTransport` — in-process and HTTP+SSE transports
- `detectTier()` / `tierInfoFor()` — auto-detect esp32 / jetson / codespace / cloudflare / server / browser

**33 new tests** (28 base + 33 federation = 61 total), all passing.

### URI scheme

```
quilt://[instance-id]/[sheet-id]#[cell-path]

quilt://local/boat-autopilot#rudder.angle
quilt://jetson-lab/perception#vision.scene
quilt://codespace-7c3/prod#anomaly.score
quilt://*[/]/prod#x        ← wildcard for routing tables
quilt://esp32-fleet/+#rudder.angle  ← fleet-wide cell
```

### `.devcontainer/` in the main repo (lightweight)

For contributors who want a Quilt runtime in their Codespace:
- `devcontainer.json` — Quilt runtime on ports 7681 (TUI), 4096 (HTTP), 8080 (dashboard)
- `post-create.sh` — installs Quilt, generates runtime token, starts services

### `quilt-codespace` (new 15th repo) — full template

A standalone template repo (use this template → Open in Codespace) that:
- Auto-installs the full Quilt toolchain
- Starts ttyd (browser TUI), HTTP API (REST + SSE), and a static dashboard
- Generates a runtime token at first boot
- Includes `examples/fed-autopilot/cell.yaml` — a 3-tier Quilt stack (ESP32 → Jetson → Codespace) that demonstrates the federation pattern
- Includes `scripts/quilt-http-server.js` — a self-contained, token-authenticated HTTP API for cell get/set/subscribe over SSE
- Has CI that smoke-tests the devcontainer JSON and starts/stops the HTTP server

URL: https://github.com/SuperInstance/quilt-codespace

## The deployment tier model

Mirrors cocapn-runtime's 5-room abstraction. Each tier has its own capability profile and knows which siblings to federate with:

| Tier | Capability profile | Quilt repo | Use for |
|---|---|---|---|
| **esp32** | no_std, sensors, motors | `quilt-esp32` | Tight control loops |
| **jetson** | sync + alloc, GPU, LLM | (next) | Vision, on-board reasoning |
| **codespace** | async, ttyd + MCP | `quilt-codespace` | Cloud reasoning, ML, audit |
| **cloudflare** | V8 isolates, D1, KV, R2 | `quilt-cloudflare` | Edge, low-latency, persistent |
| **server** | Node.js, full stack | main `quilt` | Generic runtime |

`detectTier()` reads env vars + runtime markers to figure out where it is. `tierInfoFor(tier)` returns the full capability profile.

## The killer example: Fed Autopilot

A 3-tier Quilt stack for an autonomous boat:

```
Codespace (this repo)
  - ai.anomaly_score    ← z.ai reasoning on full state
  - tune.pid_kp         → pushed back to ESP32
  - audit.last_decision → published to cloud

Jetson (next, quilt-jetson)
  - perception.obstacles  ← vision model
  - vision.wind_direction ← camera + small LLM
  - autopilot.intent      → pushed to ESP32

ESP32 (quilt-esp32, 50 Hz)
  - sensor.rudder       ← potentiometer
  - sensor.compass      ← IMU
  - algo.pid            → every cycle, deadband check
  - actuator.motor_pwm  → motor controller
  - mirror.rudder       → published to Jetson
```

**Same reactive engine. Same cell semantics. Three different hardware tiers.** Federation is just a subscription.

## The HTTP API (verified end-to-end)

`scripts/quilt-http-server.js` exposes a Quilt engine over HTTP:

```bash
# Get a cell
curl -H "Authorization: Bearer $QUILT_TOKEN" \
     https://codespace-4096.githubpreview.dev/cells/local/sheet/cell.path

# Set a cell
curl -X PUT -H "Authorization: Bearer $QUILT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"value": 42}' \
     https://codespace-4096.githubpreview.dev/cells/local/sheet/cell.path

# Subscribe to a cell (SSE)
curl -N -H "Authorization: Bearer $QUILT_TOKEN" \
     https://codespace-4096.githubpreview.dev/cells/local/sheet/cell.path/events
```

Smoke-tested with real GET, PUT, and SSE events. See the CI workflow in `quilt-codespace`.

## Mapping to the ecosystem

| New concept | Already in Quilt |
|---|---|
| Federated cell | Cell `id` + reactive propagation |
| `resolveCell` | `engine.get(cellId)` (local) |
| `subscribeCell` | Reactive propagation + listener cells |
| `CellRouter` | Multi-sheet engine |
| `detectTier` | Hard-coded in deployment scripts |
| Codespaces runtime | `quilt serve` in a terminal |

## Test totals

- `@quilt/sdk`: **61 tests** (28 base + 33 federation)
- `@quilt/core`: 21 tests (unchanged)
- HTTP server: smoke-tested with real GET, PUT, SSE
- `quilt-codespace` CI: smoke test passes

## Next

- `quilt-jetson` (16th repo) — the missing mid-tier
- `quilt-fleet` (17th repo) — multi-device orchestration
- `FederatedArtifactStore` — R2-backed cross-tier storage
- `quilt-mqtt` — IoT-native transport for ESP32 / sensor fleets
