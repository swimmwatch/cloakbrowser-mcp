import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { createServer, type IncomingMessage } from 'node:http';
import { createConnection } from 'node:net';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP, defaultStreamableHttpOptions } from '@/http/options.js';
import { closeHttpServer, listenHttpServer } from '@/http/nodeServer.js';
import type { SessionStore } from '@/http/sessionStore.js';
import { isAuthorizedRequest, isEndpointRequest, startStreamableHttpBridge } from '@/http/server.js';
import { HttpStatus, JsonRpcErrorCode } from '@/http/status.js';
import type { BridgeLogger } from '@/logging/logger.js';
import { fetchHealth, fetchReady, healthUrl, readyUrl } from '@tests/helpers/http.js';
import { fetchWithTestTls, tlsConfig } from '@tests/helpers/tls.js';
describe('HTTP server helpers', () => {
  it('accepts requests when no auth token is configured', () => {
    const options = { headers: {} } as IncomingMessage;
    const isAuthorizedRequestResult = isAuthorizedRequest(options, undefined);
    expect(isAuthorizedRequestResult).toBe(true);
  });
  it('parses Bearer authorization headers when auth is configured', () => {
    const options2 = { headers: { authorization: 'Bearer secret' } } as IncomingMessage;
    const isAuthorizedRequestResult2 = isAuthorizedRequest(options2, 'secret');
    expect(isAuthorizedRequestResult2).toBe(true);
    const options3 = { headers: { authorization: 'bearer   secret' } } as IncomingMessage;
    const isAuthorizedRequestResult3 = isAuthorizedRequest(options3, 'secret');
    expect(isAuthorizedRequestResult3).toBe(true);
    const options4 = { headers: { authorization: ['Bearer secret'] } } as unknown as IncomingMessage;
    const isAuthorizedRequestResult4 = isAuthorizedRequest(options4, 'secret');
    expect(isAuthorizedRequestResult4).toBe(true);
    const options5 = { headers: { authorization: 'Bearer wrong' } } as IncomingMessage;
    const isAuthorizedRequestResult5 = isAuthorizedRequest(options5, 'secret');
    expect(isAuthorizedRequestResult5).toBe(false);
    const options6 = { headers: { authorization: 'Bearer secret extra' } } as IncomingMessage;
    const isAuthorizedRequestResult6 = isAuthorizedRequest(options6, 'secret');
    expect(isAuthorizedRequestResult6).toBe(false);
    const options7 = { headers: { authorization: 'Basic secret' } } as IncomingMessage;
    const isAuthorizedRequestResult7 = isAuthorizedRequest(options7, 'secret');
    expect(isAuthorizedRequestResult7).toBe(false);
    const options8 = { headers: {} } as IncomingMessage;
    const isAuthorizedRequestResult8 = isAuthorizedRequest(options8, 'secret');
    expect(isAuthorizedRequestResult8).toBe(false);
  });
  it('matches endpoint requests with an IPv6 fallback host', () => {
    const options9 = { headers: {}, url: '/mcp' } as IncomingMessage;
    const isEndpointRequestResult = isEndpointRequest(options9, '/mcp', '::1');
    expect(isEndpointRequestResult).toBe(true);
    const options10 = { headers: {}, url: '/other' } as IncomingMessage;
    const isEndpointRequestResult2 = isEndpointRequest(options10, '/mcp', '::1');
    expect(isEndpointRequestResult2).toBe(false);
  });
  it('does not expose internal error details in JSON-RPC responses', async () => {
    const sensitive = 'sensitive stack detail';
    const startStreamableHttpBridgeOptions = {
      ...defaultStreamableHttpOptions,
      port: 0,
      sessionStore: createThrowingSessionStore(sensitive),
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions);
    try {
      const fetchOptions = { method: 'GET' } as const;
      const response = await fetch(server.url, fetchOptions);
      const body = (await response.json()) as {
        error: {
          message: string;
          data?: string;
        };
      };
      expect(response.status).toBe(HttpStatus.InternalServerError);
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.data).toBeUndefined();
      const serializedValue = JSON.stringify(body);
      expect(serializedValue).not.toContain(sensitive);
    } finally {
      await server.close();
    }
  });
  it('serves unauthenticated health and readiness probes when no auth token is configured', async () => {
    const startStreamableHttpBridgeOptions2 = {
      ...defaultStreamableHttpOptions,
      port: 0,
      serverInfo: { version: '1.2.3' },
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions2);
    try {
      const health = await fetchHealth(server.url);
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      const receiverActual = healthBody;
      const toMatchObjectOptions = {
        status: 'ok',
        version: '1.2.3',
        transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      } as const;
      expect(receiverActual).toMatchObject(toMatchObjectOptions);
      const receiver2Actual = healthBody.uptimeMs;
      const anyResult = expect.any(Number);
      expect(receiver2Actual).toEqual(anyResult);
      const ready = await fetchReady(server.url);
      const readyBody = (await ready.json()) as {
        status: string;
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      expect(ready.status).toBe(HttpStatus.Ok);
      const receiver3Actual = readyBody;
      const toMatchObjectOptions2 = {
        status: 'ready',
        sessions: {
          active: 0,
          pending: 0,
          max: defaultStreamableHttpOptions.sessionMax,
          available: defaultStreamableHttpOptions.sessionMax,
        },
      } as const;
      expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    } finally {
      await server.close();
    }
  });
  it('serves HTTPS probes and reports an https endpoint URL', async () => {
    const startStreamableHttpBridgeOptions3 = {
      ...defaultStreamableHttpOptions,
      protocol: 'https',
      tls: tlsConfig,
      port: 0,
      serverInfo: { version: '1.2.3' },
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions3);
    try {
      expect(server.url).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/mcp$/u);
      const health = await fetchHealth(server.url, undefined, fetchWithTestTls);
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      const receiver4Actual = healthBody;
      const toMatchObjectOptions3 = {
        status: 'ok',
        version: '1.2.3',
        transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      } as const;
      expect(receiver4Actual).toMatchObject(toMatchObjectOptions3);
    } finally {
      await server.close();
    }
  });
  it('serves probe JSON with default version metadata and rejects non-GET probe methods', async () => {
    const startStreamableHttpBridgeOptions4 = {
      ...defaultStreamableHttpOptions,
      port: 0,
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions4);
    try {
      const healthProbeUrl = healthUrl(server.url);
      healthProbeUrl.search = 'probe=1';
      const health = await fetch(healthProbeUrl);
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      const receiver5Actual = healthBody;
      const toMatchObjectOptions4 = {
        status: 'ok',
        version: 'unknown',
        transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      } as const;
      expect(receiver5Actual).toMatchObject(toMatchObjectOptions4);
      for (const url of [healthUrl(server.url), readyUrl(server.url)]) {
        const fetchOptions2 = { method: 'POST' } as const;
        const methodNotAllowed = await fetch(url, fetchOptions2);
        const methodNotAllowedBody = (await methodNotAllowed.json()) as Record<string, unknown>;
        expect(methodNotAllowed.status).toBe(HttpStatus.MethodNotAllowed);
        const result: string | null = methodNotAllowed.headers.get('allow');
        expect(result).toBe('GET');
        const receiver6Actual = methodNotAllowedBody;
        const toEqualOptions = { status: 'method_not_allowed' } as const;
        expect(receiver6Actual).toEqual(toEqualOptions);
      }
    } finally {
      await server.close();
    }
  });
  it('protects probes with the configured Bearer token', async () => {
    const startStreamableHttpBridgeOptions5 = {
      ...defaultStreamableHttpOptions,
      port: 0,
      authToken: 'secret',
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions5);
    try {
      const unauthorized = await fetchHealth(server.url);
      const unauthorizedBody = (await unauthorized.json()) as Record<string, unknown>;
      expect(unauthorized.status).toBe(HttpStatus.Unauthorized);
      const result2: string | null = unauthorized.headers.get('www-authenticate');
      expect(result2).toBe('Bearer');
      const receiver7Actual = unauthorizedBody;
      const toEqualOptions2 = { status: 'unauthorized' } as const;
      expect(receiver7Actual).toEqual(toEqualOptions2);
      const fetchReadyOptions = {
        headers: { Authorization: 'Bearer secret' },
      } as const;
      const authorized = await fetchReady(server.url, fetchReadyOptions);
      expect(authorized.status).toBe(HttpStatus.Ok);
    } finally {
      await server.close();
    }
  });
  it('rejects malformed POST requests before session handling', async () => {
    const startStreamableHttpBridgeOptions6 = {
      ...defaultStreamableHttpOptions,
      port: 0,
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions6);
    try {
      const fetchOptions3 = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: '{}',
      } as const;
      const unsupported = await fetch(server.url, fetchOptions3);
      expect(unsupported.status).toBe(HttpStatus.UnsupportedMediaType);
      const fetchOptions4 = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      } as const;
      const invalidJson = await fetch(server.url, fetchOptions4);
      expect(invalidJson.status).toBe(HttpStatus.BadRequest);
      const argumentValue = server.url;
      const propertyValue = 'POST';
      const options11 = { 'Content-Type': 'application/json' } as const;
      const stringifyOptions = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      } as const;
      const serializedValue2 = JSON.stringify(stringifyOptions);
      const fetchOptions5 = {
        method: propertyValue,
        headers: options11,
        body: serializedValue2,
      } as const;
      const missingSession = await fetch(argumentValue, fetchOptions5);
      expect(missingSession.status).toBe(HttpStatus.BadRequest);
    } finally {
      await server.close();
    }
  });
  it('rejects invalid bridge initialize metadata before creating a session', async () => {
    const startStreamableHttpBridgeOptions7 = {
      ...defaultStreamableHttpOptions,
      port: 0,
      sessionMax: 1,
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions7);
    try {
      const argumentValue2 = server.url;
      const propertyValue2 = 'POST';
      const options12 = {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      } as const;
      const stringifyOptions2 = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'invalid-meta-unit-test-client',
            version: '1.0.0',
          },
          _meta: {
            'io.github.swimmwatch/cloakbrowser-mcp': {
              proxyBypass: '.internal',
            },
          },
        },
      } as const;
      const serializedValue3 = JSON.stringify(stringifyOptions2);
      const fetchOptions6 = {
        method: propertyValue2,
        headers: options12,
        body: serializedValue3,
      } as const;
      const invalidMeta = await fetch(argumentValue2, fetchOptions6);
      const ready = await fetchReady(server.url);
      const readyBody = (await ready.json()) as {
        sessions: {
          active: number;
          pending: number;
          max: number;
          available: number;
        };
      };
      expect(invalidMeta.status).toBe(HttpStatus.BadRequest);
      const receiver8Actual = readyBody.sessions;
      const toMatchObjectOptions5 = {
        active: 0,
        pending: 0,
        max: 1,
        available: 1,
      } as const;
      expect(receiver8Actual).toMatchObject(toMatchObjectOptions5);
    } finally {
      await server.close();
    }
  });
  it('validates a headed runtime before requesting the Docker display', async () => {
    let displayRequests = 0;
    const startStreamableHttpBridgeOptions8: import('@/http/server.js').StartStreamableHttpBridgeOptions = {
      ...defaultStreamableHttpOptions,
      ensureDockerDisplay: async () => {
        displayRequests += 1;
      },
      port: 0,
    };
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions8);
    try {
      const argumentValue3 = server.url;
      const propertyValue3 = 'POST';
      const options13 = {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      } as const;
      const stringifyOptions3 = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'invalid-headed-runtime-unit-test-client', version: '1.0.0' },
          _meta: {
            'io.github.swimmwatch/cloakbrowser-mcp': {
              headless: false,
              userDataDir: process.execPath,
            },
          },
        },
      } as const;
      const serializedValue4 = JSON.stringify(stringifyOptions3);
      const fetchOptions7 = {
        method: propertyValue3,
        headers: options13,
        body: serializedValue4,
      } as const;
      const response = await fetch(argumentValue3, fetchOptions7);
      expect(response.status).toBe(HttpStatus.InternalServerError);
      expect(displayRequests).toBe(0);
    } finally {
      await server.close();
    }
  });
  it('logs a safe path when Host cannot be parsed as a URL base', async () => {
    const requestLogs: Array<Record<string, unknown>> = [];
    const logger = {
      info(fields: Record<string, unknown>, message: string) {
        const pushOptions = { ...fields, message } as const;
        requestLogs.push(pushOptions);
      },
    } as BridgeLogger;
    const startStreamableHttpBridgeOptions9 = {
      ...defaultStreamableHttpOptions,
      port: 0,
      logger,
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions9);
    try {
      const response = await rawHttpRequest(
        server.address.port,
        'GET /healthz?token=secret HTTP/1.1\r\nHost: bad host\r\nConnection: close\r\n\r\n',
      );
      expect(response).toContain('HTTP/1.1 404');
      const receiver9Actual = requestLogs;
      const objectContainingOptions = {
        duration_ms: expect.any(Number),
        message: 'http request',
        method: 'GET',
        path: '/healthz',
        status: HttpStatus.NotFound,
      } as const;
      const objectContainingResult = expect.objectContaining(objectContainingOptions);
      expect(receiver9Actual).toContainEqual(objectContainingResult);
    } finally {
      await server.close();
    }
  });
  it('warns when Streamable HTTP binds outside loopback without auth or TLS', async () => {
    const warnings: Array<Record<string, unknown>> = [];
    const startStreamableHttpBridgeOptions10 = {
      ...defaultStreamableHttpOptions,
      host: '0.0.0.0',
      logger: createWarningCaptureLogger(warnings),
      port: 0,
    } as const;
    const server = await startStreamableHttpBridge(startStreamableHttpBridgeOptions10);
    try {
      const receiver10Actual = warnings;
      const objectContainingOptions2 = {
        endpoint: '/mcp',
        host: '0.0.0.0',
        message: 'streamable-http bound to non-loopback host without auth or TLS',
        protocol: 'http',
      } as const;
      const objectContainingResult2 = expect.objectContaining(objectContainingOptions2);
      expect(receiver10Actual).toContainEqual(objectContainingResult2);
    } finally {
      await server.close();
    }
  });
  it('does not warn for loopback, authenticated, or HTTPS Streamable HTTP binds', async () => {
    const warnings: Array<Record<string, unknown>> = [];
    const startStreamableHttpBridgeOptions11 = {
      ...defaultStreamableHttpOptions,
      logger: createWarningCaptureLogger(warnings),
      port: 0,
    } as const;
    const loopback = await startStreamableHttpBridge(startStreamableHttpBridgeOptions11);
    const startStreamableHttpBridgeOptions12 = {
      ...defaultStreamableHttpOptions,
      authToken: 'secret',
      host: '0.0.0.0',
      logger: createWarningCaptureLogger(warnings),
      port: 0,
    } as const;
    const authenticated = await startStreamableHttpBridge(startStreamableHttpBridgeOptions12);
    const startStreamableHttpBridgeOptions13 = {
      ...defaultStreamableHttpOptions,
      host: '0.0.0.0',
      logger: createWarningCaptureLogger(warnings),
      port: 0,
      protocol: 'https',
      tls: tlsConfig,
    } as const;
    const https = await startStreamableHttpBridge(startStreamableHttpBridgeOptions13);
    try {
      const receiver11Actual = warnings;
      const values: never[] = [];
      expect(receiver11Actual).toEqual(values);
    } finally {
      const values2: [Promise<void>, Promise<void>, Promise<void>] = [
        loopback.close(),
        authenticated.close(),
        https.close(),
      ];
      await Promise.allSettled(values2);
    }
  });
  it('exports named HTTP and JSON-RPC response codes used by server responses', () => {
    expect(HttpStatus.BadRequest).toBe(400);
    expect(HttpStatus.Unauthorized).toBe(401);
    expect(HttpStatus.NotFound).toBe(404);
    expect(JsonRpcErrorCode.SessionNotFound).toBe(-32001);
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
  });
  it('rejects listen failures and cleans up listeners', async () => {
    const blocker = createServer();
    const blocked = createServer();
    await listenHttpServer(blocker, 0, '127.0.0.1');
    const address = blocker.address();
    if (typeof address !== 'object' || address === null) throw new Error('Expected TCP server address');
    try {
      const listenHttpServerResult = listenHttpServer(blocked, address.port, '127.0.0.1');
      const receiver12Actual = listenHttpServerResult;
      const toMatchObjectOptions6 = {
        code: systemErrorCodes.EADDRINUSE,
      } as const;
      await expect(receiver12Actual).rejects.toMatchObject(toMatchObjectOptions6);
      const listenerCountResult = blocked.listenerCount('error');
      expect(listenerCountResult).toBe(0);
      expect(blocked.listening).toBe(false);
    } finally {
      const values3: [Promise<void>, Promise<void>] = [closeHttpServer(blocked), closeHttpServer(blocker)];
      await Promise.allSettled(values3);
    }
  });
});
async function rawHttpRequest(port: number, request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const createConnectionOptions = { host: '127.0.0.1', port } as const;
    const socket = createConnection(createConnectionOptions);
    let response = '';
    socket.setEncoding('utf8');
    socket.setTimeout(5000);
    socket.on('connect', () => socket.end(request));
    socket.on('data', (chunk) => {
      response += String(chunk);
    });
    socket.on('end', () => resolve(response));
    socket.on('timeout', () => {
      const error2 = new Error('Timed out waiting for raw HTTP response');
      socket.destroy(error2);
    });
    socket.on('error', reject);
  });
}
function createThrowingSessionStore(message: string): SessionStore {
  return {
    create: async () => {},
    get: async () => undefined,
    touch: async () => undefined,
    markClosed: async () => undefined,
    countActive: async () => 0,
    listExpired: async () => {
      throw new Error(message);
    },
    list: async () => [],
    clear: async () => {},
  };
}
function createWarningCaptureLogger(warnings: Array<Record<string, unknown>>): BridgeLogger {
  const noop = (): void => undefined;
  return {
    debug: noop,
    error: noop,
    fatal: noop,
    info: noop,
    trace: noop,
    warn(fields: Record<string, unknown>, message: string) {
      const pushOptions2 = { ...fields, message } as const;
      warnings.push(pushOptions2);
    },
  } as unknown as BridgeLogger;
}
