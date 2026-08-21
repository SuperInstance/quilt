import { QuiltEngine } from '../quilt_core/index.js';
import { SimpleAIEngine } from './simple_ai_engine.js';
import sheetData from './demo_sheet.json';


// Rate limit per IP using KV namespace USAGE
const VISIT_LIMIT = 5; // max AI calls per visitor per day

export default {
  async fetch(request, env) {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const kv = env.USAGE;
    const key = `visits:${ip}`;
    const countStr = await kv.get(key);
    const count = countStr ? parseInt(countStr) : 0;
    if (count >= VISIT_LIMIT) {
      return new Response('Rate limit exceeded. Try again later.', { status: 429 });
    }
    // Increment counter (expire in 24h)
    await kv.put(key, (count + 1).toString(), { expirationTtl: 86400 });

    const aiEngine = new SimpleAIEngine({ maxCalls: VISIT_LIMIT, env });
    const engine = new QuiltEngine({ tracing: false, ai: aiEngine });
    engine.loadSheet(sheetData);
    // Evaluate all cells and return results as JSON
    const results = {};
    for (const cell of sheetData.cells) {
      const res = await engine.get(cell.id);
      results[cell.id] = { data: res.data, status: res.status };
    }
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
