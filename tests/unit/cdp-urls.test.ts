import { describe, expect, it } from 'vitest';
import { generateCdpCapability } from '@/cdp/capability.js';
import {
  CdpUrlError,
  createCdpDiscoveryUrl,
  effectiveUrlPort,
  formatCdpAuthority,
  rewriteCdpDiscoveryPayload,
  rewriteCdpWebSocketUrl,
  websocketSchemeFor,
} from '@/cdp/urls.js';
const capability = generateCdpCapability(() => Buffer.alloc(32, 7));
describe('CDP URL foundations', () => {
  it('resolves explicit and standard HTTP/WebSocket ports', () => {
    const uRL = new URL('ws://example.test/path');
    const effectiveUrlPortResult = effectiveUrlPort(uRL);
    expect(effectiveUrlPortResult).toBe(80);
    const uRL2 = new URL('wss://example.test/path');
    const effectiveUrlPortResult2 = effectiveUrlPort(uRL2);
    expect(effectiveUrlPortResult2).toBe(443);
    const uRL3 = new URL('http://example.test:8080/path');
    const effectiveUrlPortResult3 = effectiveUrlPort(uRL3);
    expect(effectiveUrlPortResult3).toBe(8080);
  });
  it('formats IPv4, IPv6, and hostname authorities', () => {
    const formatCdpAuthorityResult = formatCdpAuthority('127.0.0.1', 9222);
    expect(formatCdpAuthorityResult).toBe('127.0.0.1:9222');
    const formatCdpAuthorityResult2 = formatCdpAuthority('::1', 9222);
    expect(formatCdpAuthorityResult2).toBe('[::1]:9222');
    const formatCdpAuthorityResult3 = formatCdpAuthority('cdp.example.test', 9222);
    expect(formatCdpAuthorityResult3).toBe('cdp.example.test:9222');
  });
  it('publishes exact HTTP/WebSocket scheme pairs', () => {
    const websocketSchemeForResult = websocketSchemeFor('http');
    expect(websocketSchemeForResult).toBe('ws');
    const websocketSchemeForResult2 = websocketSchemeFor('https');
    expect(websocketSchemeForResult2).toBe('wss');
    const createCdpDiscoveryUrlOptions = {
      capability,
      host: '127.0.0.1',
      port: 9222,
      scheme: 'http',
    } as const;
    const cdpDiscoveryUrlResult = createCdpDiscoveryUrl(createCdpDiscoveryUrlOptions);
    const receiverActual = cdpDiscoveryUrlResult;
    const message = `http://127.0.0.1:9222/cdp/${capability}`;
    expect(receiverActual).toBe(message);
    const createCdpDiscoveryUrlOptions2 = { capability, host: '::1', port: 9443, scheme: 'https' } as const;
    const cdpDiscoveryUrlResult2 = createCdpDiscoveryUrl(createCdpDiscoveryUrlOptions2);
    const receiver2Actual = cdpDiscoveryUrlResult2;
    const message2 = `https://[::1]:9443/cdp/${capability}`;
    expect(receiver2Actual).toBe(message2);
  });
  it('rewrites internal WebSocket authority, scheme, and capability prefix', () => {
    const rewriteCdpWebSocketUrlOptions = {
      capability,
      host: 'cdp.example.test',
      port: 9443,
      scheme: 'https',
    } as const;
    const rewriteCdpWebSocketUrlResult = rewriteCdpWebSocketUrl(
      'ws://127.0.0.1:43123/devtools/browser/browser-id?x=1',
      rewriteCdpWebSocketUrlOptions,
    );
    const receiver3Actual = rewriteCdpWebSocketUrlResult;
    const message3 = `wss://cdp.example.test:9443/cdp/${capability}/devtools/browser/browser-id?x=1`;
    expect(receiver3Actual).toBe(message3);
    const rewriteCdpWebSocketUrlOptions2 = {
      capability,
      host: '::1',
      port: 9222,
      scheme: 'http',
    } as const;
    const rewriteCdpWebSocketUrlResult2 = rewriteCdpWebSocketUrl(
      'ws://[::1]:43123/devtools/page/page%2Fid',
      rewriteCdpWebSocketUrlOptions2,
    );
    const receiver4Actual = rewriteCdpWebSocketUrlResult2;
    const message4 = `ws://[::1]:9222/cdp/${capability}/devtools/page/page%2Fid`;
    expect(receiver4Actual).toBe(message4);
  });
  it('rewrites only authority-bearing DevTools fields in discovery payloads', () => {
    const internalBrowserUrl = 'ws://127.0.0.1:43123/devtools/browser/browser-id';
    const internalPageUrl = 'ws://127.0.0.1:43123/devtools/page/page-id';
    const payload = {
      arbitrary: `prefix ${internalBrowserUrl}`,
      nested: [
        {
          devtoolsFrontendUrl:
            '/devtools/inspector.html?panel=elements&ws=127.0.0.1:43123/devtools/page/page-id',
          title: 'example',
          url: internalPageUrl,
          webSocketDebuggerUrl: internalPageUrl,
        },
      ],
      webSocketDebuggerUrl: internalBrowserUrl,
    };
    const rewriteCdpDiscoveryPayloadOptions = {
      capability,
      host: 'cdp.example.test',
      port: 9443,
      scheme: 'https',
    } as const;
    const rewritten = rewriteCdpDiscoveryPayload(payload, rewriteCdpDiscoveryPayloadOptions);
    const receiver5Actual = rewritten;
    const message7 = `prefix ${internalBrowserUrl}`;
    const message5 = `ws=cdp.example.test%3A9443%2Fcdp%2F${capability}%2Fdevtools%2Fpage%2Fpage-id`;
    const stringContainingResult = expect.stringContaining(message5);
    const propertyValue = 'example';
    const currentInternalPageUrl = internalPageUrl;
    const message6 = `wss://cdp.example.test:9443/cdp/${capability}/devtools/page/page-id`;
    const options = {
      devtoolsFrontendUrl: stringContainingResult,
      title: propertyValue,
      url: currentInternalPageUrl,
      webSocketDebuggerUrl: message6,
    } as const;
    const values = [options];
    const message8 = `wss://cdp.example.test:9443/cdp/${capability}/devtools/browser/browser-id`;
    const toEqualOptions = {
      arbitrary: message7,
      nested: values,
      webSocketDebuggerUrl: message8,
    };
    expect(receiver5Actual).toEqual(toEqualOptions);
  });
  it('removes an internal authority from an absolute DevTools frontend URL', () => {
    const rewriteCdpDiscoveryPayloadOptions2 = {
      devtoolsFrontendUrl:
        'http://127.0.0.1:43123/devtools/inspector.html?ws=127.0.0.1:43123/devtools/page/page-id',
    } as const;
    const rewriteCdpDiscoveryPayloadOptions3 = {
      capability,
      host: 'cdp.example.test',
      port: 9443,
      scheme: 'https',
    } as const;
    const rewritten = rewriteCdpDiscoveryPayload(
      rewriteCdpDiscoveryPayloadOptions2,
      rewriteCdpDiscoveryPayloadOptions3,
    );
    const receiver6Actual = rewritten.devtoolsFrontendUrl;
    const message9 = `/devtools/inspector.html?ws=cdp.example.test%3A9443%2Fcdp%2F${capability}%2Fdevtools%2Fpage%2Fpage-id`;
    expect(receiver6Actual).toBe(message9);
    expect(rewritten.devtoolsFrontendUrl).not.toContain('127.0.0.1');
    expect(rewritten.devtoolsFrontendUrl).not.toContain('43123');
    const rewriteCdpDiscoveryPayloadOptions4 = {
      devtoolsFrontendUrl: 'http://127.0.0.1:43123/devtools/inspector.html',
    } as const;
    const rewriteCdpDiscoveryPayloadOptions5 = {
      capability,
      host: 'cdp.example.test',
      port: 9443,
      scheme: 'https',
    } as const;
    const withoutSocket = rewriteCdpDiscoveryPayload(
      rewriteCdpDiscoveryPayloadOptions4,
      rewriteCdpDiscoveryPayloadOptions5,
    );
    expect(withoutSocket.devtoolsFrontendUrl).toBe('/devtools/inspector.html');
  });
  it('preserves special object keys as own properties while rewriting', () => {
    const payload = JSON.parse('{"__proto__":{"marker":"preserved"},"title":"example"}') as Record<
      string,
      unknown
    >;
    const rewriteCdpDiscoveryPayloadOptions6 = {
      capability,
      host: '127.0.0.1',
      port: 9222,
      scheme: 'http',
    } as const;
    const rewritten = rewriteCdpDiscoveryPayload(payload, rewriteCdpDiscoveryPayloadOptions6);
    const hasOwnResult = Object.hasOwn(rewritten, '__proto__');
    expect(hasOwnResult).toBe(true);
    const prototypeOfResult = Object.getPrototypeOf(rewritten);
    expect(prototypeOfResult).toBe(Object.prototype);
    const serializedValue = JSON.stringify(rewritten);
    const receiver7Actual = serializedValue;
    const serializedValue2 = JSON.stringify(payload);
    expect(receiver7Actual).toBe(serializedValue2);
  });
  it('rejects malformed recognized DevTools URLs and invalid authorities', () => {
    expect(() => {
      const rewriteCdpDiscoveryPayloadOptions7 = { webSocketDebuggerUrl: 'not-a-websocket-url' } as const;
      const rewriteCdpDiscoveryPayloadOptions8 = {
        capability,
        host: '127.0.0.1',
        port: 9222,
        scheme: 'http',
      } as const;
      return rewriteCdpDiscoveryPayload(
        rewriteCdpDiscoveryPayloadOptions7,
        rewriteCdpDiscoveryPayloadOptions8,
      );
    }).toThrow(CdpUrlError);
    expect(() => formatCdpAuthority('bad host', 9222)).toThrow(CdpUrlError);
    expect(() => formatCdpAuthority('127.0.0.1', 65536)).toThrow(CdpUrlError);
  });
});
