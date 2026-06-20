import { describe, expect, it } from 'vitest';
import { resolvePlaywrightCoreBundlePath, resolvePlaywrightMcpCliPath } from '@/bridge/paths.js';

describe('bridge path resolution', () => {
  it('uses explicit upstream paths from the environment', () => {
    const previousCli = process.env.PLAYWRIGHT_MCP_CLI_PATH;
    const previousBundle = process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
    process.env.PLAYWRIGHT_MCP_CLI_PATH = '/tmp/playwright-mcp.js';
    process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH = '/tmp/coreBundle';

    try {
      expect(resolvePlaywrightMcpCliPath()).toBe('/tmp/playwright-mcp.js');
      expect(resolvePlaywrightCoreBundlePath()).toBe('/tmp/coreBundle');
    } finally {
      if (previousCli === undefined) delete process.env.PLAYWRIGHT_MCP_CLI_PATH;
      else process.env.PLAYWRIGHT_MCP_CLI_PATH = previousCli;
      if (previousBundle === undefined) delete process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
      else process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH = previousBundle;
    }
  });
});
