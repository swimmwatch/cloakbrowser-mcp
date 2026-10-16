import type { InlineConfig } from 'vitest/node';
import SafeAllureReporter from './allure-reporter.js';

export interface ReportOptions {
  root: string;
  runId: string;
  producerId: string;
  suite:
    | 'unit'
    | 'integration'
    | 'cli'
    | 'npm'
    | 'cdp'
    | 'docker'
    | 'proxy-geoip'
    | 'extensions'
    | 'lifecycle'
    | 'console'
    | 'docker-cdp';
  secretValues: string[];
  splitLevels?: boolean;
  lane?: string;
  browser?: string;
}

/** Reporting is opt-in; the default test selection and reporters stay unchanged. */
export function reportConfiguration(): Pick<InlineConfig, 'reporters'> {
  const encoded = process.env.CLOAK_TEST_REPORT_OPTIONS;
  if (!encoded) return {};
  const options = JSON.parse(encoded) as ReportOptions;
  const reporter = new SafeAllureReporter(options);
  return { reporters: ['default', reporter] };
}
