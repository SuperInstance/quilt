# Application for Hermes – a Perception‑to‑Quilt Bridge

## Why Hermes needs Quilt
Hermes is the **towfish** of the fleet: it constantly receives raw acoustic, sonar, GPS, and environmental data.  Until now that data lived in ad‑hoc buffers or bespoke Python scripts.  By feeding it into Quilt we gain:
- **Automatic dependency tracking** – a change in a sonar echo instantly recomputes any derived risk model.
- **Context‑aware routing** – a high‑resolution model is used only for premium vessels, while a cheap model runs on the low‑power edge.
- **Effect visibility** – every model call records token usage, letting Hermes enforce budget limits.
- **Unified subscription model** – alerts (e.g., "iceberg detected") are just listener cells that any downstream system can subscribe to.

## How the bridge works (pseudo‑code)
```ts
import { QuiltEngine } from '@quilt/core';

const engine = new QuiltEngine('hermes', { tracing: true, ai: myAIEngine });
await engine.loadSheet(require('./hermes_sheet.json'));

// 1️⃣ Push raw telemetry (e.g., a sonar ping)
export async function pushSonar(ping: SonarPing) {
  await engine.push('sonar.ping', ping);
}

// 2️⃣ Read a high‑level risk score computed by a formula cell
export async function getRiskScore() {
  const v = await engine.get('risk.score');
  return v.status === 'ready' ? v.data : null;
}

// 3️⃣ Subscribe to alerts (listener cell fires when risk > threshold)
export function onRiskAlert(cb: (score: number) => void) {
  engine.subscribe('risk.alert', (val, _prev) => {
    if (val.status === 'ready') cb(val.data as number);
  });
}
```

## What to add to the repo
1. **`hermes_sheet.json`** – a minimal sheet that defines:
   - `sonar.ping` (sensor)
   - `risk.score` (formula that aggregates recent pings)
   - `risk.alert` (listener that fires when `risk.score > 0.8`).
2. **`hermes-quilt-adapter.ts`** – the thin TypeScript wrapper shown above, compiled to a small Node module that Hermes can import.
3. **Documentation** – the two markdown files we are adding now (`EXPOSITION.md` and this `APPLICATION_FOR_HERMES.md`).

## Next concrete steps (the team can execute)
- Add the three files under `quilt_repo/docs/` and `quilt_repo/src/`.
- Run `npm run build` (after fixing the `ai.ts` type errors) to produce the WASM bundle.
- In the Python `quilt-radio-orchestrator` demo, import the compiled bundle and call the adapter functions to push a synthetic sonar ping and log the risk score.
- Open a PR from `hermes/quilt-dev` to `main` so the rest of the fleet can review the integration.

---

*Hermes will thus become the first citizen of the Quilt ecosystem, turning raw maritime perception into a live, queryable knowledge graph that powers the entire SuperInstance fleet.*
