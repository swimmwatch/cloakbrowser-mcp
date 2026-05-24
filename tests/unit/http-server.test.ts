import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { isAuthorizedRequest } from '../../src/http/server.js';
import { HttpStatus, JsonRpcErrorCode } from '../../src/http/status.js';

describe('HTTP server helpers', () => {
  it('accepts requests when no auth token is configured', () => {
    expect(isAuthorizedRequest({ headers: {} } as IncomingMessage, undefined)).toBe(true);
  });

  it('requires an exact Bearer token when configured', () => {
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Bearer secret' } } as IncomingMessage, 'secret'),
    ).toBe(true);
    expect(
      isAuthorizedRequest({ headers: { authorization: 'Bearer wrong' } } as IncomingMessage, 'secret'),
    ).toBe(false);
    expect(isAuthorizedRequest({ headers: {} } as IncomingMessage, 'secret')).toBe(false);
  });

  it('exports named HTTP and JSON-RPC response codes used by server responses', () => {
    expect(HttpStatus.BadRequest).toBe(400);
    expect(HttpStatus.Unauthorized).toBe(401);
    expect(HttpStatus.NotFound).toBe(404);
    expect(JsonRpcErrorCode.SessionNotFound).toBe(-32001);
    expect(JsonRpcErrorCode.ParseError).toBe(-32700);
  });
});
