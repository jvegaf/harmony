/* eslint-disable import/no-extraneous-dependencies */
import { builtinModules } from 'module';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import chalk from 'chalk';
import Electron from 'vite-plugin-electron';
import EnvironmentPlugin from 'vite-plugin-environment';
import React from '@vitejs/plugin-react';
import TsConfigPaths from 'vite-tsconfig-paths';
import { port } from '../DevConfig.json';

// eslint-disable-next-line no-console
console.log(`${chalk.whiteBright.bold(' ✨ Start')} ${chalk.green.bold('Hacking...👨‍💻')}`);

export default defineConfig({
  base: './',
  clearScreen: false,
  publicDir: resolve('./src/renderer/public'),
  root: resolve('./src/renderer'),
  server: {
    port,
  },
  build: {
    assetsDir: '',
    outDir: resolve('./app/dist/renderer'),
  },
  plugins: [
    React(),
    EnvironmentPlugin('all', { prefix: '' }),
    TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] }),
    Electron({
      entry: [resolve('src/main/main.ts'), resolve('src/main/preload.ts')],
      onstart: (options) => {
        options.startup(['.', '--inspect=5858', '--remote-debugging-port=9227']);
      },
      vite: {
        build: {
          assetsDir: '',
          outDir: resolve('./app/dist/main'),
          rollupOptions: { external: ['electron', ...builtinModules] },
        },
        plugins: [
          EnvironmentPlugin('all', { prefix: '' }),
          TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] }),
        ],
      },
    }),
  ],
});
