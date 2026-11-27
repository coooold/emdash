import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'better-sqlite3': resolve(
        __dirname,
        '../../apps/ply-desktop/tooling/node-deps/node_modules/better-sqlite3'
      ),
    },
  },
  test: {
    // These suites spawn real Git/PTY subprocesses; avoid oversubscribing the host.
    maxWorkers: 4,
    environment: 'node',
    setupFiles: [resolve(__dirname, '../../tooling/vitest/setup-isolated-home.mjs')],
    include: ['**/*.test.ts', '**/*.test.tsx'],
  },
});
