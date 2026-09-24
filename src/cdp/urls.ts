import { isIP } from 'node:net';

import { isCdpCapability } from '#src/cdp/capability';
import type { CdpAdvertisedScheme } from '#src/cdp/config';

export interface CdpExternalUrlOptions {
  capability: string;
  host: string;
  port: number;
  scheme: CdpAdvertisedScheme;
}

export class CdpUrlError extends Error {}

export function websocketSchemeFor(scheme: CdpAdvertisedScheme): 'ws' | 'wss' {
  return scheme === 'https' ? 'wss' : 'ws';
}

export function effectiveUrlPort(url: URL): number {
  if (url.port !== '') return Number(url.port);
  if (url.protocol === 'http:' || url.protocol === 'ws:') return 80;
  if (url.protocol === 'https:' || url.protocol === 'wss:') return 443;
  throw new CdpUrlError(`URL protocol ${url.protocol} has no supported default port`);
}

export function validateCdpHost(host: string, label = 'CDP host'): string {
  if (host.length === 0 || host !== host.trim() || !isValidHost(host)) {
    throw new CdpUrlError(`${label} must be a non-empty IPv4, IPv6, or hostname value`);
  }
  return host;
}

export function isWildcardCdpHost(host: string): boolean {
  return host === '0.0.0.0' || host === '::';
}

export function isLoopbackCdpHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === 'localhost' || normalized === '::1') return true;
  if (isIP(host) !== 4) return false;
  const firstOctet = Number(host.split('.', 1)[0]);
  return firstOctet === 127;
}

export function formatCdpAuthority(host: string, port: number): string {
  validateCdpHost(host);
  if (isWildcardCdpHost(host)) {
    throw new CdpUrlError('CDP wildcard host cannot be used in a connectable authority');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new CdpUrlError('CDP port must be an integer between 1 and 65535');
  }
  return `${isIP(host) === 6 ? `[${host}]` : host}:${port}`;
}

export function createCdpDiscoveryUrl(options: CdpExternalUrlOptions): string {
  assertCapability(options.capability);
  return `${options.scheme}://${formatCdpAuthority(options.host, options.port)}/cdp/${options.capability}`;
}

export function rewriteCdpWebSocketUrl(upstreamUrl: string, options: CdpExternalUrlOptions): string {
  assertCapability(options.capability);
  const parsed = parseWebSocketUrl(upstreamUrl);
  const scheme = websocketSchemeFor(options.scheme);
  const authority = formatCdpAuthority(options.host, options.port);
  return `${scheme}://${authority}/cdp/${options.capability}${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function rewriteCdpDiscoveryPayload<T>(payload: T, options: CdpExternalUrlOptions): T {
  return rewriteDiscoveryValue(payload, options) as T;
}

function assertCapability(capability: string): void {
  if (!isCdpCapability(capability)) {
    throw new CdpUrlError('CDP capability must be a valid path segment');
  }
}

function isValidHost(host: string): boolean {
  if (isIP(host) !== 0) return true;
  if (host.length > 253 || host.includes(':')) return false;
  const labels = host.split('.');
  const hasValidLabels = labels.every(
    (label) =>
      label.length > 0 && label.length <= 63 && /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label),
  );
  if (!hasValidLabels) return false;

  try {
    return new URL(`http://${host}`).hostname === host.toLowerCase();
  } catch {
    return false;
  }
}

function parseWebSocketUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new CdpUrlError('Chromium WebSocket URL is invalid');
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new CdpUrlError('Chromium WebSocket URL must use ws or wss');
  }
  return parsed;
}

function rewriteDiscoveryValue(value: unknown, options: CdpExternalUrlOptions): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteDiscoveryValue(item, options));
  }
  if (!isRecord(value)) return value;

  const rewritten: Array<[string, unknown]> = [];
  for (const [key, item] of Object.entries(value)) {
    if (key === 'webSocketDebuggerUrl') {
      if (typeof item !== 'string') {
        throw new CdpUrlError('webSocketDebuggerUrl must be a string');
      }
      rewritten.push([key, rewriteCdpWebSocketUrl(item, options)]);
      continue;
    }
    if (key === 'devtoolsFrontendUrl') {
      if (typeof item !== 'string') {
        throw new CdpUrlError('devtoolsFrontendUrl must be a string');
      }
      rewritten.push([key, rewriteDevtoolsFrontendUrl(item, options)]);
      continue;
    }
    rewritten.push([key, rewriteDiscoveryValue(item, options)]);
  }
  return Object.fromEntries(rewritten);
}

function rewriteDevtoolsFrontendUrl(value: string, options: CdpExternalUrlOptions): string {
  const relative = value.startsWith('/');
  let parsed: URL;
  try {
    parsed = new URL(value, 'http://cdp.invalid');
  } catch {
    throw new CdpUrlError('devtoolsFrontendUrl is invalid');
  }
  const embedded = parsed.searchParams.get('ws');
  if (embedded === null) {
    return relative ? value : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  const hasScheme = /^wss?:\/\//u.test(embedded);
  const rewritten = new URL(rewriteCdpWebSocketUrl(hasScheme ? embedded : `ws://${embedded}`, options));
  const replacement = hasScheme
    ? rewritten.toString()
    : `${rewritten.host}${rewritten.pathname}${rewritten.search}${rewritten.hash}`;
  parsed.searchParams.set('ws', replacement);

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
