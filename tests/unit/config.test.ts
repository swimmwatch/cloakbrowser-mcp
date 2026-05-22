import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLaunchArgs, prepareBridgeRuntime } from '../../src/bridge/config.js';

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
      ensureCloakBinary: async () => '/tmp/cloakbrowser/chrome',
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
    expect(runtime.cloakBinaryPath).toBe('/tmp/cloakbrowser/chrome');
    expect(runtime.outputDir).toBe(outputDir);
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBe('/tmp/cloakbrowser/chrome');
    expect(runtime.childEnv.PLAYWRIGHT_MCP_OUTPUT_MODE).toBe('file');
    expect(runtime.config.browser?.launchOptions).toMatchObject({
      executablePath: '/tmp/cloakbrowser/chrome',
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
      ensureCloakBinary: async () => '/tmp/cloakbrowser/chrome',
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'true',
      },
    });

    expect(runtime.config.browser?.initScript?.[0]).toContain('console-fallback-init.js');
    expect(runtime.childEnv.NODE_OPTIONS).toContain('--require=');

    runtime.dispose();
  });

  it('does not apply Cloak-specific defaults in Playwright engine mode', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => '/tmp/cloakbrowser/chrome',
      env: {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'artifacts'),
      },
    });

    expect(runtime.cloakBinaryPath).toBeUndefined();
    expect(runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH).toBeUndefined();
    expect(runtime.childEnv.NODE_OPTIONS).toBeUndefined();
    expect(runtime.config.browser?.launchOptions?.args).toEqual([]);
    expect(runtime.config.browser?.launchOptions?.chromiumSandbox).toBeUndefined();

    runtime.dispose();
  });

  it('rejects unsupported bridge engines', async () => {
    await expect(
      prepareBridgeRuntime({
        tempRoot: createTempRoot(),
        ensureCloakBinary: async () => '/tmp/cloakbrowser/chrome',
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
