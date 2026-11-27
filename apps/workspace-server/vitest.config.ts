import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // These suites spawn real Git/PTY subprocesses; avoid oversubscribing the host.
    maxWorkers: 4,
    environment: 'node',
    setupFiles: [resolve(__dirname, '../../tooling/vitest/setup-isolated-home.mjs')],
    include: ['**/*.test.ts'],
  },
});
