import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
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

function canonicalDirectory(directory: string): string {
  try {
    return path.normalize(realpathSync.native(directory));
  } catch {
    return path.resolve(path.normalize(directory));
  }
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

  it('merges generated CloakBrowser default launch args', async () => {
    const root = createTempRoot();
    const previousCloakBinaryPath = process.env.CLOAKBROWSER_BINARY_PATH;
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(process.env.CLOAKBROWSER_BINARY_PATH).toBe(fakeCloakBinaryPath);
        expect(options.geoip).toBeUndefined();
        expect(options.proxy).toBeUndefined();
        expect(options.stealthArgs).toBe(false);
        expect(options.args).toEqual(['--no-sandbox', '--alpha']);
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [...(options.args ?? []), '--start-maximized'],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--alpha',
      },
    });

    expect(runtime.config.browser?.launchOptions?.args).toEqual([
      '--no-sandbox',
      '--alpha',
      '--start-maximized',
    ]);
    expect(process.env.CLOAKBROWSER_BINARY_PATH).toBe(previousCloakBinaryPath);

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

  it('writes persistent profiles to generated config and skips isolated mode', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    const expectedProfileDir = canonicalDirectory(profileDir);
    expect(runtime.config.browser?.userDataDir).toBe(expectedProfileDir);
    expect(runtime.config.browser?.isolated).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_USER_DATA_DIR).toBe(expectedProfileDir);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();

    runtime.dispose();

    const afterDispose = await prepareBridgeRuntime({
      tempRoot: root,
      browserIsolated: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });
    expect(afterDispose.config.browser?.userDataDir).toBe(expectedProfileDir);
    afterDispose.dispose();
  });

  it('rejects duplicate active persistent profile directories', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });

    await expect(
      prepareBridgeRuntime({
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      }),
    ).rejects.toThrow('already active');

    runtime.dispose();
  });

  it('writes validated context options and shallow-merges runtime values over env values', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      contextOptions: {
        viewport: { width: 1024, height: 768 },
        timezoneId: 'Europe/Berlin',
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: JSON.stringify({
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
        }),
      },
    });

    expect(runtime.config.browser?.contextOptions).toEqual({
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
    });

    runtime.dispose();
  });

  it('passes explicit context viewport to CloakBrowser launch options', async () => {
    const root = createTempRoot();
    const viewport = { width: 1024, height: 768 };
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      contextOptions: { viewport },
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        const optionsWithViewport = options as typeof options & { viewport?: typeof viewport };
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
    });

    expect(runtime.config.browser?.contextOptions?.viewport).toEqual(viewport);

    runtime.dispose();
  });

  it('rejects unsupported or invalid context options', async () => {
    await expect(
      prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: JSON.stringify({ storageState: 'state.json' }),
        },
      }),
    ).rejects.toThrow('storageState is not supported');

    await expect(
      prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: JSON.stringify({ viewport: { width: 0, height: 720 } }),
        },
      }),
    ).rejects.toThrow('viewport.width');
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
        expect(options.headless).toBe(true);
        expect(options.geoip).toBe(true);
        expect(options.stealthArgs).toBe(false);
        expect(options.args).toEqual([
          '--no-sandbox',
          '--lang=en-US',
          '--lang=fr-FR',
          '--alpha',
          '--fingerprint-locale=en-US',
        ]);
        expect(options.launchOptions).toEqual({ chromiumSandbox: false });
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

  it('generates extension launch args through CloakBrowser launch options', async () => {
    const root = createTempRoot();
    const profileDir = path.join(root, 'profiles', 'default');
    const extensionDir = path.join(root, 'extensions', 'my-extension');
    mkdirSync(extensionDir, { recursive: true });
    const relativeExtensionDir = path.relative(process.cwd(), extensionDir);

    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.headless).toBe(true);
        expect(options.stealthArgs).toBe(false);
        expect(options.args).toEqual(['--no-sandbox']);
        expect(options.extensionPaths).toEqual([canonicalDirectory(extensionDir)]);
        expect(options.launchOptions).toEqual({ chromiumSandbox: false });
        return {
          executablePath: fakeCloakBinaryPath,
          headless: true,
          args: [
            ...(options.args ?? []),
            `--load-extension=${options.extensionPaths?.join(',')}`,
            `--disable-extensions-except=${options.extensionPaths?.join(',')}`,
          ],
        };
      },
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        PLAYWRIGHT_MCP_USER_DATA_DIR: profileDir,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS: 'false',
        CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: JSON.stringify([relativeExtensionDir]),
      },
    });

    expect(runtime.config.browser?.launchOptions?.args).toEqual([
      '--no-sandbox',
      `--load-extension=${canonicalDirectory(extensionDir)}`,
      `--disable-extensions-except=${canonicalDirectory(extensionDir)}`,
    ]);

    runtime.dispose();
  });

  it('rejects extension paths without a persistent profile', async () => {
    const root = createTempRoot();
    const extensionDir = path.join(root, 'extensions', 'my-extension');
    mkdirSync(extensionDir, { recursive: true });

    await expect(
      prepareBridgeRuntime({
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
          CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: extensionDir,
        },
      }),
    ).rejects.toThrow('requires PLAYWRIGHT_MCP_USER_DATA_DIR');
  });

  it('rejects extension paths that are not existing directories', async () => {
    const root = createTempRoot();
    await expect(
      prepareBridgeRuntime({
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          PLAYWRIGHT_MCP_USER_DATA_DIR: path.join(root, 'profiles', 'default'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
          CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS: path.join(root, 'missing-extension'),
        },
      }),
    ).rejects.toThrow('must point to an existing directory');
  });

  it('labels runtime profile and extension path validation errors by metadata field', async () => {
    const root = createTempRoot();
    await expect(
      prepareBridgeRuntime({
        tempRoot: root,
        userDataDir: ' ',
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      }),
    ).rejects.toThrow('userDataDir must be a non-empty path');

    await expect(
      prepareBridgeRuntime({
        tempRoot: root,
        userDataDir: path.join(root, 'profiles', 'default'),
        extensionPaths: [path.join(root, 'missing-extension')],
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      }),
    ).rejects.toThrow('extensionPaths[0] must point to an existing directory');
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
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: false,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.geoip).toBeUndefined();
        expect(options.proxy).toEqual({ server: 'http://proxy.example:8080' });
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
    });

    expect(runtime.config.browser?.launchOptions?.args).toContain('--no-sandbox');

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
    expect(initPageSource).toContain("import('cloakbrowser')");
    expect(initPageSource).toContain("import('cloakbrowser/human')");
    expect(initPageSource).toContain('humanizeBrowser');
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
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(runtime.config.browser?.launchOptions?.args).toContain('--no-sandbox');

    runtime.dispose();
  });

  it('does not apply Cloak-specific defaults in Playwright engine mode', async () => {
    const root = createTempRoot();
    let called = false;
    const runtime = await prepareBridgeRuntime({
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
    });

    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();
    expect(runtime.config.browser?.isolated).toBeUndefined();
    expect(runtime.config.browser?.initPage).toBeUndefined();
    expect(runtime.childEnv.NODE_OPTIONS).toBeUndefined();
    expect(runtime.config.browser?.launchOptions?.args).toEqual([]);
    expect(runtime.config.browser?.launchOptions?.chromiumSandbox).toBeUndefined();
    expect(called).toBe(false);

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
