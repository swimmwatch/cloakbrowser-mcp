import { expectedDependencyVersions } from '@tests/helpers/dependency-versions.js';
import { type ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP } from '@/http/options.js';
import { fakeUpstreamToolNames } from '@tests/fixtures/fake-upstream-tools.js';
import { fetchHealth, fetchReady, healthUrl, postInitialize } from '@tests/helpers/http.js';
import { fetchWithTestTls, tlsCertPath, tlsKeyPath } from '@tests/helpers/tls.js';
const uRL = new URL('../..', import.meta.url);
const repoRoot = fileURLToPath(uRL);
const distCliPath = path.join(repoRoot, 'dist/cli.js');
const uRL2 = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
const fakeUpstreamPath = fileURLToPath(uRL2);
const tempRoots: string[] = [];
const clients: Client[] = [];
const children: ChildProcessWithoutNullStreams[] = [];
afterEach(async () => {
  const mappedValues = clients.splice(0).map((client) => client.close());
  await Promise.allSettled(mappedValues);
  const mappedValues2 = children.splice(0).map((child) => terminateChild(child));
  await Promise.allSettled(mappedValues2);
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
describe('packaged CLI end-to-end', () => {
  it('releases a persistent profile and exits gracefully when its client closes stdin', async () => {
    const base = createCliEnv();
    const profile = path.join(base.PLAYWRIGHT_MCP_OUTPUT_DIR ?? '', 'profile');
    const env = { ...base, PLAYWRIGHT_MCP_USER_DATA_DIR: profile };
    const lock = path.join(profile, '.cloakbrowser-mcp-profile.lock');
    const options = { cwd: repoRoot, env };
    const args = [distCliPath];
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'stdin cleanup', version: '1' },
      },
    };
    const encoded = JSON.stringify(request);
    const input = encoded + '\n';
    const responsePattern = /"id":1/u;
    for (let launch = 0; launch < 2; launch++) {
      const child = spawn(process.execPath, args, options);
      children.push(child);
      const closed = once(child, 'close');
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      const stdout = collectStream(child.stdout);
      const stderr = collectStream(child.stderr);
      child.stdin.write(input);
      const response = await waitForLine(child, stdout, responsePattern);
      expect(response).toContain('"result"');
      const active = existsSync(lock);
      expect(active).toBe(true);
      child.stdin.end();
      const [code, signal] = await closed;
      expect(code).toBe(0);
      expect(signal).toBeNull();
      expect(stderr.text).not.toContain('fatal:');
      const remaining = existsSync(lock);
      expect(remaining).toBe(false);
    }
  });
  it('serves stdio MCP without routine stdout logs', async () => {
    const stdioClientTransportOptions: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
      {
        command: process.execPath,
        args: [distCliPath],
        env: createCliEnv(),
        stderr: 'pipe',
      };
    const transport = new StdioClientTransport(stdioClientTransportOptions);
    const clientOptions = { name: 'packaged-stdio-e2e-client', version: '1.0.0' } as const;
    const client = new Client(clientOptions);
    clients.push(client);
    await client.connect(transport);
    const tools = await client.listTools();
    const mappedValues3 = tools.tools.map((tool) => tool.name);
    const receiverActual = mappedValues3;
    const values: string[] = [...fakeUpstreamToolNames, LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
    expect(receiverActual).toEqual(values);
    const callToolOptions = {
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    const forwarded = await client.callTool(callToolOptions);
    const receiver2Actual = forwarded.structuredContent;
    const toEqualOptions = {
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions);
    const callToolOptions2 = { name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} } as const;
    const bridgeInfo = await client.callTool(callToolOptions2);
    const receiver3Actual = bridgeInfo.structuredContent;
    const toMatchObjectOptions: {
      runtime: string;
      browserEngine: string;
      localTools: {
        names: ('cloakbrowser_binary_info' | 'cloakbrowser_bridge_info')[];
      };
    } = {
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'playwright',
      localTools: {
        names: [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO],
      },
    };
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions);
  });
  it('serves Streamable HTTP from the packaged CLI and logs startup plus requests', async () => {
    const values2: string[] = [
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
    ];
    const child = spawnHttpCli(values2);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const startupLine = await waitForLine(
      child,
      stderr,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);
    const health = await fetchHealth(endpointUrl);
    const healthBody = (await health.json()) as Record<string, unknown>;
    expect(health.status).toBe(200);
    const receiver4Actual = healthBody;
    const toMatchObjectOptions2 = { status: 'ok', transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP } as const;
    expect(receiver4Actual).toMatchObject(toMatchObjectOptions2);
    const ready = await fetchReady(endpointUrl);
    const readyBody = (await ready.json()) as Record<string, unknown>;
    expect(ready.status).toBe(200);
    const receiver5Actual = readyBody;
    const toMatchObjectOptions3 = { status: 'ready', transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions3);
    const { client } = await connectHttpClient(endpointUrl);
    const tools = await client.listTools();
    const mappedValues4 = tools.tools.map((tool) => tool.name);
    const receiver6Actual = mappedValues4;
    const values3: string[] = [...fakeUpstreamToolNames, LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
    expect(receiver6Actual).toEqual(values3);
    const callToolOptions3 = {
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    const forwarded = await client.callTool(callToolOptions3);
    const receiver7Actual = forwarded.structuredContent;
    const toMatchObjectOptions4 = {
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    expect(receiver7Actual).toMatchObject(toMatchObjectOptions4);
    const httpRequestLogPatternOptions = { method: 'GET', path: '/healthz', status: 200 } as const;
    const httpRequestLogPatternResult = httpRequestLogPattern(httpRequestLogPatternOptions);
    const waitForLineResult = waitForLine(child, stderr, httpRequestLogPatternResult);
    await expect(waitForLineResult).resolves.toBeDefined();
    const httpRequestLogPatternOptions2 = { method: 'GET', path: '/readyz', status: 200 } as const;
    const httpRequestLogPatternResult2 = httpRequestLogPattern(httpRequestLogPatternOptions2);
    const waitForLineResult2 = waitForLine(child, stderr, httpRequestLogPatternResult2);
    await expect(waitForLineResult2).resolves.toBeDefined();
    expect(stdout.text).toBe('');
  });
  it('enforces Streamable HTTP bearer auth from the packaged CLI', async () => {
    const values4: string[] = [
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
      '--http-auth-token',
      'secret',
    ];
    const child = spawnHttpCli(values4);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const waitForLineResult3 = await waitForLine(
      child,
      stderr,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(waitForLineResult3);
    const unauthorizedProbeUrl = healthUrl(endpointUrl);
    unauthorizedProbeUrl.search = 'token=secret';
    const unauthorizedProbe = await fetch(unauthorizedProbeUrl);
    expect(unauthorizedProbe.status).toBe(401);
    const result2: string | null = unauthorizedProbe.headers.get('www-authenticate');
    expect(result2).toBe('Bearer');
    const unauthorizedMcp = await postInitialize(endpointUrl);
    expect(unauthorizedMcp.status).toBe(401);
    const fetchOptions = {
      headers: { Authorization: 'Bearer secret' },
    } as const;
    const authorizedProbe = await fetch(unauthorizedProbeUrl, fetchOptions);
    expect(authorizedProbe.status).toBe(200);
    const connectHttpClientOptions = {
      Authorization: 'Bearer secret',
    } as const;
    const { client } = await connectHttpClient(endpointUrl, connectHttpClientOptions);
    const argumentValue = (await client.listTools()).tools.length;
    expect(argumentValue).toBeGreaterThan(0);
    const httpRequestLogPatternOptions3 = { method: 'GET', path: '/healthz', status: 401 } as const;
    const httpRequestLogPatternResult3 = httpRequestLogPattern(httpRequestLogPatternOptions3);
    const waitForLineResult4 = waitForLine(child, stderr, httpRequestLogPatternResult3);
    await expect(waitForLineResult4).resolves.toBeDefined();
    const httpRequestLogPatternOptions4 = { method: 'GET', path: '/healthz', status: 200 } as const;
    const httpRequestLogPatternResult4 = httpRequestLogPattern(httpRequestLogPatternOptions4);
    const waitForLineResult5 = waitForLine(child, stderr, httpRequestLogPatternResult4);
    await expect(waitForLineResult5).resolves.toBeDefined();
    expect(stderr.text).not.toContain('token=secret');
    expect(stderr.text).not.toContain('Authorization');
    expect(stdout.text).toBe('');
  });
  it('honors Streamable HTTP env options with CLI flag overrides', async () => {
    const values5: string[] = ['--http-port', '0'];
    const spawnHttpCliOptions = {
      CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'streamable-http',
      CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT: '/rpc',
    } as const;
    const child = spawnHttpCli(values5, spawnHttpCliOptions);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const startupLine = await waitForLine(
      child,
      stderr,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);
    expect(endpointUrl.pathname).toBe('/rpc');
    const uRL3 = new URL('/mcp', endpointUrl);
    const fetchOptions2 = { method: 'GET' } as const;
    const oldEndpoint = await fetch(uRL3, fetchOptions2);
    expect(oldEndpoint.status).toBe(404);
    const health = await fetchHealth(endpointUrl);
    expect(health.status).toBe(200);
    const { client } = await connectHttpClient(endpointUrl);
    const callToolOptions4 = {
      name: 'browser_navigate',
      arguments: { url: 'https://custom-endpoint.example' },
    } as const;
    const forwarded = await client.callTool(callToolOptions4);
    const receiver8Actual = forwarded.structuredContent;
    const toMatchObjectOptions5 = {
      forwarded: true,
      name: 'browser_navigate',
    } as const;
    expect(receiver8Actual).toMatchObject(toMatchObjectOptions5);
    expect(stdout.text).toBe('');
  });
  it('serves Streamable HTTP over HTTPS from the packaged CLI', async () => {
    const values6: string[] = [
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
      '--http-protocol',
      'https',
      '--https-cert',
      tlsCertPath,
      '--https-key',
      tlsKeyPath,
    ];
    const child = spawnHttpCli(values6);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const startupLine = await waitForLine(
      child,
      stderr,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);
    expect(endpointUrl.protocol).toBe('https:');
    const health = await fetchHealth(endpointUrl, undefined, fetchWithTestTls);
    expect(health.status).toBe(200);
    const connectHttpClientOptions2 = {} as const;
    const { client } = await connectHttpClient(endpointUrl, connectHttpClientOptions2, fetchWithTestTls);
    const tools = await client.listTools();
    const mappedValues5 = tools.tools.map((tool) => tool.name);
    const receiver9Actual = mappedValues5;
    const values7: string[] = [...fakeUpstreamToolNames, LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
    expect(receiver9Actual).toEqual(values7);
    const callToolOptions5 = {
      name: 'browser_navigate',
      arguments: { url: 'https://secure.example' },
    } as const;
    const forwarded = await client.callTool(callToolOptions5);
    const receiver10Actual = forwarded.structuredContent;
    const toMatchObjectOptions6 = {
      forwarded: true,
      name: 'browser_navigate',
    } as const;
    expect(receiver10Actual).toMatchObject(toMatchObjectOptions6);
    expect(stdout.text).toBe('');
  });
  it('runs packaged doctor JSON without starting the bridge', () => {
    const argumentValue2 = process.execPath;
    const values8: readonly string[] = [distCliPath, 'doctor', '--json'];
    const spawnSyncOptions = {
      cwd: repoRoot,
      env: {
        ...process.env,
        PLAYWRIGHT_MCP_CLI_PATH: fakeUpstreamPath,
      },
      encoding: 'utf8',
    } as const;
    const result = spawnSync(argumentValue2, values8, spawnSyncOptions);
    const values9: number[] = [0, 1];
    expect(values9).toContain(result.status);
    expect(result.stderr).not.toContain('fatal:');
    expect(result.stderr).not.toContain('Unhandled');
    const report = JSON.parse(result.stdout) as {
      status: string;
      project?: {
        packageName?: string;
        mcpName?: string;
      };
      upstream?: {
        version?: string;
        resolvedVersion?: string | null;
        playwright?: {
          version?: string | null;
          packagePath?: string | null;
        };
        playwrightCore?: {
          version?: string | null;
          packagePath?: string | null;
          bundlePath?: string | null;
        };
      };
      checks?: Array<{
        name: string;
        status: string;
      }>;
    };
    const values10: string[] = ['ok', 'warning', 'error'];
    expect(values10).toContain(report.status);
    const receiver11Actual = report.project;
    const toMatchObjectOptions7 = {
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
    } as const;
    expect(receiver11Actual).toMatchObject(toMatchObjectOptions7);
    const receiver12Actual = report.upstream;
    const toMatchObjectOptions8 = {
      version: expectedDependencyVersions.playwrightMcp,
      resolvedVersion: null,
      playwright: {
        version: expectedDependencyVersions.developmentPlaywright,
        packagePath: expect.any(String),
      },
      playwrightCore: {
        version: expectedDependencyVersions.productionPlaywrightCore,
        packagePath: expect.any(String),
        bundlePath: expect.stringContaining('coreBundle'),
      },
    } as const;
    expect(receiver12Actual).toMatchObject(toMatchObjectOptions8);
    const mappedValues6 = report.checks?.map((check) => check.name);
    const receiver13Actual = mappedValues6;
    const values11: string[] = ['node', 'playwright-mcp-cli', 'playwright-runtime', 'cloakbrowser-binary'];
    expect(receiver13Actual).toEqual(values11);
  });
});
function createCliEnv(extra: Record<string, string> = {}): Record<string, string> {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-e2e-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return {
    ...process.env,
    PLAYWRIGHT_MCP_CLI_PATH: fakeUpstreamPath,
    PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
    PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
    CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
    ...extra,
  };
}
function spawnHttpCli(args: string[], env: Record<string, string> = {}): ChildProcessWithoutNullStreams {
  const argumentValue3 = process.execPath;
  const values12: readonly string[] | undefined = [distCliPath, ...args];
  const spawnOptions = {
    cwd: repoRoot,
    env: createCliEnv(env),
  } as const;
  const child = spawn(argumentValue3, values12, spawnOptions);
  children.push(child);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  return child;
}
async function connectHttpClient(
  endpointUrl: URL,
  headers: Record<string, string> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const streamableHTTPClientTransportOptions = {
    requestInit: { headers },
    fetch: fetchImpl,
  } as const;
  const transport = new StreamableHTTPClientTransport(endpointUrl, streamableHTTPClientTransportOptions);
  const clientOptions2 = { name: 'packaged-http-e2e-client', version: '1.0.0' } as const;
  const client = new Client(clientOptions2);
  clients.push(client);
  await client.connect(transport);
  return { client, transport };
}
function parseLoggedUrl(line: string): URL {
  const match = / url=(?<url>\S+)$/u.exec(line);
  if (!match?.groups?.url) {
    const message = `Could not parse URL from log line: ${line}`;
    throw new Error(message);
  }
  return new URL(match.groups.url);
}
function httpRequestLogPattern({
  method,
  path,
  status,
}: {
  method: string;
  path: string;
  status: number;
}): RegExp {
  const message2 = `^\\d{4}-\\d{2}-\\d{2}T\\S+Z INFO cloakbrowser-mcp http request duration_ms=\\d+ method=${escapeRegExp(method)} path=${escapeRegExp(path)} status=${status}$`;
  return new RegExp(message2, 'u');
}
interface CollectedStream {
  text: string;
  onData(listener: (chunk: string) => void): void;
  offData(listener: (chunk: string) => void): void;
}
function collectStream(stream: NodeJS.ReadableStream): CollectedStream {
  const collected: {
    text: string;
  } = { text: '' };
  stream.on('data', (chunk: string) => {
    collected.text += chunk;
  });
  return {
    get text() {
      return collected.text;
    },
    onData(listener) {
      stream.on('data', listener);
    },
    offData(listener) {
      stream.off('data', listener);
    },
  };
}
function waitForLine(
  child: ChildProcessWithoutNullStreams,
  stream: CollectedStream,
  pattern: RegExp,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      const message3 = `Timed out waiting for line matching ${pattern}`;
      const error2 = new Error(message3);
      reject(error2);
    }, 5000);
    const findLine = (): string | undefined => stream.text.split(/\r?\n/u).find((line) => pattern.test(line));
    const onData = (): void => {
      const line = findLine();
      if (!line) return;
      cleanup();
      resolve(line);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();
      const message4 = `CLI exited before expected output: code=${code ?? 'null'} signal=${signal ?? 'null'}`;
      const error3 = new Error(message4);
      reject(error3);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timeout);
      stream.offData(onData);
      child.off('exit', onExit);
      child.off('error', onError);
    };
    const existingLine = findLine();
    if (existingLine) {
      cleanup();
      resolve(existingLine);
      return;
    }
    stream.onData(onData);
    child.once('exit', onExit);
    child.once('error', onError);
  });
}
async function terminateChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      killChild(child, 'SIGKILL');
    }, 2000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
    killChild(child, 'SIGTERM');
  });
}
function killChild(child: ChildProcessWithoutNullStreams, signal?: NodeJS.Signals): void {
  try {
    child.kill(signal);
  } catch {
    try {
      child.kill();
    } catch {
      // The process may have exited between the status check and kill call.
    }
  }
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
