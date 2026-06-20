import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
