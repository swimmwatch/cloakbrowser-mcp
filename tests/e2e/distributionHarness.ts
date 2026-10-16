import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect } from 'vitest';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { fakeUpstreamToolNames } from '@tests/fixtures/fake-upstream-tools.js';
const uRL = new URL('../..', import.meta.url);
export const repoRoot = fileURLToPath(uRL);
const uRL2 = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
export const fakeUpstreamPath = fileURLToPath(uRL2);
const uRL3 = new URL('../fixtures', import.meta.url);
export const fakeUpstreamFixtureDir = fileURLToPath(uRL3);
export const fakeUpstreamContainerDir = '/opt/cloakbrowser-mcp/tests/fixtures';
export const fakeUpstreamContainerPath = `${fakeUpstreamContainerDir}/fake-upstream-mcp.mjs`;
export const dockerImageTag = process.env.CLOAKBROWSER_MCP_DOCKER_IMAGE ?? 'cloakbrowser-mcp:dev';
const localToolNames = [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO] as const;
const expectedBridgeToolNames = [...fakeUpstreamToolNames, ...localToolNames];
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
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, prefix);
  const root = mkdtempSync(joinedPath);
  chmodSync(root, 0o777);
  tempRoots.push(root);
  return root;
}
export function cleanupDistributionE2e(): void {
  const errors: unknown[] = [];
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true, maxRetries: 5, retryDelay: 100 } as const;
    try {
      rmSync(root, rmSyncOptions);
    } catch (error) {
      tempRoots.push(root);
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Distribution E2E cleanup failed');
}
export function runCommand(command: string, args: string[], cwd: string): string {
  const spawnSyncOptions: import('node:child_process').SpawnSyncOptionsWithStringEncoding = {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  };
  const result = spawnSync(command, args, spawnSyncOptions);
  if (result.status !== 0) {
    const joinedPath2 = [
      `Command failed: ${command} ${args.join(' ')}`,
      `cwd: ${cwd}`,
      `status: ${String(result.status)}`,
      `stdout:\n${result.stdout}`,
      `stderr:\n${result.stderr}`,
    ].join('\n');
    throw new Error(joinedPath2);
  }
  return result.stdout;
}
export function runNpmCommand(args: string[], cwd: string): string {
  const cli = process.env.npm_execpath;
  if (!cli) throw new Error('Run distribution tests through npm to provide npm_execpath');
  const nodeArgs = [cli, ...args];
  return runCommand(process.execPath, nodeArgs, cwd);
}
export interface NpmDistributionCommand extends DistributionCommand {
  args: string[];
  cliPath: string;
  installRoot: string;
}
export function packAndInstallCurrentPackage(): NpmDistributionCommand {
  const packDir = createTempRoot('cloakbrowser-mcp-pack-');
  const installDir = createTempRoot('cloakbrowser-mcp-install-');
  const joinedPath3 = path.join(installDir, 'package.json');
  writeFileSync(joinedPath3, '{"private":true,"type":"module"}\n');
  const values: string[] = ['pack', '--json', '--pack-destination', packDir];
  const runCommandResult = runNpmCommand(values, repoRoot);
  const packed = JSON.parse(runCommandResult) as Array<{
    filename: string;
  }>;
  const computedValue = packed[0]?.filename ?? '';
  const packageFile = path.join(packDir, computedValue);
  const values2: string[] = ['install', '--ignore-scripts', '--no-audit', '--no-fund', packageFile];
  runNpmCommand(values2, installDir);
  const propertyValue = 'npm package';
  const packageRoot = path.join(installDir, 'node_modules', 'cloakbrowser-mcp');
  const manifestPath = path.join(packageRoot, 'package.json');
  const manifestSource = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestSource) as { bin: Record<string, string> };
  const entrypoint = manifest.bin['cloakbrowser-mcp'];
  if (!entrypoint) throw new Error('Installed npm package does not declare the cloakbrowser-mcp CLI');
  const cliPath = path.join(packageRoot, entrypoint);
  const args = [cliPath];
  const joinedPath4 = path.join(installDir, 'out');
  const baseBridgeEnvResult = createBaseBridgeEnv(joinedPath4, fakeUpstreamPath);
  return {
    label: propertyValue,
    command: process.execPath,
    args,
    cliPath,
    installRoot: installDir,
    env: baseBridgeEnvResult,
  };
}
export function createDockerDistributionCommand(
  options: {
    dockerInit?: boolean;
    extensionMode?: boolean;
    headless?: boolean;
    restrictedRuntime?: boolean;
  } = {},
): DistributionCommand {
  return {
    label: 'Docker image',
    command: 'docker',
    args: [
      'run',
      '--rm',
      '-i',
      ...(options.dockerInit ? ['--init'] : []),
      ...(options.restrictedRuntime
        ? [
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            '--read-only',
            '--tmpfs',
            '/tmp:rw,nosuid,nodev,noexec,mode=1777',
            '--tmpfs',
            '/tmp/.X11-unix:rw,nosuid,nodev,noexec,mode=1777,uid=1000,gid=1000',
          ]
        : []),
      '--mount',
      `type=bind,source=${fakeUpstreamFixtureDir},target=${fakeUpstreamContainerDir},readonly`,
      '--tmpfs',
      '/data:rw,nosuid,nodev,mode=1777',
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
      ...(options.extensionMode
        ? [
            '-e',
            'PLAYWRIGHT_MCP_EXTENSION=true',
            '-e',
            'PLAYWRIGHT_MCP_EXTENSION_TOKEN=docker-extension-test-token',
          ]
        : []),
      ...(options.headless === false ? ['-e', 'PLAYWRIGHT_MCP_HEADLESS=false'] : []),
      dockerImageTag,
    ],
    env: process.env as Record<string, string>,
    expectedBrowserConfig: {
      userDataDir: '/data/profiles/default',
    },
  };
}
export async function expectDistributionStdioBridge(command: DistributionCommand): Promise<void> {
  const stdioClientTransportOptions: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
    {
      command: command.command,
      args: command.args ?? [],
      env: command.env,
      stderr: 'pipe',
    };
  const transport = new StdioClientTransport(stdioClientTransportOptions);
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const clientOptions = { name: `${command.label} e2e client`, version: '1.0.0' } as const;
  const client = new Client(clientOptions);
  try {
    await client.connect(transport);
    const tools = await client.listTools();
    const mappedValues = tools.tools.map((tool) => tool.name);
    expect(mappedValues).toEqual(expectedBridgeToolNames);
    for (const name of fakeUpstreamToolNames) {
      const args = { e2eToolName: name };
      const callToolOptions = { name, arguments: args } as const;
      const result = await client.callTool(callToolOptions);
      expect(result.isError).not.toBe(true);
      const receiverActual = result.structuredContent;
      const toEqualOptions = {
        forwarded: true,
        name,
        arguments: args,
      } as const;
      expect(receiverActual).toEqual(toEqualOptions);
    }
    if (command.expectedBrowserConfig) {
      const callToolOptions2 = {
        name: fakeUpstreamToolNames[0] ?? 'browser_navigate',
        arguments: { includeBrowserConfig: true },
      } as const;
      const result = await client.callTool(callToolOptions2);
      expect(result.isError).not.toBe(true);
      const receiver2Actual = result.structuredContent;
      const toMatchObjectOptions = {
        browserConfig: command.expectedBrowserConfig,
      } as const;
      expect(receiver2Actual).toMatchObject(toMatchObjectOptions);
    }
    const callToolOptions3 = { name: LOCAL_TOOL_BINARY_INFO, arguments: {} } as const;
    const binaryInfo = await client.callTool(callToolOptions3);
    expect(binaryInfo.isError).not.toBe(true);
    const receiver3Actual = binaryInfo.structuredContent;
    const toMatchObjectOptions2 = {
      browserEngine: 'playwright',
      outputDir: expect.any(String),
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    const callToolOptions4 = { name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} } as const;
    const bridgeInfo = await client.callTool(callToolOptions4);
    expect(bridgeInfo.isError).not.toBe(true);
    const receiver4Actual = bridgeInfo.structuredContent;
    const toMatchObjectOptions3 = {
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'playwright',
      localTools: {
        names: localToolNames,
      },
    } as const;
    expect(receiver4Actual).toMatchObject(toMatchObjectOptions3);
    expect(stderr.text).not.toMatch(/fatal:|Unhandled|Error:/iu);
  } catch (error) {
    if (stderr.text.trim().length === 0) {
      throw error;
    }
    const message = `${command.label} stderr:\n${stderr.text}`;
    const errorOptions = { cause: error } as const;
    throw new Error(message, errorOptions);
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
