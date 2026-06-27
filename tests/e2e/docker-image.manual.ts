import { afterEach, describe, it } from 'vitest';
import {
  cleanupDistributionE2e,
  createDockerDistributionCommand,
  expectDistributionStdioBridge,
} from './distributionHarness.js';

afterEach(() => {
  cleanupDistributionE2e();
});

describe('Docker image distribution E2E', () => {
  it('runs the Docker image as a stdio MCP bridge and forwards every fake upstream tool', async () => {
    await expectDistributionStdioBridge(createDockerDistributionCommand());
  });
});
