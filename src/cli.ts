#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { createDoctorReport, renderDoctorReport } from '#src/cli/doctor';
import { cdpRemoteWarning, createCliCommand, readCliOptions } from '#src/cli/options';
import { cleanStaleSingletonLocks } from '#src/cli/singleton-lock-cleanup';
import { createDockerCliHealthResponder } from '#src/docker/cli-health';
import { createDockerDisplayController } from '#src/docker/control';
import type { CdpEndpointConfig } from '#src/cdp/config';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP, type BridgeOptions } from '#src/http/options';
import { startStreamableHttpBridge } from '#src/http/server';
import { createBridgeLogger } from '#src/logging/logger';
import { PROJECT_METADATA } from '#src/project/metadata';
import { startBridge } from '#src/server';
const uRL = new URL('../package.json', import.meta.url);
const fileSyncResult = readFileSync(uRL, 'utf8');
const pkg = JSON.parse(fileSyncResult) as {
  version: string;
};
async function main(): Promise<void> {
  const createCliCommandOptions: Parameters<typeof createCliCommand>[1] = {
    doctorAction: (options) => {
      const report = createDoctorReport();
      const argumentValue = options.json
        ? `${JSON.stringify(report, null, 2)}\n`
        : renderDoctorReport(report);
      process.stdout.write(argumentValue);
      if (report.status === 'error') process.exitCode = 1;
    },
  };
  const command = createCliCommand(pkg.version, createCliCommandOptions);
  command.action(async () => {
    const options = readCliOptions(command);
    if (options.cdp.allowRemote) {
      process.stderr.write(cdpRemoteWarning);
    }
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
        ? await (() => {
            const startStreamableHttpCliBridgeOptions: import('#src/http/server').StartStreamableHttpBridgeOptions =
              {
                ...options.http,
                cdp: options.cdp,
                serverInfo,
                releaseChannel,
                runtimeOptions,
                ensureDockerDisplay: () => dockerDisplayController.ensureDisplayForHeadedRuntime(false),
              };
            return startStreamableHttpCliBridge(startStreamableHttpCliBridgeOptions);
          })()
        : await (() => {
            const startStdioBridgeOptions = { ...runtimeOptions, releaseChannel } as const;
            return startStdioBridge(
              serverInfo,
              startStdioBridgeOptions,
              dockerDisplayController,
              options.cdp,
            );
          })();
    let closing = false;
    const shutdown = (): void => {
      if (closing) return;
      closing = true;
      dockerHealthResponder.dispose();
      void running.close().then(
        () => process.exit(0),
        () => {
          process.stderr.write('fatal: bridge cleanup failed\n');
          process.exit(1);
        },
      );
    };
    for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, shutdown);
    if (options.transport !== BRIDGE_TRANSPORT_STREAMABLE_HTTP) {
      process.stdin.once('end', shutdown);
      if (process.stdin.readableEnded) shutdown();
    }
  });
  await command.parseAsync(process.argv);
}
async function startStdioBridge(
  serverInfo: Partial<Implementation>,
  runtimeOptions: BridgeOptions,
  dockerDisplayController: ReturnType<typeof createDockerDisplayController>,
  cdp: CdpEndpointConfig,
): Promise<{
  close(): Promise<void>;
}> {
  cleanStaleSingletonLocks();
  const startBridgeOptions: import('#src/server').StartBridgeOptions | undefined = {
    beforeConnect: async (runtime) => {
      await dockerDisplayController.ensureDisplayForHeadedRuntime(
        runtime.config.browser?.launchOptions?.headless,
      );
      if (process.env.DISPLAY !== undefined) runtime.childEnv.DISPLAY = process.env.DISPLAY;
    },
    onCdpCleanupError: () => {
      process.stderr.write('warning: managed CDP cleanup failed\n');
    },
    onCdpSecurityRejections: (summary) => {
      const message2 = `warning: cdp_security_rejections window_seconds=${String(summary.windowSeconds)} capability=${String(summary.capability)} host=${String(summary.host)} origin=${String(summary.origin)}\n`;
      process.stderr.write(message2);
    },
    serverInfo,
    runtimeOptions,
    cdp,
  };
  const bridge = await startBridge(startBridgeOptions);
  return {
    close: () => bridge.dispose(),
  };
}
async function startStreamableHttpCliBridge(
  options: Parameters<typeof startStreamableHttpBridge>[0],
): Promise<{
  close(): Promise<void>;
}> {
  const createBridgeLoggerOptions = { sink: process.stderr } as const;
  const logger = createBridgeLogger(createBridgeLoggerOptions);
  const startStreamableHttpBridgeOptions = {
    ...options,
    logger,
  } as const;
  const bridge = await startStreamableHttpBridge(startStreamableHttpBridgeOptions);
  const infoOptions = { url: bridge.url } as const;
  logger.info(infoOptions, 'streamable-http listening');
  return bridge;
}
void main().catch((error: unknown) => {
  const message3 = `fatal: ${(error as Error).message}\n`;
  process.stderr.write(message3);
  process.exit(1);
});
