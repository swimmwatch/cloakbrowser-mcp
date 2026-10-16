import { randomUUID, timingSafeEqual } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import process from 'node:process';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { type Implementation } from '@modelcontextprotocol/sdk/types.js';
import { CdpPortAllocator, CdpPortBindError, CdpPortPoolExhaustedError } from '#src/cdp/allocator';
import { type CdpEndpointConfig, resolveCdpSessionEnabled } from '#src/cdp/config';
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
import { ManagedCdpBootstrapToolError } from '#src/cdp/session';
import { MCP_SESSION_ID_HEADER } from '#src/protocol/constants';
import { type BridgeServer, createBridgeServer, startManagedCdpBridge } from '#src/server';
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
import {
  type BridgeRuntime,
  BridgeRuntimeConfigurationError,
  prepareBridgeRuntime,
  type PrepareBridgeRuntimeOptions,
  type ReleaseChannel,
  resolveEffectiveHeadless,
} from '#src/bridge/config';
const allowedMethods = 'GET, POST, DELETE';
export interface StartStreamableHttpBridgeOptions extends StreamableHttpOptions {
  cdp?: CdpEndpointConfig;
  cdpAllocator?: CdpPortAllocator;
  releaseChannel?: ReleaseChannel;
  serverInfo?: Partial<Implementation>;
  runtimeOptions?: Pick<
    PrepareBridgeRuntimeOptions,
    | 'binaryPath'
    | 'contextOptions'
    | 'extensionMode'
    | 'extensionPaths'
    | 'geoipProxyMatch'
    | 'headless'
    | 'humanize'
    | 'humanPreset'
    | 'proxy'
    | 'profileDirName'
    | 'userDataDir'
  >;
  ensureDockerDisplay?: () => Promise<void>;
  sessionStore?: SessionStore;
  logger?: BridgeLogger;
  startManagedCdpBridge?: typeof startManagedCdpBridge;
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
  termination: {
    accepted: boolean;
  };
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
  readonly #cdpAllocator: CdpPortAllocator | undefined;
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
    this.#cdpAllocator =
      options.cdpAllocator ??
      (options.cdp?.portRange === undefined ? undefined : new CdpPortAllocator(options.cdp.portRange));
    this.#store = options.sessionStore ?? createSessionStore(options.sessionBackend);
    const requestListener = (req: IncomingMessage, res: ServerResponse): void => {
      void this.#handleRequest(req, res);
    };
    this.#httpServer = createStreamableNodeServer(options, requestListener);
    const minResult = Math.min(options.sessionIdleTtlMs, 60000);
    this.#cleanupTimer = setInterval(() => {
      void this.#closeExpiredSessions();
    }, minResult);
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
        const mappedValues = [...this.#sessions.keys()].map((id) => this.#closeSession(id));
        await Promise.allSettled(mappedValues);
        await closeHttpServer(this.#httpServer);
        await this.#store.clear();
      },
    };
  }
  #warnIfUnsafeHttpExposure(): void {
    if (this.#options.protocol !== HTTP_PROTOCOL_HTTP) return;
    if (this.#options.authToken !== undefined) return;
    if (isLoopbackHost(this.#options.host)) return;
    const warnOptions = {
      endpoint: this.#options.endpoint,
      host: this.#options.host,
      protocol: this.#options.protocol,
    } as const;
    this.#options.logger?.warn(warnOptions, 'streamable-http bound to non-loopback host without auth or TLS');
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
        const writeJsonRpcErrorOptions = {
          'WWW-Authenticate': 'Bearer',
        } as const;
        writeJsonRpcError(
          res,
          HttpStatus.Unauthorized,
          JsonRpcErrorCode.ServerError,
          'Unauthorized',
          writeJsonRpcErrorOptions,
        );
        return;
      }
      await this.#closeExpiredSessions();
      const method = req.method ?? '';
      if (method !== 'GET' && method !== 'POST' && method !== 'DELETE') {
        const writeJsonRpcErrorOptions2 = {
          Allow: allowedMethods,
        } as const;
        writeJsonRpcError(
          res,
          HttpStatus.MethodNotAllowed,
          JsonRpcErrorCode.ServerError,
          'Method not allowed.',
          writeJsonRpcErrorOptions2,
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
    const nowResult = Date.now();
    const record = this.#createSessionRecord(sessionId, nowResult);
    const termination = { accepted: false };
    const transport = this.#createSessionTransport(sessionId, record, termination);
    const runtimeOptions = this.#createRuntimeOptionsForSession(sessionRuntimeOptions);
    let runtime: BridgeRuntime | undefined;
    let bridge: BridgeServer | undefined;
    let sessionRegistered = false;
    let clientDisconnected = req.aborted || res.destroyed;
    const handleClientDisconnect = (): void => {
      clientDisconnected = true;
      void this.#closeSession(sessionId);
    };
    const handleResponseClose = (): void => {
      if (!res.writableFinished) handleClientDisconnect();
    };
    req.once('aborted', handleClientDisconnect);
    res.once('close', handleResponseClose);
    try {
      const computedValue = this.#options.cdp?.processEnabled ?? false;
      const cdpEnabled = resolveCdpSessionEnabled(computedValue, sessionRuntimeOptions.cdpEnabled);
      if (cdpEnabled) {
        if (!this.#options.cdp || !this.#cdpAllocator) {
          throw new BridgeRuntimeConfigurationError('Managed CDP requires a configured CDP port range');
        }
        const startManaged = this.#options.startManagedCdpBridge ?? startManagedCdpBridge;
        bridge = await (() => {
          const startManagedOptions: import('#src/server').StartBridgeOptions = {
            beforeConnect: async (prepared) => {
              await this.#prepareRuntimeEnvironment(prepared, runtimeOptions);
            },
            onCdpActivity: () => {
              void (() => {
                const nowResult2 = Date.now();
                return this.#store.touch(sessionId, nowResult2, this.#options.sessionIdleTtlMs);
              })();
            },
            onCdpCleanupError: () => {
              const warnOptions2 = {} as const;
              this.#options.logger?.warn(warnOptions2, 'managed CDP cleanup failed');
            },
            onCdpRecoveryError: () => {
              const warnOptions3 = {} as const;
              this.#options.logger?.warn(warnOptions3, 'managed CDP recovery failed');
            },
            onCdpSecurityRejections: (summary) => {
              const warnOptions4 = {
                capability: summary.capability,
                host: summary.host,
                origin: summary.origin,
                window_seconds: summary.windowSeconds,
              } as const;
              this.#options.logger?.warn(warnOptions4, 'cdp_security_rejections');
            },
            runtimeOptions,
            serverInfo: this.#options.serverInfo,
          };
          return startManaged(startManagedOptions, this.#options.cdp, this.#cdpAllocator);
        })();
      } else {
        runtime = await prepareBridgeRuntime(runtimeOptions);
        await this.#prepareRuntimeEnvironment(runtime, runtimeOptions);
        if (clientDisconnected) return;
        bridge = await (() => {
          const createBridgeServerOptions = {
            serverInfo: this.#options.serverInfo,
            runtime,
          } as const;
          return createBridgeServer(createBridgeServerOptions);
        })();
        runtime = undefined;
      }
      if (clientDisconnected) {
        await bridge.dispose();
        bridge = undefined;
        return;
      }
      const setOptions = { id: sessionId, bridge, transport, termination } as const;
      this.#sessions.set(sessionId, setOptions);
      sessionRegistered = true;
      await bridge.start(transport);
      if (clientDisconnected) {
        await this.#closeSession(sessionId);
        return;
      }
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      if (sessionRegistered) await this.#closeSession(sessionId);
      else await bridge?.dispose();
      if (clientDisconnected) return;
      if (error instanceof ManagedCdpBootstrapToolError) {
        const fields = { stage: 'managed-cdp-bootstrap', reason: error.message };
        this.#options.logger?.warn(fields, 'http session initialization failed');
      }
      if (this.#handleInitializeError(res, error)) return;
      throw error;
    } finally {
      req.off('aborted', handleClientDisconnect);
      res.off('close', handleResponseClose);
      runtime?.dispose();
      this.#pendingSessionInitializations -= 1;
    }
  }
  async #prepareRuntimeEnvironment(
    runtime: BridgeRuntime,
    runtimeOptions: PrepareBridgeRuntimeOptions,
  ): Promise<void> {
    if (!resolveEffectiveHeadless(runtimeOptions)) {
      await this.#options.ensureDockerDisplay?.();
    }
    if (process.env.DISPLAY !== undefined) runtime.childEnv.DISPLAY = process.env.DISPLAY;
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
  #createSessionTransport(
    sessionId: string,
    record: HttpSessionRecord,
    termination: {
      accepted: boolean;
    },
  ): StreamableHTTPServerTransport {
    const streamableHTTPServerTransportOptions:
      | import('@modelcontextprotocol/sdk/server/webStandardStreamableHttp').WebStandardStreamableHTTPServerTransportOptions
      | undefined = {
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: async (initializedSessionId) => {
        if (initializedSessionId !== sessionId) {
          const message2 = `Unexpected HTTP session ID "${initializedSessionId}"`;
          throw new Error(message2);
        }
        await this.#store.create(record);
      },
      onsessionclosed: async (closedSessionId) => {
        if (closedSessionId) {
          termination.accepted = true;
          const nowResult3 = Date.now();
          await this.#store.markClosed(closedSessionId, nowResult3);
        }
      },
    };
    return new StreamableHTTPServerTransport(streamableHTTPServerTransportOptions);
  }
  #createRuntimeOptionsForSession(
    sessionRuntimeOptions: BridgeInitializeRuntimeOptions,
  ): PrepareBridgeRuntimeOptions {
    const defaults = this.#options.runtimeOptions;
    const extensionMode = preferSessionOption(sessionRuntimeOptions.extensionMode, defaults?.extensionMode);
    return {
      binaryPath: defaults?.binaryPath,
      browserIsolated: extensionMode === true ? false : true,
      extensionMode,
      geoipProxyMatch: preferSessionOption(sessionRuntimeOptions.geoipProxyMatch, defaults?.geoipProxyMatch),
      headless: preferSessionOption(sessionRuntimeOptions.headless, defaults?.headless),
      humanize: preferSessionOption(sessionRuntimeOptions.humanize, defaults?.humanize),
      humanPreset: preferSessionOption(sessionRuntimeOptions.humanPreset, defaults?.humanPreset),
      releaseChannel: this.#options.releaseChannel,
      userDataDir: preferSessionOption(sessionRuntimeOptions.userDataDir, defaults?.userDataDir),
      contextOptions: mergeContextOptions(defaults?.contextOptions, sessionRuntimeOptions.contextOptions),
      extensionPaths: preferSessionOption(sessionRuntimeOptions.extensionPaths, defaults?.extensionPaths),
      proxy: preferSessionOption(sessionRuntimeOptions.proxy, defaults?.proxy),
      profileDirName: preferSessionOption(sessionRuntimeOptions.profileDirName, defaults?.profileDirName),
    };
  }
  #handleInitializeError(res: ServerResponse, error: unknown): boolean {
    if (error instanceof BridgeRuntimeConfigurationError) {
      writeJsonRpcError(res, HttpStatus.BadRequest, JsonRpcErrorCode.ServerError, error.message);
      return true;
    }
    if (error instanceof CdpPortPoolExhaustedError || error instanceof CdpPortBindError) {
      writeJsonRpcError(
        res,
        HttpStatus.ServiceUnavailable,
        JsonRpcErrorCode.ServerError,
        'Managed CDP capacity unavailable',
      );
      return true;
    }
    return false;
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
    const nowResult4 = Date.now();
    await this.#store.touch(sessionId, nowResult4, this.#options.sessionIdleTtlMs);
    try {
      await session.transport.handleRequest(req, res, parsedBody);
    } finally {
      if (req.method === 'DELETE' && session.termination.accepted) await this.#closeSession(sessionId);
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
    const nowResult5 = Date.now();
    const expired = await this.#store.listExpired(nowResult5);
    const mappedValues2 = expired.map((record) => this.#closeSession(record.id));
    await Promise.allSettled(mappedValues2);
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
    const nowResult6 = Date.now();
    await this.#store.markClosed(sessionId, nowResult6);
    if (!session) return;
    await session.bridge.dispose();
  }
  #handleHealthProbe(req: IncomingMessage, res: ServerResponse): void {
    if (!this.#authorizeProbeRequest(req, res)) return;
    if (req.method !== 'GET') {
      const writeJsonResponseOptions = { status: 'method_not_allowed' } as const;
      const writeJsonResponseOptions2 = { Allow: 'GET' } as const;
      writeJsonResponse(
        res,
        HttpStatus.MethodNotAllowed,
        writeJsonResponseOptions,
        writeJsonResponseOptions2,
      );
      return;
    }
    const argumentValue = HttpStatus.Ok;
    const writeJsonResponseOptions3 = {
      status: 'ok',
      version: this.#options.serverInfo?.version ?? 'unknown',
      transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
      uptimeMs: this.#uptimeMs(),
    } as const;
    writeJsonResponse(res, argumentValue, writeJsonResponseOptions3);
  }
  async #handleReadinessProbe(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!this.#authorizeProbeRequest(req, res)) return;
    if (req.method !== 'GET') {
      const writeJsonResponseOptions4 = { status: 'method_not_allowed' } as const;
      const writeJsonResponseOptions5 = { Allow: 'GET' } as const;
      writeJsonResponse(
        res,
        HttpStatus.MethodNotAllowed,
        writeJsonResponseOptions4,
        writeJsonResponseOptions5,
      );
      return;
    }
    await this.#closeExpiredSessions();
    const active = this.#sessions.size;
    const pending = this.#pendingSessionInitializations;
    const max = this.#options.sessionMax;
    const computedValue2 = max - active - pending;
    const available = Math.max(computedValue2, 0);
    const ready = available > 0;
    const argumentValue2 = ready ? HttpStatus.Ok : HttpStatus.ServiceUnavailable;
    const writeJsonResponseOptions6 = {
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
    } as const;
    writeJsonResponse(res, argumentValue2, writeJsonResponseOptions6);
  }
  #authorizeProbeRequest(req: IncomingMessage, res: ServerResponse): boolean {
    if (isAuthorizedRequest(req, this.#options.authToken)) return true;
    const writeJsonResponseOptions7 = { status: 'unauthorized' } as const;
    const writeJsonResponseOptions8 = { 'WWW-Authenticate': 'Bearer' } as const;
    writeJsonResponse(res, HttpStatus.Unauthorized, writeJsonResponseOptions7, writeJsonResponseOptions8);
    return false;
  }
  #uptimeMs(): number {
    const computedValue3 = Date.now() - this.#startedAt;
    return Math.max(computedValue3, 0);
  }
  #logRequestOnFinish(req: IncomingMessage, res: ServerResponse, startedAt: number): void {
    const logger = this.#options.logger;
    if (!logger) return;
    res.once('finish', () => {
      const method = req.method ?? 'UNKNOWN';
      const pathName = requestPathName(req, this.#options.host, this.#options.protocol);
      const computedValue4 = Date.now() - startedAt;
      const durationMs = Math.max(computedValue4, 0);
      const infoOptions = {
        duration_ms: durationMs,
        method,
        path: pathName,
        status: res.statusCode,
      } as const;
      logger.info(infoOptions, 'http request');
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
