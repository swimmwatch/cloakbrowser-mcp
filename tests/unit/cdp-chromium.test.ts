import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
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
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
});
describe('internal Chromium CDP helpers', () => {
  it('reserves a concrete loopback port until explicitly released', async () => {
    const reservation = await reserveInternalCdpPort();
    cleanup.push(async () => await reservation.close());
    expect(reservation.host).toBe('127.0.0.1');
    expect(reservation.port).toBeGreaterThan(0);
    const bindPortResult = bindPort(reservation.port);
    const receiverActual = bindPortResult;
    const toMatchObjectOptions = { code: systemErrorCodes.EADDRINUSE } as const;
    await expect(receiverActual).rejects.toMatchObject(toMatchObjectOptions);
    await reservation.close();
    const replacement = await bindPort(reservation.port);
    cleanup.push(async () => await closeServer(replacement));
  });
  it('accepts only discovery URLs owned by the selected loopback endpoint', async () => {
    const fake: FakeChromiumCdpServer = await startFakeChromiumCdp((request, response) => {
      if (request.url === '/json/version') {
        const stringifyOptions = {
          webSocketDebuggerUrl: `ws://${fake.host}:${fake.port}/devtools/browser/browser-id`,
        } as const;
        const serializedValue = JSON.stringify(stringifyOptions);
        response.end(serializedValue);
        return;
      }
      const values = [
        {
          id: 'page-id',
          type: 'page',
          webSocketDebuggerUrl: `ws://${fake.host}:${fake.port}/devtools/page/page-id`,
        },
      ];
      const serializedValue2 = JSON.stringify(values);
      response.end(serializedValue2);
    });
    cleanup.push(async () => await fake.close());
    const argumentValue = fake.host;
    const argumentValue2 = fake.port;
    const timeoutResult = AbortSignal.timeout(1000);
    const chromiumDiscoveryResult = readChromiumDiscovery(argumentValue, argumentValue2, timeoutResult);
    const receiver2Actual = chromiumDiscoveryResult;
    const toEqualOptions = {
      browserWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/browser/browser-id`,
      pageWebSocketUrl: `ws://${fake.host}:${fake.port}/devtools/page/page-id`,
    } as const;
    await expect(receiver2Actual).resolves.toEqual(toEqualOptions);
    const substituted = await startFakeChromiumCdp((_request, response) => {
      const stringifyOptions2 = {
        webSocketDebuggerUrl: 'ws://127.0.0.1:9/devtools/browser/substituted',
      } as const;
      const serializedValue3 = JSON.stringify(stringifyOptions2);
      response.end(serializedValue3);
    });
    cleanup.push(async () => await substituted.close());
    const argumentValue3 = substituted.host;
    const argumentValue4 = substituted.port;
    const timeoutResult2 = AbortSignal.timeout(1000);
    const chromiumDiscoveryResult2 = readChromiumDiscovery(argumentValue3, argumentValue4, timeoutResult2);
    await expect(chromiumDiscoveryResult2).rejects.toThrow('selected internal endpoint');
  });
  it('retries transient connection refusal until Chromium starts listening', async () => {
    const reservation = await reserveInternalCdpPort();
    const port = reservation.port;
    await reservation.close();
    let fake: FakeChromiumCdpServer | undefined;
    const started = new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        void (() => {
          const startFakeChromiumCdpOptions = { port } as const;
          return startFakeChromiumCdp(
            (request, response) => {
              if (request.url === '/json/version') {
                const stringifyOptions3 = {
                  webSocketDebuggerUrl: `ws://127.0.0.1:${String(port)}/devtools/browser/browser-id`,
                } as const;
                const serializedValue4 = JSON.stringify(stringifyOptions3);
                response.end(serializedValue4);
                return;
              }
              const values2 = [
                {
                  id: 'page-id',
                  type: 'page',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${String(port)}/devtools/page/page-id`,
                },
              ];
              const serializedValue5 = JSON.stringify(values2);
              response.end(serializedValue5);
            },
            undefined,
            startFakeChromiumCdpOptions,
          ).then((server) => {
            fake = server;
            cleanup.push(async () => await server.close());
            resolve();
          }, reject);
        })();
      }, 50).unref();
    });
    const receiver3 = createChromiumCdpClient('127.0.0.1', port);
    const timeoutResult3 = AbortSignal.timeout(2000);
    const discovery = receiver3.discover(timeoutResult3);
    await started;
    const receiver4Actual = discovery;
    const toEqualOptions2 = {
      browserWebSocketUrl: `ws://127.0.0.1:${String(port)}/devtools/browser/browser-id`,
      pageWebSocketUrl: `ws://127.0.0.1:${String(port)}/devtools/page/page-id`,
    } as const;
    await expect(receiver4Actual).resolves.toEqual(toEqualOptions2);
    expect(fake).toBeDefined();
  });
  it('reads and deletes the one-use challenge through the page target', async () => {
    let expression = '';
    const fake = await startFakeChromiumCdp(
      (_request, response) => response.end(),
      (socket) => {
        socket.on('message', (data) => {
          const toStringResult = Buffer.from(data as ArrayBuffer).toString();
          const request = JSON.parse(toStringResult) as {
            id: number;
            params: {
              expression: string;
            };
          };
          expression = request.params.expression;
          const stringifyOptions4 = {
            id: request.id,
            result: { result: { value: 'challenge-value' } },
          } as const;
          const serializedValue6 = JSON.stringify(stringifyOptions4);
          socket.send(serializedValue6);
        });
      },
    );
    cleanup.push(async () => await fake.close());
    const message = `ws://${fake.host}:${fake.port}/devtools/page/page-id`;
    const timeoutResult4 = AbortSignal.timeout(1000);
    const andDeletePageChallengeResult = readAndDeletePageChallenge(
      message,
      '__cloak_mcp_challenge',
      timeoutResult4,
    );
    await expect(andDeletePageChallengeResult).resolves.toBe('challenge-value');
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
