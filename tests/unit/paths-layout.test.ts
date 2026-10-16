import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  currentModuleDir,
  resolvePlaywrightCoreBundlePath,
  resolvePlaywrightMcpCliPath,
} from '@/bridge/paths.js';

const { exists } = vi.hoisted(() => ({ exists: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: exists,
}));
afterEach(() => {
  exists.mockReset();
  vi.unstubAllEnvs();
});

describe('container and hoisted upstream path layouts', () => {
  it('selects the official container CLI and core bundle when available', () => {
    vi.stubEnv('PLAYWRIGHT_MCP_CLI_PATH', undefined);
    vi.stubEnv('CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH', undefined);
    exists.mockReturnValue(true);
    const cli = resolvePlaywrightMcpCliPath();
    const bundle = resolvePlaywrightCoreBundlePath();
    expect(cli).toBe('/app/cli.js');
    expect(bundle).toBe('/app/node_modules/playwright-core/lib/coreBundle');
  });
  it('resolves a hoisted core bundle when the container and nested bundle are absent', () => {
    vi.stubEnv('CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH', undefined);
    exists.mockReturnValue(false);
    const require = createRequire(import.meta.url);
    const expected = require.resolve('playwright-core/lib/coreBundle');
    const bundle = resolvePlaywrightCoreBundlePath();
    expect(bundle).toBe(expected);
  });
  it('decodes a file URL without treating escaped path characters as directory separators', () => {
    const file = path.resolve('directory with spaces', 'module #1.ts');
    const url = pathToFileURL(file);
    const directory = currentModuleDir(url.href);
    const expected = path.dirname(file);
    expect(directory).toBe(expected);
  });
});
