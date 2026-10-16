import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { request as httpRequest, type ServerResponse } from 'node:http';
import { createConnection, createServer as createNetServer, type Server as NetServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';
import {
  CDP_HTTP_MAX_CONCURRENT_REQUESTS,
  CDP_HTTP_MAX_REQUEST_HEADER_BYTES,
  CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES,
} from '@/cdp/limits.js';
import {
  type FakeChromiumCdpHandler,
  type FakeChromiumCdpServer,
  startFakeChromiumCdp,
} from '@tests/fixtures/fake-chromium-cdp.js';
const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';
const staleCapability = 'CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg';
interface HttpResult {
  body: Buffer;
  headers: Record<string, string | string[] | undefined>;
  status: number;
}
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
});
describe('CDP HTTP proxy integration', () => {
  it('redacts an interrupted upstream response and remains usable for the next request', async () => {
    let interrupt = true;
    const fake = await fakeChromium((_request, response) => {
      if (interrupt) {
        interrupt = false;
        response.writeHead(200);
        response.flushHeaders();
        response.write('{"private":"secret');
        setImmediate(() => response.destroy());
        return;
      }
      const body = { ok: true };
      writeJson(response, 200, body);
    });
    const proxy = await readyProxy(fake);
    const path = `/cdp/${capability}/json/version`;
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const failed = await requestProxy(proxy, path, headers);
    expect(failed.status).toBe(502);
    const code = errorCode(failed);
    expect(code).toBe('bad_gateway');
    const text = failed.body.toString();
    expect(text).not.toContain('secret');
    const recovered = await requestProxy(proxy, path, headers);
    expect(recovered.status).toBe(200);
    expect(fake.requests).toHaveLength(2);
  });
  it('continues forwarding and closes cleanly when diagnostic callbacks throw', async () => {
    const failure = new Error('Diagnostic sink failed');
    const onActivity = vi.fn(() => {
      throw failure;
    });
    const onSecurityRejections = vi.fn(() => {
      throw failure;
    });
    const fake = await fakeChromium((_request, response) => {
      const body = { ok: true };
      writeJson(response, 200, body);
    });
    const options = { onActivity, onSecurityRejections };
    const proxy = await readyProxy(fake, options);
    const validPath = `/cdp/${capability}/json/version`;
    const stalePath = `/cdp/${staleCapability}/json/version`;
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const denied = await requestProxy(proxy, stalePath, headers);
    expect(denied.status).toBe(404);
    const allowed = await requestProxy(proxy, validPath, headers);
    expect(allowed.status).toBe(200);
    expect(onActivity).toHaveBeenCalledOnce();
    await proxy.close();
    expect(onSecurityRejections).toHaveBeenCalledOnce();
  });
  const malformedAuthorities = [
    '[]:80',
    '[::1',
    '[::1]extra',
    '[::1]:bad',
    '::1:80',
    'localhost:',
    'localhost:bad',
  ];
  it.each(malformedAuthorities)(
    'rejects malformed Host authority %s before contacting Chromium',
    async (host) => {
      const fake = await fakeChromium((_request, response) => response.end());
      const proxy = await readyProxy(fake);
      const path = `/cdp/${capability}/json/version`;
      const headers = { Host: host };
      const result = await requestProxy(proxy, path, headers);
      const code = errorCode(result);
      expect(code).toBe('bad_request');
      expect(fake.requests).toHaveLength(0);
    },
  );
  it('rejects invalid generations without replacing the published endpoint', async () => {
    const fake = await fakeChromium((_request, response) => {
      const body = { ok: true };
      writeJson(response, 200, body);
    });
    const proxy = await readyProxy(fake);
    const valid = { capability, upstreamHost: fake.host, upstreamPort: fake.port };
    const invalid = [
      { ...valid, capability: 'invalid' },
      { ...valid, upstreamHost: 'example.test' },
      { ...valid, upstreamPort: 0 },
    ];
    for (const generation of invalid) {
      const stage = () => proxy.stageGeneration(generation);
      const publish = () => proxy.publishGeneration(generation);
      expect(stage).toThrow();
      expect(publish).toThrow();
    }
    const path = `/cdp/${capability}/json/version`;
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const result = await requestProxy(proxy, path, headers);
    expect(result.status).toBe(200);
    expect(fake.requests).toHaveLength(1);
  });
  it('aggregates capability, Host, and Origin rejections without protected request data', async () => {
    const reports: unknown[] = [];
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions = {} as const;
      return writeJson(response, 200, writeJsonOptions);
    });
    const readyProxyOptions: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      advertisedHost: 'cdp.example.test',
      onSecurityRejections: (summary) => reports.push(summary),
    };
    const proxy = await readyProxy(fake, readyProxyOptions);
    const authority = `cdp.example.test:${proxy.port}`;
    const message = `/cdp/${staleCapability}/json/version`;
    const requestProxyOptions = { Host: authority } as const;
    await requestProxy(proxy, message, requestProxyOptions);
    const message2 = `/cdp/${capability}/json/version`;
    const requestProxyOptions2 = {} as const;
    await requestProxy(proxy, message2, requestProxyOptions2, 'GET', undefined, false);
    const message3 = `/cdp/${capability}/json/version`;
    const requestProxyOptions3 = {
      Host: authority,
      Origin: `http://other.example:${proxy.port}`,
    } as const;
    await requestProxy(proxy, message3, requestProxyOptions3);
    await proxy.close();
    const receiverActual = reports;
    const values: {
      capability: number;
      host: number;
      origin: number;
      windowSeconds: number;
    }[] = [{ capability: 1, host: 1, origin: 1, windowSeconds: 60 }];
    expect(receiverActual).toEqual(values);
  });
  it('stays unavailable until publication, rewrites discovery, and rejects stale capability', async () => {
    const activity: unknown[] = [];
    const fake = await fakeChromium((request, response) => {
      const writeJsonOptions2 = {
        unrelated: `ws://${request.headers.host}/leave-unchanged`,
        webSocketDebuggerUrl: `ws://${request.headers.host}/devtools/browser/browser-id`,
      } as const;
      writeJson(response, 200, writeJsonOptions2);
    });
    const proxyForOptions: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      onActivity: (event) => activity.push(event),
    };
    const proxy = await proxyFor(fake, proxyForOptions);
    const authority = `cdp.example.test:${proxy.port}`;
    proxy.setUnavailableCapability(capability);
    const message4 = `/cdp/${capability}/json/version`;
    const requestProxyOptions4 = {
      Host: authority,
    } as const;
    const unavailable = await requestProxy(proxy, message4, requestProxyOptions4);
    const errorCodeResult = errorCode(unavailable);
    expect(errorCodeResult).toBe('unavailable');
    expect(fake.requests).toHaveLength(0);
    const generation = { capability, upstreamHost: fake.host, upstreamPort: fake.port };
    proxy.stageGeneration(generation);
    const message5 = `/cdp/${capability}/json/version`;
    const requestProxyOptions5 = { Host: authority } as const;
    const staged = await requestProxy(proxy, message5, requestProxyOptions5);
    const errorCodeResult2 = errorCode(staged);
    expect(errorCodeResult2).toBe('unavailable');
    expect(fake.requests).toHaveLength(0);
    proxy.publishGeneration(generation);
    const message6 = `/cdp/${capability}/json/version`;
    const requestProxyOptions6 = { Host: authority } as const;
    const ready = await requestProxy(proxy, message6, requestProxyOptions6);
    expect(ready.status).toBe(200);
    const toStringResult = ready.body.toString();
    const parsedValue = JSON.parse(toStringResult);
    const receiver2Actual = parsedValue;
    const toEqualOptions = {
      unrelated: `ws://127.0.0.1:${fake.port}/leave-unchanged`,
      webSocketDebuggerUrl: `wss://${authority}/cdp/${capability}/devtools/browser/browser-id`,
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions);
    expect(ready.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(ready.headers['cache-control']).toBe('no-store');
    const receiver3Actual = fake.requests[0];
    const toMatchObjectOptions = {
      headers: { host: `${fake.host}:${fake.port}` },
      method: 'GET',
      url: '/json/version',
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions);
    const receiver4Actual = activity;
    const values2: {
      activeRequests: number;
      kind: string;
    }[] = [{ activeRequests: 1, kind: 'http_request' }];
    expect(receiver4Actual).toEqual(values2);
    const publishGenerationOptions = {
      capability: staleCapability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions);
    const message7 = `/cdp/${capability}/json/version`;
    const requestProxyOptions7 = { Host: authority } as const;
    const stale = await requestProxy(proxy, message7, requestProxyOptions7);
    const message8 = `/cdp/${staleCapability}/unsupported`;
    const requestProxyOptions8 = {
      Host: authority,
    } as const;
    const unsupported = await requestProxy(proxy, message8, requestProxyOptions8);
    const receiver5Actual = stale;
    const toMatchObjectOptions2 = { body: unsupported.body, status: 404 } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions2);
    expect(fake.requests).toHaveLength(1);
  });
  it('rejects local policy failures before Chromium with exact typed errors', async () => {
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions3 = { ok: true } as const;
      return writeJson(response, 200, writeJsonOptions3);
    });
    const proxy = await readyProxy(fake);
    const authority = `127.0.0.1:${proxy.port}`;
    const validPath = `/cdp/${capability}/json/version`;
    const message9 = `/cdp/${staleCapability}/json/version`;
    const requestProxyOptions9 = { Host: authority } as const;
    const wrong = await requestProxy(proxy, message9, requestProxyOptions9);
    const message10 = `/cdp/${capability}/unsupported`;
    const requestProxyOptions10 = { Host: authority } as const;
    const unsupported = await requestProxy(proxy, message10, requestProxyOptions10);
    const receiver6Actual = wrong;
    const toMatchObjectOptions3 = {
      body: unsupported.body,
      headers: unsupported.headers,
      status: 404,
    } as const;
    expect(receiver6Actual).toMatchObject(toMatchObjectOptions3);
    const requestProxyOptions11 = { Host: authority } as const;
    const method = await requestProxy(proxy, validPath, requestProxyOptions11, 'POST');
    const errorCodeResult3 = errorCode(method);
    expect(errorCodeResult3).toBe('method_not_allowed');
    expect(method.headers.allow).toBe('GET');
    const requestProxyOptions12 = {} as const;
    const missingHost = await requestProxy(proxy, validPath, requestProxyOptions12, 'GET', undefined, false);
    const errorCodeResult4 = errorCode(missingHost);
    expect(errorCodeResult4).toBe('bad_request');
    const requestProxyOptions13 = { Host: 'user@example.test' } as const;
    const malformedHost = await requestProxy(proxy, validPath, requestProxyOptions13);
    const errorCodeResult5 = errorCode(malformedHost);
    expect(errorCodeResult5).toBe('bad_request');
    const requestProxyOptions14 = { Host: `localhost:${proxy.port}` } as const;
    const deniedHost = await requestProxy(proxy, validPath, requestProxyOptions14);
    const errorCodeResult6 = errorCode(deniedHost);
    expect(errorCodeResult6).toBe('forbidden');
    const requestProxyOptions15 = {
      Host: authority,
      Origin: 'not-an-origin',
    } as const;
    const malformedOrigin = await requestProxy(proxy, validPath, requestProxyOptions15);
    const errorCodeResult7 = errorCode(malformedOrigin);
    expect(errorCodeResult7).toBe('bad_request');
    const requestProxyOptions16 = {
      Host: authority,
      Origin: `https://example.test:${proxy.port}`,
    } as const;
    const deniedOrigin = await requestProxy(proxy, validPath, requestProxyOptions16);
    const errorCodeResult8 = errorCode(deniedOrigin);
    expect(errorCodeResult8).toBe('forbidden');
    const requestProxyOptions17 = { 'Content-Length': '1', Host: authority } as const;
    const fromResult = Buffer.from('x');
    const body = await requestProxy(proxy, validPath, requestProxyOptions17, 'GET', fromResult);
    const errorCodeResult9 = errorCode(body);
    expect(errorCodeResult9).toBe('payload_too_large');
    for (const result of [
      wrong,
      unsupported,
      method,
      missingHost,
      malformedHost,
      deniedHost,
      malformedOrigin,
      deniedOrigin,
      body,
    ]) {
      expect(result.headers['cache-control']).toBe('no-store');
      expect(result.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(result.headers).not.toHaveProperty('retry-after');
    }
    for (const result of [
      wrong,
      unsupported,
      missingHost,
      malformedHost,
      deniedHost,
      malformedOrigin,
      deniedOrigin,
      body,
    ]) {
      expect(result.headers).not.toHaveProperty('allow');
    }
    expect(fake.requests).toHaveLength(0);
  });
  it('rejects non-canonical numeric Host and Origin authorities before Chromium', async () => {
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions4 = { ok: true } as const;
      return writeJson(response, 200, writeJsonOptions4);
    });
    const proxy = await readyProxy(fake);
    const authority = `127.0.0.1:${proxy.port}`;
    const path = `/cdp/${capability}/json/version`;
    const requestProxyOptions18 = { Host: `127.1:${proxy.port}` } as const;
    const requestProxyResult = requestProxy(proxy, path, requestProxyOptions18);
    const requestProxyOptions19 = { Host: `0x7f000001:${proxy.port}` } as const;
    const requestProxyResult2 = requestProxy(proxy, path, requestProxyOptions19);
    const requestProxyOptions20 = {
      Host: authority,
      Origin: `http://0177.0.0.1:${proxy.port}`,
    } as const;
    const requestProxyResult3 = requestProxy(proxy, path, requestProxyOptions20);
    const values3: [Promise<HttpResult>, Promise<HttpResult>, Promise<HttpResult>] = [
      requestProxyResult,
      requestProxyResult2,
      requestProxyResult3,
    ];
    const results = await Promise.all(values3);
    for (const result of results) {
      const errorCodeResult10 = errorCode(result);
      expect(errorCodeResult10).toBe('bad_request');
    }
    expect(fake.requests).toHaveLength(0);
  });
  it('closes a rejected body-bearing request before proxy cleanup', async () => {
    const proxy = await standaloneProxy();
    proxy.setUnavailableCapability(capability);
    const createConnectionOptions = { host: '127.0.0.1', port: proxy.port } as const;
    const socket = createConnection(createConnectionOptions);
    let response = '';
    socket.on('data', (chunk: Buffer) => {
      response += chunk.toString();
    });
    const closed = new Promise<boolean>((resolve) => {
      socket.once('close', () => resolve(true));
    });
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    const computedValue =
      `PUT /cdp/${capability}/json/new HTTP/1.1\r\n` +
      `Host: 127.0.0.1:${proxy.port}\r\n` +
      'Content-Length: 100000000\r\n\r\n';
    socket.write(computedValue);
    await vi.waitFor(() => expect(response).toContain('HTTP/1.1 413'));
    const values4: [Promise<boolean>, Promise<boolean>] = [
      closed,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 250)),
    ];
    const closedByProxy = await Promise.race(values4);
    if (!closedByProxy) socket.destroy();
    const toLowerCaseResult = response.toLowerCase();
    expect(toLowerCaseResult).toContain('connection: close');
    expect(closedByProxy).toBe(true);
    const closeResult = proxy.close();
    await expect(closeResult).resolves.toBeUndefined();
  });
  it('normalizes and redacts upstream failures, size excess, and unexpected errors', async () => {
    let mode = 'client-error';
    const fake = await fakeChromium((_request, response) => {
      if (mode === 'client-error') {
        const writeHeadOptions = { 'X-Upstream-Secret': 'do-not-forward' } as const;
        response.writeHead(418, writeHeadOptions);
        response.end('protected upstream body');
      } else if (mode === 'redirect') {
        (() => {
          const writeHeadOptions2 = { Location: 'http://internal.invalid/' } as const;
          return response.writeHead(302, writeHeadOptions2);
        })();
        response.end();
      } else if (mode === 'server-error') {
        response.writeHead(503);
        response.end('internal state');
      } else if (mode === 'disconnect') {
        response.socket?.destroy();
      } else if (mode === 'oversized') {
        const prefix = Buffer.from('{"padding":"');
        const suffix = Buffer.from('"}');
        const currentPrefix = prefix;
        const computedValue2 =
          CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES + 1 - prefix.byteLength - suffix.byteLength;
        const allocResult = Buffer.alloc(computedValue2, 0x61);
        const currentSuffix = suffix;
        const values5: readonly Uint8Array<ArrayBufferLike>[] = [currentPrefix, allocResult, currentSuffix];
        const concatResult = Buffer.concat(values5);
        response.end(concatResult);
      }
    });
    const proxy = await readyProxy(fake);
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const path = `/cdp/${capability}/json/version`;
    const clientError = await requestProxy(proxy, path, headers);
    expect(clientError.status).toBe(418);
    const errorCodeResult11 = errorCode(clientError);
    expect(errorCodeResult11).toBe('upstream_error');
    const toStringResult2 = clientError.body.toString();
    expect(toStringResult2).not.toContain('protected');
    expect(clientError.headers).not.toHaveProperty('x-upstream-secret');
    mode = 'redirect';
    const requestProxyResult4 = await requestProxy(proxy, path, headers);
    const errorCodeResult12 = errorCode(requestProxyResult4);
    expect(errorCodeResult12).toBe('bad_gateway');
    mode = 'server-error';
    const requestProxyResult5 = await requestProxy(proxy, path, headers);
    const errorCodeResult13 = errorCode(requestProxyResult5);
    expect(errorCodeResult13).toBe('bad_gateway');
    mode = 'disconnect';
    const requestProxyResult6 = await requestProxy(proxy, path, headers);
    const errorCodeResult14 = errorCode(requestProxyResult6);
    expect(errorCodeResult14).toBe('bad_gateway');
    mode = 'oversized';
    const requestProxyResult7 = await requestProxy(proxy, path, headers);
    const errorCodeResult15 = errorCode(requestProxyResult7);
    expect(errorCodeResult15).toBe('bad_gateway');
    const standaloneProxyOptions: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined =
      {
        requestUpstream: async () => ({ body: Buffer.from('{}'), statusCode: Number.NaN }),
      };
    const invalidProxy = await standaloneProxy(standaloneProxyOptions);
    const publishGenerationOptions2 = { capability, upstreamHost: '127.0.0.1', upstreamPort: 9 } as const;
    publishGeneration(invalidProxy, publishGenerationOptions2);
    const requestProxyOptions21 = { Host: `127.0.0.1:${invalidProxy.port}` } as const;
    const requestProxyResult9 = await requestProxy(invalidProxy, path, requestProxyOptions21);
    const errorCodeResult17 = errorCode(requestProxyResult9);
    expect(errorCodeResult17).toBe('bad_gateway');
    const standaloneProxyOptions2:
      Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      requestUpstream: async () => {
        throw new Error('protected unexpected detail');
      },
    };
    const unexpectedProxy = await standaloneProxy(standaloneProxyOptions2);
    const publishGenerationOptions3 = {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: 9,
    } as const;
    publishGeneration(unexpectedProxy, publishGenerationOptions3);
    const requestProxyOptions22 = {
      Host: `127.0.0.1:${unexpectedProxy.port}`,
    } as const;
    const unexpected = await requestProxy(unexpectedProxy, path, requestProxyOptions22);
    const errorCodeResult18 = errorCode(unexpected);
    expect(errorCodeResult18).toBe('internal_error');
    const toStringResult3 = unexpected.body.toString();
    expect(toStringResult3).not.toContain('protected');
  });
  it('returns a gateway timeout when the upstream accepts a request without responding', async () => {
    const handler = vi.fn();
    const fake = await fakeChromium(handler);
    const options = { upstreamTimeoutMs: 1000 } as const;
    const proxy = await readyProxy(fake, options);
    const path = `/cdp/${capability}/json/version`;
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const response = await requestProxy(proxy, path, headers);
    expect(response.status).toBe(504);
    const code = errorCode(response);
    expect(code).toBe('gateway_timeout');
    expect(fake.requests).toHaveLength(1);
  });
  it('preserves allowed methods and new-target query while keeping upstream plaintext', async () => {
    const fake = await fakeChromium((request, response) => {
      if (request.url?.startsWith('/json/new')) {
        const writeJsonOptions5 = { id: 'new-target' } as const;
        writeJson(response, 200, writeJsonOptions5);
      } else response.end('Target activated');
    });
    const readyProxyOptions3 = {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
    } as const;
    const proxy = await readyProxy(fake, readyProxyOptions3);
    const headers = { Host: `cdp.example.test:${proxy.port}` };
    const message11 = `/cdp/${capability}/json/new?https%3A%2F%2Fexample.test%2F`;
    const created = await requestProxy(proxy, message11, headers, 'PUT');
    expect(created.status).toBe(200);
    const message12 = `/cdp/${capability}/json/activate/target-1`;
    const activated = await requestProxy(proxy, message12, headers);
    const receiver7Actual = activated;
    const toMatchObjectOptions4 = { body: Buffer.from('Target activated'), status: 200 } as const;
    expect(receiver7Actual).toMatchObject(toMatchObjectOptions4);
    const mappedValues2 = fake.requests.map((request) => [request.method, request.url]);
    const receiver8Actual = mappedValues2;
    const values6: string[][] = [
      ['PUT', '/json/new?https%3A%2F%2Fexample.test%2F'],
      ['GET', '/json/activate/target-1'],
    ];
    expect(receiver8Actual).toEqual(values6);
  });
  it('enforces sixteen concurrent requests and rejects the seventeenth locally', async () => {
    const pendingResponses: ServerResponse[] = [];
    const fake = await fakeChromium((_request, response) => pendingResponses.push(response));
    const proxy = await readyProxy(fake);
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const path = `/cdp/${capability}/json/version`;
    const fromOptions = { length: CDP_HTTP_MAX_CONCURRENT_REQUESTS } as const;
    const pending = Array.from(fromOptions, async () => await requestProxy(proxy, path, headers));
    await vi.waitFor(() => expect(fake.requests).toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS));
    const excess = await requestProxy(proxy, path, headers);
    const errorCodeResult19 = errorCode(excess);
    expect(errorCodeResult19).toBe('unavailable');
    expect(fake.requests).toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS);
    for (const response of pendingResponses) {
      const writeJsonOptions6 = { ok: true } as const;
      writeJson(response, 200, writeJsonOptions6);
    }
    const results2 = Promise.all(pending);
    await expect(results2).resolves.toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS);
  });
  it('accepts exactly 16 KiB of headers and rejects one extra byte', async () => {
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions7 = { ok: true } as const;
      return writeJson(response, 200, writeJsonOptions7);
    });
    const proxy = await readyProxy(fake);
    const authority = `127.0.0.1:${proxy.port}`;
    const path = `/cdp/${capability}/json/version`;
    const exact = await rawRequestWithHeaderBytes(
      proxy.port,
      path,
      authority,
      CDP_HTTP_MAX_REQUEST_HEADER_BYTES,
    );
    expect(exact.status).toBe(200);
    const computedValue3 = CDP_HTTP_MAX_REQUEST_HEADER_BYTES + 1;
    const excess = await rawRequestWithHeaderBytes(proxy.port, path, authority, computedValue3);
    const errorCodeResult20 = errorCode(excess);
    expect(errorCodeResult20).toBe('headers_too_large');
    expect(fake.requests).toHaveLength(1);
  });
  it('returns a typed request timeout for incomplete headers', async () => {
    const standaloneProxyOptions3 = { headerTimeoutMs: 25 } as const;
    const proxy = await standaloneProxy(standaloneProxyOptions3);
    const response = await rawIncompleteRequest(proxy.port);
    const errorCodeResult21 = errorCode(response);
    expect(errorCodeResult21).toBe('request_timeout');
  });
  it('checks browser identity before forwarding without treating forwarding errors as browser loss', async () => {
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions8 = { ok: true } as const;
      return writeJson(response, 200, writeJsonOptions8);
    });
    const beforeForward = vi.fn(async () => false);
    const onActivity = vi.fn();
    const onBrowserLoss = vi.fn();
    const readyProxyOptions4 = { beforeForward, onActivity, onBrowserLoss } as const;
    const rejectedProxy = await readyProxy(fake, readyProxyOptions4);
    const headers = { Host: `127.0.0.1:${rejectedProxy.port}` };
    const message13 = `/cdp/${capability}/json/version`;
    const rejected = await requestProxy(rejectedProxy, message13, headers);
    const errorCodeResult22 = errorCode(rejected);
    expect(errorCodeResult22).toBe('unavailable');
    expect(beforeForward).toHaveBeenCalledTimes(1);
    expect(onActivity).not.toHaveBeenCalled();
    expect(fake.requests).toHaveLength(0);
    const standaloneProxyOptions4:
      Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      beforeForward: async () => true,
      onBrowserLoss,
      requestUpstream: async () => {
        throw new Error('browser disconnected');
      },
    };
    const failingProxy = await standaloneProxy(standaloneProxyOptions4);
    const publishGenerationOptions4 = {
      capability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    } as const;
    publishGeneration(failingProxy, publishGenerationOptions4);
    const message14 = `/cdp/${capability}/json/version`;
    const requestProxyOptions23 = {
      Host: `127.0.0.1:${failingProxy.port}`,
    } as const;
    const failed = await requestProxy(failingProxy, message14, requestProxyOptions23);
    const errorCodeResult23 = errorCode(failed);
    expect(errorCodeResult23).toBe('internal_error');
    expect(onBrowserLoss).not.toHaveBeenCalled();
  });
  it('keeps the published generation after a transient forwarding error', async () => {
    const receiver9 = vi.fn();
    const error2 = new Error('transient discovery failure');
    const receiver10 = receiver9.mockRejectedValueOnce(error2);
    const mockResolvedValueOnceOptions = {
      body: Buffer.from('{"Browser":"Chromium"}'),
      statusCode: 200,
    } as const;
    const requestUpstream = receiver10.mockResolvedValueOnce(mockResolvedValueOnceOptions);
    const onBrowserLoss = vi.fn();
    const standaloneProxyOptions5:
      Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      beforeForward: async () => true,
      onBrowserLoss,
      requestUpstream,
    };
    const proxy = await standaloneProxy(standaloneProxyOptions5);
    const publishGenerationOptions5 = { capability, upstreamHost: '127.0.0.1', upstreamPort: 9 } as const;
    publishGeneration(proxy, publishGenerationOptions5);
    const path = `/cdp/${capability}/json/version`;
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const requestProxyResult10 = await requestProxy(proxy, path, headers);
    const errorCodeResult24 = errorCode(requestProxyResult10);
    expect(errorCodeResult24).toBe('internal_error');
    const recovered = await requestProxy(proxy, path, headers);
    expect(recovered.status).toBe(200);
    const toStringResult4 = recovered.body.toString();
    const parsedValue2 = JSON.parse(toStringResult4);
    const receiver11Actual = parsedValue2;
    const toEqualOptions2 = { Browser: 'Chromium' } as const;
    expect(receiver11Actual).toEqual(toEqualOptions2);
    expect(requestUpstream).toHaveBeenCalledTimes(2);
    expect(onBrowserLoss).not.toHaveBeenCalled();
  });
  it('bounds the identity probe by the HTTP upstream deadline', async () => {
    const fake = await fakeChromium((_request, response) => {
      const writeJsonOptions9 = { ok: true } as const;
      return writeJson(response, 200, writeJsonOptions9);
    });
    const readyProxyOptions5: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      beforeForward: async (signal) =>
        await new Promise<boolean>((resolve) => {
          if (signal.aborted) resolve(false);
          else {
            const addEventListenerOptions = { once: true } as const;
            signal.addEventListener('abort', () => resolve(false), addEventListenerOptions);
          }
        }),
      upstreamTimeoutMs: 25,
    };
    const proxy = await readyProxy(fake, readyProxyOptions5);
    const startedAt = Date.now();
    const message15 = `/cdp/${capability}/json/version`;
    const requestProxyOptions24 = {
      Host: `127.0.0.1:${proxy.port}`,
    } as const;
    const response = await requestProxy(proxy, message15, requestProxyOptions24);
    const errorCodeResult25 = errorCode(response);
    expect(errorCodeResult25).toBe('gateway_timeout');
    const computedValue4 = Date.now() - startedAt;
    expect(computedValue4).toBeLessThan(500);
    expect(fake.requests).toHaveLength(0);
  });
  it('surfaces an actual external collision without scanning another port', async () => {
    const occupied = await listenNetServer();
    cleanup.push(async () => await closeNetServer(occupied.server));
    const cdpPortAllocatorOptions = { start: occupied.port, end: occupied.port + 1 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions);
    const startCdpHttpProxyOptions = {
      advertisedScheme: 'http',
      allocator,
      bindHost: '127.0.0.1',
    } as const;
    const startCdpHttpProxyResult = startCdpHttpProxy(startCdpHttpProxyOptions);
    const receiver12Actual = startCdpHttpProxyResult;
    const toMatchObjectOptions5 = { code: systemErrorCodes.EADDRINUSE, port: occupied.port } as const;
    await expect(receiver12Actual).rejects.toMatchObject(toMatchObjectOptions5);
  });
});
async function fakeChromium(handler: FakeChromiumCdpHandler): Promise<FakeChromiumCdpServer> {
  const fake = await startFakeChromiumCdp(handler);
  cleanup.push(async () => await fake.close());
  return fake;
}
async function readyProxy(
  fake: FakeChromiumCdpServer,
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  const proxy = await proxyFor(fake, options);
  const publishGenerationOptions6 = { capability, upstreamHost: fake.host, upstreamPort: fake.port } as const;
  publishGeneration(proxy, publishGenerationOptions6);
  return proxy;
}
function publishGeneration(
  proxy: CdpHttpProxy,
  options: {
    capability: string;
    upstreamHost: string;
    upstreamPort: number;
  },
): void {
  proxy.stageGeneration(options);
  proxy.publishGeneration(options);
}
async function proxyFor(
  _fake: FakeChromiumCdpServer,
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  return await standaloneProxy(options);
}
async function standaloneProxy(
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  const port = await findFreePort();
  const propertyValue = 'http';
  const cdpPortAllocatorOptions2 = { start: port, end: port } as const;
  const cdpPortAllocator = new CdpPortAllocator(cdpPortAllocatorOptions2);
  const propertyValue2 = '127.0.0.1';
  const options2 = { ...options };
  const startCdpHttpProxyOptions2 = {
    advertisedScheme: propertyValue,
    allocator: cdpPortAllocator,
    bindHost: propertyValue2,
    ...options2,
  } as const;
  const proxy = await startCdpHttpProxy(startCdpHttpProxyOptions2);
  cleanup.push(async () => await proxy.close());
  return proxy;
}
async function requestProxy(
  proxy: CdpHttpProxy,
  path: string,
  headers: Record<string, string>,
  method = 'GET',
  body?: Buffer,
  setHost = true,
): Promise<HttpResult> {
  return await new Promise<HttpResult>((resolve, reject) => {
    const httpRequestOptions = {
      agent: false,
      headers,
      host: '127.0.0.1',
      method,
      path,
      port: proxy.port,
      setHost,
    } as const;
    const request = httpRequest(httpRequestOptions, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const resolveOptions = {
          body: Buffer.concat(chunks),
          headers: response.headers,
          status: response.statusCode ?? 0,
        } as const;
        return resolve(resolveOptions);
      });
    });
    request.once('error', reject);
    request.end(body);
  });
}
function errorCode(result: HttpResult): string {
  const toStringResult5 = result.body.toString();
  return (
    JSON.parse(toStringResult5) as {
      error: {
        code: string;
      };
    }
  ).error.code;
}
function writeJson(response: ServerResponse, status: number, value: unknown): void {
  const serializedValue = JSON.stringify(value);
  const body = Buffer.from(serializedValue);
  const writeHeadOptions3 = {
    'Content-Length': String(body.byteLength),
    'Content-Type': 'application/json',
    'X-Upstream-Internal': 'discard-me',
  } as const;
  response.writeHead(status, writeHeadOptions3);
  response.end(body);
}
async function findFreePort(): Promise<number> {
  const { port, server } = await listenNetServer();
  await closeNetServer(server);
  return port;
}
async function listenNetServer(): Promise<{
  port: number;
  server: NetServer;
}> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('TCP server has no port');
  return { port: address.port, server };
}
async function closeNetServer(server: NetServer): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}
async function rawRequestWithHeaderBytes(
  port: number,
  path: string,
  authority: string,
  headerBytes: number,
): Promise<HttpResult> {
  const message16 = `Host: ${authority}\r\nConnection: close\r\nX-Pad: \r\n`;
  const fixedBytes = Buffer.byteLength(message16) + 2;
  const computedValue5 = headerBytes - fixedBytes;
  const padding = 'a'.repeat(computedValue5);
  const message17 = `GET ${path} HTTP/1.1\r\nHost: ${authority}\r\nConnection: close\r\nX-Pad: ${padding}\r\n\r\n`;
  return await rawRequest(port, message17);
}
async function rawIncompleteRequest(port: number): Promise<HttpResult> {
  return await rawRequest(port, 'GET /incomplete HTTP/1.1\r\nHost:');
}
async function rawRequest(port: number, request: string): Promise<HttpResult> {
  return await new Promise<HttpResult>((resolve, reject) => {
    const createConnectionOptions2 = { host: '127.0.0.1', port } as const;
    const socket = createConnection(createConnectionOptions2);
    const chunks: Buffer[] = [];
    socket.once('error', reject);
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const separator = raw.indexOf('\r\n\r\n');
      const head = raw.slice(0, separator);
      const computedValue6 = separator + 4;
      const sliceResult = raw.slice(computedValue6);
      const body = Buffer.from(sliceResult);
      const lines = head.split('\r\n');
      const computedValue7 = lines[0]?.split(' ')[1] ?? 0;
      const status = Number(computedValue7);
      const headers: Record<string, string> = {};
      for (const line of lines.slice(1)) {
        const index = line.indexOf(':');
        if (index !== -1)
          (() => {
            const computedValue8 = index + 1;
            return (headers[line.slice(0, index).toLowerCase()] = line.slice(computedValue8).trim());
          })();
      }
      const resolveOptions2 = { body, headers, status } as const;
      resolve(resolveOptions2);
    });
    socket.on('connect', () => socket.write(request));
  });
}
