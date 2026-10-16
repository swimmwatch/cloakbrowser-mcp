import { readFileSync } from 'node:fs';
import { request as createHttpRequest } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createConnection, type Socket } from 'node:net';
import { tlsCertPath, tlsKeyPath } from '@tests/helpers/tls.js';
export interface TestTlsTerminatorRequest {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly method: string;
  readonly url: string;
}
export interface TestTlsTerminator {
  close(): Promise<void>;
  readonly host: string;
  readonly port: number;
  readonly requests: TestTlsTerminatorRequest[];
  readonly upgrades: TestTlsTerminatorRequest[];
}
/** Test-only operator TLS edge that forwards decrypted traffic to the plaintext CDP listener. */
export async function startTestTlsTerminator(
  upstreamPort: number,
  options: {
    host?: string;
    port?: number;
    upstreamHost?: string;
  } = {},
): Promise<TestTlsTerminator> {
  const requests: TestTlsTerminatorRequest[] = [];
  const upgrades: TestTlsTerminatorRequest[] = [];
  const sockets = new Set<Socket>();
  const createHttpsServerOptions = {
    cert: readFileSync(tlsCertPath),
    key: readFileSync(tlsKeyPath),
  } as const;
  const server = createHttpsServer(createHttpsServerOptions, (request, response) => {
    const snapshotResult = snapshot(request);
    requests.push(snapshotResult);
    const createHttpRequestOptions = {
      headers: request.headers,
      host: options.upstreamHost ?? '127.0.0.1',
      method: request.method,
      path: request.url,
      port: upstreamPort,
    } as const;
    const upstream = createHttpRequest(createHttpRequestOptions, (upstreamResponse) => {
      const computedValue = upstreamResponse.statusCode ?? 502;
      response.writeHead(computedValue, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    });
    upstream.once('error', () => response.destroy());
    request.pipe(upstream);
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (request, socket, head) => {
    const snapshotResult2 = snapshot(request);
    upgrades.push(snapshotResult2);
    const upstreamHost = options.upstreamHost ?? '127.0.0.1';
    const createConnectionOptions = { host: upstreamHost, port: upstreamPort } as const;
    const upstream = createConnection(createConnectionOptions);
    sockets.add(upstream);
    upstream.once('close', () => sockets.delete(upstream));
    upstream.once('error', () => socket.destroy());
    upstream.once('connect', () => {
      const message = `${request.method ?? 'GET'} ${request.url ?? '/'} HTTP/${request.httpVersion}\r\n`;
      upstream.write(message);
      for (let index = 0; index < request.rawHeaders.length; index += 2) {
        const message2 = `${request.rawHeaders[index]}: ${request.rawHeaders[index + 1]}\r\n`;
        upstream.write(message2);
      }
      upstream.write('\r\n');
      if (head.byteLength > 0) upstream.write(head);
      socket.pipe(upstream).pipe(socket);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    const computedValue2 = options.port ?? 0;
    const computedValue3 = options.host ?? '127.0.0.1';
    server.listen(computedValue2, computedValue3, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('TLS terminator has no TCP port');
  return {
    close: async () => {
      for (const socket of sockets) socket.destroy();
      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      });
    },
    host: address.address,
    port: address.port,
    requests,
    upgrades,
  };
}
function snapshot(request: import('node:http').IncomingMessage): TestTlsTerminatorRequest {
  return {
    headers: { ...request.headers },
    method: request.method ?? 'UNKNOWN',
    url: request.url ?? '',
  };
}
