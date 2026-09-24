import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

import { type RawData, WebSocket, WebSocketServer } from 'ws';

import { matchesCdpCapability } from '#src/cdp/capability';
import {
  CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS,
  CDP_WEBSOCKET_MAX_CONNECTIONS,
  CDP_WEBSOCKET_MAX_MESSAGE_BYTES,
  CDP_WEBSOCKET_MAX_QUEUE_BYTES,
  CDP_WEBSOCKET_SHUTDOWN_TIMEOUT_MS,
} from '#src/cdp/limits';
import { formatCdpAuthority } from '#src/cdp/urls';
import type { CdpSecurityRejectionCategory } from '#src/cdp/security';

export const CDP_WEBSOCKET_LOCAL_CLOSE = {
  goingAway: { code: 1001, reason: 'going_away' },
  internalError: { code: 1011, reason: 'internal_error' },
  messageTooBig: { code: 1009, reason: 'message_too_big' },
  protocolError: { code: 1002, reason: 'protocol_error' },
  tryAgainLater: { code: 1013, reason: 'try_again_later' },
} as const;

export interface CdpWebSocketGeneration {
  capability: string;
  state: 'ready';
  upstreamHost: string;
  upstreamPort: number;
}

export interface CdpWebSocketProxyOptions {
  beforeForward?: (signal: AbortSignal) => Promise<boolean>;
  createErrorResponse(
    kind: CdpWebSocketUpgradeFailureKind,
    upstreamStatus?: number,
  ): CdpWebSocketUpgradeErrorResponse;
  getGeneration(): CdpWebSocketGeneration | undefined;
  handshakeTimeoutMs?: number;
  onActivity?: (event: { activeConnections: number; kind: 'websocket' }) => void;
  onBrowserLoss?: () => void;
  onSecurityRejection?: (category: CdpSecurityRejectionCategory) => void;
  shutdownTimeoutMs?: number;
  validateAuthority(request: IncomingMessage): 'accepted' | 'bad_request' | 'forbidden';
}

export interface CdpWebSocketProxy {
  readonly activeConnections: number;
  close(): Promise<void>;
  closeGeneration(generation: CdpWebSocketGeneration | undefined): void;
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void;
}

interface WebSocketRoute {
  path: string;
  targetType: 'browser' | 'page';
}

type CdpWebSocketUpgradeFailureKind =
  | 'bad_gateway'
  | 'bad_request'
  | 'forbidden'
  | 'gateway_timeout'
  | 'not_found'
  | 'unavailable'
  | 'upstream_error';

interface CdpWebSocketUpgradeErrorResponse {
  body: Buffer;
  headers: Readonly<Record<string, string>>;
  status: number;
}

export interface CdpWebSocketRelayDirection {
  paused: boolean;
  queuedBytes: number;
}

interface RelayPair {
  client: WebSocket;
  generation: CdpWebSocketGeneration;
  targetType: WebSocketRoute['targetType'];
  upstream: WebSocket;
}

interface PendingUpgrade {
  cancelled: boolean;
  socket: Duplex;
}

interface PendingProbe {
  abort?: () => void;
}

export function createCdpWebSocketProxy(options: CdpWebSocketProxyOptions): CdpWebSocketProxy {
  return new CdpWebSocketProxyRuntime(options);
}

export function classifyCdpWebSocketRoute(
  requestTarget: string,
  expectedCapability: string,
): { kind: 'bad_request' } | { kind: 'not_found' } | ({ kind: 'route' } & WebSocketRoute) {
  if (!requestTarget.startsWith('/cdp/')) return { kind: 'not_found' };
  const capabilityAndPath = requestTarget.slice('/cdp/'.length);
  const separator = capabilityAndPath.indexOf('/');
  if (separator === -1) return { kind: 'not_found' };
  if (!matchesCdpCapability(expectedCapability, capabilityAndPath.slice(0, separator))) {
    return { kind: 'not_found' };
  }

  const path = capabilityAndPath.slice(separator);
  const match = /^\/devtools\/(browser|page)\/([^/?#]+)$/u.exec(path);
  if (match === null) return { kind: 'not_found' };
  const id = match[2] ?? '';
  if (!/^[A-Za-z0-9_-]+$/u.test(id)) return { kind: 'bad_request' };
  return { kind: 'route', path, targetType: match[1] as WebSocketRoute['targetType'] };
}

class CdpWebSocketProxyRuntime implements CdpWebSocketProxy {
  readonly #attempts = new Set<WebSocket>();
  readonly #pendingUpgrades = new Set<PendingUpgrade>();
  readonly #pairs = new Set<RelayPair>();
  readonly #options: CdpWebSocketProxyOptions;
  readonly #server: WebSocketServer;
  #closing = false;

  constructor(options: CdpWebSocketProxyOptions) {
    this.#options = options;
    this.#server = new WebSocketServer({
      maxPayload: CDP_WEBSOCKET_MAX_MESSAGE_BYTES,
      noServer: true,
      perMessageDeflate: false,
    });
  }

  get activeConnections(): number {
    return this.#pairs.size;
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    void this.#handleUpgrade(request, socket, head);
  }

  async #handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    const accepted = this.#acceptUpgrade(request);
    if (accepted.kind === 'error') {
      writeUpgradeError(socket, this.#options.createErrorResponse(accepted.failureKind));
      return;
    }
    if (!hasValidWebSocketHandshake(request)) {
      writeUpgradeError(socket, this.#options.createErrorResponse('bad_request'));
      return;
    }

    const probe: PendingProbe = {};
    const pending: PendingUpgrade = { cancelled: false, socket };
    this.#pendingUpgrades.add(pending);
    const finishPending = (): boolean => {
      probe.abort?.();
      return this.#pendingUpgrades.delete(pending);
    };
    socket.once('close', finishPending);
    const upstreamHandshakeTimeoutMs = await this.#prepareUpstreamHandshake(
      accepted.generation,
      pending,
      probe,
      socket,
      finishPending,
    );
    if (upstreamHandshakeTimeoutMs === undefined) return;

    const upstream = new WebSocket(
      `ws://${formatCdpAuthority(accepted.generation.upstreamHost, accepted.generation.upstreamPort)}${accepted.route.path}`,
      {
        followRedirects: false,
        handshakeTimeout: upstreamHandshakeTimeoutMs,
        maxPayload: CDP_WEBSOCKET_MAX_MESSAGE_BYTES,
        perMessageDeflate: false,
      },
    );
    this.#attempts.add(upstream);
    finishPending();
    socket.off('close', finishPending);

    let settled = false;
    const finishAttempt = (): void => {
      if (settled) return;
      settled = true;
      this.#attempts.delete(upstream);
    };
    const abortAttempt = (): void => {
      if (settled) return;
      finishAttempt();
      upstream.terminate();
    };
    socket.once('close', abortAttempt);
    upstream.once('open', () => {
      if (this.#closing || this.#options.getGeneration() !== accepted.generation) {
        finishAttempt();
        upstream.close(CDP_WEBSOCKET_LOCAL_CLOSE.goingAway.code, CDP_WEBSOCKET_LOCAL_CLOSE.goingAway.reason);
        writeUpgradeError(socket, this.#options.createErrorResponse('unavailable'));
        return;
      }
      let paired = false;
      this.#server.handleUpgrade(request, socket, head, (client) => {
        paired = true;
        finishAttempt();
        this.#pair(client, upstream, accepted.generation, accepted.route.targetType);
      });
      if (!paired) {
        finishAttempt();
        upstream.terminate();
      }
    });
    upstream.once('unexpected-response', (_request, response) => {
      if (settled) return;
      finishAttempt();
      const status = response.statusCode ?? 0;
      response.resume();
      upstream.terminate();
      const kind = status >= 400 && status <= 499 ? 'upstream_error' : 'bad_gateway';
      if (kind === 'bad_gateway') safelyReportBrowserLoss(this.#options.onBrowserLoss);
      writeUpgradeError(
        socket,
        this.#options.createErrorResponse(kind, kind === 'upstream_error' ? status : undefined),
      );
    });
    upstream.once('error', (error) => {
      if (settled) return;
      finishAttempt();
      if (!socket.writable) return;
      const kind =
        this.#closing || this.#options.getGeneration() !== accepted.generation
          ? 'unavailable'
          : isHandshakeTimeout(error)
            ? 'gateway_timeout'
            : 'bad_gateway';
      if (kind !== 'unavailable') safelyReportBrowserLoss(this.#options.onBrowserLoss);
      writeUpgradeError(socket, this.#options.createErrorResponse(kind));
    });
  }

  async #prepareUpstreamHandshake(
    generation: CdpWebSocketGeneration,
    pending: PendingUpgrade,
    probe: PendingProbe,
    socket: Duplex,
    finishPending: () => boolean,
  ): Promise<number | undefined> {
    const configuredTimeout = this.#options.handshakeTimeoutMs ?? CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS;
    if (this.#options.beforeForward === undefined) return configuredTimeout;

    const deadline = createHandshakeDeadline(configuredTimeout);
    probe.abort = deadline.abort;
    let available = false;
    try {
      available = await withinAbortSignal(this.#options.beforeForward(deadline.signal), deadline.signal);
    } catch {
      // A failed identity probe makes the generation unavailable to the caller.
    }
    const remainingMs = deadline.remainingMs();
    deadline.clear();
    probe.abort = undefined;

    const unavailable = isPendingHandshakeUnavailable({
      available,
      closing: this.#closing,
      currentGeneration: this.#options.getGeneration(),
      generation,
      pending,
      socket,
    });
    if (unavailable) {
      const wasPending = finishPending();
      socket.off('close', finishPending);
      if (wasPending && !pending.cancelled && socket.writable) {
        writeUpgradeError(
          socket,
          this.#options.createErrorResponse(deadline.signal.aborted ? 'gateway_timeout' : 'unavailable'),
        );
      }
      return undefined;
    }
    if (remainingMs >= 1) return remainingMs;

    const wasPending = finishPending();
    socket.off('close', finishPending);
    if (wasPending && socket.writable) {
      writeUpgradeError(socket, this.#options.createErrorResponse('gateway_timeout'));
    }
    return undefined;
  }

  closeGeneration(generation: CdpWebSocketGeneration | undefined): void {
    if (generation === undefined) return;
    for (const pair of this.#pairs) {
      if (pair.generation === generation) closePair(pair, CDP_WEBSOCKET_LOCAL_CLOSE.goingAway);
    }
  }

  async close(): Promise<void> {
    if (this.#closing) {
      await this.#waitForAllClosed();
      return;
    }
    this.#closing = true;
    for (const pending of this.#pendingUpgrades) {
      pending.cancelled = true;
      writeUpgradeError(pending.socket, this.#options.createErrorResponse('unavailable'));
    }
    for (const attempt of this.#attempts) attempt.terminate();
    for (const pair of this.#pairs) closePair(pair, CDP_WEBSOCKET_LOCAL_CLOSE.goingAway);
    await this.#waitForAllClosed();
    this.#server.close();
  }

  #acceptUpgrade(
    request: IncomingMessage,
  ):
    | { failureKind: CdpWebSocketUpgradeFailureKind; kind: 'error' }
    | { generation: CdpWebSocketGeneration; kind: 'route'; route: WebSocketRoute } {
    const generation = this.#options.getGeneration();
    if (hasMismatchedCapability(request.url ?? '', generation?.capability ?? dummyCapability)) {
      safelyReportSecurityRejection(this.#options.onSecurityRejection, 'capability');
    }
    const route = classifyCdpWebSocketRoute(request.url ?? '', generation?.capability ?? dummyCapability);
    if (generation === undefined || route.kind === 'not_found') {
      return { failureKind: 'not_found', kind: 'error' };
    }
    if (route.kind === 'bad_request') return { failureKind: 'bad_request', kind: 'error' };
    const authorityPolicy = this.#options.validateAuthority(request);
    if (authorityPolicy !== 'accepted') return { failureKind: authorityPolicy, kind: 'error' };
    if (
      this.#closing ||
      this.#pairs.size + this.#pendingUpgrades.size + this.#attempts.size >= CDP_WEBSOCKET_MAX_CONNECTIONS
    ) {
      return { failureKind: 'unavailable', kind: 'error' };
    }
    return { generation, kind: 'route', route };
  }

  #pair(
    client: WebSocket,
    upstream: WebSocket,
    generation: CdpWebSocketGeneration,
    targetType: WebSocketRoute['targetType'],
  ): void {
    const pair = { client, generation, targetType, upstream };
    this.#pairs.add(pair);

    let locallyClosing = false;
    let clientClosed = false;
    let upstreamClosed = false;
    const closeLocally = (close: { code: number; reason: string }): void => {
      if (locallyClosing) return;
      locallyClosing = true;
      closePair(pair, close);
    };
    const maybeFinish = (): void => {
      if (!clientClosed || !upstreamClosed || !this.#pairs.delete(pair)) return;
    };
    const clientToUpstream = createCdpWebSocketRelayDirection();
    const upstreamToClient = createCdpWebSocketRelayDirection();

    guardProtocolErrors(client, closeLocally);
    guardProtocolErrors(upstream, closeLocally);

    client.on('message', (data, isBinary) => {
      safelyReportActivity(this.#options.onActivity, this.#pairs.size);
      relayCdpWebSocketMessage(client, upstream, data, isBinary, clientToUpstream, closeLocally);
      if (isBrowserCloseMessage(data, isBinary)) {
        safelyReportBrowserLoss(this.#options.onBrowserLoss);
      }
    });
    upstream.on('message', (data, isBinary) => {
      safelyReportActivity(this.#options.onActivity, this.#pairs.size);
      relayCdpWebSocketMessage(upstream, client, data, isBinary, upstreamToClient, closeLocally);
    });
    client.on('error', (error) => closeLocally(closeForWebSocketError(error)));
    upstream.on('error', (error) => {
      if (targetType === 'browser' && !clientClosed && !locallyClosing) {
        safelyReportBrowserLoss(this.#options.onBrowserLoss);
      }
      closeLocally(closeForWebSocketError(error));
    });
    client.on('close', (code, reason) => {
      clientClosed = true;
      if (!locallyClosing) relayPeerClose(upstream, code, reason);
      maybeFinish();
    });
    upstream.on('close', (code, reason) => {
      upstreamClosed = true;
      if (targetType === 'browser' && !clientClosed && !locallyClosing) {
        safelyReportBrowserLoss(this.#options.onBrowserLoss);
      }
      if (!locallyClosing) relayPeerClose(client, code, reason);
      maybeFinish();
    });
  }

  async #waitForAllClosed(): Promise<void> {
    if (this.#pendingUpgrades.size === 0 && this.#pairs.size === 0 && this.#attempts.size === 0) return;
    const deadline = this.#options.shutdownTimeoutMs ?? CDP_WEBSOCKET_SHUTDOWN_TIMEOUT_MS;
    await Promise.race([
      new Promise<void>((resolve) => {
        const poll = (): void => {
          if (this.#pendingUpgrades.size === 0 && this.#pairs.size === 0 && this.#attempts.size === 0) {
            resolve();
          } else setTimeout(poll, 5).unref();
        };
        poll();
      }),
      new Promise<void>((resolve) => setTimeout(resolve, deadline).unref()),
    ]);
    for (const pending of this.#pendingUpgrades) pending.socket.destroy();
    for (const attempt of this.#attempts) attempt.terminate();
    for (const pair of this.#pairs) {
      pair.client.terminate();
      pair.upstream.terminate();
    }
    if (this.#pendingUpgrades.size > 0 || this.#pairs.size > 0 || this.#attempts.size > 0) {
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
}

function isPendingHandshakeUnavailable(options: {
  available: boolean;
  closing: boolean;
  currentGeneration: CdpWebSocketGeneration | undefined;
  generation: CdpWebSocketGeneration;
  pending: PendingUpgrade;
  socket: Duplex;
}): boolean {
  return (
    options.pending.cancelled ||
    !options.available ||
    options.closing ||
    options.currentGeneration !== options.generation ||
    !options.socket.writable
  );
}

function createHandshakeDeadline(timeoutMs: number): {
  abort: () => void;
  clear(): void;
  remainingMs(): number;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  const expiresAt = Date.now() + timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref();
  return {
    abort: () => controller.abort(),
    clear: () => clearTimeout(timer),
    remainingMs: () => Math.max(0, expiresAt - Date.now()),
    signal: controller.signal,
  };
}

async function withinAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error('Managed CDP WebSocket handshake timed out');
  return await new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new Error('Managed CDP WebSocket handshake timed out'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Creates isolated queue accounting for one relay direction. */
export function createCdpWebSocketRelayDirection(): CdpWebSocketRelayDirection {
  return { paused: false, queuedBytes: 0 };
}

/** Relays one decoded message while enforcing per-direction queue accounting. */
export function relayCdpWebSocketMessage(
  source: WebSocket,
  destination: WebSocket,
  data: RawData,
  isBinary: boolean,
  direction: CdpWebSocketRelayDirection,
  closeLocally: (close: { code: number; reason: string }) => void,
): void {
  const bytes = rawDataBytes(data);
  if (direction.queuedBytes + bytes > CDP_WEBSOCKET_MAX_QUEUE_BYTES) {
    closeLocally(CDP_WEBSOCKET_LOCAL_CLOSE.tryAgainLater);
    return;
  }
  if (destination.readyState !== WebSocket.OPEN) {
    closeLocally(CDP_WEBSOCKET_LOCAL_CLOSE.internalError);
    return;
  }

  direction.queuedBytes += bytes;
  if (!direction.paused) {
    direction.paused = true;
    source.pause();
  }
  destination.send(data, { binary: isBinary }, (error) => {
    direction.queuedBytes -= bytes;
    if (error) {
      closeLocally(CDP_WEBSOCKET_LOCAL_CLOSE.internalError);
      return;
    }
    if (direction.queuedBytes === 0 && direction.paused) {
      direction.paused = false;
      source.resume();
    }
  });
}

function rawDataBytes(data: RawData): number {
  if (Array.isArray(data)) return data.reduce((total, chunk) => total + chunk.byteLength, 0);
  return data.byteLength;
}

function relayPeerClose(destination: WebSocket, code: number, reason: Buffer): void {
  if (destination.readyState !== WebSocket.OPEN) return;
  if (code === 1005) destination.close();
  else if (code === 1006) {
    destination.close(
      CDP_WEBSOCKET_LOCAL_CLOSE.internalError.code,
      CDP_WEBSOCKET_LOCAL_CLOSE.internalError.reason,
    );
  } else destination.close(code, reason.toString('utf8'));
}

function closePair(pair: RelayPair, close: { code: number; reason: string }): void {
  closeWebSocket(pair.client, close);
  closeWebSocket(pair.upstream, close);
}

function closeWebSocket(socket: WebSocket, close: { code: number; reason: string }): void {
  if (socket.readyState === WebSocket.OPEN) socket.close(close.code, close.reason);
  else if (socket.readyState === WebSocket.CONNECTING) socket.terminate();
}

function closeForWebSocketError(error: Error): { code: number; reason: string } {
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (code === 'WS_ERR_UNSUPPORTED_MESSAGE_LENGTH') {
    return CDP_WEBSOCKET_LOCAL_CLOSE.messageTooBig;
  }
  if (code.startsWith('WS_ERR_')) return CDP_WEBSOCKET_LOCAL_CLOSE.protocolError;
  return CDP_WEBSOCKET_LOCAL_CLOSE.internalError;
}

function guardProtocolErrors(
  socket: WebSocket,
  closeLocally: (close: { code: number; reason: string }) => void,
): void {
  // ws sends its protocol close before the public error event. The pinned receiver hook lets the
  // bridge put the required fixed, redacted reason on the wire before ws handles the same error.
  const receiver = (
    socket as unknown as {
      _receiver?: {
        prependListener(event: 'error', listener: (error: Error) => void): unknown;
      };
    }
  )._receiver;
  receiver?.prependListener('error', (error) => closeLocally(closeForWebSocketError(error)));
}

function hasValidWebSocketHandshake(request: IncomingMessage): boolean {
  const key = request.headers['sec-websocket-key'];
  const upgrade = request.headers.upgrade;
  const version = request.headers['sec-websocket-version'];
  if (
    request.method !== 'GET' ||
    typeof upgrade !== 'string' ||
    upgrade.toLowerCase() !== 'websocket' ||
    typeof key !== 'string' ||
    !/^[+/0-9A-Za-z]{22}==$/u.test(key) ||
    typeof version !== 'string' ||
    (Number(version) !== 13 && Number(version) !== 8)
  ) {
    return false;
  }

  const protocolHeader = request.headers['sec-websocket-protocol'];
  if (protocolHeader === undefined) return true;
  if (typeof protocolHeader !== 'string') return false;

  const protocols = new Set<string>();
  for (const rawProtocol of protocolHeader.split(',')) {
    const protocol = rawProtocol.replace(/^[\t ]+|[\t ]+$/gu, '');
    if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(protocol) || protocols.has(protocol)) return false;
    protocols.add(protocol);
  }
  return true;
}

function isHandshakeTimeout(error: Error): boolean {
  return error.message === 'Opening handshake has timed out';
}

function writeUpgradeError(socket: Duplex, response: CdpWebSocketUpgradeErrorResponse): void {
  if (!socket.writable) return;
  const headers = Object.entries(response.headers)
    .map(([name, value]) => `${name}: ${value}\r\n`)
    .join('');
  socket.end(
    `HTTP/1.1 ${response.status} Error\r\n${headers}Connection: close\r\n\r\n${response.body.toString()}`,
  );
}

function safelyReportActivity(
  callback: CdpWebSocketProxyOptions['onActivity'],
  activeConnections: number,
): void {
  try {
    callback?.({ activeConnections, kind: 'websocket' });
  } catch {
    // Diagnostic callbacks never affect proxy behavior.
  }
}

function safelyReportBrowserLoss(callback: CdpWebSocketProxyOptions['onBrowserLoss']): void {
  try {
    callback?.();
  } catch {
    // Lifecycle observers cannot change relay cleanup.
  }
}

function safelyReportSecurityRejection(
  callback: CdpWebSocketProxyOptions['onSecurityRejection'],
  category: CdpSecurityRejectionCategory,
): void {
  try {
    callback?.(category);
  } catch {
    // Diagnostic callbacks never affect proxy behavior.
  }
}

function hasMismatchedCapability(requestTarget: string, expectedCapability: string): boolean {
  if (!requestTarget.startsWith('/cdp/')) return false;
  const capability = requestTarget.slice('/cdp/'.length).split('/', 1)[0] ?? '';
  return !matchesCdpCapability(expectedCapability, capability);
}

function isBrowserCloseMessage(data: RawData, isBinary: boolean): boolean {
  if (isBinary) return false;
  try {
    const payload = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8')) as unknown;
    return (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload) &&
      'method' in payload &&
      payload.method === 'Browser.close'
    );
  } catch {
    return false;
  }
}

const dummyCapability = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
