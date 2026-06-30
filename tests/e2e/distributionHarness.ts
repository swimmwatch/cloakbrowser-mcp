import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect } from 'vitest';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { fakeUpstreamToolNames } from '@tests/fixtures/fake-upstream-tools.js';

export const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
export const fakeUpstreamPath = fileURLToPath(new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url));
export const fakeUpstreamFixtureDir = fileURLToPath(new URL('../fixtures', import.meta.url));
export const fakeUpstreamContainerDir = '/opt/cloakbrowser-mcp/tests/fixtures';
export const fakeUpstreamContainerPath = `${fakeUpstreamContainerDir}/fake-upstream-mcp.mjs`;
export const dockerImageTag = 'cloakbrowser-mcp:dev';

const localToolNames = [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO] as const;
const expectedBridgeToolNames = [...fakeUpstreamToolNames, ...localToolNames];
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tempRoots: string[] = [];

export interface DistributionCommand {
  label: string;
  command: string;
  args?: string[];
  env: Record<string, string>;
  expectedBrowserConfig?: {
    userDataDir?: string;
  };
}

export function createTempRoot(prefix: string): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

export function cleanupDistributionE2e(): void {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
}

export function runCommand(command: string, args: string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        `cwd: ${cwd}`,
        `status: ${String(result.status)}`,
        `stdout:\n${result.stdout}`,
        `stderr:\n${result.stderr}`,
      ].join('\n'),
    );
  }
  return result.stdout;
}

export function packAndInstallCurrentPackage(): DistributionCommand {
  const packDir = createTempRoot('cloakbrowser-mcp-pack-');
  const installDir = createTempRoot('cloakbrowser-mcp-install-');
  writeFileSync(path.join(installDir, 'package.json'), '{"private":true,"type":"module"}\n');

  const packed = JSON.parse(
    runCommand(npmCommand, ['pack', '--json', '--pack-destination', packDir], repoRoot),
  ) as Array<{ filename: string }>;
  const packageFile = path.join(packDir, packed[0]?.filename ?? '');
  runCommand(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund', packageFile], installDir);

  return {
    label: 'npm package',
    command: path.join(
      installDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'cloakbrowser-mcp.cmd' : 'cloakbrowser-mcp',
    ),
    env: createBaseBridgeEnv(path.join(installDir, 'out'), fakeUpstreamPath),
  };
}

export function createDockerDistributionCommand(): DistributionCommand {
  const dataDir = createTempRoot('cloakbrowser-mcp-docker-data-');
  return {
    label: 'Docker image',
    command: 'docker',
    args: [
      'run',
      '--rm',
      '--init',
      '-i',
      '--mount',
      `type=bind,source=${fakeUpstreamFixtureDir},target=${fakeUpstreamContainerDir},readonly`,
      '--mount',
      `type=bind,source=${dataDir},target=/data`,
      '-e',
      `PLAYWRIGHT_MCP_CLI_PATH=${fakeUpstreamContainerPath}`,
      '-e',
      'PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright',
      '-e',
      'PLAYWRIGHT_MCP_OUTPUT_DIR=/data',
      '-e',
      'PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default',
      '-e',
      'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK=false',
      dockerImageTag,
    ],
    env: process.env as Record<string, string>,
    expectedBrowserConfig: {
      userDataDir: '/data/profiles/default',
    },
  };
}

export async function expectDistributionStdioBridge(command: DistributionCommand): Promise<void> {
  const transport = new StdioClientTransport({
    command: command.command,
    args: command.args ?? [],
    env: command.env,
    stderr: 'pipe',
  });
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const client = new Client({ name: `${command.label} e2e client`, version: '1.0.0' });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(expectedBridgeToolNames);

    for (const name of fakeUpstreamToolNames) {
      const args = { e2eToolName: name };
      const result = await client.callTool({ name, arguments: args });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toEqual({
        forwarded: true,
        name,
        arguments: args,
      });
    }

    if (command.expectedBrowserConfig) {
      const result = await client.callTool({
        name: fakeUpstreamToolNames[0] ?? 'browser_navigate',
        arguments: { includeBrowserConfig: true },
      });
      expect(result.isError).not.toBe(true);
      expect(result.structuredContent).toMatchObject({
        browserConfig: command.expectedBrowserConfig,
      });
    }

    const binaryInfo = await client.callTool({ name: LOCAL_TOOL_BINARY_INFO, arguments: {} });
    expect(binaryInfo.isError).not.toBe(true);
    expect(binaryInfo.structuredContent).toMatchObject({
      browserEngine: 'playwright',
      outputDir: expect.any(String),
    });

    const bridgeInfo = await client.callTool({ name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} });
    expect(bridgeInfo.isError).not.toBe(true);
    expect(bridgeInfo.structuredContent).toMatchObject({
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'playwright',
      localTools: {
        names: localToolNames,
      },
    });

    expect(stderr.text).not.toMatch(/fatal:|Unhandled|Error:/iu);
  } finally {
    await client.close().catch(() => undefined);
  }
}

function createBaseBridgeEnv(outputDir: string, upstreamPath: string): Record<string, string> {
  return {
    ...process.env,
    PLAYWRIGHT_MCP_CLI_PATH: upstreamPath,
    PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
    PLAYWRIGHT_MCP_OUTPUT_DIR: outputDir,
    CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
  };
}
