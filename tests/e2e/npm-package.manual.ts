import { afterEach, describe, it } from 'vitest';
import {
  cleanupDistributionE2e,
  expectDistributionStdioBridge,
  packAndInstallCurrentPackage,
} from './distributionHarness.js';

afterEach(() => {
  cleanupDistributionE2e();
});

describe('npm package distribution E2E', () => {
  it('runs the installed package as a stdio MCP bridge and forwards every fake upstream tool', async () => {
    await expectDistributionStdioBridge(packAndInstallCurrentPackage());
  });
});
