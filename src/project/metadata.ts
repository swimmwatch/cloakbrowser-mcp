import { readFileSync } from 'node:fs';

interface PackageMetadata {
  name: string;
  version: string;
  description?: string;
  license?: string;
  mcpName?: string;
}

const packageMetadata = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as PackageMetadata;

export const MCP_SERVER_NAME = packageMetadata.mcpName ?? 'io.github.swimmwatch/cloakbrowser-mcp';
export const MCP_SERVER_TITLE = 'CloakBrowser MCP';
export const MCP_SERVER_DESCRIPTION =
  packageMetadata.description ?? 'Model Context Protocol server for CloakBrowser automation.';
export const MCP_SERVER_WEBSITE_URL = 'https://swimmwatch.github.io/cloakbrowser-mcp/';
export const MCP_SERVER_ICON = Object.freeze({
  src: 'https://swimmwatch.github.io/cloakbrowser-mcp/assets/brand/logo.svg',
  mimeType: 'image/svg+xml',
  sizes: ['any'],
});

export const MCP_SERVER_INSTRUCTIONS = [
  'Use this MCP server to automate CloakBrowser through Playwright-compatible browser tools.',
  'Prefer browser_snapshot before selecting elements, then use locator or target arguments exposed by the tools.',
  'Artifacts such as screenshots, PDFs, HAR files, traces, and videos are written under the configured output directory.',
  'Some higher-impact CloakBrowser extensions are available only when their capability flags are enabled.',
].join(' ');

export const PROJECT_METADATA = Object.freeze({
  packageName: packageMetadata.name,
  version: packageMetadata.version,
  license: packageMetadata.license ?? 'MIT',
  mcpName: MCP_SERVER_NAME,
  title: MCP_SERVER_TITLE,
  description: MCP_SERVER_DESCRIPTION,
  websiteUrl: MCP_SERVER_WEBSITE_URL,
  icons: [MCP_SERVER_ICON],
});

export const PLAYWRIGHT_MCP_PACKAGE = '@playwright/mcp';
export const PLAYWRIGHT_MCP_VERSION = '0.0.75';
export const PLAYWRIGHT_MCP_BROWSER_TOOL_COUNT = 23;
export const CLOAKBROWSER_EXTRA_TOOL_COUNT = 5;
