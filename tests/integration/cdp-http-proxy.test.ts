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
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('CDP HTTP proxy integration', () => {
  it('aggregates capability, Host, and Origin rejections without protected request data', async () => {
    const reports: unknown[] = [];
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, {}));
    const proxy = await readyProxy(fake, {
      advertisedHost: 'cdp.example.test',
      onSecurityRejections: (summary) => reports.push(summary),
    });
    const authority = `cdp.example.test:${proxy.port}`;

    await requestProxy(proxy, `/cdp/${staleCapability}/json/version`, { Host: authority });
    await requestProxy(proxy, `/cdp/${capability}/json/version`, {}, 'GET', undefined, false);
    await requestProxy(proxy, `/cdp/${capability}/json/version`, {
      Host: authority,
      Origin: `http://other.example:${proxy.port}`,
    });
    await proxy.close();

    expect(reports).toEqual([{ capability: 1, host: 1, origin: 1, windowSeconds: 60 }]);
  });

  it('stays unavailable until publication, rewrites discovery, and rejects stale capability', async () => {
    const activity: unknown[] = [];
    const fake = await fakeChromium((request, response) => {
      writeJson(response, 200, {
        unrelated: `ws://${request.headers.host}/leave-unchanged`,
        webSocketDebuggerUrl: `ws://${request.headers.host}/devtools/browser/browser-id`,
      });
    });
    const proxy = await proxyFor(fake, {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      onActivity: (event) => activity.push(event),
    });
    const authority = `cdp.example.test:${proxy.port}`;
    proxy.setUnavailableCapability(capability);

    const unavailable = await requestProxy(proxy, `/cdp/${capability}/json/version`, {
      Host: authority,
    });
    expect(errorCode(unavailable)).toBe('unavailable');
    expect(fake.requests).toHaveLength(0);

    const generation = { capability, upstreamHost: fake.host, upstreamPort: fake.port };
    proxy.stageGeneration(generation);
    const staged = await requestProxy(proxy, `/cdp/${capability}/json/version`, { Host: authority });
    expect(errorCode(staged)).toBe('unavailable');
    expect(fake.requests).toHaveLength(0);
    proxy.publishGeneration(generation);
    const ready = await requestProxy(proxy, `/cdp/${capability}/json/version`, { Host: authority });
    expect(ready.status).toBe(200);
    expect(JSON.parse(ready.body.toString())).toEqual({
      unrelated: `ws://127.0.0.1:${fake.port}/leave-unchanged`,
      webSocketDebuggerUrl: `wss://${authority}/cdp/${capability}/devtools/browser/browser-id`,
    });
    expect(ready.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(ready.headers['cache-control']).toBe('no-store');
    expect(fake.requests[0]).toMatchObject({
      headers: { host: `${fake.host}:${fake.port}` },
      method: 'GET',
      url: '/json/version',
    });
    expect(activity).toEqual([{ activeRequests: 1, kind: 'http_request' }]);

    publishGeneration(proxy, {
      capability: staleCapability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    });
    const stale = await requestProxy(proxy, `/cdp/${capability}/json/version`, { Host: authority });
    const unsupported = await requestProxy(proxy, `/cdp/${staleCapability}/unsupported`, {
      Host: authority,
    });
    expect(stale).toMatchObject({ body: unsupported.body, status: 404 });
    expect(fake.requests).toHaveLength(1);
  });

  it('rejects local policy failures before Chromium with exact typed errors', async () => {
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, { ok: true }));
    const proxy = await readyProxy(fake);
    const authority = `127.0.0.1:${proxy.port}`;
    const validPath = `/cdp/${capability}/json/version`;

    const wrong = await requestProxy(proxy, `/cdp/${staleCapability}/json/version`, { Host: authority });
    const unsupported = await requestProxy(proxy, `/cdp/${capability}/unsupported`, { Host: authority });
    expect(wrong).toMatchObject({ body: unsupported.body, headers: unsupported.headers, status: 404 });

    const method = await requestProxy(proxy, validPath, { Host: authority }, 'POST');
    expect(errorCode(method)).toBe('method_not_allowed');
    expect(method.headers.allow).toBe('GET');

    const missingHost = await requestProxy(proxy, validPath, {}, 'GET', undefined, false);
    expect(errorCode(missingHost)).toBe('bad_request');
    const malformedHost = await requestProxy(proxy, validPath, { Host: 'user@example.test' });
    expect(errorCode(malformedHost)).toBe('bad_request');
    const deniedHost = await requestProxy(proxy, validPath, { Host: `localhost:${proxy.port}` });
    expect(errorCode(deniedHost)).toBe('forbidden');
    const malformedOrigin = await requestProxy(proxy, validPath, {
      Host: authority,
      Origin: 'not-an-origin',
    });
    expect(errorCode(malformedOrigin)).toBe('bad_request');
    const deniedOrigin = await requestProxy(proxy, validPath, {
      Host: authority,
      Origin: `https://example.test:${proxy.port}`,
    });
    expect(errorCode(deniedOrigin)).toBe('forbidden');
    const body = await requestProxy(
      proxy,
      validPath,
      { 'Content-Length': '1', Host: authority },
      'GET',
      Buffer.from('x'),
    );
    expect(errorCode(body)).toBe('payload_too_large');

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
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, { ok: true }));
    const proxy = await readyProxy(fake);
    const authority = `127.0.0.1:${proxy.port}`;
    const path = `/cdp/${capability}/json/version`;

    const results = await Promise.all([
      requestProxy(proxy, path, { Host: `127.1:${proxy.port}` }),
      requestProxy(proxy, path, { Host: `0x7f000001:${proxy.port}` }),
      requestProxy(proxy, path, {
        Host: authority,
        Origin: `http://0177.0.0.1:${proxy.port}`,
      }),
    ]);

    for (const result of results) {
      expect(errorCode(result)).toBe('bad_request');
    }
    expect(fake.requests).toHaveLength(0);
  });

  it('closes a rejected body-bearing request before proxy cleanup', async () => {
    const proxy = await standaloneProxy();
    proxy.setUnavailableCapability(capability);
    const socket = createConnection({ host: '127.0.0.1', port: proxy.port });
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
    socket.write(
      `PUT /cdp/${capability}/json/new HTTP/1.1\r\n` +
        `Host: 127.0.0.1:${proxy.port}\r\n` +
        'Content-Length: 100000000\r\n\r\n',
    );

    await vi.waitFor(() => expect(response).toContain('HTTP/1.1 413'));
    const closedByProxy = await Promise.race([
      closed,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 250)),
    ]);
    if (!closedByProxy) socket.destroy();

    expect(response.toLowerCase()).toContain('connection: close');
    expect(closedByProxy).toBe(true);
    await expect(proxy.close()).resolves.toBeUndefined();
  });

  it('normalizes and redacts upstream failures, size excess, timeout, and unexpected errors', async () => {
    let mode = 'client-error';
    const fake = await fakeChromium((_request, response) => {
      if (mode === 'client-error') {
        response.writeHead(418, { 'X-Upstream-Secret': 'do-not-forward' });
        response.end('protected upstream body');
      } else if (mode === 'redirect') {
        response.writeHead(302, { Location: 'http://internal.invalid/' });
        response.end();
      } else if (mode === 'server-error') {
        response.writeHead(503);
        response.end('internal state');
      } else if (mode === 'disconnect') {
        response.socket?.destroy();
      } else if (mode === 'oversized') {
        const prefix = Buffer.from('{"padding":"');
        const suffix = Buffer.from('"}');
        response.end(
          Buffer.concat([
            prefix,
            Buffer.alloc(
              CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES + 1 - prefix.byteLength - suffix.byteLength,
              0x61,
            ),
            suffix,
          ]),
        );
      }
    });
    const proxy = await readyProxy(fake, { upstreamTimeoutMs: 1_000 });
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const path = `/cdp/${capability}/json/version`;

    const clientError = await requestProxy(proxy, path, headers);
    expect(clientError.status).toBe(418);
    expect(errorCode(clientError)).toBe('upstream_error');
    expect(clientError.body.toString()).not.toContain('protected');
    expect(clientError.headers).not.toHaveProperty('x-upstream-secret');

    mode = 'redirect';
    expect(errorCode(await requestProxy(proxy, path, headers))).toBe('bad_gateway');
    mode = 'server-error';
    expect(errorCode(await requestProxy(proxy, path, headers))).toBe('bad_gateway');
    mode = 'disconnect';
    expect(errorCode(await requestProxy(proxy, path, headers))).toBe('bad_gateway');
    mode = 'oversized';
    expect(errorCode(await requestProxy(proxy, path, headers))).toBe('bad_gateway');
    mode = 'timeout';
    expect(errorCode(await requestProxy(proxy, path, headers))).toBe('gateway_timeout');

    const invalidProxy = await standaloneProxy({
      requestUpstream: async () => ({ body: Buffer.from('{}'), statusCode: Number.NaN }),
    });
    publishGeneration(invalidProxy, { capability, upstreamHost: '127.0.0.1', upstreamPort: 9 });
    expect(
      errorCode(await requestProxy(invalidProxy, path, { Host: `127.0.0.1:${invalidProxy.port}` })),
    ).toBe('bad_gateway');

    const unexpectedProxy = await standaloneProxy({
      requestUpstream: async () => {
        throw new Error('protected unexpected detail');
      },
    });
    publishGeneration(unexpectedProxy, {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: 9,
    });
    const unexpected = await requestProxy(unexpectedProxy, path, {
      Host: `127.0.0.1:${unexpectedProxy.port}`,
    });
    expect(errorCode(unexpected)).toBe('internal_error');
    expect(unexpected.body.toString()).not.toContain('protected');
  });

  it('preserves allowed methods and new-target query while keeping upstream plaintext', async () => {
    const fake = await fakeChromium((request, response) => {
      if (request.url?.startsWith('/json/new')) writeJson(response, 200, { id: 'new-target' });
      else response.end('Target activated');
    });
    const proxy = await readyProxy(fake, {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
    });
    const headers = { Host: `cdp.example.test:${proxy.port}` };

    const created = await requestProxy(
      proxy,
      `/cdp/${capability}/json/new?https%3A%2F%2Fexample.test%2F`,
      headers,
      'PUT',
    );
    expect(created.status).toBe(200);
    const activated = await requestProxy(proxy, `/cdp/${capability}/json/activate/target-1`, headers);
    expect(activated).toMatchObject({ body: Buffer.from('Target activated'), status: 200 });
    expect(fake.requests.map((request) => [request.method, request.url])).toEqual([
      ['PUT', '/json/new?https%3A%2F%2Fexample.test%2F'],
      ['GET', '/json/activate/target-1'],
    ]);
  });

  it('enforces sixteen concurrent requests and rejects the seventeenth locally', async () => {
    const pendingResponses: ServerResponse[] = [];
    const fake = await fakeChromium((_request, response) => pendingResponses.push(response));
    const proxy = await readyProxy(fake);
    const headers = { Host: `127.0.0.1:${proxy.port}` };
    const path = `/cdp/${capability}/json/version`;

    const pending = Array.from(
      { length: CDP_HTTP_MAX_CONCURRENT_REQUESTS },
      async () => await requestProxy(proxy, path, headers),
    );
    await vi.waitFor(() => expect(fake.requests).toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS));
    const excess = await requestProxy(proxy, path, headers);
    expect(errorCode(excess)).toBe('unavailable');
    expect(fake.requests).toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS);

    for (const response of pendingResponses) writeJson(response, 200, { ok: true });
    await expect(Promise.all(pending)).resolves.toHaveLength(CDP_HTTP_MAX_CONCURRENT_REQUESTS);
  });

  it('accepts exactly 16 KiB of headers and rejects one extra byte', async () => {
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, { ok: true }));
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
    const excess = await rawRequestWithHeaderBytes(
      proxy.port,
      path,
      authority,
      CDP_HTTP_MAX_REQUEST_HEADER_BYTES + 1,
    );
    expect(errorCode(excess)).toBe('headers_too_large');
    expect(fake.requests).toHaveLength(1);
  });

  it('returns a typed request timeout for incomplete headers', async () => {
    const proxy = await standaloneProxy({ headerTimeoutMs: 25 });
    const response = await rawIncompleteRequest(proxy.port);
    expect(errorCode(response)).toBe('request_timeout');
  });

  it('checks browser identity before forwarding and reports upstream loss', async () => {
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, { ok: true }));
    const beforeForward = vi.fn(async () => false);
    const onActivity = vi.fn();
    const onBrowserLoss = vi.fn();
    const rejectedProxy = await readyProxy(fake, { beforeForward, onActivity, onBrowserLoss });
    const headers = { Host: `127.0.0.1:${rejectedProxy.port}` };

    const rejected = await requestProxy(rejectedProxy, `/cdp/${capability}/json/version`, headers);

    expect(errorCode(rejected)).toBe('unavailable');
    expect(beforeForward).toHaveBeenCalledTimes(1);
    expect(onActivity).not.toHaveBeenCalled();
    expect(fake.requests).toHaveLength(0);

    const failingProxy = await standaloneProxy({
      beforeForward: async () => true,
      onBrowserLoss,
      requestUpstream: async () => {
        throw new Error('browser disconnected');
      },
    });
    publishGeneration(failingProxy, {
      capability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    });

    const failed = await requestProxy(failingProxy, `/cdp/${capability}/json/version`, {
      Host: `127.0.0.1:${failingProxy.port}`,
    });
    expect(errorCode(failed)).toBe('internal_error');
    expect(onBrowserLoss).toHaveBeenCalledTimes(1);
  });

  it('bounds the identity probe by the HTTP upstream deadline', async () => {
    const fake = await fakeChromium((_request, response) => writeJson(response, 200, { ok: true }));
    const proxy = await readyProxy(fake, {
      beforeForward: async (signal) =>
        await new Promise<boolean>((resolve) => {
          if (signal.aborted) resolve(false);
          else signal.addEventListener('abort', () => resolve(false), { once: true });
        }),
      upstreamTimeoutMs: 25,
    });
    const startedAt = Date.now();

    const response = await requestProxy(proxy, `/cdp/${capability}/json/version`, {
      Host: `127.0.0.1:${proxy.port}`,
    });

    expect(errorCode(response)).toBe('gateway_timeout');
    expect(Date.now() - startedAt).toBeLessThan(500);
    expect(fake.requests).toHaveLength(0);
  });

  it('surfaces an actual external collision without scanning another port', async () => {
    const occupied = await listenNetServer();
    cleanup.push(async () => await closeNetServer(occupied.server));
    const allocator = new CdpPortAllocator({ start: occupied.port, end: occupied.port + 1 });

    await expect(
      startCdpHttpProxy({
        advertisedScheme: 'http',
        allocator,
        bindHost: '127.0.0.1',
      }),
    ).rejects.toMatchObject({ code: 'EADDRINUSE', port: occupied.port });
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
  publishGeneration(proxy, { capability, upstreamHost: fake.host, upstreamPort: fake.port });
  return proxy;
}

function publishGeneration(
  proxy: CdpHttpProxy,
  options: { capability: string; upstreamHost: string; upstreamPort: number },
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
  const proxy = await startCdpHttpProxy({
    advertisedScheme: 'http',
    allocator: new CdpPortAllocator({ start: port, end: port }),
    bindHost: '127.0.0.1',
    ...options,
  });
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
    const request = httpRequest(
      {
        agent: false,
        headers,
        host: '127.0.0.1',
        method,
        path,
        port: proxy.port,
        setHost,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            body: Buffer.concat(chunks),
            headers: response.headers,
            status: response.statusCode ?? 0,
          }),
        );
      },
    );
    request.once('error', reject);
    request.end(body);
  });
}

function errorCode(result: HttpResult): string {
  return (JSON.parse(result.body.toString()) as { error: { code: string } }).error.code;
}

function writeJson(response: ServerResponse, status: number, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {
    'Content-Length': String(body.byteLength),
    'Content-Type': 'application/json',
    'X-Upstream-Internal': 'discard-me',
  });
  response.end(body);
}

async function findFreePort(): Promise<number> {
  const { port, server } = await listenNetServer();
  await closeNetServer(server);
  return port;
}

async function listenNetServer(): Promise<{ port: number; server: NetServer }> {
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
  const fixedBytes = Buffer.byteLength(`Host: ${authority}\r\nConnection: close\r\nX-Pad: \r\n`) + 2;
  const padding = 'a'.repeat(headerBytes - fixedBytes);
  return await rawRequest(
    port,
    `GET ${path} HTTP/1.1\r\nHost: ${authority}\r\nConnection: close\r\nX-Pad: ${padding}\r\n\r\n`,
  );
}

async function rawIncompleteRequest(port: number): Promise<HttpResult> {
  return await rawRequest(port, 'GET /incomplete HTTP/1.1\r\nHost:');
}

async function rawRequest(port: number, request: string): Promise<HttpResult> {
  return await new Promise<HttpResult>((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const chunks: Buffer[] = [];
    socket.once('error', reject);
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const separator = raw.indexOf('\r\n\r\n');
      const head = raw.slice(0, separator);
      const body = Buffer.from(raw.slice(separator + 4));
      const lines = head.split('\r\n');
      const status = Number(lines[0]?.split(' ')[1] ?? 0);
      const headers: Record<string, string> = {};
      for (const line of lines.slice(1)) {
        const index = line.indexOf(':');
        if (index !== -1) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
      }
      resolve({ body, headers, status });
    });
    socket.on('connect', () => socket.write(request));
  });
}
