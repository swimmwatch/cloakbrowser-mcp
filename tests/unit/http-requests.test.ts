import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import {
  containsInitializeRequest,
  hasJsonContentType,
  InvalidBridgeInitializeMetaError,
  readBridgeRuntimeOptionsFromInitialize,
  readJsonBody,
  RequestBodyTooLargeError,
} from '@/http/requests.js';
import { BRIDGE_INITIALIZE_META_KEY, JSON_RPC_VERSION } from '@/protocol/constants.js';

describe('HTTP request helpers', () => {
  it('detects JSON content types', () => {
    expect(hasJsonContentType(createRequest('', { 'content-type': 'application/json' }))).toBe(true);
    expect(hasJsonContentType(createRequest('', { 'content-type': 'Application/JSON; charset=utf-8' }))).toBe(
      true,
    );
    expect(hasJsonContentType(createRequest('', { 'content-type': 'text/plain' }))).toBe(false);
    expect(hasJsonContentType(createRequest(''))).toBe(false);
  });

  it('reads JSON request bodies within the configured size limit', async () => {
    await expect(readJsonBody(createRequest('{"ok":true}'), 32)).resolves.toEqual({ ok: true });
    await expect(readJsonBody(createRequest('{'), 32)).rejects.toBeInstanceOf(SyntaxError);
  });

  it('rejects oversized JSON bodies by content length and streamed bytes', async () => {
    await expect(readJsonBody(createRequest('{}', { 'content-length': '100' }), 10)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
    await expect(readJsonBody(createRequest('{"too":"large"}'), 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it('detects initialize requests in single and batched JSON-RPC payloads', () => {
    const initialize = createInitializeRequest();
    expect(containsInitializeRequest(initialize)).toBe(true);
    expect(containsInitializeRequest([{ method: 'tools/list' }, initialize])).toBe(true);
    expect(containsInitializeRequest({ method: 'tools/list' })).toBe(false);
  });

  it('reads bridge runtime options from initialize metadata', () => {
    expect(
      readBridgeRuntimeOptionsFromInitialize(
        createInitializeRequest({
          proxyServer: ' http://proxy.example:8080 ',
          proxyBypass: ' .internal ',
          geoipProxyMatch: true,
        }),
      ),
    ).toEqual({
      proxy: {
        server: 'http://proxy.example:8080',
        bypass: '.internal',
      },
      geoipProxyMatch: true,
    });

    expect(readBridgeRuntimeOptionsFromInitialize(createInitializeRequest())).toEqual({});
    expect(readBridgeRuntimeOptionsFromInitialize({ method: 'tools/list' })).toEqual({});
  });

  it('rejects invalid bridge initialize metadata', () => {
    expect(() => readBridgeRuntimeOptionsFromInitialize(createInitializeRequest('bad'))).toThrow(
      InvalidBridgeInitializeMetaError,
    );
    expect(() =>
      readBridgeRuntimeOptionsFromInitialize(createInitializeRequest({ proxyServer: ' ' })),
    ).toThrow('proxyServer must be a non-empty string');
    expect(() =>
      readBridgeRuntimeOptionsFromInitialize(createInitializeRequest({ proxyBypass: '.internal' })),
    ).toThrow('proxyBypass requires proxyServer');
    expect(() =>
      readBridgeRuntimeOptionsFromInitialize(
        createInitializeRequest({ proxyServer: 'http://proxy.example:8080', geoipProxyMatch: 'true' }),
      ),
    ).toThrow('geoipProxyMatch must be a boolean');
  });
});

function createRequest(body: string, headers: Record<string, string> = {}): IncomingMessage {
  const request = Readable.from([Buffer.from(body)]);
  Object.assign(request, { headers });
  return request as IncomingMessage;
}

function createInitializeRequest(bridgeMeta?: unknown): Record<string, unknown> {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: {
        name: 'unit-test-client',
        version: '1.0.0',
      },
      ...(bridgeMeta === undefined
        ? {}
        : {
            _meta: {
              [BRIDGE_INITIALIZE_META_KEY]: bridgeMeta,
            },
          }),
    },
  };
}
