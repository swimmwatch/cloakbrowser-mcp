import { mkdtempSync, rmSync } from 'node:fs';
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

  it('adds GeoIP-derived timezone and locale launch args when proxy matching is enabled', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      geoipProxyMatch: true,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      buildCloakLaunchOptions: async (options) => {
        if (!options) throw new Error('Expected Cloak launch options');
        expect(options.proxy).toEqual({
          server: 'http://user:pass@proxy.example:8080',
          bypass: '.internal',
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
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--lang=en-US,--alpha',
      },
    });

    expect(runtime.config.browser?.launchOptions?.args).toEqual([
      '--no-sandbox',
      '--lang=de-DE',
      '--alpha',
      '--fingerprint-timezone=Europe/Berlin',
      '--fingerprint-locale=de-DE',
    ]);

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
      },
    });

    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED).toBeUndefined();
    expect(runtime.config.browser?.isolated).toBeUndefined();
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
