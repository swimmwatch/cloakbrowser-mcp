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
    const request = message as { nonce?: string; requestId?: string; type?: string };
    if (request.type === dockerHealthProbeRequestType) {
      queueMicrotask(() => {
        this.emit('message', {
          nonce: request.nonce,
          processId: this.pid,
          requestId: request.requestId,
          type: dockerHealthProbeResultType,
        });
      });
    }
    callback?.(null);
    return true;
  });
}

describe.skipIf(process.platform === 'win32')('Docker lifecycle launcher', () => {
  it('serves an active CLI health probe and preserves clean CLI exit', async () => {
    const child = prepareChild();
    const completion = runDockerLifecycleLauncher([]);

    await waitForHealth();
    child.emit('exit', 0, null);

    await expect(completion).resolves.toBe(0);
    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: dockerHealthProbeRequestType }),
      expect.any(Function),
    );
  });

  it('coordinates headed display admission through the private IPC channel', async () => {
    const child = prepareChild();
    const completion = runDockerLifecycleLauncher([]);

    await waitForHealth();
    child.emit('message', { requestId: 'display-1', type: dockerDisplayEnsureRequestType });
    await waitFor(() =>
      child.send.mock.calls.some(
        ([message]) => (message as { requestId?: string; type?: string }).requestId === 'display-1',
      ),
    );
    child.emit('exit', 0, null);

    await expect(completion).resolves.toBe(0);
    expect(state.ensureReady).toHaveBeenCalledOnce();
    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({ display: ':99', ok: true, requestId: 'display-1' }),
      expect.any(Function),
    );
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
  const deadline = Date.now() + 2_000;
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting launcher state');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
