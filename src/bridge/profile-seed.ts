import { systemErrorCodes } from '#src/runtime/systemErrorCodes';
import { randomInt, randomUUID } from 'node:crypto';
import { link, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
export const profileSeedFileName = '.cloakbrowser-seed';
const seedMin = 10000;
const seedMax = 99999;
/** Reuse CloakBrowser's profile identity while the caller owns the profile lock. */
export async function readOrCreateProfileSeed(userDataDir: string): Promise<number> {
  const file = path.join(userDataDir, profileSeedFileName);
  const existing = await readSeed(file);
  if (existing !== undefined) return existing;
  const message = `${profileSeedFileName}.${randomUUID()}.tmp`;
  const temporary = path.join(userDataDir, message);
  const computedValue = seedMax + 1;
  const templateValue = randomInt(seedMin, computedValue);
  const content = `${templateValue}\n`;
  try {
    const writeFileOptions = { flag: 'wx', mode: 0o600 } as const;
    await writeFile(temporary, content, writeFileOptions);
    await publishSeed(temporary, file, content);
  } finally {
    const rmOptions = { force: true } as const;
    await rm(temporary, rmOptions);
  }
  const seed = await readSeed(file);
  if (seed === undefined) throw new Error('Fingerprint seed publication did not produce a valid file');
  return seed;
}
async function publishSeed(temporary: string, file: string, content: string): Promise<void> {
  try {
    await link(temporary, file);
  } catch (error) {
    if (hasCode(error, systemErrorCodes.EEXIST)) return;
    if (
      ![
        systemErrorCodes.EPERM,
        systemErrorCodes.ENOTSUP,
        systemErrorCodes.EOPNOTSUPP,
        systemErrorCodes.ENOSYS,
        systemErrorCodes.EXDEV,
      ].some((code) => hasCode(error, code))
    )
      throw error;
    try {
      const writeFileOptions2 = { flag: 'wx', mode: 0o600 } as const;
      await writeFile(file, content, writeFileOptions2);
    } catch (writeError) {
      if (!hasCode(writeError, systemErrorCodes.EEXIST)) throw writeError;
    }
  }
}
async function readSeed(file: string): Promise<number | undefined> {
  let text: string;
  try {
    text = await readFile(file, 'latin1');
    // An external CloakBrowser wrapper may be publishing via exclusive create.
    for (let attempt = 0; text.length === 0 && attempt < 20; attempt += 1) {
      await setTimeout(50);
      text = await readFile(file, 'latin1');
    }
  } catch (error) {
    if (hasCode(error, systemErrorCodes.ENOENT)) return undefined;
    throw error;
  }
  const value = text.trim();
  const seed = Number(value);
  if (/^[0-9]+$/u.test(value) && Number.isInteger(seed) && seed >= seedMin && seed <= seedMax) return seed;
  process.stderr.write(
    '[cloakbrowser-mcp] Corrupt fingerprint seed file; generating a new profile identity\n',
  );
  const rmOptions2 = { force: true } as const;
  await rm(file, rmOptions2);
  return undefined;
}
function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
