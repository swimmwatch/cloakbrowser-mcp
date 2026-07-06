import { readFileSync } from 'node:fs';
import {
  createServer as createHttpServer,
  type Server as HttpServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import {
  createServer as createHttpsServer,
  type Server as HttpsServer,
  type ServerOptions as HttpsServerOptions,
} from 'node:https';
import { HTTP_PROTOCOL_HTTPS, type StreamableHttpOptions } from '#src/http/options';

export type StreamableNodeServer = HttpServer | HttpsServer;

export function createStreamableNodeServer(
  options: StreamableHttpOptions,
  requestListener: (req: IncomingMessage, res: ServerResponse) => void,
): StreamableNodeServer {
  if (options.protocol === HTTP_PROTOCOL_HTTPS) {
    return createHttpsServer(readHttpsServerOptions(options), requestListener);
  }
  // HTTP is an explicit local/reverse-proxy mode; use `https` for direct TLS.
  return createHttpServer(requestListener);
}

export function formatHost(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) return host;
  return host.includes(':') ? `[${host}]` : host;
}

export async function closeHttpServer(server: StreamableNodeServer): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function listenHttpServer(
  server: StreamableNodeServer,
  port: number,
  host: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onListening = (): void => {
      cleanup();
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function readHttpsServerOptions(options: StreamableHttpOptions): HttpsServerOptions {
  const { cert, key, pfx, passphrase } = options.tls;
  if (pfx !== undefined) {
    return {
      pfx: readFileSync(pfx),
      passphrase,
    };
  }
  if (cert !== undefined && key !== undefined) {
    return {
      cert: readFileSync(cert),
      key: readFileSync(key),
      passphrase,
    };
  }
  throw new Error('HTTPS requires either certificate/key files or a PFX file');
}
