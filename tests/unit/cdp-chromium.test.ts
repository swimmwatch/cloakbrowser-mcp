import { createServer as createNetServer } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createChromiumCdpClient,
  readAndDeletePageChallenge,
  readChromiumDiscovery,
  reserveInternalCdpPort,
} from '@/cdp/chromium.js';
import { type FakeChromiumCdpServer, startFakeChromiumCdp } from '@tests/fixtures/fake-chromium-cdp.js';

const cleanup: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('internal Chromium CDP helpers', () => {
  it('reserves a concrete loopback port until explicitly released', async () => {
    const reservation = await reserveInternalCdpPort();
    cleanup.push(async () => await reservation.close());

    expect(reservation.host).toBe('127.0.0.1');
    expect(reservation.port).toBeGreaterThan(0);
    await expect(bindPort(reservation.port)).rejects.toMatchObject({ code: 'EADDRINUSE' });

    await reservation.close();
    const replacement = await bindPort(reservation.port);
    cleanup.push(async () => await closeServer(replacement));
  });

  it('accepts only discovery URLs owned by the selected loopback endpoint', async () => {
    const fake: FakeChromiumCdpServer = await startFakeChromiumCdp((request, response) => {
      if (request.url === '/json/version') {
        response.end(
          JSON.stringify({
            webSocketDebuggerUrl: `ws://${fake.host}:${fake.port}/devtools/browser/browser-id`,
          }),
        );
        return;
      }
      response.end(
        JSON.stringify([
          {
            id: 'page-id',
            type: 'page',
            webSocketDebuggerUrl: `ws://${fake.host}:${fake.port}/devtools/page/page-id`,
          },
        ]),
      );
    });
    cleanup.push(async () => await fake.close());

    await expect(readChromiumDiscovery(fake.host, fake.port, AbortSignal.timeout(1_000))).resolves.toEqual({
      browserWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/browser/browser-id`,
      pageWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/page/page-id`,
    });

    const substituted = await startFakeChromiumCdp((_request, response) => {
      response.end(JSON.stringify({ webSocketDebuggerUrl: 'ws://127.0.0.1:9/devtools/browser/substituted' }));
    });
    cleanup.push(async () => await substituted.close());
    await expect(
      readChromiumDiscovery(substituted.host, substituted.port, AbortSignal.timeout(1_000)),
    ).rejects.toThrow('selected internal endpoint');
  });

  it('retries transient connection refusal until Chromium starts listening', async () => {
    const reservation = await reserveInternalCdpPort();
    const port = reservation.port;
    await reservation.close();
    let fake: FakeChromiumCdpServer | undefined;
    const started = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void startFakeChromiumCdp(
          (request, response) => {
            if (request.url === '/json/version') {
              response.end(
                JSON.stringify({
                  webSocketDebuggerUrl: `ws://127.0.0.1:${String(port)}/devtools/browser/browser-id`,
                }),
              );
              return;
            }
            response.end(
              JSON.stringify([
                {
                  id: 'page-id',
                  type: 'page',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${String(port)}/devtools/page/page-id`,
                },
              ]),
            );
          },
          undefined,
          { port },
        ).then((server) => {
          fake = server;
          cleanup.push(async () => await server.close());
          resolve();
        }, reject);
      }, 50).unref();
    });

    const discovery = createChromiumCdpClient('127.0.0.1', port).discover(AbortSignal.timeout(2_000));
    await started;
    await expect(discovery).resolves.toEqual({
      browserWebSocketUrl: `ws://127.0.0.1:${String(port)}/devtools/browser/browser-id`,
      pageWebSocketUrl: `ws://127.0.0.1:${String(port)}/devtools/page/page-id`,
    });
    expect(fake).toBeDefined();
  });

  it('reads and deletes the one-use challenge through the page target', async () => {
    let expression = '';
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.on('message', (data) => {
          const request = JSON.parse(Buffer.from(data as ArrayBuffer).toString()) as {
            id: number;
            params: { expression: string };
          };
          expression = request.params.expression;
          socket.send(JSON.stringify({ id: request.id, result: { result: { value: 'challenge-value' } } }));
        });
      },
    );
    cleanup.push(async () => await fake.close());

    await expect(
      readAndDeletePageChallenge(
        `ws://${fake.host}:${fake.port}/devtools/page/page-id`,
        '__cloak_mcp_challenge',
        AbortSignal.timeout(1_000),
      ),
    ).resolves.toBe('challenge-value');
    expect(expression).toContain('delete globalThis[propertyName]');
    expect(expression).toContain('__cloak_mcp_challenge');
  });
});

async function bindPort(port: number): Promise<ReturnType<typeof createNetServer>> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

async function closeServer(server: ReturnType<typeof createNetServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}
