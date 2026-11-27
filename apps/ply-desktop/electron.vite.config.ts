import { cp, rm } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { basename, extname, resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import { desktopWorkers } from './src/core/manifests/node/workers';

function desktopWorkerBuildInputs(): Record<string, string> {
  return Object.fromEntries(
    Object.values(desktopWorkers).map((worker) => [
      basename(worker.file, extname(worker.file)),
      resolve(worker.entry),
    ])
  );
}

function copyAdapterAssetsPlugin() {
  return {
    name: 'copy-plugin-adapter-assets',
    async closeBundle(): Promise<void> {
      const source = resolve('../../packages/plugins/dist/adapters');
      const target = resolve('out/main/adapters');
      try {
        await rm(target, { recursive: true, force: true });
        await cp(source, target, { recursive: true });
      } catch (error) {
        if (isNodeError(error) && error.code === 'ENOENT') return;
        throw error;
      }
    },
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function runtimeDependenciesPlugin(): Plugin {
  return {
    name: 'desktop-runtime-dependencies',
    generateBundle(_options, bundle) {
      const packages = new Set<string>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const specifier of [...chunk.imports, ...chunk.dynamicImports]) {
          if (specifier in bundle || isBuiltin(specifier) || specifier === 'electron') continue;
          if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
          const segments = specifier.split('/');
          packages.add(segments.slice(0, specifier.startsWith('@') ? 2 : 1).join('/'));
        }
      }
      this.emitFile({
        type: 'asset',
        fileName: 'runtime-dependencies.json',
        source: JSON.stringify([...packages].sort()),
      });
    },
  };
}

// Workspace packages must be bundled (not externalized) in main/preload builds:
// externalized modules are resolved by Node at runtime, where the `development`
// export condition is off, so dev runs would silently load stale dists.
const workspacePackages = [
  '@ply/chat-ui',
  '@ply/core',
  '@ply/plugins',
  '@ply/shared',
  '@ply/theme',
  '@ply/ui',
  '@ply/wire',
];

export default defineConfig({
  main: {
    root: 'src/main',
    envDir: resolve('.'),
    plugins: [copyAdapterAssetsPlugin(), runtimeDependenciesPlugin()],
    // formidable (bundled via @ply/plugins -> asana) reassigns `require`
    // behind a `global.GENTLY` guard, which Rollup rejects. Defining it false
    // makes the branch dead code so the bundle builds.
    define: {
      'global.GENTLY': 'false',
    },
    build: {
      // Packagers include all of out/, so removed modules must leave no old chunks behind.
      emptyOutDir: true,
      externalizeDeps: {
        exclude: workspacePackages,
      },
      rollupOptions: {
        input: {
          index: resolve('src/entry/main.ts'),
          ...desktopWorkerBuildInputs(),
        },
        output: {
          entryFileNames: '[name].js',
          // Windows packaged launches fail in Electron's legacy ESM main resolver for ssh2.
          // Address its real entry directly, retaining the package layout for agent helpers
          // and optional native crypto instead of relocating them into a bundled chunk.
          paths: { ssh2: 'ssh2/lib/index.js' },
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@core': resolve('src/core'),
        '@main': resolve('src/main'),
        '@root': resolve('.'),
      },
    },
  },
  preload: {
    root: 'src/entry',
    plugins: [runtimeDependenciesPlugin()],
    build: {
      emptyOutDir: true,
      externalizeDeps: {
        exclude: workspacePackages,
      },
      rollupOptions: {
        input: {
          index: resolve('src/entry/preload.ts'),
        },
      },
    },
    resolve: {
      alias: {
        '@root': resolve('.'),
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react(), tailwindcss()],
    build: { emptyOutDir: true },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@core': resolve('src/core'),
        '@renderer': resolve('src/renderer'),
        '@root': resolve('.'),
        // cli-agent-plugins metadata/icons chunks transitively reference node:buffer
        // (through hook-config helpers bundled in the same tsdown chunk), even though
        // those helpers never run in the renderer. Alias to the browser-safe polyfill.
        'node:buffer': 'buffer',
      },
    },
    server: {
      port: 3000,
    },
  },
});
