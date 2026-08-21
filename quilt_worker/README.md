# Quilt Demo Worker

This Cloudflare Worker demonstrates the **Quilt** reactive engine in a server‑less environment.

## What it does
- Loads a static Quilt sheet (`demo_sheet.json`).
- Instantiates a `QuiltEngine` with a **SimpleAIEngine** wrapper that calls Cloudflare AI.
- Enforces a per‑IP rate limit using a Workers KV namespace (`USAGE`).
- Caps AI calls to **5** per visitor per day and limits token usage to **100** per request.
- Returns a JSON object with the evaluated result of every cell in the sheet.

## Deploying
1. **Login** to Cloudflare:
   ```bash
   wrangler login
   ```
2. **Create a KV namespace** (run once):
   ```bash
   wrangler kv:namespace create USAGE
   ```
   Copy the generated namespace ID and add it to `wrangler.toml` under the `kv_namespaces` section.
3. **Add secrets** for the AI backend (replace with your own values):
   ```bash
   wrangler secret put CF_ACCOUNT_ID
   wrangler secret put CF_AI_TOKEN
   ```
4. **Deploy**:
   ```bash
   wrangler deploy
   ```
   The worker will be reachable at the URL shown by the CLI.

## Usage limits
- **VISIT_LIMIT** = 5 – maximum AI calls per unique visitor (IP) per 24 h.
- **max_tokens** in the AI request is capped at 100.
- The `SimpleAIEngine` enforces a per‑process call limit (`maxCalls`).

## Local testing
You can run the worker locally with:
```bash
wrangler dev
```
Then open `http://localhost:8787` in a browser – you’ll see the JSON payload.

## Extending
- Add more cells to `demo_sheet.json` to explore different cell kinds.
- Adjust `VISIT_LIMIT` or token caps in `src/index.js`.
- Hook the worker into the larger SuperInstance ecosystem by exposing the results to other services.
