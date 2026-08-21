import { QuiltEngine } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sheetPath = path.resolve(__dirname, 'demo_sheet.json');
const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

import { SimpleAIEngine } from './simple_ai_engine.js';
const aiEngine = new SimpleAIEngine({ maxCalls: 5 });
const engine = new QuiltEngine({ tracing: true, ai: aiEngine });
engine.loadSheet(sheet);

(async () => {
  const staticVal = await engine.get('static_val');
  console.log('static_val =', staticVal.data);

  const double = await engine.get('double');
  console.log('double =', double.data);

  const api = await engine.get('api_call');
  console.log('api_call =', api.data);

  const prog = await engine.get('prog');
  console.log('prog =', prog.data);

  const router = await engine.get('router');
  console.log('router =', router.data);

  const ai = await engine.get('ai_cell');
  console.log('ai_cell =', ai.data, 'status', ai.status);
})();
