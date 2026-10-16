import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { resolveFreeBrowserExecutable } from '@tests/helpers/browser-test-runtime.js';

const { binaryInfo, execute } = vi.hoisted(() => ({ binaryInfo: vi.fn(), execute: vi.fn() }));
vi.mock('cloakbrowser', () => ({ binaryInfo }));
vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  const execFile = Object.assign(vi.fn(), { [Symbol.for('nodejs.util.promisify.custom')]: execute });
  return { ...original, execFile };
});
const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  const options = { recursive: true, force: true };
  for (const root of roots.splice(0)) await rm(root, options);
});
async function fixture() {
  const directory = tmpdir();
  const prefix = path.join(directory, 'cloak-free-resolution-');
  const root = await mkdtemp(prefix);
  roots.push(root);
  const cache = path.join(root, 'personal', 'chromium-1.2.3');
  binaryInfo.mockReturnValue({ cacheDir: cache, installed: false, tier: 'free' });
  vi.stubEnv('CLOAKBROWSER_BINARY_PATH', undefined);
  return { root, cache };
}
it('downloads into an owned cache when the caller cache does not exist without inheriting license settings', async () => {
  const { root } = await fixture();
  vi.stubEnv('CLOAKBROWSER_LICENSE_KEY', 'synthetic-license');
  vi.stubEnv('CLOAKBROWSER_DOWNLOAD_URL', 'https://synthetic.invalid');
  vi.stubEnv('CLOAKBROWSER_RELEASE_CHANNEL', 'preview');
  const result = { executable: process.execPath, version: '1.2.3' };
  const stdout = JSON.stringify(result);
  execute.mockResolvedValue({ stdout, stderr: '' });
  const resolved = await resolveFreeBrowserExecutable(root);
  expect(resolved.version).toBe('1.2.3');
  const call = execute.mock.calls[0];
  expect(call?.[0]).toBe(process.execPath);
  const options = call?.[2] as { env: NodeJS.ProcessEnv; timeout: number };
  expect(options.env.CLOAKBROWSER_LICENSE_KEY).toBeUndefined();
  expect(options.env.CLOAKBROWSER_DOWNLOAD_URL).toBeUndefined();
  expect(options.env.CLOAKBROWSER_RELEASE_CHANNEL).toBeUndefined();
  const expectedCache = path.join(root, 'free-download');
  expect(options.env.CLOAKBROWSER_CACHE_DIR).toBe(expectedCache);
  expect(options.env.CLOAKBROWSER_AUTO_UPDATE).toBe('false');
  expect(options.timeout).toBe(180000);
});
it('reuses a verified cached Free binary without downloading', async () => {
  const { root, cache } = await fixture();
  const options = { recursive: true };
  await mkdir(cache, options);
  const executable = path.join(cache, 'chrome');
  await writeFile(executable, 'controlled fixture');
  binaryInfo.mockReturnValue({ cacheDir: cache, installed: true, tier: 'free', binaryPath: executable });
  const resolved = await resolveFreeBrowserExecutable(root);
  const canonicalExecutable = await realpath(executable);
  expect(resolved.executable).toBe(canonicalExecutable);
  expect(execute).not.toHaveBeenCalled();
});
it('rejects an unverified explicit override instead of silently replacing it', async () => {
  const { root } = await fixture();
  vi.stubEnv('CLOAKBROWSER_BINARY_PATH', process.execPath);
  const resolving = resolveFreeBrowserExecutable(root);
  await expect(resolving).rejects.toThrow('verified cached Free binary');
  expect(execute).not.toHaveBeenCalled();
});
it('preserves unexpected cache filesystem errors without falling back to download', async () => {
  const { root, cache } = await fixture();
  const parent = path.dirname(cache);
  await writeFile(parent, 'not a directory');
  const resolving = resolveFreeBrowserExecutable(root);
  await expect(resolving).rejects.toMatchObject({ code: 'ENOTDIR' });
  expect(execute).not.toHaveBeenCalled();
});
it('propagates download failures to prevent a silent E2E skip', async () => {
  const { root } = await fixture();
  const error = new Error('Controlled authenticated download failure');
  execute.mockRejectedValue(error);
  const resolving = resolveFreeBrowserExecutable(root);
  await expect(resolving).rejects.toThrow('authenticated download failure');
});
