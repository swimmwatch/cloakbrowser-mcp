import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';

const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';
const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('CDP generation lifecycle', () => {
  it('keeps the generation ready when Chromium rejects one WebSocket route with 4xx', async () => {
    const upstream = createHttpServer();
    upstream.on('upgrade', (_request, socket) => {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    });
    await listen(upstream);
    cleanup.push(async () => await closeServer(upstream));

    const upstreamAddress = upstream.address();
    if (upstreamAddress === null || typeof upstreamAddress === 'string') {
      throw new Error('Expected TCP upstream address');
    }

    const externalPort = await unusedPort();
    const onBrowserLoss = vi.fn();
    const proxy = await startCdpHttpProxy({
      advertisedScheme: 'http',
      allocator: new CdpPortAllocator({ start: externalPort, end: externalPort }),
      bindHost: '127.0.0.1',
      onBrowserLoss,
    });
    cleanup.push(async () => await proxy.close());
    publishGeneration(proxy, upstreamAddress.port);

    const status = await rejectedUpgrade(proxy);

    expect(status).toBe(404);
    expect(onBrowserLoss).not.toHaveBeenCalled();
  });
});

function publishGeneration(proxy: CdpHttpProxy, upstreamPort: number): void {
  const generation = {
    capability,
    upstreamHost: '127.0.0.1',
    upstreamPort,
  };
  proxy.stageGeneration(generation);
  proxy.publishGeneration(generation);
}

async function rejectedUpgrade(proxy: CdpHttpProxy): Promise<number> {
  const socket = new WebSocket(`ws://127.0.0.1:${proxy.port}/cdp/${capability}/devtools/browser/rejected`);
  cleanup.push(async () => closeWebSocket(socket));

  return await new Promise<number>((resolve, reject) => {
    socket.once('open', () => reject(new Error('Expected WebSocket upgrade rejection')));
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode ?? 0));
      response.once('error', reject);
    });
    socket.once('error', () => undefined);
  });
}

async function unusedPort(): Promise<number> {
  const server = createNetServer();
  await listen(server);
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Expected TCP address');
  await closeServer(server);
  return address.port;
}

async function listen(
  server: ReturnType<typeof createHttpServer> | ReturnType<typeof createNetServer>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

async function closeServer(
  server: ReturnType<typeof createHttpServer> | ReturnType<typeof createNetServer>,
): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

async function closeWebSocket(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    socket.once('close', resolve);
    socket.terminate();
  });
}
