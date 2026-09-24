import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { type WebSocket, WebSocketServer } from 'ws';

export interface FakeChromiumCdpRequest {
  headers: IncomingMessage['headers'];
  method: string;
  url: string;
}

export interface FakeChromiumCdpServer {
  close(): Promise<void>;
  readonly host: '127.0.0.1';
  readonly port: number;
  readonly requests: FakeChromiumCdpRequest[];
  readonly webSocketRequests: FakeChromiumCdpRequest[];
  readonly webSockets: ReadonlySet<WebSocket>;
}

export type FakeChromiumCdpHandler = (request: IncomingMessage, response: ServerResponse) => void;
export type FakeChromiumCdpWebSocketHandler = (socket: WebSocket, request: IncomingMessage) => void;

export async function startFakeChromiumCdp(
  handler: FakeChromiumCdpHandler,
  webSocketHandler?: FakeChromiumCdpWebSocketHandler,
  options: { port?: number } = {},
): Promise<FakeChromiumCdpServer> {
  const requests: FakeChromiumCdpRequest[] = [];
  const webSocketRequests: FakeChromiumCdpRequest[] = [];
  const webSocketServer = new WebSocketServer({ noServer: true, perMessageDeflate: false });
  const server = createServer((request, response) => {
    requests.push({
      headers: request.headers,
      method: request.method ?? 'UNKNOWN',
      url: request.url ?? '',
    });
    handler(request, response);
  });
  server.on('upgrade', (request, socket, head) => {
    webSocketRequests.push({
      headers: request.headers,
      method: request.method ?? 'UNKNOWN',
      url: request.url ?? '',
    });
    if (webSocketHandler === undefined) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketHandler(webSocket, request);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Fake CDP server has no port');

  return {
    close: async () => await closeFakeServer(server, webSocketServer),
    host: '127.0.0.1',
    port: address.port,
    requests,
    webSocketRequests,
    webSockets: webSocketServer.clients,
  };
}

async function closeFakeServer(
  server: ReturnType<typeof createServer>,
  webSocketServer: WebSocketServer,
): Promise<void> {
  for (const socket of webSocketServer.clients) socket.terminate();
  await Promise.all([
    new Promise<void>((resolve) => webSocketServer.close(() => resolve())),
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error === undefined ? resolve() : reject(error))),
    ),
  ]);
}
