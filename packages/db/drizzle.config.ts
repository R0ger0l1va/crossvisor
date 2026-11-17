import { defineConfig } from 'drizzle-kit';

// drizzle-kit se ejecuta desde packages/db; el .env vive en la raíz del monorepo.
process.loadEnvFile?.('../../.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
