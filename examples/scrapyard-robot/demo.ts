/**
 * Scrapyard Robot Demo
 *
 * Loads the scrapyard-robot sheet, drives a simulated ultrasonic sensor toward
 * and away from a wall, and prints — every tick — what the robot does AND why.
 * The `explain.why` cell is the star: a robot that narrates its own reasons, the
 * "ledger of cause" proposed in COORDINATION_WITH_SCRAPCRAFT.md.
 *
 * Run:  npx tsx examples/scrapyard-robot/demo.ts
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { QuiltEngine, parseSheet } from '@quilt/core';

async function main() {
  const source = await readFile(resolve('examples/scrapyard-robot/sheet.yaml'), 'utf8');
  const sheet = parseSheet(source);
  const engine = new QuiltEngine(sheet.id);
  engine.loadSheet(sheet);

  console.log('🤖 Scrapyard Robot — Live Demo');
  console.log('─'.repeat(72));
  console.log('A wall-avoiding tile-brain, as a Quilt sheet. It says WHY every tick.\n');

  // A wall the robot approaches, then backs away from: distance dips toward 0,
  // then recovers. (0.0 = touching, 1.0 = clear.)
  const track = [0.9, 0.7, 0.5, 0.34, 0.29, 0.18, 0.06, 0.22, 0.45, 0.8];
  const ctx = () => ({ row: 'robot-1', timestamp: Date.now() });

  for (let i = 0; i < track.length; i++) {
    const dist = track[i];
    await engine.push('sensor.distance_ahead', dist);
    await engine.push('sensor.line_under', 0);

    const status = await engine.get('status.line', ctx());
    const cmd = await engine.call('brain.command', undefined, ctx());
    const why = await engine.call('explain.why', undefined, ctx());
    const pred = await engine.call('predict.next', undefined, ctx());

    const action = (cmd.data as { action?: string })?.action ?? '—';
    const nextNote = (pred.data as { note?: string })?.note ?? '';
    console.log(`t=${i}  dist=${dist.toFixed(2)}  [${String(status.data)}]  action=${action}`);
    console.log(`      why: ${why.data}`);
    console.log(`      →   ${nextNote}\n`);
  }

  console.log('✓ Demo complete.');
  console.log('  Try editing cfg.wall_threshold in sheet.yaml and re-running —');
  console.log('  the whole decision graph, and every "why", updates with it.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
