import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLaunchArgs, prepareBridgeRuntime } from '@/bridge/config.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';
const tempRoots: string[] = [];
const profileLockFileName = '.cloakbrowser-mcp-profile.lock';
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-test-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
function canonicalDirectory(directory: string): string {
  try {
    const nativeResult = realpathSync.native(directory);
    return path.normalize(nativeResult);
  } catch {
    const normalizeResult = path.normalize(directory);
    return path.resolve(normalizeResult);
  }
}
function createBinaryFile(root: string, name: string): string {
  const binaryPath = path.join(root, name);
  const writeFileSyncOptions = { mode: 0o755 } as const;
  writeFileSync(binaryPath, 'test binary', writeFileSyncOptions);
  return binaryPath;
}
function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
}
describe('bridge config generation', () => {
  it('creates a Cloak-backed Playwright MCP config and child env', async () => {
    const root = createTempRoot();
    const outputDir = path.join(root, 'artifacts');
    const prepareBridgeRuntimeOptions: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
          PLAYWRIGHT_MCP_HEADLESS: 'false',
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
          CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
          CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--foo,--bar=baz',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions);
    expect(runtime.browserEngine).toBe('cloak');
    expect(runtime.cloakBinaryPath).toBe(fakeCloakBinaryPath);
    expect(runtime.outputDir).toBe(outputDir);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBe(fakeCloakBinaryPath);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_OUTPUT_MODE).toBeUndefined();
    const receiverActual = runtime.config.browser?.launchOptions;
    const toMatchObjectOptions: {
      executablePath: string;
      headless: boolean;
      args: string[];
      chromiumSandbox: boolean;
    } = {
      executablePath: fakeCloakBinaryPath,
      headless: false,
      args: ['--no-sandbox', '--foo', '--bar=baz'],
      chromiumSandbox: false,
    };
    expect(receiverActual).toMatchObject(toMatchObjectOptions);
    runtime.dispose();
  });
  it('uses an explicit custom binary path before the native environment override', async () => {
    const root = createTempRoot();
    const explicitBinaryPath = createBinaryFile(root, 'explicit-chrome');
    const envBinaryPath = createBinaryFile(root, 'env-chrome');
    const prepareBridgeRuntimeOptions2: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        binaryPath: ` ${explicitBinaryPath} `,
        ensureCloakBinary: async () => {
          throw new Error('ensureBinary must not run for an explicit binary path');
        },
        buildCloakLaunchOptions: async (options) => {
          const receiver2Actual = process.env.CLOAKBROWSER_BINARY_PATH;
          const canonicalDirectoryResult = canonicalDirectory(explicitBinaryPath);
          expect(receiver2Actual).toBe(canonicalDirectoryResult);
          return {
            executablePath: canonicalDirectory(explicitBinaryPath),
            headless: true,
            args: options?.args ?? [],
          };
        },
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAKBROWSER_BINARY_PATH: envBinaryPath,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions2);
    const receiver3Actual = runtime.cloakBinaryPath;
    const canonicalDirectoryResult2 = canonicalDirectory(explicitBinaryPath);
    expect(receiver3Actual).toBe(canonicalDirectoryResult2);
    const receiver4Actual = runtime.config.browser?.launchOptions?.executablePath;
    const canonicalDirectoryResult3 = canonicalDirectory(explicitBinaryPath);
    expect(receiver4Actual).toBe(canonicalDirectoryResult3);
    runtime.dispose();
  });
  it('uses and validates the native binary path environment override', async () => {
    const root = createTempRoot();
    const envBinaryPath = createBinaryFile(root, 'env-chrome');
    const prepareBridgeRuntimeOptions3: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => {
          throw new Error('ensureBinary must not run for CLOAKBROWSER_BINARY_PATH');
        },
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAKBROWSER_BINARY_PATH: envBinaryPath,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions3);
    const receiver5Actual = runtime.cloakBinaryPath;
    const canonicalDirectoryResult4 = canonicalDirectory(envBinaryPath);
    expect(receiver5Actual).toBe(canonicalDirectoryResult4);
    runtime.dispose();
    const prepareBridgeRuntimeOptions4 = {
      tempRoot: root,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'missing-artifacts'),
        CLOAKBROWSER_BINARY_PATH: path.join(root, 'missing-chrome'),
      },
    } as const;
    const prepareBridgeRuntimeResult = prepareBridgeRuntime(prepareBridgeRuntimeOptions4);
    await expect(prepareBridgeRuntimeResult).rejects.toThrow(
      'CLOAKBROWSER_BINARY_PATH must point to an existing file',
    );
  });
  const computedValue = process.platform === 'win32';
  it.skipIf(computedValue)('rejects a binary without execute permission', async () => {
    const root = createTempRoot();
    const binaryPath = path.join(root, 'not-executable');
    const writeFileSyncOptions2 = { mode: 0o644 } as const;
    writeFileSync(binaryPath, 'test binary', writeFileSyncOptions2);
    const prepareBridgeRuntimeOptions5 = {
      tempRoot: root,
      binaryPath,
      env: { PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts') },
    } as const;
    const prepareBridgeRuntimeResult2 = prepareBridgeRuntime(prepareBridgeRuntimeOptions5);
    await expect(prepareBridgeRuntimeResult2).rejects.toThrow('binaryPath must point to an executable file');
  });
  it('restores the binary override while parallel launch builders are pending', async () => {
    const root = createTempRoot();
    const binaryPaths = [createBinaryFile(root, 'first-chrome'), createBinaryFile(root, 'second-chrome')];
    const gates = [deferred(), deferred()];
    const started = [deferred(), deferred()];
    const startedOrder: number[] = [];
    const binaryPathsAtStart: Array<string | undefined> = [];
    const binaryPathsAfterWait: Array<string | undefined> = [];
    const previousBinaryPath = process.env.CLOAKBROWSER_BINARY_PATH;
    const preparations = binaryPaths.map((binaryPath, index) => {
      const currentRoot = root;
      const currentBinaryPath = binaryPath;
      const message = `artifacts-${index}`;
      const joinedPath2 = path.join(root, message);
      const propertyValue = 'false';
      const options2 = {
        PLAYWRIGHT_MCP_OUTPUT_DIR: joinedPath2,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: propertyValue,
      } as const;
      const propertyValue2: NonNullable<
        NonNullable<Parameters<typeof prepareBridgeRuntime>[0]>['buildCloakLaunchOptions']
      > = async (options) => {
        binaryPathsAtStart[index] = process.env.CLOAKBROWSER_BINARY_PATH;
        startedOrder.push(index);
        started[index]?.resolve();
        await gates[index]?.promise;
        binaryPathsAfterWait[index] = process.env.CLOAKBROWSER_BINARY_PATH;
        return { executablePath: binaryPath, headless: true, args: options?.args ?? [] };
      };
      const prepareBridgeRuntimeOptions6:
        import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
        tempRoot: currentRoot,
        binaryPath: currentBinaryPath,
        env: options2,
        buildCloakLaunchOptions: propertyValue2,
      };
      return prepareBridgeRuntime(prepareBridgeRuntimeOptions6);
    });
    await started[0]?.promise;
    const secondStartedBeforeFirstCompleted = startedOrder.includes(1);
    gates[0]?.resolve();
    await started[1]?.promise;
    gates[1]?.resolve();
    const runtimes = await Promise.all(preparations);
    try {
      expect(secondStartedBeforeFirstCompleted).toBe(false);
      const receiver6Actual = binaryPathsAtStart;
      const mappedValues = binaryPaths.map(canonicalDirectory);
      expect(receiver6Actual).toEqual(mappedValues);
      const receiver7Actual = binaryPathsAfterWait;
      const mappedValues2 = binaryPaths.map(canonicalDirectory);
      expect(receiver7Actual).toEqual(mappedValues2);
      expect(process.env.CLOAKBROWSER_BINARY_PATH).toBe(previousBinaryPath);
      const mappedValues3 = runtimes.map((runtime) => runtime.cloakBinaryPath);
      const receiver8Actual = mappedValues3;
      const mappedValues4 = binaryPaths.map(canonicalDirectory);
      expect(receiver8Actual).toEqual(mappedValues4);
    } finally {
      runtimes.forEach((runtime) => runtime.dispose());
    }
  });
  it('propagates buildLaunchOptions failures and removes the temporary runtime', async () => {
    const root = createTempRoot();
    const error = new Error('CloakBrowser buildLaunchOptions failed');
    const prepareBridgeRuntimeOptions7: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        buildCloakLaunchOptions: async () => {
          throw error;
        },
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const prepareBridgeRuntimeResult3 = prepareBridgeRuntime(prepareBridgeRuntimeOptions7);
    await expect(prepareBridgeRuntimeResult3).rejects.toBe(error);
    const filteredValues = readdirSync(root).filter((entry) => entry.startsWith('cloakbrowser-mcp-'));
    const receiver9Actual = filteredValues;
    const values: never[] = [];
    expect(receiver9Actual).toEqual(values);
  });
  it('releases a persistent profile and removes runtime files after launch configuration fails', async () => {
    const root = createTempRoot();
    const profile = path.join(root, 'profile');
    const output = path.join(root, 'output');
    const lock = path.join(profile, profileLockFileName);
    const failure = new Error('Launch configuration failed');
    const env = { PLAYWRIGHT_MCP_OUTPUT_DIR: output, CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false' };
    const options = {
      tempRoot: root,
      userDataDir: profile,
      env,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => {
        const locked = existsSync(lock);
        expect(locked).toBe(true);
        throw failure;
      },
    };
    const prepare = prepareBridgeRuntime(options);
    await expect(prepare).rejects.toBe(failure);
    const locked = existsSync(lock);
    const remaining = readdirSync(root).filter((entry) => entry.startsWith('cloakbrowser-mcp-'));
    expect(locked).toBe(false);
    expect(remaining).toHaveLength(0);
    const retryOptions = { ...options, env: { ...env, PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright' } };
    const runtime = await prepareBridgeRuntime(retryOptions);
    try {
      const reacquired = existsSync(lock);
      expect(reacquired).toBe(true);
    } finally {
      runtime.dispose();
    }
    const released = existsSync(lock);
    expect(released).toBe(false);
  });
  it('rejects malformed environment context JSON without leaving runtime files', async () => {
    const root = createTempRoot();
    const options = { tempRoot: root, env: { CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: '{' } };
    const prepare = prepareBridgeRuntime(options);
    await expect(prepare).rejects.toThrow('CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS must be a JSON object');
    const remaining = readdirSync(root);
    expect(remaining).toHaveLength(0);
  });
  const invalidManagedPorts = [0, 65536, 1.5, NaN];
  it.each(invalidManagedPorts)(
    'rejects managed CDP port %s and removes the temporary runtime',
    async (managedCdpInternalPort) => {
      const root = createTempRoot();
      const output = path.join(root, 'output');
      const options = {
        tempRoot: root,
        managedCdpInternalPort,
        env: {
          PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
          PLAYWRIGHT_MCP_OUTPUT_DIR: output,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
      const prepare = prepareBridgeRuntime(options);
      await expect(prepare).rejects.toThrow('managedCdpInternalPort must be an integer from 1 to 65535');
      const remaining = readdirSync(root).filter((entry) => entry.startsWith('cloakbrowser-mcp-'));
      expect(remaining).toHaveLength(0);
    },
  );
  it('rejects empty binary paths and directories without invoking the binary resolver', async () => {
    const root = createTempRoot();
    let resolved = false;
    const ensureCloakBinary = async () => {
      resolved = true;
      return fakeCloakBinaryPath;
    };
    const output = path.join(root, 'output');
    const env = { PLAYWRIGHT_MCP_OUTPUT_DIR: output };
    const invalidPaths = [' ', root];
    const errors = ['binaryPath must be a non-empty path', 'binaryPath must point to an existing file'];
    for (const [index, binaryPath] of invalidPaths.entries()) {
      const options = { tempRoot: root, binaryPath, ensureCloakBinary, env };
      const prepare = prepareBridgeRuntime(options);
      const message = errors[index];
      await expect(prepare).rejects.toThrow(message);
    }
    expect(resolved).toBe(false);
  });
  const opaqueLocks = ['{', 'null', '{}', '{"pid":"unknown","createdAt":123}'];
  it.each(opaqueLocks)('preserves an existing profile lock with opaque metadata %s', async (content) => {
    const root = createTempRoot();
    const profile = path.join(root, 'profile');
    mkdirSync(profile);
    const lock = path.join(profile, profileLockFileName);
    writeFileSync(lock, content);
    const output = path.join(root, 'output');
    const options = {
      tempRoot: root,
      userDataDir: profile,
      env: { PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright', PLAYWRIGHT_MCP_OUTPUT_DIR: output },
    };
    const prepare = prepareBridgeRuntime(options);
    await expect(prepare).rejects.toThrow('Persistent profile is already active');
    const preserved = readFileSync(lock, 'utf8');
    expect(preserved).toBe(content);
    const remaining = readdirSync(root).filter((entry) => entry.startsWith('cloakbrowser-mcp-'));
    expect(remaining).toHaveLength(0);
  });
  const values2 = ['typescript', 'python', 'java', 'csharp', 'none'] as const;
  it.each(values2)('writes %s as the generated Playwright MCP codegen language', async (codegen) => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions8: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          PLAYWRIGHT_MCP_CODEGEN: codegen,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions8);
    expect(runtime.config.codegen).toBe(codegen);
    runtime.dispose();
  });
  const values3 = [
    ['true', true],
    ['false', false],
  ] as const;
  it.each(values3)('writes snapshot boxes %s into generated config', async (value, expected) => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions9: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          PLAYWRIGHT_MCP_SNAPSHOT_BOXES: value,
          PLAYWRIGHT_MCP_TIMEOUT_SETTLE: '750',
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions9);
    const receiver10Actual = runtime.config.snapshot;
    const toEqualOptions = { boxes: expected } as const;
    expect(receiver10Actual).toEqual(toEqualOptions);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_TIMEOUT_SETTLE).toBe('750');
    runtime.dispose();
  });
  it('omits unset Playwright MCP config additions and preserves upstream defaults', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions10:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions10);
    expect(runtime.config.codegen).toBeUndefined();
    expect(runtime.config.snapshot).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_TIMEOUT_SETTLE).toBeUndefined();
    runtime.dispose();
  });
  const values4: readonly string[] = ['javascript', 'Python', ''];
  it.each(values4)('rejects invalid codegen language %j', async (codegen) => {
    const prepareBridgeRuntimeOptions11:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: createTempRoot(),
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_CODEGEN: codegen,
      },
    };
    const prepareBridgeRuntimeResult4 = prepareBridgeRuntime(prepareBridgeRuntimeOptions11);
    await expect(prepareBridgeRuntimeResult4).rejects.toThrow('PLAYWRIGHT_MCP_CODEGEN must be one of');
  });
  const values5: readonly string[] = ['1', 'yes', 'TRUE', ''];
  it.each(values5)('rejects invalid snapshot boxes value %j', async (boxes) => {
    const prepareBridgeRuntimeOptions12:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: createTempRoot(),
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_SNAPSHOT_BOXES: boxes,
      },
    };
    const prepareBridgeRuntimeResult5 = prepareBridgeRuntime(prepareBridgeRuntimeOptions12);
    await expect(prepareBridgeRuntimeResult5).rejects.toThrow(
      'PLAYWRIGHT_MCP_SNAPSHOT_BOXES must be "true" or "false"',
    );
  });
  it('builds the child env from an explicit allowlist', async () => {
    const root = createTempRoot();
    const outputDir = path.join(root, 'artifacts');
    const prepareBridgeRuntimeOptions13 = {
      tempRoot: root,
      env: {
        AWS_SECRET_ACCESS_KEY: 'not-forwarded',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAKBROWSER_AUTO_UPDATE: 'true',
        CLOAKBROWSER_CACHE_DIR: path.join(root, 'cloak-cache'),
        CLOAKBROWSER_LICENSE_KEY: 'test-license-key',
        GITHUB_TOKEN: 'not-forwarded',
        HOME: path.join(root, 'home'),
        LANG: 'C.UTF-8',
        NODE_EXTRA_CA_CERTS: path.join(root, 'ca.pem'),
        NODE_OPTIONS: '--inspect',
        PATH: '/usr/bin',
        PLAYWRIGHT_BROWSERS_PATH: path.join(root, 'playwright-cache'),
        PLAYWRIGHT_MCP_ALLOWED_ORIGINS: 'https://example.test',
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_FILE_PATHS: 'absolute',
        PLAYWRIGHT_MCP_IDLE_TIMEOUT: '250',
        PLAYWRIGHT_MCP_IMAGE_RESPONSES: 'only',
        PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.internal',
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://proxy.example:8080',
        PLAYWRIGHT_MCP_WEBMCP: 'false',
        TMPDIR: root,
      },
    } as const;
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions13);
    expect(runtime.childEnv.PATH).toBe('/usr/bin');
    const receiver11Actual = runtime.childEnv.HOME;
    const joinedPath3 = path.join(root, 'home');
    expect(receiver11Actual).toBe(joinedPath3);
    expect(runtime.childEnv.TMPDIR).toBe(root);
    expect(runtime.childEnv.LANG).toBe('C.UTF-8');
    const receiver12Actual = runtime.childEnv.NODE_EXTRA_CA_CERTS;
    const joinedPath4 = path.join(root, 'ca.pem');
    expect(receiver12Actual).toBe(joinedPath4);
    const receiver13Actual = runtime.childEnv.PLAYWRIGHT_BROWSERS_PATH;
    const joinedPath5 = path.join(root, 'playwright-cache');
    expect(receiver13Actual).toBe(joinedPath5);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ALLOWED_ORIGINS).toBe('https://example.test');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_FILE_PATHS).toBe('absolute');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_IDLE_TIMEOUT).toBe('250');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_IMAGE_RESPONSES).toBe('only');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBe('http://proxy.example:8080');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBe('.internal');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_WEBMCP).toBe('false');
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS).toBe('false');
    const receiver14Actual = runtime.childEnv.CLOAKBROWSER_CACHE_DIR;
    const joinedPath6 = path.join(root, 'cloak-cache');
    expect(receiver14Actual).toBe(joinedPath6);
    expect(runtime.childEnv.CLOAKBROWSER_AUTO_UPDATE).toBe('true');
    expect(runtime.childEnv.CLOAKBROWSER_LICENSE_KEY).toBe('test-license-key');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_OUTPUT_DIR).toBe(outputDir);
    expect(runtime.childEnv.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(runtime.childEnv.GITHUB_TOKEN).toBeUndefined();
    expect(runtime.childEnv.NODE_OPTIONS).toBeUndefined();
    runtime.dispose();
  });
  it('merges generated CloakBrowser default launch args', async () => {
    const root = createTempRoot();
    const previousCloakBinaryPath = process.env.CLOAKBROWSER_BINARY_PATH;
    const prepareBridgeRuntimeOptions14:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        await Promise.resolve();
        if (!options) throw new Error('Expected Cloak launch options');
        expect(process.env.CLOAKBROWSER_BINARY_PATH).toBe(fakeCloakBinaryPath);
        expect(options.geoip).toBeUndefined();
        expect(options.proxy).toBeUndefined();
        expect(options.stealthArgs).toBe(false);
        const receiver15Actual = options.args;
        const values6: string[] = ['--no-sandbox', '--alpha'];
        expect(receiver15Actual).toEqual(values6);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [...(options.args ?? []), '--lang=en-US', '--start-maximized', '--start-maximized-for-test'],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--alpha',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions14);
    const receiver16Actual = runtime.config.browser?.launchOptions?.args;
    const values7: string[] = ['--no-sandbox', '--alpha', '--lang=en-US', '--start-maximized'];
    expect(receiver16Actual).toEqual(values7);
    expect(process.env.CLOAKBROWSER_BINARY_PATH).toBe(previousCloakBinaryPath);
    runtime.dispose();
  });
  it('defaults CloakBrowser to the Stable release channel and forwards Preview', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions15:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        expect(options?.releaseChannel).toBe('stable');
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: options?.args ?? [],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'stable-artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const stableRuntime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions15);
    stableRuntime.dispose();
    const prepareBridgeRuntimeOptions16:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      releaseChannel: 'preview',
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        expect(options?.releaseChannel).toBe('preview');
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: options?.args ?? [],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'preview-artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const previewRuntime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions16);
    previewRuntime.dispose();
  });
  it('adds the console fallback preload when enabled', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions17:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'true',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions17);
    expect(runtime.config.browser?.initScript?.[0]).toContain('console-fallback-init.js');
    expect(runtime.childEnv.NODE_OPTIONS).toContain('--require=');
    runtime.dispose();
  });
  it('enables isolated browser profiles when requested', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions18:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions18);
    expect(runtime.config.browser?.isolated).toBe(true);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBe('true');
    runtime.dispose();
  });
  it('writes persistent profiles to generated config and skips isolated mode', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const prepareBridgeRuntimeOptions19:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions19);
    const expectedProfileDir = canonicalDirectory(profileDir);
    const lockPath = path.join(expectedProfileDir, profileLockFileName);
    expect(runtime.config.browser?.userDataDir).toBe(expectedProfileDir);
    expect(runtime.config.browser?.isolated).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_USER_DATA_DIR).toBe(expectedProfileDir);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();
    const existsSyncResult = existsSync(lockPath);
    expect(existsSyncResult).toBe(true);
    runtime.dispose();
    const existsSyncResult2 = existsSync(lockPath);
    expect(existsSyncResult2).toBe(false);
    const prepareBridgeRuntimeOptions20:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const afterDispose = await prepareBridgeRuntime(prepareBridgeRuntimeOptions20);
    expect(afterDispose.config.browser?.userDataDir).toBe(expectedProfileDir);
    const existsSyncResult3 = existsSync(lockPath);
    expect(existsSyncResult3).toBe(true);
    afterDispose.dispose();
    const existsSyncResult4 = existsSync(lockPath);
    expect(existsSyncResult4).toBe(false);
  });
  it('rejects duplicate active persistent profile directories', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const prepareBridgeRuntimeOptions21:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions21);
    const prepareBridgeRuntimeOptions22:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const prepareBridgeRuntimeResult6 = prepareBridgeRuntime(prepareBridgeRuntimeOptions22);
    await expect(prepareBridgeRuntimeResult6).rejects.toThrow('already active');
    runtime.dispose();
  });
  it('configures Playwright Extension mode without launching CloakBrowser or serializing its token', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'extension');
    let ensuredCloak = false;
    const prepareBridgeRuntimeOptions23:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => {
        ensuredCloak = true;
        return fakeCloakBinaryPath;
      },
      env: {
        PLAYWRIGHT_MCP_EXTENSION: 'true',
        PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'extension-secret-token',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROFILE_DIR_NAME: 'Profile 1',
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions23);
    expect(runtime.browserEngine).toBe('playwright');
    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(ensuredCloak).toBe(false);
    const receiver17Actual = runtime.childEnv;
    const toMatchObjectOptions2 = {
      PLAYWRIGHT_MCP_EXTENSION: 'true',
      PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'extension-secret-token',
      PLAYWRIGHT_MCP_HEADLESS: 'false',
      PLAYWRIGHT_MCP_PROFILE_DIR_NAME: 'Profile 1',
      PLAYWRIGHT_MCP_USER_DATA_DIR: canonicalDirectory(profileDir),
    } as const;
    expect(receiver17Actual).toMatchObject(toMatchObjectOptions2);
    const receiver18Actual = runtime.config.browser;
    const toMatchObjectOptions3 = {
      browserName: 'chromium',
      launchOptions: {},
      userDataDir: canonicalDirectory(profileDir),
    } as const;
    expect(receiver18Actual).toMatchObject(toMatchObjectOptions3);
    const serializedValue = JSON.stringify(runtime.config);
    expect(serializedValue).not.toContain('extension-secret-token');
    const fileSyncResult = readFileSync(runtime.configPath, 'utf8');
    expect(fileSyncResult).not.toContain('extension-secret-token');
    runtime.dispose();
  });
  it('lets runtime extension metadata override process-level mode and profile name', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions24 = {
      tempRoot: root,
      extensionMode: true,
      profileDirName: 'Profile 2',
      userDataDir: path.join(root, 'profiles', 'extension'),
      env: {
        PLAYWRIGHT_MCP_EXTENSION: 'false',
        PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'token',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROFILE_DIR_NAME: 'Profile 1',
      },
    } as const;
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions24);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXTENSION).toBe('true');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROFILE_DIR_NAME).toBe('Profile 2');
    runtime.dispose();
  });
  it('lets runtime metadata disable process-level extension mode', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions25:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      extensionMode: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_EXTENSION: 'true',
        PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'must-not-reach-non-extension-child',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions25);
    expect(runtime.browserEngine).toBe('cloak');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXTENSION).toBe('false');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXTENSION_TOKEN).toBeUndefined();
    expect(runtime.cloakBinaryPath).toBe(fakeCloakBinaryPath);
    runtime.dispose();
  });
  it('requires a process token and persistent profile for Playwright Extension mode', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions26 = {
      tempRoot: root,
      extensionMode: true,
      userDataDir: path.join(root, 'profiles', 'extension'),
      env: { PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts') },
    } as const;
    const prepareBridgeRuntimeResult7 = prepareBridgeRuntime(prepareBridgeRuntimeOptions26);
    await expect(prepareBridgeRuntimeResult7).rejects.toThrow('PLAYWRIGHT_MCP_EXTENSION_TOKEN');
    const prepareBridgeRuntimeOptions27 = {
      tempRoot: root,
      extensionMode: true,
      env: {
        PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'token',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
      },
    } as const;
    const prepareBridgeRuntimeResult8 = prepareBridgeRuntime(prepareBridgeRuntimeOptions27);
    await expect(prepareBridgeRuntimeResult8).rejects.toThrow('userDataDir is required');
  });
  const values8: readonly string[] = [
    '.',
    '..',
    '/absolute',
    'nested/profile',
    'nested\\profile',
    'C:\\profile',
  ];
  it.each(values8)(
    'rejects unsafe Playwright Extension profile directory name %s',
    async (profileDirName) => {
      const root = createTempRoot();
      const prepareBridgeRuntimeOptions28 = {
        tempRoot: root,
        extensionMode: true,
        profileDirName,
        userDataDir: path.join(root, 'profiles', 'extension'),
        env: {
          PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'token',
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        },
      } as const;
      const prepareBridgeRuntimeResult9 = prepareBridgeRuntime(prepareBridgeRuntimeOptions28);
      await expect(prepareBridgeRuntimeResult9).rejects.toThrow(
        'profileDirName must be one relative path segment',
      );
    },
  );
  const values9 = [
    ['PLAYWRIGHT_MCP_CDP_ENDPOINT', 'http://127.0.0.1:9222'],
    ['PLAYWRIGHT_MCP_ENDPOINT', 'ws://127.0.0.1:3001'],
    ['PLAYWRIGHT_MCP_ISOLATED', 'true'],
    ['CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS', '--disable-gpu'],
  ] as const;
  it.each(values9)('rejects extension mode with %s', async (name, value) => {
    const root = createTempRoot();
    const currentRoot2 = root;
    const propertyValue3 = true;
    const toLowerCaseResult = name.toLowerCase();
    const joinedPath7 = path.join(root, 'profiles', toLowerCaseResult);
    const options3 = {
      PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'token',
      PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
      [name]: value,
    } as const;
    const prepareBridgeRuntimeOptions29 = {
      tempRoot: currentRoot2,
      extensionMode: propertyValue3,
      userDataDir: joinedPath7,
      env: options3,
    } as const;
    const prepareBridgeRuntimeResult10 = prepareBridgeRuntime(prepareBridgeRuntimeOptions29);
    await expect(prepareBridgeRuntimeResult10).rejects.toThrow(name);
  });
  const values10 = [
    ['managed CDP', { managedCdpInternalPort: 43123 }],
    ['headless launch', { headless: true }],
    ['humanization', { humanize: true }],
    ['browser context mutation', { contextOptions: { locale: 'en-US' } }],
    ['proxy configuration', { proxy: { server: 'http://proxy.example:8080' } }],
  ] as const;
  it.each(values10)('rejects %s with Playwright Extension mode', async (conflict, conflictingOptions) => {
    const root = createTempRoot();
    const currentRoot3 = root;
    const propertyValue4 = true;
    const replaceAllResult = conflict.replaceAll(' ', '-');
    const joinedPath8 = path.join(root, 'profiles', replaceAllResult);
    const options4 = {
      PLAYWRIGHT_MCP_EXTENSION_TOKEN: 'token',
      PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
    } as const;
    const options5 = { ...conflictingOptions };
    const prepareBridgeRuntimeOptions30 = {
      tempRoot: currentRoot3,
      extensionMode: propertyValue4,
      userDataDir: joinedPath8,
      env: options4,
      ...options5,
    } as const;
    const prepareBridgeRuntimeResult11 = prepareBridgeRuntime(prepareBridgeRuntimeOptions30);
    await expect(prepareBridgeRuntimeResult11).rejects.toThrow(conflict);
  });
  it('rejects persistent profile directories locked by another process', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const prepareBridgeRuntimeOptions31:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions31);
    const argumentValue = process.execPath;
    const values11: readonly string[] = [
      '--conditions',
      'development',
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      [
        "import { prepareBridgeRuntime } from './src/bridge/config.ts';",
        'try {',
        '  const runtime = await prepareBridgeRuntime();',
        '  runtime.dispose();',
        '  process.exit(0);',
        '} catch (error) {',
        '  process.stderr.write(error instanceof Error ? error.message : String(error));',
        '  process.exit(42);',
        '}',
      ].join('\n'),
    ];
    const spawnSyncOptions = {
      cwd: path.resolve('.'),
      encoding: 'utf8',
      env: {
        ...process.env,
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'child-artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    } as const;
    const result = spawnSync(argumentValue, values11, spawnSyncOptions);
    expect(result.status).toBe(42);
    expect(result.stderr).toContain('Persistent profile is already active');
    expect(result.stderr).toContain('pid=');
    runtime.dispose();
  });
  it('writes validated context options and shallow-merges runtime values over env values', async () => {
    const root = createTempRoot();
    const currentRoot4 = root;
    const propertyValue6 = async () => fakeCloakBinaryPath;
    const options6 = {
      viewport: { width: 1024, height: 768 },
      timezoneId: 'Europe/Berlin',
    } as const;
    const joinedPath9 = path.join(root, 'artifacts');
    const propertyValue5 = 'false';
    const stringifyOptions = {
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      colorScheme: 'dark',
      permissions: ['geolocation', 'clipboard-read'],
      geolocation: { longitude: 13.405, latitude: 52.52, accuracy: 15 },
      extraHTTPHeaders: { 'x-test': 'ok' },
      httpCredentials: { username: 'user', password: 'pass', send: 'unauthorized' },
      ignoreHTTPSErrors: true,
      offline: false,
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: true,
    };
    const serializedValue2 = JSON.stringify(stringifyOptions);
    const options7: Readonly<Record<string, string | undefined>> | undefined = {
      PLAYWRIGHT_MCP_OUTPUT_DIR: joinedPath9,
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: propertyValue5,
      CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: serializedValue2,
    };
    const prepareBridgeRuntimeOptions32:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: currentRoot4,
      ensureCloakBinary: propertyValue6,
      contextOptions: options6,
      env: options7,
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions32);
    const receiver19Actual = runtime.config.browser?.contextOptions;
    const toEqualOptions2: {
      viewport: {
        width: number;
        height: number;
      };
      locale: string;
      timezoneId: string;
      colorScheme: string;
      permissions: string[];
      geolocation: {
        longitude: number;
        latitude: number;
        accuracy: number;
      };
      extraHTTPHeaders: {
        'x-test': string;
      };
      httpCredentials: {
        username: string;
        password: string;
        send: string;
      };
      ignoreHTTPSErrors: boolean;
      offline: boolean;
      deviceScaleFactor: number;
      isMobile: boolean;
      hasTouch: boolean;
    } = {
      viewport: { width: 1024, height: 768 },
      locale: 'en-US',
      timezoneId: 'Europe/Berlin',
      colorScheme: 'dark',
      permissions: ['geolocation', 'clipboard-read'],
      geolocation: { longitude: 13.405, latitude: 52.52, accuracy: 15 },
      extraHTTPHeaders: { 'x-test': 'ok' },
      httpCredentials: { username: 'user', password: 'pass', send: 'unauthorized' },
      ignoreHTTPSErrors: true,
      offline: false,
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: true,
    };
    expect(receiver19Actual).toEqual(toEqualOptions2);
    runtime.dispose();
  });
  it('passes explicit context viewport to CloakBrowser launch options', async () => {
    const root = createTempRoot();
    const viewport = { width: 1024, height: 768 };
    const prepareBridgeRuntimeOptions33:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      contextOptions: { viewport },
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        const optionsWithViewport = options as typeof options & {
          viewport?: typeof viewport;
        };
        expect(optionsWithViewport.viewport).toEqual(viewport);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: options.args ?? [],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions33);
    expect(runtime.config.browser?.contextOptions?.viewport).toEqual(viewport);
    runtime.dispose();
  });
  it('rejects unsupported or invalid context options', async () => {
    const tempRootResult = createTempRoot();
    const propertyValue7 = async () => fakeCloakBinaryPath;
    const stringifyOptions2 = { storageState: 'state.json' } as const;
    const serializedValue3 = JSON.stringify(stringifyOptions2);
    const options8 = {
      CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: serializedValue3,
    } as const;
    const prepareBridgeRuntimeOptions34:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: tempRootResult,
      ensureCloakBinary: propertyValue7,
      env: options8,
    };
    const prepareBridgeRuntimeResult12 = prepareBridgeRuntime(prepareBridgeRuntimeOptions34);
    await expect(prepareBridgeRuntimeResult12).rejects.toThrow('storageState is not supported');
    const tempRootResult2 = createTempRoot();
    const propertyValue8 = async () => fakeCloakBinaryPath;
    const stringifyOptions3 = { viewport: { width: 0, height: 720 } } as const;
    const serializedValue4 = JSON.stringify(stringifyOptions3);
    const options9 = {
      CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: serializedValue4,
    } as const;
    const prepareBridgeRuntimeOptions35:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: tempRootResult2,
      ensureCloakBinary: propertyValue8,
      env: options9,
    };
    const prepareBridgeRuntimeResult13 = prepareBridgeRuntime(prepareBridgeRuntimeOptions35);
    await expect(prepareBridgeRuntimeResult13).rejects.toThrow('viewport.width');
  });
  it('lets runtime headless override the default and child environment', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions36:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      headless: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions36);
    expect(runtime.config.browser?.launchOptions?.headless).toBe(false);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_HEADLESS).toBe('false');
    runtime.dispose();
  });
  it('lets runtime headless override an environment value', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions37:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      headless: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_HEADLESS: 'false',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions37);
    expect(runtime.config.browser?.launchOptions?.headless).toBe(true);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_HEADLESS).toBe('true');
    runtime.dispose();
  });
  it('adds GeoIP-derived timezone and locale launch args when proxy matching is enabled', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions38:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      geoipProxyMatch: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        const receiver20Actual = options.proxy;
        const toEqualOptions3 = {
          server: 'http://proxy.example:8080',
          bypass: '.internal',
          username: 'user',
          password: 'pass',
        } as const;
        expect(receiver20Actual).toEqual(toEqualOptions3);
        expect(options.headless).toBe(true);
        expect(options.geoip).toBe(true);
        expect(options.stealthArgs).toBe(false);
        const receiver21Actual = options.args;
        const values12: string[] = [
          '--no-sandbox',
          '--lang=fr-FR',
          '--alpha',
          '--fingerprint-locale=fr-FR',
          '--fingerprint-timezone=Europe/Paris',
        ];
        expect(receiver21Actual).toEqual(values12);
        const receiver22Actual = options.launchOptions;
        const toEqualOptions4 = { chromiumSandbox: false } as const;
        expect(receiver22Actual).toEqual(toEqualOptions4);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [
            ...(options.args ?? []),
            '--proxy-server=http://proxy.example:8080',
            '--fingerprint-webrtc-ip=203.0.113.10',
          ],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://user:pass@proxy.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.internal',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS:
          '--lang=fr-FR,--alpha,--fingerprint-locale=fr-FR,--fingerprint-timezone=Europe/Paris',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions38);
    const receiver23Actual = runtime.config.browser?.launchOptions?.args;
    const values13: string[] = [
      '--no-sandbox',
      '--lang=fr-FR',
      '--alpha',
      '--fingerprint-locale=fr-FR',
      '--fingerprint-timezone=Europe/Paris',
      '--proxy-server=http://proxy.example:8080',
      '--fingerprint-webrtc-ip=203.0.113.10',
    ];
    expect(receiver23Actual).toEqual(values13);
    expect(runtime.config.browser?.launchOptions?.proxy).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();
    runtime.dispose();
  });
  const missingExitValues = [undefined, 'auto', 'off', 'not-an-ip'];
  it.for(missingExitValues)(
    'rejects an unresolved GeoIP exit IP (%s) and releases the profile',
    async (exitIp) => {
      const root = createTempRoot();
      const outputDir = path.join(root, 'artifacts');
      const profile = path.join(root, 'profile');
      const lockPath = path.join(profile, profileLockFileName);
      const extraArgs = [
        '--fingerprint-timezone=Asia/Tokyo',
        '--lang=ja-JP',
        '--fingerprint-webrtc-ip=198.51.100.8',
      ];
      const encoded = JSON.stringify(extraArgs);
      const env = {
        PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
        PLAYWRIGHT_MCP_USER_DATA_DIR: profile,
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://user:password-canary@proxy.example:8080',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      };
      const options: import('@/bridge/config.js').PrepareBridgeRuntimeOptions = {
        tempRoot: root,
        geoipProxyMatch: true,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        buildCloakLaunchOptions: async (options) => {
          const args = [...(options?.args ?? [])];
          if (exitIp !== undefined) {
            const flag = `--fingerprint-webrtc-ip=${exitIp}`;
            args.push(flag);
          }
          return { executablePath: fakeCloakBinaryPath, headless: true, args };
        },
        env,
      };
      const startup = prepareBridgeRuntime(options);
      await expect(startup).rejects.toThrow('GeoIP resolution failed: could not discover the proxy exit IP');
      const locked = existsSync(lockPath);
      expect(locked).toBe(false);
      const successfulOptions: import('@/bridge/config.js').PrepareBridgeRuntimeOptions = {
        ...options,
        buildCloakLaunchOptions: async (options) => {
          const args = [...(options?.args ?? []), '--fingerprint-webrtc-ip=203.0.113.10'];
          return { executablePath: fakeCloakBinaryPath, headless: true, args };
        },
      };
      const runtime = await prepareBridgeRuntime(successfulOptions);
      runtime.dispose();
    },
  );

  const explicitWebrtcValues = ['198.51.100.8', 'off', 'auto'];
  it.for(explicitWebrtcValues)(
    'keeps WebRTC override %s after independent GeoIP exit validation',
    async (override) => {
      const root = createTempRoot();
      const outputDir = path.join(root, 'artifacts');
      const rawFlag = `--fingerprint-webrtc-ip=${override}`;
      const flags = [rawFlag, '--fingerprint-timezone=Asia/Tokyo', '--lang=ja-JP'];
      const encoded = JSON.stringify(flags);
      const options: import('@/bridge/config.js').PrepareBridgeRuntimeOptions = {
        tempRoot: root,
        geoipProxyMatch: true,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
          PLAYWRIGHT_MCP_PROXY_SERVER: 'http://proxy.example:8080',
          CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
        buildCloakLaunchOptions: async (options) => {
          const supplied = options?.args;
          expect(supplied).not.toContain(rawFlag);
          const args = [...(supplied ?? []), '--fingerprint-webrtc-ip=2001:db8::2'];
          return { executablePath: fakeCloakBinaryPath, headless: true, args };
        },
      };
      const runtime = await prepareBridgeRuntime(options);
      try {
        const args = runtime.config.browser?.launchOptions?.args ?? [];
        const actual = args.filter((arg) => arg.startsWith('--fingerprint-webrtc-ip='));
        const expected = [override === 'auto' ? '--fingerprint-webrtc-ip=2001:db8::2' : rawFlag];
        expect(actual).toEqual(expected);
        expect(args).toContain('--fingerprint-timezone=Asia/Tokyo');
        expect(args).toContain('--lang=ja-JP');
      } finally {
        runtime.dispose();
      }
    },
  );
  it('retains the CloakBrowser proxy option when native inline authentication is unavailable', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions39:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => ({
        executablePath: fakeCloakBinaryPath,
        headless: true,
        args: options?.args ?? [],
        proxy: {
          server: 'http://proxy.example:8080',
          bypass: '.internal',
          username: 'user',
          password: 'pass',
        },
      }),
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://user:pass@proxy.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.internal',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions39);
    const receiver24Actual = runtime.config.browser?.launchOptions?.proxy;
    const toEqualOptions5 = {
      server: 'http://proxy.example:8080',
      bypass: '.internal',
      username: 'user',
      password: 'pass',
    } as const;
    expect(receiver24Actual).toEqual(toEqualOptions5);
    runtime.dispose();
  });
  it('forwards only the license key from CloakBrowser-generated browser env', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions40:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => ({
        executablePath: fakeCloakBinaryPath,
        headless: true,
        args: options?.args ?? [],
        env: {
          AWS_SECRET_ACCESS_KEY: 'not-forwarded',
          CLOAKBROWSER_LICENSE_KEY: 'resolved-license-key',
        },
      }),
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions40);
    expect(runtime.childEnv.CLOAKBROWSER_LICENSE_KEY).toBe('resolved-license-key');
    expect(runtime.childEnv.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    runtime.dispose();
  });
  it('generates extension launch args through CloakBrowser launch options', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const extensionDir = path.join(root, 'extensions', 'my-extension');
    const mkdirSyncOptions = { recursive: true } as const;
    mkdirSync(extensionDir, mkdirSyncOptions);
    const cwdResult = process.cwd();
    const relativeExtensionDir = path.relative(cwdResult, extensionDir);
    const currentRoot5 = root;
    const propertyValue11 = async () => fakeCloakBinaryPath;
    const propertyValue12: NonNullable<
      NonNullable<Parameters<typeof prepareBridgeRuntime>[0]>['buildCloakLaunchOptions']
    > = async (options) => {
      if (!options) throw new Error('Expected Cloak launch options');
      expect(options.headless).toBe(true);
      expect(options.stealthArgs).toBe(false);
      const receiver25Actual = options.args;
      const values14: string[] = ['--no-sandbox'];
      expect(receiver25Actual).toEqual(values14);
      const receiver26Actual = options.extensionPaths;
      const values15: string[] = [canonicalDirectory(extensionDir)];
      expect(receiver26Actual).toEqual(values15);
      const receiver27Actual = options.launchOptions;
      const toEqualOptions6 = { chromiumSandbox: false } as const;
      expect(receiver27Actual).toEqual(toEqualOptions6);
      return {
        executablePath: fakeCloakBinaryPath,
        headless: true,
        args: [
          ...(options.args ?? []),
          `--load-extension=${options.extensionPaths?.join(',')}`,
          `--disable-extensions-except=${options.extensionPaths?.join(',')}`,
        ],
      };
    };
    const joinedPath10 = path.join(root, 'artifacts');
    const currentProfileDir = profileDir;
    const propertyValue9 = 'false';
    const propertyValue10 = 'false';
    const values16 = [relativeExtensionDir];
    const serializedValue5 = JSON.stringify(values16);
    const options10: Readonly<Record<string, string | undefined>> | undefined = {
      PLAYWRIGHT_MCP_OUTPUT_DIR: joinedPath10,
      PLAYWRIGHT_MCP_USER_DATA_DIR: currentProfileDir,
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: propertyValue9,
      CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: propertyValue10,
      CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: serializedValue5,
    };
    const prepareBridgeRuntimeOptions41:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: currentRoot5,
      ensureCloakBinary: propertyValue11,
      buildCloakLaunchOptions: propertyValue12,
      env: options10,
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions41);
    const receiver28Actual = runtime.config.browser?.launchOptions?.args;
    const values17: string[] = [
      '--no-sandbox',
      `--load-extension=${canonicalDirectory(extensionDir)}`,
      `--disable-extensions-except=${canonicalDirectory(extensionDir)}`,
    ];
    expect(receiver28Actual).toEqual(values17);
    runtime.dispose();
  });
  it('rejects extension paths without a persistent profile', async () => {
    const root = createTempRoot();
    const extensionDir = path.join(root, 'extensions', 'my-extension');
    const mkdirSyncOptions2 = { recursive: true } as const;
    mkdirSync(extensionDir, mkdirSyncOptions2);
    const prepareBridgeRuntimeOptions42:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: extensionDir,
      },
    };
    const prepareBridgeRuntimeResult14 = prepareBridgeRuntime(prepareBridgeRuntimeOptions42);
    await expect(prepareBridgeRuntimeResult14).rejects.toThrow('requires PLAYWRIGHT_MCP_USER_DATA_DIR');
  });
  it('rejects extension paths that are not existing directories', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions43:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: path.join(root, 'profiles', 'default'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: path.join(root, 'missing-extension'),
      },
    };
    const prepareBridgeRuntimeResult15 = prepareBridgeRuntime(prepareBridgeRuntimeOptions43);
    await expect(prepareBridgeRuntimeResult15).rejects.toThrow('must point to an existing directory');
  });
  it('labels runtime profile and extension path validation errors by metadata field', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions44:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      userDataDir: ' ',
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const prepareBridgeRuntimeResult16 = prepareBridgeRuntime(prepareBridgeRuntimeOptions44);
    await expect(prepareBridgeRuntimeResult16).rejects.toThrow('userDataDir must be a non-empty path');
    const prepareBridgeRuntimeOptions45:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      userDataDir: path.join(root, 'profiles', 'default'),
      extensionPaths: [path.join(root, 'missing-extension')],
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const prepareBridgeRuntimeResult17 = prepareBridgeRuntime(prepareBridgeRuntimeOptions45);
    await expect(prepareBridgeRuntimeResult17).rejects.toThrow(
      'extensionPaths[0] must point to an existing directory',
    );
  });
  it('passes runtime proxy options through the upstream child environment', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions46:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      proxy: {
        server: 'http://runtime.example:8080',
        bypass: '.runtime',
      },
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions46);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBe('http://runtime.example:8080');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBe('.runtime');
    const receiver29Actual = runtime.config.browser?.launchOptions?.proxy;
    const toEqualOptions7 = {
      server: 'http://runtime.example:8080',
      bypass: '.runtime',
    } as const;
    expect(receiver29Actual).toEqual(toEqualOptions7);
    runtime.dispose();
  });
  it('lets runtime proxy override env proxy and clear inherited bypass', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions47:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      proxy: {
        server: 'http://runtime.example:8080',
      },
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://env.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.env',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions47);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBe('http://runtime.example:8080');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();
    const receiver30Actual = runtime.config.browser?.launchOptions?.proxy;
    const toEqualOptions8 = {
      server: 'http://runtime.example:8080',
    } as const;
    expect(receiver30Actual).toEqual(toEqualOptions8);
    runtime.dispose();
  });
  it('writes authenticated environment proxy credentials into generated config only', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions48:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://user:p%40ssword@proxy.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.internal',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions48);
    const receiver31Actual = runtime.config.browser?.launchOptions?.proxy;
    const toEqualOptions9 = {
      server: 'http://proxy.example:8080',
      bypass: '.internal',
      username: 'user',
      password: 'p@ssword',
    } as const;
    expect(receiver31Actual).toEqual(toEqualOptions9);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();
    runtime.dispose();
  });
  it('writes authenticated runtime proxy credentials into generated config only', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions49:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      proxy: {
        server: 'http://runtime:p%40ssword@runtime.example:8080',
        bypass: '.runtime',
      },
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://env.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.env',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions49);
    const receiver32Actual = runtime.config.browser?.launchOptions?.proxy;
    const toEqualOptions10 = {
      server: 'http://runtime.example:8080',
      bypass: '.runtime',
      username: 'runtime',
      password: 'p@ssword',
    } as const;
    expect(receiver32Actual).toEqual(toEqualOptions10);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();
    runtime.dispose();
  });
  it('uses runtime proxy options for GeoIP proxy matching', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions50:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      geoipProxyMatch: true,
      proxy: {
        server: 'http://runtime.example:8080',
        bypass: '.runtime',
      },
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        const receiver33Actual = options.proxy;
        const toEqualOptions11 = {
          server: 'http://runtime.example:8080',
          bypass: '.runtime',
        } as const;
        expect(receiver33Actual).toEqual(toEqualOptions11);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [
            ...(options.args ?? []),
            '--fingerprint-timezone=Europe/Paris',
            '--lang=fr-FR',
            '--fingerprint-webrtc-ip=203.0.113.10',
          ],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://env.example:8080',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions50);
    const receiver34Actual = runtime.config.browser?.launchOptions?.args;
    const values18: string[] = [
      '--no-sandbox',
      '--fingerprint-timezone=Europe/Paris',
      '--lang=fr-FR',
      '--fingerprint-webrtc-ip=203.0.113.10',
    ];
    expect(receiver34Actual).toEqual(values18);
    runtime.dispose();
  });
  it('allows an explicit runtime option to disable env-enabled GeoIP proxy matching', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions51:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      geoipProxyMatch: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.geoip).toBeUndefined();
        const receiver35Actual = options.proxy;
        const toEqualOptions12 = { server: 'http://proxy.example:8080' } as const;
        expect(receiver35Actual).toEqual(toEqualOptions12);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: options.args ?? [],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://proxy.example:8080',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions51);
    expect(runtime.config.browser?.launchOptions?.args).toContain('--no-sandbox');
    runtime.dispose();
  });
  it('adds the humanize init page when enabled in Cloak mode', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions52:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      humanize: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions52);
    expect(runtime.config.browser?.initPage).toHaveLength(1);
    const basenameResult = path.basename(runtime.config.browser!.initPage![0]!);
    expect(basenameResult).toBe('humanize-init-page.cjs');
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET).toBe('default');
    const initPageSource = readFileSync(runtime.config.browser!.initPage![0]!, 'utf8');
    expect(initPageSource).toContain("import('cloakbrowser')");
    expect(initPageSource).toContain("import('cloakbrowser/human')");
    expect(initPageSource).toContain('humanizeBrowser');
    expect(initPageSource).toContain('CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET');
    expect(runtime.config.browser!.initPage![0]!).not.toContain(runtime.tempDir);
    runtime.dispose();
  });
  it('passes human preset options through the upstream child environment', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions53:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      humanize: true,
      humanPreset: 'careful',
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'default',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions53);
    expect(runtime.config.browser?.initPage).toHaveLength(1);
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET).toBe('careful');
    runtime.dispose();
  });
  it('rejects unsupported human presets', async () => {
    const prepareBridgeRuntimeOptions54:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: createTempRoot(),
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'fast',
      },
    };
    const prepareBridgeRuntimeResult18 = prepareBridgeRuntime(prepareBridgeRuntimeOptions54);
    await expect(prepareBridgeRuntimeResult18).rejects.toThrow('CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET');
  });
  it('allows an explicit runtime option to disable env-enabled humanize behavior', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions55:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      humanize: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions55);
    expect(runtime.config.browser?.initPage).toBeUndefined();
    runtime.dispose();
  });
  it('restores stdout after overlapping Cloak stdout suppression', async () => {
    const originalWrite = Reflect.get(process.stdout, 'write') as typeof process.stdout.write;
    const firstEntered = deferred();
    const secondEntered = deferred();
    const firstRelease = deferred();
    const secondRelease = deferred();
    let firstRuntime: Awaited<ReturnType<typeof prepareBridgeRuntime>> | undefined;
    let secondRuntime: Awaited<ReturnType<typeof prepareBridgeRuntime>> | undefined;
    try {
      const prepareBridgeRuntimeOptions56:
        import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => {
          firstEntered.resolve();
          await firstRelease.promise;
          return fakeCloakBinaryPath;
        },
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
      const first = prepareBridgeRuntime(prepareBridgeRuntimeOptions56);
      await firstEntered.promise;
      const prepareBridgeRuntimeOptions57:
        import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => {
          secondEntered.resolve();
          await secondRelease.promise;
          return fakeCloakBinaryPath;
        },
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
      const second = prepareBridgeRuntime(prepareBridgeRuntimeOptions57);
      await secondEntered.promise;
      firstRelease.resolve();
      firstRuntime = await first;
      const result2: {
        (buffer: Uint8Array | string, cb?: (err?: Error | null) => void): boolean;
        (str: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
      } = Reflect.get(process.stdout, 'write');
      expect(result2).not.toBe(originalWrite);
      secondRelease.resolve();
      secondRuntime = await second;
      const result3: {
        (buffer: Uint8Array | string, cb?: (err?: Error | null) => void): boolean;
        (str: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error | null) => void): boolean;
      } = Reflect.get(process.stdout, 'write');
      expect(result3).toBe(originalWrite);
    } finally {
      firstRelease.resolve();
      secondRelease.resolve();
      process.stdout.write = originalWrite;
      firstRuntime?.dispose();
      secondRuntime?.dispose();
    }
  });
  it('invokes stdout write callbacks while suppressing Cloak stdout', async () => {
    const root = createTempRoot();
    let callbackCalled = false;
    const prepareBridgeRuntimeOptions58:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => {
        process.stdout.write('hidden Cloak output', () => {
          callbackCalled = true;
        });
        return fakeCloakBinaryPath;
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions58);
    expect(callbackCalled).toBe(true);
    runtime.dispose();
  });
  it('does not resolve GeoIP proxy matching without a configured proxy', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions59:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      geoipProxyMatch: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.geoip).toBeUndefined();
        expect(options.proxy).toBeUndefined();
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: options.args ?? [],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions59);
    expect(runtime.config.browser?.launchOptions?.args).toContain('--no-sandbox');
    runtime.dispose();
  });
  it('does not apply Cloak-specific defaults in Playwright engine mode', async () => {
    const root = createTempRoot();
    let called = false;
    const prepareBridgeRuntimeOptions60:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => {
        called = true;
        return {};
      },
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions60);
    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_BROWSER).toBe('chromium');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();
    expect(runtime.config.browser?.isolated).toBeUndefined();
    expect(runtime.config.browser?.initPage).toBeUndefined();
    expect(runtime.childEnv.NODE_OPTIONS).toBeUndefined();
    const receiver36Actual = runtime.config.browser?.launchOptions?.args;
    const values19: never[] = [];
    expect(receiver36Actual).toEqual(values19);
    expect(runtime.config.browser?.launchOptions?.chromiumSandbox).toBeUndefined();
    expect(called).toBe(false);
    runtime.dispose();
  });
  it('preserves an explicit upstream browser in Playwright engine mode', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions61 = {
      tempRoot: root,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_BROWSER: 'chrome',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    } as const;
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions61);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_BROWSER).toBe('chrome');
    runtime.dispose();
  });
  const values20 = ['cloak', 'playwright'] as const;
  it.each(values20)('adds only the bridge-owned debugging port for the %s engine', async (browserEngine) => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions62:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: root,
      managedCdpInternalPort: 43123,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => ({ args: ['--cloak-built'] }),
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: browserEngine,
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'true',
        PLAYWRIGHT_MCP_CDP_PORT_RANGE: '9222-9322',
      },
    };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions62);
    expect(runtime.config.browser?.launchOptions?.args).toContain('--remote-debugging-port=43123');
    expect(runtime.config.browser?.launchOptions?.args).not.toContain('--remote-debugging-address=0.0.0.0');
    expect(runtime.config.browser?.launchOptions?.args).not.toContain('--remote-allow-origins=*');
    expect(runtime.config.browser?.launchOptions?.args).not.toContain('--remote-debugging-pipe');
    const computedValue2 = runtime.config.browser?.launchOptions?.ignoreDefaultArgs ?? [];
    expect(computedValue2).not.toContain('--remote-debugging-pipe');
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_CDP_PORT_RANGE).toBeUndefined();
    runtime.dispose();
  });
  it('removes managed CDP control variables from a disabled child environment', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions63 = {
      tempRoot: root,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'false',
        CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: '9222',
      },
    } as const;
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions63);
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED).toBeUndefined();
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE).toBeUndefined();
    const computedValue3 = runtime.config.browser?.launchOptions?.args ?? [];
    const receiver37Actual = computedValue3;
    const stringMatchingResult = expect.stringMatching(/^--remote-debugging-port=/u);
    expect(receiver37Actual).not.toContain(stringMatchingResult);
    runtime.dispose();
  });
  const values21 = ['isolated', 'persistent'] as const;
  it.each(values21)('preserves the managed debugging port in %s profile mode', async (profileMode) => {
    const root = createTempRoot();
    const userDataDir = path.join(root, 'profile');
    const prepareBridgeRuntimeOptions64 = {
      tempRoot: root,
      managedCdpInternalPort: 43123,
      browserIsolated: profileMode === 'isolated',
      userDataDir: profileMode === 'persistent' ? userDataDir : undefined,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
      },
    } as const;
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions64);
    expect(runtime.config.browser?.launchOptions?.args).toContain('--remote-debugging-port=43123');
    const receiver38Actual = runtime.config.browser;
    const argumentValue2 =
      profileMode === 'isolated' ? { isolated: true } : { userDataDir: canonicalDirectory(userDataDir) };
    expect(receiver38Actual).toMatchObject(argumentValue2);
    runtime.dispose();
  });
  const values22: readonly string[] = [
    '--remote-debugging-port=9222',
    '--remote-debugging-address=0.0.0.0',
    '--remote-debugging-pipe',
    '--remote-allow-origins=*',
  ];
  it.each(values22)('rejects a conflicting raw Chromium argument with managed CDP: %s', async (argument) => {
    const prepareBridgeRuntimeOptions65 = {
      tempRoot: createTempRoot(),
      managedCdpInternalPort: 43123,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: argument,
      },
    } as const;
    const prepareBridgeRuntimeResult19 = prepareBridgeRuntime(prepareBridgeRuntimeOptions65);
    const receiver39Actual = prepareBridgeRuntimeResult19;
    const argumentValue3 = argument.split('=')[0];
    await expect(receiver39Actual).rejects.toThrow(argumentValue3);
  });
  it('rejects a raw managed-CDP conflict before Cloak launch-option transformation', async () => {
    const prepareBridgeRuntimeOptions66:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: createTempRoot(),
      managedCdpInternalPort: 43123,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => ({ args: [] }),
      env: {
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--remote-debugging-port=9222',
      },
    };
    const prepareBridgeRuntimeResult20 = prepareBridgeRuntime(prepareBridgeRuntimeOptions66);
    await expect(prepareBridgeRuntimeResult20).rejects.toThrow('--remote-debugging-port');
  });
  it('rejects unsupported bridge engines', async () => {
    const prepareBridgeRuntimeOptions67:
      import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined = {
      tempRoot: createTempRoot(),
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'firefox',
      },
    };
    const prepareBridgeRuntimeResult21 = prepareBridgeRuntime(prepareBridgeRuntimeOptions67);
    await expect(prepareBridgeRuntimeResult21).rejects.toThrow('PLAYWRIGHT_MCP_BROWSER_ENGINE');
  });
  it('builds deduplicated launch args', () => {
    const createLaunchArgsOptions = {
      CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
      CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX: 'true',
      CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--no-sandbox,--alpha',
    } as const;
    const launchArgsResult = createLaunchArgs(createLaunchArgsOptions);
    const receiver40Actual = launchArgsResult;
    const values23: string[] = ['--no-sandbox', '--alpha'];
    expect(receiver40Actual).toEqual(values23);
  });
});
