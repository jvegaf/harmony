import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    // AIDEV-NOTE: ESM-only packages must NOT be externalized — Vite bundles them into CJS output.
    // Without this, Electron's require() fails with ERR_REQUIRE_ESM at runtime.
    //
    // electron-log MUST be externalized to prevent bundling 'electron' module into workers.
    // Workers run in worker_threads without access to Electron APIs.
    plugins: [
      externalizeDepsPlugin({
        exclude: ['p-limit', 'uuid', 'globby', 'html-minifier-terser'],
        // Force externalize electron-log to avoid bundling 'electron' into worker threads
        include: ['electron-log'],
      }),
    ],
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
        output: {
          // AIDEV-NOTE: Prevent electron-log from being required in worker threads
          // Force tagger dependencies to inline in worker, not shared chunks
          manualChunks(id, { getModuleInfo }) {
            // Inline ALL tagger dependencies into the tagger-worker to avoid
            // loading shared chunks that contain electron-log (which requires 'electron')
            const moduleInfo = getModuleInfo(id);
            if (moduleInfo) {
              // Check if this module is imported by tagger-worker
              const importers = Array.from(moduleInfo.importers || []);
              const isUsedByTaggerWorker = importers.some(
                imp =>
                  imp.includes('tagger-worker') ||
                  imp.includes('tagger/worker/') ||
                  imp.includes('tagger/beatport/') ||
                  imp.includes('tagger/traxsource/') ||
                  imp.includes('tagger/bandcamp/'),
              );

              if (isUsedByTaggerWorker && !id.includes('node_modules')) {
                // Don't create separate chunk - inline into tagger-worker
                return;
              }
            }
          },
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
