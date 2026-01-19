import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@main': resolve('src/main'),
        '@preload': resolve('src/preload'),
      },
    },
    build: {
      rollupOptions: {
        // AIDEV-NOTE: Include the analysis worker as a separate entry point
        // This ensures it gets compiled alongside the main process bundle
        input: {
          index: resolve('src/main/index.ts'),
          'analysis-worker': resolve('src/main/lib/audio-analysis/analysis-worker.ts'),
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
