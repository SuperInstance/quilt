import { defineConfig } from 'vitest/config';

// Package-local config so `npm run test --workspaces` (which runs `vitest run`
// from packages/core) discovers this package's tests. The repo-root
// vitest.config.ts globs all packages when vitest is run from the root.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.mts', 'src/**/*.test.mts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/examples/**'],
  },
});
