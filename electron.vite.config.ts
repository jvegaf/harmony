import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// AIDEV-NOTE: Custom Rollup plugin to stub node:sqlite calls
// Undici (cheerio dependency) tries to require('node:sqlite') which doesn't exist in Electron's Node.js
// This plugin replaces all require calls with a stub that throws the expected error code
function nodeSqliteStub() {
  return {
    name: 'node-sqlite-stub',
    transform(code, id) {
      // Only apply to undici's runtime-features.js or bundled code containing it
      if (id.includes('undici') || code.includes('node:sqlite')) {
        const replaced = code.replace(
          /require\(['"]node:sqlite['"]\)/g,
          `(() => { const e = new Error('No such built-in module: node:sqlite'); e.code = 'ERR_UNKNOWN_BUILTIN_MODULE'; throw e; })()`,
        );
        return replaced !== code ? replaced : null;
      }
      return null;
    },
  };
}

export default defineConfig({
  main: {
    // AIDEV-NOTE: ESM-only packages must NOT be externalized — Vite bundles them into CJS output.
    // Without this, Electron's require() fails with ERR_REQUIRE_ESM at runtime.
    // Additionally, packages with complex transitive dependency trees are bundled to avoid
    // electron-builder's failure to include nested node_modules in the .asar archive.
    // See AGENTS.md for full rationale.
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          // ESM-only packages (no CJS fallback):
          'p-limit',
          'uuid',
          'globby',
          'html-minifier-terser',
          'cheerio',
          'queue',
          // Packages with complex transitive dependency trees (200+ nested deps):
          'axios',
          'bandcamp-fetch',
          'googlethis',
          'youtube-music-api',
          'soundcloud.ts',
          'music-metadata',
          'electron-store',
          'async-g-i-s',
          // ESM packages safer to bundle:
          'fast-xml-parser',
          'date-fns',
          // WASM/binary packages that benefit from bundling:
          'essentia.js',
          'node-wav',
          // Packages with nested node_modules version conflicts:
          'node-id3',
        ],
      }),
      nodeSqliteStub(),
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
