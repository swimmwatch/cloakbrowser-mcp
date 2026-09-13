#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { createDoctorReport, renderDoctorReport } from '#src/cli/doctor';
import { createCliCommand, readCliOptions } from '#src/cli/options';
import { cleanStaleSingletonLocks } from '#src/cli/singleton-lock-cleanup';
import { createDockerCliHealthResponder } from '#src/docker/cli-health';
import { createDockerDisplayController } from '#src/docker/control';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP, type BridgeOptions } from '#src/http/options';
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
    const { releaseChannel, ...runtimeOptions } = options.bridge;
    const dockerHealthResponder = createDockerCliHealthResponder();
    const dockerDisplayController = createDockerDisplayController();
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
        ? await startStreamableHttpCliBridge({
            ...options.http,
            serverInfo,
            releaseChannel,
            runtimeOptions,
            ensureDockerDisplay: () => dockerDisplayController.ensureDisplayForHeadedRuntime(false),
          })
        : await startStdioBridge(serverInfo, { ...runtimeOptions, releaseChannel }, dockerDisplayController);

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => {
        dockerHealthResponder.dispose();
        void running.close().finally(() => process.exit(0));
      });
    }
  });
  await command.parseAsync(process.argv);
}

async function startStdioBridge(
  serverInfo: Partial<Implementation>,
  runtimeOptions: BridgeOptions,
  dockerDisplayController: ReturnType<typeof createDockerDisplayController>,
): Promise<{ close(): Promise<void> }> {
  cleanStaleSingletonLocks();
  const bridge = await startBridge({
    beforeConnect: async (runtime) => {
      await dockerDisplayController.ensureDisplayForHeadedRuntime(
        runtime.config.browser?.launchOptions?.headless,
      );
      if (process.env.DISPLAY !== undefined) runtime.childEnv.DISPLAY = process.env.DISPLAY;
    },
    serverInfo,
    runtimeOptions,
  });
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
