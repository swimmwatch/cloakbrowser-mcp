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
