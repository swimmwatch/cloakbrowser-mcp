import type { ServerResponse } from 'node:http';
import { HttpStatus, JsonRpcErrorCode } from '#src/http/status';
import { JSON_CONTENT_TYPE, JSON_RPC_VERSION } from '#src/protocol/constants';
export function writeJsonRpcError(
  res: ServerResponse,
  status: HttpStatus,
  code: JsonRpcErrorCode,
  message: string,
  headers: Record<string, string> = {},
): void {
  const stringifyOptions = {
    jsonrpc: JSON_RPC_VERSION,
    error: { code, message },
    id: null,
  } as const;
  const body = JSON.stringify(stringifyOptions);
  const writeHeadOptions = {
    'Content-Type': JSON_CONTENT_TYPE,
    ...headers,
  } as const;
  res.writeHead(status, writeHeadOptions);
  endResponse(res, body);
}
export function writeJsonResponse(
  res: ServerResponse,
  status: HttpStatus,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): void {
  const writeHeadOptions2 = {
    'Content-Type': JSON_CONTENT_TYPE,
    ...headers,
  } as const;
  res.writeHead(status, writeHeadOptions2);
  const serializedValue = JSON.stringify(body);
  endResponse(res, serializedValue);
}
export function endResponse(res: ServerResponse, body = ''): void {
  res.end(body);
}
