import type { Config } from 'drizzle-kit';

export default {
  schema: './dist/schema/index.js',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/capture',
  },
} satisfies Config;
