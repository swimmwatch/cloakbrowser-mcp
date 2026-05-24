import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { isAuthorizedRequest } from '../../src/http/server.js';

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
});
