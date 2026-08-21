import { QuiltEngine } from '../packages/core/dist/index.js';
import fs from 'fs';
import path from 'path';

const sheetPath = path.resolve(__dirname, 'demo_sheet.json');
const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));

const engine = new QuiltEngine({ tracing: true });
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
