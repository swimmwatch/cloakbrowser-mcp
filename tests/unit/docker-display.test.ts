import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DockerDisplayManager, probeX11Display } from '@/docker/display.js';
const children: ChildProcess[] = [];
const temporaryRoots: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  const mappedValues = children.splice(0).map(
    (child) =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) {
          resolve();
          return;
        }
        child.once('exit', () => resolve());
        child.kill('SIGKILL');
      }),
  );
  await Promise.all(mappedValues);
  for (const root of temporaryRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
const computedValue = process.platform === 'win32';
describe.skipIf(computedValue)('DockerDisplayManager', () => {
  it('shares one active readiness attempt between concurrent headed admissions', async () => {
    let spawnCount = 0;
    let probeCount = 0;
    const dockerDisplayManagerOptions: import('@/docker/display.js').DockerDisplayManagerOptions = {
      onFailure: () => undefined,
      probe: async () => {
        probeCount += 1;
      },
      probeIntervalMs: 1,
      spawnXvfb: () => {
        spawnCount += 1;
        return startChild();
      },
      startupTimeoutMs: 100,
    };
    const manager = new DockerDisplayManager(dockerDisplayManagerOptions);
    const values: [Promise<void>, Promise<void>] = [manager.ensureReady(), manager.ensureReady()];
    await Promise.all(values);
    expect(manager.phase).toBe('ready');
    expect(spawnCount).toBe(1);
    expect(probeCount).toBe(1);
    await manager.stop();
  });
  it('fails closed when Xvfb never returns an active X11 response', async () => {
    const failures: Error[] = [];
    const dockerDisplayManagerOptions2: import('@/docker/display.js').DockerDisplayManagerOptions = {
      onFailure: (error) => failures.push(error),
      probe: async () => {
        throw new Error('no X11 response');
      },
      probeIntervalMs: 1,
      spawnXvfb: startChild,
      startupTimeoutMs: 20,
    };
    const manager = new DockerDisplayManager(dockerDisplayManagerOptions2);
    const ensureReadyResult = manager.ensureReady();
    await expect(ensureReadyResult).rejects.toThrow('Xvfb did not become ready');
    expect(manager.phase).toBe('failed');
    expect(failures).toHaveLength(1);
    await manager.stop();
  });
  it('treats a post-ready Xvfb exit as a terminal display failure', async () => {
    const failures: Error[] = [];
    const dockerDisplayManagerOptions3: import('@/docker/display.js').DockerDisplayManagerOptions = {
      onFailure: (error) => failures.push(error),
      probe: async () => undefined,
      probeIntervalMs: 1,
      spawnXvfb: startChild,
      startupTimeoutMs: 100,
    };
    const manager = new DockerDisplayManager(dockerDisplayManagerOptions3);
    await manager.ensureReady();
    const [child] = children;
    if (child === undefined) throw new Error('Expected Xvfb test child');
    child.kill('SIGTERM');
    await waitFor(() => failures.length === 1);
    expect(manager.phase).toBe('failed');
    expect(failures[0]?.message).toContain('Xvfb exited unexpectedly');
  });
  it('requires a complete successful X11 setup response instead of a socket marker', async () => {
    // Control the probe watchdog independently of real Unix socket scheduling.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const tmpdirResult = tmpdir();
    const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-x11-');
    const root = mkdtempSync(joinedPath);
    temporaryRoots.push(root);
    const socketPath = path.join(root, 'X99');
    const socketErrors: Error[] = [];
    let connection: Socket | undefined;
    const server = createServer((socket) => {
      connection = socket;
      socket.on('error', (error) => socketErrors.push(error));
      socket.once('data', () => {
        const values2: import('node:buffer').WithImplicitCoercion<ArrayLike<number>> = [1];
        const fromResult = Buffer.from(values2);
        return socket.end(fromResult);
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });
    try {
      const probeX11DisplayResult = probeX11Display(socketPath, 100);
      await expect(probeX11DisplayResult).rejects.toThrow('X11 server closed before setup response prefix');
    } finally {
      connection?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    expect(socketErrors).toEqual([]);
  });
  it('accepts a fragmented complete X11 setup response', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const tmpdirResult2 = tmpdir();
    const joinedPath2 = path.join(tmpdirResult2, 'cloakbrowser-mcp-x11-');
    const root = mkdtempSync(joinedPath2);
    temporaryRoots.push(root);
    const socketPath = path.join(root, 'X99');
    const socketErrors: Error[] = [];
    let connection: Socket | undefined;
    const server = createServer((socket) => {
      connection = socket;
      socket.on('error', (error) => socketErrors.push(error));
      socket.once('data', () => {
        const response = Buffer.alloc(12);
        response[0] = 1;
        response.writeUInt16LE(1, 6);
        const subarrayResult = response.subarray(0, 5);
        socket.write(subarrayResult);
        setImmediate(() => {
          const subarrayResult2 = response.subarray(5);
          return socket.end(subarrayResult2);
        });
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });
    try {
      const probeX11DisplayResult2 = probeX11Display(socketPath, 100);
      await expect(probeX11DisplayResult2).resolves.toBeUndefined();
    } finally {
      connection?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    expect(socketErrors).toEqual([]);
  });
  it('rejects a socket that accepts connections but never completes X11 setup', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const tmpdirResult3 = tmpdir();
    const joinedPath3 = path.join(tmpdirResult3, 'cloakbrowser-mcp-x11-');
    const root = mkdtempSync(joinedPath3);
    temporaryRoots.push(root);
    const socketPath = path.join(root, 'X99');
    const socketErrors: Error[] = [];
    let connection: Socket | undefined;
    let receiveRequest: () => void = () => undefined;
    const requestReceived = new Promise<void>((resolve) => {
      receiveRequest = resolve;
    });
    const server = createServer((socket) => {
      connection = socket;
      socket.on('error', (error) => socketErrors.push(error));
      socket.once('data', receiveRequest);
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });
    try {
      const probeX11DisplayResult3 = probeX11Display(socketPath, 20);
      await Promise.all([
        expect(probeX11DisplayResult3).rejects.toThrow('Timed out waiting for X11 setup response'),
        requestReceived.then(() => vi.advanceTimersByTimeAsync(20)),
      ]);
    } finally {
      connection?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    expect(socketErrors).toEqual([]);
  });
});
function startChild(): ChildProcess {
  const values3: readonly string[] = ['-e', 'setInterval(() => undefined, 1_000)'];
  const spawnOptions = {
    stdio: 'ignore',
  } as const;
  const child = spawn(process.execPath, values3, spawnOptions);
  children.push(child);
  return child;
}
async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for expected condition');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
