import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { reportConfiguration } from '#scripts/testing/report-configuration';
import { workerConfiguration } from '#scripts/testing/worker-configuration';
export default (() => {
  const uRL = new URL('./src', import.meta.url);
  const fileURLToPathResult = fileURLToPath(uRL);
  const uRL2 = new URL('./tests', import.meta.url);
  const fileURLToPathResult2 = fileURLToPath(uRL2);
  const options = {
    '@': fileURLToPathResult,
    '@tests': fileURLToPathResult2,
  } as const;
  const options2 = {
    alias: options,
  } as const;
  const options3: import('vitest/node').InlineConfig | undefined = {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    ...workerConfiguration(),
    ...reportConfiguration(),
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/cli.ts', 'src/index.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
        branches: 75,
      },
    },
  };
  const defineConfigOptions: import('vite').UserConfig = {
    resolve: options2,
    test: options3,
  };
  return defineConfig(defineConfigOptions);
})();
