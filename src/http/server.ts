import { randomUUID, timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type Implementation } from '@modelcontextprotocol/sdk/types.js';
import {
  BRIDGE_TRANSPORT_STREAMABLE_HTTP,
  HEALTHZ_PATH,
  HTTP_PROTOCOL_HTTP,
  type HttpSessionBackend,
  READYZ_PATH,
  type StreamableHttpOptions,
} from '#src/http/options';
import {
  createSessionStore,
  HTTP_SESSION_STATUS_ACTIVE,
  type HttpSessionRecord,
  type SessionStore,
} from '#src/http/sessionStore';
import { HttpStatus, JsonRpcErrorCode } from '#src/http/status';
import type { BridgeLogger } from '#src/logging/logger';
import { MCP_SESSION_ID_HEADER } from '#src/protocol/constants';
import { type BridgeServer, createBridgeServer } from '#src/server';
import {
  closeHttpServer,
  createStreamableNodeServer,
  formatHost,
  listenHttpServer,
  type StreamableNodeServer,
} from '#src/http/nodeServer';
import {
  type BridgeInitializeRuntimeOptions,
  containsInitializeRequest,
  getSingleHeader,
  hasJsonContentType,
  InvalidBridgeInitializeMetaError,
  isEndpointRequest,
  readBridgeRuntimeOptionsFromInitialize,
  readJsonBody,
  RequestBodyTooLargeError,
  requestPathName,
} from '#src/http/requests';
import { endResponse, writeJsonResponse, writeJsonRpcError } from '#src/http/responses';
import { BridgeRuntimeConfigurationError, type PrepareBridgeRuntimeOptions } from '#src/bridge/config';

const allowedMethods = 'GET, POST, DELETE';

export interface StartStreamableHttpBridgeOptions extends StreamableHttpOptions {
  serverInfo?: Partial<Implementation>;
  runtimeOptions?: Pick<
    PrepareBridgeRuntimeOptions,
    | 'contextOptions'
    | 'extensionPaths'
    | 'geoipProxyMatch'
    | 'headless'
    | 'humanize'
    | 'humanPreset'
    | 'proxy'
    | 'userDataDir'
  >;
  sessionStore?: SessionStore;
  logger?: BridgeLogger;
}

export interface StreamableHttpBridgeServer {
  url: string;
  address: AddressInfo;
  close(): Promise<void>;
}

interface ActiveHttpSession {
  id: string;
  bridge: BridgeServer;
  transport: StreamableHTTPServerTransport;
}

export async function startStreamableHttpBridge(
  options: StartStreamableHttpBridgeOptions,
): Promise<StreamableHttpBridgeServer> {
  const controller = new StreamableHttpBridgeController(options);
  return controller.start();
}

export function isAuthorizedRequest(req: IncomingMessage, authToken: string | undefined): boolean {
  if (authToken === undefined) return true;
  const authorization = getSingleHeader(req, 'authorization');
  if (!authorization) return false;

  const parts = authorization.trim().split(/\s+/);
  if (parts.length !== 2) return false;

  const [scheme, token] = parts;
  return scheme.toLowerCase() === 'bearer' && timingSafeStringEqual(token, authToken);
}

export { isEndpointRequest } from '#src/http/requests';

class StreamableHttpBridgeController {
  readonly #options: StartStreamableHttpBridgeOptions;
  readonly #store: SessionStore;
  readonly #sessions = new Map<string, ActiveHttpSession>();
  readonly #closing = new Map<string, Promise<void>>();
  readonly #httpServer: StreamableNodeServer;
  readonly #cleanupTimer: NodeJS.Timeout;
  readonly #startedAt = Date.now();
  #pendingSessionInitializations = 0;

  constructor(options: StartStreamableHttpBridgeOptions) {
    this.#options = options;
    this.#store = options.sessionStore ?? createSessionStore(options.sessionBackend);
    const requestListener = (req: IncomingMessage, res: ServerResponse): void => {
      void this.#handleRequest(req, res);
    };
    this.#httpServer = createStreamableNodeServer(options, requestListener);
    this.#cleanupTimer = setInterval(
      () => {
        void this.#closeExpiredSessions();
      },
      Math.min(options.sessionIdleTtlMs, 60_000),
    );
    this.#cleanupTimer.unref();
  }

  async start(): Promise<StreamableHttpBridgeServer> {
    await listenHttpServer(this.#httpServer, this.#options.port, this.#options.host);
    this.#warnIfUnsafeHttpExposure();
    const address = this.#httpServer.address();
    if (typeof address === 'string' || address === null) {
      throw new Error('HTTP server did not expose a TCP address');
    }
    return {
      address,
      url: `${this.#options.protocol}://${formatHost(address.address)}:${address.port}${this.#options.endpoint}`,
      close: async () => {
        clearInterval(this.#cleanupTimer);
        await Promise.allSettled([...this.#sessions.keys()].map((id) => this.#closeSession(id)));
        await closeHttpServer(this.#httpServer);
        await this.#store.clear();
      },
    };
  }

  #warnIfUnsafeHttpExposure(): void {
    if (this.#options.protocol !== HTTP_PROTOCOL_HTTP) return;
    if (this.#options.authToken !== undefined) return;
    if (isLoopbackHost(this.#options.host)) return;
    this.#options.logger?.warn(
      {
        endpoint: this.#options.endpoint,
        host: this.#options.host,
        protocol: this.#options.protocol,
      },
      'streamable-http bound to non-loopback host without auth or TLS',
    );
  }

  async #handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const startedAt = Date.now();
    this.#logRequestOnFinish(req, res, startedAt);
    try {
      if (isEndpointRequest(req, HEALTHZ_PATH, this.#options.host, this.#options.protocol)) {
        this.#handleHealthProbe(req, res);
        return;
      }

      if (isEndpointRequest(req, READYZ_PATH, this.#options.host, this.#options.protocol)) {
        await this.#handleReadinessProbe(req, res);
        return;
      }

      if (!isEndpointRequest(req, this.#options.endpoint, this.#options.host, this.#options.protocol)) {
        writeJsonRpcError(res, HttpStatus.NotFound, JsonRpcErrorCode.ServerError, 'Not found');
        return;
      }

      if (!isAuthorizedRequest(req, this.#options.authToken)) {
        writeJsonRpcError(res, HttpStatus.Unauthorized, JsonRpcErrorCode.ServerError, 'Unauthorized', {
          'WWW-Authenticate': 'Bearer',
        });
        return;
      }

      await this.#closeExpiredSessions();

      const method = req.method ?? '';
      if (method !== 'GET' && method !== 'POST' && method !== 'DELETE') {
        writeJsonRpcError(
          res,
          HttpStatus.MethodNotAllowed,
          JsonRpcErrorCode.ServerError,
          'Method not allowed.',
          {
            Allow: allowedMethods,
          },
        );
        return;
      }

      if (method === 'POST') {
        await this.#handlePostRequest(req, res);
        return;
      }

      await this.#handleSessionRequest(req, res);
    } catch {
      if (!res.headersSent) {
        writeJsonRpcError(
          res,
          HttpStatus.InternalServerError,
          JsonRpcErrorCode.InternalError,
          'Internal server error',
        );
      } else {
        endResponse(res);
      }
    }
  }

  async #handlePostRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!hasJsonContentType(req)) {
      writeJsonRpcError(
        res,
        HttpStatus.UnsupportedMediaType,
        JsonRpcErrorCode.ServerError,
        'Unsupported Media Type: Content-Type must be application/json',
      );
      return;
    }

    let parsedBody: unknown;
    try {
      parsedBody = await readJsonBody(req, this.#options.bodyLimitBytes);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        writeJsonRpcError(
          res,
          HttpStatus.PayloadTooLarge,
          JsonRpcErrorCode.ServerError,
          'Request body too large',
        );
      } else {
        writeJsonRpcError(
          res,
          HttpStatus.BadRequest,
          JsonRpcErrorCode.ParseError,
          'Parse error: Invalid JSON',
        );
      }
      return;
    }

    const sessionId = getSingleHeader(req, MCP_SESSION_ID_HEADER);
    if (sessionId) {
      await this.#handleSessionRequest(req, res, parsedBody);
      return;
    }

    if (!containsInitializeRequest(parsedBody)) {
      writeJsonRpcError(
        res,
        HttpStatus.BadRequest,
        JsonRpcErrorCode.ServerError,
        'Bad Request: No valid session ID provided',
      );
      return;
    }

    await this.#handleInitializeRequest(req, res, parsedBody);
  }

  async #handleInitializeRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
  ): Promise<void> {
    const sessionRuntimeOptions = this.#readSessionRuntimeOptions(res, parsedBody);
    if (sessionRuntimeOptions === undefined) return;

    if (!this.#reserveSessionSlot(res)) return;

    const sessionId = randomUUID();
    const record = this.#createSessionRecord(sessionId, Date.now());
    const transport = this.#createSessionTransport(sessionId, record);

    try {
      const bridge = await createBridgeServer({
        serverInfo: this.#options.serverInfo,
        runtimeOptions: this.#createRuntimeOptionsForSession(sessionRuntimeOptions),
      });
      this.#sessions.set(sessionId, { id: sessionId, bridge, transport });
      await bridge.start(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      await this.#closeSession(sessionId);
      if (this.#handleInitializeError(res, error)) return;
      throw error;
    } finally {
      this.#pendingSessionInitializations -= 1;
    }
  }

  #readSessionRuntimeOptions(
    res: ServerResponse,
    parsedBody: unknown,
  ): BridgeInitializeRuntimeOptions | undefined {
    try {
      return readBridgeRuntimeOptionsFromInitialize(parsedBody);
    } catch (error) {
      if (error instanceof InvalidBridgeInitializeMetaError) {
        writeJsonRpcError(res, HttpStatus.BadRequest, JsonRpcErrorCode.ServerError, error.message);
        return undefined;
      }
      throw error;
    }
  }

  #reserveSessionSlot(res: ServerResponse): boolean {
    if (this.#sessions.size + this.#pendingSessionInitializations < this.#options.sessionMax) {
      this.#pendingSessionInitializations += 1;
      return true;
    }

    writeJsonRpcError(
      res,
      HttpStatus.ServiceUnavailable,
      JsonRpcErrorCode.ServerError,
      'HTTP session limit reached',
    );
    return false;
  }

  #createSessionRecord(sessionId: string, now: number): HttpSessionRecord {
    return {
      id: sessionId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.#options.sessionIdleTtlMs,
      status: HTTP_SESSION_STATUS_ACTIVE,
    };
  }

  #createSessionTransport(sessionId: string, record: HttpSessionRecord): StreamableHTTPServerTransport {
    return new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: async (initializedSessionId) => {
        if (initializedSessionId !== sessionId) {
          throw new Error(`Unexpected HTTP session ID "${initializedSessionId}"`);
        }
        await this.#store.create(record);
      },
      onsessionclosed: async (closedSessionId) => {
        if (closedSessionId) await this.#store.markClosed(closedSessionId, Date.now());
      },
    });
  }

  #createRuntimeOptionsForSession(
    sessionRuntimeOptions: BridgeInitializeRuntimeOptions,
  ): PrepareBridgeRuntimeOptions {
    const defaults = this.#options.runtimeOptions;
    return {
      browserIsolated: true,
      geoipProxyMatch: preferSessionOption(sessionRuntimeOptions.geoipProxyMatch, defaults?.geoipProxyMatch),
      headless: preferSessionOption(sessionRuntimeOptions.headless, defaults?.headless),
      humanize: preferSessionOption(sessionRuntimeOptions.humanize, defaults?.humanize),
      humanPreset: preferSessionOption(sessionRuntimeOptions.humanPreset, defaults?.humanPreset),
      userDataDir: preferSessionOption(sessionRuntimeOptions.userDataDir, defaults?.userDataDir),
      contextOptions: mergeContextOptions(defaults?.contextOptions, sessionRuntimeOptions.contextOptions),
      extensionPaths: preferSessionOption(sessionRuntimeOptions.extensionPaths, defaults?.extensionPaths),
      proxy: preferSessionOption(sessionRuntimeOptions.proxy, defaults?.proxy),
    };
  }

  #handleInitializeError(res: ServerResponse, error: unknown): boolean {
    if (!(error instanceof BridgeRuntimeConfigurationError)) return false;
    writeJsonRpcError(res, HttpStatus.BadRequest, JsonRpcErrorCode.ServerError, error.message);
    return true;
  }

  async #handleSessionRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    const sessionId = getSingleHeader(req, MCP_SESSION_ID_HEADER);
    if (!sessionId) {
      writeJsonRpcError(
        res,
        HttpStatus.BadRequest,
        JsonRpcErrorCode.ServerError,
        'Bad Request: Mcp-Session-Id header is required',
      );
      return;
    }

    const session = await this.#getActiveSession(sessionId);
    if (!session) {
      writeJsonRpcError(res, HttpStatus.NotFound, JsonRpcErrorCode.SessionNotFound, 'Session not found');
      return;
    }

    await this.#store.touch(sessionId, Date.now(), this.#options.sessionIdleTtlMs);
    await session.transport.handleRequest(req, res, parsedBody);

    if (req.method === 'DELETE') {
      await this.#closeSession(sessionId);
    }
  }

  async #getActiveSession(sessionId: string): Promise<ActiveHttpSession | undefined> {
    const record = await this.#store.get(sessionId);
    const session = this.#sessions.get(sessionId);
    const now = Date.now();
    if (!record || record.status !== HTTP_SESSION_STATUS_ACTIVE || record.expiresAt <= now || !session) {
      if (record?.status === HTTP_SESSION_STATUS_ACTIVE && record.expiresAt <= now) {
        await this.#closeSession(sessionId);
      }
      return undefined;
    }
    return session;
  }

  async #closeExpiredSessions(): Promise<void> {
    const expired = await this.#store.listExpired(Date.now());
    await Promise.allSettled(expired.map((record) => this.#closeSession(record.id)));
  }

  async #closeSession(sessionId: string): Promise<void> {
    const pending = this.#closing.get(sessionId);
    if (pending) return pending;

    const closing = this.#disposeSession(sessionId).finally(() => {
      this.#closing.delete(sessionId);
    });
    this.#closing.set(sessionId, closing);
    return closing;
  }

  async #disposeSession(sessionId: string): Promise<void> {
    const session = this.#sessions.get(sessionId);
    this.#sessions.delete(sessionId);
    await this.#store.markClosed(sessionId, Date.now());
    if (!session) return;
    await session.bridge.dispose();
  }

  #handleHealthProbe(req: IncomingMessage, res: ServerResponse): void {
    if (!this.#authorizeProbeRequest(req, res)) return;
    if (req.method !== 'GET') {
      writeJsonResponse(res, HttpStatus.MethodNotAllowed, { status: 'method_not_allowed' }, { Allow: 'GET' });
      return;
    }

    writeJsonResponse(res, HttpStatus.Ok, {
      status: 'ok',
      version: this.#options.serverInfo?.version ?? 'unknown',
      transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      uptimeMs: this.#uptimeMs(),
    });
  }

  async #handleReadinessProbe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.#authorizeProbeRequest(req, res)) return;
    if (req.method !== 'GET') {
      writeJsonResponse(res, HttpStatus.MethodNotAllowed, { status: 'method_not_allowed' }, { Allow: 'GET' });
      return;
    }

    await this.#closeExpiredSessions();
    const active = this.#sessions.size;
    const pending = this.#pendingSessionInitializations;
    const max = this.#options.sessionMax;
    const available = Math.max(max - active - pending, 0);
    const ready = available > 0;
    writeJsonResponse(res, ready ? HttpStatus.Ok : HttpStatus.ServiceUnavailable, {
      status: ready ? 'ready' : 'not_ready',
      version: this.#options.serverInfo?.version ?? 'unknown',
      transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      uptimeMs: this.#uptimeMs(),
      sessions: {
        active,
        pending,
        max,
        available,
      },
    });
  }

  #authorizeProbeRequest(req: IncomingMessage, res: ServerResponse): boolean {
    if (isAuthorizedRequest(req, this.#options.authToken)) return true;
    writeJsonResponse(
      res,
      HttpStatus.Unauthorized,
      { status: 'unauthorized' },
      { 'WWW-Authenticate': 'Bearer' },
    );
    return false;
  }

  #uptimeMs(): number {
    return Math.max(Date.now() - this.#startedAt, 0);
  }

  #logRequestOnFinish(req: IncomingMessage, res: ServerResponse, startedAt: number): void {
    const logger = this.#options.logger;
    if (!logger) return;
    res.once('finish', () => {
      const method = req.method ?? 'UNKNOWN';
      const pathName = requestPathName(req, this.#options.host, this.#options.protocol);
      const durationMs = Math.max(Date.now() - startedAt, 0);
      logger.info(
        {
          duration_ms: durationMs,
          method,
          path: pathName,
          status: res.statusCode,
        },
        'http request',
      );
    });
  }
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.trim().toLowerCase();
  const unwrapped =
    normalized.startsWith('[') && normalized.endsWith(']') ? normalized.slice(1, -1) : normalized;
  return unwrapped === 'localhost' || unwrapped === '::1' || /^127(?:\.\d{1,3}){3}$/u.test(unwrapped);
}

function mergeContextOptions(
  envContextOptions: PrepareBridgeRuntimeOptions['contextOptions'],
  sessionContextOptions: PrepareBridgeRuntimeOptions['contextOptions'],
): PrepareBridgeRuntimeOptions['contextOptions'] {
  if (envContextOptions === undefined) return sessionContextOptions;
  if (sessionContextOptions === undefined) return envContextOptions;
  return { ...envContextOptions, ...sessionContextOptions };
}

function preferSessionOption<T>(sessionValue: T | undefined, defaultValue: T | undefined): T | undefined {
  return sessionValue ?? defaultValue;
}

function timingSafeStringEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export type { HttpSessionBackend };
