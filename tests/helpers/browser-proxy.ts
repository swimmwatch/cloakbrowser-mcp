import { readFile } from 'node:fs/promises';
import { createServer as createHttpServer, request as httpRequest, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { connect, createServer as createTcpServer, type Socket } from 'node:net';

interface ProxyOptions {
  authentication?: { username: string; password: string };
  echo?: string;
  hangEcho?: boolean;
}
interface ProxyRequest {
  authority: string;
  mode: 'http' | 'connect' | 'socks';
}
const echoNames = ['api.ipify.org:443', 'checkip.amazonaws.com:443', 'ifconfig.me:443'];
const echoAuthorities = new Set(echoNames);
const fixtureHost = 'fixture.test';
const bypassHost = 'bypass.test';

/** Allowlisted local proxy; headers and credentials never enter its request ledger. */
export async function startBrowserProxy(options: ProxyOptions = {}) {
  const sockets = new Set<Socket>();
  const requests: ProxyRequest[] = [];
  const rejected: string[] = [];
  const originRequests: string[] = [];
  const track = (socket: Socket): void => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
    socket.setTimeout(10000);
    socket.once('timeout', () => socket.destroy());
    socket.on('error', () => socket.destroy());
  };
  const origin = createHttpServer((request, response) => {
    const requestedPath = request.url ?? '/';
    originRequests.push(requestedPath);
    response.setHeader('Content-Type', 'text/html');
    response.end('<h1>Proxy fixture marker</h1>');
  });
  const certUrl = new URL('../fixtures/geoip/echo-cert.pem', import.meta.url);
  const keyUrl = new URL('../fixtures/geoip/echo-key.pem', import.meta.url);
  const cert = await readFile(certUrl);
  const key = await readFile(keyUrl);
  const tlsOptions = { cert, key };
  const echo = createHttpsServer(tlsOptions, (_request, response) => {
    if (!options.hangEcho) {
      const payload = options.echo ?? '81.2.69.160';
      response.end(payload);
    }
  });
  const servers: Array<Server | ReturnType<typeof createTcpServer>> = [origin, echo];
  for (const server of servers) server.on('connection', track);
  const close = async (): Promise<void> => {
    const closures = [...sockets].map(
      (socket) =>
        new Promise<void>((resolve) => {
          socket.once('close', resolve);
          socket.destroy();
        }),
    );
    await Promise.all(closures);
    for (const server of servers) {
      if (!server.listening) continue;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  };
  try {
    const originPort = await listen(origin);
    const echoPort = await listen(echo);
    const fixtureAuthority = `${fixtureHost}:${originPort}`;
    const allowedPort = (authority: string): number | undefined => {
      const bypassAuthority = `${bypassHost}:${originPort}`;
      if (authority === fixtureAuthority || authority === bypassAuthority) return originPort;
      if (echoAuthorities.has(authority)) return echoPort;
      return undefined;
    };
    const tunnel = (socket: Socket, authority: string, mode: 'connect' | 'socks', head: Buffer): void => {
      const port = allowedPort(authority);
      if (!port) {
        rejected.push(authority);
        const failure =
          mode === 'connect'
            ? 'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'
            : Buffer.from([5, 2, 0, 1, 0, 0, 0, 0, 0, 0]);
        socket.end(failure);
        return;
      }
      const entry = { authority, mode };
      requests.push(entry);
      const target = { host: '127.0.0.1', port };
      const upstream = connect(target);
      track(upstream);
      socket.once('close', () => upstream.destroy());
      upstream.once('close', () => socket.destroy());
      upstream.once('connect', () => {
        const success =
          mode === 'connect'
            ? 'HTTP/1.1 200 Connection Established\r\n\r\n'
            : Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0]);
        socket.write(success);
        if (head.length) upstream.write(head);
        socket.pipe(upstream);
        upstream.pipe(socket);
        socket.resume();
      });
    };
    const credentialText = options.authentication
      ? `${options.authentication.username}:${options.authentication.password}`
      : undefined;
    const credentialBuffer = credentialText ? Buffer.from(credentialText) : undefined;
    const expectedAuth = credentialBuffer ? `Basic ${credentialBuffer.toString('base64')}` : undefined;
    const authenticated = (header: string | undefined): boolean => !expectedAuth || header === expectedAuth;
    const denyAuth = (socket: Socket): void => {
      socket.end(
        'HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="fixture"\r\nContent-Length: 0\r\n\r\n',
      );
    };
    const proxy = createHttpServer((request, response) => {
      if (!authenticated(request.headers['proxy-authorization'])) {
        const headers = { 'Proxy-Authenticate': 'Basic realm="fixture"' };
        response.writeHead(407, headers);
        response.end();
        return;
      }
      const rawUrl = request.url ?? '/';
      let url: URL;
      try {
        url = new URL(rawUrl, 'http://invalid.test');
      } catch {
        response.writeHead(403);
        response.end();
        return;
      }
      const port = allowedPort(url.host);
      if (!port || url.protocol !== 'http:') {
        rejected.push(url.host);
        response.writeHead(403);
        response.end();
        return;
      }
      const entry = { authority: url.host, mode: 'http' } as const;
      requests.push(entry);
      const headers = { ...request.headers };
      delete headers['proxy-authorization'];
      const target = {
        host: '127.0.0.1',
        port,
        path: url.pathname + url.search,
        method: request.method,
        headers,
      };
      const upstream = httpRequest(target, (received) => {
        const status = received.statusCode ?? 502;
        response.writeHead(status, received.headers);
        received.pipe(response);
      });
      upstream.once('socket', track);
      upstream.once('error', () => response.destroy());
      response.once('close', () => upstream.destroy());
      request.pipe(upstream);
    });
    proxy.on('connection', track);
    proxy.on('connect', (request, socket, head) => {
      const client = socket as Socket;
      if (!authenticated(request.headers['proxy-authorization'])) {
        denyAuth(client);
        return;
      }
      const authority = request.url ?? '';
      tunnel(client, authority, 'connect', head);
    });
    servers.push(proxy);
    const proxyPort = await listen(proxy);
    const socks = createTcpServer((socket) => {
      track(socket);
      let pending = Buffer.alloc(0);
      let greeting = true;
      const onData = (bytes: Buffer): void => {
        const chunks = [pending, bytes];
        pending = Buffer.concat(chunks);
        if (greeting) {
          if (pending.length < 2 || pending.length < 2 + (pending[1] ?? 0)) return;
          const count = pending[1] ?? 0;
          const greetingEnd = 2 + count;
          const methods = pending.subarray(2, greetingEnd);
          if (pending[0] !== 5 || !methods.includes(0)) {
            const denied = Buffer.from([5, 255]);
            socket.end(denied);
            return;
          }
          pending = pending.subarray(greetingEnd);
          greeting = false;
          const accepted = Buffer.from([5, 0]);
          socket.write(accepted);
        }
        if (pending.length < 5) return;
        const type = pending[3];
        const hostLength = type === 3 ? (pending[4] ?? 0) : type === 1 ? 4 : 0;
        const offset = type === 3 ? 5 : 4;
        const length = offset + hostLength + 2;
        if (!hostLength || pending[0] !== 5 || pending[1] !== 1) {
          socket.destroy();
          return;
        }
        if (pending.length < length) return;
        const hostEnd = offset + hostLength;
        const hostBytes = pending.subarray(offset, hostEnd);
        const host = type === 3 ? hostBytes.toString() : [...hostBytes].join('.');
        const portOffset = offset + hostLength;
        const port = pending.readUInt16BE(portOffset);
        const authority = `${host}:${port}`;
        const head = pending.subarray(length);
        socket.pause();
        socket.off('data', onData);
        tunnel(socket, authority, 'socks', head);
      };
      socket.on('data', onData);
    });
    servers.push(socks);
    const socksPort = await listen(socks);
    const url = `http://127.0.0.1:${proxyPort}`;
    const socksUrl = `socks5://127.0.0.1:${socksPort}`;
    const fixtureUrl = `http://${fixtureAuthority}/`;
    const bypassUrl = `http://${bypassHost}:${originPort}/`;
    const probeConnect = async (input: { proxy: string; authority: string }): Promise<number> => {
      const parsed = new URL(input.proxy);
      const target = {
        hostname: parsed.hostname,
        port: parsed.port,
        method: 'CONNECT',
        path: input.authority,
      };
      return new Promise<number>((resolve, reject) => {
        const request = httpRequest(target);
        request.once('connect', (response, socket) => {
          socket.destroy();
          const status = response.statusCode ?? 0;
          resolve(status);
        });
        request.once('error', reject);
        request.end();
      });
    };
    return {
      url,
      socksUrl,
      fixtureUrl,
      bypassUrl,
      fixtureAuthority,
      certUrl,
      requests,
      originRequests,
      rejected,
      close,
      probeConnect,
      get socketCount() {
        return sockets.size;
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
async function listen(server: Server | ReturnType<typeof createTcpServer>): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Proxy fixture has no TCP port');
  return address.port;
}
