import { availableParallelism } from 'node:os';
import type { InlineConfig } from 'vitest/node';

const localWorkerLimit = 4;

/** Configure isolated worker processes using the CPU capacity available to Node.js. */
export function workerConfiguration(): Pick<InlineConfig, 'pool' | 'maxWorkers' | 'fileParallelism'> {
  const availableWorkers = availableParallelism();
  const isCi = process.env.CI === 'true' || process.env.CI === '1';
  const maxWorkers = isCi ? availableWorkers : Math.min(localWorkerLimit, availableWorkers);
  return { pool: 'forks', maxWorkers, fileParallelism: true };
}
