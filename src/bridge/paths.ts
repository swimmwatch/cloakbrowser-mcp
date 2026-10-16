import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const requireFromHere = createRequire(import.meta.url);
export function resolvePlaywrightMcpCliPath(): string {
  if (process.env.PLAYWRIGHT_MCP_CLI_PATH) return process.env.PLAYWRIGHT_MCP_CLI_PATH;
  if (existsSync('/app/cli.js')) return '/app/cli.js';
  const packageJson = requireFromHere.resolve('@playwright/mcp/package.json');
  const dirnameResult = path.dirname(packageJson);
  return path.join(dirnameResult, 'cli.js');
}
export function resolvePlaywrightCoreBundlePath(): string {
  if (process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH) {
    return process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH;
  }
  if (existsSync('/app/node_modules/playwright-core/lib/coreBundle.js')) {
    return '/app/node_modules/playwright-core/lib/coreBundle';
  }
  const packageJson = requireFromHere.resolve('@playwright/mcp/package.json');
  const dirnameResult2 = path.dirname(packageJson);
  const nestedCoreBundle = path.join(dirnameResult2, 'node_modules', 'playwright-core', 'lib', 'coreBundle');
  const message = `${nestedCoreBundle}.js`;
  if (existsSync(message)) return nestedCoreBundle;
  return requireFromHere.resolve('playwright-core/lib/coreBundle');
}
export function currentModuleDir(metaUrl: string): string {
  const fileURLToPathResult = fileURLToPath(metaUrl);
  return path.dirname(fileURLToPathResult);
}
