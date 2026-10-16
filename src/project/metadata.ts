import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  license?: string;
  mcpName?: string;
}
const uRL = new URL('../../package.json', import.meta.url);
const fileSyncResult = readFileSync(uRL, 'utf8');
const packageMetadata = JSON.parse(fileSyncResult) as PackageMetadata;
const requireFromHere = createRequire(import.meta.url);
export const PLAYWRIGHT_MCP_PACKAGE = '@playwright/mcp';
export const PLAYWRIGHT_MCP_VERSION = readDependencyVersion(PLAYWRIGHT_MCP_PACKAGE);
export const PLAYWRIGHT_MCP_BROWSER_TOOL_COUNT = 25;
export const CLOAKBROWSER_TOOL_COUNT = 2;
const freezeOptions: {
  packageName: string;
  version: string;
  license: string;
  mcpName: string;
  title: 'CloakBrowser MCP';
  description: string;
  websiteUrl: 'https://swimmwatch.github.io/cloakbrowser-mcp/';
  icons: { src: string; mimeType: string; sizes: string[] }[];
} = {
  packageName: packageMetadata.name,
  version: packageMetadata.version,
  license: packageMetadata.license ?? 'MIT',
  mcpName: packageMetadata.mcpName ?? 'io.github.swimmwatch/cloakbrowser-mcp',
  title: 'CloakBrowser MCP',
  description:
    packageMetadata.description ??
    'Playwright MCP bridge that runs upstream browser tools with the CloakBrowser Chromium binary.',
  websiteUrl: 'https://swimmwatch.github.io/cloakbrowser-mcp/',
  icons: [
    {
      src: 'https://swimmwatch.github.io/cloakbrowser-mcp/assets/brand/logo.svg',
      mimeType: 'image/svg+xml',
      sizes: ['any'],
    },
  ],
};
export const PROJECT_METADATA = Object.freeze(freezeOptions);
export const MCP_SERVER_INSTRUCTIONS = [
  'This server forwards upstream Playwright MCP browser tools and runs them with CloakBrowser by default.',
  'Use browser_snapshot before interacting with unfamiliar pages.',
  'Use cloakbrowser_bridge_info and cloakbrowser_binary_info for bridge diagnostics.',
].join(' ');
function readDependencyVersion(packageName: string): string {
  const message = `${packageName}/package.json`;
  const packageJson = requireFromHere.resolve(message);
  const fileSyncResult2 = readFileSync(packageJson, 'utf8');
  const metadata = JSON.parse(fileSyncResult2) as {
    version?: string;
  };
  return metadata.version ?? 'unknown';
}
