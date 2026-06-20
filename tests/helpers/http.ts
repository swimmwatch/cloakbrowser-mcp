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

export function fetchHealth(base: string | URL, init?: RequestInit): Promise<Response> {
  return fetch(healthUrl(base), init);
}

export function fetchReady(base: string | URL, init?: RequestInit): Promise<Response> {
  return fetch(readyUrl(base), init);
}

export function postToolsList(base: string | URL, sessionId?: string, init?: RequestInit): Promise<Response> {
  const headers = createJsonRpcHeaders(init?.headers);
  if (sessionId) headers.set(MCP_SESSION_ID_HEADER, sessionId);
  return postJsonRpc(base, { id: 1, method: 'tools/list', params: {} }, { ...init, headers });
}

export function postInitialize(base: string | URL, init?: RequestInit): Promise<Response> {
  return postJsonRpc(
    base,
    {
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'unauthorized-e2e-client', version: '1.0.0' },
      },
    },
    init,
  );
}

function postJsonRpc(
  base: string | URL,
  request: { id: number; method: string; params: Record<string, unknown> },
  init?: RequestInit,
): Promise<Response> {
  return fetch(base, {
    ...init,
    method: 'POST',
    headers: createJsonRpcHeaders(init?.headers),
    body: JSON.stringify({
      jsonrpc: JSON_RPC_VERSION,
      ...request,
    }),
  });
}

function createJsonRpcHeaders(initHeaders: ConstructorParameters<typeof Headers>[0] | undefined): Headers {
  const headers = new Headers(initHeaders);
  headers.set('Accept', `${JSON_CONTENT_TYPE}, ${SERVER_SENT_EVENTS_CONTENT_TYPE}`);
  headers.set('Content-Type', JSON_CONTENT_TYPE);
  return headers;
}
