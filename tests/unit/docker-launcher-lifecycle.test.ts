import { EventEmitter } from 'node:events';
import process from 'node:process';
import { describe, expect, it, vi } from 'vitest';
import {
  dockerDisplayEnsureRequestType,
  dockerHealthProbeRequestType,
  dockerHealthProbeResultType,
} from '@/docker/protocol.js';
import { probeDockerLauncherHealth } from '@/docker/health.js';
const state = vi.hoisted(() => ({
  ensureReady: vi.fn<() => Promise<void>>(),
  instances: [] as FakeChild[],
  spawn: vi.fn(),
}));
vi.mock('node:child_process', () => ({ spawn: state.spawn }));
vi.mock('#src/docker/display', () => ({
  dockerDisplay: ':99',
  DockerDisplayManager: class {
    phase: 'never_started' | 'ready' = 'never_started';
    async ensureReady(): Promise<void> {
      await state.ensureReady();
      this.phase = 'ready';
    }
    async stop(): Promise<void> {}
  },
  probeX11Display: vi.fn(),
}));
import { runDockerLifecycleLauncher } from '@/docker/launcher.js';
class FakeChild extends EventEmitter {
  connected = true;
  exitCode: number | null = null;
  pid = 42;
  signalCode: NodeJS.Signals | null = null;
  readonly kill = vi.fn((signal: NodeJS.Signals) => {
    this.signalCode = signal;
    this.emit('exit', null, signal);
    return true;
  });
  readonly send = vi.fn((message: unknown, callback?: (error: Error | null) => void) => {
    const request = message as {
      nonce?: string;
      requestId?: string;
      type?: string;
    };
    if (request.type === dockerHealthProbeRequestType) {
      queueMicrotask(() => {
        const emitOptions = {
          nonce: request.nonce,
          processId: this.pid,
          requestId: request.requestId,
          type: dockerHealthProbeResultType,
        } as const;
        this.emit('message', emitOptions);
      });
    }
    callback?.(null);
    return true;
  });
}
const computedValue = process.platform === 'win32';
describe.skipIf(computedValue)('Docker lifecycle launcher', () => {
  it('serves an active CLI health probe and preserves clean CLI exit', async () => {
    const child = prepareChild();
    const values: string[] | undefined = [];
    const completion = runDockerLifecycleLauncher(values);
    await waitForHealth();
    child.emit('exit', 0, null);
    await expect(completion).resolves.toBe(0);
    const receiverActual = child.send;
    const objectContainingOptions = { type: dockerHealthProbeRequestType } as const;
    const objectContainingResult = expect.objectContaining(objectContainingOptions);
    const anyResult = expect.any(Function);
    expect(receiverActual).toHaveBeenCalledWith(objectContainingResult, anyResult);
  });
  it('coordinates headed display admission through the private IPC channel', async () => {
    const child = prepareChild();
    const values2: string[] | undefined = [];
    const completion = runDockerLifecycleLauncher(values2);
    await waitForHealth();
    const emitOptions2 = { requestId: 'display-1', type: dockerDisplayEnsureRequestType } as const;
    child.emit('message', emitOptions2);
    await waitFor(() =>
      child.send.mock.calls.some(
        ([message]) =>
          (
            message as {
              requestId?: string;
              type?: string;
            }
          ).requestId === 'display-1',
      ),
    );
    child.emit('exit', 0, null);
    await expect(completion).resolves.toBe(0);
    expect(state.ensureReady).toHaveBeenCalledOnce();
    const receiver2Actual = child.send;
    const objectContainingOptions2 = { display: ':99', ok: true, requestId: 'display-1' } as const;
    const objectContainingResult2 = expect.objectContaining(objectContainingOptions2);
    const anyResult2 = expect.any(Function);
    expect(receiver2Actual).toHaveBeenCalledWith(objectContainingResult2, anyResult2);
  });
});
function prepareChild(): FakeChild {
  const child = new FakeChild();
  state.instances.push(child);
  state.ensureReady.mockResolvedValue(undefined);
  state.spawn.mockReturnValue(child);
  return child;
}
async function waitForHealth(): Promise<void> {
  await waitFor(async () => {
    try {
      await probeDockerLauncherHealth();
      return true;
    } catch {
      return false;
    }
  });
}
async function waitFor(predicate: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting launcher state');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
