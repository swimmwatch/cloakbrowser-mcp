import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
import { BRIDGE_INITIALIZE_META_KEY, JSON_RPC_VERSION, MCP_SESSION_ID_HEADER } from '@/protocol/constants.js';
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

  it('applies independent runtime proxy metadata per HTTP session', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ sessionMax: 4 });
      const [firstSessionId, secondSessionId] = await Promise.all([
        initializeRawHttpSession(server, {
          proxyServer: 'http://one.example:8080',
          proxyBypass: '.one',
        }),
        initializeRawHttpSession(server, {
          proxyServer: 'http://two.example:8080',
        }),
      ]);

      await expectProxyEnv(server, firstSessionId, {
        server: 'http://one.example:8080',
        bypass: '.one',
      });
      await expectProxyEnv(server, secondSessionId, {
        server: 'http://two.example:8080',
        bypass: null,
      });
    });
  });

  it('applies authenticated runtime proxy metadata through generated config', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server, {
        proxyServer: 'http://user:p%40ssword@secure.example:8080',
        proxyBypass: '.secure',
      });

      await expectProxyEnv(server, sessionId, {
        server: null,
        bypass: null,
      });
      await expectProxyConfig(server, sessionId, {
        server: 'http://secure.example:8080',
        bypass: '.secure',
        username: 'user',
        password: 'p@ssword',
      });
    });
  });

  it('applies independent runtime humanize metadata per HTTP session', async () => {
    await withFakeUpstream(
      async () => {
        process.env.CLOAK_PLAYWRIGHT_MCP_HUMANIZE = 'true';
        const server = await startHttpBridge({ sessionMax: 4 });
        const disabledSessionId = await initializeRawHttpSession(server, { humanize: false });
        const defaultSessionId = await initializeRawHttpSession(server);
        const enabledSessionId = await initializeRawHttpSession(server, { humanize: true });

        await expectHumanizeConfig(server, disabledSessionId, { enabled: false, initPageCount: 0 });
        await expectHumanizeConfig(server, defaultSessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'default',
        });
        await expectHumanizeConfig(server, enabledSessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'default',
        });
      },
      { browserEngine: 'cloak' },
    );
  });

  it('applies independent runtime human preset metadata per HTTP session sequentially', async () => {
    await withFakeUpstream(
      async () => {
        process.env.CLOAK_PLAYWRIGHT_MCP_HUMANIZE = 'true';
        process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = 'careful';
        const server = await startHttpBridge({ sessionMax: 3 });

        const defaultSessionId = await initializeRawHttpSession(server, { humanPreset: 'default' });
        await expectHumanizeConfig(server, defaultSessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'default',
        });

        const carefulSessionId = await initializeRawHttpSession(server, { humanPreset: 'careful' });
        await expectHumanizeConfig(server, carefulSessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'careful',
        });

        const inheritedSessionId = await initializeRawHttpSession(server);
        await expectHumanizeConfig(server, inheritedSessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'careful',
        });
      },
      { browserEngine: 'cloak' },
    );
  });

  it('applies independent runtime headless metadata per HTTP session', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_HEADLESS = 'true';
      const server = await startHttpBridge({ sessionMax: 3 });
      const [headedSessionId, headlessSessionId] = await Promise.all([
        initializeRawHttpSession(server, { headless: false }),
        initializeRawHttpSession(server, { headless: true }),
      ]);

      await expectHeadlessConfig(server, headedSessionId, { env: 'false', config: false });
      await expectHeadlessConfig(server, headlessSessionId, { env: 'true', config: true });
    });
  });

  it('falls back to environment proxy configuration without runtime metadata', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_PROXY_SERVER = 'http://env.example:8080';
      process.env.PLAYWRIGHT_MCP_PROXY_BYPASS = '.env';
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server);

      await expectProxyEnv(server, sessionId, {
        server: 'http://env.example:8080',
        bypass: '.env',
      });
    });
  });

  it('falls back to authenticated environment proxy configuration through generated config', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_PROXY_SERVER = 'http://env:p%40ssword@env.example:8080';
      process.env.PLAYWRIGHT_MCP_PROXY_BYPASS = '.env';
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server);

      await expectProxyEnv(server, sessionId, {
        server: null,
        bypass: null,
      });
      await expectProxyConfig(server, sessionId, {
        server: 'http://env.example:8080',
        bypass: '.env',
        username: 'env',
        password: 'p@ssword',
      });
    });
  });

  it('rejects invalid runtime proxy metadata before creating a session', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({ sessionMax: 1 });

      const response = await postJsonRpc(server.url, createInitializeRequest({ proxyServer: ' ' }));
      expect(response.status).toBe(HttpStatus.BadRequest);
      expect(response.headers.get(MCP_SESSION_ID_HEADER)).toBeNull();

      const headlessResponse = await postJsonRpc(server.url, createInitializeRequest({ headless: 'false' }));
      expect(headlessResponse.status).toBe(HttpStatus.BadRequest);
      expect(headlessResponse.headers.get(MCP_SESSION_ID_HEADER)).toBeNull();

      const humanPresetResponse = await postJsonRpc(
        server.url,
        createInitializeRequest({ humanPreset: 'fast' }),
      );
      expect(humanPresetResponse.status).toBe(HttpStatus.BadRequest);
      expect(humanPresetResponse.headers.get(MCP_SESSION_ID_HEADER)).toBeNull();

      const ready = await fetchReady(server.url);
      const body = (await ready.json()) as {
        sessions: { active: number; pending: number; max: number; available: number };
      };
      expect(body.sessions).toMatchObject({
        active: 0,
        pending: 0,
        max: 1,
        available: 1,
      });
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

async function initializeRawHttpSession(
  server: StreamableHttpBridgeServer,
  bridgeMeta?: Record<string, unknown>,
): Promise<string> {
  const response = await postJsonRpc(server.url, createInitializeRequest(bridgeMeta));
  expect(response.status).toBe(HttpStatus.Ok);
  const sessionId = response.headers.get(MCP_SESSION_ID_HEADER);
  expect(sessionId).toBeTruthy();
  await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      method: 'notifications/initialized',
    },
    sessionId ?? undefined,
  );
  return sessionId ?? '';
}

async function expectProxyEnv(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: { server: string | null; bypass: string | null },
): Promise<void> {
  const response = await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          includeProxyEnv: true,
        },
      },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: { structuredContent?: { proxyEnv?: { server: string | null; bypass: string | null } } };
  };
  expect(body.result?.structuredContent?.proxyEnv).toEqual(expected);
}

async function expectProxyConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: { server: string; bypass?: string; username?: string; password?: string },
): Promise<void> {
  const response = await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          includeProxyConfig: true,
        },
      },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: { structuredContent?: { proxyConfig?: unknown } };
  };
  expect(body.result?.structuredContent?.proxyConfig).toEqual(expected);
}

async function expectHumanizeConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: { enabled: boolean; initPageCount: number; preset?: string },
): Promise<void> {
  const response = await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          includeHumanizeConfig: true,
        },
      },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: { structuredContent?: { humanizeConfig?: unknown } };
  };
  expect(body.result?.structuredContent?.humanizeConfig).toEqual(expected);
}

async function expectHeadlessConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: { env: string; config: boolean },
): Promise<void> {
  const response = await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: {
        name: 'browser_navigate',
        arguments: {
          url: 'https://example.com',
          includeHeadlessConfig: true,
        },
      },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: { structuredContent?: { headlessConfig?: unknown } };
  };
  expect(body.result?.structuredContent?.headlessConfig).toEqual(expected);
}

function createInitializeRequest(bridgeMeta?: Record<string, unknown>): Record<string, unknown> {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id: crypto.randomUUID(),
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'http-runtime-proxy-test-client',
        version: '1.0.0',
      },
      ...(bridgeMeta === undefined
        ? {}
        : {
            _meta: {
              [BRIDGE_INITIALIZE_META_KEY]: bridgeMeta,
            },
          }),
    },
  };
}

async function postJsonRpc(url: string, body: unknown, sessionId?: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(sessionId === undefined ? {} : { [MCP_SESSION_ID_HEADER]: sessionId }),
    },
    body: JSON.stringify(body),
  });
}

async function readJsonRpcResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    return JSON.parse(text) as unknown;
  const data = text
    .split(/\r?\n/u)
    .find((line) => line.startsWith('data: '))
    ?.slice('data: '.length);
  if (data === undefined) throw new Error(`Expected SSE data in response: ${text}`);
  return JSON.parse(data) as unknown;
}

async function withFakeUpstream(
  fn: () => Promise<void>,
  options: { browserEngine?: 'cloak' | 'playwright' } = {},
): Promise<void> {
  const root = createTempRoot();
  const previous = {
    cli: process.env.PLAYWRIGHT_MCP_CLI_PATH,
    engine: process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE,
    outputDir: process.env.PLAYWRIGHT_MCP_OUTPUT_DIR,
    headless: process.env.PLAYWRIGHT_MCP_HEADLESS,
    fallback: process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK,
    humanize: process.env.CLOAK_PLAYWRIGHT_MCP_HUMANIZE,
    humanPreset: process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET,
    binaryPath: process.env.CLOAKBROWSER_BINARY_PATH,
    proxyServer: process.env.PLAYWRIGHT_MCP_PROXY_SERVER,
    proxyBypass: process.env.PLAYWRIGHT_MCP_PROXY_BYPASS,
  };

  process.env.PLAYWRIGHT_MCP_CLI_PATH = fileURLToPath(
    new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url),
  );
  process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE = options.browserEngine ?? 'playwright';
  process.env.PLAYWRIGHT_MCP_OUTPUT_DIR = path.join(root, 'out');
  process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK = 'false';
  if (options.browserEngine === 'cloak') {
    const fakeBinaryPath = path.join(root, process.platform === 'win32' ? 'fake-chrome.exe' : 'fake-chrome');
    writeFileSync(fakeBinaryPath, '');
    process.env.CLOAKBROWSER_BINARY_PATH = fakeBinaryPath;
  }

  try {
    await fn();
  } finally {
    restoreEnv('PLAYWRIGHT_MCP_CLI_PATH', previous.cli);
    restoreEnv('PLAYWRIGHT_MCP_BROWSER_ENGINE', previous.engine);
    restoreEnv('PLAYWRIGHT_MCP_OUTPUT_DIR', previous.outputDir);
    restoreEnv('PLAYWRIGHT_MCP_HEADLESS', previous.headless);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', previous.fallback);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_HUMANIZE', previous.humanize);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', previous.humanPreset);
    restoreEnv('CLOAKBROWSER_BINARY_PATH', previous.binaryPath);
    restoreEnv('PLAYWRIGHT_MCP_PROXY_SERVER', previous.proxyServer);
    restoreEnv('PLAYWRIGHT_MCP_PROXY_BYPASS', previous.proxyBypass);
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
