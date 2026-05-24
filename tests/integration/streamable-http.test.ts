import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultStreamableHttpOptions } from '../../src/http/options.js';
import { startStreamableHttpBridge, type StreamableHttpBridgeServer } from '../../src/http/server.js';
import { HttpStatus } from '../../src/http/status.js';

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
        'cloakbrowser_binary_info',
        'cloakbrowser_bridge_info',
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
): Promise<{ client: Client; transport: StreamableHTTPClientTransport }> {
  const transport = new StreamableHTTPClientTransport(new URL(server.url));
  const client = new Client({ name: 'http-test-client', version: '1.0.0' });
  clients.push(client);
  await client.connect(transport);
  return { client, transport };
}

async function postToolsList(url: string, sessionId?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
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
