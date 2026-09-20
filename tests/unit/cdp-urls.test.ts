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
    expect(effectiveUrlPort(new URL('ws://example.test/path'))).toBe(80);
    expect(effectiveUrlPort(new URL('wss://example.test/path'))).toBe(443);
    expect(effectiveUrlPort(new URL('http://example.test:8080/path'))).toBe(8080);
  });

  it('formats IPv4, IPv6, and hostname authorities', () => {
    expect(formatCdpAuthority('127.0.0.1', 9222)).toBe('127.0.0.1:9222');
    expect(formatCdpAuthority('::1', 9222)).toBe('[::1]:9222');
    expect(formatCdpAuthority('cdp.example.test', 9222)).toBe('cdp.example.test:9222');
  });

  it('publishes exact HTTP/WebSocket scheme pairs', () => {
    expect(websocketSchemeFor('http')).toBe('ws');
    expect(websocketSchemeFor('https')).toBe('wss');
    expect(createCdpDiscoveryUrl({ capability, host: '127.0.0.1', port: 9222, scheme: 'http' })).toBe(
      `http://127.0.0.1:9222/cdp/${capability}`,
    );
    expect(createCdpDiscoveryUrl({ capability, host: '::1', port: 9443, scheme: 'https' })).toBe(
      `https://[::1]:9443/cdp/${capability}`,
    );
  });

  it('rewrites internal WebSocket authority, scheme, and capability prefix', () => {
    expect(
      rewriteCdpWebSocketUrl('ws://127.0.0.1:43123/devtools/browser/browser-id?x=1', {
        capability,
        host: 'cdp.example.test',
        port: 9443,
        scheme: 'https',
      }),
    ).toBe(`wss://cdp.example.test:9443/cdp/${capability}/devtools/browser/browser-id?x=1`);
    expect(
      rewriteCdpWebSocketUrl('ws://[::1]:43123/devtools/page/page%2Fid', {
        capability,
        host: '::1',
        port: 9222,
        scheme: 'http',
      }),
    ).toBe(`ws://[::1]:9222/cdp/${capability}/devtools/page/page%2Fid`);
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

    const rewritten = rewriteCdpDiscoveryPayload(payload, {
      capability,
      host: 'cdp.example.test',
      port: 9443,
      scheme: 'https',
    });

    expect(rewritten).toEqual({
      arbitrary: `prefix ${internalBrowserUrl}`,
      nested: [
        {
          devtoolsFrontendUrl: expect.stringContaining(
            `ws=cdp.example.test%3A9443%2Fcdp%2F${capability}%2Fdevtools%2Fpage%2Fpage-id`,
          ),
          title: 'example',
          url: internalPageUrl,
          webSocketDebuggerUrl: `wss://cdp.example.test:9443/cdp/${capability}/devtools/page/page-id`,
        },
      ],
      webSocketDebuggerUrl: `wss://cdp.example.test:9443/cdp/${capability}/devtools/browser/browser-id`,
    });
  });

  it('removes an internal authority from an absolute DevTools frontend URL', () => {
    const rewritten = rewriteCdpDiscoveryPayload(
      {
        devtoolsFrontendUrl:
          'http://127.0.0.1:43123/devtools/inspector.html?ws=127.0.0.1:43123/devtools/page/page-id',
      },
      {
        capability,
        host: 'cdp.example.test',
        port: 9443,
        scheme: 'https',
      },
    );

    expect(rewritten.devtoolsFrontendUrl).toBe(
      `/devtools/inspector.html?ws=cdp.example.test%3A9443%2Fcdp%2F${capability}%2Fdevtools%2Fpage%2Fpage-id`,
    );
    expect(rewritten.devtoolsFrontendUrl).not.toContain('127.0.0.1');
    expect(rewritten.devtoolsFrontendUrl).not.toContain('43123');

    const withoutSocket = rewriteCdpDiscoveryPayload(
      { devtoolsFrontendUrl: 'http://127.0.0.1:43123/devtools/inspector.html' },
      {
        capability,
        host: 'cdp.example.test',
        port: 9443,
        scheme: 'https',
      },
    );
    expect(withoutSocket.devtoolsFrontendUrl).toBe('/devtools/inspector.html');
  });

  it('preserves special object keys as own properties while rewriting', () => {
    const payload = JSON.parse('{"__proto__":{"marker":"preserved"},"title":"example"}') as Record<
      string,
      unknown
    >;

    const rewritten = rewriteCdpDiscoveryPayload(payload, {
      capability,
      host: '127.0.0.1',
      port: 9222,
      scheme: 'http',
    });

    expect(Object.hasOwn(rewritten, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(rewritten)).toBe(Object.prototype);
    expect(JSON.stringify(rewritten)).toBe(JSON.stringify(payload));
  });

  it('rejects malformed recognized DevTools URLs and invalid authorities', () => {
    expect(() =>
      rewriteCdpDiscoveryPayload(
        { webSocketDebuggerUrl: 'not-a-websocket-url' },
        {
          capability,
          host: '127.0.0.1',
          port: 9222,
          scheme: 'http',
        },
      ),
    ).toThrow(CdpUrlError);
    expect(() => formatCdpAuthority('bad host', 9222)).toThrow(CdpUrlError);
    expect(() => formatCdpAuthority('127.0.0.1', 65_536)).toThrow(CdpUrlError);
  });
});
