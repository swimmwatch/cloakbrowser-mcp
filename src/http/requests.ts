import type { IncomingMessage } from 'node:http';
import { type InitializeRequest, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  type BridgeContextOptions,
  BridgeRuntimeConfigurationError,
  type BridgeRuntimeProxy,
  type HumanPreset,
  parseBridgeContextOptions,
  parseHumanPreset,
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
  try {
    const computedValue = req.url ?? '/';
    const message2 = `${protocol}://${host}`;
    return new URL(computedValue, message2).pathname === endpoint;
  } catch {
    return false;
  }
}
export function requestPathName(
  req: IncomingMessage,
  fallbackHost: string,
  protocol: StreamableHttpOptions['protocol'],
): string {
  const host = getSingleHeader(req, 'host') ?? formatHost(fallbackHost);
  try {
    const computedValue2 = req.url ?? '/';
    const message3 = `${protocol}://${host}`;
    return new URL(computedValue2, message3).pathname;
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
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : (() => {
          const stringResult = String(chunk);
          return Buffer.from(stringResult);
        })();
    size += buffer.byteLength;
    if (size > limitBytes) throw new RequestBodyTooLargeError();
    chunks.push(buffer);
  }
  const toStringResult = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(toStringResult) as unknown;
}
export function containsInitializeRequest(value: unknown): boolean {
  return findInitializeRequest(value) !== undefined;
}
export type BridgeInitializeRuntimeOptions = Pick<
  PrepareBridgeRuntimeOptions,
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
> & {
  cdpEnabled?: boolean;
};
/**
 * Reads per-session bridge runtime overrides from MCP initialize metadata.
 */
export function readBridgeRuntimeOptionsFromInitialize(value: unknown): BridgeInitializeRuntimeOptions {
  const request = findInitializeRequest(value);
  if (!request) return {};
  const bridgeMeta = readBridgeInitializeMeta(request);
  return bridgeMeta === undefined ? {} : readBridgeRuntimeOptionsFromMeta(bridgeMeta);
}
function readBridgeInitializeMeta(request: InitializeRequest): Record<string, unknown> | undefined {
  const meta = request.params._meta as Record<string, unknown> | undefined;
  const bridgeMeta = meta?.[BRIDGE_INITIALIZE_META_KEY];
  if (bridgeMeta === undefined) return undefined;
  if (!isRecord(bridgeMeta)) {
    const message4 = `${BRIDGE_INITIALIZE_META_KEY} initialize metadata must be an object`;
    throw new InvalidBridgeInitializeMetaError(message4);
  }
  return bridgeMeta;
}
function readBridgeRuntimeOptionsFromMeta(
  bridgeMeta: Record<string, unknown>,
): BridgeInitializeRuntimeOptions {
  if ('extensionToken' in bridgeMeta) {
    throw new InvalidBridgeInitializeMetaError(
      'extensionToken is process environment only and is not accepted in initialize metadata',
    );
  }
  const proxyServer = readOptionalString(bridgeMeta, 'proxyServer');
  const proxyBypass = readOptionalString(bridgeMeta, 'proxyBypass');
  const proxy = readRuntimeProxy(proxyServer, proxyBypass);
  const compactRuntimeOptionsOptions = {
    cdpEnabled: readOptionalBoolean(bridgeMeta, 'cdpEnabled'),
    extensionMode: readOptionalBoolean(bridgeMeta, 'extensionMode'),
    geoipProxyMatch: readOptionalBoolean(bridgeMeta, 'geoipProxyMatch'),
    headless: readOptionalBoolean(bridgeMeta, 'headless'),
    humanize: readOptionalBoolean(bridgeMeta, 'humanize'),
    humanPreset: readOptionalHumanPreset(bridgeMeta, 'humanPreset'),
    userDataDir: readOptionalString(bridgeMeta, 'userDataDir'),
    contextOptions: readOptionalContextOptions(bridgeMeta, 'contextOptions'),
    extensionPaths: readOptionalStringArray(bridgeMeta, 'extensionPaths'),
    proxy,
    profileDirName: readOptionalString(bridgeMeta, 'profileDirName'),
  } as const;
  return compactRuntimeOptions(compactRuntimeOptionsOptions);
}
function readRuntimeProxy(
  proxyServer: string | undefined,
  proxyBypass: string | undefined,
): BridgeRuntimeProxy | undefined {
  if (proxyBypass !== undefined && proxyServer === undefined) {
    throw new InvalidBridgeInitializeMetaError('proxyBypass requires proxyServer');
  }
  return proxyServer === undefined ? undefined : createRuntimeProxy(proxyServer, proxyBypass);
}
function compactRuntimeOptions(
  options: Record<keyof BridgeInitializeRuntimeOptions, unknown>,
): BridgeInitializeRuntimeOptions {
  const result: BridgeInitializeRuntimeOptions = {};
  for (const [key, option] of Object.entries(options)) {
    if (option !== undefined)
      (() => {
        const assignOptions = { [key]: option } as const;
        return Object.assign(result, assignOptions);
      })();
  }
  return result;
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
    const message5 = `${key} must be a non-empty string`;
    throw new InvalidBridgeInitializeMetaError(message5);
  }
  return raw.trim();
}
function readOptionalBoolean(value: Record<string, unknown>, key: string): boolean | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (typeof raw !== 'boolean') {
    const message6 = `${key} must be a boolean`;
    throw new InvalidBridgeInitializeMetaError(message6);
  }
  return raw;
}
function readOptionalHumanPreset(value: Record<string, unknown>, key: string): HumanPreset | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (typeof raw !== 'string') {
    const message7 = `${key} must be "default" or "careful"`;
    throw new InvalidBridgeInitializeMetaError(message7);
  }
  try {
    const trimResult = raw.trim();
    return parseHumanPreset(trimResult);
  } catch {
    const message8 = `${key} must be "default" or "careful"`;
    throw new InvalidBridgeInitializeMetaError(message8);
  }
}
function readOptionalContextOptions(
  value: Record<string, unknown>,
  key: string,
): BridgeContextOptions | undefined {
  if (!(key in value)) return undefined;
  try {
    return parseBridgeContextOptions(value[key], key);
  } catch (error) {
    if (error instanceof BridgeRuntimeConfigurationError) {
      throw new InvalidBridgeInitializeMetaError(error.message);
    }
    throw error;
  }
}
function readOptionalStringArray(value: Record<string, unknown>, key: string): string[] | undefined {
  if (!(key in value)) return undefined;
  const raw = value[key];
  if (!Array.isArray(raw)) {
    const message9 = `${key} must be a string array`;
    throw new InvalidBridgeInitializeMetaError(message9);
  }
  return raw.map((item, index) => {
    if (typeof item !== 'string' || item.trim().length === 0) {
      const message10 = `${key}[${index}] must be a non-empty string`;
      throw new InvalidBridgeInitializeMetaError(message10);
    }
    return item.trim();
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function fallbackPathName(url: string | undefined): string {
  const pathName = (url ?? '/').split(/[?#]/u, 1)[0];
  return pathName.length > 0 ? pathName : '/';
}
