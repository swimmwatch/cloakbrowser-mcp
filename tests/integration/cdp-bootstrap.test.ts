import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { CdpPortAllocator } from '@/cdp/allocator.js';
import { createChromiumCdpClient, reserveInternalCdpPort } from '@/cdp/chromium.js';
import { startCdpHttpProxy } from '@/cdp/httpProxy.js';
import { startManagedCdpSession } from '@/cdp/session.js';
import { type FakeChromiumCdpServer, startFakeChromiumCdp } from '@tests/fixtures/fake-chromium-cdp.js';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
});
describe('managed CDP bootstrap integration', () => {
  it('hands the reserved port to the lazy browser and verifies external readiness', async () => {
    const tmpdirResult = tmpdir();
    const joinedPath = path.join(tmpdirResult, 'cloakbrowser-cdp-bootstrap-');
    const tempRoot = mkdtempSync(joinedPath);
    cleanup.push(async () => {
      const rmSyncOptions = { recursive: true, force: true } as const;
      return rmSync(tempRoot, rmSyncOptions);
    });
    const externalPort = await unusedPort();
    let internalPort = 0;
    let challengeValue: string | undefined;
    let fake: FakeChromiumCdpServer | undefined;
    const callTool = vi.fn(async (name: string, arguments_: Record<string, unknown>) => {
      if (name === 'browser_tabs') {
        fake = await (() => {
          const startFakeChromiumCdpOptions = { port: internalPort } as const;
          return startFakeChromiumCdp(
            (request, response) => {
              if (request.url === '/json/version' || request.url === '/json/version/') {
                const stringifyOptions = {
                  webSocketDebuggerUrl: `ws://127.0.0.1:${internalPort}/devtools/browser/browser-id`,
                } as const;
                const serializedValue = JSON.stringify(stringifyOptions);
                response.end(serializedValue);
                return;
              }
              const values = [
                {
                  id: 'page-id',
                  type: 'page',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${internalPort}/devtools/page/page-id`,
                },
              ];
              const serializedValue2 = JSON.stringify(values);
              response.end(serializedValue2);
            },
            (socket) => {
              socket.on('message', (data) => {
                const toStringResult = Buffer.from(data as ArrayBuffer).toString();
                const request = JSON.parse(toStringResult) as {
                  id: number;
                };
                const value = challengeValue;
                challengeValue = undefined;
                const stringifyOptions2 = { id: request.id, result: { result: { value } } } as const;
                const serializedValue3 = JSON.stringify(stringifyOptions2);
                socket.send(serializedValue3);
              });
            },
            startFakeChromiumCdpOptions,
          );
        })();
        return {};
      }
      const functionValue = arguments_.function;
      const source = typeof functionValue === 'string' ? functionValue : '';
      const assignment = /globalThis\[("[^"]+")\] = ("[^"]+")/u.exec(source);
      if (assignment !== null) {
        const computedValue = assignment[2] ?? 'null';
        challengeValue = JSON.parse(computedValue) as string;
      } else challengeValue = undefined;
      return {};
    });
    const startManagedCdpSessionOptions: import('@/cdp/session.js').ManagedCdpSessionDependencies = {
      createProxy: async () => {
        const propertyValue = 'http';
        const cdpPortAllocatorOptions = { start: externalPort, end: externalPort } as const;
        const cdpPortAllocator = new CdpPortAllocator(cdpPortAllocatorOptions);
        const propertyValue2 = '127.0.0.1';
        const startCdpHttpProxyOptions = {
          advertisedScheme: propertyValue,
          allocator: cdpPortAllocator,
          bindHost: propertyValue2,
        } as const;
        return await startCdpHttpProxy(startCdpHttpProxyOptions);
      },
      reserveInternalPort: async () => await reserveInternalCdpPort(),
      prepareRuntime: async ({ internalPort: selectedPort }) => {
        internalPort = selectedPort;
        await expectPortReserved(selectedPort);
        const prepareBridgeRuntimeOptions = {
          tempRoot,
          managedCdpInternalPort: selectedPort,
          env: {
            PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
            PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(tempRoot, 'output'),
          },
        } as const;
        const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions);
        const receiverActual = runtime.config.browser?.launchOptions?.args;
        const message = `--remote-debugging-port=${selectedPort}`;
        expect(receiverActual).toContain(message);
        return runtime;
      },
      connectUpstream: async () => {
        await expectPortReserved(internalPort);
        return {
          callTool,
          dispose: async () => {
            await fake?.close();
            fake = undefined;
          },
          listTools: async () => ({ tools: [] }),
        };
      },
      createChromiumClient: ({ host, port }) => createChromiumCdpClient(host, port),
      verifyExternal: async ({ capability, headers, proxy, signal }) => {
        const discoveryUrl = `http://127.0.0.1:${proxy.port}/cdp/${capability}`;
        const message2 = `${discoveryUrl}/json/version/`;
        const fetchOptions = { signal } as const;
        const unavailable = await fetch(message2, fetchOptions);
        expect(unavailable.status).toBe(503);
        const message3 = `${discoveryUrl}/json/version/`;
        const fetchOptions2 = { headers, signal } as const;
        const response = await fetch(message3, fetchOptions2);
        const version = (await response.json()) as {
          webSocketDebuggerUrl?: string;
        };
        expect(response.status).toBe(200);
        const receiver2Actual = version.webSocketDebuggerUrl;
        const message4 = `ws://127.0.0.1:${proxy.port}/cdp/${capability}/devtools/browser/browser-id`;
        expect(receiver2Actual).toBe(message4);
        return discoveryUrl;
      },
    };
    const session = await startManagedCdpSession(startManagedCdpSessionOptions);
    cleanup.push(async () => await session.dispose());
    const snapshotResult = session.snapshot();
    const receiver3Actual = snapshotResult;
    const toMatchObjectOptions = { generation: 1, state: 'ready' } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions);
    const mappedValues2 = callTool.mock.calls.map(([name]) => name);
    const receiver4Actual = mappedValues2;
    const values2: string[] = ['browser_tabs', 'browser_evaluate'];
    expect(receiver4Actual).toEqual(values2);
    expect(challengeValue).toBeUndefined();
    const argumentValue = fake?.requests.at(-1)?.headers;
    expect(argumentValue).not.toHaveProperty('x-cloakbrowser-cdp-readiness');
  });
});
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
async function expectPortReserved(port: number): Promise<void> {
  const bindPortResult = bindPort(port);
  const receiver5Actual = bindPortResult;
  const toMatchObjectOptions2 = { code: systemErrorCodes.EADDRINUSE } as const;
  await expect(receiver5Actual).rejects.toMatchObject(toMatchObjectOptions2);
}
async function bindPort(port: number): Promise<void> {
  const server = createNetServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}
