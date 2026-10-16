import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileSeedFileName, readOrCreateProfileSeed } from '@/bridge/profile-seed.js';

const { waitForWriter } = vi.hoisted(() => ({ waitForWriter: vi.fn() }));
vi.mock('node:timers/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:timers/promises')>()),
  setTimeout: waitForWriter,
}));
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  waitForWriter.mockReset();
  const options = { recursive: true, force: true };
  const closing = roots.splice(0).map((root) => rm(root, options));
  await Promise.all(closing);
});
describe('seed publication by an external wrapper', () => {
  it('waits for an empty exclusively created file and preserves the completed identity', async () => {
    const prefix = path.join(tmpdir(), 'cloak-seed-publication-');
    const root = await mkdtemp(prefix);
    roots.push(root);
    const file = path.join(root, profileSeedFileName);
    await writeFile(file, '');
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    // Complete the external write only after the reader detects its empty file.
    waitForWriter.mockImplementationOnce(async () => {
      await writeFile(file, '12345\n');
    });
    const seed = await readOrCreateProfileSeed(root);
    expect(seed).toBe(12345);
    expect(waitForWriter).toHaveBeenCalledExactlyOnceWith(50);
    expect(stderr).not.toHaveBeenCalled();
    const content = await readFile(file, 'utf8');
    expect(content).toBe('12345\n');
    const entries = await readdir(root);
    const expected = [profileSeedFileName];
    expect(entries).toEqual(expected);
  });
});
