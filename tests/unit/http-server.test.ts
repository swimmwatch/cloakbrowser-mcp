import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { defaultStreamableHttpOptions } from '../../src/http/options.js';
import type { SessionStore } from '../../src/http/sessionStore.js';
import { isAuthorizedRequest, isEndpointRequest, startStreamableHttpBridge } from '../../src/http/server.js';
import { HttpStatus, JsonRpcErrorCode } from '../../src/http/status.js';

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
      const health = await fetch(new URL('/healthz', server.url));
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      expect(healthBody).toMatchObject({
        status: 'ok',
        version: '1.2.3',
        transport: 'streamable-http',
      });
      expect(healthBody.uptimeMs).toEqual(expect.any(Number));

      const ready = await fetch(new URL('/readyz', server.url));
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

  it('serves probe JSON with default version metadata and rejects non-GET probe methods', async () => {
    const server = await startStreamableHttpBridge({
      ...defaultStreamableHttpOptions,
      port: 0,
    });

    try {
      const health = await fetch(new URL('/healthz?probe=1', server.url));
      const healthBody = (await health.json()) as Record<string, unknown>;
      expect(health.status).toBe(HttpStatus.Ok);
      expect(healthBody).toMatchObject({
        status: 'ok',
        version: 'unknown',
        transport: 'streamable-http',
      });

      for (const path of ['/healthz', '/readyz']) {
        const methodNotAllowed = await fetch(new URL(path, server.url), { method: 'POST' });
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
      const unauthorized = await fetch(new URL('/healthz', server.url));
      const unauthorizedBody = (await unauthorized.json()) as Record<string, unknown>;
      expect(unauthorized.status).toBe(HttpStatus.Unauthorized);
      expect(unauthorized.headers.get('www-authenticate')).toBe('Bearer');
      expect(unauthorizedBody).toEqual({ status: 'unauthorized' });

      const authorized = await fetch(new URL('/readyz', server.url), {
        headers: { Authorization: 'Bearer secret' },
      });
      expect(authorized.status).toBe(HttpStatus.Ok);
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
