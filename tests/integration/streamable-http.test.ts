import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { createCdpEndpointConfig } from '@/cdp/config.js';
import { defaultStreamableHttpOptions } from '@/http/options.js';
import { createSessionStore } from '@/http/sessionStore.js';
import { startStreamableHttpBridge, type StreamableHttpBridgeServer } from '@/http/server.js';
import { HttpStatus } from '@/http/status.js';
import type { BridgeLogger } from '@/logging/logger.js';
import { BRIDGE_INITIALIZE_META_KEY, JSON_RPC_VERSION, MCP_SESSION_ID_HEADER } from '@/protocol/constants.js';
import { createBridgeServer } from '@/server.js';
import { fakeUpstreamToolNames } from '@tests/fixtures/fake-upstream-tools.js';
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

function canonicalDirectory(directory: string): string {
  try {
    return path.normalize(realpathSync.native(directory));
  } catch {
    return path.resolve(path.normalize(directory));
  }
}

describe('streamable HTTP bridge', () => {
  it('emits a fixed warning for managed CDP cleanup failures', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const warn = vi.fn();
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        info: vi.fn(),
        trace: vi.fn(),
        warn,
      } satisfies BridgeLogger;
      const start: typeof managed.start = async (options, cdp, allocator) => {
        const bridge = await managed.start(options, cdp, allocator);
        options.onCdpCleanupError?.();
        return bridge;
      };
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: true, portRange: '29050' }),
        logger,
        startManagedCdpBridge: start,
      });

      await initializeRawHttpSession(server);

      expect(warn).toHaveBeenCalledWith({}, 'managed CDP cleanup failed');
    });
  });

  it('inherits the process CDP default while preserving an explicit per-session false override', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: true, portRange: '29100-29101' }),
        sessionMax: 2,
        startManagedCdpBridge: managed.start,
      });

      const inheritedSession = await initializeRawHttpSession(server);
      const disabledSession = await initializeRawHttpSession(server, { cdpEnabled: false });

      expect(managed.ports).toEqual([29100]);
      expect(await readBridgeInfo(server, inheritedSession)).toMatchObject({
        cdp: { enabled: true, port: 29100, state: 'ready' },
      });
      expect(await readBridgeInfo(server, disabledSession)).toMatchObject({
        cdp: { enabled: false },
      });
    });
  });

  it('rolls back failed CDP admission without consuming ordinary HTTP session capacity', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29200' }),
        sessionMax: 2,
        startManagedCdpBridge: managed.start,
      });

      const enabledSession = await initializeRawHttpSession(server, { cdpEnabled: true });
      const exhausted = await postJsonRpc(server.url, createInitializeRequest({ cdpEnabled: true }));
      expect(exhausted.status).toBe(HttpStatus.ServiceUnavailable);

      const disabledSession = await initializeRawHttpSession(server, { cdpEnabled: false });
      expect(await readBridgeInfo(server, enabledSession)).toMatchObject({
        cdp: { enabled: true, port: 29200 },
      });
      expect(await readBridgeInfo(server, disabledSession)).toMatchObject({
        cdp: { enabled: false },
      });
    });
  });

  it('checks ordinary HTTP capacity before requesting a managed CDP lease', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29250' }),
        sessionMax: 1,
        startManagedCdpBridge: managed.start,
      });

      await initializeRawHttpSession(server, { cdpEnabled: false });
      const rejected = await postJsonRpc(server.url, createInitializeRequest({ cdpEnabled: true }));

      expect(rejected.status).toBe(HttpStatus.ServiceUnavailable);
      expect(managed.ports).toEqual([]);
    });
  });

  it('keeps two simultaneous managed CDP HTTP sessions isolated', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29300-29301' }),
        sessionMax: 3,
      });

      const firstSession = await initializeRawHttpSession(server, { cdpEnabled: true });
      const secondSession = await initializeRawHttpSession(server, { cdpEnabled: true });
      const disabledSession = await initializeRawHttpSession(server, { cdpEnabled: false });
      const firstInfo = await readBridgeInfo(server, firstSession);
      const secondInfo = await readBridgeInfo(server, secondSession);
      const firstUpstream = await callSessionTool(server, firstSession, 'browser_navigate', {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://one.example',
      });
      const secondUpstream = await callSessionTool(server, secondSession, 'browser_navigate', {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://two.example',
      });
      const disabledUpstream = await callSessionTool(server, disabledSession, 'browser_navigate', {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://disabled.example',
      });

      expect(firstInfo).toMatchObject({
        cdp: {
          discoveryUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:29300\/cdp\//u),
          enabled: true,
          port: 29300,
          state: 'ready',
        },
      });
      expect(secondInfo).toMatchObject({
        cdp: {
          discoveryUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:29301\/cdp\//u),
          enabled: true,
          port: 29301,
          state: 'ready',
        },
      });
      expect(await readBridgeInfo(server, disabledSession)).toMatchObject({ cdp: { enabled: false } });
      const firstDiscoveryUrl = (firstInfo.cdp as { discoveryUrl: string }).discoveryUrl;
      const secondDiscoveryUrl = (secondInfo.cdp as { discoveryUrl: string }).discoveryUrl;
      expect(new URL(firstDiscoveryUrl).pathname).not.toBe(new URL(secondDiscoveryUrl).pathname);
      expect(firstUpstream.upstreamPid).not.toBe(secondUpstream.upstreamPid);
      expect(disabledUpstream.upstreamPid).not.toBe(firstUpstream.upstreamPid);
      expect(disabledUpstream.upstreamPid).not.toBe(secondUpstream.upstreamPid);
      expect(firstUpstream.cdpMetrics).toMatchObject({ challengePlacements: 1, tabsCalls: 1 });
      expect(secondUpstream.cdpMetrics).toMatchObject({ challengePlacements: 1, tabsCalls: 1 });
      const firstInternalPort = (firstUpstream.cdpMetrics as { internalPort: number }).internalPort;
      const secondInternalPort = (secondUpstream.cdpMetrics as { internalPort: number }).internalPort;
      expect(firstInternalPort).not.toBe(secondInternalPort);
      expect([29300, 29301]).not.toContain(firstInternalPort);
      expect([29300, 29301]).not.toContain(secondInternalPort);
      expect(disabledUpstream.cdpMetrics).toEqual({
        challengePlacements: 0,
        internalPort: null,
        tabsCalls: 0,
      });
    });
  });

  it('refreshes only the owning HTTP session on accepted CDP traffic and expires a quiet socket', async () => {
    await withFakeUpstream(async () => {
      const store = createSessionStore(defaultStreamableHttpOptions.sessionBackend);
      const touch = vi.spyOn(store, 'touch');
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29310' }),
        sessionIdleTtlMs: 500,
        sessionMax: 1,
        sessionStore: store,
      });
      const sessionId = await initializeRawHttpSession(server, { cdpEnabled: true });
      const info = await readBridgeInfo(server, sessionId);
      const discoveryUrl = (info.cdp as { discoveryUrl: string }).discoveryUrl;
      const callsBeforeCdp = touch.mock.calls.length;

      const discovery = await fetch(`${discoveryUrl}/json/version`);
      expect(discovery.status).toBe(HttpStatus.Ok);
      await vi.waitFor(() => expect(touch).toHaveBeenCalledTimes(callsBeforeCdp + 1));
      const version = (await discovery.json()) as { webSocketDebuggerUrl: string };
      const callsBeforeSocket = touch.mock.calls.length;

      const socket = new WebSocket(version.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      const socketClosed = new Promise<void>((resolve) => socket.once('close', () => resolve()));
      await delay(25);
      expect(touch).toHaveBeenCalledTimes(callsBeforeSocket);

      socket.send(JSON.stringify({ id: 1, method: 'Browser.getVersion' }));
      await vi.waitFor(() => expect(touch.mock.calls.length).toBeGreaterThan(callsBeforeSocket));

      await delay(1_100);
      const ready = await fetchReady(server.url);
      const readyBody = (await ready.json()) as { sessions: { active: number } };
      expect(readyBody.sessions.active).toBe(0);
      await expect(socketClosed).resolves.toBeUndefined();
    });
  });

  it('replaces a lost browser generation without changing the successful MCP result', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29320' }),
        sessionMax: 1,
      });
      const sessionId = await initializeRawHttpSession(server, { cdpEnabled: true });
      const firstInfo = await readBridgeInfo(server, sessionId);
      const firstCdp = firstInfo.cdp as { discoveryUrl: string; generation: number };
      const initialResult = await callSessionTool(server, sessionId, 'browser_navigate', {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://initial.example',
      });
      const initialPid = initialResult.upstreamPid;
      expect(initialPid).toEqual(expect.any(Number));
      const firstDiscovery = await fetch(`${firstCdp.discoveryUrl}/json/version`);
      const firstVersion = (await firstDiscovery.json()) as { webSocketDebuggerUrl: string };
      const socket = new WebSocket(firstVersion.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      const socketClosed = new Promise<void>((resolve) => socket.once('close', () => resolve()));

      socket.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      await expect(socketClosed).resolves.toBeUndefined();
      expect(await readBridgeInfo(server, sessionId)).toMatchObject({
        cdp: {
          activeConnections: 0,
          discoveryUrl: null,
          generation: firstCdp.generation,
          state: 'unavailable',
        },
      });
      expect((await fetch(`${firstCdp.discoveryUrl}/json/version`)).status).toBe(HttpStatus.NotFound);

      const expectedArguments = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://replacement.example',
      };
      const result = await callSessionTool(server, sessionId, 'browser_navigate', expectedArguments);
      expect(result).toMatchObject({
        arguments: expectedArguments,
        forwarded: true,
        name: 'browser_navigate',
      });
      expect(result.upstreamPid).toEqual(expect.any(Number));
      expect(result.upstreamPid).not.toBe(initialPid);
      expect(result.cdpMetrics).toMatchObject({ challengePlacements: 1, tabsCalls: 1 });
      expect((result.cdpMetrics as { internalPort: number }).internalPort).not.toBe(
        (initialResult.cdpMetrics as { internalPort: number }).internalPort,
      );

      const secondInfo = await readBridgeInfo(server, sessionId);
      const secondCdp = secondInfo.cdp as { discoveryUrl: string; generation: number };
      expect(secondCdp.generation).toBe(firstCdp.generation + 1);
      expect(secondCdp.discoveryUrl).not.toBe(firstCdp.discoveryUrl);
      expect((await fetch(`${firstCdp.discoveryUrl}/json/version`)).status).toBe(HttpStatus.NotFound);
      expect((await fetch(`${secondCdp.discoveryUrl}/json/version`)).status).toBe(HttpStatus.Ok);

      const secondVersionResponse = await fetch(`${secondCdp.discoveryUrl}/json/version`);
      const secondVersion = (await secondVersionResponse.json()) as {
        webSocketDebuggerUrl: string;
      };
      const secondSocket = new WebSocket(secondVersion.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        secondSocket.once('open', resolve);
        secondSocket.once('error', reject);
      });
      const secondSocketClosed = new Promise<void>((resolve) => secondSocket.once('close', () => resolve()));
      secondSocket.send(JSON.stringify({ id: 2, method: 'Browser.close' }));
      await expect(secondSocketClosed).resolves.toBeUndefined();

      const [firstConcurrent, secondConcurrent] = await Promise.all([
        callSessionTool(server, sessionId, 'browser_navigate', {
          callId: 'concurrent-a',
          delayMs: 25,
          includeCdpMetrics: true,
          includePid: true,
          url: 'https://concurrent-a.example',
        }),
        callSessionTool(server, sessionId, 'browser_snapshot', {
          callId: 'concurrent-b',
          includeCdpMetrics: true,
          includePid: true,
        }),
      ]);
      expect(firstConcurrent.upstreamPid).toBe(secondConcurrent.upstreamPid);
      expect(firstConcurrent.upstreamPid).not.toBe(result.upstreamPid);
      expect(firstConcurrent.toolCallCount).toBe(1);
      expect(secondConcurrent.toolCallCount).toBe(1);
      expect(firstConcurrent.cdpMetrics).toMatchObject({
        challengePlacements: 1,
        tabsCalls: 1,
      });
      expect(secondConcurrent.cdpMetrics).toMatchObject({
        challengePlacements: 1,
        tabsCalls: 1,
      });
      const thirdInfo = await readBridgeInfo(server, sessionId);
      expect(thirdInfo).toMatchObject({
        cdp: {
          generation: secondCdp.generation + 1,
          port: 29320,
          state: 'ready',
        },
      });
    });
  });

  it('keeps independent CDP reads usable while an MCP browser command is in flight', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge({
        cdp: createCdpEndpointConfig({ processEnabled: false, portRange: '29330' }),
        sessionMax: 1,
      });
      const sessionId = await initializeRawHttpSession(server, { cdpEnabled: true });
      const info = await readBridgeInfo(server, sessionId);
      const discoveryUrl = (info.cdp as { discoveryUrl: string }).discoveryUrl;

      const slowMcpCall = callSessionTool(server, sessionId, 'browser_navigate', {
        delayMs: 600,
        url: 'https://slow.example',
      });
      await delay(25);
      const concurrentCdp = await Promise.race([
        fetch(`${discoveryUrl}/json/version`),
        delay(250).then(() => 'timeout' as const),
      ]);

      expect(concurrentCdp).not.toBe('timeout');
      expect((concurrentCdp as Response).status).toBe(HttpStatus.Ok);
      await expect(slowMcpCall).resolves.toMatchObject({ forwarded: true });
    });
  });

  it('initializes a session, lists tools, and forwards tool calls', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { client, transport } = await connectHttpClient(server);

      const tools = await client.listTools();
      expect(transport.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(tools.tools.map((tool) => tool.name)).toEqual([
        ...fakeUpstreamToolNames,
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

  it('applies profile, context, and extension metadata through generated config', async () => {
    await withFakeUpstream(
      async () => {
        const root = createTempRoot();
        const profileDir = path.join(root, 'profiles', 'default');
        const extensionDir = path.join(root, 'extensions', 'my-extension');
        mkdirSync(extensionDir, { recursive: true });
        const server = await startHttpBridge({ sessionMax: 2 });
        const sessionId = await initializeRawHttpSession(server, {
          humanize: true,
          userDataDir: profileDir,
          contextOptions: {
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            colorScheme: 'dark',
          },
          extensionPaths: [extensionDir],
        });

        await expectBrowserConfig(server, sessionId, {
          userDataDir: canonicalDirectory(profileDir),
          contextOptions: {
            viewport: { width: 1280, height: 720 },
            locale: 'en-US',
            timezoneId: 'America/New_York',
            colorScheme: 'dark',
          },
          extensionDir: canonicalDirectory(extensionDir),
        });
        await expectHumanizeConfig(server, sessionId, {
          enabled: true,
          initPageCount: 1,
          preset: 'default',
        });
      },
      { browserEngine: 'cloak' },
    );
  });

  it('rejects duplicate profile sessions without leaking session capacity', async () => {
    await withFakeUpstream(
      async () => {
        const root = createTempRoot();
        const profileDir = path.join(root, 'profiles', 'default');
        const server = await startHttpBridge({ sessionMax: 2 });
        await initializeRawHttpSession(server, { userDataDir: profileDir });

        const duplicate = await postJsonRpc(server.url, createInitializeRequest({ userDataDir: profileDir }));
        expect(duplicate.status).toBe(HttpStatus.BadRequest);
        expect(duplicate.headers.get(MCP_SESSION_ID_HEADER)).toBeNull();

        const ready = await fetchReady(server.url);
        const body = (await ready.json()) as {
          sessions: { active: number; pending: number; max: number; available: number };
        };
        expect(body.sessions).toMatchObject({
          active: 1,
          pending: 0,
          max: 2,
          available: 1,
        });
      },
      { browserEngine: 'cloak' },
    );
  });

  it('rejects extension metadata without a persistent profile before creating a session', async () => {
    await withFakeUpstream(
      async () => {
        const root = createTempRoot();
        const extensionDir = path.join(root, 'extensions', 'my-extension');
        mkdirSync(extensionDir, { recursive: true });
        const server = await startHttpBridge({ sessionMax: 1 });

        const response = await postJsonRpc(
          server.url,
          createInitializeRequest({ extensionPaths: [extensionDir] }),
        );
        expect(response.status).toBe(HttpStatus.BadRequest);
        expect(response.headers.get(MCP_SESSION_ID_HEADER)).toBeNull();

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
      },
      { browserEngine: 'cloak' },
    );
  });

  it('uses initialize metadata labels in runtime configuration errors', async () => {
    await withFakeUpstream(
      async () => {
        const root = createTempRoot();
        const server = await startHttpBridge({ sessionMax: 1 });

        const profileResponse = await postJsonRpc(server.url, createInitializeRequest({ userDataDir: ' ' }));
        expect(profileResponse.status).toBe(HttpStatus.BadRequest);
        await expectJsonRpcErrorMessage(profileResponse, 'userDataDir must be a non-empty string');

        const extensionResponse = await postJsonRpc(
          server.url,
          createInitializeRequest({
            userDataDir: path.join(root, 'profiles', 'default'),
            extensionPaths: [path.join(root, 'missing-extension')],
          }),
        );
        expect(extensionResponse.status).toBe(HttpStatus.BadRequest);
        await expectJsonRpcErrorMessage(
          extensionResponse,
          'extensionPaths[0] must point to an existing directory',
        );
      },
      { browserEngine: 'cloak' },
    );
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

function createFakeManagedCdpStarter(): {
  ports: number[];
  start: NonNullable<Parameters<typeof startStreamableHttpBridge>[0]['startManagedCdpBridge']>;
} {
  const ports: number[] = [];
  const start: NonNullable<Parameters<typeof startStreamableHttpBridge>[0]['startManagedCdpBridge']> = async (
    options,
    cdp,
    allocator,
  ) => {
    if (!allocator) throw new Error('Test managed CDP allocator is required');
    const lease = await allocator.acquire({
      host: cdp.bindHost,
      bind: async (port) => {
        ports.push(port);
        return { close: async () => undefined };
      },
    });
    try {
      const runtime = await prepareBridgeRuntime(options.runtimeOptions);
      await options.beforeConnect?.(runtime);
      const bridge = await createBridgeServer({
        ...options,
        cdpInfo: () => ({
          activeConnections: 0,
          advertisedHost: cdp.advertisedHost ?? null,
          bindHost: cdp.bindHost,
          discoveryUrl: `${cdp.advertisedScheme}://${cdp.advertisedHost ?? cdp.bindHost}:${lease.port}/cdp/test-capability`,
          enabled: true,
          generation: 1,
          port: lease.port,
          state: 'ready',
        }),
        runtime,
      });
      return {
        ...bridge,
        async dispose() {
          await bridge.dispose();
          await lease.release();
        },
      };
    } catch (error) {
      await lease.release();
      throw error;
    }
  };
  return { ports, start };
}

async function readBridgeInfo(
  server: StreamableHttpBridgeServer,
  sessionId: string,
): Promise<Record<string, unknown>> {
  return await callSessionTool(server, sessionId, LOCAL_TOOL_BRIDGE_INFO, {});
}

async function callSessionTool(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await postJsonRpc(
    server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: arguments_ },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: { structuredContent?: Record<string, unknown> };
  };
  return body.result?.structuredContent ?? {};
}

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

async function expectBrowserConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: { userDataDir: string; contextOptions: unknown; extensionDir: string },
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
          includeBrowserConfig: true,
        },
      },
    },
    sessionId,
  );
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        browserConfig?: {
          isolated?: boolean;
          userDataDir?: string;
          contextOptions?: unknown;
          launchOptions?: { args?: string[] };
        };
      };
    };
  };
  const browserConfig = body.result?.structuredContent?.browserConfig;
  expect(browserConfig?.isolated).toBeUndefined();
  expect(browserConfig?.userDataDir).toBe(expected.userDataDir);
  expect(browserConfig?.contextOptions).toEqual(expected.contextOptions);
  expect(browserConfig?.launchOptions?.args).toEqual(
    expect.arrayContaining([
      `--load-extension=${expected.extensionDir}`,
      `--disable-extensions-except=${expected.extensionDir}`,
    ]),
  );
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

async function expectJsonRpcErrorMessage(response: Response, expected: string): Promise<void> {
  const body = (await readJsonRpcResponse(response)) as { error?: { message?: string } };
  expect(body.error?.message).toContain(expected);
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
    userDataDir: process.env.PLAYWRIGHT_MCP_USER_DATA_DIR,
    contextOptions: process.env.CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS,
    extensionPaths: process.env.CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS,
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
    restoreEnv('PLAYWRIGHT_MCP_USER_DATA_DIR', previous.userDataDir);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS', previous.contextOptions);
    restoreEnv('CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS', previous.extensionPaths);
  }
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
