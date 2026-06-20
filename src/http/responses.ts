import type { ServerResponse } from 'node:http';
import { HttpStatus, JsonRpcErrorCode } from '#/http/status';
import { JSON_CONTENT_TYPE, JSON_RPC_VERSION } from '#/protocol/constants';

export function writeJsonRpcError(
  res: ServerResponse,
  status: HttpStatus,
  code: JsonRpcErrorCode,
  message: string,
  headers: Record<string, string> = {},
): void {
  const body = JSON.stringify({
    jsonrpc: JSON_RPC_VERSION,
    error: { code, message },
    id: null,
  });
  res.writeHead(status, {
    'Content-Type': JSON_CONTENT_TYPE,
    ...headers,
  });
  endResponse(res, body);
}

export function writeJsonResponse(
  res: ServerResponse,
  status: HttpStatus,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, {
    'Content-Type': JSON_CONTENT_TYPE,
    ...headers,
  });
  endResponse(res, JSON.stringify(body));
}

export function endResponse(res: ServerResponse, body = ''): void {
  res.end(body);
}
