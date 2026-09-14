import { createConnection } from 'node:net';

/**
 * Covers the launcher's sequential X11 and CLI event-loop probes, with local
 * socket scheduling margin. Docker grants the healthcheck a further margin.
 */
export const dockerHealthProbeTimeoutMs = 2_500;
export const dockerHealthSocketPath = '/tmp/cloakbrowser-mcp-health.sock';

interface DockerHealthSocketResponse {
  readonly ok: boolean;
}

/** Probes the Docker-only launcher health socket without touching MCP transports. */
export async function probeDockerLauncherHealth(
  socketPath = dockerHealthSocketPath,
  timeoutMs = dockerHealthProbeTimeoutMs,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection(socketPath);
    const timer = setTimeout(() => finish(new Error('Timed out waiting Docker health response')), timeoutMs);
    let response = '';
    let settled = false;

    function finish(error?: Error): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error === undefined) resolve();
      else reject(error);
    }

    socket.once('connect', () => {
      socket.end('{"type":"health"}\n');
    });
    socket.on('data', (chunk: Buffer) => {
      response += chunk.toString('utf8');
    });
    socket.once('end', () => {
      try {
        const parsed = JSON.parse(response) as DockerHealthSocketResponse;
        if (parsed.ok !== true) throw new Error('Docker health probe rejected by launcher');
        finish();
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Invalid Docker health response'));
      }
    });
    socket.once('error', (error) => finish(error));
  });
}
