import { systemErrorCodes } from '#src/runtime/systemErrorCodes';
import { serializeJavaScriptString } from '#src/cdp/script';
import { request as createHttpRequest } from 'node:http';
import { createServer, type Server } from 'node:net';
import { WebSocket } from 'ws';
import { CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES, CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS } from '#src/cdp/limits';
import type { ChromiumCdpClient, ChromiumCdpDiscovery, InternalCdpPortReservation } from '#src/cdp/types';
const internalCdpHost = '127.0.0.1' as const;
const chromiumDiscoveryRetryDelayMs = 25;
const chromiumDiscoveryUnavailableMessage = 'Chromium discovery endpoint is unavailable';
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
  if (error instanceof Error && error.message === chromiumDiscoveryUnavailableMessage) {
    return true;
  }
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = (
    error as {
      code?: unknown;
    }
  ).code;
  return (
    code === systemErrorCodes.ECONNREFUSED ||
    code === systemErrorCodes.ECONNRESET ||
    code === systemErrorCodes.EPIPE
  );
}
async function waitForDiscoveryRetry(signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(finish, chromiumDiscoveryRetryDelayMs);
    timer.unref();
    const abort = (): void => {
      const normalizeAbortReasonResult = normalizeAbortReason(signal.reason);
      return finish(normalizeAbortReasonResult);
    };
    function finish(error?: Error): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      if (error === undefined) resolve();
      else reject(error);
    }
    const addEventListenerOptions = { once: true } as const;
    signal.addEventListener('abort', abort, addEventListenerOptions);
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
    const webSocketOptions = {
      handshakeTimeout: CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS,
      maxPayload: CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES,
      perMessageDeflate: false,
    } as const;
    const socket = new WebSocket(pageWebSocketUrl, webSocketOptions);
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
    const abort = (): void => {
      const error2 = new Error('Managed CDP bootstrap timed out');
      return finish(error2);
    };
    socket.once('open', () => {
      const propertyLiteral = serializeJavaScriptString(propertyName);
      const expression = `(() => { const propertyName = ${propertyLiteral}; const value = globalThis[propertyName]; delete globalThis[propertyName]; return value; })()`;
      const stringifyOptions = {
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true },
      } as const;
      const serializedValue = JSON.stringify(stringifyOptions);
      socket.send(serializedValue);
    });
    socket.on('message', (data) => {
      try {
        const toStringResult = Buffer.from(data as ArrayBuffer).toString();
        const response = JSON.parse(toStringResult) as unknown;
        if (!isRecord(response) || response.id !== 1) return;
        if (isRecord(response.error)) {
          const error3 = new Error('Chromium rejected the ownership challenge');
          finish(error3);
          return;
        }
        const result = isRecord(response.result) ? response.result.result : undefined;
        const argumentValue = isRecord(result) ? result.value : undefined;
        finish(undefined, argumentValue);
      } catch {
        const error4 = new Error('Chromium challenge response is invalid');
        finish(error4);
      }
    });
    socket.once('error', () => {
      const error5 = new Error('Chromium page target is unavailable');
      return finish(error5);
    });
    socket.once('close', () => {
      const error6 = new Error('Chromium page target closed before challenge response');
      return finish(error6);
    });
    const addEventListenerOptions2 = { once: true } as const;
    signal.addEventListener('abort', abort, addEventListenerOptions2);
    if (signal.aborted) abort();
  });
}
async function requestJson(host: string, port: number, path: string, signal: AbortSignal): Promise<unknown> {
  const body = await new Promise<Buffer>((resolve, reject) => {
    const createHttpRequestOptions = { host, port, path, method: 'GET', signal } as const;
    const request = createHttpRequest(createHttpRequestOptions, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        const error7 = new Error(chromiumDiscoveryUnavailableMessage);
        reject(error7);
        return;
      }
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.byteLength;
        if (length > CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES) {
          const error8 = new Error('Chromium discovery response is too large');
          request.destroy(error8);
          return;
        }
        chunks.push(chunk);
      });
      response.once('end', () => {
        const concatResult = Buffer.concat(chunks);
        return resolve(concatResult);
      });
      response.once('error', reject);
    });
    request.once('error', reject);
    request.end();
  });
  try {
    const toStringResult2 = body.toString('utf8');
    return JSON.parse(toStringResult2) as unknown;
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
