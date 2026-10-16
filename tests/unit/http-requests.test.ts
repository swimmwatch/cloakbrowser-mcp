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
  it('reads only a literal boolean cdpEnabled initialize override', () => {
    const initializeRequestResult = createInitializeRequest();
    const bridgeRuntimeOptionsFromInitializeResult =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult);
    const receiverActual = bridgeRuntimeOptionsFromInitializeResult;
    const toEqualOptions = {} as const;
    expect(receiverActual).toEqual(toEqualOptions);
    const createInitializeRequestOptions = { cdpEnabled: true } as const;
    const initializeRequestResult2 = createInitializeRequest(createInitializeRequestOptions);
    const bridgeRuntimeOptionsFromInitializeResult2 =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult2);
    const receiver2Actual = bridgeRuntimeOptionsFromInitializeResult2;
    const toEqualOptions2 = {
      cdpEnabled: true,
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions2);
    const createInitializeRequestOptions2 = { cdpEnabled: false } as const;
    const initializeRequestResult3 = createInitializeRequest(createInitializeRequestOptions2);
    const bridgeRuntimeOptionsFromInitializeResult3 =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult3);
    const receiver3Actual = bridgeRuntimeOptionsFromInitializeResult3;
    const toEqualOptions3 = {
      cdpEnabled: false,
    } as const;
    expect(receiver3Actual).toEqual(toEqualOptions3);
    expect(() => {
      const createInitializeRequestOptions3 = { cdpEnabled: 'true' } as const;
      const initializeRequestResult4 = createInitializeRequest(createInitializeRequestOptions3);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult4);
    }).toThrow(InvalidBridgeInitializeMetaError);
  });
  it('detects JSON content types', () => {
    const createRequestOptions = { 'content-type': 'application/json' } as const;
    const requestResult = createRequest('', createRequestOptions);
    const hasJsonContentTypeResult = hasJsonContentType(requestResult);
    expect(hasJsonContentTypeResult).toBe(true);
    const createRequestOptions2 = { 'content-type': 'Application/JSON; charset=utf-8' } as const;
    const requestResult2 = createRequest('', createRequestOptions2);
    const hasJsonContentTypeResult2 = hasJsonContentType(requestResult2);
    expect(hasJsonContentTypeResult2).toBe(true);
    const createRequestOptions3 = { 'content-type': 'text/plain' } as const;
    const requestResult3 = createRequest('', createRequestOptions3);
    const hasJsonContentTypeResult3 = hasJsonContentType(requestResult3);
    expect(hasJsonContentTypeResult3).toBe(false);
    const requestResult4 = createRequest('');
    const hasJsonContentTypeResult4 = hasJsonContentType(requestResult4);
    expect(hasJsonContentTypeResult4).toBe(false);
  });
  it('reads JSON request bodies within the configured size limit', async () => {
    const requestResult5 = createRequest('{"ok":true}');
    const jsonBodyResult = readJsonBody(requestResult5, 32);
    const receiver4Actual = jsonBodyResult;
    const toEqualOptions4 = { ok: true } as const;
    await expect(receiver4Actual).resolves.toEqual(toEqualOptions4);
    const requestResult6 = createRequest('{');
    const jsonBodyResult2 = readJsonBody(requestResult6, 32);
    await expect(jsonBodyResult2).rejects.toBeInstanceOf(SyntaxError);
  });
  it('rejects oversized JSON bodies by content length and streamed bytes', async () => {
    const createRequestOptions4 = { 'content-length': '100' } as const;
    const requestResult7 = createRequest('{}', createRequestOptions4);
    const jsonBodyResult3 = readJsonBody(requestResult7, 10);
    await expect(jsonBodyResult3).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    const requestResult8 = createRequest('{"too":"large"}');
    const jsonBodyResult4 = readJsonBody(requestResult8, 5);
    await expect(jsonBodyResult4).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });
  it('detects initialize requests in single and batched JSON-RPC payloads', () => {
    const initialize = createInitializeRequest();
    const containsInitializeRequestResult = containsInitializeRequest(initialize);
    expect(containsInitializeRequestResult).toBe(true);
    const values = [{ method: 'tools/list' }, initialize];
    const containsInitializeRequestResult2 = containsInitializeRequest(values);
    expect(containsInitializeRequestResult2).toBe(true);
    const containsInitializeRequestOptions = { method: 'tools/list' } as const;
    const containsInitializeRequestResult3 = containsInitializeRequest(containsInitializeRequestOptions);
    expect(containsInitializeRequestResult3).toBe(false);
  });
  it('reads bridge runtime options from initialize metadata', () => {
    const createInitializeRequestOptions4 = {
      proxyServer: ' http://proxy.example:8080 ',
      proxyBypass: ' .internal ',
      geoipProxyMatch: true,
      headless: false,
      extensionMode: true,
      humanize: true,
      humanPreset: 'careful',
      releaseChannel: 'preview',
      userDataDir: ' /tmp/profile ',
      contextOptions: {
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      },
      extensionPaths: ['/tmp/ext-one', ' /tmp/ext-two '],
      profileDirName: ' Profile 1 ',
    };
    const initializeRequestResult5 = createInitializeRequest(createInitializeRequestOptions4);
    const bridgeRuntimeOptionsFromInitializeResult4 =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult5);
    const receiver5Actual = bridgeRuntimeOptionsFromInitializeResult4;
    const toEqualOptions5: {
      proxy: { server: string; bypass: string };
      geoipProxyMatch: boolean;
      headless: boolean;
      extensionMode: boolean;
      humanize: boolean;
      humanPreset: string;
      userDataDir: string;
      contextOptions: { viewport: { width: number; height: number }; locale: string; timezoneId: string };
      extensionPaths: string[];
      profileDirName: string;
    } = {
      proxy: {
        server: 'http://proxy.example:8080',
        bypass: '.internal',
      },
      geoipProxyMatch: true,
      headless: false,
      extensionMode: true,
      humanize: true,
      humanPreset: 'careful',
      userDataDir: '/tmp/profile',
      contextOptions: {
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      },
      extensionPaths: ['/tmp/ext-one', '/tmp/ext-two'],
      profileDirName: 'Profile 1',
    };
    expect(receiver5Actual).toEqual(toEqualOptions5);
    const createInitializeRequestOptions5 = { releaseChannel: 'preview' } as const;
    const initializeRequestResult6 = createInitializeRequest(createInitializeRequestOptions5);
    const bridgeRuntimeOptionsFromInitializeResult5 =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult6);
    const receiver6Actual = bridgeRuntimeOptionsFromInitializeResult5;
    const toEqualOptions6 = {} as const;
    expect(receiver6Actual).toEqual(toEqualOptions6);
    const initializeRequestResult7 = createInitializeRequest();
    const bridgeRuntimeOptionsFromInitializeResult6 =
      readBridgeRuntimeOptionsFromInitialize(initializeRequestResult7);
    const receiver7Actual = bridgeRuntimeOptionsFromInitializeResult6;
    const toEqualOptions7 = {} as const;
    expect(receiver7Actual).toEqual(toEqualOptions7);
    const readBridgeRuntimeOptionsFromInitializeOptions = { method: 'tools/list' } as const;
    const bridgeRuntimeOptionsFromInitializeResult7 = readBridgeRuntimeOptionsFromInitialize(
      readBridgeRuntimeOptionsFromInitializeOptions,
    );
    const receiver8Actual = bridgeRuntimeOptionsFromInitializeResult7;
    const toEqualOptions8 = {} as const;
    expect(receiver8Actual).toEqual(toEqualOptions8);
  });
  it('rejects invalid bridge initialize metadata', () => {
    expect(() => {
      const initializeRequestResult8 = createInitializeRequest('bad');
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult8);
    }).toThrow(InvalidBridgeInitializeMetaError);
    expect(() => {
      const createInitializeRequestOptions6 = { proxyServer: ' ' } as const;
      const initializeRequestResult9 = createInitializeRequest(createInitializeRequestOptions6);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult9);
    }).toThrow('proxyServer must be a non-empty string');
    expect(() => {
      const createInitializeRequestOptions7 = { proxyBypass: '.internal' } as const;
      const initializeRequestResult10 = createInitializeRequest(createInitializeRequestOptions7);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult10);
    }).toThrow('proxyBypass requires proxyServer');
    expect(() => {
      const createInitializeRequestOptions8 = { extensionToken: 'must-not-be-accepted' } as const;
      const initializeRequestResult11 = createInitializeRequest(createInitializeRequestOptions8);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult11);
    }).toThrow('extensionToken is process environment only');
    expect(() => {
      const createInitializeRequestOptions9 = {
        proxyServer: 'http://proxy.example:8080',
        geoipProxyMatch: 'true',
      } as const;
      const initializeRequestResult12 = createInitializeRequest(createInitializeRequestOptions9);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult12);
    }).toThrow('geoipProxyMatch must be a boolean');
    expect(() => {
      const createInitializeRequestOptions10 = { humanize: 'true' } as const;
      const initializeRequestResult13 = createInitializeRequest(createInitializeRequestOptions10);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult13);
    }).toThrow('humanize must be a boolean');
    expect(() => {
      const createInitializeRequestOptions11 = { headless: 'false' } as const;
      const initializeRequestResult14 = createInitializeRequest(createInitializeRequestOptions11);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult14);
    }).toThrow('headless must be a boolean');
    expect(() => {
      const createInitializeRequestOptions12 = { humanPreset: true } as const;
      const initializeRequestResult15 = createInitializeRequest(createInitializeRequestOptions12);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult15);
    }).toThrow('humanPreset must be "default" or "careful"');
    expect(() => {
      const createInitializeRequestOptions13 = { humanPreset: 'fast' } as const;
      const initializeRequestResult16 = createInitializeRequest(createInitializeRequestOptions13);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult16);
    }).toThrow('humanPreset must be "default" or "careful"');
    expect(() => {
      const createInitializeRequestOptions14 = { userDataDir: ' ' } as const;
      const initializeRequestResult17 = createInitializeRequest(createInitializeRequestOptions14);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult17);
    }).toThrow('userDataDir must be a non-empty string');
    expect(() => {
      const createInitializeRequestOptions15 = { contextOptions: [] };
      const initializeRequestResult18 = createInitializeRequest(createInitializeRequestOptions15);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult18);
    }).toThrow('contextOptions must be an object');
    expect(() => {
      const createInitializeRequestOptions16 = { contextOptions: { storageState: 'state.json' } } as const;
      const initializeRequestResult19 = createInitializeRequest(createInitializeRequestOptions16);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult19);
    }).toThrow('contextOptions.storageState is not supported');
    expect(() => {
      const createInitializeRequestOptions17 = {
        contextOptions: { viewport: { width: 1280, height: 0 } },
      } as const;
      const initializeRequestResult20 = createInitializeRequest(createInitializeRequestOptions17);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult20);
    }).toThrow('contextOptions.viewport.height');
    expect(() => {
      const createInitializeRequestOptions18 = { extensionPaths: '/tmp/ext' } as const;
      const initializeRequestResult21 = createInitializeRequest(createInitializeRequestOptions18);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult21);
    }).toThrow('extensionPaths must be a string array');
    expect(() => {
      const createInitializeRequestOptions19 = { extensionPaths: ['/tmp/ext', ' '] };
      const initializeRequestResult22 = createInitializeRequest(createInitializeRequestOptions19);
      return readBridgeRuntimeOptionsFromInitialize(initializeRequestResult22);
    }).toThrow('extensionPaths[1] must be a non-empty string');
  });
});
function createRequest(body: string, headers: Record<string, string> = {}): IncomingMessage {
  const values2 = [Buffer.from(body)];
  const request = Readable.from(values2);
  const assignOptions = { headers } as const;
  Object.assign(request, assignOptions);
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
