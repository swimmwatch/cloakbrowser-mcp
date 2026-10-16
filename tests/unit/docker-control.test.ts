import process from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDockerDisplayController, DockerDisplayUnavailableError } from '@/docker/control.js';
import {
  dockerDisplayEnsureRequestType,
  dockerDisplayEnsureResultType,
  isDockerDisplayEnsureRequest,
} from '@/docker/protocol.js';
const originalSendDescriptor = Object.getOwnPropertyDescriptor(process, 'send');
const originalDisplay = process.env.DISPLAY;
const listenersResult = process.listeners('message');
const originalMessageListeners = new Set(listenersResult);
const listenersResult2 = process.listeners('disconnect');
const originalDisconnectListeners = new Set(listenersResult2);
afterEach(() => {
  if (originalSendDescriptor === undefined) Reflect.deleteProperty(process, 'send');
  else Object.defineProperty(process, 'send', originalSendDescriptor);
  if (originalDisplay === undefined) delete process.env.DISPLAY;
  else process.env.DISPLAY = originalDisplay;
  for (const listener of process.listeners('message')) {
    if (!originalMessageListeners.has(listener)) process.removeListener('message', listener);
  }
  for (const listener of process.listeners('disconnect')) {
    if (!originalDisconnectListeners.has(listener)) process.removeListener('disconnect', listener);
  }
});
describe('Docker display IPC controller', () => {
  it('waits for the display result when process.send reports backpressure', async () => {
    let sentMessage: unknown;
    const send = vi.fn((message: unknown): boolean => {
      sentMessage = message;
      return false;
    });
    const definePropertyOptions = { configurable: true, value: send, writable: true } as const;
    Object.defineProperty(process, 'send', definePropertyOptions);
    const controller = createDockerDisplayController();
    const pending = controller.ensureDisplayForHeadedRuntime(false);
    const receiverActual = sentMessage;
    const toMatchObjectOptions = { type: dockerDisplayEnsureRequestType } as const;
    expect(receiverActual).toMatchObject(toMatchObjectOptions);
    if (!isDockerDisplayEnsureRequest(sentMessage)) throw new Error('Expected display request');
    const emitOptions = {
      display: ':88',
      ok: true,
      requestId: sentMessage.requestId,
      type: dockerDisplayEnsureResultType,
    } as const;
    process.emit('message', emitOptions);
    await expect(pending).resolves.toBeUndefined();
    expect(process.env.DISPLAY).toBe(':88');
  });
  it('rejects a pending request when the IPC send callback reports an error', async () => {
    let sendCallback: ((error: Error | null) => void) | undefined;
    const send = vi.fn((message: unknown, callback: (error: Error | null) => void): boolean => {
      const receiver2Actual = message;
      const toMatchObjectOptions2 = { type: dockerDisplayEnsureRequestType } as const;
      expect(receiver2Actual).toMatchObject(toMatchObjectOptions2);
      sendCallback = callback;
      return true;
    });
    const definePropertyOptions2 = { configurable: true, value: send, writable: true } as const;
    Object.defineProperty(process, 'send', definePropertyOptions2);
    const controller = createDockerDisplayController();
    const pending = controller.ensureDisplayForHeadedRuntime(false);
    if (sendCallback === undefined) throw new Error('Expected IPC send callback');
    const error2 = new Error('IPC channel closed');
    sendCallback(error2);
    await expect(pending).rejects.toBeInstanceOf(DockerDisplayUnavailableError);
  });
});
