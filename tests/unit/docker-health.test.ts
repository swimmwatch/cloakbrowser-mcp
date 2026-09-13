import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { probeDockerLauncherHealth } from '@/docker/health.js';

const temporaryRoots: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error === undefined ? resolve() : reject(error)));
        }),
    ),
  );
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('probeDockerLauncherHealth', () => {
  it('accepts only a current successful launcher response', async () => {
    const socketPath = await startHealthServer('{"ok":true}\n');

    await expect(probeDockerLauncherHealth(socketPath, 100)).resolves.toBeUndefined();
  });

  it('fails closed when launcher reports an unhealthy result', async () => {
    const socketPath = await startHealthServer('{"ok":false}\n');

    await expect(probeDockerLauncherHealth(socketPath, 100)).rejects.toThrow('Docker health probe rejected');
  });

  it('fails when the private launcher endpoint is absent', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-health-'));
    temporaryRoots.push(root);

    await expect(probeDockerLauncherHealth(path.join(root, 'missing.sock'), 100)).rejects.toBeInstanceOf(
      Error,
    );
  });
});

async function startHealthServer(response: string): Promise<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-health-'));
  temporaryRoots.push(root);
  const socketPath = path.join(root, 'health.sock');
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    socket.resume();
    socket.once('end', () => socket.end(response));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  servers.push(server);
  return socketPath;
}
