import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { reportConfiguration } from '../../../scripts/testing/report-configuration.js';

const reporting = process.env.REPORT_PROBE_CASE === 'no-reporter' ? {} : reportConfiguration();
const include =
  process.env.REPORT_PROBE_CASE === 'empty'
    ? ['tests/fixtures/reporting/absent.fixture.ts']
    : ['tests/fixtures/reporting/cases.fixture.ts'];
const testsUrl = new URL('../..', import.meta.url);
const testsPath = fileURLToPath(testsUrl);
const alias = { '@tests': testsPath };
const config = {
  resolve: { alias },
  test: {
    include,
    ...reporting,
    maxWorkers: 1,
    testTimeout: 2000,
    hookTimeout: 2000,
  },
};
export default defineConfig(config);
