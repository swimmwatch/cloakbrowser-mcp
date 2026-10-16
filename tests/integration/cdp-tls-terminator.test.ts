import { request as createHttpsRequest } from 'node:https';
import { createServer as createNetServer } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { CdpPortAllocator } from '@/cdp/allocator.js';
import { type CdpHttpProxy, startCdpHttpProxy } from '@/cdp/httpProxy.js';
import { type FakeChromiumCdpServer, startFakeChromiumCdp } from '@tests/fixtures/fake-chromium-cdp.js';
import { startTestTlsTerminator, type TestTlsTerminator } from '@tests/helpers/tls-terminator.js';
import { tlsCertificate } from '@tests/helpers/tls.js';
const capability = 'CQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQk';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  const mappedValues = cleanup
    .splice(0)
    .reverse()
    .map(async (close) => await close());
  await Promise.allSettled(mappedValues);
});
describe('operator TLS termination for managed CDP', () => {
  it('requires a trusted certificate and verifies the TLS peer hostname', async () => {
    const unusedUpstreamPort = 1;
    const terminator = await startTestTlsTerminator(unusedUpstreamPort);
    cleanup.push(async () => await terminator.close());
    const cases = [
      { ca: undefined, servername: 'localhost', code: 'DEPTH_ZERO_SELF_SIGNED_CERT' },
      { ca: tlsCertificate, servername: 'wrong.example.test', code: 'ERR_TLS_CERT_ALTNAME_INVALID' },
    ];
    for (const { ca, servername, code } of cases) {
      const result = new Promise<void>((resolve, reject) => {
        const options = { host: terminator.host, port: terminator.port, ca, servername };
        const request = createHttpsRequest(options, (response) => {
          response.resume();
          resolve();
        });
        request.once('error', reject);
        request.end();
      });
      const expected = { code };
      await expect(result).rejects.toMatchObject(expected);
    }
    expect(terminator.requests).toHaveLength(0);
    expect(terminator.upgrades).toHaveLength(0);
  });
  it('serves HTTPS and WSS while both internal hops remain plaintext', async () => {
    const fake = await startFakeChromiumCdp(
      (request, response) => {
        if (request.url !== '/json/version') {
          response.writeHead(404).end();
          return;
        }
        const writeHeadOptions = { 'content-type': 'application/json' } as const;
        response.writeHead(200, writeHeadOptions);
        const stringifyOptions = {
          webSocketDebuggerUrl: `ws://${request.headers.host}/devtools/browser/browser-id`,
        } as const;
        const serializedValue = JSON.stringify(stringifyOptions);
        response.end(serializedValue);
      },
      (socket) =>
        socket.on('message', (data, isBinary) => {
          const sendOptions = { binary: isBinary } as const;
          return socket.send(data, sendOptions);
        }),
    );
    cleanup.push(async () => await fake.close());
    const externalPort = await unusedPort();
    const propertyValue = 'cdp.example.test';
    const propertyValue2 = 'https';
    const cdpPortAllocatorOptions = { start: externalPort, end: externalPort } as const;
    const cdpPortAllocator = new CdpPortAllocator(cdpPortAllocatorOptions);
    const propertyValue3 = '127.0.0.1';
    const startCdpHttpProxyOptions = {
      advertisedHost: propertyValue,
      advertisedScheme: propertyValue2,
      allocator: cdpPortAllocator,
      bindHost: propertyValue3,
    } as const;
    const proxy = await startCdpHttpProxy(startCdpHttpProxyOptions);
    cleanup.push(async () => await proxy.close());
    publish(proxy, fake);
    const terminator = await startTestTlsTerminator(proxy.port);
    cleanup.push(async () => await terminator.close());
    const authority = `cdp.example.test:${proxy.port}`;
    const discoveryPath = `/cdp/${capability}/json/version`;
    const requestHttpsOptions = {
      Host: authority,
      Origin: `https://${authority}`,
    } as const;
    const discovery = await requestHttps(terminator, discoveryPath, requestHttpsOptions);
    expect(discovery.status).toBe(200);
    const parsedValue = JSON.parse(discovery.body);
    const receiverActual = parsedValue;
    const toMatchObjectOptions = {
      webSocketDebuggerUrl: `wss://${authority}/cdp/${capability}/devtools/browser/browser-id`,
    } as const;
    expect(receiverActual).toMatchObject(toMatchObjectOptions);
    const receiver2Actual = terminator.requests[0];
    const toMatchObjectOptions2 = {
      headers: { host: authority, origin: `https://${authority}` },
      method: 'GET',
      url: discoveryPath,
    } as const;
    expect(receiver2Actual).toMatchObject(toMatchObjectOptions2);
    const receiver3Actual = fake.requests[0];
    const toMatchObjectOptions3 = {
      headers: { host: `${fake.host}:${fake.port}` },
      method: 'GET',
      url: '/json/version',
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions3);
    const requestHttpsOptions2 = { Host: 'wrong.example.test' } as const;
    const denied = await requestHttps(terminator, discoveryPath, requestHttpsOptions2);
    expect(denied.status).toBe(403);
    expect(fake.requests).toHaveLength(1);
    const webSocketPath = `/cdp/${capability}/devtools/browser/browser-id`;
    const client = await connectWss(terminator, webSocketPath, authority);
    cleanup.push(async () => closeWebSocket(client));
    const echoed = onceMessage(client);
    client.send('through-tls');
    await expect(echoed).resolves.toBe('through-tls');
    const receiver4Actual = terminator.upgrades[0];
    const toMatchObjectOptions4 = {
      headers: { host: authority, origin: `https://${authority}` },
      url: webSocketPath,
    } as const;
    expect(receiver4Actual).toMatchObject(toMatchObjectOptions4);
    const receiver5Actual = fake.webSocketRequests[0];
    const toMatchObjectOptions5 = {
      headers: { host: `${fake.host}:${fake.port}` },
      url: '/devtools/browser/browser-id',
    } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions5);
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
): Promise<{
  body: string;
  status: number;
}> {
  return await new Promise((resolve, reject) => {
    const createHttpsRequestOptions = {
      headers,
      host: terminator.host,
      method: 'GET',
      path,
      port: terminator.port,
      ca: tlsCertificate,
      servername: 'localhost',
    } as const;
    const request = createHttpsRequest(createHttpsRequestOptions, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.once('end', () => {
        const resolveOptions = {
          body: Buffer.concat(chunks).toString(),
          status: response.statusCode ?? 0,
        } as const;
        resolve(resolveOptions);
      });
      response.once('error', reject);
    });
    request.once('error', reject);
    request.end();
  });
}
async function connectWss(
  terminator: TestTlsTerminator,
  path: string,
  authority: string,
): Promise<WebSocket> {
  const message = `wss://${terminator.host}:${terminator.port}${path}`;
  const webSocketOptions = {
    headers: { Host: authority, Origin: `https://${authority}` },
    ca: tlsCertificate,
    servername: 'localhost',
  } as const;
  const socket = new WebSocket(message, webSocketOptions);
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
  const message2 = `wss://${terminator.host}:${terminator.port}${path}`;
  const webSocketOptions2 = {
    headers: { Host: authority, Origin: origin },
    ca: tlsCertificate,
    servername: 'localhost',
  } as const;
  const socket = new WebSocket(message2, webSocketOptions2);
  return await new Promise<number>((resolve, reject) => {
    socket.once('open', () => {
      const error2 = new Error('Expected WSS upgrade to be rejected');
      return reject(error2);
    });
    socket.once('unexpected-response', (_request, response) => {
      response.resume();
      response.once('end', () => {
        const computedValue = response.statusCode ?? 0;
        return resolve(computedValue);
      });
    });
    socket.once('error', () => undefined);
  });
}
function onceMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => {
      const toStringResult = Buffer.from(data as ArrayBuffer).toString();
      return resolve(toStringResult);
    });
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
