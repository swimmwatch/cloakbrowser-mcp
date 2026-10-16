import { availableParallelism } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workerConfiguration } from '#scripts/testing/worker-configuration';

vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>();
  return { ...original, availableParallelism: vi.fn() };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(availableParallelism).mockReset();
});

describe('test worker policy', () => {
  const localCases = [
    [1, 1],
    [2, 2],
    [4, 4],
    [24, 4],
  ];
  it.each(localCases)(
    'limits local workers with %i available CPUs to %i processes',
    (available, expected) => {
      vi.stubEnv('CI', undefined);
      vi.mocked(availableParallelism).mockReturnValue(available);
      const configuration = workerConfiguration();
      const expectedConfiguration = { pool: 'forks', maxWorkers: expected, fileParallelism: true };
      expect(configuration).toEqual(expectedConfiguration);
      expect(availableParallelism).toHaveBeenCalledOnce();
    },
  );

  const ciValues = ['true', '1'];
  const ciCapacities = [2, 24];
  it.each(ciValues)('uses all available CPUs when CI=%s', (ci) => {
    vi.stubEnv('CI', ci);
    for (const available of ciCapacities) {
      vi.mocked(availableParallelism).mockReturnValue(available);
      const configuration = workerConfiguration();
      expect(configuration.maxWorkers).toBe(available);
    }
  });

  const nonCiValues = ['false', '0', ''];
  it.each(nonCiValues)('keeps the local cap when CI=%s', (ci) => {
    vi.stubEnv('CI', ci);
    vi.mocked(availableParallelism).mockReturnValue(24);
    const configuration = workerConfiguration();
    expect(configuration.maxWorkers).toBe(4);
  });
});
