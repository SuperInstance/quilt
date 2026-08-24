import { URLSearchParams } from 'node:url';

/** Simple Cloudflare AI Engine wrapper for Workers.
 *  - Uses fetch (available in Workers).
 *  - Reads CF_ACCOUNT_ID and CF_AI_TOKEN from Secrets.
 *  - Enforces per‑request call limit (maxCalls) and token cap (max_tokens <= 100).
 */
export class SimpleAIEngine {
  constructor({ maxCalls = 5, env = {} } = {}) {
    this.maxCalls = maxCalls;
    this.callsMade = 0;
    this.accountId = env.CF_ACCOUNT_ID;
    this.token = env.CF_AI_TOKEN;
    if (!this.accountId || !this.token) {
      console.warn('CF_ACCOUNT_ID or CF_AI_TOKEN not set – AI calls will fail.');
    }
  }

  async call(config, _opts = {}) {
    if (config.max_tokens && config.max_tokens > 100) {
      throw new Error('Token request exceeds safe limit (100).');
    }
    if (this.callsMade >= this.maxCalls) {
      throw new Error('Demo AI call limit reached.');
    }
    this.callsMade++;
    const model = config.model || 'text-davinci-003';
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${model}`;
    const body = {
      prompt: config.prompt || '',
      max_tokens: config.max_tokens,
      temperature: config.temperature,
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`AI request failed: ${resp.status} ${txt}`);
    }
    const data = await resp.json();
    return data.result?.response ?? data;
  }
}
