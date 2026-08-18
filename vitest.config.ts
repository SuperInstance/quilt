import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/test/**/*.test.mts',
      'packages/*/src/**/*.test.mts',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/target/**',
      '**/examples/**',
      'packages/tui/**', // tui uses node:test, run via `npm test` in that package
    ],
  },
});
