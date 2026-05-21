import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const includeRealBrowserTests = process.env.CLOAKBROWSER_MCP_REAL_BROWSER === '1';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: includeRealBrowserTests
      ? ['tests/**/*.test.ts']
      : ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'tests/contract/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/cli.ts',
        'src/index.ts',
        'src/browser/cloakAdapter.ts',
        'src/tools/index.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 75,
      },
    },
  },
});
