import type { IncomingMessage } from 'node:http';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { formatHost } from '#/http/nodeServer';
import { type StreamableHttpOptions } from '#/http/options';
import { JSON_CONTENT_TYPE } from '#/protocol/constants';

export function isEndpointRequest(
  req: IncomingMessage,
  endpoint: string,
  fallbackHost: string,
  protocol: StreamableHttpOptions['protocol'] = 'http',
): boolean {
  const host = getSingleHeader(req, 'host') ?? formatHost(fallbackHost);
  const url = new URL(req.url ?? '/', `${protocol}://${host}`);
  return url.pathname === endpoint;
}

export function requestPathName(
  req: IncomingMessage,
  fallbackHost: string,
  protocol: StreamableHttpOptions['protocol'],
): string {
  const host = getSingleHeader(req, 'host') ?? formatHost(fallbackHost);
  try {
    return new URL(req.url ?? '/', `${protocol}://${host}`).pathname;
  } catch {
    return fallbackPathName(req.url);
  }
}

export function hasJsonContentType(req: IncomingMessage): boolean {
  const contentType = getSingleHeader(req, 'content-type');
  return contentType?.toLowerCase().includes(JSON_CONTENT_TYPE) ?? false;
}

export async function readJsonBody(req: IncomingMessage, limitBytes: number): Promise<unknown> {
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

export function containsInitializeRequest(value: unknown): boolean {
  const messages = Array.isArray(value) ? value : [value];
  return messages.some((message) => isInitializeRequest(message));
}

export function getSingleHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

export class RequestBodyTooLargeError extends Error {}

function fallbackPathName(url: string | undefined): string {
  const pathName = (url ?? '/').split(/[?#]/u, 1)[0];
  return pathName.length > 0 ? pathName : '/';
}
