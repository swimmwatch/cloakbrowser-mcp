import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
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
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
});
describe('CDP WebSocket proxy integration', () => {
  it('validates capability, route, Host, and Origin before the upstream handshake', async () => {
    const reports: unknown[] = [];
    const fake = await echoFixture();
    const readyProxyOptions: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      onSecurityRejections: (summary) => reports.push(summary),
    };
    const proxy = await readyProxy(fake, readyProxyOptions);
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
    const argumentValue = proxy.port;
    const browserPathResult = browserPath();
    const missingHost = await rawUpgradeFailure(argumentValue, browserPathResult);
    expect(missingHost.status).toBe(400);
    const parsedValue = JSON.parse(missingHost.body);
    const receiverActual = parsedValue;
    const toMatchObjectOptions = { error: { code: 'bad_request' } } as const;
    expect(receiverActual).toMatchObject(toMatchObjectOptions);
    expect(fake.webSocketRequests).toHaveLength(0);
    const message = `/cdp/${capability}/devtools/browser/browser-id`;
    const connectOptions = {
      headers: {
        Authorization: 'Bearer protected-client-value',
        Cookie: 'protected-cookie=value',
        Host: authority,
        'X-Forwarded-Host': 'attacker.invalid',
      },
      origin: `https://${authority}`,
    } as const;
    const browser = await connect(proxy, message, connectOptions);
    const message2 = `/cdp/${capability}/devtools/page/page-id`;
    const connectOptions2 = {
      headers: { Host: authority },
    } as const;
    const page = await connect(proxy, message2, connectOptions2);
    const mappedValues2 = fake.webSocketRequests.map((request) => request.url);
    const receiver2Actual = mappedValues2;
    const values: string[] = ['/devtools/browser/browser-id', '/devtools/page/page-id'];
    expect(receiver2Actual).toEqual(values);
    for (const request of fake.webSocketRequests) {
      const receiver3Actual = request.headers.host;
      const message3 = `${fake.host}:${fake.port}`;
      expect(receiver3Actual).toBe(message3);
      expect(request.headers.origin).toBeUndefined();
      expect(request.headers.authorization).toBeUndefined();
      expect(request.headers.cookie).toBeUndefined();
      expect(request.headers['x-forwarded-host']).toBeUndefined();
    }
    browser.close();
    page.close();
    await proxy.close();
    const receiver4Actual = reports;
    const values2: {
      capability: number;
      host: number;
      origin: number;
      windowSeconds: number;
    }[] = [{ capability: 1, host: 2, origin: 2, windowSeconds: 60 }];
    expect(receiver4Actual).toEqual(values2);
  });
  it('rejects a malformed client handshake before opening Chromium WebSocket', async () => {
    const fake = await echoFixture();
    const proxy = await readyProxy(fake);
    const argumentValue2 = proxy.port;
    const joinedPath = [
      `GET ${browserPath()} HTTP/1.1`,
      `Host: 127.0.0.1:${proxy.port}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Version: 13',
      '',
      '',
    ].join('\r\n');
    const failure = await rawUpgradeRequest(argumentValue2, joinedPath);
    expect(fake.webSocketRequests).toHaveLength(0);
    expect(fake.webSockets.size).toBe(0);
    expect(failure.status).toBe(400);
    expect(failure.headers['cache-control']).toBe('no-store');
    expect(failure.headers['content-type']).toBe('application/json; charset=utf-8');
    const parsedValue2 = JSON.parse(failure.body);
    const receiver5Actual = parsedValue2;
    const toMatchObjectOptions2 = { error: { code: 'bad_request' } } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions2);
  });
  it('preserves text, binary, ordering, activity counts, and a valid peer close', async () => {
    const upstreamMessages: Array<{
      data: Buffer;
      isBinary: boolean;
    }> = [];
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
      socket.on('message', (data, isBinary) => {
        const pushOptions = { data: Buffer.from(data as ArrayBuffer), isBinary } as const;
        upstreamMessages.push(pushOptions);
      });
    });
    const activity: unknown[] = [];
    const readyProxyOptions2: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      onActivity: (event) => activity.push(event),
    };
    const proxy = await readyProxy(fake, readyProxyOptions2);
    const browserPathResult2 = browserPath();
    const client = await connect(proxy, browserPathResult2);
    const receiver6Actual = activity;
    const values3: never[] = [];
    expect(receiver6Actual).toEqual(values3);
    client.send('client-text');
    const values4: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [1, 2, 3];
    const fromResult = Buffer.from(values4);
    const sendOptions = { binary: true } as const;
    client.send(fromResult, sendOptions);
    await vi.waitFor(() => expect(upstreamMessages).toHaveLength(2));
    const receiver7Actual = upstreamMessages;
    const options2 = { data: Buffer.from('client-text'), isBinary: false } as const;
    const values5: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [1, 2, 3];
    const fromResult2 = Buffer.from(values5);
    const propertyValue = true;
    const options3: {
      data: Buffer<ArrayBuffer>;
      isBinary: boolean;
    } = { data: fromResult2, isBinary: propertyValue };
    const values6: {
      data: Buffer<ArrayBuffer>;
      isBinary: boolean;
    }[] = [options2, options3];
    expect(receiver7Actual).toEqual(values6);
    const clientMessages = collectMessages(client, 3);
    upstreamSocket?.send('one');
    const values7: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [4, 5];
    const fromResult3 = Buffer.from(values7);
    const sendOptions2 = { binary: true } as const;
    upstreamSocket?.send(fromResult3, sendOptions2);
    upstreamSocket?.send('three');
    const receiver8Actual = clientMessages;
    const options4 = { data: Buffer.from('one'), isBinary: false } as const;
    const values8: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [4, 5];
    const fromResult4 = Buffer.from(values8);
    const propertyValue2 = true;
    const options5: {
      data: Buffer<ArrayBuffer>;
      isBinary: boolean;
    } = { data: fromResult4, isBinary: propertyValue2 };
    const options6 = { data: Buffer.from('three'), isBinary: false } as const;
    const values9: {
      data: Buffer<ArrayBuffer>;
      isBinary: boolean;
    }[] = [options4, options5, options6];
    await expect(receiver8Actual).resolves.toEqual(values9);
    expect(proxy.activeConnections).toBe(1);
    const receiver9Actual = activity;
    const toContainEqualOptions = { activeConnections: 1, kind: 'websocket' } as const;
    expect(receiver9Actual).toContainEqual(toContainEqualOptions);
    const closed = onceClose(client);
    upstreamSocket?.close(1000, 'peer_done');
    const receiver10Actual = closed;
    const toEqualOptions = { code: 1000, reason: 'peer_done' } as const;
    await expect(receiver10Actual).resolves.toEqual(toEqualOptions);
    await vi.waitFor(() => expect(proxy.activeConnections).toBe(0));
    expect(activity).toHaveLength(5);
    const receiver11Actual = activity;
    const toContainEqualOptions2 = { activeConnections: 0, kind: 'websocket' } as const;
    expect(receiver11Actual).not.toContainEqual(toContainEqualOptions2);
  });
  it('keeps a normal page-target close connection-local while browser-target loss invalidates', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const onBrowserLoss = vi.fn();
    const readyProxyOptions3 = { onBrowserLoss } as const;
    const proxy = await readyProxy(fake, readyProxyOptions3);
    const pagePathResult = pagePath();
    const page = await connect(proxy, pagePathResult);
    const pageClosed = onceClose(page);
    upstreamSocket?.close(1000, 'target_closed');
    const receiver12Actual = pageClosed;
    const toEqualOptions2 = { code: 1000, reason: 'target_closed' } as const;
    await expect(receiver12Actual).resolves.toEqual(toEqualOptions2);
    expect(onBrowserLoss).not.toHaveBeenCalled();
    const browserPathResult3 = browserPath();
    const browser = await connect(proxy, browserPathResult3);
    const browserClosed = onceClose(browser);
    upstreamSocket?.terminate();
    const receiver13Actual = browserClosed;
    const toMatchObjectOptions3 = { code: 1011 } as const;
    await expect(receiver13Actual).resolves.toMatchObject(toMatchObjectOptions3);
    await vi.waitFor(() => expect(onBrowserLoss).toHaveBeenCalledTimes(1));
  });
  it('checks identity before upgrade and reports raw Browser.close as browser loss', async () => {
    const fake = await echoFixture();
    const beforeForward = vi.fn(async () => true);
    const onBrowserLoss = vi.fn();
    const readyProxyOptions4 = { beforeForward, onBrowserLoss } as const;
    const proxy = await readyProxy(fake, readyProxyOptions4);
    const browserPathResult4 = browserPath();
    const client = await connect(proxy, browserPathResult4);
    expect(beforeForward).toHaveBeenCalledTimes(1);
    const stringifyOptions = { id: 1, method: 'Browser.close' } as const;
    const serializedValue = JSON.stringify(stringifyOptions);
    client.send(serializedValue);
    await vi.waitFor(() => expect(onBrowserLoss).toHaveBeenCalledTimes(1));
  });
  it('bounds the identity probe by the WebSocket handshake deadline', async () => {
    const fake = await echoFixture();
    const readyProxyOptions5: Partial<import('@/cdp/httpProxy.js').StartCdpHttpProxyOptions> | undefined = {
      beforeForward: async (signal) =>
        await new Promise<boolean>((resolve) => {
          if (signal.aborted) resolve(false);
          else {
            const addEventListenerOptions = { once: true } as const;
            signal.addEventListener('abort', () => resolve(false), addEventListenerOptions);
          }
        }),
      webSocketHandshakeTimeoutMs: 25,
    };
    const proxy = await readyProxy(fake, readyProxyOptions5);
    const startedAt = Date.now();
    const browserPathResult5 = browserPath();
    const failure = await connectFailure(proxy, browserPathResult5);
    expect(failure.status).toBe(504);
    const parsedValue3 = JSON.parse(failure.body);
    const receiver14Actual = parsedValue3;
    const toMatchObjectOptions4 = { error: { code: 'gateway_timeout' } } as const;
    expect(receiver14Actual).toMatchObject(toMatchObjectOptions4);
    const computedValue = Date.now() - startedAt;
    expect(computedValue).toBeLessThan(500);
  });
  it('admits exactly eight paired sockets and recovers capacity after close', async () => {
    const fake = await echoFixture();
    const proxy = await readyProxy(fake);
    const fromOptions = { length: CDP_WEBSOCKET_MAX_CONNECTIONS } as const;
    const fromResult5 = Array.from(fromOptions, async (_, index) => {
      const message4 = `/cdp/${capability}/devtools/page/page-${index}`;
      return await connect(proxy, message4);
    });
    const clients = await Promise.all(fromResult5);
    expect(proxy.activeConnections).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS);
    const message5 = `/cdp/${capability}/devtools/page/page-over-limit`;
    const ninth = await connectFailure(proxy, message5);
    expect(ninth.status).toBe(503);
    const parsedValue4 = JSON.parse(ninth.body);
    const receiver15Actual = parsedValue4;
    const toMatchObjectOptions5 = { error: { code: 'unavailable' } } as const;
    expect(receiver15Actual).toMatchObject(toMatchObjectOptions5);
    const browserPathResult6 = browserPath();
    const connectFailureOptions = {
      headers: { Host: `other.example:${proxy.port}` },
    } as const;
    const forbidden = await connectFailure(proxy, browserPathResult6, connectFailureOptions);
    expect(forbidden.status).toBe(403);
    const parsedValue5 = JSON.parse(forbidden.body);
    const receiver16Actual = parsedValue5;
    const toMatchObjectOptions6 = { error: { code: 'forbidden' } } as const;
    expect(receiver16Actual).toMatchObject(toMatchObjectOptions6);
    expect(fake.webSocketRequests).toHaveLength(CDP_WEBSOCKET_MAX_CONNECTIONS);
    clients[0]?.close();
    await vi.waitFor(() => expect(proxy.activeConnections).toBe(7));
    const message6 = `/cdp/${capability}/devtools/page/replacement`;
    const replacement = await connect(proxy, message6);
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
    const standaloneProxyOptions = { webSocketHandshakeTimeoutMs: 250 } as const;
    const proxy = await standaloneProxy(standaloneProxyOptions);
    const publishGenerationOptions = {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions);
    const fromOptions2 = { length: CDP_WEBSOCKET_MAX_CONNECTIONS } as const;
    const attempts = Array.from(fromOptions2, (_, index) => {
      const message7 = `/cdp/${capability}/devtools/page/pending-${index}`;
      return connectFailure(proxy, message7);
    });
    await vi.waitFor(() => expect(sockets.size).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS));
    const message8 = `/cdp/${capability}/devtools/page/over-limit`;
    const ninth = await connectFailure(proxy, message8);
    expect(ninth.status).toBe(503);
    expect(sockets.size).toBe(CDP_WEBSOCKET_MAX_CONNECTIONS);
    const mappedValues3 = (await Promise.all(attempts)).map((failure) => failure.status);
    const receiver17Actual = mappedValues3;
    const fromOptions3 = { length: CDP_WEBSOCKET_MAX_CONNECTIONS } as const;
    const fromResult6 = Array.from(fromOptions3, () => 504);
    expect(receiver17Actual).toEqual(fromResult6);
  });
  it('does not count refused upstream handshakes and maps handshake timeout', async () => {
    const refusedPort = await unusedPort();
    const standaloneProxyOptions2 = { webSocketHandshakeTimeoutMs: 500 } as const;
    const proxy = await standaloneProxy(standaloneProxyOptions2);
    const publishGenerationOptions2 = {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: refusedPort,
    } as const;
    publishGeneration(proxy, publishGenerationOptions2);
    const browserPathResult7 = browserPath();
    const argumentValue3 = (await connectFailure(proxy, browserPathResult7)).status;
    expect(argumentValue3).toBe(502);
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
    const publishGenerationOptions3 = {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions3);
    const browserPathResult8 = browserPath();
    const timeoutPromise = connectFailure(proxy, browserPathResult8);
    await vi.waitFor(() => expect(sockets.size).toBe(1));
    expect(proxy.activeConnections).toBe(0);
    const timeout = await timeoutPromise;
    expect(timeout.status).toBe(504);
    const parsedValue6 = JSON.parse(timeout.body);
    const receiver18Actual = parsedValue6;
    const toMatchObjectOptions7 = { error: { code: 'gateway_timeout' } } as const;
    expect(receiver18Actual).toMatchObject(toMatchObjectOptions7);
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
    const standaloneProxyOptions3 = {
      webSocketHandshakeTimeoutMs: 5000,
      webSocketShutdownTimeoutMs: 40,
    } as const;
    const proxy = await standaloneProxy(standaloneProxyOptions3);
    const publishGenerationOptions4 = {
      capability,
      upstreamHost: '127.0.0.1',
      upstreamPort: address.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions4);
    const browserPathResult9 = browserPath();
    const failurePromise = connectFailure(proxy, browserPathResult9);
    await vi.waitFor(() => expect(sockets.size).toBe(1));
    const closing = proxy.close();
    const failure = await failurePromise;
    expect(failure.status).toBe(503);
    const parsedValue7 = JSON.parse(failure.body);
    const receiver19Actual = parsedValue7;
    const toMatchObjectOptions8 = { error: { code: 'unavailable' } } as const;
    expect(receiver19Actual).toMatchObject(toMatchObjectOptions8);
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
    const readyProxyOptions6 = {
      beforeForward,
      webSocketShutdownTimeoutMs: 40,
    } as const;
    const proxy = await readyProxy(fake, readyProxyOptions6);
    const browserPathResult10 = browserPath();
    const failurePromise = connectFailure(proxy, browserPathResult10);
    await vi.waitFor(() => expect(beforeForward).toHaveBeenCalledTimes(1));
    const closing = proxy.close();
    const values10: [Promise<UpgradeFailure>, Promise<'timeout'>] = [
      failurePromise,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 150)),
    ];
    const outcome = await Promise.race(values10);
    resolveProbe?.(true);
    expect(outcome).not.toBe('timeout');
    const receiver20Actual = outcome;
    const toMatchObjectOptions9 = { status: 503 } as const;
    expect(receiver20Actual).toMatchObject(toMatchObjectOptions9);
    await expect(closing).resolves.toBeUndefined();
  });
  it('uses fixed lifecycle and abrupt-upstream close pairs without leaking details', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const proxy = await readyProxy(fake);
    const browserPathResult11 = browserPath();
    const lifecycleClient = await connect(proxy, browserPathResult11);
    const lifecycleClosed = onceClose(lifecycleClient);
    proxy.clearGeneration();
    const receiver21Actual = lifecycleClosed;
    const toEqualOptions3 = { code: 1001, reason: 'going_away' } as const;
    await expect(receiver21Actual).resolves.toEqual(toEqualOptions3);
    const publishGenerationOptions5 = {
      capability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions5);
    const browserPathResult12 = browserPath('abrupt-target');
    const abruptClient = await connect(proxy, browserPathResult12);
    const abruptClosed = onceClose(abruptClient);
    upstreamSocket?.terminate();
    const close = await abruptClosed;
    const receiver22Actual = close;
    const toEqualOptions4 = { code: 1011, reason: 'internal_error' } as const;
    expect(receiver22Actual).toEqual(toEqualOptions4);
    expect(close.reason).not.toContain('abrupt-target');
    expect(close.reason).not.toContain(capability);
  });
  it('uses protocol_error for malformed frames and message_too_big above 16 MiB', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
      socket.on('message', (data, isBinary) => {
        const sendOptions3 = { binary: isBinary } as const;
        return socket.send(data, sendOptions3);
      });
    });
    const proxy = await readyProxy(fake);
    const browserPathResult13 = browserPath('malformed');
    const malformed = await connect(proxy, browserPathResult13);
    const malformedClosed = onceClose(malformed);
    writeMalformedFrame(malformed);
    const receiver23Actual = malformedClosed;
    const toEqualOptions5 = { code: 1002, reason: 'protocol_error' } as const;
    await expect(receiver23Actual).resolves.toEqual(toEqualOptions5);
    const browserPathResult14 = browserPath('oversized');
    const oversized = await connect(proxy, browserPathResult14);
    const oversizedClosed = onceClose(oversized);
    const computedValue2 = CDP_WEBSOCKET_MAX_MESSAGE_BYTES + 1;
    const allocResult = Buffer.alloc(computedValue2);
    const sendOptions4 = { binary: true } as const;
    oversized.send(allocResult, sendOptions4);
    const receiver24Actual = oversizedClosed;
    const toEqualOptions6 = { code: 1009, reason: 'message_too_big' } as const;
    await expect(receiver24Actual).resolves.toEqual(toEqualOptions6);
    const browserPathResult15 = browserPath('upstream-oversized');
    const upstreamOversized = await connect(proxy, browserPathResult15);
    const upstreamOversizedClosed = onceClose(upstreamOversized);
    const computedValue3 = CDP_WEBSOCKET_MAX_MESSAGE_BYTES + 1;
    const allocResult2 = Buffer.alloc(computedValue3);
    const sendOptions5 = { binary: true } as const;
    upstreamSocket?.send(allocResult2, sendOptions5);
    const receiver25Actual = upstreamOversizedClosed;
    const toEqualOptions7 = {
      code: 1009,
      reason: 'message_too_big',
    } as const;
    await expect(receiver25Actual).resolves.toEqual(toEqualOptions7);
  });
  it('relays an exact 16 MiB message in both directions', async () => {
    let upstreamSocket: WebSocket | undefined;
    const fake = await fixture((socket) => {
      upstreamSocket = socket;
    });
    const proxy = await readyProxy(fake);
    const browserPathResult16 = browserPath('boundary');
    const client = await connect(proxy, browserPathResult16);
    const connectedUpstream = upstreamSocket;
    if (connectedUpstream === undefined) throw new Error('Upstream WebSocket was not connected');
    const exact = Buffer.alloc(CDP_WEBSOCKET_MAX_MESSAGE_BYTES, 0x61);
    const toUpstream = onceMessage(connectedUpstream);
    const sendOptions6 = { binary: true } as const;
    client.send(exact, sendOptions6);
    const outgoing = await toUpstream;
    expect(outgoing.data.byteLength).toBe(CDP_WEBSOCKET_MAX_MESSAGE_BYTES);
    expect(outgoing.isBinary).toBe(true);
    const fromUpstream = onceMessage(client);
    const sendOptions7 = { binary: true } as const;
    connectedUpstream.send(exact, sendOptions7);
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
    const cdpPortAllocatorOptions = { start: allocatorPort, end: allocatorPort } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions);
    const startCdpHttpProxyOptions = {
      advertisedScheme: 'http',
      allocator,
      bindHost: '127.0.0.1',
      webSocketShutdownTimeoutMs: 40,
    } as const;
    const proxy = await startCdpHttpProxy(startCdpHttpProxyOptions);
    const publishGenerationOptions6 = {
      capability,
      upstreamHost: fake.host,
      upstreamPort: fake.port,
    } as const;
    publishGeneration(proxy, publishGenerationOptions6);
    const browserPathResult17 = browserPath();
    const client = await connect(proxy, browserPathResult17);
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(client.readyState).toBe(WebSocket.OPEN);
    upstreamSocket?.pause();
    const clientClosed = onceClose(client);
    const startedAt = Date.now();
    const closing = proxy.close();
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    const propertyValue3 = 'http';
    const cdpPortAllocatorOptions2 = { start: allocatorPort, end: allocatorPort } as const;
    const cdpPortAllocator = new CdpPortAllocator(cdpPortAllocatorOptions2);
    const propertyValue4 = '127.0.0.1';
    const startCdpHttpProxyOptions2 = {
      advertisedScheme: propertyValue3,
      allocator: cdpPortAllocator,
      bindHost: propertyValue4,
    } as const;
    const earlyReuse = startCdpHttpProxy(startCdpHttpProxyOptions2).then(async (earlyProxy) => {
      await earlyProxy.close();
      return earlyProxy;
    });
    const receiver26Actual = earlyReuse;
    const toMatchObjectOptions10 = { code: systemErrorCodes.EADDRINUSE } as const;
    await expect(receiver26Actual).rejects.toMatchObject(toMatchObjectOptions10);
    await closing;
    const computedValue4 = Date.now() - startedAt;
    expect(computedValue4).toBeLessThan(500);
    const receiver27Actual = clientClosed;
    const toMatchObjectOptions11 = { code: 1001, reason: 'going_away' } as const;
    await expect(receiver27Actual).resolves.toMatchObject(toMatchObjectOptions11);
    const propertyValue5 = 'http';
    const cdpPortAllocatorOptions3 = { start: allocatorPort, end: allocatorPort } as const;
    const cdpPortAllocator2 = new CdpPortAllocator(cdpPortAllocatorOptions3);
    const propertyValue6 = '127.0.0.1';
    const startCdpHttpProxyOptions3 = {
      advertisedScheme: propertyValue5,
      allocator: cdpPortAllocator2,
      bindHost: propertyValue6,
    } as const;
    const replacement = await startCdpHttpProxy(startCdpHttpProxyOptions3);
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
    socket.on('message', (data, isBinary) => {
      const sendOptions8 = { binary: isBinary } as const;
      return socket.send(data, sendOptions8);
    });
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
  const publishGenerationOptions7 = { capability, upstreamHost: fake.host, upstreamPort: fake.port } as const;
  publishGeneration(proxy, publishGenerationOptions7);
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
async function standaloneProxy(
  options: Partial<Parameters<typeof startCdpHttpProxy>[0]> = {},
): Promise<CdpHttpProxy> {
  const port = await unusedPort();
  const propertyValue7 = 'http';
  const cdpPortAllocatorOptions4 = { start: port, end: port } as const;
  const cdpPortAllocator3 = new CdpPortAllocator(cdpPortAllocatorOptions4);
  const propertyValue8 = '127.0.0.1';
  const options7 = { ...options };
  const startCdpHttpProxyOptions4 = {
    advertisedScheme: propertyValue7,
    allocator: cdpPortAllocator3,
    bindHost: propertyValue8,
    ...options7,
  } as const;
  const proxy = await startCdpHttpProxy(startCdpHttpProxyOptions4);
  cleanup.push(async () => await proxy.close());
  return proxy;
}
async function connect(proxy: CdpHttpProxy, path: string, options: ClientOptions = {}): Promise<WebSocket> {
  const message9 = `ws://127.0.0.1:${proxy.port}${path}`;
  const socket = new WebSocket(message9, options);
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
  const message10 = `ws://127.0.0.1:${proxy.port}${path}`;
  const socket = new WebSocket(message10, options);
  cleanup.push(async () => closeWebSocket(socket));
  return await new Promise<UpgradeFailure>((resolve, reject) => {
    socket.once('open', () => {
      const error2 = new Error('Expected WebSocket upgrade failure');
      return reject(error2);
    });
    socket.once('unexpected-response', (_request, response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.once('end', () => {
        const resolveOptions = {
          body: Buffer.concat(chunks).toString(),
          headers: response.headers,
          status: response.statusCode ?? 0,
        } as const;
        return resolve(resolveOptions);
      });
      response.once('error', reject);
    });
    socket.once('error', () => undefined);
  });
}
function collectMessages(
  socket: WebSocket,
  count: number,
): Promise<
  Array<{
    data: Buffer;
    isBinary: boolean;
  }>
> {
  return new Promise((resolve, reject) => {
    const messages: Array<{
      data: Buffer;
      isBinary: boolean;
    }> = [];
    socket.on('message', (data, isBinary) => {
      const pushOptions2 = { data: Buffer.from(data as ArrayBuffer), isBinary } as const;
      messages.push(pushOptions2);
      if (messages.length === count) resolve(messages);
    });
    socket.once('error', reject);
  });
}
function onceMessage(socket: WebSocket): Promise<{
  data: Buffer;
  isBinary: boolean;
}> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data, isBinary) => {
      const resolveOptions2 = { data: Buffer.from(data as ArrayBuffer), isBinary } as const;
      return resolve(resolveOptions2);
    });
    socket.once('error', reject);
  });
}
function onceClose(socket: WebSocket): Promise<{
  code: number;
  reason: string;
}> {
  return new Promise((resolve) => {
    socket.once('close', (code, reason) => {
      const resolveOptions3 = { code, reason: reason.toString('utf8') } as const;
      return resolve(resolveOptions3);
    });
  });
}
function writeMalformedFrame(socket: WebSocket): void {
  const receiver28 = clientRawSocket(socket);
  const values11: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [0x83, 0x80, 0, 0, 0, 0];
  const fromResult7 = Buffer.from(values11);
  receiver28.write(fromResult7);
}
function clientRawSocket(socket: WebSocket): Socket {
  const rawSocket = (
    socket as unknown as {
      _socket?: Socket;
    }
  )._socket;
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
  const message11 = `GET ${path} HTTP/1.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: AAAAAAAAAAAAAAAAAAAAAA==\r\nSec-WebSocket-Version: 13\r\n\r\n`;
  return await rawUpgradeRequest(port, message11);
}
async function rawUpgradeRequest(port: number, request: string): Promise<UpgradeFailure> {
  return await new Promise<UpgradeFailure>((resolve, reject) => {
    const createConnectionOptions = { host: '127.0.0.1', port } as const;
    const socket = createConnection(createConnectionOptions);
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
        if (index !== -1)
          (() => {
            const computedValue5 = index + 1;
            return (headers[line.slice(0, index).toLowerCase()] = line.slice(computedValue5).trim());
          })();
      }
      const computedValue6 = separator + 4;
      const sliceResult = raw.slice(computedValue6);
      const currentHeaders = headers;
      const computedValue7 = lines[0]?.split(' ')[1] ?? 0;
      const numberResult = Number(computedValue7);
      const resolveOptions4 = {
        body: sliceResult,
        headers: currentHeaders,
        status: numberResult,
      } as const;
      resolve(resolveOptions4);
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
