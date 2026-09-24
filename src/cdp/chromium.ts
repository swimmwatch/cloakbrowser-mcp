import { request as createHttpRequest } from 'node:http';
import { createServer, type Server } from 'node:net';

import { WebSocket } from 'ws';

import { CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES, CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS } from '#src/cdp/limits';
import type { ChromiumCdpClient, ChromiumCdpDiscovery, InternalCdpPortReservation } from '#src/cdp/types';

const internalCdpHost = '127.0.0.1' as const;
const chromiumDiscoveryRetryDelayMs = 25;

export async function reserveInternalCdpPort(): Promise<InternalCdpPortReservation> {
  const server = createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, internalCdpHost, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Internal CDP reservation did not produce a TCP port');
  }

  let closed = false;
  return {
    host: internalCdpHost,
    port: address.port,
    async close() {
      if (closed) return;
      closed = true;
      await closeServer(server);
    },
  };
}

export function createChromiumCdpClient(host: string, port: number): ChromiumCdpClient {
  return {
    discover: async (signal) => await retryChromiumDiscovery(host, port, signal),
    probe: async (signal) => await readChromiumDiscovery(host, port, signal),
    readAndDeleteChallenge: async (pageWebSocketUrl, propertyName, signal) =>
      await readAndDeletePageChallenge(pageWebSocketUrl, propertyName, signal),
  };
}

async function retryChromiumDiscovery(
  host: string,
  port: number,
  signal: AbortSignal,
): Promise<ChromiumCdpDiscovery> {
  while (true) {
    try {
      return await readChromiumDiscovery(host, port, signal);
    } catch (error) {
      if (signal.aborted) throw normalizeAbortReason(signal.reason);
      if (!isRetryableDiscoveryError(error)) throw error;
      await waitForDiscoveryRetry(signal);
    }
  }
}

function isRetryableDiscoveryError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'Chromium discovery endpoint unavailable') {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 'ECONNREFUSED' || code === 'ECONNRESET' || code === 'EPIPE';
}

async function waitForDiscoveryRetry(signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, chromiumDiscoveryRetryDelayMs);
    timer.unref();
    const abort = (): void => finish(normalizeAbortReason(signal.reason));
    function finish(error?: Error): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (error === undefined) resolve();
      else reject(error);
    }
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

function normalizeAbortReason(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error('Managed CDP bootstrap timed out');
}

export async function readChromiumDiscovery(
  host: string,
  port: number,
  signal: AbortSignal,
): Promise<ChromiumCdpDiscovery> {
  const version = await requestJson(host, port, '/json/version', signal);
  if (!isRecord(version) || typeof version.webSocketDebuggerUrl !== 'string') {
    throw new Error('Chromium version discovery is invalid');
  }
  assertOwnedWebSocketUrl(version.webSocketDebuggerUrl, host, port, '/devtools/browser/');

  const targets = await requestJson(host, port, '/json/list', signal);
  if (!Array.isArray(targets)) throw new Error('Chromium target discovery is invalid');
  const page = targets.find(
    (target): target is Record<string, unknown> =>
      isRecord(target) && target.type === 'page' && typeof target.webSocketDebuggerUrl === 'string',
  );
  if (page === undefined || typeof page.webSocketDebuggerUrl !== 'string') {
    throw new Error('Chromium discovery has no page target');
  }
  assertOwnedWebSocketUrl(page.webSocketDebuggerUrl, host, port, '/devtools/page/');

  return {
    browserWebSocketUrl: version.webSocketDebuggerUrl,
    pageWebSocketUrl: page.webSocketDebuggerUrl,
  };
}

/** Reads and atomically deletes one temporary ownership challenge from a page target. */
export async function readAndDeletePageChallenge(
  pageWebSocketUrl: string,
  propertyName: string,
  signal: AbortSignal,
): Promise<unknown> {
  return await new Promise<unknown>((resolve, reject) => {
    const socket = new WebSocket(pageWebSocketUrl, {
      handshakeTimeout: CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS,
      maxPayload: CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES,
      perMessageDeflate: false,
    });
    let settled = false;
    const finish = (error: Error | undefined, value?: unknown): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      if (socket.readyState === WebSocket.OPEN) socket.close();
      else if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
      if (error === undefined) resolve(value);
      else reject(error);
    };
    const abort = (): void => finish(new Error('Managed CDP bootstrap timed out'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }

    socket.once('open', () => {
      const expression = `(() => { const propertyName = ${JSON.stringify(propertyName)}; const value = globalThis[propertyName]; delete globalThis[propertyName]; return value; })()`;
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true },
        }),
      );
    });
    socket.on('message', (data) => {
      try {
        const response = JSON.parse(Buffer.from(data as ArrayBuffer).toString()) as unknown;
        if (!isRecord(response) || response.id !== 1) return;
        if (isRecord(response.error)) {
          finish(new Error('Chromium rejected the ownership challenge'));
          return;
        }
        const result = isRecord(response.result) ? response.result.result : undefined;
        finish(undefined, isRecord(result) ? result.value : undefined);
      } catch {
        finish(new Error('Chromium challenge response is invalid'));
      }
    });
    socket.once('error', () => finish(new Error('Chromium page target is unavailable')));
    socket.once('close', () => finish(new Error('Chromium page target closed before challenge response')));
  });
}

async function requestJson(host: string, port: number, path: string, signal: AbortSignal): Promise<unknown> {
  const body = await new Promise<Buffer>((resolve, reject) => {
    const request = createHttpRequest({ host, port, path, method: 'GET', signal }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error('Chromium discovery endpoint is unavailable'));
        return;
      }
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.byteLength;
        if (length > CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES) {
          request.destroy(new Error('Chromium discovery response is too large'));
          return;
        }
        chunks.push(chunk);
      });
      response.once('end', () => resolve(Buffer.concat(chunks)));
      response.once('error', reject);
    });
    request.once('error', reject);
    request.end();
  });
  try {
    return JSON.parse(body.toString('utf8')) as unknown;
  } catch {
    throw new Error('Chromium discovery response is invalid JSON');
  }
}

function assertOwnedWebSocketUrl(url: string, host: string, port: number, pathPrefix: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Chromium discovery WebSocket URL is invalid');
  }
  if (
    parsed.protocol !== 'ws:' ||
    parsed.hostname !== host ||
    Number(parsed.port) !== port ||
    !parsed.pathname.startsWith(pathPrefix) ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('Chromium discovery does not match the selected internal endpoint');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}
