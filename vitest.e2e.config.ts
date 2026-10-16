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
    include: ['tests/e2e/**/*.test.ts'],
    ...workerConfiguration(),
    ...reportConfiguration(),
    environment: 'node',
    testTimeout: 20000,
    hookTimeout: 20000,
  };
  const defineConfigOptions: import('vite').UserConfig = {
    resolve: options2,
    test: options3,
  };
  return defineConfig(defineConfigOptions);
})();
