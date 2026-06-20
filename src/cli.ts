#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { createDoctorReport, renderDoctorReport } from './cli/doctor.js';
import { createCliCommand, readCliOptions } from './cli/options.js';
import { startStreamableHttpBridge } from './http/server.js';
import { createBridgeLogger } from './logging/logger.js';
import { PROJECT_METADATA } from './project/metadata.js';
import { startBridge } from './server.js';

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
      options.transport === 'streamable-http'
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

void main().catch((error: unknown) => {
  process.stderr.write(`fatal: ${(error as Error).message}\n`);
  process.exit(1);
});
