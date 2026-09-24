import { request as createHttpsRequest } from 'node:https';
import { createServer as createNetServer } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';
import { type FakeChromiumCdpServer, startFakeChromiumCdp } from '@tests/fixtures/fake-chromium-cdp.js';
import { startTestTlsTerminator, type TestTlsTerminator } from '@tests/helpers/tls-terminator.js';

const capability = 'CQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQk';
const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('operator TLS termination for managed CDP', () => {
  it('serves HTTPS and WSS while both internal hops remain plaintext', async () => {
    const fake = await startFakeChromiumCdp(
      (request, response) => {
        if (request.url !== '/json/version') {
          response.writeHead(404).end();
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(
          JSON.stringify({
            webSocketDebuggerUrl: `ws://${request.headers.host}/devtools/browser/browser-id`,
          }),
        );
      },
      (socket) => socket.on('message', (data, isBinary) => socket.send(data, { binary: isBinary })),
    );
    cleanup.push(async () => await fake.close());

    const externalPort = await unusedPort();
    const proxy = await startCdpHttpProxy({
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      allocator: new CdpPortAllocator({ start: externalPort, end: externalPort }),
      bindHost: '127.0.0.1',
    });
    cleanup.push(async () => await proxy.close());
    publish(proxy, fake);

    const terminator = await startTestTlsTerminator(proxy.port);
    cleanup.push(async () => await terminator.close());
    const authority = `cdp.example.test:${proxy.port}`;
    const discoveryPath = `/cdp/${capability}/json/version`;

    const discovery = await requestHttps(terminator, discoveryPath, {
      Host: authority,
      Origin: `https://${authority}`,
    });
    expect(discovery.status).toBe(200);
    expect(JSON.parse(discovery.body)).toMatchObject({
      webSocketDebuggerUrl: `wss://${authority}/cdp/${capability}/devtools/browser/browser-id`,
    });
    expect(terminator.requests[0]).toMatchObject({
      headers: { host: authority, origin: `https://${authority}` },
      method: 'GET',
      url: discoveryPath,
    });
    expect(fake.requests[0]).toMatchObject({
      headers: { host: `${fake.host}:${fake.port}` },
      method: 'GET',
      url: '/json/version',
    });

    const denied = await requestHttps(terminator, discoveryPath, { Host: 'wrong.example.test' });
    expect(denied.status).toBe(403);
    expect(fake.requests).toHaveLength(1);

    const webSocketPath = `/cdp/${capability}/devtools/browser/browser-id`;
    const client = await connectWss(terminator, webSocketPath, authority);
    cleanup.push(async () => closeWebSocket(client));
    const echoed = onceMessage(client);
    client.send('through-tls');
    await expect(echoed).resolves.toBe('through-tls');
    expect(terminator.upgrades[0]).toMatchObject({
      headers: { host: authority, origin: `https://${authority}` },
      url: webSocketPath,
    });
    expect(fake.webSocketRequests[0]).toMatchObject({
      headers: { host: `${fake.host}:${fake.port}` },
      url: '/devtools/browser/browser-id',
    });

    const rejected = await connectWssFailure(
      terminator,
      webSocketPath,
      authority,
      'https://wrong.example.test',
    );
    expect(rejected).toBe(403);
    expect(fake.webSocketRequests).toHaveLength(1);
  });
});

function publish(proxy: CdpHttpProxy, fake: FakeChromiumCdpServer): void {
  const generation = {
    capability,
    upstreamHost: fake.host,
    upstreamPort: fake.port,
  };
  proxy.stageGeneration(generation);
  proxy.publishGeneration(generation);
}

async function requestHttps(
  terminator: TestTlsTerminator,
  path: string,
  headers: Record<string, string>,
): Promise<{ body: string; status: number }> {
  return await new Promise((resolve, reject) => {
    const request = createHttpsRequest(
      {
        headers,
        host: terminator.host,
        method: 'GET',
        path,
        port: terminator.port,
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.once('end', () => {
          resolve({ body: Buffer.concat(chunks).toString(), status: response.statusCode ?? 0 });
        });
        response.once('error', reject);
      },
    );
    request.once('error', reject);
    request.end();
  });
}

async function connectWss(
  terminator: TestTlsTerminator,
  path: string,
  authority: string,
): Promise<WebSocket> {
  const socket = new WebSocket(`wss://${terminator.host}:${terminator.port}${path}`, {
    headers: { Host: authority, Origin: `https://${authority}` },
    rejectUnauthorized: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return socket;
}

async function connectWssFailure(
  terminator: TestTlsTerminator,
  path: string,
  authority: string,
  origin: string,
): Promise<number> {
  const socket = new WebSocket(`wss://${terminator.host}:${terminator.port}${path}`, {
    headers: { Host: authority, Origin: origin },
    rejectUnauthorized: false,
  });
  return await new Promise<number>((resolve, reject) => {
    socket.once('open', () => reject(new Error('Expected WSS upgrade to be rejected')));
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
    });
    socket.once('error', () => undefined);
  });
}

function onceMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(Buffer.from(data as ArrayBuffer).toString()));
    socket.once('error', reject);
  });
}

async function closeWebSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', resolve);
    socket.close();
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
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  return address.port;
}
