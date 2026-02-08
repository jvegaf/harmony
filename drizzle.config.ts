import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/lib/db/schema.ts',
  out: './drizzle',
});
