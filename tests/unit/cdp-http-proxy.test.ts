import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { classifyCdpHttpRoute, createCdpHttpErrorResponse } from '@/cdp/httpProxy.js';
import { CDP_HTTP_MAX_ERROR_BODY_BYTES } from '@/cdp/limits.js';

const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';

describe('CDP HTTP proxy policy', () => {
  it.each([
    ['/json/version', 'GET', 'json'],
    ['/json/version/', 'GET', 'json'],
    ['/json', 'GET', 'json'],
    ['/json/list', 'GET', 'json'],
    ['/json/protocol', 'GET', 'json'],
    ['/json/new', 'PUT', 'json'],
    ['/json/activate/target-1', 'GET', 'text'],
    ['/json/close/target_2', 'GET', 'text'],
  ] as const)('classifies supported route %s', (path, allow, responseKind) => {
    expect(classifyCdpHttpRoute(`/cdp/${capability}${path}`, capability)).toEqual({
      allow,
      kind: 'route',
      responseKind,
      upstreamPath: path,
    });
  });

  it('preserves an optional new-target query and rejects queries elsewhere', () => {
    expect(
      classifyCdpHttpRoute(
        `/cdp/${capability}/json/new?https%3A%2F%2Fexample.test%2Fpath%3Fa%3D1`,
        capability,
      ),
    ).toMatchObject({
      kind: 'route',
      upstreamPath: '/json/new?https%3A%2F%2Fexample.test%2Fpath%3Fa%3D1',
    });
    expect(classifyCdpHttpRoute(`/cdp/${capability}/json/version?extra=1`, capability)).toEqual({
      kind: 'bad_request',
    });
    expect(classifyCdpHttpRoute(`/cdp/${capability}/json/new?%E0%A4%A`, capability)).toEqual({
      kind: 'bad_request',
    });
  });

  it.each([
    `/cdp/${capability}//json/version`,
    `/cdp/${capability}/%2e%2e/json/version`,
    `/cdp/${capability}/json%2Fversion`,
    `/cdp/${capability}/json/version/extra`,
    `/cdp/${capability}/cloakserve/status`,
  ])('rejects alternate or unsupported route %s', (target) => {
    expect(classifyCdpHttpRoute(target, capability)).toEqual({ kind: 'not_found' });
  });

  it.each([
    `/cdp/${capability}/json/activate/`,
    `/cdp/${capability}/json/activate/bad%2Ftarget`,
    `/cdp/${capability}/json/close/bad target`,
  ])('rejects malformed target route %s', (target) => {
    expect(classifyCdpHttpRoute(target, capability)).toEqual({ kind: 'bad_request' });
  });

  it('returns the same not-found classification for missing, malformed, and wrong capabilities', () => {
    const targets = [
      '/json/version',
      '/cdp//json/version',
      '/cdp/malformed/json/version',
      `/cdp/${'A'.repeat(43)}/json/version`,
      `/cdp/${capability}/unsupported`,
    ];
    expect(targets.map((target) => classifyCdpHttpRoute(target, capability))).toEqual(
      targets.map(() => ({ kind: 'not_found' })),
    );
  });

  it('rejects arbitrary non-capability-prefixed targets as not found', () => {
    fc.assert(
      fc.property(
        fc.string().filter((value) => !value.startsWith('/cdp/')),
        (target) => {
          expect(classifyCdpHttpRoute(target, capability)).toEqual({ kind: 'not_found' });
        },
      ),
    );
  });

  it.each([
    ['not_found', 404, 'CDP endpoint not found'],
    ['method_not_allowed', 405, 'CDP method not allowed'],
    ['bad_request', 400, 'Invalid CDP request'],
    ['request_timeout', 408, 'CDP request timed out'],
    ['payload_too_large', 413, 'CDP request body is not allowed'],
    ['headers_too_large', 431, 'CDP request headers are too large'],
    ['forbidden', 403, 'CDP request forbidden'],
    ['unavailable', 503, 'CDP endpoint unavailable'],
    ['bad_gateway', 502, 'Invalid response from Chromium'],
    ['gateway_timeout', 504, 'Chromium response timed out'],
    ['internal_error', 500, 'Internal CDP proxy error'],
  ] as const)('builds exact %s error response', (kind, status, message) => {
    const response = createCdpHttpErrorResponse(kind, {
      ...(kind === 'method_not_allowed' ? { allow: 'GET' } : {}),
    });
    const expectedBody = Buffer.from(JSON.stringify({ error: { code: kind, message } }));

    expect(response).toEqual({
      body: expectedBody,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Length': String(expectedBody.byteLength),
        'Content-Type': 'application/json; charset=utf-8',
        ...(kind === 'method_not_allowed' ? { Allow: 'GET' } : {}),
      },
      status,
    });
    expect(response.body.byteLength).toBeLessThanOrEqual(CDP_HTTP_MAX_ERROR_BODY_BYTES);
    expect(response.headers).not.toHaveProperty('Retry-After');
  });

  it('preserves only a valid upstream 4xx status in the redacted envelope', () => {
    for (const status of [400, 404, 418, 499]) {
      const response = createCdpHttpErrorResponse('upstream_error', { upstreamStatus: status });
      expect(response.status).toBe(status);
      expect(response.body.toString()).toBe(
        JSON.stringify({
          error: { code: 'upstream_error', message: 'Chromium rejected the CDP request' },
        }),
      );
    }
    expect(() => createCdpHttpErrorResponse('upstream_error', { upstreamStatus: 500 })).toThrow();
  });

  it('requires exactly one Allow value only for method errors', () => {
    expect(() => createCdpHttpErrorResponse('method_not_allowed')).toThrow();
    expect(() => createCdpHttpErrorResponse('not_found', { allow: 'GET' })).toThrow();
  });
});
