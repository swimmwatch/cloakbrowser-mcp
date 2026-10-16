import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createFreeBrowserRuntime,
  ownedProcessCommand,
  withCleanupDeadline,
} from '@tests/helpers/browser-test-runtime.js';

const executeFile = promisify(execFile);
const disposers: Array<() => Promise<void>> = [];
afterEach(async () => {
  vi.useRealTimers();
  for (const dispose of disposers.splice(0).reverse()) await dispose();
});

async function createRuntime(parentEnv: NodeJS.ProcessEnv = process.env) {
  const temporaryDirectory = tmpdir();
  const prefix = path.join(temporaryDirectory, 'cloak-free-runtime-');
  const root = await mkdtemp(prefix);
  const removal = { recursive: true, force: true };
  disposers.push(() => rm(root, removal));
  const options = { root, freeExecutable: process.execPath, parentEnv };
  const runtime = await createFreeBrowserRuntime(options);
  disposers.push(runtime.dispose);
  return runtime;
}

describe('owned Free browser test runtime', () => {
  it('fails a stalled cleanup at the shared deadline and forces only owned termination', async () => {
    vi.useFakeTimers();
    const force = vi.fn();
    const cleanup = () => new Promise<void>(() => {});
    const closing = withCleanupDeadline(cleanup, 'Controlled cleanup', force);
    const outcome = closing.then(
      () => ({ error: undefined }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(9999);
    expect(force).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const result = await outcome;
    expect(result.error).toBeInstanceOf(Error);
    const message = result.error instanceof Error ? result.error.message : '';
    expect(message).toBe('Controlled cleanup exceeded 10000ms');
    expect(force).toHaveBeenCalledTimes(1);
    const timers = vi.getTimerCount();
    expect(timers).toBe(0);
  });

  it('removes the deadline timer on successful and failed cleanup', async () => {
    vi.useFakeTimers();
    const force = vi.fn();
    const success = () => Promise.resolve('closed');
    const closed = await withCleanupDeadline(success, 'Controlled cleanup', force);
    expect(closed).toBe('closed');
    const failure = async () => {
      throw new Error('Controlled close error');
    };
    const rejected = withCleanupDeadline(failure, 'Controlled cleanup', force);
    await expect(rejected).rejects.toThrow('Controlled close error');
    expect(force).not.toHaveBeenCalled();
    const timers = vi.getTimerCount();
    expect(timers).toBe(0);
  });
  it('clears inherited license and browser selection before starting a child', async () => {
    const parentEnv = {
      ...process.env,
      CLOAKBROWSER_LICENSE_KEY: 'synthetic-test-license',
      CLOAKBROWSER_LICENSE_STATUS_FILE: '/synthetic/status',
      CLOAKBROWSER_CACHE_DIR: '/synthetic/personal-cache',
      CLOAKBROWSER_BINARY_PATH: '/synthetic/pro-browser',
      CLOAKBROWSER_RELEASE_CHANNEL: 'preview',
      CLOAKBROWSER_VERSION: '999.0.0.0',
      CLOAKBROWSER_DOWNLOAD_URL: 'https://synthetic.invalid',
      PLAYWRIGHT_BROWSERS_PATH: '/synthetic/playwright-cache',
    };
    const runtime = await createRuntime(parentEnv);
    const script =
      'process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("CLOAKBROWSER_") || key === "PLAYWRIGHT_BROWSERS_PATH"))))';
    const args = ['-e', script];
    const options = { env: runtime.env };
    const result = await executeFile(process.execPath, args, options);
    const observed = JSON.parse(result.stdout) as Record<string, string>;
    const cache = path.join(runtime.root, 'cloak-cache');
    const browsers = path.join(runtime.root, 'playwright-browsers');
    const expected = {
      CLOAKBROWSER_BINARY_PATH: process.execPath,
      CLOAKBROWSER_CACHE_DIR: cache,
      CLOAKBROWSER_AUTO_UPDATE: 'false',
      PLAYWRIGHT_BROWSERS_PATH: browsers,
    };
    expect(observed).toEqual(expected);
    const cacheEntries = await readdir(cache);
    expect(cacheEntries).toEqual([]);
    expect(parentEnv.CLOAKBROWSER_LICENSE_KEY).toBe('synthetic-test-license');
  });

  it('gives concurrent runtimes independent caches and disposal', async () => {
    const first = await createRuntime();
    const second = await createRuntime();
    expect(first.env.CLOAKBROWSER_CACHE_DIR).not.toBe(second.env.CLOAKBROWSER_CACHE_DIR);
    await first.dispose();
    const secondEntries = await readdir(second.root);
    expect(secondEntries).toContain('cloak-cache');
  });

  it('does not resolve a saved license from the inherited cache', async () => {
    const parent = await createRuntime();
    const personalCache = parent.env.CLOAKBROWSER_CACHE_DIR;
    const keyPath = path.join(personalCache, 'license.key');
    await writeFile(keyPath, 'synthetic-saved-license');
    const parentEnv = { ...process.env, CLOAKBROWSER_CACHE_DIR: personalCache };
    const runtime = await createRuntime(parentEnv);
    const licenseUrl = new URL('../../node_modules/cloakbrowser/dist/license.js', import.meta.url);
    const moduleUrl = licenseUrl.href;
    const serializedUrl = JSON.stringify(moduleUrl);
    const script = `const { resolveLicenseKey } = await import(${serializedUrl}); process.stdout.write(JSON.stringify({ hasLicense: Boolean(resolveLicenseKey()) }));`;
    const args = ['--input-type=module', '-e', script];
    const options = { env: runtime.env };
    const result = await executeFile(process.execPath, args, options);
    const observed = JSON.parse(result.stdout) as { hasLicense: boolean };
    expect(observed.hasLicense).toBe(false);
  });

  it('refuses a populated root without deleting caller-owned data', async () => {
    const parent = await createRuntime();
    const marker = path.join(parent.root, 'caller-data');
    await writeFile(marker, 'preserved');
    const options = { root: parent.root, freeExecutable: process.execPath };
    const creating = createFreeBrowserRuntime(options);
    await expect(creating).rejects.toThrow('empty owned temporary directory');
    await access(marker);
  });

  it('disposes acquired resources in reverse order even after a startup failure', async () => {
    const runtime = await createRuntime();
    const order: number[] = [];
    runtime.ownCleanup(() => {
      order.push(1);
    });
    runtime.ownCleanup(() => {
      order.push(2);
    });
    const failStartup = async () => {
      try {
        throw new Error('Synthetic startup failure');
      } finally {
        await runtime.dispose();
      }
    };
    const startup = failStartup();
    await expect(startup).rejects.toThrow('Synthetic startup failure');
    expect(order).toEqual([2, 1]);
  });

  it('terminates only its registered child and removes its root exactly once', async () => {
    const runtime = await createRuntime();
    const script = 'process.stdout.write("ready\\n"); setInterval(() => {}, 1000)';
    const args = ['-e', script];
    const options: import('node:child_process').SpawnOptions = {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: runtime.env,
    };
    const child = spawn(process.execPath, args, options);
    runtime.ownChild(child);
    const sentinelRoot = await createRuntime();
    const sentinel = spawn(process.execPath, args, options);
    sentinelRoot.ownChild(sentinel);
    const exit = once(child, 'close');
    try {
      const firstDisposal = runtime.dispose();
      const secondDisposal = runtime.dispose();
      expect(secondDisposal).toBe(firstDisposal);
      await firstDisposal;
      const childExited = child.exitCode !== null || child.signalCode !== null;
      expect(childExited).toBe(true);
      await exit;
      expect(sentinel.exitCode).toBeNull();
      expect(sentinel.signalCode).toBeNull();
      const sentinelPid = sentinel.pid;
      if (!sentinelPid) throw new Error('Sentinel child did not start');
      const sentinelAlive = process.kill(sentinelPid, 0);
      expect(sentinelAlive).toBe(true);
      const rootAccess = access(runtime.root);
      const expected = { code: 'ENOENT' };
      await expect(rootAccess).rejects.toMatchObject(expected);
    } finally {
      child.kill('SIGKILL');
      await exit;
    }
  });

  it('continues cleanup after one disposer fails and reports the error', async () => {
    const runtime = await createRuntime();
    const marker = path.join(runtime.root, 'marker');
    await writeFile(marker, 'owned');
    runtime.ownCleanup(() => {
      throw new Error('Synthetic cleanup failure');
    });
    const disposal = runtime.dispose();
    await expect(disposal).rejects.toThrow('Browser test runtime cleanup failed');
    const rootAccess = access(runtime.root);
    const expected = { code: 'ENOENT' };
    await expect(rootAccess).rejects.toMatchObject(expected);
    disposers.pop();
  });
});

const invalidPids = [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1];
it.each(invalidPids)('refuses unsafe process inspection PID %s', (pid) => {
  expect(() => ownedProcessCommand(pid, 'win32')).toThrow('Invalid owned process PID');
});
it.each(['darwin', 'win32'] as const)(
  'limits native process inspection to the owned PID on %s',
  (platform) => {
    const command = ownedProcessCommand(42, platform);
    const text = command.args.join(' ');
    expect(text).toContain('42');
    expect(text).not.toContain('Get-Process');
    expect(command.args).not.toContain('-A');
    expect(command.args).not.toContain('-e');
  },
);
