import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { profileSeedFileName, readOrCreateProfileSeed } from '@/bridge/profile-seed.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';
const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function rootDirectory(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloak-profile-seed-');
  const root = mkdtempSync(joinedPath);
  roots.push(root);
  return root;
}
describe('persistent profile fingerprint seed', () => {
  it('publishes one complete identity across concurrent first callers and restarts', async () => {
    const root = rootDirectory();
    const fromOptions = { length: 8 } as const;
    const fromResult = Array.from(fromOptions, () => readOrCreateProfileSeed(root));
    const values = await Promise.all(fromResult);
    const argumentValue = new Set(values).size;
    expect(argumentValue).toBe(1);
    const joinedPath2 = path.join(root, profileSeedFileName);
    const fileSyncResult = readFileSync(joinedPath2, 'utf8');
    expect(fileSyncResult).toMatch(/^[1-9][0-9]{4}\n$/u);
    const orCreateProfileSeedResult = await readOrCreateProfileSeed(root);
    expect(orCreateProfileSeedResult).toBe(values[0]);
  });
  it('reuses seeds created by another wrapper independently for each profile', async () => {
    const first = rootDirectory();
    const second = rootDirectory();
    const joinedPath3 = path.join(first, profileSeedFileName);
    writeFileSync(joinedPath3, '12345\n');
    const joinedPath4 = path.join(second, profileSeedFileName);
    writeFileSync(joinedPath4, '98765\n');
    const orCreateProfileSeedResult2 = await readOrCreateProfileSeed(first);
    expect(orCreateProfileSeedResult2).toBe(12345);
    const orCreateProfileSeedResult3 = await readOrCreateProfileSeed(second);
    expect(orCreateProfileSeedResult3).toBe(98765);
  });
  const values2: readonly string[] = ['9999', '100000', '12345.5', 'not-a-seed'];
  it.each(values2)('replaces corrupt seed %s and warns on stderr', async (value) => {
    const root = rootDirectory();
    const joinedPath5 = path.join(root, profileSeedFileName);
    writeFileSync(joinedPath5, value);
    const stderr = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const seed = await readOrCreateProfileSeed(root);
    expect(seed).toBeGreaterThanOrEqual(10000);
    expect(seed).toBeLessThanOrEqual(99999);
    const receiverActual = stderr;
    const stringContainingResult = expect.stringContaining('Corrupt fingerprint seed file');
    expect(receiverActual).toHaveBeenCalledWith(stringContainingResult);
  });
  it('propagates seed read and publication failures', async () => {
    const root = rootDirectory();
    const joinedPath6 = path.join(root, profileSeedFileName);
    mkdirSync(joinedPath6);
    const orCreateProfileSeedResult4 = readOrCreateProfileSeed(root);
    await expect(orCreateProfileSeedResult4).rejects.toThrow();
    const joinedPath7 = path.join(root, 'missing');
    const orCreateProfileSeedResult5 = readOrCreateProfileSeed(joinedPath7);
    await expect(orCreateProfileSeedResult5).rejects.toThrow();
  });
  it('uses the stored seed in generated launch options and releases the profile between runs', async () => {
    const root = rootDirectory();
    const joinedPath8 = path.join(root, profileSeedFileName);
    writeFileSync(joinedPath8, '12345\n');
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const runtime = await prepareSeedRuntime(root);
      const filteredValues = runtime.config.browser?.launchOptions?.args?.filter((arg) =>
        arg.startsWith('--fingerprint='),
      );
      const receiver2Actual = filteredValues;
      const values3: string[] = ['--fingerprint=12345'];
      expect(receiver2Actual).toEqual(values3);
      runtime.dispose();
    }
  });
  const values4: readonly string[] = ['--fingerprint=54321', '--fingerprint=off'];
  it.each(values4)('preserves explicit %s without touching the seed', async (arg) => {
    const root = rootDirectory();
    const joinedPath9 = path.join(root, profileSeedFileName);
    writeFileSync(joinedPath9, 'corrupt-but-unused');
    const prepareSeedRuntimeOptions = { CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: arg } as const;
    const runtime = await prepareSeedRuntime(root, prepareSeedRuntimeOptions);
    try {
      expect(runtime.config.browser?.launchOptions?.args).toContain(arg);
      const joinedPath10 = path.join(root, profileSeedFileName);
      const fileSyncResult2 = readFileSync(joinedPath10, 'utf8');
      expect(fileSyncResult2).toBe('corrupt-but-unused');
    } finally {
      runtime.dispose();
    }
  });
  it('does not change profile identity when stealth is disabled', async () => {
    const root = rootDirectory();
    const joinedPath11 = path.join(root, profileSeedFileName);
    writeFileSync(joinedPath11, 'unused');
    const prepareSeedRuntimeOptions2 = { CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false' } as const;
    const runtime = await prepareSeedRuntime(root, prepareSeedRuntimeOptions2);
    try {
      const someResult = runtime.config.browser?.launchOptions?.args?.some((arg) =>
        arg.startsWith('--fingerprint='),
      );
      expect(someResult).toBe(false);
      const joinedPath12 = path.join(root, profileSeedFileName);
      const fileSyncResult3 = readFileSync(joinedPath12, 'utf8');
      expect(fileSyncResult3).toBe('unused');
    } finally {
      runtime.dispose();
    }
  });
  it('releases the profile lock after seed initialization fails', async () => {
    const root = rootDirectory();
    const joinedPath13 = path.join(root, profileSeedFileName);
    mkdirSync(joinedPath13);
    const prepareSeedRuntimeResult = prepareSeedRuntime(root);
    await expect(prepareSeedRuntimeResult).rejects.toThrow(
      'Unable to initialize the persistent profile fingerprint seed',
    );
    const joinedPath14 = path.join(root, profileSeedFileName);
    const rmSyncOptions2 = { recursive: true } as const;
    rmSync(joinedPath14, rmSyncOptions2);
    const runtime = await prepareSeedRuntime(root);
    runtime.dispose();
  });
  it('does not publish a seed for Playwright or for a session without an explicit profile', async () => {
    const root = rootDirectory();
    const prepareSeedRuntimeOptions3 = { PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright' } as const;
    const playwright = await prepareSeedRuntime(root, prepareSeedRuntimeOptions3);
    playwright.dispose();
    const joinedPath15 = path.join(root, profileSeedFileName);
    const existsSyncResult = existsSync(joinedPath15);
    expect(existsSyncResult).toBe(false);
    const prepareSeedRuntimeOptions4 = { PLAYWRIGHT_MCP_ISOLATED: 'true' } as const;
    const isolated = await prepareSeedRuntime(root, prepareSeedRuntimeOptions4, false);
    isolated.dispose();
    const joinedPath16 = path.join(root, profileSeedFileName);
    const existsSyncResult2 = existsSync(joinedPath16);
    expect(existsSyncResult2).toBe(false);
  });
});
function prepareSeedRuntime(root: string, overrides: Record<string, string> = {}, withProfile = true) {
  const prepareBridgeRuntimeOptions: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
    tempRoot: root,
    userDataDir: withProfile ? root : undefined,
    ensureCloakBinary: async () => fakeCloakBinaryPath,
    buildCloakLaunchOptions: async (options) => ({
      executablePath: fakeCloakBinaryPath,
      headless: true,
      args: options?.args,
    }),
    env: {
      PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'output'),
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      ...overrides,
    },
  };
  return prepareBridgeRuntime(prepareBridgeRuntimeOptions);
}
