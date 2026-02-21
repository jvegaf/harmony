import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    // AIDEV-NOTE: ESM-only packages must NOT be externalized — Vite bundles them into CJS output.
    // Without this, Electron's require() fails with ERR_REQUIRE_ESM at runtime.
    plugins: [externalizeDepsPlugin({ exclude: ['p-limit', 'uuid', 'globby', 'html-minifier-terser'] })],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
      },
    },
    build: {
      rollupOptions: {
        // AIDEV-NOTE: Include workers as separate entry points
        // This ensures they get compiled alongside the main process bundle
        input: {
          index: resolve('src/main/index.ts'),
          'analysis-worker': resolve('src/main/lib/audio-analysis/analysis-worker.ts'),
          'sync-worker': resolve('src/main/lib/traktor/sync/sync-worker.ts'),
          'export-worker': resolve('src/main/lib/traktor/sync/export-worker.ts'),
          'tagger-worker': resolve('src/main/lib/tagger/worker/tagger-worker.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@preload': resolve('src/preload'),
      },
    },
    plugins: [react()],
  },
});
