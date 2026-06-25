#!/usr/bin/env node
import { readFileSync, readdirSync, readlinkSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { createDoctorReport, renderDoctorReport } from '#src/cli/doctor';
import { createCliCommand, readCliOptions } from '#src/cli/options';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP } from '#src/http/options';
import { startStreamableHttpBridge } from '#src/http/server';
import { createBridgeLogger } from '#src/logging/logger';
import { PROJECT_METADATA } from '#src/project/metadata';
import { startBridge } from '#src/server';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string;
};

async function main(): Promise<void> {
  const command = createCliCommand(pkg.version, {
    doctorAction: (options) => {
      const report = createDoctorReport();
      process.stdout.write(
        options.json ? `${JSON.stringify(report, null, 2)}\n` : renderDoctorReport(report),
      );
      if (report.status === 'error') process.exitCode = 1;
    },
  });
  command.action(async () => {
    const options = readCliOptions(command);
    const serverInfo = {
      name: PROJECT_METADATA.mcpName,
      title: PROJECT_METADATA.title,
      version: pkg.version,
      description: PROJECT_METADATA.description,
      websiteUrl: PROJECT_METADATA.websiteUrl,
      icons: PROJECT_METADATA.icons,
    };

    const running =
      options.transport === BRIDGE_TRANSPORT_STREAMABLE_HTTP
        ? await startStreamableHttpCliBridge({ ...options.http, serverInfo })
        : await startStdioBridge(serverInfo);

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        void running.close().finally(() => process.exit(0));
      });
    }
  });
  await command.parseAsync(process.argv);
}

async function startStdioBridge(serverInfo: Partial<Implementation>): Promise<{ close(): Promise<void> }> {
  cleanStaleSingletonLocks();
  const bridge = await startBridge({ serverInfo });
  return {
    close: () => bridge.dispose(),
  };
}

async function startStreamableHttpCliBridge(
  options: Parameters<typeof startStreamableHttpBridge>[0],
): Promise<{ close(): Promise<void> }> {
  const logger = createBridgeLogger();
  const bridge = await startStreamableHttpBridge({
    ...options,
    logger,
  });
  logger.info({ url: bridge.url }, 'streamable-http listening');
  return bridge;
}

/**
 * Clean stale Chromium SingletonLock files left behind by killed browser
 * processes. Chromium uses these symlinks to prevent concurrent profile
 * access — when the browser is killed with SIGKILL, the lock files remain and
 * block every subsequent launch with "Browser is already in use".
 *
 * This runs on every CloakBrowser MCP stdio startup, before the Playwright
 * MCP subprocess is spawned, so the downstream process never sees a zombie.
 *
 * Related upstream issues (fixed in newer @playwright/mcp but not in the
 * version that ships with CloakBrowser):
 * - microsoft/playwright-mcp#1311
 * - microsoft/playwright-mcp#1305
 * - microsoft/playwright-mcp#1245
 */
function cleanStaleSingletonLocks(): void {
  const cacheDir = join(homedir(), '.cache', 'ms-playwright-mcp');
  let entries: string[];
  try {
    entries = readdirSync(cacheDir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.startsWith('mcp-chromium-')) continue;
    const lockPath = join(cacheDir, entry, 'SingletonLock');
    let target: string;
    try {
      target = readlinkSync(lockPath);
    } catch {
      continue;
    }
    const pidMatch = /\d+$/.exec(target);
    if (!pidMatch) continue;
    const pid = Number(pidMatch[0]);
    if (!Number.isSafeInteger(pid) || pid <= 0) continue;
    // kill(pid, 0) does NOT send a signal — it only checks existence.
    try {
      process.kill(pid, 0);
      continue; // process alive — skip
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code !== 'ESRCH') continue; // EPERM or unexpected error — don't delete locks
      // process dead — clean all lock files
    }
    for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket'] as const) {
      try {
        unlinkSync(join(cacheDir, entry, f));
      } catch {
        // ignore — file may not exist
      }
    }
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`fatal: ${(error as Error).message}\n`);
  process.exit(1);
});
