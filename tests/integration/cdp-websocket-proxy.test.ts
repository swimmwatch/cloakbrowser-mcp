import { createConnection, createServer as createNetServer, type Socket } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { type ClientOptions, WebSocket } from 'ws';

import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';
import { CDP_WEBSOCKET_MAX_CONNECTIONS, CDP_WEBSOCKET_MAX_MESSAGE_BYTES } from '@/cdp/limits.js';
import { type FakeChromiumCdpServer, startFakeChromiumCdp } from '@tests/fixtures/fake-chromium-cdp.js';

const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';
const staleCapability = 'CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg';
const cleanup: Array<() => Promise<void>> = [];

interface UpgradeFailure {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  status: number;
}

afterEach(async () => {
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('CDP WebSocket proxy integration', () => {
  it('validates capability, route, Host, and Origin before the upstream handshake', async () => {
    const reports: unknown[] = [];
    const fake = await echoFixture();
    const proxy = await readyProxy(fake, {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      onSecurityRejections: (summary) => reports.push(summary),
    });
    const authority = `cdp.example.test:${proxy.port}`;

    for (const [path, options, expectedStatus] of [
      [`/cdp/${staleCapability}/devtools/browser/id`, { headers: { Host: authority } }, 404],
      [`/cdp/${capability}/unsupported`, { headers: { Host: authority } }, 404],
      [`/cdp/${capability}/devtools/browser/id%2Fother`, { headers: { Host: authority } }, 400],
      [`/cdp/${capability}/devtools/browser/id`, { headers: { Host: `localhost:${proxy.port}` } }, 403],
      [
        `/cdp/${capability}/devtools/browser/id`,
        { headers: { Host: authority }, origin: 'not-an-origin' },
        400,
      ],
      [
        `/cdp/${capability}/devtools/browser/id`,
        { headers: { Host: authority }, origin: `https://other.example:${proxy.port}` },
        403,
      ],
    ] satisfies Array<[string, ClientOptions, number]>) {
      const failure = await connectFailure(proxy, path, options);
      expect(failure.status).toBe(expectedStatus);
      expect(failure.headers['cache-control']).toBe('no-store');
    }
    const missingHost = await rawUpgradeFailure(proxy.port, browserPath());
    expect(missingHost.status).toBe(400);
    expect(JSON.parse(missingHost.body)).toMatchObject({ error: { code: 'bad_request' } });
    expect(fake.webSocketRequests).toHaveLength(0);

    const browser = await connect(proxy, `/cdp/${capability}/devtools/browser/browser-id`, {
      headers: {
        Authorization: 'Bearer protected-client-value',
        Cookie: 'protected-cookie=value',
        Host: authority,
        'X-Forwarded-Host': 'attacker.invalid',
      },
      origin: `https://${authority}`,
    });
    const page = await connect(proxy, `/cdp/${capability}/devtools/page/page-id`, {
      headers: { Host: authority },
    });
    expect(fake.webSocketRequests.map((request) => request.url)).toEqual([
      '/devtools/browser/browser-id',
      '/devtools/page/page-id',
    ]);
    for (const request of fake.webSocketRequests) {
      expect(request.headers.host).toBe(`${fake.host}:${fake.port}`);
      expect(request.headers.origin).toBeUndefined();
      expect(request.headers.authorization).toBeUndefined();
      expect(request.headers.cookie).toBeUndefined();
      expect(request.headers['x-forwarded-host']).toBeUndefined();
    }
    browser.close();
    page.close();
    await proxy.close();
    expect(reports).toEqual([{ capability: 1, host: 2, origin: 2, windowSeconds: 60 }]);
  });

  it('rejects a malformed client handshake before opening Chromium WebSocket', async () => {
    const fake = await echoFixture();
    const proxy = await readyProxy(fake);

    const failure = await rawUpgradeRequest(
      proxy.port,
      [
        `GET ${browserPath()} HTTP/1.1`,
        `Host: 127.0.0.1:${proxy.port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n'),
    );

    expect(fake.webSocketRequests).toHaveLength(0);
    expect(fake.webSockets.size).toBe(0);
    expect(failure.status).toBe(400);
    expect(failure.headers['cache-control']).toBe('no-store');
    expect(failure.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(JSON.parse(failure.body)).toMatchObject({ error: { code: 'bad_request' } });
  });

  it('preserves text, binary, ordering, activity counts, and a valid peer close', async () => {
    const upstreamMessages: Array<{ data: Buffer; isBinary: boolean }> = [];
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
      socket.on('message', (data, isBinary) => {
        upstreamMessages.push({ data: Buffer.from(data as ArrayBuffer), isBinary });
      });
    });
    const activity: unknown[] = [];
    const proxy = await readyProxy(fake, { onActivity: (event) => activity.push(event) });
    const client = await connect(proxy, browserPath());
    expect(activity).toEqual([]);

    client.send('client-text');
    client.send(Buffer.from([1, 2, 3]), { binary: true });
    await vi.waitFor(() => expect(upstreamMessages).toHaveLength(2));
    expect(upstreamMessages).toEqual([
      { data: Buffer.from('client-text'), isBinary: false },
      { data: Buffer.from([1, 2, 3]), isBinary: true },
    ]);

    const clientMessages = collectMessages(client, 3);
    upstreamSocket?.send('one');
    upstreamSocket?.send(Buffer.from([4, 5]), { binary: true });
    upstreamSocket?.send('three');
    await expect(clientMessages).resolves.toEqual([
      { data: Buffer.from('one'), isBinary: false },
      { data: Buffer.from([4, 5]), isBinary: true },
      { data: Buffer.from('three'), isBinary: false },
    ]);
    expect(proxy.activeConnections).toBe(1);
    expect(activity).toContainEqual({ activeConnections: 1, kind: 'websocket' });

    const closed = onceClose(client);
    upstreamSocket?.close(1000, 'peer_done');
    await expect(closed).resolves.toEqual({ code: 1000, reason: 'peer_done' });
    await vi.waitFor(() => expect(proxy.activeConnections).toBe(0));
    expect(activity).toHaveLength(5);
    expect(activity).not.toContainEqual({ activeConnections: 0, kind: 'websocket' });
  });

  it('keeps a normal page-target close connection-local while browser-target loss invalidates', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const onBrowserLoss = vi.fn();
    const proxy = await readyProxy(fake, { onBrowserLoss });

    const page = await connect(proxy, pagePath());
    const pageClosed = onceClose(page);
    upstreamSocket?.close(1000, 'target_closed');
    await expect(pageClosed).resolves.toEqual({ code: 1000, reason: 'target_closed' });
    expect(onBrowserLoss).not.toHaveBeenCalled();

    const browser = await connect(proxy, browserPath());
    const browserClosed = onceClose(browser);
    upstreamSocket?.terminate();
    await expect(browserClosed).resolves.toMatchObject({ code: 1011 });
    await vi.waitFor(() => expect(onBrowserLoss).toHaveBeenCalledTimes(1));
  });

  it('checks identity before upgrade and reports raw Browser.close as browser loss', async () => {
    const fake = await echoFixture();
    const beforeForward = vi.fn(async () => true);
    const onBrowserLoss = vi.fn();
    const proxy = await readyProxy(fake, { beforeForward, onBrowserLoss });
    const client = await connect(proxy, browserPath());

    expect(beforeForward).toHaveBeenCalledTimes(1);
    client.send(JSON.stringify({ id: 1, method: 'Browser.close' }));

    await vi.waitFor(() => expect(onBrowserLoss).toHaveBeenCalledTimes(1));
  });

  it('bounds the identity probe by the WebSocket handshake deadline', async () => {
    const fake = await echoFixture();
    const proxy = await readyProxy(fake, {
      beforeForward: async (signal) =>
        await new Promise<boolean>((resolve) => {
          if (signal.aborted) resolve(false);
          else signal.addEventListener('abort', () => resolve(false), { once: true });
        }),
      webSocketHandshakeTimeoutMs: 25,
    });
    const startedAt = Date.now();

    const failure = await connectFailure(proxy, browserPath());

    expect(failure.status).toBe(504);
    expect(JSON.parse(failure.body)).toMatchObject({ error: { code: 'gateway_timeout' } });
    expect(Date.now() - startedAt).toBeLessThan(500);
  });

  it('admits exactly eight paired sockets and recovers capacity after close', async () => {
    const fake = await echoFixture();
    const proxy = await readyProxy(fake);
    const clients = await Promise.all(
      Array.from(
        { length: CDP_WEBSOCKET_MAX_CONNECTIONS },
        async (_, index) => await connect(proxy, `/cdp/${capability}/devtools/page/page-${index}`),
      ),
    );
    expect(proxy.activeConnections).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS);

    const ninth = await connectFailure(proxy, `/cdp/${capability}/devtools/page/page-over-limit`);
    expect(ninth.status).toBe(503);
    expect(JSON.parse(ninth.body)).toMatchObject({ error: { code: 'unavailable' } });

    const forbidden = await connectFailure(proxy, browserPath(), {
      headers: { Host: `other.example:${proxy.port}` },
    });
    expect(forbidden.status).toBe(403);
    expect(JSON.parse(forbidden.body)).toMatchObject({ error: { code: 'forbidden' } });
    expect(fake.webSocketRequests).toHaveLength(CDP_WEBSOCKET_MAX_CONNECTIONS);

    clients[0]?.close();
    await vi.waitFor(() => expect(proxy.activeConnections).toBe(7));
    const replacement = await connect(proxy, `/cdp/${capability}/devtools/page/replacement`);
    expect(proxy.activeConnections).toBe(8);
    replacement.close();
    for (const client of clients.slice(1)) client.close();
  });

  it('counts in-flight upstream handshakes against WebSocket capacity', async () => {
    const hanging = createNetServer();
    const sockets = new Set<Socket>();
    hanging.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      hanging.once('error', reject);
      hanging.listen(0, '127.0.0.1', resolve);
    });
    cleanup.push(async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => hanging.close(() => resolve()));
    });
    const address = hanging.address();
    if (address === null || typeof address === 'string') throw new Error('Missing hanging server port');

    const proxy = await standaloneProxy({ webSocketHandshakeTimeoutMs: 250 });
    publishGeneration(proxy, {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    });
    const attempts = Array.from({ length: CDP_WEBSOCKET_MAX_CONNECTIONS }, (_, index) =>
      connectFailure(proxy, `/cdp/${capability}/devtools/page/pending-${index}`),
    );
    await vi.waitFor(() => expect(sockets.size).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS));

    const ninth = await connectFailure(proxy, `/cdp/${capability}/devtools/page/over-limit`);
    expect(ninth.status).toBe(503);
    expect(sockets.size).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS);
    expect((await Promise.all(attempts)).map((failure) => failure.status)).toEqual(
      Array.from({ length: CDP_WEBSOCKET_MAX_CONNECTIONS }, () => 504),
    );
  });

  it('does not count refused upstream handshakes and maps handshake timeout', async () => {
    const refusedPort = await unusedPort();
    const proxy = await standaloneProxy({ webSocketHandshakeTimeoutMs: 500 });
    publishGeneration(proxy, {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: refusedPort,
    });
    expect((await connectFailure(proxy, browserPath())).status).toBe(502);
    expect(proxy.activeConnections).toBe(0);

    const hanging = createNetServer();
    const sockets = new Set<Socket>();
    hanging.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      hanging.once('error', reject);
      hanging.listen(0, '127.0.0.1', resolve);
    });
    const address = hanging.address();
    if (address === null || typeof address === 'string') throw new Error('No hanging server port');
    cleanup.push(async () => {
      for (const socket of sockets) socket.destroy();
      await closeNetServer(hanging);
    });
    publishGeneration(proxy, {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    });
    const timeoutPromise = connectFailure(proxy, browserPath());
    await vi.waitFor(() => expect(sockets.size).toBe(1));
    expect(proxy.activeConnections).toBe(0);
    const timeout = await timeoutPromise;
    expect(timeout.status).toBe(504);
    expect(JSON.parse(timeout.body)).toMatchObject({ error: { code: 'gateway_timeout' } });
    expect(proxy.activeConnections).toBe(0);
  });

  it('maps proxy shutdown during an upstream handshake to unavailable', async () => {
    const hanging = createNetServer();
    const sockets = new Set<Socket>();
    hanging.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
    await new Promise<void>((resolve, reject) => {
      hanging.once('error', reject);
      hanging.listen(0, '127.0.0.1', resolve);
    });
    const address = hanging.address();
    if (address === null || typeof address === 'string') throw new Error('No hanging server port');
    cleanup.push(async () => {
      for (const socket of sockets) socket.destroy();
      await closeNetServer(hanging);
    });

    const proxy = await standaloneProxy({
      webSocketHandshakeTimeoutMs: 5_000,
      webSocketShutdownTimeoutMs: 40,
    });
    publishGeneration(proxy, {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    });
    const failurePromise = connectFailure(proxy, browserPath());
    await vi.waitFor(() => expect(sockets.size).toBe(1));

    const closing = proxy.close();
    const failure = await failurePromise;
    expect(failure.status).toBe(503);
    expect(JSON.parse(failure.body)).toMatchObject({ error: { code: 'unavailable' } });
    await closing;
  });

  it('closes an upgrade waiting for identity probe before shutdown releases it', async () => {
    let resolveProbe: ((available: boolean) => void) | undefined;
    const beforeForward = vi.fn(
      async () =>
        await new Promise<boolean>((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const fake = await echoFixture();
    const proxy = await readyProxy(fake, {
      beforeForward,
      webSocketShutdownTimeoutMs: 40,
    });

    const failurePromise = connectFailure(proxy, browserPath());
    await vi.waitFor(() => expect(beforeForward).toHaveBeenCalledTimes(1));
    const closing = proxy.close();
    const outcome = await Promise.race([
      failurePromise,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 150)),
    ]);
    resolveProbe?.(true);

    expect(outcome).not.toBe('timeout');
    expect(outcome).toMatchObject({ status: 503 });
    await expect(closing).resolves.toBeUndefined();
  });

  it('uses fixed lifecycle and abrupt-upstream close pairs without leaking details', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const proxy = await readyProxy(fake);
    const lifecycleClient = await connect(proxy, browserPath());
    const lifecycleClosed = onceClose(lifecycleClient);
    proxy.clearGeneration();
    await expect(lifecycleClosed).resolves.toEqual({ code: 1001, reason: 'going_away' });

    publishGeneration(proxy, { capability, upstreamHost: fake.host, upstreamPort: fake.port });
    const abruptClient = await connect(proxy, browserPath('abrupt-target'));
    const abruptClosed = onceClose(abruptClient);
    upstreamSocket?.terminate();
    const close = await abruptClosed;
    expect(close).toEqual({ code: 1011, reason: 'internal_error' });
    expect(close.reason).not.toContain('abrupt-target');
    expect(close.reason).not.toContain(capability);
  });

  it('uses protocol_error for malformed frames and message_too_big above 16 MiB', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
      socket.on('message', (data, isBinary) => socket.send(data, { binary: isBinary }));
    });
    const proxy = await readyProxy(fake);
    const malformed = await connect(proxy, browserPath('malformed'));
    const malformedClosed = onceClose(malformed);
    writeMalformedFrame(malformed);
    await expect(malformedClosed).resolves.toEqual({ code: 1002, reason: 'protocol_error' });

    const oversized = await connect(proxy, browserPath('oversized'));
    const oversizedClosed = onceClose(oversized);
    oversized.send(Buffer.alloc(CDP_WEBSOCKET_MAX_MESSAGE_BYTES + 1), { binary: true });
    await expect(oversizedClosed).resolves.toEqual({ code: 1009, reason: 'message_too_big' });

    const upstreamOversized = await connect(proxy, browserPath('upstream-oversized'));
    const upstreamOversizedClosed = onceClose(upstreamOversized);
    upstreamSocket?.send(Buffer.alloc(CDP_WEBSOCKET_MAX_MESSAGE_BYTES + 1), { binary: true });
    await expect(upstreamOversizedClosed).resolves.toEqual({
      code: 1009,
      reason: 'message_too_big',
    });
  });

  it('relays an exact 16 MiB message in both directions', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const proxy = await readyProxy(fake);
    const client = await connect(proxy, browserPath('boundary'));
    const connectedUpstream = upstreamSocket;
    if (connectedUpstream === undefined) throw new Error('Upstream WebSocket was not connected');
    const exact = Buffer.alloc(CDP_WEBSOCKET_MAX_MESSAGE_BYTES, 0x61);
    const toUpstream = onceMessage(connectedUpstream);
    client.send(exact, { binary: true });
    const outgoing = await toUpstream;
    expect(outgoing.data.byteLength).toBe(CDP_WEBSOCKET_MAX_MESSAGE_BYTES);
    expect(outgoing.isBinary).toBe(true);

    const fromUpstream = onceMessage(client);
    connectedUpstream.send(exact, { binary: true });
    const incoming = await fromUpstream;
    expect(incoming.data.byteLength).toBe(CDP_WEBSOCKET_MAX_MESSAGE_BYTES);
    expect(incoming.isBinary).toBe(true);

    client.close();
  });

  it('keeps a quiet subscriber open and releases the listener after bounded shutdown', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const allocatorPort = await unusedPort();
    const allocator = new CdpPortAllocator({ start: allocatorPort, end: allocatorPort });
    const proxy = await startCdpHttpProxy({
      advertisedScheme: 'http',
      allocator,
      bindHost: '127.0.0.1',
      webSocketShutdownTimeoutMs: 40,
    });
    publishGeneration(proxy, { capability, upstreamHost: fake.host, upstreamPort: fake.port });
    const client = await connect(proxy, browserPath());
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(client.readyState).toBe(WebSocket.OPEN);

    upstreamSocket?.pause();
    const clientClosed = onceClose(client);
    const startedAt = Date.now();
    const closing = proxy.close();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    const earlyReuse = startCdpHttpProxy({
      advertisedScheme: 'http',
      allocator: new CdpPortAllocator({ start: allocatorPort, end: allocatorPort }),
      bindHost: '127.0.0.1',
    }).then(async (earlyProxy) => {
      await earlyProxy.close();
      return earlyProxy;
    });
    await expect(earlyReuse).rejects.toMatchObject({ code: 'EADDRINUSE' });
    await closing;
    expect(Date.now() - startedAt).toBeLessThan(500);
    await expect(clientClosed).resolves.toMatchObject({ code: 1001, reason: 'going_away' });

    const replacement = await startCdpHttpProxy({
      advertisedScheme: 'http',
      allocator: new CdpPortAllocator({ start: allocatorPort, end: allocatorPort }),
      bindHost: '127.0.0.1',
    });
    cleanup.push(async () => await replacement.close());
    expect(replacement.port).toBe(allocatorPort);
  });
});

function browserPath(id = 'browser-id'): string {
  return `/cdp/${capability}/devtools/browser/${id}`;
}

function pagePath(id = 'page-id'): string {
  return `/cdp/${capability}/devtools/page/${id}`;
}

async function echoFixture(): Promise<FakeChromiumCdpServer> {
  return await fixture((socket) => {
    socket.on('message', (data, isBinary) => socket.send(data, { binary: isBinary }));
  });
}

async function fixture(
  webSocketHandler: Parameters<typeof startFakeChromiumCdp>[1],
): Promise<FakeChromiumCdpServer> {
  const fake = await startFakeChromiumCdp((_request, response) => {
    response.writeHead(404);
    response.end();
  }, webSocketHandler);
  cleanup.push(async () => await fake.close());
  return fake;
}

async function readyProxy(
  fake: FakeChromiumCdpServer,
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  const proxy = await standaloneProxy(options);
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

async function standaloneProxy(
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  const port = await unusedPort();
  const proxy = await startCdpHttpProxy({
    advertisedScheme: 'http',
    allocator: new CdpPortAllocator({ start: port, end: port }),
    bindHost: '127.0.0.1',
    ...options,
  });
  cleanup.push(async () => await proxy.close());
  return proxy;
}

async function connect(proxy: CdpHttpProxy, path: string, options: ClientOptions = {}): Promise<WebSocket> {
  const socket = new WebSocket(`ws://127.0.0.1:${proxy.port}${path}`, options);
  cleanup.push(async () => closeWebSocket(socket));
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return socket;
}

async function connectFailure(
  proxy: CdpHttpProxy,
  path: string,
  options: ClientOptions = {},
): Promise<UpgradeFailure> {
  const socket = new WebSocket(`ws://127.0.0.1:${proxy.port}${path}`, options);
  cleanup.push(async () => closeWebSocket(socket));
  return await new Promise<UpgradeFailure>((resolve, reject) => {
    socket.once('open', () => reject(new Error('Expected WebSocket upgrade failure')));
    socket.once('unexpected-response', (_request, response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.once('end', () =>
        resolve({
          body: Buffer.concat(chunks).toString(),
          headers: response.headers,
          status: response.statusCode ?? 0,
        }),
      );
      response.once('error', reject);
    });
    socket.once('error', () => undefined);
  });
}

function collectMessages(
  socket: WebSocket,
  count: number,
): Promise<Array<{ data: Buffer; isBinary: boolean }>> {
  return new Promise((resolve, reject) => {
    const messages: Array<{ data: Buffer; isBinary: boolean }> = [];
    socket.on('message', (data, isBinary) => {
      messages.push({ data: Buffer.from(data as ArrayBuffer), isBinary });
      if (messages.length === count) resolve(messages);
    });
    socket.once('error', reject);
  });
}

function onceMessage(socket: WebSocket): Promise<{ data: Buffer; isBinary: boolean }> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data, isBinary) => resolve({ data: Buffer.from(data as ArrayBuffer), isBinary }));
    socket.once('error', reject);
  });
}

function onceClose(socket: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    socket.once('close', (code, reason) => resolve({ code, reason: reason.toString('utf8') }));
  });
}

function writeMalformedFrame(socket: WebSocket): void {
  clientRawSocket(socket).write(Buffer.from([0x83, 0x80, 0, 0, 0, 0]));
}

function clientRawSocket(socket: WebSocket): Socket {
  const rawSocket = (socket as unknown as { _socket?: Socket })._socket;
  if (rawSocket === undefined) throw new Error('WebSocket has no underlying socket');
  return rawSocket;
}

async function closeWebSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', resolve);
    socket.terminate();
  });
}

async function rawUpgradeFailure(port: number, path: string): Promise<UpgradeFailure> {
  return await rawUpgradeRequest(
    port,
    `GET ${path} HTTP/1.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: AAAAAAAAAAAAAAAAAAAAAA==\r\nSec-WebSocket-Version: 13\r\n\r\n`,
  );
}

async function rawUpgradeRequest(port: number, request: string): Promise<UpgradeFailure> {
  return await new Promise<UpgradeFailure>((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const chunks: Buffer[] = [];
    socket.once('error', reject);
    socket.on('data', (chunk: Buffer) => chunks.push(chunk));
    socket.once('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const separator = raw.indexOf('\r\n\r\n');
      const lines = raw.slice(0, separator).split('\r\n');
      const headers: Record<string, string> = {};
      for (const line of lines.slice(1)) {
        const index = line.indexOf(':');
        if (index !== -1) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
      }
      resolve({
        body: raw.slice(separator + 4),
        headers,
        status: Number(lines[0]?.split(' ')[1] ?? 0),
      });
    });
    socket.once('connect', () => {
      socket.write(request);
    });
  });
}

async function unusedPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No temporary port');
  await closeNetServer(server);
  return address.port;
}

async function closeNetServer(server: ReturnType<typeof createNetServer>): Promise<void> {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}
