## Related Quilt repos

Quilt is an ecosystem of 15 repos, 5 deployment tiers, 3 languages. This repo is part of:

| Tier | Repo | What it is |
|---|---|---|
| **Canonical** | [quilt](https://github.com/SuperInstance/quilt) | TypeScript core (this ecosystem's home base) |
| **Compiled** | [quilt-rust](https://github.com/SuperInstance/quilt-rust) | Rust port — single static binary, axum, crossterm |
| **Browser** | [quilt-live](https://github.com/SuperInstance/quilt-live) | Single 70KB HTML file that runs anywhere |
| **IoT** | [quilt-esp32](https://github.com/SuperInstance/quilt-esp32) | no_std Rust for ESP32, sensors + actuators |
| **Edge** | [quilt-cloudflare](https://github.com/SuperInstance/quilt-cloudflare) | Cloudflare Workers + D1 + Vectorize + R2 |
| **Codespace** | [quilt-codespace](https://github.com/SuperInstance/quilt-codespace) | GitHub Codespace as a live Quilt runtime |
| **AI** | [quilt-ai](https://github.com/SuperInstance/quilt-ai) | LLM cells across 4 providers (z.ai, Kimi, DeepSeek, Cloudflare) |
| **Evolution** | [quilt-evolve](https://github.com/SuperInstance/quilt-evolve) | Self-improvement loops, 4 components, 5 scopes |
| **Mesh** | [quilt-mesh](https://github.com/SuperInstance/quilt-mesh) | CRDT-backed cross-tab / cross-device sync |
| **Agent** | [quilt-agent](https://github.com/SuperInstance/quilt-agent) | LLM agent as a sheet — memory, tools, reasoning |
| **Time** | [quilt-time](https://github.com/SuperInstance/quilt-time) | Time-series cells with rolling windows |
| **Vault** | [quilt-vault](https://github.com/SuperInstance/quilt-vault) | Secrets cells with per-cell ACLs |
| **Vision** | [quilt-vision](https://github.com/SuperInstance/quilt-vision) | Computer-vision cells (camera → scene → caption) |
| **ZK** | [quilt-zk](https://github.com/SuperInstance/quilt-zk) | Zero-knowledge cell verification primitives |
| **Flow** | [quilt-flow](https://github.com/SuperInstance/quilt-flow) | Workflow cells — DAG execution, retry, rollback |

See the [Federation landing page](https://superinstance.github.io/quilt/landing/federation.html) for the architecture and the [Engineering Bar](https://github.com/SuperInstance/quilt/blob/main/docs/engineering-bar.md) for what "done right" means across all 15 repos.
