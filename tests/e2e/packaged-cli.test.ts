import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP } from '@/http/options.js';
import { fetchHealth, fetchReady, healthUrl, postInitialize } from '../helpers/http.js';
import { tlsCertPath, tlsKeyPath, withDisabledTlsVerification } from '../helpers/tls.js';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const distCliPath = path.join(repoRoot, 'dist/cli.js');
const fakeUpstreamPath = fileURLToPath(new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url));
const tempRoots: string[] = [];
const clients: Client[] = [];
const children: ChildProcessWithoutNullStreams[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  await Promise.allSettled(children.splice(0).map((child) => terminateChild(child)));
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('packaged CLI end-to-end', () => {
  it('serves stdio MCP without routine stdout logs', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [distCliPath],
      env: createCliEnv(),
      stderr: 'pipe',
    });
    const client = new Client({ name: 'packaged-stdio-e2e-client', version: '1.0.0' });
    clients.push(client);

    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'browser_snapshot',
      'browser_navigate',
      LOCAL_TOOL_BINARY_INFO,
      LOCAL_TOOL_BRIDGE_INFO,
    ]);

    const forwarded = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });
    expect(forwarded.structuredContent).toEqual({
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });

    const bridgeInfo = await client.callTool({ name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} });
    expect(bridgeInfo.structuredContent).toMatchObject({
      runtime: 'playwright-mcp-bridge',
      browserEngine: 'playwright',
      localTools: {
        names: [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO],
      },
    });
  });

  it('serves Streamable HTTP from the packaged CLI and logs startup plus requests', async () => {
    const child = spawnHttpCli([
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
    ]);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const startupLine = await waitForLine(
      child,
      stdout,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);

    const health = await fetchHealth(endpointUrl);
    const healthBody = (await health.json()) as Record<string, unknown>;
    expect(health.status).toBe(200);
    expect(healthBody).toMatchObject({ status: 'ok', transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP });

    const ready = await fetchReady(endpointUrl);
    const readyBody = (await ready.json()) as Record<string, unknown>;
    expect(ready.status).toBe(200);
    expect(readyBody).toMatchObject({ status: 'ready', transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP });

    const { client } = await connectHttpClient(endpointUrl);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'browser_snapshot',
      'browser_navigate',
      LOCAL_TOOL_BINARY_INFO,
      LOCAL_TOOL_BRIDGE_INFO,
    ]);

    const forwarded = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });
    expect(forwarded.structuredContent).toMatchObject({
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });

    await expect(
      waitForLine(child, stdout, httpRequestLogPattern({ method: 'GET', path: '/healthz', status: 200 })),
    ).resolves.toBeDefined();
    await expect(
      waitForLine(child, stdout, httpRequestLogPattern({ method: 'GET', path: '/readyz', status: 200 })),
    ).resolves.toBeDefined();
    expect(stderr.text).toBe('');
  });

  it('enforces Streamable HTTP bearer auth from the packaged CLI', async () => {
    const child = spawnHttpCli([
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
      '--http-auth-token',
      'secret',
    ]);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const endpointUrl = parseLoggedUrl(
      await waitForLine(child, stdout, / INFO cloakbrowser-mcp streamable-http listening /u),
    );

    const unauthorizedProbeUrl = healthUrl(endpointUrl);
    unauthorizedProbeUrl.search = 'token=secret';
    const unauthorizedProbe = await fetch(unauthorizedProbeUrl);
    expect(unauthorizedProbe.status).toBe(401);
    expect(unauthorizedProbe.headers.get('www-authenticate')).toBe('Bearer');

    const unauthorizedMcp = await postInitialize(endpointUrl);
    expect(unauthorizedMcp.status).toBe(401);

    const authorizedProbe = await fetch(unauthorizedProbeUrl, {
      headers: { Authorization: 'Bearer secret' },
    });
    expect(authorizedProbe.status).toBe(200);

    const { client } = await connectHttpClient(endpointUrl, {
      Authorization: 'Bearer secret',
    });
    expect((await client.listTools()).tools.length).toBeGreaterThan(0);

    await expect(
      waitForLine(child, stdout, httpRequestLogPattern({ method: 'GET', path: '/healthz', status: 401 })),
    ).resolves.toBeDefined();
    await expect(
      waitForLine(child, stdout, httpRequestLogPattern({ method: 'GET', path: '/healthz', status: 200 })),
    ).resolves.toBeDefined();
    expect(stdout.text).not.toContain('token=secret');
    expect(stdout.text).not.toContain('Authorization');
    expect(stderr.text).toBe('');
  });

  it('honors Streamable HTTP env options with CLI flag overrides', async () => {
    const child = spawnHttpCli(['--http-port', '0'], {
      CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'streamable-http',
      CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT: '/rpc',
    });
    const stdout = collectStream(child.stdout);
    const startupLine = await waitForLine(
      child,
      stdout,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);
    expect(endpointUrl.pathname).toBe('/rpc');

    const oldEndpoint = await fetch(new URL('/mcp', endpointUrl), { method: 'GET' });
    expect(oldEndpoint.status).toBe(404);

    const health = await fetchHealth(endpointUrl);
    expect(health.status).toBe(200);

    const { client } = await connectHttpClient(endpointUrl);
    const forwarded = await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://custom-endpoint.example' },
    });
    expect(forwarded.structuredContent).toMatchObject({
      forwarded: true,
      name: 'browser_navigate',
    });
  });

  it('serves Streamable HTTP over HTTPS from the packaged CLI', async () => {
    const child = spawnHttpCli([
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
    ]);
    const stdout = collectStream(child.stdout);
    const stderr = collectStream(child.stderr);
    const startupLine = await waitForLine(
      child,
      stdout,
      / INFO cloakbrowser-mcp streamable-http listening /u,
    );
    const endpointUrl = parseLoggedUrl(startupLine);
    expect(endpointUrl.protocol).toBe('https:');

    await withDisabledTlsVerification(async () => {
      const health = await fetchHealth(endpointUrl);
      expect(health.status).toBe(200);

      const { client } = await connectHttpClient(endpointUrl);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toEqual([
        'browser_snapshot',
        'browser_navigate',
        LOCAL_TOOL_BINARY_INFO,
        LOCAL_TOOL_BRIDGE_INFO,
      ]);

      const forwarded = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://secure.example' },
      });
      expect(forwarded.structuredContent).toMatchObject({
        forwarded: true,
        name: 'browser_navigate',
      });
    });

    expect(stderr.text).toBe('');
  });

  it('runs packaged doctor JSON without starting the bridge', () => {
    const result = spawnSync(process.execPath, [distCliPath, 'doctor', '--json'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PLAYWRIGHT_MCP_CLI_PATH: fakeUpstreamPath,
      },
      encoding: 'utf8',
    });

    expect([0, 1]).toContain(result.status);
    expect(result.stderr).not.toContain('fatal:');
    expect(result.stderr).not.toContain('Unhandled');

    const report = JSON.parse(result.stdout) as {
      status: string;
      project?: { packageName?: string; mcpName?: string };
      checks?: Array<{ name: string; status: string }>;
    };
    expect(['ok', 'warning', 'error']).toContain(report.status);
    expect(report.project).toMatchObject({
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
    });
    expect(report.checks?.map((check) => check.name)).toEqual([
      'node',
      'playwright-mcp-cli',
      'cloakbrowser-binary',
    ]);
  });
});

function createCliEnv(extra: Record<string, string> = {}): Record<string, string> {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-e2e-'));
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
  const child = spawn(process.execPath, [distCliPath, ...args], {
    cwd: repoRoot,
    env: createCliEnv(env),
  });
  children.push(child);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  return child;
}

async function connectHttpClient(
  endpointUrl: URL,
  headers: Record<string, string> = {},
): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const transport = new StreamableHTTPClientTransport(endpointUrl, {
    requestInit: { headers },
  });
  const client = new Client({ name: 'packaged-http-e2e-client', version: '1.0.0' });
  clients.push(client);
  await client.connect(transport);
  return { client, transport };
}

function parseLoggedUrl(line: string): URL {
  const match = / url=(?<url>\S+)$/u.exec(line);
  if (!match?.groups?.url) throw new Error(`Could not parse URL from log line: ${line}`);
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
  return new RegExp(
    `^\\d{4}-\\d{2}-\\d{2}T\\S+Z INFO cloakbrowser-mcp http request duration_ms=\\d+ method=${escapeRegExp(
      method,
    )} path=${escapeRegExp(path)} status=${status}$`,
    'u',
  );
}

interface CollectedStream {
  text: string;
  onData(listener: (chunk: string) => void): void;
  offData(listener: (chunk: string) => void): void;
}

function collectStream(stream: NodeJS.ReadableStream): CollectedStream {
  const collected: { text: string } = { text: '' };
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
      reject(new Error(`Timed out waiting for line matching ${pattern}`));
    }, 5_000);

    const findLine = (): string | undefined => stream.text.split(/\r?\n/u).find((line) => pattern.test(line));
    const onData = (): void => {
      const line = findLine();
      if (!line) return;
      cleanup();
      resolve(line);
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      cleanup();
      reject(
        new Error(`CLI exited before expected output: code=${code ?? 'null'} signal=${signal ?? 'null'}`),
      );
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
    }, 2_000);
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
