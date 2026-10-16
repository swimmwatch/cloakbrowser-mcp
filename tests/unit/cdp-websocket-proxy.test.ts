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
  const values2 = [
    ['/devtools/browser/browser-id', 'browser'],
    ['/devtools/page/page_1', 'page'],
  ] as const;
  it.each(values2)('accepts the supported %s endpoint', (path, targetType) => {
    const message2 = `/cdp/${capability}${path}`;
    const classifyCdpWebSocketRouteResult = classifyCdpWebSocketRoute(message2, capability);
    const receiverActual = classifyCdpWebSocketRouteResult;
    const toEqualOptions = {
      kind: 'route',
      path,
      targetType,
    } as const;
    expect(receiverActual).toEqual(toEqualOptions);
  });
  const values3: readonly string[] = [
    `/cdp/${capability}/devtools/worker/id`,
    `/cdp/${capability}/json/version`,
    `/cdp/${capability}/devtools/browser/id/extra`,
    `/cdp/${capability}/devtools/browser/id?query=1`,
    `/other/${capability}/devtools/browser/id`,
  ];
  it.each(values3)('rejects an unsupported route without forwarding: %s', (path) => {
    const classifyCdpWebSocketRouteResult2 = classifyCdpWebSocketRoute(path, capability);
    const receiver2Actual = classifyCdpWebSocketRouteResult2;
    const toEqualOptions2 = { kind: 'not_found' } as const;
    expect(receiver2Actual).toEqual(toEqualOptions2);
  });
  const values4: readonly string[] = ['', '.', '%2F', 'id:other', 'id value'];
  it.each(values4)('rejects a malformed target id: %s', (id) => {
    const message3 = `/cdp/${capability}/devtools/browser/${id}`;
    const classifyCdpWebSocketRouteResult3 = classifyCdpWebSocketRoute(message3, capability);
    const receiver3Actual = classifyCdpWebSocketRouteResult3;
    const argumentValue = id === '' ? { kind: 'not_found' } : { kind: 'bad_request' };
    expect(receiver3Actual).toEqual(argumentValue);
  });
  it('makes a wrong capability indistinguishable from an unsupported path', () => {
    const wrong = 'CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg';
    const message4 = `/cdp/${wrong}/devtools/browser/id`;
    const classifyCdpWebSocketRouteResult4 = classifyCdpWebSocketRoute(message4, capability);
    const receiver4Actual = classifyCdpWebSocketRouteResult4;
    const toEqualOptions3 = {
      kind: 'not_found',
    } as const;
    expect(receiver4Actual).toEqual(toEqualOptions3);
  });
  it('pins every local close pair to its exact redacted contract', () => {
    const receiver5Actual = CDP_WEBSOCKET_LOCAL_CLOSE;
    const toEqualOptions4 = {
      goingAway: { code: 1001, reason: 'going_away' },
      internalError: { code: 1011, reason: 'internal_error' },
      messageTooBig: { code: 1009, reason: 'message_too_big' },
      protocolError: { code: 1002, reason: 'protocol_error' },
      tryAgainLater: { code: 1013, reason: 'try_again_later' },
    } as const;
    expect(receiver5Actual).toEqual(toEqualOptions4);
    const protectedSentinel = `${capability}:authority.example:target-id:upstream-reason:payload`;
    for (const close of Object.values(CDP_WEBSOCKET_LOCAL_CLOSE)) {
      const byteLengthResult = Buffer.byteLength(close.reason);
      expect(byteLengthResult).toBeLessThanOrEqual(123);
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
    const receiver6Actual = CDP_WEBSOCKET_MAX_MESSAGE_BYTES;
    const computedValue = 16 * 1024 * 1024;
    expect(receiver6Actual).toBe(computedValue);
    const receiver7Actual = CDP_WEBSOCKET_MAX_QUEUE_BYTES;
    const computedValue2 = 16 * 1024 * 1024;
    expect(receiver7Actual).toBe(computedValue2);
    expect(CDP_WEBSOCKET_HANDSHAKE_TIMEOUT_MS).toBe(10000);
    expect(CDP_WEBSOCKET_SHUTDOWN_TIMEOUT_MS).toBe(5000);
  });
  it('pauses a producer and closes with 1013 before a slow queue can exceed 16 MiB', () => {
    const pause = vi.fn();
    const resume = vi.fn();
    const source = { pause, resume } as unknown as WebSocket;
    let completeSend: ((error?: Error) => void) | undefined;
    const send = vi.fn(
      (
        _data: Buffer,
        _options: {
          binary: boolean;
        },
        callback: (error?: Error) => void,
      ) => {
        completeSend = callback;
      },
    );
    const destination = { readyState: WebSocket.OPEN, send } as unknown as WebSocket;
    const direction = createCdpWebSocketRelayDirection();
    const close = vi.fn();
    const computedValue3 = 9 * 1024 * 1024;
    const message = Buffer.alloc(computedValue3);
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
