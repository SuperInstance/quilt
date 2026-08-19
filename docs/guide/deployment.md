# Deployment

Quilt runs on every tier. Pick the one that matches your constraints.

## Tier matrix

| Tier | Repo | Best for | Language | Binary size |
|---|---|---|---|---|
| Browser | `quilt` (npm) | UIs, agents, demos | TypeScript | ~50KB gzipped |
| Server | `quilt` (Node), `quilt-rust` | Long-running services | TypeScript or Rust | Node 50KB, Rust 8MB |
| Cloudflare | `quilt-cloudflare` | Global edge, low latency | TypeScript (Workers) | <1MB |
| Codespace | `quilt-codespace` | Browser-accessible dev | TypeScript + Node | - |
| Jetson | `quilt-jetson` | Edge ML, robotics, sensor fusion | Rust | 8MB |
| ESP32 | `quilt-esp32` | Embedded, no_std, sensors, motors | Rust (no_std) | ~50KB flash |

## Browser

```bash
npm install @quilt/core
```

```ts
import { QuiltEngine } from '@quilt/core';
const engine = new QuiltEngine('app');
engine.loadSheet(yaml);
```

Or use [Quilt Live](https://superinstance.github.io/quilt/landing/quilt-live.html) — 70KB HTML file, works offline, save as a cookie or downloadable file.

## Server (Node)

```bash
npm install @quilt/core @quilt/sdk
```

```ts
import { QuiltEngine, parseSheet } from '@quilt/core';
import { HttpCellTransport } from '@quilt/sdk';
import express from 'express';

const engine = new QuiltEngine('server');
engine.loadSheet(parseSheet(yamlString));

// Expose as REST
app.get('/cell/:path', async (req, res) => {
  const v = await engine.get(req.params.path);
  res.json({ value: v });
});

app.listen(3000);
```

## Server (single binary, Rust)

```bash
cargo install quilt-rust
quilt serve --sheet main.yaml --port 8080
```

A single static binary. No Node.js. No npm.

## Cloudflare Workers

```bash
git clone https://github.com/SuperInstance/quilt-cloudflare
cd quilt-cloudflare
npm install
npx wrangler deploy
```

Workers + D1 + R2 + Vectorize + KV. Global edge.

## Codespace

```bash
git clone https://github.com/SuperInstance/quilt-codespace
code quilt-codespace
# Reopen in container — auto-installs everything
# Open port 7681 for the TUI, 4096 for the HTTP API
```

A full Quilt environment in a GitHub Codespace. ttyd for the TUI, HTTP+SSE for the API.

## Jetson

```bash
git clone https://github.com/SuperInstance/quilt-jetson
cd quilt-jetson
cargo build --release --target aarch64-unknown-linux-gnu
scp target/aarch64-unknown-linux-gnu/release/quilt-jetson jetson@device:/usr/local/bin/
```

CUDA, ROS2, sensor fusion. Pre-built for Orin Nano/NX/AGX.

## ESP32

```bash
git clone https://github.com/SuperInstance/quilt-esp32
cd quilt-esp32
cargo build --release
espflash flash target/xtensa-esp32-espidf/release/quilt-esp32
```

`no_std` Rust. Sensor polling at 50Hz. Motor control with PID cells.

## Federation

All tiers can talk to all other tiers via the SDK transports:

- HTTP — for server/Workers
- MQTT — for IoT fleets (ESP32, Jetson)
- WebSocket — for browser/codespace
- In-process — for tests

See [Federation](/guide/federation) for the URI scheme and resolution API.
