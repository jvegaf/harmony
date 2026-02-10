import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/renderer/src/__tests__/setup.ts'],
    include: [
      'src/renderer/src/**/*.{test,spec}.{ts,tsx}',
      'src/main/lib/**/*.{test,spec}.{ts,tsx}',
      'src/preload/lib/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/renderer/src/**/*.{ts,tsx}', 'src/main/lib/**/*.ts', 'src/preload/lib/**/*.ts'],
      exclude: [
        'src/renderer/src/**/*.{test,spec}.{ts,tsx}',
        'src/renderer/src/**/*.d.ts',
        'src/renderer/src/main.tsx',
        'src/main/lib/**/*.{test,spec}.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@preload': resolve(__dirname, 'src/preload'),
      '@main': resolve(__dirname, 'src/main'),
    },
  },
});
