#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { parseCliOptions } from './http/options.js';
import { startStreamableHttpBridge } from './http/server.js';
import { PROJECT_METADATA } from './project/metadata.js';
import { startBridge } from './server.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const help = `cloakbrowser-mcp ${pkg.version}

Playwright MCP bridge backed by CloakBrowser.

Usage:
  cloakbrowser-mcp [--transport stdio]
  cloakbrowser-mcp --transport streamable-http [--http-host 127.0.0.1] [--http-port 3000]
  cloakbrowser-mcp --help
  cloakbrowser-mcp --version

Primary configuration is provided with PLAYWRIGHT_MCP_* environment variables.
Cloak-specific toggles use CLOAK_PLAYWRIGHT_MCP_*.

Common environment variables:
  CLOAK_PLAYWRIGHT_MCP_TRANSPORT       stdio | streamable-http (default: stdio)
  CLOAK_PLAYWRIGHT_MCP_HTTP_HOST       HTTP bind host (default: 127.0.0.1)
  CLOAK_PLAYWRIGHT_MCP_HTTP_PORT       HTTP bind port (default: 3000)
  CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT   HTTP endpoint path (default: /mcp)
  CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN optional HTTP Bearer token
  CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND memory (default: memory)
  CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS session idle TTL ms (default: 3600000)
  CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX max active HTTP sessions (default: 32)
  PLAYWRIGHT_MCP_BROWSER_ENGINE        cloak | playwright (default: cloak)
  PLAYWRIGHT_MCP_HEADLESS              true | false (default: true)
  PLAYWRIGHT_MCP_OUTPUT_DIR            artifact directory (default: .playwright-mcp)
  PLAYWRIGHT_MCP_OUTPUT_MODE           stdout | file (default: stdout)
  PLAYWRIGHT_MCP_VIEWPORT_SIZE         WIDTHxHEIGHT
  PLAYWRIGHT_MCP_TIMEOUT_ACTION        action timeout ms (default: 5000)
  PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION    navigation timeout ms (default: 60000)
  CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK true | false (default: true)
  CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS    true | false (default: true)
  CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS      comma-separated or JSON array Chromium args
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(help);
    return;
  }
  if (args.includes('--version') || args.includes('-V')) {
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  const options = parseCliOptions(args);
  const serverInfo = {
    name: PROJECT_METADATA.mcpName,
    title: PROJECT_METADATA.title,
    version: pkg.version,
    description: PROJECT_METADATA.description,
    websiteUrl: PROJECT_METADATA.websiteUrl,
    icons: PROJECT_METADATA.icons,
  };

  const running =
    options.transport === 'streamable-http'
      ? await startStreamableHttpBridge({ ...options.http, serverInfo })
      : await startStdioBridge(serverInfo);

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void running.close().finally(() => process.exit(0));
    });
  }
}

async function startStdioBridge(serverInfo: Partial<Implementation>): Promise<{ close(): Promise<void> }> {
  const bridge = await startBridge({ serverInfo });
  return {
    close: () => bridge.dispose(),
  };
}

void main().catch((error: unknown) => {
  process.stderr.write(`fatal: ${(error as Error).message}\n`);
  process.exit(1);
});
