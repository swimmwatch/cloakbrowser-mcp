import { describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

import {
  CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS,
  CDP_WEBSOCKET_MAX_CONNECTIONS,
  CDP_WEBSOCKET_MAX_MESSAGE_BYTES,
  CDP_WEBSOCKET_MAX_QUEUE_BYTES,
  CDP_WEBSOCKET_SHUTDOWN_TIMEOUT_MS,
} from '@/cdp/limits.js';
import {
  CDP_WEBSOCKET_LOCAL_CLOSE,
  classifyCdpWebSocketRoute,
  createCdpWebSocketRelayDirection,
  relayCdpWebSocketMessage,
} from '@/cdp/webSocketProxy.js';

const capability = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc';

describe('CDP WebSocket proxy policy', () => {
  it.each([
    ['/devtools/browser/browser-id', 'browser'],
    ['/devtools/page/page_1', 'page'],
  ] as const)('accepts the supported %s endpoint', (path, targetType) => {
    expect(classifyCdpWebSocketRoute(`/cdp/${capability}${path}`, capability)).toEqual({
      kind: 'route',
      path,
      targetType,
    });
  });

  it.each([
    `/cdp/${capability}/devtools/worker/id`,
    `/cdp/${capability}/json/version`,
    `/cdp/${capability}/devtools/browser/id/extra`,
    `/cdp/${capability}/devtools/browser/id?query=1`,
    `/other/${capability}/devtools/browser/id`,
  ])('rejects an unsupported route without forwarding: %s', (path) => {
    expect(classifyCdpWebSocketRoute(path, capability)).toEqual({ kind: 'not_found' });
  });

  it.each(['', '.', '%2F', 'id:other', 'id value'])('rejects a malformed target id: %s', (id) => {
    expect(classifyCdpWebSocketRoute(`/cdp/${capability}/devtools/browser/${id}`, capability)).toEqual(
      id === '' ? { kind: 'not_found' } : { kind: 'bad_request' },
    );
  });

  it('makes a wrong capability indistinguishable from an unsupported path', () => {
    const wrong = 'CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg';
    expect(classifyCdpWebSocketRoute(`/cdp/${wrong}/devtools/browser/id`, capability)).toEqual({
      kind: 'not_found',
    });
  });

  it('pins every local close pair to its exact redacted contract', () => {
    expect(CDP_WEBSOCKET_LOCAL_CLOSE).toEqual({
      goingAway: { code: 1001, reason: 'going_away' },
      internalError: { code: 1011, reason: 'internal_error' },
      messageTooBig: { code: 1009, reason: 'message_too_big' },
      protocolError: { code: 1002, reason: 'protocol_error' },
      tryAgainLater: { code: 1013, reason: 'try_again_later' },
    });
    const protectedSentinel = `${capability}:authority.example:target-id:upstream-reason:payload`;
    for (const close of Object.values(CDP_WEBSOCKET_LOCAL_CLOSE)) {
      expect(Buffer.byteLength(close.reason)).toBeLessThanOrEqual(123);
      expect(protectedSentinel).not.toContain(close.reason);
      expect(close.reason).not.toContain(capability);
      expect(close.reason).not.toContain('authority.example');
      expect(close.reason).not.toContain('target-id');
      expect(close.reason).not.toContain('upstream-reason');
      expect(close.reason).not.toContain('payload');
    }
  });

  it('pins the connection, message, queue, handshake, and shutdown limits', () => {
    expect(CDP_WEBSOCKET_MAX_CONNECTIONS).toBe(8);
    expect(CDP_WEBSOCKET_MAX_MESSAGE_BYTES).toBe(16 * 1024 * 1024);
    expect(CDP_WEBSOCKET_MAX_QUEUE_BYTES).toBe(16 * 1024 * 1024);
    expect(CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS).toBe(10_000);
    expect(CDP_WEBSOCKET_SHUTDOWN_TIMEOUT_MS).toBe(5_000);
  });

  it('pauses a producer and closes with 1013 before a slow queue can exceed 16 MiB', () => {
    const pause = vi.fn();
    const resume = vi.fn();
    const source = { pause, resume } as unknown as WebSocket;
    let completeSend: ((error?: Error) => void) | undefined;
    const send = vi.fn((_data: Buffer, _options: { binary: boolean }, callback: (error?: Error) => void) => {
      completeSend = callback;
    });
    const destination = { readyState: WebSocket.OPEN, send } as unknown as WebSocket;
    const direction = createCdpWebSocketRelayDirection();
    const close = vi.fn();
    const message = Buffer.alloc(9 * 1024 * 1024);

    relayCdpWebSocketMessage(source, destination, message, true, direction, close);
    expect(pause).toHaveBeenCalledOnce();
    expect(direction.queuedBytes).toBe(message.byteLength);
    relayCdpWebSocketMessage(source, destination, message, true, direction, close);
    expect(close).toHaveBeenCalledWith(CDP_WEBSOCKET_LOCAL_CLOSE.tryAgainLater);
    expect(send).toHaveBeenCalledOnce();

    completeSend?.();
    expect(resume).toHaveBeenCalledOnce();
    expect(direction.queuedBytes).toBe(0);
  });
});
