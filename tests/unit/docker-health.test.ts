import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
import { probeDockerLauncherHealth } from '@/docker/health.js';
const temporaryRoots: string[] = [];
const servers: Server[] = [];
afterEach(async () => {
  const mappedValues = servers.splice(0).map(
    (server) =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  );
  await Promise.all(mappedValues);
  for (const root of temporaryRoots.splice(0)) {
    const rmSyncOptions = { force: true, recursive: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
const computedValue = process.platform === 'win32';
describe.skipIf(computedValue)('probeDockerLauncherHealth', () => {
  it('accepts only a current successful launcher response', async () => {
    const socketPath = await startHealthServer('{"ok":true}\n');
    const probeDockerLauncherHealthResult = probeDockerLauncherHealth(socketPath);
    await expect(probeDockerLauncherHealthResult).resolves.toBeUndefined();
  });
  it('fails closed when launcher reports an unhealthy result', async () => {
    const socketPath = await startHealthServer('{"ok":false}\n');
    const probeDockerLauncherHealthResult2 = probeDockerLauncherHealth(socketPath, 100);
    await expect(probeDockerLauncherHealthResult2).rejects.toThrow('Docker health probe rejected');
  });
  it('fails when the private launcher endpoint is absent', async () => {
    const tmpdirResult = tmpdir();
    const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-health-');
    const root = mkdtempSync(joinedPath);
    temporaryRoots.push(root);
    const joinedPath2 = path.join(root, 'missing.sock');
    const probeDockerLauncherHealthResult3 = probeDockerLauncherHealth(joinedPath2, 100);
    await expect(probeDockerLauncherHealthResult3).rejects.toBeInstanceOf(Error);
  });
});
async function startHealthServer(response: string): Promise<string> {
  const tmpdirResult2 = tmpdir();
  const joinedPath3 = path.join(tmpdirResult2, 'cloakbrowser-mcp-health-');
  const root = mkdtempSync(joinedPath3);
  temporaryRoots.push(root);
  const socketPath = path.join(root, 'health.sock');
  const createServerOptions = { allowHalfOpen: true } as const;
  const server = createServer(createServerOptions, (socket) => {
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
