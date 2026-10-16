import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { classifyCdpHttpRoute, createCdpHttpErrorResponse } from '@/cdp/httpProxy.js';
import { CDP_HTTP_MAX_ERROR_BODY_BYTES } from '@/cdp/limits.js';
const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';
describe('CDP HTTP proxy policy', () => {
  const values = [
    ['/json/version', 'GET', 'json'],
    ['/json/version/', 'GET', 'json'],
    ['/json', 'GET', 'json'],
    ['/json/list', 'GET', 'json'],
    ['/json/protocol', 'GET', 'json'],
    ['/json/new', 'PUT', 'json'],
    ['/json/activate/target-1', 'GET', 'text'],
    ['/json/close/target_2', 'GET', 'text'],
  ] as const;
  it.each(values)('classifies supported route %s', (path, allow, responseKind) => {
    const message2 = `/cdp/${capability}${path}`;
    const classifyCdpHttpRouteResult = classifyCdpHttpRoute(message2, capability);
    const receiverActual = classifyCdpHttpRouteResult;
    const toEqualOptions = {
      allow,
      kind: 'route',
      responseKind,
      upstreamPath: path,
    } as const;
    expect(receiverActual).toEqual(toEqualOptions);
  });
  it('preserves an optional new-target query and rejects queries elsewhere', () => {
    const message3 = `/cdp/${capability}/json/new?https%3A%2F%2Fexample.test%2Fpath%3Fa%3D1`;
    const classifyCdpHttpRouteResult2 = classifyCdpHttpRoute(message3, capability);
    const receiver2Actual = classifyCdpHttpRouteResult2;
    const toMatchObjectOptions = {
      kind: 'route',
      upstreamPath: '/json/new?https%3A%2F%2Fexample.test%2Fpath%3Fa%3D1',
    } as const;
    expect(receiver2Actual).toMatchObject(toMatchObjectOptions);
    const message4 = `/cdp/${capability}/json/version?extra=1`;
    const classifyCdpHttpRouteResult3 = classifyCdpHttpRoute(message4, capability);
    const receiver3Actual = classifyCdpHttpRouteResult3;
    const toEqualOptions2 = {
      kind: 'bad_request',
    } as const;
    expect(receiver3Actual).toEqual(toEqualOptions2);
    const message5 = `/cdp/${capability}/json/new?%E0%A4%A`;
    const classifyCdpHttpRouteResult4 = classifyCdpHttpRoute(message5, capability);
    const receiver4Actual = classifyCdpHttpRouteResult4;
    const toEqualOptions3 = {
      kind: 'bad_request',
    } as const;
    expect(receiver4Actual).toEqual(toEqualOptions3);
  });
  const values2: readonly string[] = [
    `/cdp/${capability}//json/version`,
    `/cdp/${capability}/%2e%2e/json/version`,
    `/cdp/${capability}/json%2Fversion`,
    `/cdp/${capability}/json/version/extra`,
    `/cdp/${capability}/cloakserve/status`,
  ];
  it.each(values2)('rejects alternate or unsupported route %s', (target) => {
    const classifyCdpHttpRouteResult5 = classifyCdpHttpRoute(target, capability);
    const receiver5Actual = classifyCdpHttpRouteResult5;
    const toEqualOptions4 = { kind: 'not_found' } as const;
    expect(receiver5Actual).toEqual(toEqualOptions4);
  });
  const values3: readonly string[] = [
    `/cdp/${capability}/json/activate/`,
    `/cdp/${capability}/json/activate/bad%2Ftarget`,
    `/cdp/${capability}/json/close/bad target`,
  ];
  it.each(values3)('rejects malformed target route %s', (target) => {
    const classifyCdpHttpRouteResult6 = classifyCdpHttpRoute(target, capability);
    const receiver6Actual = classifyCdpHttpRouteResult6;
    const toEqualOptions5 = { kind: 'bad_request' } as const;
    expect(receiver6Actual).toEqual(toEqualOptions5);
  });
  it('returns the same not-found classification for missing, malformed, and wrong capabilities', () => {
    const targets = [
      '/json/version',
      '/cdp//json/version',
      '/cdp/malformed/json/version',
      `/cdp/${'A'.repeat(43)}/json/version`,
      `/cdp/${capability}/unsupported`,
    ];
    const mappedValues = targets.map((target) => classifyCdpHttpRoute(target, capability));
    const receiver7Actual = mappedValues;
    const mappedValues2 = targets.map(() => ({ kind: 'not_found' }));
    expect(receiver7Actual).toEqual(mappedValues2);
  });
  it('rejects arbitrary non-capability-prefixed targets as not found', () => {
    const filteredValues = fc.string().filter((value) => !value.startsWith('/cdp/'));
    const propertyResult = fc.property(filteredValues, (target) => {
      const classifyCdpHttpRouteResult7 = classifyCdpHttpRoute(target, capability);
      const receiver8Actual = classifyCdpHttpRouteResult7;
      const toEqualOptions6 = { kind: 'not_found' } as const;
      expect(receiver8Actual).toEqual(toEqualOptions6);
    });
    fc.assert(propertyResult);
  });
  const values4 = [
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
  ] as const;
  it.each(values4)('builds exact %s error response', (kind, status, message) => {
    const createCdpHttpErrorResponseOptions = {
      ...(kind === 'method_not_allowed' ? { allow: 'GET' } : {}),
    } as const;
    const response = createCdpHttpErrorResponse(kind, createCdpHttpErrorResponseOptions);
    const stringifyOptions = { error: { code: kind, message } } as const;
    const serializedValue = JSON.stringify(stringifyOptions);
    const expectedBody = Buffer.from(serializedValue);
    const receiver9Actual = response;
    const toEqualOptions7 = {
      body: expectedBody,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Length': String(expectedBody.byteLength),
        'Content-Type': 'application/json; charset=utf-8',
        ...(kind === 'method_not_allowed' ? { Allow: 'GET' } : {}),
      },
      status,
    } as const;
    expect(receiver9Actual).toEqual(toEqualOptions7);
    expect(response.body.byteLength).toBeLessThanOrEqual(CDP_HTTP_MAX_ERROR_BODY_BYTES);
    expect(response.headers).not.toHaveProperty('Retry-After');
  });
  it('preserves only a valid upstream 4xx status in the redacted envelope', () => {
    for (const status of [400, 404, 418, 499]) {
      const createCdpHttpErrorResponseOptions2 = { upstreamStatus: status } as const;
      const response = createCdpHttpErrorResponse('upstream_error', createCdpHttpErrorResponseOptions2);
      expect(response.status).toBe(status);
      const toStringResult = response.body.toString();
      const receiver10Actual = toStringResult;
      const stringifyOptions2 = {
        error: { code: 'upstream_error', message: 'Chromium rejected the CDP request' },
      } as const;
      const serializedValue2 = JSON.stringify(stringifyOptions2);
      expect(receiver10Actual).toBe(serializedValue2);
    }
    expect(() => {
      const createCdpHttpErrorResponseOptions3 = { upstreamStatus: 500 } as const;
      return createCdpHttpErrorResponse('upstream_error', createCdpHttpErrorResponseOptions3);
    }).toThrow();
  });
  it('requires exactly one Allow value only for method errors', () => {
    expect(() => createCdpHttpErrorResponse('method_not_allowed')).toThrow();
    expect(() => {
      const createCdpHttpErrorResponseOptions4 = { allow: 'GET' } as const;
      return createCdpHttpErrorResponse('not_found', createCdpHttpErrorResponseOptions4);
    }).toThrow();
  });
});
