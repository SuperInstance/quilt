// End-to-end tests for the 6 production examples.
//
// Loads each example, drives a few inputs, and asserts no cell
// ends up in an error state. This is the "beta test" that
// validates the engine handles real-world sheets.

import { describe, it, expect } from 'vitest';
import { QuiltEngine, parseSheet } from '@quilt/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/workspace/quilt';

interface ExampleSpec {
  name: string;
  file: string;
  seeds?: Array<[string, unknown]>;
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

describe('production examples', () => {
  for (const spec of EXAMPLES) {
    it(`${spec.name} loads and evaluates end-to-end`, async () => {
      const yamlPath = join(REPO, spec.file);
      const yaml = readFileSync(yamlPath, 'utf8');
      const sheet = parseSheet(yaml);
      const engine = new QuiltEngine(sheet.id);
      engine.loadSheet(sheet);

      for (const [id, value] of spec.seeds ?? []) {
        await engine.set(id, value);
      }

      const errors: string[] = [];
      for (const cell of engine.listCells()) {
        try {
          const v = await engine.get(cell.id);
          if (v.error) {
            errors.push(`${cell.id}: ${v.error.message}`);
          }
        } catch (e) {
          errors.push(`${cell.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      expect(errors, `cells in error state: ${errors.join('; ')}`).toEqual([]);
    });
  }
});
