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
  await Promise.allSettled(
    cleanup
      .splice(0)
      .reverse()
      .map(async (close) => await close()),
  );
});

describe('managed CDP bootstrap integration', () => {
  it('hands the reserved port to the lazy browser and verifies external readiness', async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-cdp-bootstrap-'));
    cleanup.push(async () => rmSync(tempRoot, { recursive: true, force: true }));
    const externalPort = await unusedPort();
    let internalPort = 0;
    let challengeValue: string | undefined;
    let fake: FakeChromiumCdpServer | undefined;

    const callTool = vi.fn(async (name: string, arguments_: Record<string, unknown>) => {
      if (name === 'browser_tabs') {
        fake = await startFakeChromiumCdp(
          (request, response) => {
            if (request.url === '/json/version' || request.url === '/json/version/') {
              response.end(
                JSON.stringify({
                  webSocketDebuggerUrl: `ws://127.0.0.1:${internalPort}/devtools/browser/browser-id`,
                }),
              );
              return;
            }
            response.end(
              JSON.stringify([
                {
                  id: 'page-id',
                  type: 'page',
                  webSocketDebuggerUrl: `ws://127.0.0.1:${internalPort}/devtools/page/page-id`,
                },
              ]),
            );
          },
          (socket) => {
            socket.on('message', (data) => {
              const request = JSON.parse(Buffer.from(data as ArrayBuffer).toString()) as { id: number };
              const value = challengeValue;
              challengeValue = undefined;
              socket.send(JSON.stringify({ id: request.id, result: { result: { value } } }));
            });
          },
          { port: internalPort },
        );
        return {};
      }

      const functionValue = arguments_.function;
      const source = typeof functionValue === 'string' ? functionValue : '';
      const assignment = /globalThis\[("[^"]+")\] = ("[^"]+")/u.exec(source);
      if (assignment !== null) challengeValue = JSON.parse(assignment[2] ?? 'null') as string;
      else challengeValue = undefined;
      return {};
    });

    const session = await startManagedCdpSession({
      createProxy: async () =>
        await startCdpHttpProxy({
          advertisedScheme: 'http',
          allocator: new CdpPortAllocator({ start: externalPort, end: externalPort }),
          bindHost: '127.0.0.1',
        }),
      reserveInternalPort: async () => await reserveInternalCdpPort(),
      prepareRuntime: async ({ internalPort: selectedPort }) => {
        internalPort = selectedPort;
        await expectPortReserved(selectedPort);
        const runtime = await prepareBridgeRuntime({
          tempRoot,
          managedCdpInternalPort: selectedPort,
          env: {
            PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
            PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(tempRoot, 'output'),
          },
        });
        expect(runtime.config.browser?.launchOptions?.args).toContain(
          `--remote-debugging-port=${selectedPort}`,
        );
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
        const unavailable = await fetch(`${discoveryUrl}/json/version/`, { signal });
        expect(unavailable.status).toBe(503);
        const response = await fetch(`${discoveryUrl}/json/version/`, { headers, signal });
        const version = (await response.json()) as { webSocketDebuggerUrl?: string };
        expect(response.status).toBe(200);
        expect(version.webSocketDebuggerUrl).toBe(
          `ws://127.0.0.1:${proxy.port}/cdp/${capability}/devtools/browser/browser-id`,
        );
        return discoveryUrl;
      },
    });
    cleanup.push(async () => await session.dispose());

    expect(session.snapshot()).toMatchObject({ generation: 1, state: 'ready' });
    expect(callTool.mock.calls.map(([name]) => name)).toEqual(['browser_tabs', 'browser_evaluate']);
    expect(challengeValue).toBeUndefined();
    expect(fake?.requests.at(-1)?.headers).not.toHaveProperty('x-cloakbrowser-cdp-readiness');
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
  await expect(bindPort(port)).rejects.toMatchObject({ code: 'EADDRINUSE' });
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
