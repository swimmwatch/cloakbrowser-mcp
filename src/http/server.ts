import { randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, type Implementation } from '@modelcontextprotocol/sdk/types.js';
import { createBridgeServer, type BridgeServer } from '../server.js';
import { createSessionStore, type HttpSessionRecord, type SessionStore } from './sessionStore.js';
import { streamableHttpProbePaths, type HttpSessionBackend, type StreamableHttpOptions } from './options.js';
import { HttpStatus, JsonRpcErrorCode } from './status.js';

const mcpSessionIdHeader = 'mcp-session-id';
const jsonRpcContentType = 'application/json';
const healthzPath = streamableHttpProbePaths[0];
const readyzPath = streamableHttpProbePaths[1];
const allowedMethods = 'GET, POST, DELETE';

export interface StartStreamableHttpBridgeOptions extends StreamableHttpOptions {
  serverInfo?: Partial<Implementation>;
  sessionStore?: SessionStore;
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

export function isEndpointRequest(req: IncomingMessage, endpoint: string, fallbackHost: string): boolean {
  const host = getSingleHeader(req, 'host') ?? formatHost(fallbackHost);
  const url = new URL(req.url ?? '/', `http://${host}`);
  return url.pathname === endpoint;
}

class StreamableHttpBridgeController {
  readonly #options: StartStreamableHttpBridgeOptions;
  readonly #store: SessionStore;
  readonly #sessions = new Map<string, ActiveHttpSession>();
  readonly #closing = new Map<string, Promise<void>>();
  readonly #httpServer: Server;
  readonly #cleanupTimer: NodeJS.Timeout;
  readonly #startedAt = Date.now();
  #pendingSessionInitializations = 0;

  constructor(options: StartStreamableHttpBridgeOptions) {
    this.#options = options;
    this.#store = options.sessionStore ?? createSessionStore(options.sessionBackend);
    this.#httpServer = createServer((req, res) => {
      void this.#handleRequest(req, res);
    });
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
    const address = this.#httpServer.address();
    if (typeof address === 'string' || address === null) {
      throw new Error('HTTP server did not expose a TCP address');
    }
    return {
      address,
      url: `http://${formatHost(address.address)}:${address.port}${this.#options.endpoint}`,
      close: async () => {
        clearInterval(this.#cleanupTimer);
        await Promise.allSettled([...this.#sessions.keys()].map((id) => this.#closeSession(id)));
        await closeHttpServer(this.#httpServer);
        await this.#store.clear();
      },
    };
  }

  async #handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (isEndpointRequest(req, healthzPath, this.#options.host)) {
        this.#handleHealthProbe(req, res);
        return;
      }

      if (isEndpointRequest(req, readyzPath, this.#options.host)) {
        await this.#handleReadinessProbe(req, res);
        return;
      }

      if (!isEndpointRequest(req, this.#options.endpoint, this.#options.host)) {
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
        res.end();
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

    const sessionId = getSingleHeader(req, mcpSessionIdHeader);
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
    const now = Date.now();
    if (this.#sessions.size + this.#pendingSessionInitializations >= this.#options.sessionMax) {
      writeJsonRpcError(
        res,
        HttpStatus.ServiceUnavailable,
        JsonRpcErrorCode.ServerError,
        'HTTP session limit reached',
      );
      return;
    }

    this.#pendingSessionInitializations += 1;
    const sessionId = randomUUID();
    const record: HttpSessionRecord = {
      id: sessionId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.#options.sessionIdleTtlMs,
      status: 'active',
    };

    const transport = new StreamableHTTPServerTransport({
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

    try {
      const bridge = await createBridgeServer({
        serverInfo: this.#options.serverInfo,
        runtimeOptions: { browserIsolated: true },
      });
      this.#sessions.set(sessionId, { id: sessionId, bridge, transport });
      await bridge.start(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      await this.#closeSession(sessionId);
      throw error;
    } finally {
      this.#pendingSessionInitializations -= 1;
    }
  }

  async #handleSessionRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody?: unknown,
  ): Promise<void> {
    const sessionId = getSingleHeader(req, mcpSessionIdHeader);
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
    if (!record || record.status !== 'active' || record.expiresAt <= now || !session) {
      if (record?.status === 'active' && record.expiresAt <= now) await this.#closeSession(sessionId);
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
      transport: 'streamable-http',
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
      transport: 'streamable-http',
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
}

function hasJsonContentType(req: IncomingMessage): boolean {
  const contentType = getSingleHeader(req, 'content-type');
  return contentType?.toLowerCase().includes(jsonRpcContentType) ?? false;
}

async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
  const contentLength = getSingleHeader(req, 'content-length');
  if (contentLength !== undefined && Number.parseInt(contentLength, 10) > limitBytes) {
    throw new RequestBodyTooLargeError();
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.byteLength;
    if (size > limitBytes) throw new RequestBodyTooLargeError();
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

function containsInitializeRequest(value: unknown): boolean {
  const messages = Array.isArray(value) ? value : [value];
  return messages.some((message) => isInitializeRequest(message));
}

function getSingleHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

function writeJsonRpcError(
  res: ServerResponse,
  status: HttpStatus,
  code: JsonRpcErrorCode,
  message: string,
  headers: Record<string, string> = {},
  data?: string,
): void {
  const error: { code: number; message: string; data?: string } = { code, message };
  if (data !== undefined) error.data = data;
  res.writeHead(status, {
    'Content-Type': jsonRpcContentType,
    ...headers,
  });
  res.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error,
      id: null,
    }),
  );
}

function writeJsonResponse(
  res: ServerResponse,
  status: HttpStatus,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'Content-Type': jsonRpcContentType,
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function formatHost(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) return host;
  return host.includes(':') ? `[${host}]` : host;
}

function timingSafeStringEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function closeHttpServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function listenHttpServer(server: Server, port: number, host: string): Promise<void> {
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

class RequestBodyTooLargeError extends Error {}

export type { HttpSessionBackend };
