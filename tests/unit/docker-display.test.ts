import { type ChildProcess, spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { DockerDisplayManager, probeX11Display } from '@/docker/display.js';

const children: ChildProcess[] = [];
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    children.splice(0).map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolve();
            return;
          }
          child.once('exit', () => resolve());
          child.kill('SIGKILL');
        }),
    ),
  );
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe.skipIf(process.platform === 'win32')('DockerDisplayManager', () => {
  it('shares one active readiness attempt between concurrent headed admissions', async () => {
    let spawnCount = 0;
    let probeCount = 0;
    const manager = new DockerDisplayManager({
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
    });

    await Promise.all([manager.ensureReady(), manager.ensureReady()]);

    expect(manager.phase).toBe('ready');
    expect(spawnCount).toBe(1);
    expect(probeCount).toBe(1);
    await manager.stop();
  });

  it('fails closed when Xvfb never returns an active X11 response', async () => {
    const failures: Error[] = [];
    const manager = new DockerDisplayManager({
      onFailure: (error) => failures.push(error),
      probe: async () => {
        throw new Error('no X11 response');
      },
      probeIntervalMs: 1,
      spawnXvfb: startChild,
      startupTimeoutMs: 20,
    });

    await expect(manager.ensureReady()).rejects.toThrow('Xvfb did not become ready');

    expect(manager.phase).toBe('failed');
    expect(failures).toHaveLength(1);
    await manager.stop();
  });

  it('treats a post-ready Xvfb exit as a terminal display failure', async () => {
    const failures: Error[] = [];
    const manager = new DockerDisplayManager({
      onFailure: (error) => failures.push(error),
      probe: async () => undefined,
      probeIntervalMs: 1,
      spawnXvfb: startChild,
      startupTimeoutMs: 100,
    });

    await manager.ensureReady();
    const [child] = children;
    if (child === undefined) throw new Error('Expected Xvfb test child');
    child.kill('SIGTERM');
    await waitFor(() => failures.length === 1);

    expect(manager.phase).toBe('failed');
    expect(failures[0]?.message).toContain('Xvfb exited unexpectedly');
  });

  it('requires a successful X11 setup response instead of a socket marker', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-x11-'));
    temporaryRoots.push(root);
    const socketPath = path.join(root, 'X99');
    const server = createServer((socket) => {
      socket.once('data', () => socket.end(Buffer.from([1])));
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });

    try {
      await expect(probeX11Display(socketPath, 100)).resolves.toBeUndefined();
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rejects a socket that accepts connections but never completes X11 setup', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-x11-'));
    temporaryRoots.push(root);
    const socketPath = path.join(root, 'X99');
    let connection: Socket | undefined;
    const server = createServer((socket) => {
      connection = socket;
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    });

    try {
      await expect(probeX11Display(socketPath, 20)).rejects.toBeInstanceOf(Error);
    } finally {
      connection?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

function startChild(): ChildProcess {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => undefined, 1_000)'], {
    stdio: 'ignore',
  });
  children.push(child);
  return child;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for expected condition');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
