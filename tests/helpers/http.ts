import { HEALTHZ_PATH, READYZ_PATH } from '@/http/options.js';
import {
  JSON_CONTENT_TYPE,
  JSON_RPC_VERSION,
  MCP_SESSION_ID_HEADER,
  SERVER_SENT_EVENTS_CONTENT_TYPE,
} from '@/protocol/constants.js';
export function healthUrl(base: string | URL): URL {
  return new URL(HEALTHZ_PATH, base);
}
export function readyUrl(base: string | URL): URL {
  return new URL(READYZ_PATH, base);
}
export function fetchHealth(
  base: string | URL,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const healthUrlResult = healthUrl(base);
  return fetchImpl(healthUrlResult, init);
}
export function fetchReady(
  base: string | URL,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const yUrlResult = readyUrl(base);
  return fetchImpl(yUrlResult, init);
}
export function postToolsList(
  base: string | URL,
  sessionId?: string,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const headers = createJsonRpcHeaders(init?.headers);
  if (sessionId) headers.set(MCP_SESSION_ID_HEADER, sessionId);
  const postJsonRpcOptions = { id: 1, method: 'tools/list', params: {} } as const;
  const postJsonRpcOptions2 = { ...init, headers } as const;
  return postJsonRpc(base, postJsonRpcOptions, postJsonRpcOptions2, fetchImpl);
}
export function postInitialize(
  base: string | URL,
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const postJsonRpcOptions3 = {
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'unauthorized-e2e-client', version: '1.0.0' },
    },
  } as const;
  return postJsonRpc(base, postJsonRpcOptions3, init, fetchImpl);
}
function postJsonRpc(
  base: string | URL,
  request: {
    id: number;
    method: string;
    params: Record<string, unknown>;
  },
  init?: RequestInit,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const options = { ...init };
  const propertyValue = 'POST';
  const jsonRpcHeadersResult = createJsonRpcHeaders(init?.headers);
  const stringifyOptions = {
    jsonrpc: JSON_RPC_VERSION,
    ...request,
  } as const;
  const serializedValue = JSON.stringify(stringifyOptions);
  const fetchImplOptions = {
    ...options,
    method: propertyValue,
    headers: jsonRpcHeadersResult,
    body: serializedValue,
  } as const;
  return fetchImpl(base, fetchImplOptions);
}
function createJsonRpcHeaders(initHeaders: ConstructorParameters<typeof Headers>[0] | undefined): Headers {
  const headers = new Headers(initHeaders);
  const message = `${JSON_CONTENT_TYPE}, ${SERVER_SENT_EVENTS_CONTENT_TYPE}`;
  headers.set('Accept', message);
  headers.set('Content-Type', JSON_CONTENT_TYPE);
  return headers;
}
