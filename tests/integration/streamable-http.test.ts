import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { defaultStreamableHttpOptions } from '@/http/options.js';
import { startStreamableHttpBridge, type StreamableHttpBridgeServer } from '@/http/server.js';
import { HttpStatus } from '@/http/status.js';
import { fetchHealth, fetchReady, postToolsList } from '@tests/helpers/http.js';
import { fetchWithTestTls, tlsConfig } from '@tests/helpers/tls.js';

const tempRoots: string[] = [];
const clients: Client[] = [];
const servers: StreamableHttpBridgeServer[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  await Promise.allSettled(servers.splice(0).map((server) => server.close()));
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-http-test-'));
  tempRoots.push(root);
  return root;
}

describe('streamable HTTP bridge', () => {
  it('initializes a session, lists tools, and forwards tool calls', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { client, transport } = await connectHttpClient(server);

      const tools = await client.listTools();
      expect(transport.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(tools.tools.map((tool) => tool.name)).toEqual([
        'browser_snapshot',
        'browser_navigate',
        LOCAL_TOOL_BINARY_INFO,
        LOCAL_TOOL_BRIDGE_INFO,
      ]);

      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' },
      });
      expect(result.structuredContent).toEqual({
        forwarded: true,
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' },
      });
    });
  });

  it('rejects missing and unknown sessions', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();

      const missing = await postToolsList(server.url);
      expect(missing.status).toBe(HttpStatus.BadRequest);

      const unknown = await postToolsList(server.url, 'missing-session');
      expect(unknown.status).toBe(HttpStatus.NotFound);
    });
  });

  it('terminates sessions with DELETE', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { transport } = await connectHttpClient(server);
      const sessionId = transport.sessionId;
      expect(sessionId).toBeDefined();

      await transport.terminateSession();

      const response = await postToolsList(server.url, sessionId);
      expect(response.status).toBe(HttpStatus.NotFound);
    });
  });

  it('keeps separate upstream child processes per HTTP session', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ sessionMax: 4 });
      const first = await connectHttpClient(server);
      const second = await connectHttpClient(server);

      const firstResult = await first.client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://one.example', includePid: true },
      });
      const secondResult = await second.client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://two.example', includePid: true },
      });

      expect(firstResult.structuredContent).toMatchObject({ forwarded: true });
      expect(secondResult.structuredContent).toMatchObject({ forwarded: true });
      const firstContent = firstResult.structuredContent as Record<string, unknown>;
      const secondContent = secondResult.structuredContent as Record<string, unknown>;
      expect(firstContent.upstreamPid).not.toBe(secondContent.upstreamPid);
    });
  });

  it('enforces the session limit during concurrent initialization', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ sessionMax: 2 });

      const attempts = await Promise.allSettled([
        connectHttpClient(server),
        connectHttpClient(server),
        connectHttpClient(server),
      ]);

      const accepted = attempts.filter((attempt) => attempt.status === 'fulfilled');
      const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
      expect(accepted).toHaveLength(2);
      expect(rejected).toHaveLength(1);
      expect(String((rejected[0] as PromiseRejectedResult).reason)).toContain('HTTP session limit reached');
    });
  });

  it('reports readiness based on active HTTP session capacity', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ sessionMax: 1 });

      const initial = await fetchReady(server.url);
      expect(initial.status).toBe(HttpStatus.Ok);

      await connectHttpClient(server);

      const full = await fetchReady(server.url);
      const body = (await full.json()) as {
        status: string;
        sessions: { active: number; pending: number; max: number; available: number };
      };
      expect(full.status).toBe(HttpStatus.ServiceUnavailable);
      expect(body).toMatchObject({
        status: 'not_ready',
        sessions: {
          active: 1,
          pending: 0,
          max: 1,
          available: 0,
        },
      });
    });
  });

  it('enforces optional Bearer auth before handling MCP requests', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ authToken: 'secret' });

      const unauthorized = await fetch(server.url, { method: 'GET' });
      expect(unauthorized.status).toBe(HttpStatus.Unauthorized);
      expect(unauthorized.headers.get('www-authenticate')).toBe('Bearer');

      const transport = new StreamableHTTPClientTransport(new URL(server.url), {
        requestInit: {
          headers: { Authorization: 'Bearer secret' },
        },
      });
      const client = new Client({ name: 'http-auth-test-client', version: '1.0.0' });
      clients.push(client);
      await client.connect(transport);

      expect((await client.listTools()).tools.length).toBeGreaterThan(0);
    });
  });

  it('serves MCP sessions over HTTPS when TLS files are configured', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({
        protocol: 'https',
        tls: tlsConfig,
      });

      expect(server.url).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/mcp$/u);
      const health = await fetchHealth(server.url, undefined, fetchWithTestTls);
      expect(health.status).toBe(HttpStatus.Ok);

      const { client } = await connectHttpClient(server, fetchWithTestTls);
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain(LOCAL_TOOL_BRIDGE_INFO);

      const result = await client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'https://secure.example' },
      });
      expect(result.structuredContent).toMatchObject({
        forwarded: true,
        name: 'browser_navigate',
      });
    });
  });
});

async function startHttpBridge(
  overrides: Partial<Parameters<typeof startStreamableHttpBridge>[0]> = {},
): Promise<StreamableHttpBridgeServer> {
  const server = await startStreamableHttpBridge({
    ...defaultStreamableHttpOptions,
    port: 0,
    sessionIdleTtlMs: 60_000,
    ...overrides,
  });
  servers.push(server);
  return server;
}

async function connectHttpClient(
  server: StreamableHttpBridgeServer,
  fetchImpl: typeof fetch = fetch,
): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const transport = new StreamableHTTPClientTransport(new URL(server.url), { fetch: fetchImpl });
  const client = new Client({ name: 'http-test-client', version: '1.0.0' });
  clients.push(client);
  await client.connect(transport);
  return { client, transport };
}

async function withFakeUpstream(fn: () => Promise<void>): Promise<void> {
  const root = createTempRoot();
  const previous = {
    cli: process.env.PLAYWRIGHT_MCP_CLI_PATH,
    engine: process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE,
    outputDir: process.env.PLAYWRIGHT_MCP_OUTPUT_DIR,
    fallback: process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK,
  };

  process.env.PLAYWRIGHT_MCP_CLI_PATH = fileURLToPath(
    new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url),
  );
  process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE = 'playwright';
  process.env.PLAYWRIGHT_MCP_OUTPUT_DIR = path.join(root, 'out');
  process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK = 'false';

  try {
    await fn();
  } finally {
    restoreEnv('PLAYWRIGHT_MCP_CLI_PATH', previous.cli);
    restoreEnv('PLAYWRIGHT_MCP_BROWSER_ENGINE', previous.engine);
    restoreEnv('PLAYWRIGHT_MCP_OUTPUT_DIR', previous.outputDir);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', previous.fallback);
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
