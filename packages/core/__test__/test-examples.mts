// Test runner for the 6 production examples.
//
// Loads each example, drives a few inputs, and reports any
// errors. Run with: `npx tsx packages/core/__test__/test-examples.mts`

import { QuiltEngine, parseSheet, type CellDef } from '@quilt/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ExampleSpec {
  name: string;
  file: string;
  // Inputs to push before reading
  seeds?: [string, unknown][];
}

const EXAMPLES: ExampleSpec[] = [
  {
    name: 'weather-monitor',
    file: 'examples/weather-monitor/sheet.yaml',
  },
  {
    name: 'chat-router',
    file: 'examples/chat-router/sheet.yaml',
    seeds: [['input.message', 'How does photosynthesis work?']],
  },
  {
    name: 'ab-test-router',
    file: 'examples/ab-test-router/sheet.yaml',
  },
  {
    name: 'iot-dashboard',
    file: 'examples/iot-dashboard/sheet.yaml',
  },
  {
    name: 'rate-limiter',
    file: 'examples/rate-limiter/sheet.yaml',
    seeds: [['clock.now', 5000]],
  },
  {
    name: 'task-scheduler',
    file: 'examples/task-scheduler/sheet.yaml',
    seeds: [
      ['task.daily_summary.next_run_at', 100],
      ['task.backup.next_run_at', 50],
      ['clock.now', 1000],
    ],
  },
];

async function runExample(spec: ExampleSpec): Promise<{ ok: number; err: number }> {
  const yamlPath = join('/workspace/quilt', spec.file);
  const yaml = readFileSync(yamlPath, 'utf8');
  const sheet = parseSheet(yaml);
  const engine = new QuiltEngine(sheet.id);
  engine.loadSheet(sheet);

  for (const [id, value] of spec.seeds ?? []) {
    await engine.set(id, value);
  }

  let ok = 0;
  let err = 0;
  for (const cell of engine.listCells()) {
    try {
      const v = await engine.get(cell.id);
      if (v.error) {
        err++;
        console.log(`  ✗ ${cell.id} (${cell.def.kind}): ${v.error.message}`);
      } else {
        ok++;
      }
    } catch (e) {
      err++;
      console.log(`  ✗ ${cell.id} (${cell.def.kind}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { ok, err };
}

async function main() {
  let totalOk = 0;
  let totalErr = 0;
  for (const spec of EXAMPLES) {
    console.log(`\n=== ${spec.name} ===`);
    const { ok, err } = await runExample(spec);
    console.log(`  ${ok} ok, ${err} err`);
    totalOk += ok;
    totalErr += err;
  }
  console.log(`\n${totalOk} ok, ${totalErr} err across ${EXAMPLES.length} examples`);
  if (totalErr > 0) process.exit(1);
}

main().catch((e) => {
  console.error('runner failed:', e);
  process.exit(1);
});
