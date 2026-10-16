import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanupDistributionE2e, createTempRoot } from '@tests/e2e/distributionHarness.js';

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  chmodSync: vi.fn(),
  mkdtempSync: vi.fn(),
  rmSync: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

it('retries transient filesystem locks and attempts every owned root before reporting a failure', () => {
  const temporary = tmpdir();
  const first = path.join(temporary, 'synthetic-first');
  const second = path.join(temporary, 'synthetic-second');
  vi.mocked(mkdtempSync).mockReturnValueOnce(first).mockReturnValueOnce(second);
  createTempRoot('first-');
  createTempRoot('second-');
  const denied = new Error('Controlled removal failure');
  vi.mocked(rmSync).mockImplementationOnce(() => {
    throw denied;
  });
  expect(() => cleanupDistributionE2e()).toThrow(AggregateError);
  const options = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 } as const;
  expect(rmSync).toHaveBeenNthCalledWith(1, first, options);
  expect(rmSync).toHaveBeenNthCalledWith(2, second, options);
  expect(chmodSync).toHaveBeenCalledTimes(2);
  cleanupDistributionE2e();
  expect(rmSync).toHaveBeenNthCalledWith(3, first, options);
  cleanupDistributionE2e();
  expect(rmSync).toHaveBeenCalledTimes(3);
});
