import react from '@vitejs/plugin-react';
import { UserConfig, ConfigEnv } from 'vite';
import { join } from 'path';
import { viteCommonjs, esbuildCommonjs } from '@originjs/vite-plugin-commonjs';

const srcRoot = join(__dirname, 'src');

export default ({ command }: ConfigEnv): UserConfig => {
  // DEV
  if (command === 'serve') {
    return {
      root: srcRoot,
      base: '/',
      plugins: [viteCommonjs(), react()],
      resolve: {
        alias: {
          '/@': srcRoot
        }
      },
      build: {
        outDir: join(srcRoot, '/out'),
        emptyOutDir: true,
        rollupOptions: {}
      },
      server: {
        port: process.env.PORT === undefined ? 3000 : +process.env.PORT
      },
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            // Solves:
            // https://github.com/vitejs/vite/issues/5308
            // add the name of your package
            esbuildCommonjs(['electron-log'])
          ]
        },
        exclude: ['path']
      }
    };
  }
  // PROD
  return {
    root: srcRoot,
    base: './',
    plugins: [viteCommonjs(), react()],
    resolve: {
      alias: {
        '/@': srcRoot
      }
    },
    build: {
      outDir: join(srcRoot, '/out'),
      emptyOutDir: true,
      rollupOptions: {}
    },
    server: {
      port: process.env.PORT === undefined ? 3000 : +process.env.PORT
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [
          // Solves:
          // https://github.com/vitejs/vite/issues/5308
          // add the name of your package
          esbuildCommonjs(['electron-log'])
        ]
      },
      exclude: ['path']
    }
  };
};
