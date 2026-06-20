import type { IncomingMessage } from 'node:http';
import { createConnection } from 'node:net';
import { describe, expect, it } from 'vitest';
import { BRIDGE_TRANSPORT_STREAMABLE_HTTP, defaultStreamableHttpOptions } from '@/http/options.js';
import type { SessionStore } from '@/http/sessionStore.js';
import { isAuthorizedRequest, isEndpointRequest, startStreamableHttpBridge } from '@/http/server.js';
import { HttpStatus, JsonRpcErrorCode } from '@/http/status.js';
import type { BridgeLogger } from '@/logging/logger.js';
import { fetchHealth, fetchReady, healthUrl, readyUrl } from '../helpers/http.js';
import { tlsConfig, withDisabledTlsVerification } from '../helpers/tls.js';

describe('HTTP server helpers', () => {
  it('accepts requests when no auth token is configured', () => {
    expect(isAuthorizedRequest({ headers: {} } as IncomingMessage, undefined)).toBe(true);
  });

  it('parses Bearer authorization headers when auth is configured', () => {
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Bearer secret' } } as IncomingMessage, 'secret'),
    ).toBe(true);
    expect(
      isAuthorizedRequest({ headers: { authorization: 'bearer   secret' } } as IncomingMessage, 'secret'),
    ).toBe(true);
    expect(
      isAuthorizedRequest(
        { headers: { authorization: ['Bearer secret'] } } as unknown as IncomingMessage,
        'secret',
      ),
    ).toBe(true);
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Bearer wrong' } } as IncomingMessage, 'secret'),
    ).toBe(false);
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Bearer secret extra' } } as IncomingMessage, 'secret'),
    ).toBe(false);
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Basic secret' } } as IncomingMessage, 'secret'),
    ).toBe(false);
    expect(isAuthorizedRequest({ headers: {} } as IncomingMessage, 'secret')).toBe(false);
  });

  it('matches endpoint requests with an IPv6 fallback host', () => {
    expect(isEndpointRequest({ headers: {}, url: '/mcp' } as IncomingMessage, '/mcp', '::1')).toBe(true);
    expect(isEndpointRequest({ headers: {}, url: '/other' } as IncomingMessage, '/mcp', '::1')).toBe(false);
  });

  it('does not expose internal error details in JSON-RPC responses', async () => {
    const sensitive = 'sensitive stack detail';
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
      sessionStore: createThrowingSessionStore(sensitive),
    });

    try {
      const response = await fetch(server.url, { method: 'GET' });
      const body = (await response.json()) as {
        error: { message: string; data?: string };
      };

      expect(response.status).toBe(HttpStatus.InternalServerError);
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.data).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain(sensitive);
    } finally {
      await server.close();
    }
  });

  it('serves unauthenticated health and readiness probes when no auth token is configured', async () => {
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
      serverInfo: { version: '1.2.3' },
    });

    try {
      const health = await fetchHealth(server.url);
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      expect(healthBody).toMatchObject({
        status: 'ok',
        version: '1.2.3',
        transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      });
      expect(healthBody.uptimeMs).toEqual(expect.any(Number));

      const ready = await fetchReady(server.url);
      const readyBody = (await ready.json()) as {
        status: string;
        sessions: { active: number; pending: number; max: number; available: number };
      };
      expect(ready.status).toBe(HttpStatus.Ok);
      expect(readyBody).toMatchObject({
        status: 'ready',
        sessions: {
          active: 0,
          pending: 0,
          max: defaultStreamableHttpOptions.sessionMax,
          available: defaultStreamableHttpOptions.sessionMax,
        },
      });
    } finally {
      await server.close();
    }
  });

  it('serves HTTPS probes and reports an https endpoint URL', async () => {
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      protocol: 'https',
      tls: tlsConfig,
      port: 0,
      serverInfo: { version: '1.2.3' },
    });

    try {
      expect(server.url).toMatch(/^https:\/\/127\.0\.0\.1:\d+\/mcp$/u);
      await withDisabledTlsVerification(async () => {
        const health = await fetchHealth(server.url);
        const healthBody = (await health.json()) as Record<string, unknown>;
        expect(health.status).toBe(HttpStatus.Ok);
        expect(healthBody).toMatchObject({
          status: 'ok',
          version: '1.2.3',
          transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
        });
      });
    } finally {
      await server.close();
    }
  });

  it('serves probe JSON with default version metadata and rejects non-GET probe methods', async () => {
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
    });

    try {
      const healthProbeUrl = healthUrl(server.url);
      healthProbeUrl.search = 'probe=1';
      const health = await fetch(healthProbeUrl);
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      expect(healthBody).toMatchObject({
        status: 'ok',
        version: 'unknown',
        transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      });

      for (const url of [healthUrl(server.url), readyUrl(server.url)]) {
        const methodNotAllowed = await fetch(url, { method: 'POST' });
        const methodNotAllowedBody = (await methodNotAllowed.json()) as Record<string, unknown>;
        expect(methodNotAllowed.status).toBe(HttpStatus.MethodNotAllowed);
        expect(methodNotAllowed.headers.get('allow')).toBe('GET');
        expect(methodNotAllowedBody).toEqual({ status: 'method_not_allowed' });
      }
    } finally {
      await server.close();
    }
  });

  it('protects probes with the configured Bearer token', async () => {
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
      authToken: 'secret',
    });

    try {
      const unauthorized = await fetchHealth(server.url);
      const unauthorizedBody = (await unauthorized.json()) as Record<string, unknown>;
      expect(unauthorized.status).toBe(HttpStatus.Unauthorized);
      expect(unauthorized.headers.get('www-authenticate')).toBe('Bearer');
      expect(unauthorizedBody).toEqual({ status: 'unauthorized' });

      const authorized = await fetchReady(server.url, {
        headers: { Authorization: 'Bearer secret' },
      });
      expect(authorized.status).toBe(HttpStatus.Ok);
    } finally {
      await server.close();
    }
  });

  it('logs a safe path when Host cannot be parsed as a URL base', async () => {
    const requestLogs: Array<Record<string, unknown>> = [];
    const logger = {
      info(fields: Record<string, unknown>, message: string) {
        requestLogs.push({ ...fields, message });
      },
    } as BridgeLogger;
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
      logger,
    });

    try {
      const response = await rawHttpRequest(
        server.address.port,
        'GET /healthz?token=secret HTTP/1.1\r\nHost: bad host\r\nConnection: close\r\n\r\n',
      );

      expect(response).toContain('HTTP/1.1 500');
      expect(requestLogs).toContainEqual(
        expect.objectContaining({
          duration_ms: expect.any(Number),
          message: 'http request',
          method: 'GET',
          path: '/healthz',
          status: HttpStatus.InternalServerError,
        }),
      );
    } finally {
      await server.close();
    }
  });

  it('exports named HTTP and JSON-RPC response codes used by server responses', () => {
    expect(HttpStatus.BadRequest).toBe(400);
    expect(HttpStatus.Unauthorized).toBe(401);
    expect(HttpStatus.NotFound).toBe(404);
    expect(JsonRpcErrorCode.SessionNotFound).toBe(-32001);
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
  });
});

async function rawHttpRequest(port: number, request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let response = '';
    socket.setEncoding('utf8');
    socket.setTimeout(5_000);
    socket.on('connect', () => socket.end(request));
    socket.on('data', (chunk) => {
      response += String(chunk);
    });
    socket.on('end', () => resolve(response));
    socket.on('timeout', () => {
      socket.destroy(new Error('Timed out waiting for raw HTTP response'));
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
