#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { PROJECT_METADATA } from './project/metadata.js';
import { startBridge } from './server.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const help = `cloakbrowser-mcp ${pkg.version}

Playwright MCP bridge backed by CloakBrowser.

Usage:
  cloakbrowser-mcp
  cloakbrowser-mcp --help
  cloakbrowser-mcp --version

Primary configuration is provided with PLAYWRIGHT_MCP_* environment variables.
Cloak-specific toggles use CLOAK_PLAYWRIGHT_MCP_*.

Common environment variables:
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

  const bridge = await startBridge({
    serverInfo: {
      name: PROJECT_METADATA.mcpName,
      title: PROJECT_METADATA.title,
      version: pkg.version,
      description: PROJECT_METADATA.description,
      websiteUrl: PROJECT_METADATA.websiteUrl,
      icons: PROJECT_METADATA.icons,
    },
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void bridge.dispose().finally(() => process.exit(0));
    });
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`fatal: ${(error as Error).message}\n`);
  process.exit(1);
});
