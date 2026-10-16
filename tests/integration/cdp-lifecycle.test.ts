import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';
import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';
const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
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
    const propertyValue = 'http';
    const cdpPortAllocatorOptions = { start: externalPort, end: externalPort } as const;
    const cdpPortAllocator = new CdpPortAllocator(cdpPortAllocatorOptions);
    const propertyValue2 = '127.0.0.1';
    const currentOnBrowserLoss = onBrowserLoss;
    const startCdpHttpProxyOptions = {
      advertisedScheme: propertyValue,
      allocator: cdpPortAllocator,
      bindHost: propertyValue2,
      onBrowserLoss: currentOnBrowserLoss,
    } as const;
    const proxy = await startCdpHttpProxy(startCdpHttpProxyOptions);
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
  const message = `ws://127.0.0.1:${proxy.port}/cdp/${capability}/devtools/browser/rejected`;
  const socket = new WebSocket(message);
  cleanup.push(async () => closeWebSocket(socket));
  return await new Promise<number>((resolve, reject) => {
    socket.once('open', () => {
      const error2 = new Error('Expected WebSocket upgrade rejection');
      return reject(error2);
    });
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      response.once('end', () => {
        const computedValue = response.statusCode ?? 0;
        return resolve(computedValue);
      });
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
