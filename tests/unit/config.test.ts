import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLaunchArgs, prepareBridgeRuntime } from '@/bridge/config.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-test-'));
  tempRoots.push(root);
  return root;
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
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
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
        PLAYWRIGHT_MCP_HEADLESS: 'false',
        PLAYWRIGHT_MCP_OUTPUT_MODE: 'file',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--foo,--bar=baz',
      },
    });

    expect(runtime.browserEngine).toBe('cloak');
    expect(runtime.cloakBinaryPath).toBe(fakeCloakBinaryPath);
    expect(runtime.outputDir).toBe(outputDir);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBe(fakeCloakBinaryPath);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_OUTPUT_MODE).toBe('file');
    expect(runtime.config.browser?.launchOptions).toMatchObject({
      executablePath: fakeCloakBinaryPath,
      headless: false,
      args: ['--no-sandbox', '--foo', '--bar=baz'],
      chromiumSandbox: false,
    });

    runtime.dispose();
  });

  it('adds the console fallback preload when enabled', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'true',
      },
    });

    expect(runtime.config.browser?.initScript?.[0]).toContain('console-fallback-init.js');
    expect(runtime.childEnv.NODE_OPTIONS).toContain('--require=');

    runtime.dispose();
  });

  it('enables isolated browser profiles when requested', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(runtime.config.browser?.isolated).toBe(true);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBe('true');

    runtime.dispose();
  });

  it('lets runtime headless override the default and child environment', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      headless: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(runtime.config.browser?.launchOptions?.headless).toBe(false);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_HEADLESS).toBe('false');

    runtime.dispose();
  });

  it('lets runtime headless override an environment value', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      headless: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_HEADLESS: 'false',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(runtime.config.browser?.launchOptions?.headless).toBe(true);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_HEADLESS).toBe('true');

    runtime.dispose();
  });

  it('adds GeoIP-derived timezone and locale launch args when proxy matching is enabled', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.proxy).toEqual({
          server: 'http://proxy.example:8080',
          bypass: '.internal',
          username: 'user',
          password: 'pass',
        });
        expect(options.geoip).toBe(true);
        expect(options.stealthArgs).toBe(false);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [
            ...(options.args ?? []),
            '--proxy-server=http://proxy.example:8080',
            '--fingerprint-timezone=Europe/Berlin',
            '--lang=de-DE',
            '--fingerprint-locale=de-DE',
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
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--lang=en-US,--lang=fr-FR,--alpha,--fingerprint-locale=en-US',
      },
    });

    expect(runtime.config.browser?.launchOptions?.args).toEqual([
      '--no-sandbox',
      '--lang=de-DE',
      '--alpha',
      '--fingerprint-locale=de-DE',
      '--fingerprint-timezone=Europe/Berlin',
    ]);
    expect(runtime.config.browser?.launchOptions?.proxy).toEqual({
      server: 'http://proxy.example:8080',
      bypass: '.internal',
      username: 'user',
      password: 'pass',
    });
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();

    runtime.dispose();
  });

  it('passes runtime proxy options through the upstream child environment', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBe('http://runtime.example:8080');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBe('.runtime');
    expect(runtime.config.browser?.launchOptions?.proxy).toEqual({
      server: 'http://runtime.example:8080',
      bypass: '.runtime',
    });

    runtime.dispose();
  });

  it('lets runtime proxy override env proxy and clear inherited bypass', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBe('http://runtime.example:8080');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();
    expect(runtime.config.browser?.launchOptions?.proxy).toEqual({
      server: 'http://runtime.example:8080',
    });

    runtime.dispose();
  });

  it('writes authenticated environment proxy credentials into generated config only', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://user:p%40ssword@proxy.example:8080',
        PLAYWRIGHT_MCP_PROXY_BYPASS: '.internal',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(runtime.config.browser?.launchOptions?.proxy).toEqual({
      server: 'http://proxy.example:8080',
      bypass: '.internal',
      username: 'user',
      password: 'p@ssword',
    });
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();

    runtime.dispose();
  });

  it('writes authenticated runtime proxy credentials into generated config only', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(runtime.config.browser?.launchOptions?.proxy).toEqual({
      server: 'http://runtime.example:8080',
      bypass: '.runtime',
      username: 'runtime',
      password: 'p@ssword',
    });
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_SERVER).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_PROXY_BYPASS).toBeUndefined();

    runtime.dispose();
  });

  it('uses runtime proxy options for GeoIP proxy matching', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: true,
      proxy: {
        server: 'http://runtime.example:8080',
        bypass: '.runtime',
      },
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.proxy).toEqual({
          server: 'http://runtime.example:8080',
          bypass: '.runtime',
        });
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [...(options.args ?? []), '--fingerprint-timezone=Europe/Paris', '--lang=fr-FR'],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://env.example:8080',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
      },
    });

    expect(runtime.config.browser?.launchOptions?.args).toEqual([
      '--no-sandbox',
      '--fingerprint-timezone=Europe/Paris',
      '--lang=fr-FR',
    ]);

    runtime.dispose();
  });

  it('allows an explicit runtime option to disable env-enabled GeoIP proxy matching', async () => {
    const root = createTempRoot();
    let called = false;
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => {
        called = true;
        return {};
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_PROXY_SERVER: 'http://proxy.example:8080',
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
      },
    });

    expect(called).toBe(false);

    runtime.dispose();
  });

  it('adds the humanize init page when enabled in Cloak mode', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      humanize: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(runtime.config.browser?.initPage).toHaveLength(1);
    expect(path.basename(runtime.config.browser!.initPage![0]!)).toBe('humanize-init-page.cjs');
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET).toBe('default');
    const initPageSource = readFileSync(runtime.config.browser!.initPage![0]!, 'utf8');
    expect(initPageSource).toContain("import('cloakbrowser/human')");
    expect(initPageSource).toContain('CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET');
    expect(runtime.config.browser!.initPage![0]!).not.toContain(runtime.tempDir);

    runtime.dispose();
  });

  it('passes human preset options through the upstream child environment', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      humanize: true,
      humanPreset: 'careful',
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'default',
      },
    });

    expect(runtime.config.browser?.initPage).toHaveLength(1);
    expect(runtime.childEnv.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET).toBe('careful');

    runtime.dispose();
  });

  it('rejects unsupported human presets', async () => {
    await expect(
      prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'fast',
        },
      }),
    ).rejects.toThrow('CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET');
  });

  it('allows an explicit runtime option to disable env-enabled humanize behavior', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      humanize: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true',
      },
    });

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
      const first = prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => {
          firstEntered.resolve();
          await firstRelease.promise;
          return fakeCloakBinaryPath;
        },
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      });
      await firstEntered.promise;

      const second = prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => {
          secondEntered.resolve();
          await secondRelease.promise;
          return fakeCloakBinaryPath;
        },
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      });
      await secondEntered.promise;

      firstRelease.resolve();
      firstRuntime = await first;
      expect(Reflect.get(process.stdout, 'write')).not.toBe(originalWrite);

      secondRelease.resolve();
      secondRuntime = await second;
      expect(Reflect.get(process.stdout, 'write')).toBe(originalWrite);
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
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(callbackCalled).toBe(true);

    runtime.dispose();
  });

  it('does not resolve GeoIP proxy matching without a configured proxy', async () => {
    const root = createTempRoot();
    let called = false;
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async () => {
        called = true;
        return {};
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    expect(called).toBe(false);

    runtime.dispose();
  });

  it('does not apply Cloak-specific defaults in Playwright engine mode', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true',
      },
    });

    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();
    expect(runtime.config.browser?.isolated).toBeUndefined();
    expect(runtime.config.browser?.initPage).toBeUndefined();
    expect(runtime.childEnv.NODE_OPTIONS).toBeUndefined();
    expect(runtime.config.browser?.launchOptions?.args).toEqual([]);
    expect(runtime.config.browser?.launchOptions?.chromiumSandbox).toBeUndefined();

    runtime.dispose();
  });

  it('rejects unsupported bridge engines', async () => {
    await expect(
      prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_BROWSER_ENGINE: 'firefox',
        },
      }),
    ).rejects.toThrow('PLAYWRIGHT_MCP_BROWSER_ENGINE');
  });

  it('builds deduplicated launch args', () => {
    expect(
      createLaunchArgs({
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX: 'true',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--no-sandbox,--alpha',
      }),
    ).toEqual(['--no-sandbox', '--alpha']);
  });
});
