import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jvegaf.github.io',
  base: '/harmony/',
  build: {
    assets: '_assets',
  },
});
