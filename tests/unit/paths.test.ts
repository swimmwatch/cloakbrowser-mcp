import { describe, expect, it } from 'vitest';
import { resolvePlaywrightCoreBundlePath, resolvePlaywrightMcpCliPath } from '@/bridge/paths.js';
import { fakeCoreBundlePath, fakeUpstreamCliPath } from '@tests/helpers/paths.js';
describe('bridge path resolution', () => {
  it('uses explicit upstream paths from the environment', () => {
    const previousCli = process.env.PLAYWRIGHT_MCP_CLI_PATH;
    const previousBundle = process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
    process.env.PLAYWRIGHT_MCP_CLI_PATH = fakeUpstreamCliPath;
    process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH = fakeCoreBundlePath;
    try {
      const resolvePlaywrightMcpCliPathResult = resolvePlaywrightMcpCliPath();
      expect(resolvePlaywrightMcpCliPathResult).toBe(fakeUpstreamCliPath);
      const resolvePlaywrightCoreBundlePathResult = resolvePlaywrightCoreBundlePath();
      expect(resolvePlaywrightCoreBundlePathResult).toBe(fakeCoreBundlePath);
    } finally {
      if (previousCli === undefined) delete process.env.PLAYWRIGHT_MCP_CLI_PATH;
      else process.env.PLAYWRIGHT_MCP_CLI_PATH = previousCli;
      if (previousBundle === undefined) delete process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
      else process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH = previousBundle;
    }
  });
  it('resolves bundled upstream paths when environment overrides are absent', () => {
    const previousCli = process.env.PLAYWRIGHT_MCP_CLI_PATH;
    const previousBundle = process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
    delete process.env.PLAYWRIGHT_MCP_CLI_PATH;
    delete process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
    try {
      const resolvePlaywrightMcpCliPathResult2 = resolvePlaywrightMcpCliPath();
      const toPosixPathResult = toPosixPath(resolvePlaywrightMcpCliPathResult2);
      expect(toPosixPathResult).toMatch(/node_modules\/@playwright\/mcp\/cli\.js$/u);
      const resolvePlaywrightCoreBundlePathResult2 = resolvePlaywrightCoreBundlePath();
      const toPosixPathResult2 = toPosixPath(resolvePlaywrightCoreBundlePathResult2);
      expect(toPosixPathResult2).toMatch(
        /node_modules\/@playwright\/mcp\/node_modules\/playwright-core\/lib\/coreBundle(?:\.js)?$/u,
      );
    } finally {
      if (previousCli === undefined) delete process.env.PLAYWRIGHT_MCP_CLI_PATH;
      else process.env.PLAYWRIGHT_MCP_CLI_PATH = previousCli;
      if (previousBundle === undefined) delete process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
      else process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH = previousBundle;
    }
  });
});
function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/');
}
