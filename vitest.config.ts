import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      database: resolve(__dirname, 'packages/database/src/index.ts'),
      llm: resolve(__dirname, 'packages/llm/src/index.ts'),
      types: resolve(__dirname, 'packages/types/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
  },
});
