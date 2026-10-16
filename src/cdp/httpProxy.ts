import {
  request as createHttpRequest,
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
  STATUS_CODES,
} from 'node:http';
import type { Duplex } from 'node:stream';
import type { CdpPortAllocator, CdpPortBinding, CdpPortLease } from '#src/cdp/allocator';
import { generateCdpCapability, isCdpCapability, matchesCdpCapability } from '#src/cdp/capability';
import type { CdpAdvertisedScheme } from '#src/cdp/config';
import {
  CDP_HTTP_MAX_CONCURRENT_REQUESTS,
  CDP_HTTP_MAX_ERROR_BODY_BYTES,
  CDP_HTTP_MAX_REQUEST_HEADER_BYTES,
  CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES,
  CDP_HTTP_REQUEST_HEADER_TIMEOUT_MS,
  CDP_HTTP_UPSTREAM_RESPONSE_TIMEOUT_MS,
} from '#src/cdp/limits';
import {
  type CdpSecurityRejectionCategory,
  type CdpSecurityRejectionReporter,
  type CdpSecurityRejectionSummary,
  createCdpSecurityRejectionReporter,
} from '#src/cdp/security';
import {
  formatCdpAuthority,
  isLoopbackCdpHost,
  rewriteCdpDiscoveryPayload,
  validateCdpHost,
} from '#src/cdp/urls';
import {
  type CdpWebSocketGeneration,
  type CdpWebSocketProxy,
  createCdpWebSocketProxy,
} from '#src/cdp/webSocketProxy';
export type CdpHttpFailureKind =
  | 'not_found'
  | 'method_not_allowed'
  | 'bad_request'
  | 'request_timeout'
  | 'payload_too_large'
  | 'headers_too_large'
  | 'forbidden'
  | 'unavailable'
  | 'upstream_error'
  | 'bad_gateway'
  | 'gateway_timeout'
  | 'internal_error';
export interface CdpHttpErrorResponse {
  body: Buffer;
  headers: Readonly<Record<string, string>>;
  status: number;
}
export type CdpHttpRouteResult =
  | {
      kind: 'not_found';
    }
  | {
      kind: 'bad_request';
    }
  | {
      allow: 'GET' | 'PUT';
      kind: 'route';
      responseKind: 'json' | 'text';
      upstreamPath: string;
    };
export interface CdpUpstreamRequest {
  host: string;
  maxBodyBytes: number;
  method: string;
  path: string;
  port: number;
  timeoutMs: number;
}
export interface CdpUpstreamResponse {
  body: Buffer;
  statusCode: number;
}
export type CdpUpstreamRequestHandler = (request: CdpUpstreamRequest) => Promise<CdpUpstreamResponse>;
export interface StartCdpHttpProxyOptions {
  advertisedHost?: string;
  advertisedScheme: CdpAdvertisedScheme;
  allocator: CdpPortAllocator;
  beforeForward?: (signal: AbortSignal) => Promise<boolean>;
  bindHost: string;
  headerTimeoutMs?: number;
  onActivity?: (
    event:
      | {
          activeConnections: number;
          kind: 'websocket';
        }
      | {
          activeRequests: number;
          kind: 'http_request';
        },
  ) => void;
  onBrowserLoss?: () => void;
  onSecurityRejections?: (summary: CdpSecurityRejectionSummary) => void;
  requestUpstream?: CdpUpstreamRequestHandler;
  upstreamTimeoutMs?: number;
  webSocketHandshakeTimeoutMs?: number;
  webSocketShutdownTimeoutMs?: number;
}
export interface CdpHttpProxy {
  readonly activeConnections: number;
  clearGeneration(): void;
  close(): Promise<void>;
  readonly port: number;
  publishGeneration(options: { capability: string; upstreamHost: string; upstreamPort: number }): void;
  release(): Promise<void>;
  setUnavailableCapability(capability: string): void;
  stageGeneration(options: {
    capability: string;
    upstreamHost: string;
    upstreamPort: number;
  }): Readonly<Record<string, string>>;
  stop(): Promise<void>;
}
export function createCdpHttpErrorResponse(
  kind: CdpHttpFailureKind,
  options: {
    allow?: string;
    upstreamStatus?: number;
  } = {},
): CdpHttpErrorResponse {
  if (kind === 'method_not_allowed' && options.allow === undefined) {
    throw new Error('Method errors require an Allow value');
  }
  if (kind !== 'method_not_allowed' && options.allow !== undefined) {
    throw new Error('Allow is valid only for method errors');
  }
  const policy = errorPolicies[kind];
  const status =
    kind === 'upstream_error' ? validateUpstreamErrorStatus(options.upstreamStatus) : policy.status;
  const stringifyOptions = { error: { code: kind, message: policy.message } } as const;
  const serializedValue = JSON.stringify(stringifyOptions);
  const body = Buffer.from(serializedValue);
  if (body.byteLength > CDP_HTTP_MAX_ERROR_BODY_BYTES) {
    throw new Error('CDP error response exceeds the configured maximum');
  }
  return {
    body,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Length': String(body.byteLength),
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.allow === undefined ? {} : { Allow: options.allow }),
    },
    status,
  };
}
/** Classifies one capability-prefixed HTTP request target without decoding path separators. */
export function classifyCdpHttpRoute(requestTarget: string, expectedCapability: string): CdpHttpRouteResult {
  if (!requestTarget.startsWith('/cdp/')) return { kind: 'not_found' };
  const queryIndex = requestTarget.indexOf('?');
  const rawPath = queryIndex === -1 ? requestTarget : requestTarget.slice(0, queryIndex);
  const rawQuery = queryIndex === -1 ? '' : requestTarget.slice(queryIndex);
  const capabilityAndPath = rawPath.slice('/cdp/'.length);
  const pathIndex = capabilityAndPath.indexOf('/');
  const presentedCapability = pathIndex === -1 ? capabilityAndPath : capabilityAndPath.slice(0, pathIndex);
  if (!matchesCdpCapability(expectedCapability, presentedCapability)) return { kind: 'not_found' };
  if (pathIndex === -1) return { kind: 'not_found' };
  const path = capabilityAndPath.slice(pathIndex);
  return classifyStaticRoute(path, rawQuery) ?? classifyTargetRoute(path, rawQuery);
}
export async function startCdpHttpProxy(options: StartCdpHttpProxyOptions): Promise<CdpHttpProxy> {
  const runtime = new CdpHttpProxyRuntime(options);
  const headerTimeoutMs = options.headerTimeoutMs ?? CDP_HTTP_REQUEST_HEADER_TIMEOUT_MS;
  const computedValue = headerTimeoutMs / 2;
  const floorResult = Math.floor(computedValue);
  const minResult = Math.min(floorResult, 1000);
  const maxResult = Math.max(minResult, 1);
  const currentHeaderTimeoutMs = headerTimeoutMs;
  const computedValue2 = CDP_HTTP_MAX_REQUEST_HEADER_BYTES + 4096;
  const propertyValue = false;
  const propertyValue2 = 0;
  const createServerOptions = {
    connectionsCheckingInterval: maxResult,
    headersTimeout: currentHeaderTimeoutMs,
    maxHeaderSize: computedValue2,
    requireHostHeader: propertyValue,
    requestTimeout: propertyValue2,
  } as const;
  const server = createServer(
    createServerOptions,
    (request, response) => void runtime.handle(request, response),
  );
  server.on('checkContinue', (request, response) => void runtime.handle(request, response));
  server.on('clientError', (error, socket) => writeClientError(error, socket));
  server.on('upgrade', (request, socket, head) => runtime.handleUpgrade(request, socket, head));
  const acquireOptions: import('#src/cdp/allocator').AcquireCdpPortOptions = {
    bind: async (port, host) => await bindServer(server, port, host),
    host: options.bindHost,
  };
  const lease = await options.allocator.acquire(acquireOptions);
  runtime.attachLease(lease);
  return runtime;
}
const values2:
  | Iterable<
      readonly [
        string,
        {
          allow: 'GET' | 'PUT';
          responseKind: 'json' | 'text';
        },
      ]
    >
  | null
  | undefined = [
  ['/json/version', { allow: 'GET', responseKind: 'json' }],
  ['/json/version/', { allow: 'GET', responseKind: 'json' }],
  ['/json', { allow: 'GET', responseKind: 'json' }],
  ['/json/list', { allow: 'GET', responseKind: 'json' }],
  ['/json/protocol', { allow: 'GET', responseKind: 'json' }],
  ['/json/new', { allow: 'PUT', responseKind: 'json' }],
];
const staticRoutes = new Map<
  string,
  {
    allow: 'GET' | 'PUT';
    responseKind: 'json' | 'text';
  }
>(values2);
const errorPolicies: Record<
  CdpHttpFailureKind,
  {
    message: string;
    status: number;
  }
> = {
  bad_gateway: { message: 'Invalid response from Chromium', status: 502 },
  bad_request: { message: 'Invalid CDP request', status: 400 },
  forbidden: { message: 'CDP request forbidden', status: 403 },
  gateway_timeout: { message: 'Chromium response timed out', status: 504 },
  headers_too_large: { message: 'CDP request headers are too large', status: 431 },
  internal_error: { message: 'Internal CDP proxy error', status: 500 },
  method_not_allowed: { message: 'CDP method not allowed', status: 405 },
  not_found: { message: 'CDP endpoint not found', status: 404 },
  payload_too_large: { message: 'CDP request body is not allowed', status: 413 },
  request_timeout: { message: 'CDP request timed out', status: 408 },
  unavailable: { message: 'CDP endpoint unavailable', status: 503 },
  upstream_error: { message: 'Chromium rejected the CDP request', status: 400 },
};
function hasValidQuery(rawQuery: string): boolean {
  if (rawQuery === '') return true;
  try {
    const sliceResult = rawQuery.slice(1);
    decodeURIComponent(sliceResult);
    return true;
  } catch {
    return false;
  }
}
function classifyStaticRoute(path: string, rawQuery: string): CdpHttpRouteResult | undefined {
  const route = staticRoutes.get(path);
  if (route === undefined) return undefined;
  if (rawQuery !== '' && path !== '/json/new') return { kind: 'bad_request' };
  if (path === '/json/new' && !hasValidQuery(rawQuery)) return { kind: 'bad_request' };
  return { ...route, kind: 'route', upstreamPath: `${path}${rawQuery}` };
}
function classifyTargetRoute(path: string, rawQuery: string): CdpHttpRouteResult {
  const prefix = targetRoutePrefixes.find((candidate) => path.startsWith(candidate));
  if (prefix === undefined) return { kind: 'not_found' };
  const targetId = path.slice(prefix.length);
  if (rawQuery !== '' || !/^[A-Za-z0-9_-]+$/u.test(targetId)) return { kind: 'bad_request' };
  return { allow: 'GET', kind: 'route', responseKind: 'text', upstreamPath: path };
}
function validateUpstreamErrorStatus(status: number | undefined): number {
  if (status === undefined || !Number.isInteger(status) || status < 400 || status > 499) {
    throw new Error('Upstream error status must be between 400 and 499');
  }
  return status;
}
type GenerationState =
  | {
      capability: string;
      state: 'unavailable';
    }
  | {
      capability: string;
      readinessToken: string;
      state: 'verifying';
      upstreamHost: string;
      upstreamPort: number;
    }
  | {
      capability: string;
      state: 'ready';
      upstreamHost: string;
      upstreamPort: number;
    };
type RoutedCdpHttpRequest = {
  generation: GenerationState;
  route: Extract<
    CdpHttpRouteResult,
    {
      kind: 'route';
    }
  >;
};
type CdpUpstreamAttempt =
  | {
      failureKind: CdpHttpFailureKind;
      kind: 'error';
    }
  | {
      kind: 'response';
      response: CdpUpstreamResponse;
    };
type CdpPreparedHttpResponse =
  | {
      error: CdpHttpErrorResponse;
      kind: 'error';
    }
  | {
      body: Buffer;
      kind: 'success';
      responseKind: 'json' | 'text';
      status: number;
    };
function acceptLocalHttpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  generation: GenerationState | undefined,
  onSecurityRejection?: (category: CdpSecurityRejectionCategory) => void,
): RoutedCdpHttpRequest | undefined {
  const expectedCapability = generation?.capability ?? dummyCapability;
  const computedValue3 = request.url ?? '';
  if (hasMismatchedCapability(computedValue3, expectedCapability)) {
    safelyReportSecurityRejection(onSecurityRejection, 'capability');
  }
  const computedValue4 = request.url ?? '';
  const route = classifyCdpHttpRoute(computedValue4, expectedCapability);
  if (generation === undefined || route.kind === 'not_found') {
    const cdpHttpErrorResponseResult = createCdpHttpErrorResponse('not_found');
    writeError(response, cdpHttpErrorResponseResult);
    return undefined;
  }
  if (route.kind === 'bad_request') {
    const cdpHttpErrorResponseResult2 = createCdpHttpErrorResponse('bad_request');
    writeError(response, cdpHttpErrorResponseResult2);
    return undefined;
  }
  if (request.method !== route.allow) {
    const createCdpHttpErrorResponseOptions = { allow: route.allow } as const;
    const cdpHttpErrorResponseResult3 = createCdpHttpErrorResponse(
      'method_not_allowed',
      createCdpHttpErrorResponseOptions,
    );
    writeError(response, cdpHttpErrorResponseResult3);
    return undefined;
  }
  const bodyPolicy = requestBodyPolicy(request);
  if (bodyPolicy === 'bad_request') {
    const cdpHttpErrorResponseResult4 = createCdpHttpErrorResponse('bad_request');
    const writeErrorOptions = { closeConnection: true } as const;
    writeError(response, cdpHttpErrorResponseResult4, writeErrorOptions);
    return undefined;
  }
  if (bodyPolicy === 'payload_too_large') {
    const cdpHttpErrorResponseResult5 = createCdpHttpErrorResponse('payload_too_large');
    const writeErrorOptions2 = {
      closeConnection: true,
    } as const;
    writeError(response, cdpHttpErrorResponseResult5, writeErrorOptions2);
    return undefined;
  }
  if (requestHeaderBytes(request) > CDP_HTTP_MAX_REQUEST_HEADER_BYTES) {
    const cdpHttpErrorResponseResult6 = createCdpHttpErrorResponse('headers_too_large');
    writeError(response, cdpHttpErrorResponseResult6);
    return undefined;
  }
  return { generation, route };
}
async function requestCdpUpstreamSafely(
  handler: CdpUpstreamRequestHandler,
  request: CdpUpstreamRequest,
): Promise<CdpUpstreamAttempt> {
  try {
    return { kind: 'response', response: await handler(request) };
  } catch (error) {
    const failureKind: CdpHttpFailureKind =
      error instanceof CdpUpstreamTimeoutError
        ? 'gateway_timeout'
        : error instanceof CdpUpstreamBadGatewayError
          ? 'bad_gateway'
          : 'internal_error';
    return { failureKind, kind: 'error' };
  }
}
function prepareCdpUpstreamResponse(
  upstream: CdpUpstreamResponse,
  route: Extract<
    CdpHttpRouteResult,
    {
      kind: 'route';
    }
  >,
  discovery: {
    capability: string;
    host: string;
    port: number;
    scheme: CdpAdvertisedScheme;
  },
): CdpPreparedHttpResponse {
  if (!Number.isInteger(upstream.statusCode) || upstream.statusCode < 200 || upstream.statusCode > 599) {
    return { error: createCdpHttpErrorResponse('bad_gateway'), kind: 'error' };
  }
  if (upstream.statusCode >= 400 && upstream.statusCode <= 499) {
    const createCdpHttpErrorResponseOptions2 = {
      upstreamStatus: upstream.statusCode,
    } as const;
    const cdpHttpErrorResponseResult7 = createCdpHttpErrorResponse(
      'upstream_error',
      createCdpHttpErrorResponseOptions2,
    );
    const propertyValue3 = 'error';
    return {
      error: cdpHttpErrorResponseResult7,
      kind: propertyValue3,
    };
  }
  if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
    return { error: createCdpHttpErrorResponse('bad_gateway'), kind: 'error' };
  }
  if (route.responseKind === 'text') {
    return {
      body: upstream.body,
      kind: 'success',
      responseKind: route.responseKind,
      status: upstream.statusCode,
    };
  }
  try {
    const toStringResult = upstream.body.toString('utf8');
    const parsed: unknown = JSON.parse(toStringResult);
    const rewriteCdpDiscoveryPayloadResult = rewriteCdpDiscoveryPayload(parsed, discovery);
    const serializedValue2 = JSON.stringify(rewriteCdpDiscoveryPayloadResult);
    const fromResult = Buffer.from(serializedValue2);
    const propertyValue4 = 'success';
    const propertyValue5 = route.responseKind;
    const propertyValue6 = upstream.statusCode;
    return {
      body: fromResult,
      kind: propertyValue4,
      responseKind: propertyValue5,
      status: propertyValue6,
    };
  } catch {
    return { error: createCdpHttpErrorResponse('bad_gateway'), kind: 'error' };
  }
}
class CdpHttpProxyRuntime implements CdpHttpProxy {
  readonly #options: StartCdpHttpProxyOptions;
  readonly #securityRejections: CdpSecurityRejectionReporter;
  readonly #webSocketProxy: CdpWebSocketProxy;
  #activeRequests = 0;
  #generation: GenerationState | undefined;
  #lease: CdpPortLease | undefined;
  #releasePromise: Promise<void> | undefined;
  #stopPromise: Promise<void> | undefined;
  constructor(options: StartCdpHttpProxyOptions) {
    this.#options = options;
    const createCdpSecurityRejectionReporterOptions = {
      onReport: options.onSecurityRejections,
    } as const;
    this.#securityRejections = createCdpSecurityRejectionReporter(createCdpSecurityRejectionReporterOptions);
    const createCdpWebSocketProxyOptions: import('#src/cdp/webSocketProxy').CdpWebSocketProxyOptions = {
      createErrorResponse: (kind, upstreamStatus) => {
        const argumentValue = kind === 'upstream_error' ? { upstreamStatus } : undefined;
        return createCdpHttpErrorResponse(kind, argumentValue);
      },
      getGeneration: () =>
        this.#generation?.state === 'ready' ? (this.#generation as CdpWebSocketGeneration) : undefined,
      handshakeTimeoutMs: options.webSocketHandshakeTimeoutMs,
      beforeForward: options.beforeForward,
      onActivity: options.onActivity,
      onBrowserLoss: options.onBrowserLoss,
      onSecurityRejection: (category) => this.#securityRejections.record(category),
      shutdownTimeoutMs: options.webSocketShutdownTimeoutMs,
      validateAuthority: (request) => {
        const computedValue5 = options.advertisedHost ?? options.bindHost;
        return validateAuthorityPolicy(
          request,
          computedValue5,
          this.port,
          options.advertisedScheme,
          (category) => this.#securityRejections.record(category),
        );
      },
    };
    this.#webSocketProxy = createCdpWebSocketProxy(createCdpWebSocketProxyOptions);
  }
  get activeConnections(): number {
    return this.#webSocketProxy.activeConnections;
  }
  get port(): number {
    if (this.#lease === undefined) throw new Error('CDP HTTP proxy is not bound');
    return this.#lease.port;
  }
  attachLease(lease: CdpPortLease): void {
    this.#lease = lease;
  }
  setUnavailableCapability(capability: string): void {
    assertCapability(capability);
    if (this.#generation?.state === 'ready') {
      this.#webSocketProxy.closeGeneration(this.#generation);
    }
    this.#generation = { capability, state: 'unavailable' };
  }
  stageGeneration(options: {
    capability: string;
    upstreamHost: string;
    upstreamPort: number;
  }): Readonly<Record<string, string>> {
    assertGenerationOptions(options);
    if (this.#generation?.state === 'ready') {
      this.#webSocketProxy.closeGeneration(this.#generation);
    }
    const readinessToken = generateCdpCapability();
    this.#generation = { ...options, readinessToken, state: 'verifying' };
    return { [readinessProbeHeader]: readinessToken };
  }
  publishGeneration(options: { capability: string; upstreamHost: string; upstreamPort: number }): void {
    assertGenerationOptions(options);
    const generation = this.#generation;
    if (
      generation?.state !== 'verifying' ||
      generation.capability !== options.capability ||
      generation.upstreamHost !== options.upstreamHost ||
      generation.upstreamPort !== options.upstreamPort
    ) {
      throw new Error('CDP generation must pass readiness staging before publication');
    }
    this.#generation = { ...options, state: 'ready' };
  }
  clearGeneration(): void {
    const generation = this.#generation;
    this.#generation = undefined;
    if (generation?.state === 'ready') this.#webSocketProxy.closeGeneration(generation);
  }
  async close(): Promise<void> {
    await this.stop();
    await this.release();
  }
  release(): Promise<void> {
    this.#releasePromise ??= (async () => {
      await this.stop();
      await this.#lease?.release();
    })();
    return this.#releasePromise;
  }
  stop(): Promise<void> {
    this.#stopPromise ??= (async () => {
      try {
        this.clearGeneration();
        await this.#webSocketProxy.close();
        await this.#lease?.closeBinding();
      } finally {
        this.#securityRejections.close();
      }
    })();
    return this.#stopPromise;
  }
  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.#webSocketProxy.handleUpgrade(request, socket, head);
  }
  async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.sendDate = false;
    try {
      await this.#handle(request, response);
    } catch {
      if (!response.headersSent) {
        const cdpHttpErrorResponseResult8 = createCdpHttpErrorResponse('internal_error');
        writeError(response, cdpHttpErrorResponseResult8);
      } else response.destroy();
    }
  }
  async #handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const routed = acceptLocalHttpRequest(request, response, this.#generation, (category) =>
      this.#securityRejections.record(category),
    );
    if (routed === undefined) return;
    if (this.#activeRequests >= CDP_HTTP_MAX_CONCURRENT_REQUESTS) {
      const cdpHttpErrorResponseResult9 = createCdpHttpErrorResponse('unavailable');
      writeError(response, cdpHttpErrorResponseResult9);
      return;
    }
    this.#activeRequests += 1;
    try {
      await this.#forwardRequest(request, response, routed);
    } finally {
      this.#activeRequests -= 1;
    }
  }
  async #forwardRequest(
    request: IncomingMessage,
    response: ServerResponse,
    routed: RoutedCdpHttpRequest,
  ): Promise<void> {
    const computedValue6 = this.#options.advertisedHost ?? this.#options.bindHost;
    const authorityPolicy = validateAuthorityPolicy(
      request,
      computedValue6,
      this.port,
      this.#options.advertisedScheme,
      (category) => this.#securityRejections.record(category),
    );
    if (authorityPolicy !== 'accepted') {
      const cdpHttpErrorResponseResult10 = createCdpHttpErrorResponse(authorityPolicy);
      writeError(response, cdpHttpErrorResponseResult10);
      return;
    }
    const { generation, route } = routed;
    const computedValue7 = this.#options.upstreamTimeoutMs ?? CDP_HTTP_UPSTREAM_RESPONSE_TIMEOUT_MS;
    const deadline = createForwardDeadline(computedValue7);
    try {
      if (!(await this.#admitsGeneration(request, generation, deadline.signal))) {
        const argumentValue2 = deadline.signal.aborted ? 'gateway_timeout' : 'unavailable';
        const cdpHttpErrorResponseResult11 = createCdpHttpErrorResponse(argumentValue2);
        writeError(response, cdpHttpErrorResponseResult11);
        return;
      }
      if (generation.state === 'unavailable') {
        const cdpHttpErrorResponseResult12 = createCdpHttpErrorResponse('unavailable');
        writeError(response, cdpHttpErrorResponseResult12);
        return;
      }
      const remainingMs = deadline.remainingMs();
      if (remainingMs < 1) {
        const cdpHttpErrorResponseResult13 = createCdpHttpErrorResponse('gateway_timeout');
        writeError(response, cdpHttpErrorResponseResult13);
        return;
      }
      if (generation.state === 'ready') {
        safelyReportActivity(this.#options.onActivity, this.#activeRequests);
      }
      const computedValue8 = this.#options.requestUpstream ?? requestUpstream;
      const requestCdpUpstreamSafelyOptions = {
        host: generation.upstreamHost,
        maxBodyBytes: CDP_HTTP_MAX_UPSTREAM_RESPONSE_BYTES,
        method: route.allow,
        path: route.upstreamPath,
        port: generation.upstreamPort,
        timeoutMs: remainingMs,
      } as const;
      const attempt = await requestCdpUpstreamSafely(computedValue8, requestCdpUpstreamSafelyOptions);
      if (attempt.kind === 'error') {
        const cdpHttpErrorResponseResult14 = createCdpHttpErrorResponse(attempt.failureKind);
        writeError(response, cdpHttpErrorResponseResult14);
        return;
      }
      const argumentValue3 = attempt.response;
      const prepareCdpUpstreamResponseOptions = {
        capability: generation.capability,
        host: this.#options.advertisedHost ?? this.#options.bindHost,
        port: this.port,
        scheme: this.#options.advertisedScheme,
      } as const;
      const prepared = prepareCdpUpstreamResponse(argumentValue3, route, prepareCdpUpstreamResponseOptions);
      if (prepared.kind === 'error') {
        writeError(response, prepared.error);
        return;
      }
      writeSuccess(response, prepared.status, prepared.body, prepared.responseKind);
    } finally {
      deadline.clear();
    }
  }
  async #admitsGeneration(
    request: IncomingMessage,
    generation: GenerationState,
    signal: AbortSignal,
  ): Promise<boolean> {
    const readinessProbe =
      generation.state === 'verifying' && hasReadinessProbe(request, generation.readinessToken);
    if ((generation.state !== 'ready' && !readinessProbe) || this.#generation !== generation) {
      return false;
    }
    if (generation.state !== 'ready' || this.#options.beforeForward === undefined) return true;
    try {
      const beforeForwardResult = this.#options.beforeForward(signal);
      return (await withinAbortSignal(beforeForwardResult, signal)) && this.#generation === generation;
    } catch {
      return false;
    }
  }
}
function createForwardDeadline(timeoutMs: number): {
  clear(): void;
  remainingMs(): number;
  signal: AbortSignal;
} {
  const controller = new AbortController();
  const expiresAt = Date.now() + timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref();
  return {
    clear: () => clearTimeout(timer),
    remainingMs: () => {
      const computedValue9 = expiresAt - Date.now();
      return Math.max(0, computedValue9);
    },
    signal: controller.signal,
  };
}
async function withinAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) throw new Error('Managed CDP proxy request timed out');
  return await new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      const error2 = new Error('Managed CDP proxy request timed out');
      return reject(error2);
    };
    const addEventListenerOptions = { once: true } as const;
    signal.addEventListener('abort', onAbort, addEventListenerOptions);
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        const argumentValue4 =
          error instanceof Error
            ? error
            : (() => {
                const stringResult = String(error);
                return new Error(stringResult);
              })();
        reject(argumentValue4);
      },
    );
  });
}
class CdpUpstreamTimeoutError extends Error {}
class CdpUpstreamBadGatewayError extends Error {}
async function requestUpstream(request: CdpUpstreamRequest): Promise<CdpUpstreamResponse> {
  return await new Promise<CdpUpstreamResponse>((resolve, reject) => {
    let completed = false;
    const finish = (action: () => void): void => {
      if (completed) return;
      completed = true;
      clearTimeout(timer);
      action();
    };
    const createHttpRequestOptions = {
      agent: false,
      headers: {
        Connection: 'close',
        Host: formatCdpAuthority(request.host, request.port),
      },
      host: request.host,
      method: request.method,
      path: request.path,
      port: request.port,
      setHost: false,
    } as const;
    const upstream = createHttpRequest(createHttpRequestOptions, (response) => {
      const chunks: Buffer[] = [];
      let total = 0;
      response.on('data', (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > request.maxBodyBytes) {
          upstream.destroy();
          finish(() => {
            const cdpUpstreamBadGatewayError = new CdpUpstreamBadGatewayError();
            return reject(cdpUpstreamBadGatewayError);
          });
          return;
        }
        chunks.push(chunk);
      });
      response.once('aborted', () =>
        finish(() => {
          const cdpUpstreamBadGatewayError2 = new CdpUpstreamBadGatewayError();
          return reject(cdpUpstreamBadGatewayError2);
        }),
      );
      response.once('error', () =>
        finish(() => {
          const cdpUpstreamBadGatewayError3 = new CdpUpstreamBadGatewayError();
          return reject(cdpUpstreamBadGatewayError3);
        }),
      );
      response.once('end', () =>
        finish(() => {
          const resolveOptions = {
            body: Buffer.concat(chunks),
            statusCode: response.statusCode ?? 0,
          } as const;
          return resolve(resolveOptions);
        }),
      );
    });
    const timer = setTimeout(() => {
      upstream.destroy();
      finish(() => {
        const cdpUpstreamTimeoutError = new CdpUpstreamTimeoutError();
        return reject(cdpUpstreamTimeoutError);
      });
    }, request.timeoutMs);
    timer.unref();
    upstream.once('error', () =>
      finish(() => {
        const cdpUpstreamBadGatewayError4 = new CdpUpstreamBadGatewayError();
        return reject(cdpUpstreamBadGatewayError4);
      }),
    );
    upstream.end();
  });
}
async function bindServer(server: Server, port: number, host: string): Promise<CdpPortBinding> {
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
  return {
    close: async () =>
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}
function writeError(
  response: ServerResponse,
  error: CdpHttpErrorResponse,
  options: {
    closeConnection?: boolean;
  } = {},
): void {
  const argumentValue5 = error.status;
  const writeHeadOptions = {
    ...error.headers,
    ...(options.closeConnection === true ? { Connection: 'close' } : {}),
  } as const;
  response.writeHead(argumentValue5, writeHeadOptions);
  response.end(error.body);
}
function writeSuccess(response: ServerResponse, status: number, body: Buffer, kind: 'json' | 'text'): void {
  const writeHeadOptions2 = {
    'Cache-Control': 'no-store',
    'Content-Length': String(body.byteLength),
    'Content-Type': kind === 'json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
  } as const;
  response.writeHead(status, writeHeadOptions2);
  response.end(body);
}
function writeClientError(error: Error, socket: Duplex): void {
  if (!socket.writable) return;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const kind: CdpHttpFailureKind =
    code === 'HPE_HEADER_OVERFLOW'
      ? 'headers_too_large'
      : code === 'ERR_HTTP_REQUEST_TIMEOUT'
        ? 'request_timeout'
        : 'bad_request';
  const response = createCdpHttpErrorResponse(kind);
  const reason = STATUS_CODES[response.status] ?? 'Error';
  const headers = Object.entries(response.headers)
    .map(([name, value]) => `${name}: ${value}\r\n`)
    .join('');
  const message2 = `HTTP/1.1 ${response.status} ${reason}\r\n${headers}Connection: close\r\n\r\n${response.body.toString()}`;
  socket.end(message2);
}
function requestHeaderBytes(request: IncomingMessage): number {
  let bytes = 2;
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    const computedValue10 = request.rawHeaders[index] ?? '';
    bytes += Buffer.byteLength(computedValue10);
    bytes += 2;
    const computedValue11 = request.rawHeaders[index + 1] ?? '';
    bytes += Buffer.byteLength(computedValue11);
    bytes += 2;
  }
  return bytes;
}
function requestBodyPolicy(request: IncomingMessage): 'accepted' | 'bad_request' | 'payload_too_large' {
  if (headerCount(request, 'transfer-encoding') > 0) return 'payload_too_large';
  const values = headerValues(request, 'content-length');
  if (values.length === 0) return 'accepted';
  if (
    values.length !== 1 ||
    (() => {
      const computedValue12 = values[0] ?? '';
      return !/^\d+$/u.test(computedValue12);
    })()
  )
    return 'bad_request';
  return Number(values[0]) === 0 ? 'accepted' : 'payload_too_large';
}
function validateAuthorityPolicy(
  request: IncomingMessage,
  expectedHost: string,
  expectedPort: number,
  advertisedScheme: CdpAdvertisedScheme,
  onSecurityRejection?: (category: CdpSecurityRejectionCategory) => void,
): 'accepted' | 'bad_request' | 'forbidden' {
  const hostValues = headerValues(request, 'host');
  if (hostValues.length !== 1) {
    safelyReportSecurityRejection(onSecurityRejection, 'host');
    return 'bad_request';
  }
  const computedValue13 = hostValues[0] ?? '';
  const host = parseHostAuthority(computedValue13, advertisedScheme);
  if (host === undefined) {
    safelyReportSecurityRejection(onSecurityRejection, 'host');
    return 'bad_request';
  }
  const formatCdpAuthorityResult = formatCdpAuthority(expectedHost, expectedPort);
  const expected = parseHostAuthority(formatCdpAuthorityResult, advertisedScheme);
  if (expected === undefined || !sameAuthority(host, expected)) {
    safelyReportSecurityRejection(onSecurityRejection, 'host');
    return 'forbidden';
  }
  const originValues = headerValues(request, 'origin');
  if (originValues.length === 0) return 'accepted';
  if (originValues.length !== 1) {
    safelyReportSecurityRejection(onSecurityRejection, 'origin');
    return 'bad_request';
  }
  const computedValue14 = originValues[0] ?? '';
  const origin = parseOriginAuthority(computedValue14);
  if (origin === undefined) {
    safelyReportSecurityRejection(onSecurityRejection, 'origin');
    return 'bad_request';
  }
  if (!sameAuthority(origin, expected)) {
    safelyReportSecurityRejection(onSecurityRejection, 'origin');
    return 'forbidden';
  }
  return 'accepted';
}
interface ParsedAuthority {
  host: string;
  port: number;
}
function parseHostAuthority(value: string, scheme: CdpAdvertisedScheme): ParsedAuthority | undefined {
  if (value.length === 0 || value !== value.trim() || /[\s,/@?#]/u.test(value)) return undefined;
  if (!hasCanonicalAuthorityHost(value)) return undefined;
  try {
    const message3 = `${scheme}://${value}`;
    const parsed = new URL(message3);
    if (parsed.username !== '' || parsed.password !== '' || parsed.pathname !== '/') return undefined;
    return { host: parsed.hostname.toLowerCase(), port: effectivePort(parsed) };
  } catch {
    return undefined;
  }
}
function parseOriginAuthority(value: string): ParsedAuthority | undefined {
  const rawAuthority = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/iu.exec(value)?.[1];
  if (rawAuthority === undefined || !hasCanonicalAuthorityHost(rawAuthority)) return undefined;
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.pathname !== '/' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) {
      return undefined;
    }
    return { host: parsed.hostname.toLowerCase(), port: effectivePort(parsed) };
  } catch {
    return undefined;
  }
}
function effectivePort(url: URL): number {
  if (url.port !== '') return Number(url.port);
  return url.protocol === 'https:' ? 443 : 80;
}
function sameAuthority(left: ParsedAuthority, right: ParsedAuthority): boolean {
  return left.host === right.host && left.port === right.port;
}
function hasCanonicalAuthorityHost(authority: string): boolean {
  const host = rawAuthorityHost(authority);
  if (host === undefined) return false;
  try {
    validateCdpHost(host);
    return true;
  } catch {
    return false;
  }
}
function rawAuthorityHost(authority: string): string | undefined {
  if (authority.startsWith('[')) {
    const closingBracket = authority.indexOf(']');
    if (closingBracket <= 1) return undefined;
    const computedValue15 = closingBracket + 1;
    const suffix = authority.slice(computedValue15);
    if (suffix !== '' && !/^:\d+$/u.test(suffix)) return undefined;
    return authority.slice(1, closingBracket);
  }
  const firstColon = authority.indexOf(':');
  if (firstColon === -1) return authority;
  if (firstColon !== authority.lastIndexOf(':')) return undefined;
  const computedValue16 = firstColon + 1;
  const sliceResult2 = authority.slice(computedValue16);
  if (!/^\d+$/u.test(sliceResult2)) return undefined;
  return authority.slice(0, firstColon);
}
function headerValues(request: IncomingMessage, targetName: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < request.rawHeaders.length; index += 2) {
    if ((request.rawHeaders[index] ?? '').toLowerCase() === targetName) {
      const computedValue17 = request.rawHeaders[index + 1] ?? '';
      values.push(computedValue17);
    }
  }
  return values;
}
function headerCount(request: IncomingMessage, targetName: string): number {
  return headerValues(request, targetName).length;
}
function safelyReportActivity(
  callback: StartCdpHttpProxyOptions['onActivity'],
  activeRequests: number,
): void {
  try {
    if (callback) {
      const activity = { activeRequests, kind: 'http_request' } as const;
      callback(activity);
    }
  } catch {
    // Diagnostic callbacks never affect proxy behavior.
  }
}
function safelyReportSecurityRejection(
  callback: ((category: CdpSecurityRejectionCategory) => void) | undefined,
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
function hasReadinessProbe(request: IncomingMessage, expectedToken: string): boolean {
  const values = headerValues(request, readinessProbeHeader);
  return values.length === 1 && matchesCdpCapability(expectedToken, values[0]);
}
function assertGenerationOptions(options: {
  capability: string;
  upstreamHost: string;
  upstreamPort: number;
}): void {
  assertCapability(options.capability);
  if (!isLoopbackCdpHost(options.upstreamHost)) {
    throw new Error('Chromium CDP upstream host must be loopback');
  }
  formatCdpAuthority(options.upstreamHost, options.upstreamPort);
}
function assertCapability(capability: string): void {
  if (!isCdpCapability(capability)) throw new Error('CDP capability is invalid');
}
const dummyCapability = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const readinessProbeHeader = 'x-cloakbrowser-cdp-readiness';
const targetRoutePrefixes = ['/json/activate/', '/json/close/'] as const;
