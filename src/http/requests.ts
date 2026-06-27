import type { IncomingMessage } from 'node:http';
import { isInitializeRequest, type InitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  parseHumanPreset,
  type BridgeRuntimeProxy,
  type HumanPreset,
  type PrepareBridgeRuntimeOptions,
} from '#src/bridge/config';
import { formatHost } from '#src/http/nodeServer';
import { type StreamableHttpOptions } from '#src/http/options';
import { BRIDGE_INITIALIZE_META_KEY, JSON_CONTENT_TYPE } from '#src/protocol/constants';

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
  return findInitializeRequest(value) !== undefined;
}

export type BridgeInitializeRuntimeOptions = Pick<
  PrepareBridgeRuntimeOptions,
  'geoipProxyMatch' | 'headless' | 'humanize' | 'humanPreset' | 'proxy'
>;

export function readBridgeRuntimeOptionsFromInitialize(value: unknown): BridgeInitializeRuntimeOptions {
  const request = findInitializeRequest(value);
  if (!request) return {};

  const meta = request.params._meta as Record<string, unknown> | undefined;
  const bridgeMeta = meta?.[BRIDGE_INITIALIZE_META_KEY];
  if (bridgeMeta === undefined) return {};
  if (!isRecord(bridgeMeta)) {
    throw new InvalidBridgeInitializeMetaError(
      `${BRIDGE_INITIALIZE_META_KEY} initialize metadata must be an object`,
    );
  }

  const proxyServer = readOptionalString(bridgeMeta, 'proxyServer');
  const proxyBypass = readOptionalString(bridgeMeta, 'proxyBypass');
  const geoipProxyMatch = readOptionalBoolean(bridgeMeta, 'geoipProxyMatch');
  const headless = readOptionalBoolean(bridgeMeta, 'headless');
  const humanize = readOptionalBoolean(bridgeMeta, 'humanize');
  const humanPreset = readOptionalHumanPreset(bridgeMeta, 'humanPreset');
  if (proxyBypass !== undefined && proxyServer === undefined) {
    throw new InvalidBridgeInitializeMetaError('proxyBypass requires proxyServer');
  }

  const proxy = proxyServer === undefined ? undefined : createRuntimeProxy(proxyServer, proxyBypass);
  return {
    ...(geoipProxyMatch === undefined ? {} : { geoipProxyMatch }),
    ...(headless === undefined ? {} : { headless }),
    ...(humanize === undefined ? {} : { humanize }),
    ...(humanPreset === undefined ? {} : { humanPreset }),
    ...(proxy === undefined ? {} : { proxy }),
  };
}

export function getSingleHeader(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

export class RequestBodyTooLargeError extends Error {}

export class InvalidBridgeInitializeMetaError extends Error {}

function findInitializeRequest(value: unknown): InitializeRequest | undefined {
  const messages = Array.isArray(value) ? value : [value];
  return messages.find((message): message is InitializeRequest => isInitializeRequest(message));
}

function createRuntimeProxy(server: string, bypass: string | undefined): BridgeRuntimeProxy {
  return bypass === undefined ? { server } : { server, bypass };
}

function readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new InvalidBridgeInitializeMetaError(`${key} must be a non-empty string`);
  }
  return raw.trim();
}

function readOptionalBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (typeof raw !== 'boolean') {
    throw new InvalidBridgeInitializeMetaError(`${key} must be a boolean`);
  }
  return raw;
}

function readOptionalHumanPreset(value: Record<string, unknown>, key: string): HumanPreset | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (typeof raw !== 'string') {
    throw new InvalidBridgeInitializeMetaError(`${key} must be "default" or "careful"`);
  }
  try {
    return parseHumanPreset(raw.trim());
  } catch {
    throw new InvalidBridgeInitializeMetaError(`${key} must be "default" or "careful"`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fallbackPathName(url: string | undefined): string {
  const pathName = (url ?? '/').split(/[?#]/u, 1)[0];
  return pathName.length > 0 ? pathName : '/';
}
