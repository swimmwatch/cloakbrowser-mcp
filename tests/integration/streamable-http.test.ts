import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ErrorCode, ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { createCdpEndpointConfig } from '@/cdp/config.js';
import { ManagedCdpBootstrapToolError } from '@/cdp/session.js';
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
  const mappedValues = clients.splice(0).map((client) => client.close());
  await Promise.allSettled(mappedValues);
  const mappedValues2 = servers.splice(0).map((server) => server.close());
  await Promise.allSettled(mappedValues2);
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-http-test-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
function canonicalDirectory(directory: string): string {
  try {
    const nativeResult = realpathSync.native(directory);
    return path.normalize(nativeResult);
  } catch {
    const normalizeResult = path.normalize(directory);
    return path.resolve(normalizeResult);
  }
}
describe('streamable HTTP bridge', () => {
  it('logs safe CDP bootstrap details while retaining a generic HTTP response and releasing admission', async () => {
    await withFakeUpstream(async () => {
      const warn = vi.fn();
      const logger = {
        debug: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        info: vi.fn(),
        trace: vi.fn(),
        warn,
      } satisfies BridgeLogger;
      const reason = 'Managed CDP bootstrap tool browser_tabs failed (exitCode=133, signal=SIGTRAP)';
      const failure = new ManagedCdpBootstrapToolError(reason);
      const start: ReturnType<typeof createFakeManagedCdpStarter>['start'] = async () => {
        throw failure;
      };
      const cdpOptions = { processEnabled: false, portRange: '29040' } as const;
      const cdp = createCdpEndpointConfig(cdpOptions);
      const options = { cdp, logger, sessionMax: 1, startManagedCdpBridge: start };
      const server = await startHttpBridge(options);
      const sessionOptions = { cdpEnabled: true } as const;
      const request = createInitializeRequest(sessionOptions);
      const response = await postJsonRpc(server.url, request);
      expect(response.status).toBe(HttpStatus.InternalServerError);
      const body = await response.json();
      const expectedBody = { error: { message: 'Internal server error' } };
      expect(body).toMatchObject(expectedBody);
      const fields = { stage: 'managed-cdp-bootstrap', reason };
      expect(warn).toHaveBeenCalledWith(fields, 'http session initialization failed');
      const ordinary = { cdpEnabled: false } as const;
      await initializeRawHttpSession(server, ordinary);
    });
  });
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
      const createCdpEndpointConfigOptions = { processEnabled: true, portRange: '29050' } as const;
      const cdpEndpointConfigResult = createCdpEndpointConfig(createCdpEndpointConfigOptions);
      const currentLogger = logger;
      const currentStart = start;
      const startHttpBridgeOptions = {
        cdp: cdpEndpointConfigResult,
        logger: currentLogger,
        startManagedCdpBridge: currentStart,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions);
      await initializeRawHttpSession(server);
      const receiverActual = warn;
      const toHaveBeenCalledWithOptions = {} as const;
      expect(receiverActual).toHaveBeenCalledWith(toHaveBeenCalledWithOptions, 'managed CDP cleanup failed');
    });
  });
  it('inherits the process CDP default while preserving an explicit per-session false override', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const createCdpEndpointConfigOptions2 = { processEnabled: true, portRange: '29100-29101' } as const;
      const cdpEndpointConfigResult2 = createCdpEndpointConfig(createCdpEndpointConfigOptions2);
      const propertyValue = 2;
      const propertyValue2 = managed.start;
      const startHttpBridgeOptions2 = {
        cdp: cdpEndpointConfigResult2,
        sessionMax: propertyValue,
        startManagedCdpBridge: propertyValue2,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions2);
      const inheritedSession = await initializeRawHttpSession(server);
      const initializeRawHttpSessionOptions = { cdpEnabled: false } as const;
      const disabledSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions);
      const receiver2Actual = managed.ports;
      const values: number[] = [29100];
      expect(receiver2Actual).toEqual(values);
      const bridgeInfoResult = await readBridgeInfo(server, inheritedSession);
      const receiver3Actual = bridgeInfoResult;
      const toMatchObjectOptions = {
        cdp: { enabled: true, port: 29100, state: 'ready' },
      } as const;
      expect(receiver3Actual).toMatchObject(toMatchObjectOptions);
      const bridgeInfoResult2 = await readBridgeInfo(server, disabledSession);
      const receiver4Actual = bridgeInfoResult2;
      const toMatchObjectOptions2 = {
        cdp: { enabled: false },
      } as const;
      expect(receiver4Actual).toMatchObject(toMatchObjectOptions2);
    });
  });
  it('rolls back failed CDP admission without consuming ordinary HTTP session capacity', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const createCdpEndpointConfigOptions3 = { processEnabled: false, portRange: '29200' } as const;
      const cdpEndpointConfigResult3 = createCdpEndpointConfig(createCdpEndpointConfigOptions3);
      const propertyValue3 = 2;
      const propertyValue4 = managed.start;
      const startHttpBridgeOptions3 = {
        cdp: cdpEndpointConfigResult3,
        sessionMax: propertyValue3,
        startManagedCdpBridge: propertyValue4,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions3);
      const initializeRawHttpSessionOptions2 = { cdpEnabled: true } as const;
      const enabledSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions2);
      const argumentValue = server.url;
      const createInitializeRequestOptions = { cdpEnabled: true } as const;
      const initializeRequestResult = createInitializeRequest(createInitializeRequestOptions);
      const exhausted = await postJsonRpc(argumentValue, initializeRequestResult);
      expect(exhausted.status).toBe(HttpStatus.ServiceUnavailable);
      const initializeRawHttpSessionOptions3 = { cdpEnabled: false } as const;
      const disabledSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions3);
      const bridgeInfoResult3 = await readBridgeInfo(server, enabledSession);
      const receiver5Actual = bridgeInfoResult3;
      const toMatchObjectOptions3 = {
        cdp: { enabled: true, port: 29200 },
      } as const;
      expect(receiver5Actual).toMatchObject(toMatchObjectOptions3);
      const bridgeInfoResult4 = await readBridgeInfo(server, disabledSession);
      const receiver6Actual = bridgeInfoResult4;
      const toMatchObjectOptions4 = {
        cdp: { enabled: false },
      } as const;
      expect(receiver6Actual).toMatchObject(toMatchObjectOptions4);
    });
  });
  it('checks ordinary HTTP capacity before requesting a managed CDP lease', async () => {
    await withFakeUpstream(async () => {
      const managed = createFakeManagedCdpStarter();
      const createCdpEndpointConfigOptions4 = { processEnabled: false, portRange: '29250' } as const;
      const cdpEndpointConfigResult4 = createCdpEndpointConfig(createCdpEndpointConfigOptions4);
      const propertyValue5 = 1;
      const propertyValue6 = managed.start;
      const startHttpBridgeOptions4 = {
        cdp: cdpEndpointConfigResult4,
        sessionMax: propertyValue5,
        startManagedCdpBridge: propertyValue6,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions4);
      const initializeRawHttpSessionOptions4 = { cdpEnabled: false } as const;
      await initializeRawHttpSession(server, initializeRawHttpSessionOptions4);
      const argumentValue2 = server.url;
      const createInitializeRequestOptions2 = { cdpEnabled: true } as const;
      const initializeRequestResult2 = createInitializeRequest(createInitializeRequestOptions2);
      const rejected = await postJsonRpc(argumentValue2, initializeRequestResult2);
      expect(rejected.status).toBe(HttpStatus.ServiceUnavailable);
      const receiver7Actual = managed.ports;
      const values2: never[] = [];
      expect(receiver7Actual).toEqual(values2);
    });
  });
  it('keeps two simultaneous managed CDP HTTP sessions isolated', async () => {
    await withFakeUpstream(async () => {
      const createCdpEndpointConfigOptions5 = { processEnabled: false, portRange: '29300-29301' } as const;
      const cdpEndpointConfigResult5 = createCdpEndpointConfig(createCdpEndpointConfigOptions5);
      const propertyValue7 = 3;
      const startHttpBridgeOptions5 = {
        cdp: cdpEndpointConfigResult5,
        sessionMax: propertyValue7,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions5);
      const initializeRawHttpSessionOptions5 = { cdpEnabled: true } as const;
      const firstSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions5);
      const initializeRawHttpSessionOptions6 = { cdpEnabled: true } as const;
      const secondSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions6);
      const initializeRawHttpSessionOptions7 = { cdpEnabled: false } as const;
      const disabledSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions7);
      const firstInfo = await readBridgeInfo(server, firstSession);
      const secondInfo = await readBridgeInfo(server, secondSession);
      const callSessionToolOptions = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://one.example',
      } as const;
      const firstUpstream = await callSessionTool(
        server,
        firstSession,
        'browser_navigate',
        callSessionToolOptions,
      );
      const callSessionToolOptions2 = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://two.example',
      } as const;
      const secondUpstream = await callSessionTool(
        server,
        secondSession,
        'browser_navigate',
        callSessionToolOptions2,
      );
      const callSessionToolOptions3 = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://disabled.example',
      } as const;
      const disabledUpstream = await callSessionTool(
        server,
        disabledSession,
        'browser_navigate',
        callSessionToolOptions3,
      );
      const receiver8Actual = firstInfo;
      const toMatchObjectOptions5 = {
        cdp: {
          discoveryUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:29300\/cdp\//u),
          enabled: true,
          port: 29300,
          state: 'ready',
        },
      } as const;
      expect(receiver8Actual).toMatchObject(toMatchObjectOptions5);
      const receiver9Actual = secondInfo;
      const toMatchObjectOptions6 = {
        cdp: {
          discoveryUrl: expect.stringMatching(/^http:\/\/127\.0\.0\.1:29301\/cdp\//u),
          enabled: true,
          port: 29301,
          state: 'ready',
        },
      } as const;
      expect(receiver9Actual).toMatchObject(toMatchObjectOptions6);
      const bridgeInfoResult5 = await readBridgeInfo(server, disabledSession);
      const receiver10Actual = bridgeInfoResult5;
      const toMatchObjectOptions7 = { cdp: { enabled: false } } as const;
      expect(receiver10Actual).toMatchObject(toMatchObjectOptions7);
      const firstDiscoveryUrl = (
        firstInfo.cdp as {
          discoveryUrl: string;
        }
      ).discoveryUrl;
      const secondDiscoveryUrl = (
        secondInfo.cdp as {
          discoveryUrl: string;
        }
      ).discoveryUrl;
      const argumentValue3 = new URL(firstDiscoveryUrl).pathname;
      const receiver11Actual = argumentValue3;
      const argumentValue4 = new URL(secondDiscoveryUrl).pathname;
      expect(receiver11Actual).not.toBe(argumentValue4);
      expect(firstUpstream.upstreamPid).not.toBe(secondUpstream.upstreamPid);
      expect(disabledUpstream.upstreamPid).not.toBe(firstUpstream.upstreamPid);
      expect(disabledUpstream.upstreamPid).not.toBe(secondUpstream.upstreamPid);
      const receiver12Actual = firstUpstream.cdpMetrics;
      const toMatchObjectOptions8 = { challengePlacements: 1, tabsCalls: 1 } as const;
      expect(receiver12Actual).toMatchObject(toMatchObjectOptions8);
      const receiver13Actual = secondUpstream.cdpMetrics;
      const toMatchObjectOptions9 = { challengePlacements: 1, tabsCalls: 1 } as const;
      expect(receiver13Actual).toMatchObject(toMatchObjectOptions9);
      const firstInternalPort = (
        firstUpstream.cdpMetrics as {
          internalPort: number;
        }
      ).internalPort;
      const secondInternalPort = (
        secondUpstream.cdpMetrics as {
          internalPort: number;
        }
      ).internalPort;
      expect(firstInternalPort).not.toBe(secondInternalPort);
      const values3: number[] = [29300, 29301];
      expect(values3).not.toContain(firstInternalPort);
      const values4: number[] = [29300, 29301];
      expect(values4).not.toContain(secondInternalPort);
      const receiver14Actual = disabledUpstream.cdpMetrics;
      const toEqualOptions = {
        challengePlacements: 0,
        internalPort: null,
        tabsCalls: 0,
      } as const;
      expect(receiver14Actual).toEqual(toEqualOptions);
    });
  });
  it('refreshes only the owning HTTP session on accepted CDP traffic and expires a quiet socket', async () => {
    await withFakeUpstream(async () => {
      const store = createSessionStore(defaultStreamableHttpOptions.sessionBackend);
      const sessionIdleTtlMs = 500;
      const setupGraceTtlMs = 30000;
      const create = store.create.bind(store);
      const touchRecord = store.touch.bind(store);
      let useSessionIdleTtl = false;
      vi.spyOn(store, 'create').mockImplementation(async (record) => {
        const createOptions = { ...record, expiresAt: record.createdAt + setupGraceTtlMs } as const;
        return await create(createOptions);
      });
      const touch = vi.spyOn(store, 'touch').mockImplementation(async (id, now, idleTtlMs) => {
        const argumentValue5 = useSessionIdleTtl ? idleTtlMs : setupGraceTtlMs;
        return await touchRecord(id, now, argumentValue5);
      });
      const createCdpEndpointConfigOptions6 = { processEnabled: false, portRange: '29310' } as const;
      const cdpEndpointConfigResult6 = createCdpEndpointConfig(createCdpEndpointConfigOptions6);
      const currentSessionIdleTtlMs = sessionIdleTtlMs;
      const propertyValue8 = 1;
      const currentStore = store;
      const startHttpBridgeOptions6 = {
        cdp: cdpEndpointConfigResult6,
        sessionIdleTtlMs: currentSessionIdleTtlMs,
        sessionMax: propertyValue8,
        sessionStore: currentStore,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions6);
      const initializeRawHttpSessionOptions8 = { cdpEnabled: true } as const;
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions8);
      const info = await readBridgeInfo(server, sessionId);
      const discoveryUrl = (
        info.cdp as {
          discoveryUrl: string;
        }
      ).discoveryUrl;
      const callsBeforeCdp = touch.mock.calls.length;
      const message2 = `${discoveryUrl}/json/version`;
      const discovery = await fetch(message2);
      expect(discovery.status).toBe(HttpStatus.Ok);
      await vi.waitFor(() => {
        const receiver15Actual = touch;
        const computedValue = callsBeforeCdp + 1;
        return expect(receiver15Actual).toHaveBeenCalledTimes(computedValue);
      });
      const version = (await discovery.json()) as {
        webSocketDebuggerUrl: string;
      };
      const callsBeforeSocket = touch.mock.calls.length;
      const socket = new WebSocket(version.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      const socketClosed = new Promise<void>((resolve) => socket.once('close', () => resolve()));
      await delay(25);
      expect(touch).toHaveBeenCalledTimes(callsBeforeSocket);
      useSessionIdleTtl = true;
      const stringifyOptions = { id: 1, method: 'Browser.getVersion' } as const;
      const serializedValue = JSON.stringify(stringifyOptions);
      socket.send(serializedValue);
      await vi.waitFor(() => expect(touch.mock.calls.length).toBeGreaterThan(callsBeforeSocket));
      await delay(1100);
      const ready = await fetchReady(server.url);
      const readyBody = (await ready.json()) as {
        sessions: {
          active: number;
        };
      };
      expect(readyBody.sessions.active).toBe(0);
      await expect(socketClosed).resolves.toBeUndefined();
    });
  });
  it('replaces a lost browser generation without changing the successful MCP result', async () => {
    await withFakeUpstream(async () => {
      const createCdpEndpointConfigOptions7 = { processEnabled: false, portRange: '29320' } as const;
      const cdpEndpointConfigResult7 = createCdpEndpointConfig(createCdpEndpointConfigOptions7);
      const propertyValue9 = 1;
      const startHttpBridgeOptions7 = {
        cdp: cdpEndpointConfigResult7,
        sessionMax: propertyValue9,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions7);
      const initializeRawHttpSessionOptions9 = { cdpEnabled: true } as const;
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions9);
      const firstInfo = await readBridgeInfo(server, sessionId);
      const firstCdp = firstInfo.cdp as {
        discoveryUrl: string;
        generation: number;
      };
      const callSessionToolOptions4 = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://initial.example',
      } as const;
      const initialResult = await callSessionTool(
        server,
        sessionId,
        'browser_navigate',
        callSessionToolOptions4,
      );
      const initialPid = initialResult.upstreamPid;
      const receiver16Actual = initialPid;
      const anyResult = expect.any(Number);
      expect(receiver16Actual).toEqual(anyResult);
      const message3 = `${firstCdp.discoveryUrl}/json/version`;
      const firstDiscovery = await fetch(message3);
      const firstVersion = (await firstDiscovery.json()) as {
        webSocketDebuggerUrl: string;
      };
      const socket = new WebSocket(firstVersion.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        socket.once('open', resolve);
        socket.once('error', reject);
      });
      const socketClosed = new Promise<void>((resolve) => socket.once('close', () => resolve()));
      const stringifyOptions2 = { id: 1, method: 'Browser.close' } as const;
      const serializedValue2 = JSON.stringify(stringifyOptions2);
      socket.send(serializedValue2);
      await expect(socketClosed).resolves.toBeUndefined();
      const bridgeInfoResult6 = await readBridgeInfo(server, sessionId);
      const receiver17Actual = bridgeInfoResult6;
      const toMatchObjectOptions10 = {
        cdp: {
          activeConnections: 0,
          discoveryUrl: null,
          generation: firstCdp.generation,
          state: 'unavailable',
        },
      } as const;
      expect(receiver17Actual).toMatchObject(toMatchObjectOptions10);
      const message4 = `${firstCdp.discoveryUrl}/json/version`;
      const argumentValue6 = (await fetch(message4)).status;
      expect(argumentValue6).toBe(HttpStatus.NotFound);
      const expectedArguments = {
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://replacement.example',
      };
      const result = await callSessionTool(server, sessionId, 'browser_navigate', expectedArguments);
      const receiver18Actual = result;
      const toMatchObjectOptions11 = {
        arguments: expectedArguments,
        forwarded: true,
        name: 'browser_navigate',
      } as const;
      expect(receiver18Actual).toMatchObject(toMatchObjectOptions11);
      const receiver19Actual = result.upstreamPid;
      const anyResult2 = expect.any(Number);
      expect(receiver19Actual).toEqual(anyResult2);
      expect(result.upstreamPid).not.toBe(initialPid);
      const receiver20Actual = result.cdpMetrics;
      const toMatchObjectOptions12 = { challengePlacements: 1, tabsCalls: 1 } as const;
      expect(receiver20Actual).toMatchObject(toMatchObjectOptions12);
      expect(
        (
          result.cdpMetrics as {
            internalPort: number;
          }
        ).internalPort,
      ).not.toBe(
        (
          initialResult.cdpMetrics as {
            internalPort: number;
          }
        ).internalPort,
      );
      const secondInfo = await readBridgeInfo(server, sessionId);
      const secondCdp = secondInfo.cdp as {
        discoveryUrl: string;
        generation: number;
      };
      const receiver21Actual = secondCdp.generation;
      const computedValue2 = firstCdp.generation + 1;
      expect(receiver21Actual).toBe(computedValue2);
      expect(secondCdp.discoveryUrl).not.toBe(firstCdp.discoveryUrl);
      const message5 = `${firstCdp.discoveryUrl}/json/version`;
      const argumentValue7 = (await fetch(message5)).status;
      expect(argumentValue7).toBe(HttpStatus.NotFound);
      const message6 = `${secondCdp.discoveryUrl}/json/version`;
      const argumentValue8 = (await fetch(message6)).status;
      expect(argumentValue8).toBe(HttpStatus.Ok);
      const message7 = `${secondCdp.discoveryUrl}/json/version`;
      const secondVersionResponse = await fetch(message7);
      const secondVersion = (await secondVersionResponse.json()) as {
        webSocketDebuggerUrl: string;
      };
      const secondSocket = new WebSocket(secondVersion.webSocketDebuggerUrl);
      await new Promise<void>((resolve, reject) => {
        secondSocket.once('open', resolve);
        secondSocket.once('error', reject);
      });
      const secondSocketClosed = new Promise<void>((resolve) => secondSocket.once('close', () => resolve()));
      const stringifyOptions3 = { id: 2, method: 'Browser.close' } as const;
      const serializedValue3 = JSON.stringify(stringifyOptions3);
      secondSocket.send(serializedValue3);
      await expect(secondSocketClosed).resolves.toBeUndefined();
      const callSessionToolOptions5 = {
        callId: 'concurrent-a',
        delayMs: 25,
        includeCdpMetrics: true,
        includePid: true,
        url: 'https://concurrent-a.example',
      } as const;
      const callSessionToolResult = callSessionTool(
        server,
        sessionId,
        'browser_navigate',
        callSessionToolOptions5,
      );
      const callSessionToolOptions6 = {
        callId: 'concurrent-b',
        includeCdpMetrics: true,
        includePid: true,
      } as const;
      const callSessionToolResult2 = callSessionTool(
        server,
        sessionId,
        'browser_snapshot',
        callSessionToolOptions6,
      );
      const values5: [Promise<Record<string, unknown>>, Promise<Record<string, unknown>>] = [
        callSessionToolResult,
        callSessionToolResult2,
      ];
      const [firstConcurrent, secondConcurrent] = await Promise.all(values5);
      expect(firstConcurrent.upstreamPid).toBe(secondConcurrent.upstreamPid);
      expect(firstConcurrent.upstreamPid).not.toBe(result.upstreamPid);
      expect(firstConcurrent.toolCallCount).toBe(1);
      expect(secondConcurrent.toolCallCount).toBe(1);
      const receiver22Actual = firstConcurrent.cdpMetrics;
      const toMatchObjectOptions13 = {
        challengePlacements: 1,
        tabsCalls: 1,
      } as const;
      expect(receiver22Actual).toMatchObject(toMatchObjectOptions13);
      const receiver23Actual = secondConcurrent.cdpMetrics;
      const toMatchObjectOptions14 = {
        challengePlacements: 1,
        tabsCalls: 1,
      } as const;
      expect(receiver23Actual).toMatchObject(toMatchObjectOptions14);
      const thirdInfo = await readBridgeInfo(server, sessionId);
      const receiver24Actual = thirdInfo;
      const toMatchObjectOptions15 = {
        cdp: {
          generation: secondCdp.generation + 1,
          port: 29320,
          state: 'ready',
        },
      } as const;
      expect(receiver24Actual).toMatchObject(toMatchObjectOptions15);
    });
  });
  it('keeps independent CDP reads usable while an MCP browser command is in flight', async () => {
    await withFakeUpstream(async () => {
      const createCdpEndpointConfigOptions8 = { processEnabled: false, portRange: '29330' } as const;
      const cdpEndpointConfigResult8 = createCdpEndpointConfig(createCdpEndpointConfigOptions8);
      const propertyValue10 = 1;
      const startHttpBridgeOptions8 = {
        cdp: cdpEndpointConfigResult8,
        sessionMax: propertyValue10,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions8);
      const initializeRawHttpSessionOptions10 = { cdpEnabled: true } as const;
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions10);
      const info = await readBridgeInfo(server, sessionId);
      const discoveryUrl = (
        info.cdp as {
          discoveryUrl: string;
        }
      ).discoveryUrl;
      const callSessionToolOptions7 = {
        delayMs: 600,
        url: 'https://slow.example',
      } as const;
      const slowMcpCall = callSessionTool(server, sessionId, 'browser_navigate', callSessionToolOptions7);
      await delay(25);
      const message8 = `${discoveryUrl}/json/version`;
      const fetchResult = fetch(message8);
      const thenResult = delay(250).then(() => 'timeout' as const);
      const values6: [Promise<Response>, Promise<'timeout'>] = [fetchResult, thenResult];
      const concurrentCdp = await Promise.race(values6);
      expect(concurrentCdp).not.toBe('timeout');
      expect((concurrentCdp as Response).status).toBe(HttpStatus.Ok);
      const receiver25Actual = slowMcpCall;
      const toMatchObjectOptions16 = { forwarded: true } as const;
      await expect(receiver25Actual).resolves.toMatchObject(toMatchObjectOptions16);
    });
  });
  it('initializes a session, lists tools, and forwards tool calls', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { client, transport } = await connectHttpClient(server);
      const tools = await client.listTools();
      expect(transport.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      const mappedValues3 = tools.tools.map((tool) => tool.name);
      const receiver26Actual = mappedValues3;
      const values7: string[] = [...fakeUpstreamToolNames, LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
      expect(receiver26Actual).toEqual(values7);
      const callToolOptions = {
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' },
      } as const;
      const result = await client.callTool(callToolOptions);
      const receiver27Actual = result.structuredContent;
      const toEqualOptions2 = {
        forwarded: true,
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' },
      } as const;
      expect(receiver27Actual).toEqual(toEqualOptions2);
    });
  });
  it('keeps dynamic WebMCP tools and list-changed notifications isolated per HTTP session', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions9 = { sessionMax: 2 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions9);
      const first = await connectHttpClient(server);
      const second = await connectHttpClient(server);
      const firstNotifications = vi.fn();
      const secondNotifications = vi.fn();
      first.client.setNotificationHandler(ToolListChangedNotificationSchema, firstNotifications);
      second.client.setNotificationHandler(ToolListChangedNotificationSchema, secondNotifications);
      await first.client.listTools();
      await second.client.listTools();
      const callToolOptions2 = {
        name: 'browser_evaluate',
        arguments: {
          fakeDynamicToolAction: 'add',
          fakeDynamicToolName: 'webmcp_checkout',
        },
      } as const;
      await first.client.callTool(callToolOptions2);
      await vi.waitFor(() => expect(firstNotifications).toHaveBeenCalledTimes(1));
      expect(secondNotifications).not.toHaveBeenCalled();
      const firstTools = await first.client.listTools();
      const secondTools = await second.client.listTools();
      const receiver28Actual = firstTools.tools;
      const objectContainingOptions = {
        name: 'webmcp_checkout',
        description: 'Page-provided dynamic tool.',
        annotations: { readOnlyHint: false },
      } as const;
      const objectContainingResult = expect.objectContaining(objectContainingOptions);
      expect(receiver28Actual).toContainEqual(objectContainingResult);
      const mappedValues4 = secondTools.tools.map((tool) => tool.name);
      expect(mappedValues4).not.toContain('webmcp_checkout');
      const callToolOptions3 = { name: 'webmcp_checkout', arguments: { value: 'book' } } as const;
      const toolResult = first.client.callTool(callToolOptions3);
      const receiver29Actual = toolResult;
      const toMatchObjectOptions17 = {
        structuredContent: {
          forwarded: true,
          name: 'webmcp_checkout',
          arguments: { value: 'book' },
        },
      } as const;
      await expect(receiver29Actual).resolves.toMatchObject(toMatchObjectOptions17);
      const callToolOptions4 = {
        name: 'browser_evaluate',
        arguments: {
          fakeDynamicToolAction: 'remove',
          fakeDynamicToolName: 'webmcp_checkout',
        },
      } as const;
      await first.client.callTool(callToolOptions4);
      await vi.waitFor(() => expect(firstNotifications).toHaveBeenCalledTimes(2));
      const mappedValues5 = (await first.client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues5).not.toContain('webmcp_checkout');
    });
  });
  it('refreshes dynamic tools without an open HTTP notification stream', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server);
      const initial = await postToolsList(server.url, sessionId);
      expect(initial.status).toBe(HttpStatus.Ok);
      const argumentValue9 = server.url;
      const postJsonRpcOptions = {
        jsonrpc: JSON_RPC_VERSION,
        id: crypto.randomUUID(),
        method: 'tools/call',
        params: {
          name: 'browser_evaluate',
          arguments: {
            fakeDynamicToolAction: 'add',
            fakeDynamicToolName: 'webmcp_no_stream',
          },
        },
      } as const;
      const add = await postJsonRpc(argumentValue9, postJsonRpcOptions, sessionId);
      expect(add.status).toBe(HttpStatus.Ok);
      await vi.waitFor(async () => {
        const refreshed = await postToolsList(server.url, sessionId);
        const body = (await readJsonRpcResponse(refreshed)) as {
          result?: {
            tools?: Array<{
              name?: string;
            }>;
          };
        };
        const mappedValues6 = body.result?.tools?.map((tool) => tool.name);
        expect(mappedValues6).toContain('webmcp_no_stream');
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
  it('preserves a session when DELETE has an unsupported protocol version', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { transport } = await connectHttpClient(server);
      const sessionId = transport.sessionId;
      expect(sessionId).toBeDefined();
      const fetchOptions = {
        method: 'DELETE',
        headers: {
          'mcp-session-id': sessionId ?? '',
          'mcp-protocol-version': 'unsupported',
        },
      } as const;
      const rejected = await fetch(server.url, fetchOptions);
      expect(rejected.status).toBe(HttpStatus.BadRequest);
      const active = await postToolsList(server.url, sessionId);
      expect(active.status).toBe(HttpStatus.Ok);
      await transport.terminateSession();
      const closed = await postToolsList(server.url, sessionId);
      expect(closed.status).toBe(HttpStatus.NotFound);
    });
  });
  it('terminates the upstream child process with DELETE', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { client, transport } = await connectHttpClient(server);
      const callToolOptions5 = {
        name: 'browser_navigate',
        arguments: { url: 'https://example.com', includePid: true },
      } as const;
      const result = await client.callTool(callToolOptions5);
      const content = result.structuredContent as {
        upstreamPid: number;
      };
      await transport.terminateSession();
      const waitForOptions = { timeout: 5000 } as const;
      await vi.waitFor(() => {
        const isProcessRunningResult = isProcessRunning(content.upstreamPid);
        expect(isProcessRunningResult).toBe(false);
      }, waitForOptions);
    });
  });
  it('keeps separate upstream child processes per HTTP session', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions10 = { sessionMax: 4 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions10);
      const first = await connectHttpClient(server);
      const second = await connectHttpClient(server);
      const callToolOptions6 = {
        name: 'browser_navigate',
        arguments: { url: 'https://one.example', includePid: true },
      } as const;
      const firstResult = await first.client.callTool(callToolOptions6);
      const callToolOptions7 = {
        name: 'browser_navigate',
        arguments: { url: 'https://two.example', includePid: true },
      } as const;
      const secondResult = await second.client.callTool(callToolOptions7);
      const receiver30Actual = firstResult.structuredContent;
      const toMatchObjectOptions18 = { forwarded: true } as const;
      expect(receiver30Actual).toMatchObject(toMatchObjectOptions18);
      const receiver31Actual = secondResult.structuredContent;
      const toMatchObjectOptions19 = { forwarded: true } as const;
      expect(receiver31Actual).toMatchObject(toMatchObjectOptions19);
      const firstContent = firstResult.structuredContent as Record<string, unknown>;
      const secondContent = secondResult.structuredContent as Record<string, unknown>;
      expect(firstContent.upstreamPid).not.toBe(secondContent.upstreamPid);
    });
  });
  it('rejects an expired session and releases its upstream process before a fresh session is used', async () => {
    await withFakeUpstream(async () => {
      const store = createSessionStore('memory');
      const options = { sessionStore: store };
      const server = await startHttpBridge(options);
      const { client, transport } = await connectHttpClient(server);
      const request = { name: 'browser_snapshot', arguments: { includePid: true } };
      const result = await client.callTool(request);
      const content = result.structuredContent as { upstreamPid: number };
      const id = transport.sessionId;
      if (!id) throw new Error('Missing active HTTP session ID');
      const now = Date.now();
      const expiredAt = now - 1000;
      await store.touch(id, expiredAt, 1);
      const expired = await postToolsList(server.url, id);
      expect(expired.status).toBe(HttpStatus.NotFound);
      const termination = { timeout: 5000 };
      await expect.poll(() => isProcessRunning(content.upstreamPid), termination).toBe(false);
      const fresh = await connectHttpClient(server);
      const recovered = await fresh.client.callTool(request);
      const recoveredContent = recovered.structuredContent as { upstreamPid: number };
      expect(recoveredContent.upstreamPid).not.toBe(content.upstreamPid);
    });
  });
  it('keeps neighbouring sessions usable after an upstream exits and recovers with a fresh session', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const first = await connectHttpClient(server);
      const second = await connectHttpClient(server);
      const request = { name: 'browser_navigate', arguments: { includePid: true } };
      const result = await first.client.callTool(request);
      const content = result.structuredContent as { upstreamPid: number };
      process.kill(content.upstreamPid, 'SIGTERM');
      await expect.poll(() => isProcessRunning(content.upstreamPid)).toBe(false);
      const failedRequest = { name: 'browser_snapshot', arguments: {} };
      const failed = first.client.callTool(failedRequest);
      await expect(failed).rejects.toThrow(/closed|not connected/iu);
      const healthy = await second.client.callTool(request);
      const healthyContent = healthy.structuredContent as { forwarded: boolean; upstreamPid: number };
      expect(healthyContent.forwarded).toBe(true);
      const secondPid = healthyContent.upstreamPid;
      expect(secondPid).not.toBe(content.upstreamPid);
      const fresh = await connectHttpClient(server);
      const recovered = await fresh.client.callTool(request);
      const recoveredContent = recovered.structuredContent as { forwarded: boolean };
      expect(recoveredContent.forwarded).toBe(true);
      const sessionId = first.transport.sessionId;
      await first.transport.terminateSession();
      const response = await postToolsList(server.url, sessionId);
      expect(response.status).toBe(HttpStatus.NotFound);
    });
  });
  it('cancels an in-flight HTTP call without losing its session and terminates the owned child', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const { client, transport } = await connectHttpClient(server);
      const pidRequest = { name: 'browser_snapshot', arguments: { includePid: true } };
      const initial = await client.callTool(pidRequest);
      const content = initial.structuredContent as { upstreamPid: number };
      const controller = new AbortController();
      const request = {
        name: 'browser_navigate',
        arguments: {
          callId: 'cancelled-call',
          fakeRecordStartedCall: true,
          delayMs: 2000,
        },
      };
      const options = { signal: controller.signal };
      const pending = client.callTool(request, undefined, options).then(
        () => ({ success: true, error: undefined }),
        (error: unknown) => ({ success: false, error }),
      );
      try {
        await expect
          .poll(async () => {
            const observation = { name: 'browser_snapshot', arguments: { includeStartedCalls: true } };
            const result = await client.callTool(observation);
            const content = result.structuredContent as { startedCalls: string[] };
            return content.startedCalls;
          })
          .toContain('cancelled-call');
        const reason = new Error('Controlled request cancellation');
        controller.abort(reason);
        const outcome = await pending;
        expect(outcome.success).toBe(false);
        const message = expect.stringContaining('Controlled request cancellation');
        const expected = { code: ErrorCode.RequestTimeout, message };
        expect(outcome.error).toMatchObject(expected);
        const retained = await client.callTool(pidRequest);
        const retainedContent = retained.structuredContent as { upstreamPid: number };
        expect(retainedContent.upstreamPid).toBe(content.upstreamPid);
        const sessionId = transport.sessionId;
        await transport.terminateSession();
        const termination = { timeout: 5000 };
        await expect.poll(() => isProcessRunning(content.upstreamPid), termination).toBe(false);
        const response = await postToolsList(server.url, sessionId);
        expect(response.status).toBe(HttpStatus.NotFound);
      } finally {
        controller.abort();
        await pending;
      }
    });
  });
  it('uses one explicit custom binary path for all HTTP sessions', async () => {
    const withFakeUpstreamOptions = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      const root = createTempRoot();
      const binaryPath = path.join(root, 'custom-chrome');
      const writeFileSyncOptions = { mode: 0o755 } as const;
      writeFileSync(binaryPath, 'test binary', writeFileSyncOptions);
      const startHttpBridgeOptions11 = { runtimeOptions: { binaryPath } } as const;
      const server = await startHttpBridge(startHttpBridgeOptions11);
      const { client } = await connectHttpClient(server);
      const callToolOptions8 = {
        name: LOCAL_TOOL_BINARY_INFO,
        arguments: {},
      } as const;
      const result = await client.callTool(callToolOptions8);
      const receiver32Actual = result.structuredContent;
      const toMatchObjectOptions20 = {
        executablePath: canonicalDirectory(binaryPath),
      } as const;
      expect(receiver32Actual).toMatchObject(toMatchObjectOptions20);
    }, withFakeUpstreamOptions);
  });
  it('applies independent runtime proxy metadata per HTTP session', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions12 = { sessionMax: 4 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions12);
      const initializeRawHttpSessionOptions11 = {
        proxyServer: 'http://one.example:8080',
        proxyBypass: '.one',
      } as const;
      const initializeRawHttpSessionResult = initializeRawHttpSession(
        server,
        initializeRawHttpSessionOptions11,
      );
      const initializeRawHttpSessionOptions12 = {
        proxyServer: 'http://two.example:8080',
      } as const;
      const initializeRawHttpSessionResult2 = initializeRawHttpSession(
        server,
        initializeRawHttpSessionOptions12,
      );
      const values8: [Promise<string>, Promise<string>] = [
        initializeRawHttpSessionResult,
        initializeRawHttpSessionResult2,
      ];
      const [firstSessionId, secondSessionId] = await Promise.all(values8);
      const expectProxyEnvOptions = {
        server: 'http://one.example:8080',
        bypass: '.one',
      } as const;
      await expectProxyEnv(server, firstSessionId, expectProxyEnvOptions);
      const expectProxyEnvOptions2 = {
        server: 'http://two.example:8080',
        bypass: null,
      } as const;
      await expectProxyEnv(server, secondSessionId, expectProxyEnvOptions2);
    });
  });
  it('applies authenticated runtime proxy metadata through generated config', async () => {
    await withFakeUpstream(async () => {
      const server = await startHttpBridge();
      const initializeRawHttpSessionOptions13 = {
        proxyServer: 'http://user:p%40ssword@secure.example:8080',
        proxyBypass: '.secure',
      } as const;
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions13);
      const expectProxyEnvOptions3 = {
        server: null,
        bypass: null,
      } as const;
      await expectProxyEnv(server, sessionId, expectProxyEnvOptions3);
      const expectProxyConfigOptions = {
        server: 'http://secure.example:8080',
        bypass: '.secure',
        username: 'user',
        password: 'p@ssword',
      } as const;
      await expectProxyConfig(server, sessionId, expectProxyConfigOptions);
    });
  });
  it('applies independent runtime humanize metadata per HTTP session', async () => {
    const withFakeUpstreamOptions2 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      process.env.CLOAK_PLAYWRIGHT_MCP_HUMANIZE = 'true';
      const startHttpBridgeOptions13 = { sessionMax: 4 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions13);
      const initializeRawHttpSessionOptions14 = { humanize: false } as const;
      const disabledSessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions14);
      const defaultSessionId = await initializeRawHttpSession(server);
      const initializeRawHttpSessionOptions15 = { humanize: true } as const;
      const enabledSessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions15);
      const expectHumanizeConfigOptions = { enabled: false, initPageCount: 0 } as const;
      await expectHumanizeConfig(server, disabledSessionId, expectHumanizeConfigOptions);
      const expectHumanizeConfigOptions2 = {
        enabled: true,
        initPageCount: 1,
        preset: 'default',
      } as const;
      await expectHumanizeConfig(server, defaultSessionId, expectHumanizeConfigOptions2);
      const expectHumanizeConfigOptions3 = {
        enabled: true,
        initPageCount: 1,
        preset: 'default',
      } as const;
      await expectHumanizeConfig(server, enabledSessionId, expectHumanizeConfigOptions3);
    }, withFakeUpstreamOptions2);
  });
  it('applies independent runtime human preset metadata per HTTP session sequentially', async () => {
    const withFakeUpstreamOptions3 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      process.env.CLOAK_PLAYWRIGHT_MCP_HUMANIZE = 'true';
      process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = 'careful';
      const startHttpBridgeOptions14 = { sessionMax: 3 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions14);
      const initializeRawHttpSessionOptions16 = { humanPreset: 'default' } as const;
      const defaultSessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions16);
      const expectHumanizeConfigOptions4 = {
        enabled: true,
        initPageCount: 1,
        preset: 'default',
      } as const;
      await expectHumanizeConfig(server, defaultSessionId, expectHumanizeConfigOptions4);
      const initializeRawHttpSessionOptions17 = { humanPreset: 'careful' } as const;
      const carefulSessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions17);
      const expectHumanizeConfigOptions5 = {
        enabled: true,
        initPageCount: 1,
        preset: 'careful',
      } as const;
      await expectHumanizeConfig(server, carefulSessionId, expectHumanizeConfigOptions5);
      const inheritedSessionId = await initializeRawHttpSession(server);
      const expectHumanizeConfigOptions6 = {
        enabled: true,
        initPageCount: 1,
        preset: 'careful',
      } as const;
      await expectHumanizeConfig(server, inheritedSessionId, expectHumanizeConfigOptions6);
    }, withFakeUpstreamOptions3);
  });
  it('applies independent runtime headless metadata per HTTP session', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_HEADLESS = 'true';
      const startHttpBridgeOptions15 = { sessionMax: 3 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions15);
      const initializeRawHttpSessionOptions18 = { headless: false } as const;
      const initializeRawHttpSessionResult3 = initializeRawHttpSession(
        server,
        initializeRawHttpSessionOptions18,
      );
      const initializeRawHttpSessionOptions19 = { headless: true } as const;
      const initializeRawHttpSessionResult4 = initializeRawHttpSession(
        server,
        initializeRawHttpSessionOptions19,
      );
      const values9: [Promise<string>, Promise<string>] = [
        initializeRawHttpSessionResult3,
        initializeRawHttpSessionResult4,
      ];
      const [headedSessionId, headlessSessionId] = await Promise.all(values9);
      const expectHeadlessConfigOptions = { env: 'false', config: false } as const;
      await expectHeadlessConfig(server, headedSessionId, expectHeadlessConfigOptions);
      const expectHeadlessConfigOptions2 = { env: 'true', config: true } as const;
      await expectHeadlessConfig(server, headlessSessionId, expectHeadlessConfigOptions2);
    });
  });
  it('applies profile, context, and extension metadata through generated config', async () => {
    const withFakeUpstreamOptions4 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      const root = createTempRoot();
      const profileDir = path.join(root, 'profiles', 'default');
      const extensionDir = path.join(root, 'extensions', 'my-extension');
      const mkdirSyncOptions = { recursive: true } as const;
      mkdirSync(extensionDir, mkdirSyncOptions);
      const startHttpBridgeOptions16 = { sessionMax: 2 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions16);
      const initializeRawHttpSessionOptions20: Record<string, unknown> | undefined = {
        humanize: true,
        userDataDir: profileDir,
        contextOptions: {
          viewport: { width: 1280, height: 720 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          colorScheme: 'dark',
        },
        extensionPaths: [extensionDir],
      };
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions20);
      const expectBrowserConfigOptions = {
        userDataDir: canonicalDirectory(profileDir),
        contextOptions: {
          viewport: { width: 1280, height: 720 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          colorScheme: 'dark',
        },
        extensionDir: canonicalDirectory(extensionDir),
      } as const;
      await expectBrowserConfig(server, sessionId, expectBrowserConfigOptions);
      const expectHumanizeConfigOptions7 = {
        enabled: true,
        initPageCount: 1,
        preset: 'default',
      } as const;
      await expectHumanizeConfig(server, sessionId, expectHumanizeConfigOptions7);
    }, withFakeUpstreamOptions4);
  });
  it('applies isolated Playwright Extension metadata per HTTP session without exposing the token', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_EXTENSION = 'false';
      process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN = 'http-extension-secret';
      process.env.PLAYWRIGHT_MCP_PROFILE_DIR_NAME = 'Process Profile';
      const root = createTempRoot();
      const firstProfile = path.join(root, 'profiles', 'first');
      const secondProfile = path.join(root, 'profiles', 'second');
      const startHttpBridgeOptions17 = { sessionMax: 3 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions17);
      const initializeRawHttpSessionOptions21 = {
        extensionMode: true,
        profileDirName: 'Profile 1',
        userDataDir: firstProfile,
      } as const;
      const firstSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions21);
      const initializeRawHttpSessionOptions22 = {
        extensionMode: true,
        profileDirName: 'Profile 2',
        userDataDir: secondProfile,
      } as const;
      const secondSession = await initializeRawHttpSession(server, initializeRawHttpSessionOptions22);
      const expectExtensionConfigOptions = {
        enabled: 'true',
        hasToken: true,
        profileDirName: 'Profile 1',
        userDataDir: canonicalDirectory(firstProfile),
      } as const;
      await expectExtensionConfig(server, firstSession, expectExtensionConfigOptions);
      const expectExtensionConfigOptions2 = {
        enabled: 'true',
        hasToken: true,
        profileDirName: 'Profile 2',
        userDataDir: canonicalDirectory(secondProfile),
      } as const;
      await expectExtensionConfig(server, secondSession, expectExtensionConfigOptions2);
      const argumentValue10 = server.url;
      const createInitializeRequestOptions3 = {
        extensionMode: true,
        profileDirName: 'Profile 3',
        userDataDir: firstProfile,
      } as const;
      const initializeRequestResult3 = createInitializeRequest(createInitializeRequestOptions3);
      const duplicate = await postJsonRpc(argumentValue10, initializeRequestResult3);
      expect(duplicate.status).toBe(HttpStatus.BadRequest);
      const duplicateForRedaction = duplicate.clone();
      await expectJsonRpcErrorMessage(duplicate, 'already active');
      const textResult = await duplicateForRedaction.text();
      expect(textResult).not.toContain('http-extension-secret');
    });
  });
  it('does not forward the process extension token to non-extension HTTP sessions', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_EXTENSION = 'true';
      process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN = 'process-extension-secret';
      const root = createTempRoot();
      const profileDir = path.join(root, 'profiles', 'non-extension');
      const server = await startHttpBridge();
      const initializeRawHttpSessionOptions23 = {
        extensionMode: false,
        profileDirName: 'Profile 1',
        userDataDir: profileDir,
      } as const;
      const sessionId = await initializeRawHttpSession(server, initializeRawHttpSessionOptions23);
      const expectExtensionConfigOptions3 = {
        enabled: 'false',
        hasToken: false,
        profileDirName: 'Profile 1',
        userDataDir: canonicalDirectory(profileDir),
      } as const;
      await expectExtensionConfig(server, sessionId, expectExtensionConfigOptions3);
    });
  });
  it('rejects Playwright Extension HTTP metadata when the process token is absent', async () => {
    await withFakeUpstream(async () => {
      delete process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
      const root = createTempRoot();
      const server = await startHttpBridge();
      const argumentValue11 = server.url;
      const createInitializeRequestOptions4 = {
        extensionMode: true,
        userDataDir: path.join(root, 'profiles', 'extension'),
      } as const;
      const initializeRequestResult4 = createInitializeRequest(createInitializeRequestOptions4);
      const response = await postJsonRpc(argumentValue11, initializeRequestResult4);
      expect(response.status).toBe(HttpStatus.BadRequest);
      await expectJsonRpcErrorMessage(response, 'PLAYWRIGHT_MCP_EXTENSION_TOKEN');
    });
  });
  it('rejects duplicate profile sessions without leaking session capacity', async () => {
    const withFakeUpstreamOptions5 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      const root = createTempRoot();
      const profileDir = path.join(root, 'profiles', 'default');
      const startHttpBridgeOptions18 = { sessionMax: 2 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions18);
      const initializeRawHttpSessionOptions24 = { userDataDir: profileDir } as const;
      await initializeRawHttpSession(server, initializeRawHttpSessionOptions24);
      const argumentValue12 = server.url;
      const createInitializeRequestOptions5 = { userDataDir: profileDir } as const;
      const initializeRequestResult5 = createInitializeRequest(createInitializeRequestOptions5);
      const duplicate = await postJsonRpc(argumentValue12, initializeRequestResult5);
      expect(duplicate.status).toBe(HttpStatus.BadRequest);
      const result2: string | null = duplicate.headers.get(MCP_SESSION_ID_HEADER);
      expect(result2).toBeNull();
      const ready = await fetchReady(server.url);
      const body = (await ready.json()) as {
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      const receiver33Actual = body.sessions;
      const toMatchObjectOptions21 = {
        active: 1,
        pending: 0,
        max: 2,
        available: 1,
      } as const;
      expect(receiver33Actual).toMatchObject(toMatchObjectOptions21);
    }, withFakeUpstreamOptions5);
  });
  it('rejects extension metadata without a persistent profile before creating a session', async () => {
    const withFakeUpstreamOptions6 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      const root = createTempRoot();
      const extensionDir = path.join(root, 'extensions', 'my-extension');
      const mkdirSyncOptions2 = { recursive: true } as const;
      mkdirSync(extensionDir, mkdirSyncOptions2);
      const startHttpBridgeOptions19 = { sessionMax: 1 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions19);
      const argumentValue13 = server.url;
      const createInitializeRequestOptions6: Record<string, unknown> | undefined = {
        extensionPaths: [extensionDir],
      };
      const initializeRequestResult6 = createInitializeRequest(createInitializeRequestOptions6);
      const response = await postJsonRpc(argumentValue13, initializeRequestResult6);
      expect(response.status).toBe(HttpStatus.BadRequest);
      const result3: string | null = response.headers.get(MCP_SESSION_ID_HEADER);
      expect(result3).toBeNull();
      const ready = await fetchReady(server.url);
      const body = (await ready.json()) as {
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      const receiver34Actual = body.sessions;
      const toMatchObjectOptions22 = {
        active: 0,
        pending: 0,
        max: 1,
        available: 1,
      } as const;
      expect(receiver34Actual).toMatchObject(toMatchObjectOptions22);
    }, withFakeUpstreamOptions6);
  });
  it('uses initialize metadata labels in runtime configuration errors', async () => {
    const withFakeUpstreamOptions7 = { browserEngine: 'cloak' } as const;
    await withFakeUpstream(async () => {
      const root = createTempRoot();
      const startHttpBridgeOptions20 = { sessionMax: 1 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions20);
      const argumentValue14 = server.url;
      const createInitializeRequestOptions7 = { userDataDir: ' ' } as const;
      const initializeRequestResult7 = createInitializeRequest(createInitializeRequestOptions7);
      const profileResponse = await postJsonRpc(argumentValue14, initializeRequestResult7);
      expect(profileResponse.status).toBe(HttpStatus.BadRequest);
      await expectJsonRpcErrorMessage(profileResponse, 'userDataDir must be a non-empty string');
      const argumentValue15 = server.url;
      const createInitializeRequestOptions8: Record<string, unknown> | undefined = {
        userDataDir: path.join(root, 'profiles', 'default'),
        extensionPaths: [path.join(root, 'missing-extension')],
      };
      const initializeRequestResult8 = createInitializeRequest(createInitializeRequestOptions8);
      const extensionResponse = await postJsonRpc(argumentValue15, initializeRequestResult8);
      expect(extensionResponse.status).toBe(HttpStatus.BadRequest);
      await expectJsonRpcErrorMessage(
        extensionResponse,
        'extensionPaths[0] must point to an existing directory',
      );
    }, withFakeUpstreamOptions7);
  });
  it('falls back to environment proxy configuration without runtime metadata', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_PROXY_SERVER = 'http://env.example:8080';
      process.env.PLAYWRIGHT_MCP_PROXY_BYPASS = '.env';
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server);
      const expectProxyEnvOptions4 = {
        server: 'http://env.example:8080',
        bypass: '.env',
      } as const;
      await expectProxyEnv(server, sessionId, expectProxyEnvOptions4);
    });
  });
  it('falls back to authenticated environment proxy configuration through generated config', async () => {
    await withFakeUpstream(async () => {
      process.env.PLAYWRIGHT_MCP_PROXY_SERVER = 'http://env:p%40ssword@env.example:8080';
      process.env.PLAYWRIGHT_MCP_PROXY_BYPASS = '.env';
      const server = await startHttpBridge();
      const sessionId = await initializeRawHttpSession(server);
      const expectProxyEnvOptions5 = {
        server: null,
        bypass: null,
      } as const;
      await expectProxyEnv(server, sessionId, expectProxyEnvOptions5);
      const expectProxyConfigOptions2 = {
        server: 'http://env.example:8080',
        bypass: '.env',
        username: 'env',
        password: 'p@ssword',
      } as const;
      await expectProxyConfig(server, sessionId, expectProxyConfigOptions2);
    });
  });
  it('rejects invalid runtime proxy metadata before creating a session', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions21 = { sessionMax: 1 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions21);
      const argumentValue16 = server.url;
      const createInitializeRequestOptions9 = { proxyServer: ' ' } as const;
      const initializeRequestResult9 = createInitializeRequest(createInitializeRequestOptions9);
      const response = await postJsonRpc(argumentValue16, initializeRequestResult9);
      expect(response.status).toBe(HttpStatus.BadRequest);
      const result4: string | null = response.headers.get(MCP_SESSION_ID_HEADER);
      expect(result4).toBeNull();
      const argumentValue17 = server.url;
      const createInitializeRequestOptions10 = { headless: 'false' } as const;
      const initializeRequestResult10 = createInitializeRequest(createInitializeRequestOptions10);
      const headlessResponse = await postJsonRpc(argumentValue17, initializeRequestResult10);
      expect(headlessResponse.status).toBe(HttpStatus.BadRequest);
      const result5: string | null = headlessResponse.headers.get(MCP_SESSION_ID_HEADER);
      expect(result5).toBeNull();
      const argumentValue18 = server.url;
      const createInitializeRequestOptions11 = { humanPreset: 'fast' } as const;
      const initializeRequestResult11 = createInitializeRequest(createInitializeRequestOptions11);
      const humanPresetResponse = await postJsonRpc(argumentValue18, initializeRequestResult11);
      expect(humanPresetResponse.status).toBe(HttpStatus.BadRequest);
      const result6: string | null = humanPresetResponse.headers.get(MCP_SESSION_ID_HEADER);
      expect(result6).toBeNull();
      const ready = await fetchReady(server.url);
      const body = (await ready.json()) as {
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      const receiver35Actual = body.sessions;
      const toMatchObjectOptions23 = {
        active: 0,
        pending: 0,
        max: 1,
        available: 1,
      } as const;
      expect(receiver35Actual).toMatchObject(toMatchObjectOptions23);
    });
  });
  it('enforces the session limit during concurrent initialization', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions22 = { sessionMax: 2 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions22);
      const values10: [
        Promise<{
          client: Client;
          transport: StreamableHTTPClientTransport;
        }>,
        Promise<{
          client: Client;
          transport: StreamableHTTPClientTransport;
        }>,
        Promise<{
          client: Client;
          transport: StreamableHTTPClientTransport;
        }>,
      ] = [connectHttpClient(server), connectHttpClient(server), connectHttpClient(server)];
      const attempts = await Promise.allSettled(values10);
      const accepted = attempts.filter((attempt) => attempt.status === 'fulfilled');
      const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
      expect(accepted).toHaveLength(2);
      expect(rejected).toHaveLength(1);
      const stringResult = String((rejected[0] as PromiseRejectedResult).reason);
      expect(stringResult).toContain('HTTP session limit reached');
    });
  });
  it('releases session capacity when the client aborts initialization during display setup', async () => {
    await withFakeUpstream(async () => {
      let releaseDisplay: (() => void) | undefined;
      let markDisplayRequested: (() => void) | undefined;
      const displayRequested = new Promise<void>((resolve) => {
        markDisplayRequested = resolve;
      });
      const displayGate = new Promise<void>((resolve) => {
        releaseDisplay = resolve;
      });
      const startHttpBridgeOptions23:
        Partial<import('@/http/server.js').StartStreamableHttpBridgeOptions> | undefined = {
        ensureDockerDisplay: async () => {
          markDisplayRequested?.();
          await displayGate;
        },
        sessionMax: 1,
      };
      const server = await startHttpBridge(startHttpBridgeOptions23);
      const controller = new AbortController();
      const argumentValue19 = server.url;
      const createInitializeRequestOptions12 = { headless: false } as const;
      const initializeRequestResult12 = createInitializeRequest(createInitializeRequestOptions12);
      const serializedValue4 = JSON.stringify(initializeRequestResult12);
      const options2 = {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      } as const;
      const propertyValue11 = 'POST';
      const propertyValue12 = controller.signal;
      const fetchOptions2 = {
        body: serializedValue4,
        headers: options2,
        method: propertyValue11,
        signal: propertyValue12,
      } as const;
      const initialize = fetch(argumentValue19, fetchOptions2);
      await displayRequested;
      controller.abort();
      await expect(initialize).rejects.toThrow();
      releaseDisplay?.();
      const cleanupWaitOptions = { timeout: 5000 } as const;
      await vi.waitFor(async () => {
        const ready = await fetchReady(server.url);
        const body = (await ready.json()) as {
          sessions: {
            active: number;
            available: number;
            max: number;
            pending: number;
          };
        };
        expect(ready.status).toBe(HttpStatus.Ok);
        const receiver36Actual = body.sessions;
        const toEqualOptions3 = { active: 0, available: 1, max: 1, pending: 0 } as const;
        expect(receiver36Actual).toEqual(toEqualOptions3);
      }, cleanupWaitOptions);
      const initializeRawHttpSessionOptions25 = { headless: true } as const;
      const initializeRawHttpSessionResult5 = initializeRawHttpSession(
        server,
        initializeRawHttpSessionOptions25,
      );
      await expect(initializeRawHttpSessionResult5).resolves.not.toBe('');
    });
  });
  it('reports readiness based on active HTTP session capacity', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions24 = { sessionMax: 1 } as const;
      const server = await startHttpBridge(startHttpBridgeOptions24);
      const initial = await fetchReady(server.url);
      expect(initial.status).toBe(HttpStatus.Ok);
      await connectHttpClient(server);
      const full = await fetchReady(server.url);
      const body = (await full.json()) as {
        status: string;
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      expect(full.status).toBe(HttpStatus.ServiceUnavailable);
      const receiver37Actual = body;
      const toMatchObjectOptions24 = {
        status: 'not_ready',
        sessions: {
          active: 1,
          pending: 0,
          max: 1,
          available: 0,
        },
      } as const;
      expect(receiver37Actual).toMatchObject(toMatchObjectOptions24);
    });
  });
  it('enforces optional Bearer auth before handling MCP requests', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions25 = { authToken: 'secret' } as const;
      const server = await startHttpBridge(startHttpBridgeOptions25);
      const fetchOptions3 = { method: 'GET' } as const;
      const unauthorized = await fetch(server.url, fetchOptions3);
      expect(unauthorized.status).toBe(HttpStatus.Unauthorized);
      const result7: string | null = unauthorized.headers.get('www-authenticate');
      expect(result7).toBe('Bearer');
      const uRL = new URL(server.url);
      const streamableHTTPClientTransportOptions = {
        requestInit: {
          headers: { Authorization: 'Bearer secret' },
        },
      } as const;
      const transport = new StreamableHTTPClientTransport(uRL, streamableHTTPClientTransportOptions);
      const clientOptions = { name: 'http-auth-test-client', version: '1.0.0' } as const;
      const client = new Client(clientOptions);
      clients.push(client);
      await client.connect(transport);
      const argumentValue20 = (await client.listTools()).tools.length;
      expect(argumentValue20).toBeGreaterThan(0);
    });
  });
  it('serves MCP sessions over HTTPS when TLS files are configured', async () => {
    await withFakeUpstream(async () => {
      const startHttpBridgeOptions26 = {
        protocol: 'https',
        tls: tlsConfig,
      } as const;
      const server = await startHttpBridge(startHttpBridgeOptions26);
      expect(server.url).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/mcp$/u);
      const health = await fetchHealth(server.url, undefined, fetchWithTestTls);
      expect(health.status).toBe(HttpStatus.Ok);
      const { client } = await connectHttpClient(server, fetchWithTestTls);
      const tools = await client.listTools();
      const mappedValues7 = tools.tools.map((tool) => tool.name);
      expect(mappedValues7).toContain(LOCAL_TOOL_BRIDGE_INFO);
      const callToolOptions9 = {
        name: 'browser_navigate',
        arguments: { url: 'https://secure.example' },
      } as const;
      const result = await client.callTool(callToolOptions9);
      const receiver38Actual = result.structuredContent;
      const toMatchObjectOptions25 = {
        forwarded: true,
        name: 'browser_navigate',
      } as const;
      expect(receiver38Actual).toMatchObject(toMatchObjectOptions25);
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
    const acquireOptions: import('../../src/cdp/allocator.js').AcquireCdpPortOptions = {
      host: cdp.bindHost,
      bind: async (port) => {
        ports.push(port);
        return { close: async () => undefined };
      },
    };
    const lease = await allocator.acquire(acquireOptions);
    try {
      const runtime = await prepareBridgeRuntime(options.runtimeOptions);
      await options.beforeConnect?.(runtime);
      const createBridgeServerOptions: import('@/server.js').BridgeServerOptions | undefined = {
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
      };
      const bridge = await createBridgeServer(createBridgeServerOptions);
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
  const callSessionToolOptions8 = {} as const;
  return await callSessionTool(server, sessionId, LOCAL_TOOL_BRIDGE_INFO, callSessionToolOptions8);
}
async function callSessionTool(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  name: string,
  arguments_: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const argumentValue21 = server.url;
  const postJsonRpcOptions2 = {
    jsonrpc: JSON_RPC_VERSION,
    id: crypto.randomUUID(),
    method: 'tools/call',
    params: { name, arguments: arguments_ },
  } as const;
  const response = await postJsonRpc(argumentValue21, postJsonRpcOptions2, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: Record<string, unknown>;
    };
  };
  return body.result?.structuredContent ?? {};
}
async function startHttpBridge(
  overrides: Partial<Parameters<typeof startStreamableHttpBridge>[0]> = {},
): Promise<StreamableHttpBridgeServer> {
  const startStreamableHttpBridgeOptions = {
    ...defaultStreamableHttpOptions,
    port: 0,
    sessionIdleTtlMs: 60000,
    ...overrides,
  } as const;
  const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions);
  servers.push(server);
  return server;
}
async function connectHttpClient(
  server: StreamableHttpBridgeServer,
  fetchImpl: typeof fetch = fetch,
): Promise<{
  client: Client;
  transport: StreamableHTTPClientTransport;
}> {
  const uRL2 = new URL(server.url);
  const streamableHTTPClientTransportOptions2 = { fetch: fetchImpl } as const;
  const transport = new StreamableHTTPClientTransport(uRL2, streamableHTTPClientTransportOptions2);
  const clientOptions2 = { name: 'http-test-client', version: '1.0.0' } as const;
  const client = new Client(clientOptions2);
  clients.push(client);
  await client.connect(transport);
  return { client, transport };
}
async function initializeRawHttpSession(
  server: StreamableHttpBridgeServer,
  bridgeMeta?: Record<string, unknown>,
): Promise<string> {
  const argumentValue22 = server.url;
  const initializeRequestResult13 = createInitializeRequest(bridgeMeta);
  const response = await postJsonRpc(argumentValue22, initializeRequestResult13);
  expect(response.status).toBe(HttpStatus.Ok);
  const sessionId = response.headers.get(MCP_SESSION_ID_HEADER);
  expect(sessionId).toBeTruthy();
  const postJsonRpcOptions3 = {
    jsonrpc: JSON_RPC_VERSION,
    method: 'notifications/initialized',
  } as const;
  const computedValue3 = sessionId ?? undefined;
  await postJsonRpc(server.url, postJsonRpcOptions3, computedValue3);
  return sessionId ?? '';
}
async function expectProxyEnv(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    server: string | null;
    bypass: string | null;
  },
): Promise<void> {
  const argumentValue23 = server.url;
  const postJsonRpcOptions4 = {
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
  } as const;
  const response = await postJsonRpc(argumentValue23, postJsonRpcOptions4, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        proxyEnv?: {
          server: string | null;
          bypass: string | null;
        };
      };
    };
  };
  expect(body.result?.structuredContent?.proxyEnv).toEqual(expected);
}
async function expectProxyConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    server: string;
    bypass?: string;
    username?: string;
    password?: string;
  },
): Promise<void> {
  const argumentValue24 = server.url;
  const postJsonRpcOptions5 = {
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
  } as const;
  const response = await postJsonRpc(argumentValue24, postJsonRpcOptions5, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        proxyConfig?: unknown;
      };
    };
  };
  expect(body.result?.structuredContent?.proxyConfig).toEqual(expected);
}
async function expectHumanizeConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    enabled: boolean;
    initPageCount: number;
    preset?: string;
  },
): Promise<void> {
  const argumentValue25 = server.url;
  const postJsonRpcOptions6 = {
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
  } as const;
  const response = await postJsonRpc(argumentValue25, postJsonRpcOptions6, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        humanizeConfig?: unknown;
      };
    };
  };
  expect(body.result?.structuredContent?.humanizeConfig).toEqual(expected);
}
async function expectHeadlessConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    env: string;
    config: boolean;
  },
): Promise<void> {
  const argumentValue26 = server.url;
  const postJsonRpcOptions7 = {
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
  } as const;
  const response = await postJsonRpc(argumentValue26, postJsonRpcOptions7, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        headlessConfig?: unknown;
      };
    };
  };
  expect(body.result?.structuredContent?.headlessConfig).toEqual(expected);
}
async function expectExtensionConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    enabled: string;
    hasToken: boolean;
    profileDirName: string;
    userDataDir: string;
  },
): Promise<void> {
  const argumentValue27 = server.url;
  const postJsonRpcOptions8 = {
    jsonrpc: JSON_RPC_VERSION,
    id: crypto.randomUUID(),
    method: 'tools/call',
    params: {
      name: 'browser_navigate',
      arguments: {
        url: 'https://example.com',
        includeExtensionConfig: true,
      },
    },
  } as const;
  const response = await postJsonRpc(argumentValue27, postJsonRpcOptions8, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        extensionConfig?: unknown;
      };
    };
  };
  expect(body.result?.structuredContent?.extensionConfig).toEqual(expected);
}
async function expectBrowserConfig(
  server: StreamableHttpBridgeServer,
  sessionId: string,
  expected: {
    userDataDir: string;
    contextOptions: unknown;
    extensionDir: string;
  },
): Promise<void> {
  const argumentValue28 = server.url;
  const postJsonRpcOptions9 = {
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
  } as const;
  const response = await postJsonRpc(argumentValue28, postJsonRpcOptions9, sessionId);
  expect(response.status).toBe(HttpStatus.Ok);
  const body = (await readJsonRpcResponse(response)) as {
    result?: {
      structuredContent?: {
        browserConfig?: {
          isolated?: boolean;
          userDataDir?: string;
          contextOptions?: unknown;
          launchOptions?: {
            args?: string[];
          };
        };
      };
    };
  };
  const browserConfig = body.result?.structuredContent?.browserConfig;
  expect(browserConfig?.isolated).toBeUndefined();
  expect(browserConfig?.userDataDir).toBe(expected.userDataDir);
  expect(browserConfig?.contextOptions).toEqual(expected.contextOptions);
  const receiver39Actual = browserConfig?.launchOptions?.args;
  const values11 = [
    `--load-extension=${expected.extensionDir}`,
    `--disable-extensions-except=${expected.extensionDir}`,
  ];
  const arrayContainingResult = expect.arrayContaining(values11);
  expect(receiver39Actual).toEqual(arrayContainingResult);
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
  const fetchOptions4 = {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(sessionId === undefined ? {} : { [MCP_SESSION_ID_HEADER]: sessionId }),
    },
    body: JSON.stringify(body),
  } as const;
  return fetch(url, fetchOptions4);
}
async function readJsonRpcResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    return JSON.parse(text) as unknown;
  const data = text
    .split(/\r?\n/u)
    .find((line) => line.startsWith('data: '))
    ?.slice('data: '.length);
  if (data === undefined) {
    const message9 = `Expected SSE data in response: ${text}`;
    throw new Error(message9);
  }
  return JSON.parse(data) as unknown;
}
async function expectJsonRpcErrorMessage(response: Response, expected: string): Promise<void> {
  const body = (await readJsonRpcResponse(response)) as {
    error?: {
      message?: string;
    };
  };
  expect(body.error?.message).toContain(expected);
}
async function withFakeUpstream(
  fn: () => Promise<void>,
  options: {
    browserEngine?: 'cloak' | 'playwright';
  } = {},
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
    extensionMode: process.env.PLAYWRIGHT_MCP_EXTENSION,
    extensionToken: process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN,
    profileDirName: process.env.PLAYWRIGHT_MCP_PROFILE_DIR_NAME,
  };
  const uRL3 = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
  process.env.PLAYWRIGHT_MCP_CLI_PATH = fileURLToPath(uRL3);
  process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE = options.browserEngine ?? 'playwright';
  process.env.PLAYWRIGHT_MCP_OUTPUT_DIR = path.join(root, 'out');
  process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK = 'false';
  if (options.browserEngine === 'cloak') {
    const argumentValue29 = process.platform === 'win32' ? 'fake-chrome.exe' : 'fake-chrome';
    const fakeBinaryPath = path.join(root, argumentValue29);
    const writeFileSyncOptions2 = { mode: 0o755 } as const;
    writeFileSync(fakeBinaryPath, '', writeFileSyncOptions2);
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
    restoreEnv('PLAYWRIGHT_MCP_EXTENSION', previous.extensionMode);
    restoreEnv('PLAYWRIGHT_MCP_EXTENSION_TOKEN', previous.extensionToken);
    restoreEnv('PLAYWRIGHT_MCP_PROFILE_DIR_NAME', previous.profileDirName);
  }
}
function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === systemErrorCodes.ESRCH) return false;
    throw error;
  }
}
function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
async function delay(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
